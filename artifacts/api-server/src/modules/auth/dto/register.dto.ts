import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  phone?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
