import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DirectoriesService } from './directories.service';
import {
  CreateDirectoryDto,
  UpdateDirectoryDto,
  CreateDirectoryCategoryDto,
  UpdateDirectoryCategoryDto,
  ReorderDirectoriesDto,
} from './dto';

/**
 * Admin Directories API — requires ADMIN role.
 */
@ApiTags('admin/directories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('v1/admin/directories')
export class AdminDirectoriesController {
  constructor(private readonly directoriesService: DirectoriesService) {}

  // ============ DIRECTORY CRUD ============

  /**
   * Create a new directory.
   *
   * POST /v1/admin/directories
   */
  @Post()
  createDirectory(@Body() dto: CreateDirectoryDto, @CurrentUser() user: any) {
    return this.directoriesService.createDirectory(dto, user?.id);
  }

  /**
   * Get all directories (admin view — all statuses).
   *
   * GET /v1/admin/directories?skip=0&take=20
   */
  @Get()
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  getAllDirectories(@Query('skip') skip?: string, @Query('take') take?: string) {
    const parsedSkip = skip ? parseInt(skip, 10) : 0;
    const parsedTake = take ? Math.min(parseInt(take, 10), 100) : 20;
    return this.directoriesService.getAllDirectories(parsedSkip, parsedTake);
  }

  /**
   * Get a directory by ID.
   *
   * GET /v1/admin/directories/:id
   */
  @Get(':id')
  getDirectoryById(@Param('id') id: string) {
    return this.directoriesService.getDirectoryById(id);
  }

  /**
   * Update a directory.
   *
   * PATCH /v1/admin/directories/:id
   */
  @Patch(':id')
  updateDirectory(
    @Param('id') id: string,
    @Body() dto: UpdateDirectoryDto,
    @CurrentUser() user: any,
  ) {
    return this.directoriesService.updateDirectory(id, dto, user?.id);
  }

  /**
   * Delete a directory.
   *
   * DELETE /v1/admin/directories/:id
   */
  @Delete(':id')
  deleteDirectory(@Param('id') id: string) {
    return this.directoriesService.deleteDirectory(id);
  }

  // ============ DIRECTORY STATE CHANGES ============

  /**
   * Publish a directory (change status to PUBLISHED).
   *
   * POST /v1/admin/directories/:id/publish
   */
  @Post(':id/publish')
  publishDirectory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.directoriesService.publishDirectory(id, user?.id);
  }

  /**
   * Unpublish a directory (change status to UNPUBLISHED).
   *
   * POST /v1/admin/directories/:id/unpublish
   */
  @Post(':id/unpublish')
  unpublishDirectory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.directoriesService.unpublishDirectory(id, user?.id);
  }

  /**
   * Feature a directory.
   *
   * POST /v1/admin/directories/:id/feature
   */
  @Post(':id/feature')
  featureDirectory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.directoriesService.featureDirectory(id, user?.id);
  }

  /**
   * Unfeature a directory.
   *
   * POST /v1/admin/directories/:id/unfeature
   */
  @Post(':id/unfeature')
  unfeatureDirectory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.directoriesService.unfeatureDirectory(id, user?.id);
  }

  /**
   * Reorder directories.
   *
   * PATCH /v1/admin/directories/reorder
   *
   * Body: [{ directoryId: "...", displayOrder: 0 }, ...]
   */
  @Patch('reorder/batch')
  reorderDirectories(@Body() items: ReorderDirectoriesDto[]) {
    return this.directoriesService.reorderDirectories(items);
  }

  // ============ ANALYTICS ============

  /**
   * Get analytics for a specific directory.
   *
   * GET /v1/admin/directories/:id/analytics
   */
  @Get(':id/analytics')
  getDirectoryAnalytics(@Param('id') id: string) {
    return this.directoriesService.getAnalytics(id);
  }

  /**
   * Get analytics summary for all directories.
   *
   * GET /v1/admin/directories/analytics/all
   */
  @Get('analytics/all')
  getAllAnalytics() {
    return this.directoriesService.getAllAnalytics();
  }

  // ============ CATEGORY MANAGEMENT ============

  /**
   * Get all categories.
   *
   * GET /v1/admin/directory-categories
   */
  @Get('categories/list')
  getCategories() {
    return this.directoriesService.getCategories();
  }

  /**
   * Create a category.
   *
   * POST /v1/admin/directory-categories
   */
  @Post('categories')
  createCategory(@Body() dto: CreateDirectoryCategoryDto) {
    return this.directoriesService.createCategory(dto);
  }

  /**
   * Update a category.
   *
   * PATCH /v1/admin/directory-categories/:id
   */
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateDirectoryCategoryDto) {
    return this.directoriesService.updateCategory(id, dto);
  }

  /**
   * Delete a category.
   *
   * DELETE /v1/admin/directory-categories/:id
   */
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.directoriesService.deleteCategory(id);
  }

  // ============ TAGS ============

  /**
   * Get all unique tags.
   *
   * GET /v1/admin/directory-tags
   */
  @Get('tags/list')
  getAllTags() {
    return this.directoriesService.getAllTags();
  }
}
