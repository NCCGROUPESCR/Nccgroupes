import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ChatMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  VOICE = 'voice',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transactionId: string;

  @Column({ type: 'uuid', nullable: true })
  senderId: string | null;

  @Column({ type: 'enum', enum: ChatMessageType, default: ChatMessageType.TEXT })
  type: ChatMessageType;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', nullable: true })
  attachmentUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
