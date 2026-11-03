import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateContactInfoDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addresses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emails?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phones?: string[];

  @IsOptional()
  @IsString()
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  businessHours?: string | null;

  @IsOptional()
  @IsString()
  mapsEmbedUrl?: string | null;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}
