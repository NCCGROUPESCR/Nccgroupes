import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { TransactionStatus } from '../transactions/entities/transaction.entity';
import { RoleAuditLog } from './entities/role-audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
    @InjectRepository(RoleAuditLog)
    private readonly roleAuditRepo: Repository<RoleAuditLog>,
  ) {}

  async allTransactions(status?: TransactionStatus) {
    return this.transactionsService.findForUser({ role: 'admin' } as User, status);
  }

  async allUsers() {
    return this.usersService.findAll();
  }

  async verifyBusiness(userId: string, verified: boolean) {
    return this.usersService.setBusinessVerified(userId, verified);
  }

  async volumeReport() {
    const txns = await this.transactionsService.findForUser({ role: 'admin' } as User);
    const totalVolume = txns.reduce((sum, t) => sum + Number(t.amount), 0);
    const byStatus = txns.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    return { totalTransactions: txns.length, totalVolume, byStatus };
  }

  /**
   * Change a user's role. Only admins may call this (enforced at controller level).
   * Prevents demoting the last remaining administrator.
   * Records every change in the role_audit_logs table.
   */
  async changeRole(
    targetId: string,
    newRole: UserRole,
    admin: User,
    ip: string | null,
  ): Promise<User> {
    const target = await this.usersService.findById(targetId);
    const oldRole = target.role;

    if (oldRole === newRole) return target; // no-op

    // Guard: prevent locking out the last admin
    if (oldRole === UserRole.ADMIN) {
      const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot change the role of the last administrator. Promote another user to admin first.',
        );
      }
    }

    const updated = await this.usersService.setRole(targetId, newRole);

    const log = this.roleAuditRepo.create({
      userId: target.id,
      userEmail: target.email,
      oldRole,
      newRole,
      changedById: admin.id,
      changedByEmail: admin.email,
      ipAddress: ip,
    });
    await this.roleAuditRepo.save(log);

    return updated;
  }

  /** Returns the most recent 200 role-change audit entries, newest first. */
  async getRoleAuditLog(): Promise<RoleAuditLog[]> {
    return this.roleAuditRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
  }
}
