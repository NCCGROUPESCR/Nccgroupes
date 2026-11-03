import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rebrands current CMS and translation copy while preserving escrow disclosures,
 * transaction records, customer data, audit history, and immutable legal revisions.
 */
export class ArchandaBrandIdentity1793700000000 implements MigrationInterface {
  name = 'ArchandaBrandIdentity1793700000000';

  private readonly copyColumns: Record<string, string[]> = {
    cms_pages: ['title', 'subtitle'],
    cms_blog_posts: ['title', 'summary', 'content', 'seoTitle', 'seoDescription'],
    cms_doc_categories: ['name', 'description'],
    cms_doc_articles: ['title', 'shortDescription', 'body', 'seoTitle', 'seoDescription', 'seoKeywords'],
    i18n_translations: ['value'],
    pricing_plans: ['tagline'],
    directory_categories: ['name', 'description'],
  };

  private readonly copyReplacements: [string, string][] = [
    ['Secure escrow and logistics infrastructure for local and international trade.', 'Secure escrow services for local and international transactions.'],
    ['Escrow · Logistics · Trade assurance', 'Escrow · Transaction support'],
    ['Trade assurance', 'Escrow transaction support'],
    ['Cross-border trade', 'Cross-border transactions'],
    ['Trusted trade.', 'Clear transactions.'],
    ['Built for real trade', 'Built for secure transactions'],
    ['Crypto trade', 'Crypto transactions'],
    ['trade volume', 'transaction volume'],
    ['For high-volume and institutional trade', 'For high-volume and institutional transactions'],
    ['trade corridor', 'connected marketplace'],
    ['hold every trade', 'hold every transaction'],
    ['trade finance', 'international payments'],
    ['Trade and commerce platforms', 'Commerce resources and platforms'],
  ];

  private readonly textColumns: Record<string, string[]> = {
    cms_pages: ['title', 'subtitle'],
    cms_blog_posts: ['title', 'summary', 'content', 'authorName', 'seoTitle', 'seoDescription'],
    cms_contact_info: ['companyName', 'businessHours'],
    cms_staff_members: ['biography'],
    cms_legal_documents: ['title', 'body', 'seoTitle', 'seoDescription', 'seoKeywords', 'author'],
    cms_doc_categories: ['name', 'description'],
    cms_doc_articles: [
      'title',
      'shortDescription',
      'body',
      'authorName',
      'seoTitle',
      'seoDescription',
      'seoKeywords',
    ],
    i18n_translations: ['value'],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceBrandText(queryRunner, 'NCC Group Escrow', 'Archanda AG');

    if (await queryRunner.hasTable('cms_contact_info')) {
      await queryRunner.query(
        `ALTER TABLE "cms_contact_info" ALTER COLUMN "companyName" SET DEFAULT 'Archanda AG'`,
      );
    }

    if (await queryRunner.hasTable('cms_pages')) {
      await queryRunner.query(
        `UPDATE "cms_pages"
         SET "sections" = replace("sections"::text, $1, $2)::jsonb
         WHERE strpos("sections"::text, $1) > 0`,
        ['NCC Group Escrow', 'Archanda AG'],
      );
    }

    if (await queryRunner.hasTable('i18n_translations')) {
      await queryRunner.query(`
        UPDATE "i18n_translations"
        SET "value" = replace("value", 'start trading securely', 'complete transactions securely')
        WHERE "value" IS NOT NULL
          AND strpos("value", 'start trading securely') > 0
      `);
    }

    for (const [oldCopy, newCopy] of this.copyReplacements) {
      await this.replaceCopyText(queryRunner, oldCopy, newCopy);
    }

    if (await queryRunner.hasTable('cms_pages')) {
      for (const [oldCopy, newCopy] of this.copyReplacements) {
        await queryRunner.query(
          `UPDATE "cms_pages"
           SET "sections" = replace("sections"::text, $1, $2)::jsonb
           WHERE strpos("sections"::text, $1) > 0`,
          [oldCopy, newCopy],
        );
      }
    }

    if (await queryRunner.hasTable('directory_categories')) {
      await queryRunner.query(`
        UPDATE "directory_categories"
        SET "name" = 'Commerce',
            "description" = 'Commerce resources and platforms'
        WHERE "slug" = 'trade'
      `);
    }
  }

  public async down(): Promise<void> {
    throw new Error('This company rebrand migration is intentionally irreversible.');
  }

  private async replaceBrandText(
    queryRunner: QueryRunner,
    oldBrand: string,
    newBrand: string,
  ): Promise<void> {
    for (const [table, columns] of Object.entries(this.textColumns)) {
      if (!(await queryRunner.hasTable(table))) continue;

      for (const column of columns) {
        await queryRunner.query(
          `UPDATE "${table}"
           SET "${column}" = replace("${column}", $1, $2)
           WHERE "${column}" IS NOT NULL AND strpos("${column}", $1) > 0`,
          [oldBrand, newBrand],
        );
      }
    }
  }

  private async replaceCopyText(
    queryRunner: QueryRunner,
    oldCopy: string,
    newCopy: string,
  ): Promise<void> {
    for (const [table, columns] of Object.entries(this.copyColumns)) {
      if (!(await queryRunner.hasTable(table))) continue;

      for (const column of columns) {
        await queryRunner.query(
          `UPDATE "${table}"
           SET "${column}" = replace("${column}", $1, $2)
           WHERE "${column}" IS NOT NULL AND strpos("${column}", $1) > 0`,
          [oldCopy, newCopy],
        );
      }
    }
  }
}
