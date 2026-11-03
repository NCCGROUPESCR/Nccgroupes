import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface DocGalleryImage {
  url: string;
  caption?: string;
  order: number;
}

export interface DocAttachment {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  order: number;
}

export interface DocVideo {
  type: 'uploaded' | 'embedded';
  title?: string;
  description?: string;
  fileUrl?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  order: number;
}

@Entity('cms_doc_articles')
export class DocArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  slug: string;

  /** UUID of the DocCategory row — stored as plain varchar (no FK constraint) */
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'text', nullable: true })
  shortDescription: string | null;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ type: 'varchar', nullable: true })
  featuredImageUrl: string | null;

  @Column({ type: 'jsonb', default: [] })
  galleryImages: DocGalleryImage[];

  @Column({ type: 'jsonb', default: [] })
  attachments: DocAttachment[];

  @Column({ type: 'jsonb', default: [] })
  videos: DocVideo[];

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'varchar', nullable: true })
  authorName: string | null;

  @Column({ type: 'varchar', nullable: true })
  seoTitle: string | null;

  @Column({ type: 'text', nullable: true })
  seoDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  seoKeywords: string | null;

  @Column({ type: 'enum', enum: DocArticleStatus, default: DocArticleStatus.DRAFT })
  status: DocArticleStatus;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
