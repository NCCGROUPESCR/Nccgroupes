import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a globally unique, human-readable tracking number to shipments
 * (format: GC-YYYYMMDD-NNNNNN), backfills existing rows, then enforces
 * NOT NULL + UNIQUE.
 */
export class ShipmentTrackingNumber1751000000000 implements MigrationInterface {
  name = 'ShipmentTrackingNumber1751000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "trackingNumber" varchar
    `);

    const shipments: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "shipments" WHERE "trackingNumber" IS NULL`,
    );

    for (const shipment of shipments) {
      let trackingNumber = '';
      // Retry on the rare chance of a collision.
      for (let attempt = 0; attempt < 5; attempt++) {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const suffix = Math.floor(100000 + Math.random() * 900000);
        const candidate = `GC-${datePart}-${suffix}`;
        const existing = await queryRunner.query(
          `SELECT 1 FROM "shipments" WHERE "trackingNumber" = $1`,
          [candidate],
        );
        if (!existing.length) {
          trackingNumber = candidate;
          break;
        }
      }
      if (!trackingNumber) {
        trackingNumber = `GC-${shipment.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      }
      await queryRunner.query(`UPDATE "shipments" SET "trackingNumber" = $1 WHERE id = $2`, [
        trackingNumber,
        shipment.id,
      ]);
    }

    await queryRunner.query(`
      ALTER TABLE "shipments" ALTER COLUMN "trackingNumber" SET NOT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_shipments_trackingNumber'
        ) THEN
          ALTER TABLE "shipments" ADD CONSTRAINT "UQ_shipments_trackingNumber" UNIQUE ("trackingNumber");
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "UQ_shipments_trackingNumber"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP COLUMN IF EXISTS "trackingNumber"
    `);
  }
}
