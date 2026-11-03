import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Writes an audit entry. Accepts an optional EntityManager so callers can
   * include the write inside an existing DB transaction (e.g. an escrow
   * state transition), keeping the audit trail atomic with the change it
   * describes.
   */
  async record(
    entry: {
      actorId: string | null;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
    manager?: EntityManager,
  ): Promise<AuditLog> {
    const repo = manager ? manager.getRepository(AuditLog) : this.auditLogRepo;
    const log = repo.create({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? null,
    });
    return repo.save(log);
  }
}
