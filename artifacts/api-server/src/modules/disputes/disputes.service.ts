import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import { DisputeNote } from './entities/dispute-note.entity';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionStateService } from '../transactions/transaction-state.service';
import { AuditLogService } from '../../common/audit-log.service';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly disputesRepo: Repository<Dispute>,
    @InjectRepository(DisputeNote) private readonly notesRepo: Repository<DisputeNote>,
    private readonly transactionsService: TransactionsService,
    private readonly stateService: TransactionStateService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async open(userId: string, dto: OpenDisputeDto): Promise<Dispute> {
    const txn = await this.transactionsService.findById(dto.transactionId);
    if (txn.buyerId !== userId && txn.sellerId !== userId) {
      throw new ForbiddenException('Only the buyer or seller can open a dispute on this transaction.');
    }

    const existing = await this.disputesRepo.findOne({ where: { transactionId: dto.transactionId } });
    if (existing) throw new BadRequestException('A dispute already exists for this transaction.');

    // This flips transaction.status -> DISPUTE, which is what actually
    // freezes escrow (no further release-path transitions are legal from
    // DISPUTE except through resolve() below).
    await this.stateService.openDispute(dto.transactionId, userId);

    const dispute = await this.disputesRepo.save(
      this.disputesRepo.create({
        transactionId: dto.transactionId,
        openedBy: userId,
        reason: dto.reason,
        status: DisputeStatus.INVESTIGATING,
      }),
    );

    await this.auditLogService.record({
      actorId: userId,
      action: 'dispute.opened',
      entityType: 'dispute',
      entityId: dispute.id,
      metadata: { transactionId: dto.transactionId, reason: dto.reason },
    });

    return dispute;
  }

  async findAll(status?: DisputeStatus): Promise<Dispute[]> {
    return this.disputesRepo.find({
      where: status ? { status } : {},
      order: { openedAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Dispute> {
    const dispute = await this.disputesRepo.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    return dispute;
  }

  async getNotes(disputeId: string): Promise<DisputeNote[]> {
    return this.notesRepo.find({ where: { disputeId }, order: { createdAt: 'ASC' } });
  }

  async addNote(disputeId: string, authorId: string, body: string): Promise<DisputeNote> {
    const dispute = await this.findById(disputeId);
    if (!dispute.assignedAgentId) {
      dispute.assignedAgentId = authorId;
      await this.disputesRepo.save(dispute);
    }
    return this.notesRepo.save(this.notesRepo.create({ disputeId, authorId, body }));
  }

  async resolve(disputeId: string, agentId: string, dto: ResolveDisputeDto): Promise<Dispute> {
    const dispute = await this.findById(disputeId);
    if (dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('This dispute has already been closed.');
    }

    let resolutionText: string;
    if (dto.resolution === 'release_seller') {
      await this.stateService.releaseFull(dispute.transactionId, agentId);
      resolutionText = 'Released in full to seller after review.';
    } else if (dto.resolution === 'refund_buyer') {
      await this.stateService.refundFull(dispute.transactionId, agentId);
      resolutionText = 'Refunded in full to buyer after review.';
    } else {
      if (dto.buyerPct === undefined) {
        throw new BadRequestException('buyerPct is required for a partial settlement.');
      }
      await this.stateService.partialSettlement(dispute.transactionId, dto.buyerPct, agentId);
      resolutionText = `Settled ${dto.buyerPct}% to buyer, ${100 - dto.buyerPct}% to seller.`;
    }

    dispute.status = DisputeStatus.CLOSED;
    dispute.resolution = resolutionText;
    dispute.closedAt = new Date();
    if (!dispute.assignedAgentId) dispute.assignedAgentId = agentId;
    await this.disputesRepo.save(dispute);

    await this.auditLogService.record({
      actorId: agentId,
      action: 'dispute.resolved',
      entityType: 'dispute',
      entityId: dispute.id,
      metadata: { resolution: dto.resolution, buyerPct: dto.buyerPct ?? null },
    });

    return dispute;
  }
}
