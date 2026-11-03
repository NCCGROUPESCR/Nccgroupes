import { MigrationInterface, QueryRunner } from 'typeorm';

export class CmsContent1753000000000 implements MigrationInterface {
  name = 'CmsContent1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "cms_pages_status_enum" AS ENUM('draft', 'published')`);
    await queryRunner.query(`
      CREATE TABLE "cms_pages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" varchar UNIQUE NOT NULL,
        "title" varchar NOT NULL,
        "subtitle" text,
        "bannerImageUrl" varchar,
        "sections" jsonb NOT NULL DEFAULT '[]',
        "status" "cms_pages_status_enum" NOT NULL DEFAULT 'draft',
        "publishedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE TYPE "cms_blog_posts_status_enum" AS ENUM('draft', 'published')`);
    await queryRunner.query(`
      CREATE TABLE "cms_blog_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "summary" text,
        "content" text NOT NULL DEFAULT '',
        "featuredImageUrl" varchar,
        "authorName" varchar,
        "status" "cms_blog_posts_status_enum" NOT NULL DEFAULT 'draft',
        "publishDate" timestamptz,
        "categories" text[] NOT NULL DEFAULT '{}',
        "tags" text[] NOT NULL DEFAULT '{}',
        "seoTitle" varchar,
        "seoDescription" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cms_blog_posts_slug" ON "cms_blog_posts" ("slug")`);

    await queryRunner.query(`
      CREATE TABLE "cms_staff_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "fullName" varchar NOT NULL,
        "position" varchar NOT NULL,
        "department" varchar,
        "biography" text,
        "photoUrl" varchar,
        "email" varchar,
        "linkedin" varchar,
        "twitter" varchar,
        "displayOrder" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cms_contact_info" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyName" varchar NOT NULL DEFAULT 'NCC Group Escrow',
        "addresses" text[] NOT NULL DEFAULT '{}',
        "emails" text[] NOT NULL DEFAULT '{}',
        "phones" text[] NOT NULL DEFAULT '{}',
        "whatsapp" varchar,
        "businessHours" text,
        "mapsEmbedUrl" text,
        "socialLinks" jsonb NOT NULL DEFAULT '{}',
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE TYPE "cms_contact_messages_status_enum" AS ENUM('new', 'read', 'replied', 'closed')`);
    await queryRunner.query(`
      CREATE TABLE "cms_contact_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "phone" varchar,
        "subject" varchar NOT NULL,
        "message" text NOT NULL,
        "status" "cms_contact_messages_status_enum" NOT NULL DEFAULT 'new',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cms_contact_messages"`);
    await queryRunner.query(`DROP TYPE "cms_contact_messages_status_enum"`);
    await queryRunner.query(`DROP TABLE "cms_contact_info"`);
    await queryRunner.query(`DROP TABLE "cms_staff_members"`);
    await queryRunner.query(`DROP INDEX "IDX_cms_blog_posts_slug"`);
    await queryRunner.query(`DROP TABLE "cms_blog_posts"`);
    await queryRunner.query(`DROP TYPE "cms_blog_posts_status_enum"`);
    await queryRunner.query(`DROP TABLE "cms_pages"`);
    await queryRunner.query(`DROP TYPE "cms_pages_status_enum"`);
  }
}
