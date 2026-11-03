import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Directory, DirectoryCategory, DirectoryInteraction, DirectoryStatus, DirectoryInteractionType } from './entities';
import {
  CreateDirectoryDto,
  UpdateDirectoryDto,
  CreateDirectoryCategoryDto,
  UpdateDirectoryCategoryDto,
  ReorderDirectoriesDto,
} from './dto';

@Injectable()
export class DirectoriesService {
  constructor(
    @InjectRepository(Directory)
    private directoryRepo: Repository<Directory>,
    @InjectRepository(DirectoryCategory)
    private categoryRepo: Repository<DirectoryCategory>,
    @InjectRepository(DirectoryInteraction)
    private interactionRepo: Repository<DirectoryInteraction>,
  ) {}

  // ============ PUBLIC API ============

  /**
   * Get all published directories with search, filter, and pagination.
   */
  async getPublishedDirectories(
    search?: string,
    categoryId?: string,
    featured?: boolean,
    tags?: string[],
    skip = 0,
    take = 20,
  ) {
    let query = this.directoryRepo
      .createQueryBuilder('dir')
      .where('dir.status = :status', { status: DirectoryStatus.PUBLISHED })
      .orderBy('dir.isFeatured', 'DESC')
      .addOrderBy('dir.displayOrder', 'ASC')
      .addOrderBy('dir.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (search) {
      query = query.andWhere(
        '(dir.websiteName ILIKE :search OR dir.description ILIKE :search OR dir.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      query = query.andWhere('dir.categoryId = :categoryId', { categoryId });
    }

    if (featured) {
      query = query.andWhere('dir.isFeatured = :featured', { featured });
    }

    if (tags && tags.length > 0) {
      query = query.andWhere('dir.tags && :tags', { tags });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Get a single published directory by ID.
   */
  async getPublishedDirectoryById(id: string) {
    const dir = await this.directoryRepo.findOne({
      where: { id, status: DirectoryStatus.PUBLISHED },
    });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    return dir;
  }

  /**
   * Track a directory interaction (view, preview click, open click).
   */
  async trackInteraction(
    directoryId: string,
    interactionType: DirectoryInteractionType,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const dir = await this.directoryRepo.findOne({ where: { id: directoryId } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }

    return this.interactionRepo.save({
      directoryId,
      interactionType,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get analytics summary for a directory.
   */
  async getAnalytics(directoryId: string) {
    const dir = await this.directoryRepo.findOne({ where: { id: directoryId } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }

    const interactions = await this.interactionRepo
      .createQueryBuilder('di')
      .select('di.interactionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('di.directoryId = :directoryId', { directoryId })
      .groupBy('di.interactionType')
      .getRawMany();

    return {
      directoryId,
      totalViews: interactions.find((i) => i.type === DirectoryInteractionType.VIEW)?.count || 0,
      totalPreviewClicks:
        interactions.find((i) => i.type === DirectoryInteractionType.PREVIEW_CLICK)?.count || 0,
      totalOpenClicks: interactions.find((i) => i.type === DirectoryInteractionType.OPEN_CLICK)?.count || 0,
    };
  }

  /**
   * Get analytics summary for all directories.
   */
  async getAllAnalytics() {
    const interactions = await this.interactionRepo
      .createQueryBuilder('di')
      .select('di.directoryId', 'directoryId')
      .addSelect('di.interactionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('di.directoryId, di.interactionType')
      .getRawMany();

    const grouped: Record<string, Record<string, number>> = {};
    interactions.forEach((row) => {
      if (!grouped[row.directoryId]) {
        grouped[row.directoryId] = { views: 0, previews: 0, opens: 0 };
      }
      if (row.type === DirectoryInteractionType.VIEW) {
        grouped[row.directoryId].views = parseInt(row.count, 10);
      } else if (row.type === DirectoryInteractionType.PREVIEW_CLICK) {
        grouped[row.directoryId].previews = parseInt(row.count, 10);
      } else if (row.type === DirectoryInteractionType.OPEN_CLICK) {
        grouped[row.directoryId].opens = parseInt(row.count, 10);
      }
    });

    return grouped;
  }

  // ============ ADMIN API ============

  /**
   * Create a new directory.
   */
  async createDirectory(dto: CreateDirectoryDto, userId?: string) {
    // Verify category exists
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException('Category not found.');
    }

    const dir = this.directoryRepo.create({
      ...dto,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });
    return this.directoryRepo.save(dir);
  }

  /**
   * Get all directories (admin view - all statuses).
   */
  async getAllDirectories(skip = 0, take = 20) {
    const [data, total] = await this.directoryRepo.findAndCount({
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  /**
   * Get a directory by ID (admin view - all statuses).
   */
  async getDirectoryById(id: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    return dir;
  }

  /**
   * Update a directory.
   */
  async updateDirectory(id: string, dto: UpdateDirectoryDto, userId?: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }

    // If category is being changed, verify the new category exists
    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) {
        throw new BadRequestException('Category not found.');
      }
    }

    Object.assign(dir, dto, { updatedBy: userId ?? null });
    return this.directoryRepo.save(dir);
  }

  /**
   * Delete a directory.
   */
  async deleteDirectory(id: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    return this.directoryRepo.remove(dir);
  }

  /**
   * Publish a directory.
   */
  async publishDirectory(id: string, userId?: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    dir.status = DirectoryStatus.PUBLISHED;
    dir.updatedBy = userId ?? null;
    return this.directoryRepo.save(dir);
  }

  /**
   * Unpublish a directory.
   */
  async unpublishDirectory(id: string, userId?: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    dir.status = DirectoryStatus.UNPUBLISHED;
    dir.updatedBy = userId ?? null;
    return this.directoryRepo.save(dir);
  }

  /**
   * Feature a directory.
   */
  async featureDirectory(id: string, userId?: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    dir.isFeatured = true;
    dir.updatedBy = userId ?? null;
    return this.directoryRepo.save(dir);
  }

  /**
   * Unfeature a directory.
   */
  async unfeatureDirectory(id: string, userId?: string) {
    const dir = await this.directoryRepo.findOne({ where: { id } });
    if (!dir) {
      throw new NotFoundException('Directory not found.');
    }
    dir.isFeatured = false;
    dir.updatedBy = userId ?? null;
    return this.directoryRepo.save(dir);
  }

  /**
   * Reorder directories.
   */
  async reorderDirectories(items: ReorderDirectoriesDto[]) {
    for (const item of items) {
      await this.directoryRepo.update({ id: item.directoryId }, { displayOrder: item.displayOrder });
    }
    return this.directoryRepo.find({ order: { displayOrder: 'ASC' } });
  }

  // ============ CATEGORY ADMIN API ============

  /**
   * Get all categories.
   */
  async getCategories() {
    return this.categoryRepo.find({ order: { displayOrder: 'ASC', name: 'ASC' } });
  }

  /**
   * Get active categories only.
   */
  async getActiveCategories() {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Create a category.
   */
  async createCategory(dto: CreateDirectoryCategoryDto) {
    // Auto-generate slug from name if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check if slug is unique
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) {
      throw new BadRequestException('Category slug already exists.');
    }

    const category = this.categoryRepo.create({
      ...dto,
      slug,
    });
    return this.categoryRepo.save(category);
  }

  /**
   * Update a category.
   */
  async updateCategory(id: string, dto: UpdateDirectoryCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    // If slug is being changed, verify uniqueness
    if (dto.slug !== undefined && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new BadRequestException('Category slug already exists.');
      }
    }

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  /**
   * Delete a category.
   */
  async deleteCategory(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    // Check if any directories are using this category
    const dirCount = await this.directoryRepo.count({ where: { categoryId: id } });
    if (dirCount > 0) {
      throw new BadRequestException('Cannot delete category with active directories.');
    }

    return this.categoryRepo.remove(category);
  }

  // ============ TAGS ============

  /**
   * Get all unique tags across all directories.
   */
  async getAllTags() {
    const results = await this.directoryRepo
      .createQueryBuilder('dir')
      .select('DISTINCT unnest(dir.tags)', 'tag')
      .orderBy('tag', 'ASC')
      .getRawMany();

    return results.map((r) => r.tag).filter(Boolean);
  }

  // ============ HELPERS ============

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-');
  }
}
