import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  phone?: string;

  /** ISO 4217 three-letter currency code */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  preferredCurrency?: string;

  /** Country code or name */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  /** BCP 47 locale tag (e.g. en-US) */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;
}
