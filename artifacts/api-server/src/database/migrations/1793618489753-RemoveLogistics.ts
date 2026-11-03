import { rmSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permanently removes shipment/tracking records and removes logistics-only
 * account capabilities while preserving user accounts, wallets, escrow
 * transactions, and their audit history.
 */
export class RemoveLogistics1793618489753 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // These rows and their uploaded photos were explicitly approved for deletion.
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_checkpoints"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tracking_statuses"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "shipment_mode_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkpoint_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "shipment_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "shipment_checkpoint_status_enum" CASCADE`);

    // Update platform-owned CMS copy. Preserve user-authored messages and
    // historical agreement terms in financial transaction records.
    await queryRunner.query(`
      UPDATE cms_pages
      SET sections = replace(
        replace(
          replace(sections::text,
            'The platform is designed to make cross-border trade safer for buyers, sellers, and logistics partners across West Africa and beyond.',
            'NCC Group Escrow helps buyers and sellers transact with clear terms and protected escrow across West Africa and beyond.'),
          'To hold every trade to the same standard: payment only moves when delivery is confirmed.',
          'To hold every trade to the same standard: payment only moves when the agreed conditions are confirmed.'),
        'Our leadership team brings decades of combined experience in fintech, logistics, and trade finance.',
        'Our leadership team brings decades of combined experience in fintech and trade finance.')::jsonb
      WHERE slug = 'about-us'
    `);
    await queryRunner.query(`
      UPDATE cms_pages
      SET subtitle = 'Answers to common questions about escrow and payments.',
          sections = replace(
            replace(sections::text,
              'Answers to common questions about escrow, tracking, and payments.',
              'Answers to common questions about escrow and payments.'),
            'Escrow means NCC Group Escrow holds the buyer’s payment securely until the seller’s delivery is confirmed.',
            'Escrow means NCC Group Escrow holds the buyer’s payment securely until the agreed transaction conditions are confirmed.')::jsonb
      WHERE slug = 'faq'
    `);
    await queryRunner.query(`
      UPDATE cms_pages
      SET sections = replace(sections::text,
        'Funds are released to the seller within minutes of delivery confirmation.',
        'Funds are released after the buyer confirms the agreed conditions.')::jsonb
      WHERE slug = 'faq'
    `);
    await queryRunner.query(`
      UPDATE cms_blog_posts
      SET summary = 'Introducing NCC Group Escrow for secure cross-border transactions.',
          content = '<p>NCC Group Escrow holds payment securely until the agreed transaction conditions are confirmed, with private deal chat and dispute resolution.</p>',
          "seoDescription" = 'Introducing NCC Group Escrow for secure cross-border transactions.'
      WHERE slug IN ('welcome-to-goldkuste', 'welcome-to-ncc-group-escrow')
    `);

    // Remove obsolete labels and event subscriptions in their active stores.
    await queryRunner.query(`
      DELETE FROM i18n_translations
      WHERE "key" ~* '(logistics|shipment|tracking|shipping|freight|courier|carrier|transit|delivered|delivery|dispatch|warehouse|pickup|customs)'
         OR COALESCE("value", '') ~* '(logistics|shipment|tracking|shipping|freight|courier|carrier|transit|delivered|delivery|dispatch|warehouse|pickup|customs)'
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.webhooks') IS NOT NULL THEN
          UPDATE webhooks
          SET events = array_remove(events, 'shipment.updated')
          WHERE 'shipment.updated' = ANY(events);
        END IF;
      END;
      $$
    `);

    // Keep directory listings as unpublished records, but remove the
    // logistics-only categories from the active product.
    await queryRunner.query(`
      INSERT INTO directory_categories (slug, name, description, display_order)
      VALUES ('other', 'Other', 'Other resources', 12)
      ON CONFLICT (slug) DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE directories
      SET status = 'unpublished',
          category_id = (SELECT id FROM directory_categories WHERE slug = 'other')
      WHERE category_id IN (
        SELECT id FROM directory_categories WHERE slug IN ('logistics', 'shipping')
      )
    `);
    await queryRunner.query(`
      DELETE FROM directory_categories WHERE slug IN ('logistics', 'shipping')
    `);

    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "logisticsId"`);

    // Preserve former provider accounts and their financial history, but
    // prevent those accounts from authenticating or using escrow features.
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`
      CREATE TYPE "user_role_enum_replacement" AS ENUM
        ('buyer', 'seller', 'inactive', 'business', 'support', 'admin', 'developer')
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role_enum_replacement"
      USING (
        CASE WHEN "role"::text = 'logistics' THEN 'inactive' ELSE "role"::text END
      )::"user_role_enum_replacement"
    `);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
    await queryRunner.query(`ALTER TYPE "user_role_enum_replacement" RENAME TO "user_role_enum"`);

    // Replace shipping milestones with an escrow-only confirmation milestone.
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum_replacement" AS ENUM
        ('pending', 'funding_submitted', 'secured', 'confirmed', 'dispute', 'released', 'refunded', 'cancelled')
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "transaction_status_enum_replacement"
      USING (
        CASE
          WHEN "status"::text = 'transit' THEN 'secured'
          WHEN "status"::text = 'delivered' THEN 'confirmed'
          ELSE "status"::text
        END
      )::"transaction_status_enum_replacement"
    `);
    await queryRunner.query(`DROP TYPE "transaction_status_enum"`);
    await queryRunner.query(`ALTER TYPE "transaction_status_enum_replacement" RENAME TO "transaction_status_enum"`);
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'`);

    // Local uploads are not stored in the database; remove them as part of
    // the same explicitly authorized data cleanup.
    rmSync(join(process.cwd(), 'uploads', 'tracking-photos'), { recursive: true, force: true });
  }

  async down(): Promise<void> {
    throw new Error(
      'This migration permanently deletes shipment/tracking records and cannot be reversed.',
    );
  }
}
