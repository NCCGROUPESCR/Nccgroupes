import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTranslationDto {
  @IsString() namespace: string;
  @IsString() key: string;
  @IsString() languageCode: string;
  @IsOptional() @IsString() value?: string | null;
  @IsOptional() @IsBoolean() isAIGenerated?: boolean;
}
