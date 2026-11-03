import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { WalletsService } from './wallets.service';

class WithdrawDto {
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  getMyWallet(@CurrentUser() user: User) {
    return this.walletsService.getOrCreateWallet(user.id);
  }

  @Get('me/ledger')
  getMyLedger(@CurrentUser() user: User) {
    return this.walletsService.getLedger(user.id);
  }

  @Post('me/withdraw')
  withdraw(@CurrentUser() user: User, @Body() dto: WithdrawDto) {
    return this.walletsService.withdraw(user.id, dto.amount, dto.currency);
  }
}
