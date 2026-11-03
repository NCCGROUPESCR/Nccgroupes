import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  developerId: string;

  @Column()
  url: string;

  @Column({ type: 'text', array: true, default: '{}' })
  events: string[];

  @Column({ select: false })
  secret: string;

  @CreateDateColumn()
  createdAt: Date;
}
