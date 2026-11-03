import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Provider-agnostic escrow payment details set by Support/Admin.
 * Works for bank transfers, mobile money, SWIFT, Wise, Payoneer, etc.
 *
 * Either (provider + paymentInstructions) OR (bankName + accountNumber)
 * must be supplied — the service enforces this at the business-logic level.
 */
export class SetEscrowDetailsDto {
  /** Human-readable provider name (bank, payment service, etc.) */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  provider?: string;

  /** Backward-compat alias for provider (legacy field name) */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountName?: string;

  /** Account number, IBAN, wallet address, etc. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountNumber?: string;

  /** Payment reference for the buyer to include in their transfer */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  /** Free-form payment instructions (SWIFT code, routing number, special notes, etc.) */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentInstructions?: string;
}
