import { Controller, Get, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { DirectoriesService } from './directories.service';
import { DirectoryInteractionType } from './entities';

/**
 * Public Directories API — no authentication required.
 * Only published directories are visible.
 */
@ApiTags('directories')
@Controller('v1/directories')
export class DirectoriesController {
  constructor(private readonly directoriesService: DirectoriesService) {}

  /**
   * Get published directories with search, filtering, and pagination.
   *
   * GET /v1/directories?search=finance&category=123&featured=true&tags=trade&skip=0&take=20
   */
  @Get()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'tags', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  getPublishedDirectories(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('featured') featured?: string,
    @Query('tags') tagsParam?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const parsedFeatured = featured === 'true' ? true : featured === 'false' ? false : undefined;
    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()) : undefined;
    const parsedSkip = skip ? parseInt(skip, 10) : 0;
    const parsedTake = take ? Math.min(parseInt(take, 10), 100) : 20; // Max 100 per page

    return this.directoriesService.getPublishedDirectories(search, categoryId, parsedFeatured, tags, parsedSkip, parsedTake);
  }

  /**
   * Get a single published directory by ID.
   *
   * GET /v1/directories/:id
   */
  /**
   * Track a directory view interaction.
   *
   * POST /v1/directories/:id/track-view
   */
  @Post(':id/track-view')
  trackDirectoryView(@Param('id') id: string) {
    // In production, might extract IP from request headers
    return this.directoriesService.trackInteraction(id, DirectoryInteractionType.VIEW);
  }

  /**
   * Track a preview click interaction.
   *
   * POST /v1/directories/:id/track-preview-click
   */
  @Post(':id/track-preview-click')
  trackPreviewClick(@Param('id') id: string) {
    return this.directoriesService.trackInteraction(id, DirectoryInteractionType.PREVIEW_CLICK);
  }

  /**
   * Track an "Open Website" click interaction.
   *
   * POST /v1/directories/:id/track-open-click
   */
  @Post(':id/track-open-click')
  trackOpenClick(@Param('id') id: string) {
    return this.directoriesService.trackInteraction(id, DirectoryInteractionType.OPEN_CLICK);
  }

  /**
   * Get all active categories for filtering.
   *
   * GET /v1/directories/categories/active
   */
  @Get('categories/active')
  getActiveCategories() {
    return this.directoriesService.getActiveCategories();
  }

  /**
   * Get all unique tags across published directories.
   *
   * GET /v1/directories/tags/all
   */
  @Get('tags/all')
  getAllTags() {
    return this.directoriesService.getAllTags();
  }

  /**
   * Get a single published directory by ID.
   *
   * Keep this parameter route after the named collection routes above so
   * paths such as /categories/active cannot be interpreted as an ID.
   */
  @Get(':id')
  getPublishedDirectoryById(@Param('id') id: string) {
    return this.directoriesService.getPublishedDirectoryById(id);
  }
}
