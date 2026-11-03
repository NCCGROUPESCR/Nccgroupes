import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStaffMemberDto {
  @IsString()
  fullName: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  department?: string | null;

  @IsOptional()
  @IsString()
  biography?: string | null;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  linkedin?: string | null;

  @IsOptional()
  @IsString()
  twitter?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
