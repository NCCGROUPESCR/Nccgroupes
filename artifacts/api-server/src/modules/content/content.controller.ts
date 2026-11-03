import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PagesService, EDITABLE_PAGE_SLUGS } from './pages.service';
import { BlogService } from './blog.service';
import { StaffService } from './staff.service';
import { ContactService } from './contact.service';
import { LegalService } from './legal.service';
import { DocCategoryService } from './doc-category.service';
import { DocArticleService } from './doc-article.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

/** Public read-only CMS endpoints — consumed by the marketing site. No auth required. */
@ApiTags('cms')
@Controller('v1/cms')
export class ContentController {
  constructor(
    private readonly pages: PagesService,
    private readonly blog: BlogService,
    private readonly staff: StaffService,
    private readonly contact: ContactService,
    private readonly legal: LegalService,
    private readonly docCategories: DocCategoryService,
    private readonly docArticles: DocArticleService,
  ) {}

  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) {
    if (!EDITABLE_PAGE_SLUGS.includes(slug as (typeof EDITABLE_PAGE_SLUGS)[number])) {
      throw new NotFoundException('Page not found.');
    }
    return this.pages.findPublished(slug);
  }

  @Get('blog')
  listBlogPosts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.blog.findPublished({ search, category, tag });
  }

  @Get('blog/:slug')
  getBlogPost(@Param('slug') slug: string) {
    return this.blog.findPublishedBySlug(slug);
  }

  @Get('staff')
  listStaff() {
    return this.staff.findAll();
  }

  @Get('contact-info')
  getContactInfo() {
    return this.contact.getInfo();
  }

  @Post('contact')
  submitContactMessage(@Body() dto: CreateContactMessageDto) {
    return this.contact.submitMessage(dto);
  }

  // ---- Legal documents (public) ----

  @Get('legal')
  listLegalDocuments() {
    return this.legal.findPublished();
  }

  @Get('legal/:slug')
  getLegalDocument(@Param('slug') slug: string) {
    return this.legal.findPublishedBySlug(slug);
  }

  // ---- Documentation Center (public) ----

  @Get('docs/categories')
  listDocCategories() {
    return this.docCategories.findAll();
  }

  @Get('docs/articles')
  listDocArticles(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.docArticles.findPublished({ search, category, tag });
  }

  @Get('docs/articles/:slug')
  getDocArticle(@Param('slug') slug: string) {
    return this.docArticles.findPublishedBySlug(slug);
  }
}
