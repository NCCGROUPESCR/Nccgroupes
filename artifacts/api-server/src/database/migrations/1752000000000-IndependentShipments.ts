import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supports independent (non-transaction) shipments:
 *  - Makes transactionId nullable with a partial unique index
 *  - Adds shipmentRef (SHP-YYYYMMDD-NNNNNN), unique
 *  - Adds logistics/buyer/seller IDs on the shipment row
 *  - Adds sender/receiver contact fields
 *  - Adds structured origin/destination country/state/city
 *  - Adds description, weight, packages, specialInstructions, title, createdAt
 *  - Adds RAIL, EXPRESS, PICKUP values to the shipment_mode enum
 *  - Back-fills shipmentRef for existing rows
 */
export class IndependentShipments1752000000000 implements MigrationInterface {
  name = 'IndependentShipments1752000000000';

  // ALTER TYPE … ADD VALUE cannot run inside a transaction in PostgreSQL
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new enum values (safe – PostgreSQL does not require table rewrite)
    await queryRunner.query(`ALTER TYPE "public"."shipment_mode_enum" ADD VALUE IF NOT EXISTS 'rail'`);
    await queryRunner.query(`ALTER TYPE "public"."shipment_mode_enum" ADD VALUE IF NOT EXISTS 'express'`);
    await queryRunner.query(`ALTER TYPE "public"."shipment_mode_enum" ADD VALUE IF NOT EXISTS 'pickup'`);

    // 2. Make transactionId nullable
    await queryRunner.query(`ALTER TABLE "shipments" ALTER COLUMN "transactionId" DROP NOT NULL`);

    // 3. Replace the old unique index on transactionId with a partial one
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shipments_transactionId"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_shipments_transactionId_partial"
      ON "shipments" ("transactionId")
      WHERE "transactionId" IS NOT NULL
    `);

    // 4. Add new columns
    const addCol = (def: string) =>
      queryRunner.query(`ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS ${def}`);

    await addCol(`"shipmentRef" varchar`);
    await addCol(`"title" varchar`);
    await addCol(`"logisticsId" uuid`);
    await addCol(`"buyerId" uuid`);
    await addCol(`"sellerId" uuid`);
    await addCol(`"senderName" varchar`);
    await addCol(`"senderEmail" varchar`);
    await addCol(`"senderPhone" varchar`);
    await addCol(`"receiverName" varchar`);
    await addCol(`"receiverEmail" varchar`);
    await addCol(`"receiverPhone" varchar`);
    await addCol(`"originCountry" varchar`);
    await addCol(`"originState" varchar`);
    await addCol(`"originCity" varchar`);
    await addCol(`"destinationCountry" varchar`);
    await addCol(`"destinationState" varchar`);
    await addCol(`"destinationCity" varchar`);
    await addCol(`"description" text`);
    await addCol(`"weight" numeric(12,3)`);
    await addCol(`"packages" int`);
    await addCol(`"specialInstructions" text`);
    await addCol(`"createdAt" timestamptz DEFAULT now()`);

    // 5. Back-fill shipmentRef for existing rows
    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "shipments" WHERE "shipmentRef" IS NULL`,
    );
    for (const row of rows) {
      let ref = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const suffix = String(Math.floor(Math.random() * 900000 + 100000)).padStart(6, '0');
        const candidate = `SHP-${datePart}-${suffix}`;
        const existing = await queryRunner.query(
          `SELECT 1 FROM "shipments" WHERE "shipmentRef" = $1`,
          [candidate],
        );
        if (!existing.length) { ref = candidate; break; }
      }
      if (!ref) ref = `SHP-${row.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      await queryRunner.query(`UPDATE "shipments" SET "shipmentRef" = $1 WHERE id = $2`, [ref, row.id]);
    }

    // 6. Unique index on shipmentRef (partial — allows future NULLs during backfill)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_shipments_shipmentRef_partial"
      ON "shipments" ("shipmentRef")
      WHERE "shipmentRef" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_shipments_shipmentRef_partial"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_shipments_transactionId_partial"`);

    for (const col of [
      'shipmentRef','title','logisticsId','buyerId','sellerId',
      'senderName','senderEmail','senderPhone',
      'receiverName','receiverEmail','receiverPhone',
      'originCountry','originState','originCity',
      'destinationCountry','destinationState','destinationCity',
      'description','weight','packages','specialInstructions','createdAt',
    ]) {
      await queryRunner.query(`ALTER TABLE "shipments" DROP COLUMN IF EXISTS "${col}"`);
    }

    await queryRunner.query(`ALTER TABLE "shipments" ALTER COLUMN "transactionId" SET NOT NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shipments_transactionId"
      ON "shipments" ("transactionId")
    `);
  }
}
