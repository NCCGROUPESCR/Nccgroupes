import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ContactMessageStatus {
  NEW = 'new',
  READ = 'read',
  REPLIED = 'replied',
  CLOSED = 'closed',
}

/** Submissions from the public Contact Us form. */
@Entity('cms_contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: ContactMessageStatus, default: ContactMessageStatus.NEW })
  status: ContactMessageStatus;

  @CreateDateColumn()
  createdAt: Date;
}
