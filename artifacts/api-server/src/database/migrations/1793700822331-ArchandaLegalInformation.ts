import { MigrationInterface, QueryRunner } from 'typeorm';
import { ARCHANDA_LEGAL_INFORMATION } from '../content/archanda-legal-information';

export class ArchandaLegalInformation1793700822331 implements MigrationInterface {
  name = 'ArchandaLegalInformation1793700822331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('cms_legal_documents')) ||
      !(await queryRunner.hasTable('cms_legal_document_revisions'))
    ) {
      return;
    }

    const existing = await queryRunner.query(
      'SELECT "id" FROM "cms_legal_documents" WHERE "slug" = $1 LIMIT 1',
      [ARCHANDA_LEGAL_INFORMATION.slug],
    );
    if (existing.length) return;

    const inserted: { id: string }[] = await queryRunner.query(
      `INSERT INTO "cms_legal_documents"
         ("title", "slug", "body", "seoTitle", "seoDescription", "tags",
          "versionNumber", "status", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, '1.0', 'published', NOW(), NOW(), NOW())
       RETURNING "id"`,
      [
        ARCHANDA_LEGAL_INFORMATION.title,
        ARCHANDA_LEGAL_INFORMATION.slug,
        ARCHANDA_LEGAL_INFORMATION.body,
        ARCHANDA_LEGAL_INFORMATION.seoTitle,
        ARCHANDA_LEGAL_INFORMATION.seoDescription,
        [...ARCHANDA_LEGAL_INFORMATION.tags],
      ],
    );
    if (!inserted.length) return;

    await queryRunner.query(
      `INSERT INTO "cms_legal_document_revisions"
         ("documentId", "title", "body", "versionNumber", "editor", "note", "createdAt")
       VALUES ($1, $2, $3, '1.0', 'System', 'Initial published legal information', NOW())`,
      [inserted[0].id, ARCHANDA_LEGAL_INFORMATION.title, ARCHANDA_LEGAL_INFORMATION.body],
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'This legal-content migration is intentionally irreversible to preserve the published legal record and revision history.',
    );
  }
}
