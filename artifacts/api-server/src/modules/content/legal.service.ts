import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { LegalDocument, LegalDocumentStatus } from './entities/legal-document.entity';
import { LegalDocumentRevision } from './entities/legal-document-revision.entity';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(LegalDocument)
    private readonly repo: Repository<LegalDocument>,
    @InjectRepository(LegalDocumentRevision)
    private readonly revisionRepo: Repository<LegalDocumentRevision>,
  ) {}

  // ---- Public ----

  /** List all published documents (lightweight — no body). */
  findPublished(): Promise<Pick<LegalDocument, 'id' | 'title' | 'slug' | 'seoTitle' | 'updatedAt'>[]> {
    return this.repo.find({
      where: { status: LegalDocumentStatus.PUBLISHED },
      select: ['id', 'title', 'slug', 'seoTitle', 'updatedAt'],
      order: { title: 'ASC' },
    });
  }

  /** Get one published document by slug (full body). */
  async findPublishedBySlug(slug: string): Promise<LegalDocument> {
    const doc = await this.repo.findOne({ where: { slug } });
    if (!doc || doc.status !== LegalDocumentStatus.PUBLISHED) {
      throw new NotFoundException('Legal document not found.');
    }
    return doc;
  }

  // ---- Admin ----

  /** Admin: list all documents with optional status filter and search. */
  findAll(opts: { status?: LegalDocumentStatus; search?: string }): Promise<LegalDocument[]> {
    const where: Record<string, unknown> = {};
    if (opts.status) where.status = opts.status;
    if (opts.search) where.title = ILike(`%${opts.search}%`);
    return this.repo.find({ where, order: { title: 'ASC' } });
  }

  /** Admin: get one document by id regardless of status. */
  async findById(id: string): Promise<LegalDocument> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Legal document not found.');
    return doc;
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (await this.repo.findOne({ where: { slug } }).then((d) => !!d && d.id !== ignoreId)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  async create(dto: CreateLegalDocumentDto): Promise<LegalDocument> {
    const baseSlug = slugify(dto.slug || dto.title);
    const slug = await this.uniqueSlug(baseSlug);
    const doc = this.repo.create({
      ...dto,
      slug,
      tags: dto.tags ?? [],
      versionNumber: dto.versionNumber ?? '1.0',
      body: dto.body ?? '',
      scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
    });
    const saved = await this.repo.save(doc);
    // Capture initial revision
    await this.revisionRepo.save(
      this.revisionRepo.create({
        documentId: saved.id,
        title: saved.title,
        body: saved.body,
        versionNumber: saved.versionNumber,
        editor: dto.revisionNote ? 'System' : null,
        note: dto.revisionNote ?? 'Initial version',
      }),
    );
    return saved;
  }

  async update(id: string, dto: UpdateLegalDocumentDto): Promise<LegalDocument> {
    const doc = await this.findById(id);

    // Snapshot before applying changes
    await this.revisionRepo.save(
      this.revisionRepo.create({
        documentId: doc.id,
        title: doc.title,
        body: doc.body,
        versionNumber: doc.versionNumber,
        editor: dto.editorName ?? null,
        note: dto.revisionNote ?? null,
      }),
    );

    if (dto.slug && dto.slug !== doc.slug) {
      doc.slug = await this.uniqueSlug(slugify(dto.slug), doc.id);
    }
    const { slug: _s, revisionNote: _n, editorName: _e, scheduledPublishAt, ...rest } = dto;
    Object.assign(doc, rest);
    if (scheduledPublishAt !== undefined) {
      doc.scheduledPublishAt = scheduledPublishAt ? new Date(scheduledPublishAt) : null;
    }
    return this.repo.save(doc);
  }

  async setStatus(id: string, status: LegalDocumentStatus): Promise<LegalDocument> {
    const doc = await this.findById(id);
    doc.status = status;
    if (status === LegalDocumentStatus.PUBLISHED && !doc.publishedAt) {
      doc.publishedAt = new Date();
    }
    return this.repo.save(doc);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // ---- Revisions ----

  findRevisions(documentId: string): Promise<LegalDocumentRevision[]> {
    return this.revisionRepo.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
  }

  async restoreRevision(documentId: string, revisionId: string): Promise<LegalDocument> {
    const doc = await this.findById(documentId);
    const revision = await this.revisionRepo.findOne({ where: { id: revisionId, documentId } });
    if (!revision) throw new NotFoundException('Revision not found.');

    // Snapshot current state before restoring
    await this.revisionRepo.save(
      this.revisionRepo.create({
        documentId: doc.id,
        title: doc.title,
        body: doc.body,
        versionNumber: doc.versionNumber,
        editor: 'System',
        note: `Auto-snapshot before restoring revision from ${revision.createdAt.toISOString()}`,
      }),
    );

    doc.title = revision.title;
    doc.body = revision.body;
    doc.versionNumber = revision.versionNumber;
    const restored = await this.repo.save(doc);

    // Record the restore action as a new revision
    await this.revisionRepo.save(
      this.revisionRepo.create({
        documentId: doc.id,
        title: restored.title,
        body: restored.body,
        versionNumber: restored.versionNumber,
        editor: 'System',
        note: `Restored from revision ${revisionId}`,
      }),
    );

    return restored;
  }
}
