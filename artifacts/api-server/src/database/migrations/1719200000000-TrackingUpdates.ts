import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackingUpdates1719200000000 implements MigrationInterface {
  name = 'TrackingUpdates1719200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipment_checkpoints"
        ADD COLUMN IF NOT EXISTS "country"         varchar,
        ADD COLUMN IF NOT EXISTS "state"           varchar,
        ADD COLUMN IF NOT EXISTS "city"            varchar,
        ADD COLUMN IF NOT EXISTS "currentLocation" varchar,
        ADD COLUMN IF NOT EXISTS "description"     text,
        ADD COLUMN IF NOT EXISTS "photoUrl"        varchar,
        ADD COLUMN IF NOT EXISTS "submittedBy"     uuid,
        ADD COLUMN IF NOT EXISTS "submittedByRole" varchar,
        ADD COLUMN IF NOT EXISTS "isManual"        boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipment_checkpoints"
        DROP COLUMN IF EXISTS "country",
        DROP COLUMN IF EXISTS "state",
        DROP COLUMN IF EXISTS "city",
        DROP COLUMN IF EXISTS "currentLocation",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "photoUrl",
        DROP COLUMN IF EXISTS "submittedBy",
        DROP COLUMN IF EXISTS "submittedByRole",
        DROP COLUMN IF EXISTS "isManual"
    `);
  }
}
