import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { DocArticle, DocArticleStatus } from './entities/doc-article.entity';
import { DocVersion } from './entities/doc-version.entity';
import { CreateDocArticleDto } from './dto/create-doc-article.dto';
import { UpdateDocArticleDto } from './dto/update-doc-article.dto';

@Injectable()
export class DocArticleService {
  constructor(
    @InjectRepository(DocArticle)
    private readonly repo: Repository<DocArticle>,
    @InjectRepository(DocVersion)
    private readonly versionRepo: Repository<DocVersion>,
  ) {}

  // ---- Public ----

  async findPublished(opts: {
    search?: string;
    category?: string;
    tag?: string;
  }): Promise<DocArticle[]> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: DocArticleStatus.PUBLISHED });

    if (opts.category) {
      qb.andWhere('a.categoryId = :category', { category: opts.category });
    }
    if (opts.tag) {
      qb.andWhere(':tag = ANY(a.tags)', { tag: opts.tag });
    }
    if (opts.search) {
      qb.andWhere(
        '(a.title ILIKE :q OR a.shortDescription ILIKE :q OR a.body ILIKE :q OR a.seoKeywords ILIKE :q OR :q = ANY(a.tags))',
        { q: `%${opts.search}%` },
      );
    }

    return qb
      .select([
        'a.id', 'a.title', 'a.slug', 'a.categoryId', 'a.shortDescription',
        'a.featuredImageUrl', 'a.tags', 'a.authorName', 'a.featured',
        'a.displayOrder', 'a.publishedAt', 'a.createdAt', 'a.updatedAt',
      ])
      .orderBy('a.featured', 'DESC')
      .addOrderBy('a.displayOrder', 'ASC')
      .addOrderBy('a.publishedAt', 'DESC')
      .getMany();
  }

  async findPublishedBySlug(slug: string): Promise<DocArticle> {
    const article = await this.repo.findOne({
      where: { slug, status: DocArticleStatus.PUBLISHED },
    });
    if (!article) throw new NotFoundException('Documentation article not found.');
    return article;
  }

  // ---- Admin ----

  async findAll(opts: { search?: string; status?: DocArticleStatus; category?: string }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    if (opts.category) where.categoryId = opts.category;

    let articles = await this.repo.find({
      where,
      order: { displayOrder: 'ASC', updatedAt: 'DESC' },
    });

    if (opts.search) {
      const q = opts.search.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.shortDescription ?? '').toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return articles;
  }

  async findById(id: string): Promise<DocArticle> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Documentation article not found.');
    return article;
  }

  async create(dto: CreateDocArticleDto): Promise<DocArticle> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('An article with that slug already exists.');

    const article = this.repo.create({
      title: dto.title,
      slug: dto.slug,
      categoryId: dto.categoryId ?? null,
      shortDescription: dto.shortDescription ?? null,
      body: dto.body ?? '',
      featuredImageUrl: dto.featuredImageUrl ?? null,
      galleryImages: dto.galleryImages ?? [],
      attachments: dto.attachments ?? [],
      videos: dto.videos ?? [],
      tags: dto.tags ?? [],
      authorName: dto.authorName ?? null,
      seoTitle: dto.seoTitle ?? null,
      seoDescription: dto.seoDescription ?? null,
      seoKeywords: dto.seoKeywords ?? null,
      status: dto.status ?? DocArticleStatus.DRAFT,
      featured: dto.featured ?? false,
      displayOrder: dto.displayOrder ?? 0,
    });
    return this.repo.save(article);
  }

  async update(id: string, dto: UpdateDocArticleDto, editorName?: string): Promise<DocArticle> {
    const article = await this.findById(id);

    if (dto.slug && dto.slug !== article.slug) {
      const clash = await this.repo.findOne({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('An article with that slug already exists.');
    }

    // Snapshot BEFORE applying changes
    const nextVersionNumber = await this.nextVersion(id);
    const snapshot = this.versionRepo.create({
      articleId: id,
      versionNumber: nextVersionNumber,
      editor: editorName ?? null,
      changeSummary: dto.changeSummary ?? null,
      bodySnapshot: article.body,
    });
    await this.versionRepo.save(snapshot);

    Object.assign(article, dto);
    return this.repo.save(article);
  }

  async setStatus(id: string, status: DocArticleStatus): Promise<DocArticle> {
    const article = await this.findById(id);
    article.status = status;
    if (status === DocArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }
    return this.repo.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findById(id);
    await this.repo.remove(article);
  }

  async findVersions(articleId: string): Promise<DocVersion[]> {
    return this.versionRepo.find({
      where: { articleId },
      order: { createdAt: 'DESC' },
    });
  }

  async restoreVersion(articleId: string, versionId: string): Promise<DocArticle> {
    const version = await this.versionRepo.findOne({ where: { id: versionId, articleId } });
    if (!version) throw new NotFoundException('Version not found.');

    const article = await this.findById(articleId);

    // Snapshot current state before restoring
    const nextVersion = await this.nextVersion(articleId);
    await this.versionRepo.save(
      this.versionRepo.create({
        articleId,
        versionNumber: nextVersion,
        editor: 'restore',
        changeSummary: `Restored from version ${version.versionNumber}`,
        bodySnapshot: article.body,
      }),
    );

    article.body = version.bodySnapshot;
    return this.repo.save(article);
  }

  private async nextVersion(articleId: string): Promise<string> {
    const count = await this.versionRepo.count({ where: { articleId } });
    return `${count + 1}.0`;
  }
}
