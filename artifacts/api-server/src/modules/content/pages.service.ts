import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, PageStatus } from './entities/page.entity';
import { UpdatePageDto } from './dto/update-page.dto';

/** Fixed slugs admins can edit — no arbitrary page creation from the UI. */
export const EDITABLE_PAGE_SLUGS = ['about-us', 'faq', 'privacy-policy', 'terms-conditions'] as const;

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly repo: Repository<Page>,
  ) {}

  /** Public: only ever returns a page if it has been published. */
  async findPublished(slug: string): Promise<Page> {
    const page = await this.repo.findOne({ where: { slug } });
    if (!page || page.status !== PageStatus.PUBLISHED) {
      throw new NotFoundException('Page not found.');
    }
    return page;
  }

  /** Admin: list every editable page (draft or published). */
  findAll(): Promise<Page[]> {
    return this.repo.find({ order: { slug: 'ASC' } });
  }

  /** Admin: fetch one page (including drafts) for editing/preview. */
  async findOne(slug: string): Promise<Page> {
    const page = await this.repo.findOne({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found.');
    return page;
  }

  async update(slug: string, dto: UpdatePageDto): Promise<Page> {
    const page = await this.findOne(slug);
    Object.assign(page, dto);
    return this.repo.save(page);
  }

  async setStatus(slug: string, status: PageStatus): Promise<Page> {
    const page = await this.findOne(slug);
    page.status = status;
    page.publishedAt = status === PageStatus.PUBLISHED ? new Date() : page.publishedAt;
    return this.repo.save(page);
  }
}
