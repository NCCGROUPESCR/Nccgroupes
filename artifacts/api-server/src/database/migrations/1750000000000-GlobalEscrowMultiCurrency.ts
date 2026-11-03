import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Global Escrow + Multi-Currency migration.
 *
 * What changes:
 * - users: preferredCurrency, country, locale
 * - transactions: drop NGN default from currency; add currencySymbol, exchangeRate,
 *   escrowProvider, escrowPaymentInstructions, escrowAssignedAt, escrowAssignedBy,
 *   escrowAssignmentHistory
 * - currencies: new table seeded with common ISO 4217 currencies
 * - tracking_statuses: new table for admin-managed tracking status labels
 */
export class GlobalEscrowMultiCurrency1750000000000 implements MigrationInterface {
  name = 'GlobalEscrowMultiCurrency1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- users: profile locale fields ----
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "preferredCurrency" char(3),
        ADD COLUMN IF NOT EXISTS "country"           varchar,
        ADD COLUMN IF NOT EXISTS "locale"            varchar
    `);

    // ---- transactions: drop NGN-specific default + add global escrow fields ----
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "currency" DROP DEFAULT`);
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN IF NOT EXISTS "currencySymbol"           varchar,
        ADD COLUMN IF NOT EXISTS "exchangeRate"             numeric(18,8),
        ADD COLUMN IF NOT EXISTS "escrowProvider"           varchar,
        ADD COLUMN IF NOT EXISTS "escrowPaymentInstructions" text,
        ADD COLUMN IF NOT EXISTS "escrowAssignedAt"         timestamptz,
        ADD COLUMN IF NOT EXISTS "escrowAssignedBy"         uuid,
        ADD COLUMN IF NOT EXISTS "escrowAssignmentHistory"  jsonb
    `);

    // ---- currencies table ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "currencies" (
        "id"           uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code"         char(3) NOT NULL,
        "symbol"       varchar NOT NULL,
        "name"         varchar NOT NULL,
        "isActive"     boolean NOT NULL DEFAULT true,
        "displayOrder" int     NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_currencies_code" ON "currencies" ("code")
    `);

    // Seed common currencies (idempotent via ON CONFLICT DO NOTHING)
    await queryRunner.query(`
      INSERT INTO "currencies" ("code","symbol","name","isActive","displayOrder") VALUES
        ('USD','$','US Dollar',         true, 1),
        ('EUR','€','Euro',              true, 2),
        ('GBP','£','British Pound',     true, 3),
        ('GHS','₵','Ghanaian Cedi',     true, 4),
        ('NGN','₦','Nigerian Naira',    true, 5),
        ('KES','KSh','Kenyan Shilling', true, 6),
        ('ZAR','R','South African Rand',true, 7),
        ('XOF','CFA','West African CFA Franc',true,8),
        ('CAD','CA$','Canadian Dollar', true, 9),
        ('AED','د.إ','UAE Dirham',     true,10),
        ('CNY','¥','Chinese Yuan',      true,11),
        ('INR','₹','Indian Rupee',      true,12),
        ('EGP','E£','Egyptian Pound',   true,13),
        ('MAD','MAD','Moroccan Dirham', true,14)
      ON CONFLICT ("code") DO NOTHING
    `);

    // ---- tracking_statuses table ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tracking_statuses" (
        "id"           uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
        "label"        varchar NOT NULL,
        "description"  text,
        "isActive"     boolean NOT NULL DEFAULT true,
        "displayOrder" int     NOT NULL DEFAULT 0,
        "createdAt"    timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Seed default statuses (only if table is empty)
    await queryRunner.query(`
      INSERT INTO "tracking_statuses" ("label","description","isActive","displayOrder")
      SELECT * FROM (VALUES
        ('Order Dispatched',      'Item dispatched by seller',                true, 1),
        ('Picked Up',             'Collected by logistics provider',          true, 2),
        ('In Transit',            'Shipment is en route',                    true, 3),
        ('At Customs',            'Being processed at customs',              true, 4),
        ('Customs Cleared',       'Cleared customs, continuing to destination',true,5),
        ('Arrived at Hub',        'Arrived at local distribution hub',       true, 6),
        ('Out for Delivery',      'Final-mile delivery in progress',         true, 7),
        ('Delivery Attempted',    'Delivery attempt unsuccessful',           true, 8),
        ('Delivered',             'Successfully delivered to buyer',         true, 9),
        ('Exception / Issue',     'Shipment issue requires attention',       true,10),
        ('Returned to Sender',    'Shipment being returned',                 true,11)
      ) AS v("label","description","isActive","displayOrder")
      WHERE NOT EXISTS (SELECT 1 FROM "tracking_statuses" LIMIT 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tracking_statuses"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_currencies_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "currencies"`);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        DROP COLUMN IF EXISTS "escrowAssignmentHistory",
        DROP COLUMN IF EXISTS "escrowAssignedBy",
        DROP COLUMN IF EXISTS "escrowAssignedAt",
        DROP COLUMN IF EXISTS "escrowPaymentInstructions",
        DROP COLUMN IF EXISTS "escrowProvider",
        DROP COLUMN IF EXISTS "exchangeRate",
        DROP COLUMN IF EXISTS "currencySymbol"
    `);
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "currency" SET DEFAULT 'NGN'`);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "locale",
        DROP COLUMN IF EXISTS "country",
        DROP COLUMN IF EXISTS "preferredCurrency"
    `);
  }
}
