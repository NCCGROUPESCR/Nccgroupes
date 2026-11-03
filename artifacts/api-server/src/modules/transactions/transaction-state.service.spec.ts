import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionStateService } from './transaction-state.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { WalletsService } from '../wallets/wallets.service';
import { AuditLogService } from '../../common/audit-log.service';

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    reference: 'KE-2026-000001',
    title: 'Test item',
    category: 'Other',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    amount: '100000.00',
    currency: 'NGN',
    status: TransactionStatus.PENDING,
    releaseConditions: 'After buyer confirms the agreed conditions.',
    escrowFundedAt: null,
    escrowReleasedAt: null,
    settlement: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Transaction;
}

describe('TransactionStateService', () => {
  let service: TransactionStateService;
  let currentTxn: Transaction;

  const mockManager = {
    getRepository: () => ({
      findOne: async () => currentTxn,
      save: async (t: Transaction) => {
        currentTxn = t;
        return t;
      },
    }),
  };

  const mockDataSource = {
    transaction: async (cb: any) => cb(mockManager),
  };

  const mockWalletsService = {
    holdInEscrow: jest.fn(),
    releaseFromEscrow: jest.fn(),
    refundFromEscrow: jest.fn(),
    partialSettlement: jest.fn(),
  };

  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    currentTxn = makeTxn();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionStateService,
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
        { provide: WalletsService, useValue: mockWalletsService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(TransactionStateService);
  });

  it('moves PENDING -> SECURED and holds funds in escrow', async () => {
    const result = await service.markSecured('txn-1', 'buyer-1');
    expect(result.status).toBe(TransactionStatus.SECURED);
    expect(mockWalletsService.holdInEscrow).toHaveBeenCalledWith(
      'buyer-1', '100000.00', 'NGN', 'txn-1', mockManager,
    );
  });

  it('moves SECURED -> CONFIRMED', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.SECURED });
    const result = await service.confirmConditions('txn-1');
    expect(result.status).toBe(TransactionStatus.CONFIRMED);
  });

  it('moves CONFIRMED -> RELEASED and releases escrow to seller', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.CONFIRMED });
    const result = await service.releaseFull('txn-1', 'buyer-1');
    expect(result.status).toBe(TransactionStatus.RELEASED);
    expect(mockWalletsService.releaseFromEscrow).toHaveBeenCalled();
  });

  it('moves SECURED -> DISPUTE without touching wallet balances', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.SECURED });
    const result = await service.openDispute('txn-1', 'buyer-1');
    expect(result.status).toBe(TransactionStatus.DISPUTE);
    expect(mockWalletsService.holdInEscrow).not.toHaveBeenCalled();
    expect(mockWalletsService.releaseFromEscrow).not.toHaveBeenCalled();
  });

  it('moves DISPUTE -> REFUNDED', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.DISPUTE });
    const result = await service.refundFull('txn-1', 'agent-1');
    expect(result.status).toBe(TransactionStatus.REFUNDED);
    expect(mockWalletsService.refundFromEscrow).toHaveBeenCalled();
  });

  it('moves DISPUTE -> RELEASED via a 50/50 partial settlement, recording the split', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.DISPUTE });
    const result = await service.partialSettlement('txn-1', 50, 'agent-1');
    expect(result.status).toBe(TransactionStatus.RELEASED);
    expect(result.settlement).toEqual({ buyerPct: 50, sellerPct: 50 });
    expect(mockWalletsService.partialSettlement).toHaveBeenCalledWith(
      'buyer-1', 'seller-1', '100000.00', 50, 'NGN', 'txn-1', mockManager,
    );
  });

  it('moves PENDING -> CANCELLED before funding', async () => {
    const result = await service.cancel('txn-1', 'buyer-1');
    expect(result.status).toBe(TransactionStatus.CANCELLED);
  });

  it('rejects PENDING -> RELEASED (skipping the whole flow)', async () => {
    await expect(service.releaseFull('txn-1', 'buyer-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects SECURED -> CANCELLED (cannot cancel after funding)', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.SECURED });
    await expect(service.cancel('txn-1', 'buyer-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects RELEASED -> anything (terminal state)', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.RELEASED });
    await expect(service.openDispute('txn-1', 'buyer-1')).rejects.toThrow(BadRequestException);
    await expect(service.refundFull('txn-1', 'agent-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects REFUNDED -> anything (terminal state)', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.REFUNDED });
    await expect(service.releaseFull('txn-1', 'buyer-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects a dispute opened from PENDING (escrow not yet funded)', async () => {
    await expect(service.openDispute('txn-1', 'buyer-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects partialSettlement with an out-of-range buyerPct', async () => {
    currentTxn = makeTxn({ status: TransactionStatus.DISPUTE });
    await expect(service.partialSettlement('txn-1', 150, 'agent-1')).rejects.toThrow(BadRequestException);
  });
});
