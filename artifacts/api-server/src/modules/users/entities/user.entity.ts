import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  INACTIVE = 'inactive',
  BUSINESS = 'business',
  SUPPORT = 'support',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
}

export enum KycStatus {
  NONE = 'none',
  PENDING = 'pending',
  VERIFIED = 'verified',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'int', default: 70 })
  trustScore: number;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.NONE })
  kycStatus: KycStatus;

  @Column({ default: false })
  businessVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  // ---- Global profile: locale & currency preference ----
  /** ISO 4217 currency code the user prefers to transact in */
  @Column({ type: 'char', length: 3, nullable: true })
  preferredCurrency: string | null;

  /** User's country (ISO 3166-1 alpha-2 or free text) */
  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  /** BCP 47 locale tag (e.g. en-US, fr-FR) for number/date formatting */
  @Column({ type: 'varchar', nullable: true })
  locale: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
