import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionStateService } from './transaction-state.service';
import { TransactionsController } from './transactions.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    WalletsModule,
    CommonModule,
  ],
  providers: [TransactionsService, TransactionStateService],
  controllers: [TransactionsController],
  exports: [TransactionsService, TransactionStateService],
})
export class TransactionsModule {}
