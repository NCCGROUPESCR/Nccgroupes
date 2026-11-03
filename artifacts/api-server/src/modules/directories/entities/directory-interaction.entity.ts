import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum DirectoryInteractionType {
  VIEW = 'view',
  PREVIEW_CLICK = 'preview_click',
  OPEN_CLICK = 'open_click',
}

@Entity('directory_interactions')
export class DirectoryInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  directoryId: string;

  @Column({ type: 'enum', enum: DirectoryInteractionType })
  interactionType: DirectoryInteractionType;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
