import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SetEscrowDetailsDto } from './dto/set-escrow-details.dto';
import { RejectFundingDto } from './dto/reject-funding.dto';
import { TransactionStatus } from './entities/transaction.entity';
import { fundingProofStorage, fundingProofUrl } from '../../common/file-storage';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
  ) {}

  @Roles(UserRole.BUYER)
  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateTransactionDto) {
    const txn = await this.transactionsService.create(user.id, dto);
    return txn;
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query('status') status?: TransactionStatus) {
    return this.transactionsService.findForUser(user, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @Roles(UserRole.BUYER)
  @Post(':id/confirm')
  confirmConditions(@Param('id') id: string, @CurrentUser() user: User) {
    return this.transactionsService.confirmConditions(id, user.id);
  }

  @Roles(UserRole.BUYER)
  @Post(':id/release')
  release(@Param('id') id: string, @CurrentUser() user: User) {
    return this.transactionsService.release(id, user.id);
  }

  @Roles(UserRole.BUYER)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.transactionsService.cancel(id, user.id);
  }

  /** Support/admin assigns escrow payment details (provider-agnostic) */
  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Patch(':id/escrow-details')
  setEscrowDetails(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SetEscrowDetailsDto,
  ) {
    return this.transactionsService.setEscrowDetails(id, user.id, dto);
  }

  @ApiConsumes('multipart/form-data')
  @Roles(UserRole.BUYER)
  @Post(':id/fund-proof')
  @UseInterceptors(FileInterceptor('file', { storage: fundingProofStorage, limits: { fileSize: 10 * 1024 * 1024 } }))
  async submitFundingProof(@Param('id') id: string, @CurrentUser() user: User, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('A proof of payment file (image or PDF) is required.');
    return this.transactionsService.submitFundingProof(id, user.id, fundingProofUrl(file.filename));
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Post(':id/fund-proof/verify')
  verifyFundingProof(@Param('id') id: string, @CurrentUser() user: User) {
    return this.transactionsService.verifyFundingProof(id, user.id);
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Post(':id/fund-proof/reject')
  rejectFundingProof(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: RejectFundingDto) {
    return this.transactionsService.rejectFundingProof(id, user.id, dto.reason);
  }
}
