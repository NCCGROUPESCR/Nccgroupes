import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateLegalDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  featuredImageUrl?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  versionNumber?: string;

  @IsOptional()
  @IsString()
  scheduledPublishAt?: string;

  /** Optional note for the initial revision snapshot. */
  @IsOptional()
  @IsString()
  revisionNote?: string;
}
