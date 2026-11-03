import { IsEnum } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class ChangeRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
