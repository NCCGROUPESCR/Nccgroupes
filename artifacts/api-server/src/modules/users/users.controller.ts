import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto);
  }

  @Post('me/kyc')
  submitKyc(@CurrentUser() user: User) {
    return this.usersService.submitKyc(user.id);
  }

  @Post('me/business-verification')
  submitBusinessVerification(@CurrentUser() user: User) {
    return this.usersService.submitBusinessVerification(user.id);
  }

  /**
   * Look up another user by email — used when creating a transaction to resolve
   * a counterparty's UUID. Throttled to slow down account-enumeration attempts;
   * only the minimum fields needed to populate a transaction are returned.
   */
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('lookup')
  async lookupByEmail(@Query('email') email: string) {
    if (!email) throw new NotFoundException('No account found with that email.');
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('No account found with that email.');
    return { id: user.id, name: user.name, role: user.role };
  }

  /**
   * Minimal public profile for another user — used to render party names
   * (buyer/seller) on a transaction. Never exposes email/phone.
   */
  @Get(':id/public')
  async publicProfile(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return { id: user.id, name: user.name, role: user.role };
  }

  /**
   * Directory of counterparties a buyer can pick from when creating a
   * transaction — only sellers are listable this
   * way (never buyers/support/admin) to keep the surface narrow.
   */
  @Get('directory')
  async directory(@Query('role') role: string) {
    if (role !== UserRole.SELLER) {
      throw new BadRequestException('role must be "seller".');
    }
    const users = await this.usersService.findByRole(role);
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      trustScore: u.trustScore,
      businessVerified: u.businessVerified,
    }));
  }
}
