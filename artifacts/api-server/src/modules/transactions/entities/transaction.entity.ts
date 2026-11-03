import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransactionStatus {
  PENDING = 'pending',
  FUNDING_SUBMITTED = 'funding_submitted',
  SECURED = 'secured',
  CONFIRMED = 'confirmed',
  DISPUTE = 'dispute',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  reference: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'uuid' })
  buyerId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  /** ISO 4217 currency code — no NGN default; must be set explicitly per transaction */
  @Column({ type: 'char', length: 3 })
  currency: string;

  /** Currency symbol (e.g. $, £, ₵) stored for display without live lookup */
  @Column({ type: 'varchar', nullable: true })
  currencySymbol: string | null;

  /** Exchange rate to USD at time of transaction creation (informational, optional) */
  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true })
  exchangeRate: string | null;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  releaseConditions: string;

  @Column({ type: 'timestamptz', nullable: true })
  escrowFundedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  escrowReleasedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  settlement: { buyerPct: number; sellerPct: number } | null;

  // ---- Global escrow assignment (provider-agnostic) ----
  /** Escrow provider name — bank, payment service, or any institution */
  @Column({ type: 'varchar', nullable: true })
  escrowProvider: string | null;

  /** Free-form payment instructions sent to the buyer (IBAN, SWIFT, routing number, etc.) */
  @Column({ type: 'text', nullable: true })
  escrowPaymentInstructions: string | null;

  /** When escrow details were last assigned/updated by support */
  @Column({ type: 'timestamptz', nullable: true })
  escrowAssignedAt: Date | null;

  /** Support/admin user ID who last set the escrow details */
  @Column({ type: 'uuid', nullable: true })
  escrowAssignedBy: string | null;

  /** Full assignment history: [{assignedBy, assignedAt, provider, ...}] */
  @Column({ type: 'jsonb', nullable: true })
  escrowAssignmentHistory: Record<string, unknown>[] | null;

  // ---- Manual escrow bank transfer + proof-of-payment confirmation ----
  @Column({ type: 'varchar', nullable: true })
  escrowBankName: string | null;

  @Column({ type: 'varchar', nullable: true })
  escrowAccountName: string | null;

  @Column({ type: 'varchar', nullable: true })
  escrowAccountNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  escrowReference: string | null;

  @Column({ type: 'varchar', nullable: true })
  fundingProofUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fundingProofUploadedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  fundingProofUploadedBy: string | null;

  @Column({ type: 'text', nullable: true })
  fundingProofRejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
