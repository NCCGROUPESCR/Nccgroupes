import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ApiKeyEnvironment {
  LIVE = 'live',
  SANDBOX = 'sandbox',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  developerId: string;

  @Column()
  label: string;

  @Column({ select: false })
  keyHash: string;

  @Column()
  keyPrefix: string;

  @Column({ type: 'enum', enum: ApiKeyEnvironment, default: ApiKeyEnvironment.SANDBOX })
  environment: ApiKeyEnvironment;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
