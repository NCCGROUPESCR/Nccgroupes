import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLogService } from '../../common/audit-log.service';
import { WalletsService } from '../wallets/wallets.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { TRANSACTION_EVENTS } from './events/transaction-events';

/**
 * Legal transitions. Any move not listed here is rejected. This is the
 * ONLY place transaction.status is allowed to be written — controllers
 * and other services must go through these methods, never
 * `repo.save({ status: ... })` directly.
 */
const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.PENDING]: [
    TransactionStatus.FUNDING_SUBMITTED,
    TransactionStatus.SECURED,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.FUNDING_SUBMITTED]: [
    TransactionStatus.SECURED,
    TransactionStatus.PENDING,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.SECURED]: [
    TransactionStatus.CONFIRMED,
    TransactionStatus.DISPUTE,
  ],
  [TransactionStatus.CONFIRMED]: [TransactionStatus.RELEASED, TransactionStatus.DISPUTE],
  [TransactionStatus.DISPUTE]: [TransactionStatus.RELEASED, TransactionStatus.REFUNDED],
  [TransactionStatus.RELEASED]: [],
  [TransactionStatus.REFUNDED]: [],
  [TransactionStatus.CANCELLED]: [],
};

@Injectable()
export class TransactionStateService {
  constructor(
    @InjectRepository(Transaction) private readonly txnRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly walletsService: WalletsService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findByIdOrThrow(id: string): Promise<Transaction> {
    const txn = await this.txnRepo.findOne({ where: { id } });
    if (!txn) throw new NotFoundException('Transaction not found.');
    return txn;
  }

  private assertTransition(txn: Transaction, to: TransactionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[txn.status] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot move transaction from '${txn.status}' to '${to}'.`,
      );
    }
  }

  /** Buyer's escrow payment has been captured (Paystack webhook confirmed). */
  async markSecured(transactionId: string, actorId: string | null = null): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.SECURED, actorId, async (manager, txn) => {
      await this.walletsService.holdInEscrow(txn.buyerId, txn.amount, txn.currency, txn.id, manager);
      txn.escrowFundedAt = new Date();
    });
  }

  /** Buyer has submitted proof of a manual bank transfer into the escrow account. */
  async markFundingSubmitted(
    transactionId: string,
    actorId: string,
    proofUrl: string,
  ): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.FUNDING_SUBMITTED, actorId, async (manager, txn) => {
      txn.fundingProofUrl = proofUrl;
      txn.fundingProofUploadedAt = new Date();
      txn.fundingProofUploadedBy = actorId;
      txn.fundingProofRejectionReason = null;
    });
  }

  /** Support/admin verifies the proof of payment and secures the escrow. */
  async verifyFundingProof(transactionId: string, actorId: string): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.SECURED, actorId, async (manager, txn) => {
      await this.walletsService.holdInEscrow(txn.buyerId, txn.amount, txn.currency, txn.id, manager);
      txn.escrowFundedAt = new Date();
    });
  }

  /** Support/admin rejects the proof of payment, sending the buyer back to pending. */
  async rejectFundingProof(transactionId: string, actorId: string, reason: string): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.PENDING, actorId, async (manager, txn) => {
      txn.fundingProofRejectionReason = reason;
    });
  }

  /** Buyer confirms the agreed transaction conditions. */
  async confirmConditions(transactionId: string, actorId: string | null = null): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.CONFIRMED, actorId);
  }

  /** Buyer confirms release, or the auto-release job fires. */
  async releaseFull(transactionId: string, actorId: string | null = null): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.RELEASED, actorId, async (manager, txn) => {
      await this.walletsService.releaseFromEscrow(
        txn.buyerId,
        txn.sellerId,
        txn.amount,
        txn.currency,
        txn.id,
        manager,
      );
      txn.escrowReleasedAt = new Date();
    });
  }

  /** Support/admin refunds the buyer in full — only valid from DISPUTE. */
  async refundFull(transactionId: string, actorId: string): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.REFUNDED, actorId, async (manager, txn) => {
      await this.walletsService.refundFromEscrow(txn.buyerId, txn.amount, txn.currency, txn.id, manager);
    });
  }

  /** Support/admin splits escrow between buyer and seller — only valid from DISPUTE. */
  async partialSettlement(
    transactionId: string,
    buyerPct: number,
    actorId: string,
  ): Promise<Transaction> {
    if (buyerPct < 0 || buyerPct > 100) {
      throw new BadRequestException('buyerPct must be between 0 and 100.');
    }
    return this.transition(transactionId, TransactionStatus.RELEASED, actorId, async (manager, txn) => {
      await this.walletsService.partialSettlement(
        txn.buyerId,
        txn.sellerId,
        txn.amount,
        buyerPct,
        txn.currency,
        txn.id,
        manager,
      );
      txn.escrowReleasedAt = new Date();
      txn.settlement = { buyerPct, sellerPct: 100 - buyerPct };
    });
  }

  /** Buyer or seller opens a dispute — freezes escrow (no wallet movement; the DISPUTE status itself blocks release). */
  async openDispute(transactionId: string, actorId: string): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.DISPUTE, actorId);
  }

  async cancel(transactionId: string, actorId: string): Promise<Transaction> {
    return this.transition(transactionId, TransactionStatus.CANCELLED, actorId);
  }

  /**
   * Core transition executor: validates the move, runs it (plus any wallet
   * side-effect) inside one DB transaction alongside the audit log write,
   * then emits a domain event for chat/notifications/websockets to react
   * to once the commit has succeeded.
   */
  private async transition(
    transactionId: string,
    to: TransactionStatus,
    actorId: string | null,
    sideEffect?: (manager: import('typeorm').EntityManager, txn: Transaction) => Promise<void>,
  ): Promise<Transaction> {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Transaction);
      const txn = await repo.findOne({ where: { id: transactionId } });
      if (!txn) throw new NotFoundException('Transaction not found.');

      this.assertTransition(txn, to);
      const from = txn.status;

      if (sideEffect) await sideEffect(manager, txn);

      txn.status = to;
      await repo.save(txn);

      await this.auditLogService.record(
        {
          actorId,
          action: `transaction.${from}_to_${to}`,
          entityType: 'transaction',
          entityId: txn.id,
          metadata: { from, to },
        },
        manager,
      );

      return { txn, from };
    });

    this.eventEmitter.emit(TRANSACTION_EVENTS.STATUS_CHANGED, {
      transactionId: result.txn.id,
      reference: result.txn.reference,
      from: result.from,
      to: result.txn.status,
      actorId,
    });

    return result.txn;
  }
}
