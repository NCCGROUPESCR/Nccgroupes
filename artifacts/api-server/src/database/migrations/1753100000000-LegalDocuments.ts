import { MigrationInterface, QueryRunner } from 'typeorm';

export class LegalDocuments1753100000000 implements MigrationInterface {
  name = 'LegalDocuments1753100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "cms_legal_documents_status_enum" AS ENUM('draft', 'published', 'archived')`,
    );

    await queryRunner.query(`
      CREATE TABLE "cms_legal_documents" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title"               varchar NOT NULL,
        "slug"                varchar NOT NULL,
        "body"                text NOT NULL DEFAULT '',
        "featuredImageUrl"    varchar,
        "seoTitle"            varchar,
        "seoDescription"      text,
        "seoKeywords"         varchar,
        "tags"                text[] NOT NULL DEFAULT '{}',
        "author"              varchar,
        "versionNumber"       varchar NOT NULL DEFAULT '1.0',
        "status"              "cms_legal_documents_status_enum" NOT NULL DEFAULT 'draft',
        "publishedAt"         timestamptz,
        "scheduledPublishAt"  timestamptz,
        "createdAt"           timestamptz NOT NULL DEFAULT now(),
        "updatedAt"           timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cms_legal_documents_slug" ON "cms_legal_documents" ("slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE "cms_legal_document_revisions" (
        "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "documentId"    uuid NOT NULL,
        "title"         varchar NOT NULL,
        "body"          text NOT NULL DEFAULT '',
        "versionNumber" varchar NOT NULL DEFAULT '1.0',
        "editor"        varchar,
        "note"          varchar,
        "createdAt"     timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cms_legal_document_revisions_documentId" ON "cms_legal_document_revisions" ("documentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_legal_document_revisions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cms_legal_documents_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_legal_documents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cms_legal_documents_status_enum"`);
  }
}
