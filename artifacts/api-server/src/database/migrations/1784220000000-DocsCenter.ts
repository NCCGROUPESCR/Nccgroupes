import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Documentation Center migration.
 *
 * Creates three tables:
 * - cms_doc_categories: admin-managed categories
 * - cms_doc_articles:   documentation articles with JSONB columns for
 *                       gallery images, file attachments, and videos
 * - cms_doc_versions:   immutable pre-save snapshots for version history
 *
 * Seeds 8 default categories so the Documentation Center is immediately usable.
 */
export class DocsCenter1784220000000 implements MigrationInterface {
  name = 'DocsCenter1784220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Categories ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cms_doc_categories" (
        "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
        "name"         varchar     NOT NULL,
        "slug"         varchar     NOT NULL,
        "description"  text,
        "displayOrder" int         NOT NULL DEFAULT 0,
        "createdAt"    timestamptz NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cms_doc_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cms_doc_categories_slug" UNIQUE ("slug")
      )
    `);

    // ---- Status enum ----
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "cms_doc_articles_status_enum" AS ENUM ('draft', 'published');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ---- Articles ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cms_doc_articles" (
        "id"               uuid                              NOT NULL DEFAULT gen_random_uuid(),
        "title"            varchar                           NOT NULL,
        "slug"             varchar                           NOT NULL,
        "categoryId"       uuid,
        "shortDescription" text,
        "body"             text                              NOT NULL DEFAULT '',
        "featuredImageUrl" varchar,
        "galleryImages"    jsonb                             NOT NULL DEFAULT '[]',
        "attachments"      jsonb                             NOT NULL DEFAULT '[]',
        "videos"           jsonb                             NOT NULL DEFAULT '[]',
        "tags"             text[]                            NOT NULL DEFAULT '{}',
        "authorName"       varchar,
        "seoTitle"         varchar,
        "seoDescription"   text,
        "seoKeywords"      varchar,
        "status"           "cms_doc_articles_status_enum"   NOT NULL DEFAULT 'draft',
        "featured"         boolean                           NOT NULL DEFAULT false,
        "displayOrder"     int                               NOT NULL DEFAULT 0,
        "publishedAt"      timestamptz,
        "createdAt"        timestamptz                       NOT NULL DEFAULT now(),
        "updatedAt"        timestamptz                       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cms_doc_articles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cms_doc_articles_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_doc_articles_slug"
        ON "cms_doc_articles" ("slug")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_doc_articles_categoryId"
        ON "cms_doc_articles" ("categoryId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_doc_articles_status"
        ON "cms_doc_articles" ("status")
    `);

    // ---- Version history ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cms_doc_versions" (
        "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
        "articleId"     uuid        NOT NULL,
        "versionNumber" varchar     NOT NULL,
        "editor"        varchar,
        "changeSummary" varchar,
        "bodySnapshot"  text        NOT NULL DEFAULT '',
        "createdAt"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cms_doc_versions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_doc_versions_articleId"
        ON "cms_doc_versions" ("articleId")
    `);

    // ---- Seed default categories ----
    await queryRunner.query(`
      INSERT INTO "cms_doc_categories" ("name","slug","description","displayOrder") VALUES
        ('User Guides',           'user-guides',           'Getting started guides for buyers, sellers, and logistics providers.', 0),
        ('Buyer Documentation',   'buyer-documentation',   'Everything a buyer needs to know about creating and managing escrow transactions.', 1),
        ('Seller Documentation',  'seller-documentation',  'How to receive payments, manage orders, and work with escrow as a seller.', 2),
        ('Logistics Documentation','logistics-documentation','Shipment creation, tracking, and logistics provider workflows.', 3),
        ('API Documentation',     'api-documentation',     'Developer reference for the NCC Group Escrow REST API.', 4),
        ('Integration Guides',    'integration-guides',    'Step-by-step guides for integrating NCC Group Escrow into your platform.', 5),
        ('Company Documents',     'company-documents',     'Policies, compliance, and official company documentation.', 6),
        ('Downloads',             'downloads',             'Downloadable resources including forms, templates, and press kit.', 7)
      ON CONFLICT ("slug") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_doc_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_doc_articles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_doc_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cms_doc_articles_status_enum"`);
  }
}
