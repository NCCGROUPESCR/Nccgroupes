import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

/** Singleton row — a single company contact record edited in place by admins. */
@Entity('cms_contact_info')
export class ContactInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'Archanda AG' })
  companyName: string;

  @Column({ type: 'text', array: true, default: [] })
  addresses: string[];

  @Column({ type: 'text', array: true, default: [] })
  emails: string[];

  @Column({ type: 'text', array: true, default: [] })
  phones: string[];

  @Column({ type: 'varchar', nullable: true })
  whatsapp: string | null;

  @Column({ type: 'text', nullable: true })
  businessHours: string | null;

  @Column({ type: 'text', nullable: true })
  mapsEmbedUrl: string | null;

  @Column({ type: 'jsonb', default: {} })
  socialLinks: SocialLinks;

  @UpdateDateColumn()
  updatedAt: Date;
}
