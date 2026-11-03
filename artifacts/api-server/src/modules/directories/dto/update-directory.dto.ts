import { IsString, IsUrl, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';
import { DirectoryStatus } from '../entities/directory.entity';

export class UpdateDirectoryDto {
  @IsOptional()
  @IsString()
  websiteName?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsEnum(DirectoryStatus)
  status?: DirectoryStatus;

  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  displayOrder?: number;
}
