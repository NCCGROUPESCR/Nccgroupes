import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackService } from './paystack.service';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [HttpModule, forwardRef(() => TransactionsModule), UsersModule, CommonModule],
  providers: [
    PaystackService,
    { provide: PAYMENT_PROVIDER, useExisting: PaystackService },
    PaymentsService,
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
