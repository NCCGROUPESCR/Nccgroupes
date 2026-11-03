import { IsNumberString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsUUID()
  sellerId: string;

  @IsNumberString()
  amount: string;

  /** ISO 4217 currency code — required; no NGN default */
  @IsString()
  @Length(3, 3)
  currency: string;

  /** Currency symbol for display (e.g. $, £, ₵) — optional, looked up from currencies table if omitted */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencySymbol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  releaseConditions?: string;

}
