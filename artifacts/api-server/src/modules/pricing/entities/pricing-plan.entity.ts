import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('pricing_plans')
export class PricingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  tagline: string | null;

  /** Flexible string: "2.5%", "Free", "Custom", etc. */
  @Column({ type: 'varchar', length: 120 })
  price: string;

  @Column({ type: 'varchar', length: 240, nullable: true, name: 'price_note' })
  priceNote: string | null;

  /** Ordered list of feature strings shown as bullet points */
  @Column({ type: 'jsonb', default: [] })
  features: string[];

  /** Show a "Most popular" badge on this plan */
  @Column({ type: 'boolean', default: false })
  highlighted: boolean;

  @Column({ type: 'varchar', length: 80, name: 'cta_label', default: 'Get started' })
  ctaLabel: string;

  @Column({ type: 'varchar', length: 240, name: 'cta_url', default: 'signup.html' })
  ctaUrl: string;

  @Column({ type: 'int', name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
