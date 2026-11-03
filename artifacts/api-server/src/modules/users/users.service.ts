import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycStatus, User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async submitKyc(id: string): Promise<User> {
    const user = await this.findById(id);
    user.kycStatus = KycStatus.PENDING;
    return this.usersRepo.save(user);
  }

  async submitBusinessVerification(id: string): Promise<User> {
    // In production this would attach uploaded documents to a review
    // queue. For now it flips the user into "pending" business review via
    // kycStatus and leaves businessVerified for an admin to approve.
    const user = await this.findById(id);
    user.kycStatus = KycStatus.PENDING;
    return this.usersRepo.save(user);
  }

  async setBusinessVerified(id: string, verified: boolean): Promise<User> {
    const user = await this.findById(id);
    user.businessVerified = verified;
    user.kycStatus = verified ? KycStatus.VERIFIED : user.kycStatus;
    return this.usersRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByRole(role: UserRole | string): Promise<User[]> {
    return this.usersRepo.find({ where: { role: role as UserRole }, order: { name: 'ASC' } });
  }

  async adjustTrustScore(id: string, delta: number): Promise<User> {
    const user = await this.findById(id);
    user.trustScore = Math.max(0, Math.min(100, user.trustScore + delta));
    return this.usersRepo.save(user);
  }

  async setRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.usersRepo.save(user);
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.usersRepo.count({ where: { role } });
  }
}
