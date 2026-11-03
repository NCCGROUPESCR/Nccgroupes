import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Immutable snapshot saved before every update — never deleted or modified. */
@Entity('cms_doc_versions')
export class DocVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  articleId: string;

  @Column({ type: 'varchar' })
  versionNumber: string;

  /** Admin name or email that triggered the save */
  @Column({ type: 'varchar', nullable: true })
  editor: string | null;

  @Column({ type: 'varchar', nullable: true })
  changeSummary: string | null;

  /** Full HTML body at the time of the snapshot */
  @Column({ type: 'text', default: '' })
  bodySnapshot: string;

  @CreateDateColumn()
  createdAt: Date;
}
