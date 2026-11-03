import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { RoleAuditLog } from './entities/role-audit-log.entity';

@Module({
  imports: [TransactionsModule, UsersModule, TypeOrmModule.forFeature([RoleAuditLog])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
