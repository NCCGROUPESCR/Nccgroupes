import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingPlan } from './entities/pricing-plan.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { AdminPricingController } from './admin-pricing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PricingPlan])],
  providers: [PricingService],
  controllers: [PricingController, AdminPricingController],
  exports: [PricingService],
})
export class PricingModule {}
