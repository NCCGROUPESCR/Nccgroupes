import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Updates company-facing CMS and translation copy without touching customer,
 * transaction, contact-message, or audit-history data.
 */
export class NccBrandIdentity1793610000000 implements MigrationInterface {
  name = 'NccBrandIdentity1793610000000';

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
    await this.replaceBrandText(queryRunner, 'Goldküste', 'NCC Group Escrow');
    if (await queryRunner.hasTable('cms_contact_info')) {
      await queryRunner.query(
        `ALTER TABLE "cms_contact_info" ALTER COLUMN "companyName" SET DEFAULT 'NCC Group Escrow'`,
      );
    }

    if (await queryRunner.hasTable('cms_pages')) {
      await queryRunner.query(
        `UPDATE "cms_pages"
         SET "sections" = replace("sections"::text, $1, $2)::jsonb
         WHERE strpos("sections"::text, $1) > 0`,
        ['Goldküste', 'NCC Group Escrow'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.replaceBrandText(queryRunner, 'NCC Group Escrow', 'Goldküste');

    if (await queryRunner.hasTable('cms_contact_info')) {
      await queryRunner.query(
        `ALTER TABLE "cms_contact_info" ALTER COLUMN "companyName" SET DEFAULT 'Goldküste'`,
      );
    }

    if (await queryRunner.hasTable('cms_pages')) {
      await queryRunner.query(
        `UPDATE "cms_pages"
         SET "sections" = replace("sections"::text, $1, $2)::jsonb
         WHERE strpos("sections"::text, $1) > 0`,
        ['NCC Group Escrow', 'Goldküste'],
      );
    }
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
}
