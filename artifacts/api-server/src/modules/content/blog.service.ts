import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { BlogPost, BlogPostStatus } from './entities/blog-post.entity';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly repo: Repository<BlogPost>,
  ) {}

  /** Public: list published posts, newest first, with optional search/category/tag filters. */
  async findPublished(opts: { search?: string; category?: string; tag?: string }): Promise<BlogPost[]> {
    const qb = this.repo
      .createQueryBuilder('post')
      .where('post.status = :status', { status: BlogPostStatus.PUBLISHED });
    if (opts.search) {
      qb.andWhere('(post.title ILIKE :s OR post.summary ILIKE :s)', { s: `%${opts.search}%` });
    }
    if (opts.category) {
      qb.andWhere(':category = ANY(post.categories)', { category: opts.category });
    }
    if (opts.tag) {
      qb.andWhere(':tag = ANY(post.tags)', { tag: opts.tag });
    }
    qb.orderBy('post.publishDate', 'DESC', 'NULLS LAST').addOrderBy('post.createdAt', 'DESC');
    return qb.getMany();
  }

  async findPublishedBySlug(slug: string): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { slug, status: BlogPostStatus.PUBLISHED } });
    if (!post) throw new NotFoundException('Blog post not found.');
    return post;
  }

  /** Admin: list all posts (draft + published) with optional search/status filter. */
  async findAll(opts: { search?: string; status?: BlogPostStatus }): Promise<BlogPost[]> {
    const where: Record<string, unknown> = {};
    if (opts.status) where.status = opts.status;
    if (opts.search) where.title = ILike(`%${opts.search}%`);
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found.');
    return post;
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (await this.repo.findOne({ where: { slug } }).then((p) => !!p && p.id !== ignoreId)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  async create(dto: CreateBlogPostDto): Promise<BlogPost> {
    const baseSlug = slugify(dto.slug || dto.title);
    const slug = await this.uniqueSlug(baseSlug);
    const post = this.repo.create({
      ...dto,
      slug,
      publishDate: dto.publishDate ? new Date(dto.publishDate) : null,
    });
    return this.repo.save(post);
  }

  async update(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.findById(id);
    if (dto.slug && dto.slug !== post.slug) {
      post.slug = await this.uniqueSlug(slugify(dto.slug), post.id);
    }
    const { slug: _ignored, publishDate, ...rest } = dto;
    Object.assign(post, rest);
    if (publishDate !== undefined) post.publishDate = publishDate ? new Date(publishDate) : null;
    return this.repo.save(post);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async setStatus(id: string, status: BlogPostStatus): Promise<BlogPost> {
    const post = await this.findById(id);
    post.status = status;
    if (status === BlogPostStatus.PUBLISHED && !post.publishDate) post.publishDate = new Date();
    return this.repo.save(post);
  }
}
