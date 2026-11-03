import { MigrationInterface, QueryRunner } from 'typeorm';

export class EscrowFundingConfirmation1719100000000 implements MigrationInterface {
  name = 'EscrowFundingConfirmation1719100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "transaction_status_enum" ADD VALUE IF NOT EXISTS 'funding_submitted' BEFORE 'secured'`);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "escrowBankName" varchar,
        ADD COLUMN "escrowAccountName" varchar,
        ADD COLUMN "escrowAccountNumber" varchar,
        ADD COLUMN "escrowReference" varchar,
        ADD COLUMN "fundingProofUrl" varchar,
        ADD COLUMN "fundingProofUploadedAt" timestamptz,
        ADD COLUMN "fundingProofUploadedBy" uuid,
        ADD COLUMN "fundingProofRejectionReason" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
        DROP COLUMN "escrowBankName",
        DROP COLUMN "escrowAccountName",
        DROP COLUMN "escrowAccountNumber",
        DROP COLUMN "escrowReference",
        DROP COLUMN "fundingProofUrl",
        DROP COLUMN "fundingProofUploadedAt",
        DROP COLUMN "fundingProofUploadedBy",
        DROP COLUMN "fundingProofRejectionReason"
    `);
    // Note: PostgreSQL does not support removing enum values; down migration
    // leaves 'funding_submitted' in the enum type (harmless if unused).
  }
}
