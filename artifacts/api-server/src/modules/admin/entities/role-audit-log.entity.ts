import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_audit_logs')
export class RoleAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  userEmail: string;

  @Column()
  oldRole: string;

  @Column()
  newRole: string;

  @Index()
  @Column({ type: 'uuid' })
  changedById: string;

  @Column()
  changedByEmail: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
