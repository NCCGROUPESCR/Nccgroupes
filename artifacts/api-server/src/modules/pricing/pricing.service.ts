import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from './entities/pricing-plan.entity';
import { CreatePricingPlanDto } from './dto/create-pricing-plan.dto';
import { UpdatePricingPlanDto } from './dto/update-pricing-plan.dto';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingPlan)
    private readonly repo: Repository<PricingPlan>,
  ) {}

  /** Public — active plans ordered for display */
  findPublic(): Promise<PricingPlan[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /** Admin — all plans regardless of status */
  findAll(): Promise<PricingPlan[]> {
    return this.repo.find({ order: { displayOrder: 'ASC', createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<PricingPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Pricing plan ${id} not found`);
    return plan;
  }

  async create(dto: CreatePricingPlanDto): Promise<PricingPlan> {
    const plan = this.repo.create({
      name: dto.name,
      tagline: dto.tagline ?? null,
      price: dto.price,
      priceNote: dto.priceNote ?? null,
      features: dto.features ?? [],
      highlighted: dto.highlighted ?? false,
      ctaLabel: dto.ctaLabel ?? 'Get started',
      ctaUrl: dto.ctaUrl ?? 'signup.html',
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(plan);
  }

  async update(id: string, dto: UpdatePricingPlanDto): Promise<PricingPlan> {
    const plan = await this.findOne(id);
    Object.assign(plan, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.tagline !== undefined && { tagline: dto.tagline }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.priceNote !== undefined && { priceNote: dto.priceNote }),
      ...(dto.features !== undefined && { features: dto.features }),
      ...(dto.highlighted !== undefined && { highlighted: dto.highlighted }),
      ...(dto.ctaLabel !== undefined && { ctaLabel: dto.ctaLabel }),
      ...(dto.ctaUrl !== undefined && { ctaUrl: dto.ctaUrl }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.repo.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.repo.remove(plan);
  }
}
