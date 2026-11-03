import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('v1/pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  /** Public — returns all active pricing plans */
  @Get()
  findAll() {
    return this.pricingService.findPublic();
  }
}
