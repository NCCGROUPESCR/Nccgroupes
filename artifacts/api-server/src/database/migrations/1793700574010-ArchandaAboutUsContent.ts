import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  ARCHANDA_ABOUT_SECTIONS,
  ARCHANDA_DEFAULT_ABOUT_SECTIONS,
} from '../content/archanda-about-sections';

export class ArchandaAboutUsContent1793700574010 implements MigrationInterface {
  name = 'ArchandaAboutUsContent1793700574010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('cms_pages'))) return;

    await queryRunner.query(
      `INSERT INTO "cms_pages"
         ("slug", "title", "subtitle", "sections", "status", "publishedAt", "createdAt", "updatedAt")
       VALUES
         ('about-us', 'About Archanda AG',
          'Who we are, our purpose, and our registered information.',
          $1::jsonb, 'published', NOW(), NOW(), NOW())
       ON CONFLICT ("slug") DO UPDATE
       SET "sections" = CASE
         WHEN COALESCE(
           "cms_pages"."sections" @> '[{"id":"archanda-who-we-are"}]'::jsonb,
           FALSE
         ) THEN "cms_pages"."sections"
         ELSE COALESCE("cms_pages"."sections", '[]'::jsonb) || $2::jsonb
       END,
       "updatedAt" = NOW()`,
      [
        JSON.stringify(ARCHANDA_DEFAULT_ABOUT_SECTIONS),
        JSON.stringify(ARCHANDA_ABOUT_SECTIONS),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('cms_pages'))) return;

    const addedSectionIds = ARCHANDA_ABOUT_SECTIONS.map((section) => section.id);
    await queryRunner.query(
      `UPDATE "cms_pages"
       SET "sections" = COALESCE(
         (
           SELECT jsonb_agg(section.value ORDER BY section.ordinality)
           FROM jsonb_array_elements("cms_pages"."sections")
             WITH ORDINALITY AS section(value, ordinality)
           WHERE section.value ->> 'id' <> ALL($1::text[])
         ),
         '[]'::jsonb
       ),
       "updatedAt" = NOW()
       WHERE "slug" = 'about-us'`,
      [addedSectionIds],
    );
  }
}
