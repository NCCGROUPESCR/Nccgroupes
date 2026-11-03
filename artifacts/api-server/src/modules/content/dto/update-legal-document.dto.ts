import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateLegalDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

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

  /** Optional note describing what changed — saved with the revision snapshot. */
  @IsOptional()
  @IsString()
  revisionNote?: string;

  /** Name of the editor performing the save (stored in the revision). */
  @IsOptional()
  @IsString()
  editorName?: string;
}
