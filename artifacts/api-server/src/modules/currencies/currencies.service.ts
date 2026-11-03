import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { CreateCurrencyDto } from './dto/create-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly repo: Repository<Currency>,
  ) {}

  findAll(onlyActive = false): Promise<Currency[]> {
    const where = onlyActive ? { isActive: true } : {};
    return this.repo.find({ where, order: { displayOrder: 'ASC', code: 'ASC' } });
  }

  async findByCode(code: string): Promise<Currency | null> {
    return this.repo.findOne({ where: { code: code.toUpperCase() } });
  }

  async create(dto: CreateCurrencyDto): Promise<Currency> {
    const existing = await this.repo.findOne({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new ConflictException(`Currency ${dto.code} already exists.`);
    return this.repo.save(this.repo.create({ ...dto, code: dto.code.toUpperCase() }));
  }

  async update(id: string, dto: Partial<CreateCurrencyDto>): Promise<Currency> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Currency not found.');
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
