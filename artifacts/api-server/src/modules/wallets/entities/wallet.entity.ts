import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wallets')
@Index(['userId', 'currency'], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'char', length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  availableBalance: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  escrowBalance: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  pendingBalance: string;
}
