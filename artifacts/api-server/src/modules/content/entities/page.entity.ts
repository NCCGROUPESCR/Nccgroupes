import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/** A single content block within a Page. Stored as JSONB — no separate table
 * needed since sections are always read/written together with their page. */
export interface PageSection {
  id: string;
  order: number;
  heading: string;
  body: string;
  imageUrl: string | null;
}

/** Editable public pages (About Us, FAQ, Privacy Policy, Terms & Conditions).
 * Identified by a fixed slug rather than an auto id — admins edit the same
 * slug over time, never create arbitrary new top-level pages. */
@Entity('cms_pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerImageUrl: string | null;

  @Column({ type: 'jsonb', default: [] })
  sections: PageSection[];

  @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
