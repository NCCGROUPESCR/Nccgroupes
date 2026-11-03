import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { TransactionStatus } from '../transactions/entities/transaction.entity';
import { ChangeRoleDto } from './dto/change-role.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('transactions')
  transactions(@Query('status') status?: TransactionStatus) {
    return this.adminService.allTransactions(status);
  }

  @Get('users')
  users() {
    return this.adminService.allUsers();
  }

  @Patch('users/:id/verify')
  verify(@Param('id') id: string, @Body('verified') verified: boolean) {
    return this.adminService.verifyBusiness(id, verified);
  }

  /**
   * Change any user's role. Admin-only.
   * Rejects attempts to demote the last administrator.
   * Records the change in the audit log.
   */
  @Patch('users/:id/role')
  changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0]?.trim()
      ?? (req.socket as any)?.remoteAddress
      ?? null;
    return this.adminService.changeRole(id, dto.role, admin, ip);
  }

  /** Returns the 200 most recent role-change audit log entries. */
  @Get('role-audit-log')
  roleAuditLog() {
    return this.adminService.getRoleAuditLog();
  }

  @Get('reports/volume')
  volumeReport() {
    return this.adminService.volumeReport();
  }
}
