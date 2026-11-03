import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { cmsImageStorage, cmsImageUrl, docsFileStorage, docsFileUrl } from '../../common/file-storage';
import { DocCategoryService } from './doc-category.service';
import { DocArticleService } from './doc-article.service';
import { CreateDocCategoryDto } from './dto/create-doc-category.dto';
import { UpdateDocCategoryDto } from './dto/update-doc-category.dto';
import { CreateDocArticleDto } from './dto/create-doc-article.dto';
import { UpdateDocArticleDto } from './dto/update-doc-article.dto';
import { DocArticleStatus } from './entities/doc-article.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

import { PagesService } from './pages.service';
import { BlogService } from './blog.service';
import { StaffService } from './staff.service';
import { ContactService } from './contact.service';
import { LegalService } from './legal.service';

import { UpdatePageDto } from './dto/update-page.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';
import { ReorderStaffDto } from './dto/reorder-staff.dto';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { PageStatus } from './entities/page.entity';
import { BlogPostStatus } from './entities/blog-post.entity';
import { ContactMessageStatus } from './entities/contact-message.entity';
import { LegalDocumentStatus } from './entities/legal-document.entity';

@ApiTags('admin-cms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('v1/admin/cms')
export class AdminContentController {
  constructor(
    private readonly pages: PagesService,
    private readonly blog: BlogService,
    private readonly staff: StaffService,
    private readonly contact: ContactService,
    private readonly legal: LegalService,
    private readonly docCategories: DocCategoryService,
    private readonly docArticles: DocArticleService,
  ) {}

  // ---- Shared image upload ----
  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { storage: cmsImageStorage }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return { url: cmsImageUrl(file.filename) };
  }

  // ---- Pages ----
  @Get('pages')
  listPages() { return this.pages.findAll(); }

  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) { return this.pages.findOne(slug); }

  @Patch('pages/:slug')
  updatePage(@Param('slug') slug: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(slug, dto);
  }

  @Post('pages/:slug/publish')
  publishPage(@Param('slug') slug: string) {
    return this.pages.setStatus(slug, PageStatus.PUBLISHED);
  }

  @Post('pages/:slug/unpublish')
  unpublishPage(@Param('slug') slug: string) {
    return this.pages.setStatus(slug, PageStatus.DRAFT);
  }

  // ---- Blog ----
  @Get('blog')
  listBlogPosts(@Query('search') search?: string, @Query('status') status?: BlogPostStatus) {
    return this.blog.findAll({ search, status });
  }

  @Get('blog/:id')
  getBlogPost(@Param('id') id: string) { return this.blog.findById(id); }

  @Post('blog')
  createBlogPost(@Body() dto: CreateBlogPostDto) { return this.blog.create(dto); }

  @Patch('blog/:id')
  updateBlogPost(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blog.update(id, dto);
  }

  @Delete('blog/:id')
  removeBlogPost(@Param('id') id: string) { return this.blog.remove(id); }

  @Post('blog/:id/publish')
  publishBlogPost(@Param('id') id: string) {
    return this.blog.setStatus(id, BlogPostStatus.PUBLISHED);
  }

  @Post('blog/:id/unpublish')
  unpublishBlogPost(@Param('id') id: string) {
    return this.blog.setStatus(id, BlogPostStatus.DRAFT);
  }

  // ---- Staff ----
  @Get('staff')
  listStaff() { return this.staff.findAll(); }

  @Post('staff')
  createStaff(@Body() dto: CreateStaffMemberDto) { return this.staff.create(dto); }

  @Patch('staff/reorder')
  reorderStaff(@Body() dto: ReorderStaffDto) { return this.staff.reorder(dto.order); }

  @Patch('staff/:id')
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffMemberDto) {
    return this.staff.update(id, dto);
  }

  @Delete('staff/:id')
  removeStaff(@Param('id') id: string) { return this.staff.remove(id); }

  // ---- Contact info & inbox ----
  @Get('contact-info')
  getContactInfo() { return this.contact.getInfo(); }

  @Patch('contact-info')
  updateContactInfo(@Body() dto: UpdateContactInfoDto) { return this.contact.updateInfo(dto); }

  @Get('contact-messages')
  listContactMessages(@Query('status') status?: ContactMessageStatus) {
    return this.contact.findMessages(status);
  }

  @Patch('contact-messages/:id')
  updateContactMessageStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactMessageStatusDto,
  ) {
    return this.contact.updateMessageStatus(id, dto.status);
  }

  // ---- Legal documents ----
  @Get('legal')
  listLegal(
    @Query('status') status?: LegalDocumentStatus,
    @Query('search') search?: string,
  ) {
    return this.legal.findAll({ status, search });
  }

  @Get('legal/:id')
  getLegal(@Param('id') id: string) { return this.legal.findById(id); }

  @Post('legal')
  createLegal(@Body() dto: CreateLegalDocumentDto) { return this.legal.create(dto); }

  @Patch('legal/:id')
  updateLegal(@Param('id') id: string, @Body() dto: UpdateLegalDocumentDto) {
    return this.legal.update(id, dto);
  }

  @Delete('legal/:id')
  removeLegal(@Param('id') id: string) { return this.legal.remove(id); }

  @Post('legal/:id/publish')
  publishLegal(@Param('id') id: string) {
    return this.legal.setStatus(id, LegalDocumentStatus.PUBLISHED);
  }

  @Post('legal/:id/unpublish')
  unpublishLegal(@Param('id') id: string) {
    return this.legal.setStatus(id, LegalDocumentStatus.DRAFT);
  }

  @Post('legal/:id/archive')
  archiveLegal(@Param('id') id: string) {
    return this.legal.setStatus(id, LegalDocumentStatus.ARCHIVED);
  }

  @Get('legal/:id/revisions')
  getLegalRevisions(@Param('id') id: string) {
    return this.legal.findRevisions(id);
  }

  @Post('legal/:id/revisions/:revisionId/restore')
  restoreLegalRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.legal.restoreRevision(id, revisionId);
  }

  // ---- Documentation Center: file upload ----

  /** Upload any file for the Docs CMS: images, PDFs, DOCX, ZIP, XLSX, MP4, WebM, etc. */
  @Post('docs-upload')
  @UseInterceptors(FileInterceptor('file', { storage: docsFileStorage }))
  uploadDocsFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: docsFileUrl(file.filename),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  // ---- Documentation Center: categories ----

  @Get('docs/categories')
  listDocCategories() { return this.docCategories.findAll(); }

  @Get('docs/categories/:id')
  getDocCategory(@Param('id') id: string) { return this.docCategories.findById(id); }

  @Post('docs/categories')
  createDocCategory(@Body() dto: CreateDocCategoryDto) { return this.docCategories.create(dto); }

  @Patch('docs/categories/:id')
  updateDocCategory(@Param('id') id: string, @Body() dto: UpdateDocCategoryDto) {
    return this.docCategories.update(id, dto);
  }

  @Delete('docs/categories/:id')
  removeDocCategory(@Param('id') id: string) { return this.docCategories.remove(id); }

  // ---- Documentation Center: articles ----

  @Get('docs/articles')
  listDocArticles(
    @Query('search') search?: string,
    @Query('status') status?: DocArticleStatus,
    @Query('category') category?: string,
  ) {
    return this.docArticles.findAll({ search, status, category });
  }

  @Get('docs/articles/:id')
  getDocArticle(@Param('id') id: string) { return this.docArticles.findById(id); }

  @Post('docs/articles')
  createDocArticle(@Body() dto: CreateDocArticleDto) { return this.docArticles.create(dto); }

  @Patch('docs/articles/:id')
  updateDocArticle(
    @Param('id') id: string,
    @Body() dto: UpdateDocArticleDto,
    @CurrentUser() admin: User,
  ) {
    return this.docArticles.update(id, dto, admin.name || admin.email);
  }

  @Delete('docs/articles/:id')
  removeDocArticle(@Param('id') id: string) { return this.docArticles.remove(id); }

  @Post('docs/articles/:id/publish')
  publishDocArticle(@Param('id') id: string) {
    return this.docArticles.setStatus(id, DocArticleStatus.PUBLISHED);
  }

  @Post('docs/articles/:id/unpublish')
  unpublishDocArticle(@Param('id') id: string) {
    return this.docArticles.setStatus(id, DocArticleStatus.DRAFT);
  }

  @Get('docs/articles/:id/versions')
  getDocVersions(@Param('id') id: string) { return this.docArticles.findVersions(id); }

  @Post('docs/articles/:id/versions/:versionId/restore')
  restoreDocVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.docArticles.restoreVersion(id, versionId);
  }
}
