import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum DisputeStatus {
  INVESTIGATING = 'investigating',
  AWAITING_EVIDENCE = 'awaiting_evidence',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  transactionId: string;

  @Column({ type: 'uuid' })
  openedBy: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.INVESTIGATING })
  status: DisputeStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedAgentId: string | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @CreateDateColumn()
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
