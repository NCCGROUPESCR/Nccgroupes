import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type DisputeResolutionKind = 'release_seller' | 'refund_buyer' | 'partial';

export class ResolveDisputeDto {
  @IsIn(['release_seller', 'refund_buyer', 'partial'])
  resolution: DisputeResolutionKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  buyerPct?: number;
}
