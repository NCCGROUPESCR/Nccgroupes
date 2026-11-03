import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider.interface';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionStateService } from '../transactions/transaction-state.service';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../../common/audit-log.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly transactionsService: TransactionsService,
    private readonly stateService: TransactionStateService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async initializeFunding(transactionId: string, buyerId: string) {
    const txn = await this.transactionsService.findById(transactionId);
    if (txn.buyerId !== buyerId) {
      throw new BadRequestException('Only the buyer on this transaction can fund it.');
    }
    const buyer = await this.usersService.findById(buyerId);
    const amountKobo = Math.round(Number(txn.amount) * 100);
    const baseUrl = this.configService.get<string>('appBaseUrl');

    const result = await this.provider.initializeTransaction({
      email: buyer.email,
      amountKobo,
      currency: txn.currency,
      reference: txn.reference,
      callbackUrl: `${baseUrl}/v1/transactions/${txn.id}`,
    });

    await this.auditLogService.record({
      actorId: buyerId,
      action: 'payment.initialized',
      entityType: 'transaction',
      entityId: txn.id,
      metadata: { reference: txn.reference },
    });

    return result;
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string | undefined): Promise<{ received: boolean }> {
    if (!this.provider.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Rejected Paystack webhook with invalid signature.');
      throw new BadRequestException('Invalid webhook signature.');
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event === 'charge.success') {
      const reference = event.data?.reference;
      const txn = await this.transactionsService.findByReference(reference);
      await this.stateService.markSecured(txn.id, null);
      await this.auditLogService.record({
        actorId: null,
        action: 'payment.charge_success',
        entityType: 'transaction',
        entityId: txn.id,
        metadata: { reference },
      });
    } else if (event.event === 'charge.failed') {
      const reference = event.data?.reference;
      this.logger.warn(`Charge failed for reference ${reference}.`);
      // Transaction remains 'pending' — the notifications module (listening
      // for this in production) would alert the buyer to retry.
    }

    return { received: true };
  }
}
