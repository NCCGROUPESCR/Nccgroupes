import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateLanguageDto {
  @IsString() @Length(2, 10) code: string;
  @IsString() name: string;
  @IsString() nativeName: string;
  @IsString() @Length(1, 10) flagEmoji: string;
  @IsOptional() @IsBoolean() isRTL?: boolean;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}
