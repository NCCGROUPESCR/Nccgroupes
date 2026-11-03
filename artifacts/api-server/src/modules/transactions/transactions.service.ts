import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SetEscrowDetailsDto } from './dto/set-escrow-details.dto';
import { TransactionStateService } from './transaction-state.service';
import { User, UserRole } from '../users/entities/user.entity';
import { TRANSACTION_EVENTS } from './events/transaction-events';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly txnRepo: Repository<Transaction>,
    private readonly stateService: TransactionStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(buyerId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const txn = this.txnRepo.create({
      reference: this.generateReference(),
      title: dto.title,
      category: dto.category,
      buyerId,
      sellerId: dto.sellerId,
      amount: dto.amount,
      // No NGN default — currency is explicitly required in the DTO
      currency: dto.currency,
      currencySymbol: dto.currencySymbol ?? null,
      releaseConditions: dto.releaseConditions ?? 'Funds release after both parties confirm the agreed transaction conditions.',
      status: TransactionStatus.PENDING,
    });
    const saved = await this.txnRepo.save(txn);
    this.eventEmitter.emit(TRANSACTION_EVENTS.CREATED, { transaction: saved });
    return saved;
  }

  async findById(id: string): Promise<Transaction> {
    const txn = await this.txnRepo.findOne({ where: { id } });
    if (!txn) throw new NotFoundException('Transaction not found.');
    return txn;
  }

  async findByReference(reference: string): Promise<Transaction> {
    const txn = await this.txnRepo.findOne({ where: { reference } });
    if (!txn) throw new NotFoundException('Transaction not found.');
    return txn;
  }

  /** Role-scoped list: buyers/sellers see only their own transactions; support/admin see everything. */
  async findForUser(user: User, status?: TransactionStatus): Promise<Transaction[]> {
    const qb = this.txnRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');

    if (user.role === UserRole.BUYER) qb.andWhere('t.buyerId = :id', { id: user.id });
    else if (user.role === UserRole.SELLER) qb.andWhere('t.sellerId = :id', { id: user.id });
    else if (![UserRole.SUPPORT, UserRole.ADMIN].includes(user.role)) {
      throw new ForbiddenException('Your role cannot list transactions.');
    }

    if (status) qb.andWhere('t.status = :status', { status });
    return qb.getMany();
  }

  async confirmConditions(id: string, userId: string): Promise<Transaction> {
    const txn = await this.findById(id);
    if (txn.buyerId !== userId) throw new ForbiddenException('Only the buyer can confirm the agreed conditions.');
    return this.stateService.confirmConditions(id, userId);
  }

  async release(id: string, userId: string): Promise<Transaction> {
    const txn = await this.findById(id);
    if (txn.buyerId !== userId) throw new ForbiddenException('Only the buyer can release escrow funds.');
    return this.stateService.releaseFull(id, userId);
  }

  async cancel(id: string, userId: string): Promise<Transaction> {
    const txn = await this.findById(id);
    if (txn.buyerId !== userId) throw new ForbiddenException('Only the buyer can cancel this transaction.');
    return this.stateService.cancel(id, userId);
  }

  /**
   * Support/admin assigns escrow payment details for this transaction.
   * Provider-agnostic: works for any bank, payment service, or institution.
   * Maintains a full assignment history.
   */
  async setEscrowDetails(id: string, actorId: string, dto: SetEscrowDetailsDto): Promise<Transaction> {
    const txn = await this.findById(id);

    // Resolve provider name: prefer explicit 'provider' field, fall back to legacy 'bankName'
    const providerName = dto.provider || dto.bankName || null;

    if (!providerName && !dto.paymentInstructions) {
      throw new BadRequestException('Provide either a provider name or payment instructions (or both).');
    }

    // Build history entry
    const historyEntry = {
      assignedBy: actorId,
      assignedAt: new Date().toISOString(),
      provider: providerName,
      accountName: dto.accountName ?? null,
      accountNumber: dto.accountNumber ?? null,
      reference: dto.reference ?? null,
      paymentInstructions: dto.paymentInstructions ?? null,
    };

    txn.escrowProvider = providerName;
    txn.escrowPaymentInstructions = dto.paymentInstructions ?? txn.escrowPaymentInstructions;
    txn.escrowAssignedAt = new Date();
    txn.escrowAssignedBy = actorId;
    txn.escrowAssignmentHistory = [
      ...(txn.escrowAssignmentHistory ?? []),
      historyEntry,
    ];

    // Keep legacy fields populated for backward compat with existing UI code
    txn.escrowBankName = providerName;
    txn.escrowAccountName = dto.accountName ?? txn.escrowAccountName;
    txn.escrowAccountNumber = dto.accountNumber ?? txn.escrowAccountNumber;
    txn.escrowReference = dto.reference ?? txn.reference;

    return this.txnRepo.save(txn);
  }

  /** Buyer confirms they've paid into the escrow account and attaches proof of payment. */
  async submitFundingProof(id: string, userId: string, proofUrl: string): Promise<Transaction> {
    const txn = await this.findById(id);
    if (txn.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can submit escrow funding proof.');
    }
    const hasDetails =
      txn.escrowProvider || txn.escrowBankName || txn.escrowPaymentInstructions;
    if (!hasDetails) {
      throw new BadRequestException('Escrow payment details have not been set for this transaction yet.');
    }
    const updated = await this.stateService.markFundingSubmitted(id, userId, proofUrl);
    this.eventEmitter.emit(TRANSACTION_EVENTS.FUNDING_PROOF_SUBMITTED, {
      transaction: updated,
      proofUrl,
      uploadedBy: userId,
    });
    return updated;
  }

  /** Support/admin reviews the proof of payment: verifying secures escrow, rejecting returns to pending. */
  async verifyFundingProof(id: string, actorId: string): Promise<Transaction> {
    return this.stateService.verifyFundingProof(id, actorId);
  }

  async rejectFundingProof(id: string, actorId: string, reason: string): Promise<Transaction> {
    return this.stateService.rejectFundingProof(id, actorId, reason);
  }

  private generateReference(): string {
    const year = new Date().getFullYear();
    const suffix = randomInt(100000, 999999);
    return `KE-${year}-${suffix}`;
  }
}
