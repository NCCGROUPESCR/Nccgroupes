import { ArrayNotEmpty, IsArray, IsIn, IsUrl } from 'class-validator';

const ALLOWED_EVENTS = [
  'escrow.funded',
  'escrow.released',
  'dispute.opened',
  'dispute.resolved',
];

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ALLOWED_EVENTS, { each: true })
  events: string[];
}
