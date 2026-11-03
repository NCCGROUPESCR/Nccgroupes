import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { EntityManager, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { LedgerEntryType, WalletLedgerEntry } from './entities/wallet-ledger-entry.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet) private readonly walletsRepo: Repository<Wallet>,
    @InjectRepository(WalletLedgerEntry)
    private readonly ledgerRepo: Repository<WalletLedgerEntry>,
  ) {}

  async getOrCreateWallet(
    userId: string,
    currency = 'NGN',
    manager?: EntityManager,
  ): Promise<Wallet> {
    const repo = manager ? manager.getRepository(Wallet) : this.walletsRepo;
    let wallet = await repo.findOne({ where: { userId, currency } });
    if (!wallet) {
      wallet = repo.create({ userId, currency, availableBalance: '0', escrowBalance: '0', pendingBalance: '0' });
      wallet = await repo.save(wallet);
    }
    return wallet;
  }

  async getWalletForUser(userId: string, currency = 'NGN'): Promise<Wallet> {
    const wallet = await this.walletsRepo.findOne({ where: { userId, currency } });
    if (!wallet) throw new NotFoundException('Wallet not found.');
    return wallet;
  }

  async getLedger(userId: string, currency = 'NGN'): Promise<WalletLedgerEntry[]> {
    const wallet = await this.getWalletForUser(userId, currency);
    return this.ledgerRepo.find({ where: { walletId: wallet.id }, order: { createdAt: 'DESC' } });
  }

  /**
   * Moves funds from a buyer's available balance into the platform escrow
   * pool for a specific transaction. Must run inside the caller's DB
   * transaction (pass `manager`) so it's atomic with the transaction's
   * status change.
   */
  async holdInEscrow(
    userId: string,
    amount: string,
    currency: string,
    transactionId: string,
    manager: EntityManager,
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(userId, currency, manager);
    const repo = manager.getRepository(Wallet);
    const amt = new Decimal(amount);

    wallet.escrowBalance = new Decimal(wallet.escrowBalance).plus(amt).toFixed(2);
    await repo.save(wallet);

    await this.writeLedgerEntry(
      wallet.id,
      transactionId,
      LedgerEntryType.ESCROW_HOLD,
      amt.toFixed(2),
      wallet.escrowBalance,
      manager,
    );
  }

  /** Releases held escrow funds into the seller's available balance. */
  async releaseFromEscrow(
    buyerId: string,
    sellerId: string,
    amount: string,
    currency: string,
    transactionId: string,
    manager: EntityManager,
  ): Promise<void> {
    const buyerWallet = await this.getOrCreateWallet(buyerId, currency, manager);
    const sellerWallet = await this.getOrCreateWallet(sellerId, currency, manager);
    const repo = manager.getRepository(Wallet);
    const amt = new Decimal(amount);

    if (new Decimal(buyerWallet.escrowBalance).lessThan(amt)) {
      throw new BadRequestException('Escrow balance is insufficient for this release.');
    }

    buyerWallet.escrowBalance = new Decimal(buyerWallet.escrowBalance).minus(amt).toFixed(2);
    sellerWallet.availableBalance = new Decimal(sellerWallet.availableBalance).plus(amt).toFixed(2);
    await repo.save(buyerWallet);
    await repo.save(sellerWallet);

    await this.writeLedgerEntry(
      buyerWallet.id,
      transactionId,
      LedgerEntryType.ESCROW_RELEASE,
      amt.negated().toFixed(2),
      buyerWallet.escrowBalance,
      manager,
    );
    await this.writeLedgerEntry(
      sellerWallet.id,
      transactionId,
      LedgerEntryType.ESCROW_RELEASE,
      amt.toFixed(2),
      sellerWallet.availableBalance,
      manager,
    );
  }

  /** Refunds held escrow funds back to the buyer's available balance. */
  async refundFromEscrow(
    buyerId: string,
    amount: string,
    currency: string,
    transactionId: string,
    manager: EntityManager,
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(buyerId, currency, manager);
    const repo = manager.getRepository(Wallet);
    const amt = new Decimal(amount);

    if (new Decimal(wallet.escrowBalance).lessThan(amt)) {
      throw new BadRequestException('Escrow balance is insufficient for this refund.');
    }

    wallet.escrowBalance = new Decimal(wallet.escrowBalance).minus(amt).toFixed(2);
    wallet.availableBalance = new Decimal(wallet.availableBalance).plus(amt).toFixed(2);
    await repo.save(wallet);

    await this.writeLedgerEntry(
      wallet.id,
      transactionId,
      LedgerEntryType.REFUND,
      amt.toFixed(2),
      wallet.availableBalance,
      manager,
    );
  }

  /**
   * Splits escrowed funds between buyer (refund) and seller (release) —
   * used for partial dispute settlements. buyerPct is 0-100.
   */
  async partialSettlement(
    buyerId: string,
    sellerId: string,
    totalAmount: string,
    buyerPct: number,
    currency: string,
    transactionId: string,
    manager: EntityManager,
  ): Promise<void> {
    if (buyerPct < 0 || buyerPct > 100) throw new BadRequestException('buyerPct must be between 0 and 100.');
    const total = new Decimal(totalAmount);
    const buyerShare = total.times(buyerPct).dividedBy(100).toFixed(2);
    const sellerShare = total.minus(buyerShare).toFixed(2);

    if (new Decimal(buyerShare).greaterThan(0)) {
      await this.refundFromEscrow(buyerId, buyerShare, currency, transactionId, manager);
    }
    if (new Decimal(sellerShare).greaterThan(0)) {
      // Release just the seller's share: move from buyer's escrow to seller's available.
      const buyerWallet = await this.getOrCreateWallet(buyerId, currency, manager);
      const sellerWallet = await this.getOrCreateWallet(sellerId, currency, manager);
      const repo = manager.getRepository(Wallet);
      const amt = new Decimal(sellerShare);

      if (new Decimal(buyerWallet.escrowBalance).lessThan(amt)) {
        throw new BadRequestException('Escrow balance is insufficient for this settlement.');
      }
      buyerWallet.escrowBalance = new Decimal(buyerWallet.escrowBalance).minus(amt).toFixed(2);
      sellerWallet.availableBalance = new Decimal(sellerWallet.availableBalance).plus(amt).toFixed(2);
      await repo.save(buyerWallet);
      await repo.save(sellerWallet);

      await this.writeLedgerEntry(
        buyerWallet.id,
        transactionId,
        LedgerEntryType.ESCROW_RELEASE,
        amt.negated().toFixed(2),
        buyerWallet.escrowBalance,
        manager,
      );
      await this.writeLedgerEntry(
        sellerWallet.id,
        transactionId,
        LedgerEntryType.ESCROW_RELEASE,
        amt.toFixed(2),
        sellerWallet.availableBalance,
        manager,
      );
    }
  }

  async withdraw(userId: string, amount: string, currency = 'NGN'): Promise<Wallet> {
    const wallet = await this.getWalletForUser(userId, currency);
    const amt = new Decimal(amount);
    if (new Decimal(wallet.availableBalance).lessThan(amt)) {
      throw new BadRequestException('Insufficient available balance.');
    }
    wallet.availableBalance = new Decimal(wallet.availableBalance).minus(amt).toFixed(2);
    await this.walletsRepo.save(wallet);
    await this.writeLedgerEntry(wallet.id, null, LedgerEntryType.WITHDRAWAL, amt.negated().toFixed(2), wallet.availableBalance);
    // In production: enqueue a Paystack Transfer via PaymentsService here,
    // gated behind the payout-approval queue for large amounts.
    return wallet;
  }

  private async writeLedgerEntry(
    walletId: string,
    transactionId: string | null,
    type: LedgerEntryType,
    amount: string,
    balanceAfter: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(WalletLedgerEntry) : this.ledgerRepo;
    const entry = repo.create({ walletId, transactionId, type, amount, balanceAfter });
    await repo.save(entry);
  }
}
