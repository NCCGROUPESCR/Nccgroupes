import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/entities/user.entity';

const BCRYPT_ROUNDS = 12;

/** Roles that may be chosen during public self-registration. Any other role
 *  (admin, support, developer, business) must be assigned by an administrator. */
const REGISTERABLE_ROLES: UserRole[] = [UserRole.BUYER, UserRole.SELLER];

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; tokens: AuthTokens }> {
    if (!REGISTERABLE_ROLES.includes(dto.role as UserRole)) {
      throw new ForbiddenException('This role cannot be self-registered.');
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('An account with that email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      role: dto.role,
      passwordHash,
    });
    await this.usersRepo.save(user);

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password.');
    if (user.role === UserRole.INACTIVE) throw new UnauthorizedException('This account is inactive.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (user.role === UserRole.INACTIVE) throw new UnauthorizedException('This account is inactive.');
    const userWithHash = await this.usersRepo.findOne({
      where: { id: user.id },
      select: ['id', 'refreshTokenHash'],
    });
    if (!userWithHash?.refreshTokenHash) {
      throw new UnauthorizedException('Session has been revoked.');
    }
    const matches = await bcrypt.compare(refreshToken, userWithHash.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Session has been revoked.');

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersRepo.update({ id: userId }, { refreshTokenHash: null });
  }

  /**
   * Stub for OTP-based 2FA (SMS/email). Production handling and time-boxed
   * code storage are not implemented yet.
   */
  async verifyTwoFactor(userId: string, code: string): Promise<{ verified: boolean }> {
    const verified = code?.length === 6; // placeholder acceptance rule
    return { verified };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.usersRepo.update({ id: user.id }, { refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
