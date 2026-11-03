import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DirectoryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

@Entity('directories')
export class Directory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ---- Basic Info ----
  @Column({ type: 'varchar' })
  websiteName: string;

  @Index()
  @Column({ type: 'varchar' })
  websiteUrl: string;

  @Column({ type: 'text' })
  description: string;

  // ---- Media ----
  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  faviconUrl: string | null;

  // ---- Categorization ----
  @Index()
  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  // ---- Publishing & Visibility ----
  @Index()
  @Column({ type: 'enum', enum: DirectoryStatus, default: DirectoryStatus.DRAFT })
  status: DirectoryStatus;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  // ---- SEO ----
  @Column({ type: 'varchar', nullable: true })
  seoTitle: string | null;

  @Column({ type: 'text', nullable: true })
  seoDescription: string | null;

  // ---- Audit Trail ----
  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
