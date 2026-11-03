import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Immutable snapshot of a LegalDocument at the moment it was saved.
 *  Stored as plain columns (no FK constraint) so revisions survive document deletion. */
@Entity('cms_legal_document_revisions')
export class LegalDocumentRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  documentId: string;

  /** Snapshot of the document title at this revision. */
  @Column({ type: 'varchar' })
  title: string;

  /** Snapshot of the HTML body at this revision. */
  @Column({ type: 'text', default: '' })
  body: string;

  /** Snapshot of the version number string at this revision. */
  @Column({ type: 'varchar', default: '1.0' })
  versionNumber: string;

  /** Name/email of the admin who triggered this save. */
  @Column({ type: 'varchar', nullable: true })
  editor: string | null;

  /** Optional note describing what changed in this revision. */
  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
