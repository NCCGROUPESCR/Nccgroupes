import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectFundingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
