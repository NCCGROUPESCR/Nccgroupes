import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LegalDocumentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('cms_legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  slug: string;

  /** Rich HTML body — rendered verbatim on the public page. */
  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ type: 'varchar', nullable: true })
  featuredImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  seoTitle: string | null;

  @Column({ type: 'text', nullable: true })
  seoDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  seoKeywords: string | null;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'varchar', nullable: true })
  author: string | null;

  /** Semantic version string — e.g. "1.0", "2.1". Admin-managed, not auto-incremented. */
  @Column({ type: 'varchar', default: '1.0' })
  versionNumber: string;

  @Column({
    type: 'enum',
    enum: LegalDocumentStatus,
    default: LegalDocumentStatus.DRAFT,
  })
  status: LegalDocumentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** Optional scheduled publish time — surfaced in the admin UI, not auto-triggered server-side. */
  @Column({ type: 'timestamptz', nullable: true })
  scheduledPublishAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
