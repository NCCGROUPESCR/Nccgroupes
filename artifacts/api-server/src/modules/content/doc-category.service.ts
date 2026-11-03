import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocCategory } from './entities/doc-category.entity';
import { CreateDocCategoryDto } from './dto/create-doc-category.dto';
import { UpdateDocCategoryDto } from './dto/update-doc-category.dto';

@Injectable()
export class DocCategoryService {
  constructor(
    @InjectRepository(DocCategory)
    private readonly repo: Repository<DocCategory>,
  ) {}

  async findAll(): Promise<DocCategory[]> {
    return this.repo.find({ order: { displayOrder: 'ASC', name: 'ASC' } });
  }

  async findById(id: string): Promise<DocCategory> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Documentation category not found.');
    return cat;
  }

  async create(dto: CreateDocCategoryDto): Promise<DocCategory> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A category with that slug already exists.');
    const cat = this.repo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      displayOrder: dto.displayOrder ?? 0,
    });
    return this.repo.save(cat);
  }

  async update(id: string, dto: UpdateDocCategoryDto): Promise<DocCategory> {
    const cat = await this.findById(id);
    if (dto.slug && dto.slug !== cat.slug) {
      const clash = await this.repo.findOne({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('A category with that slug already exists.');
    }
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findById(id);
    await this.repo.remove(cat);
  }
}
