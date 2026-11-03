import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1719000000000 implements MigrationInterface {
  name = 'InitialSchema1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ---------- users ----------
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('buyer','seller','logistics','business','support','admin','developer')
    `);
    await queryRunner.query(`CREATE TYPE "kyc_status_enum" AS ENUM ('none','pending','verified')`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "phone" varchar,
        "passwordHash" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "trustScore" int NOT NULL DEFAULT 70,
        "kycStatus" "kyc_status_enum" NOT NULL DEFAULT 'none',
        "businessVerified" boolean NOT NULL DEFAULT false,
        "refreshTokenHash" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    // ---------- wallets ----------
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "availableBalance" numeric(18,2) NOT NULL DEFAULT 0,
        "escrowBalance" numeric(18,2) NOT NULL DEFAULT 0,
        "pendingBalance" numeric(18,2) NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_wallets_user_currency" ON "wallets" ("userId","currency")`);

    // ---------- wallet_ledger_entries ----------
    await queryRunner.query(`
      CREATE TYPE "ledger_entry_type_enum" AS ENUM ('deposit','withdrawal','escrow_hold','escrow_release','refund','fee')
    `);
    await queryRunner.query(`
      CREATE TABLE "wallet_ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "walletId" uuid NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
        "transactionId" uuid,
        "type" "ledger_entry_type_enum" NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "balanceAfter" numeric(18,2) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- transactions ----------
    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM
        ('pending','secured','transit','delivered','dispute','released','refunded','cancelled')
    `);
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reference" varchar NOT NULL,
        "title" varchar NOT NULL,
        "category" varchar,
        "buyerId" uuid NOT NULL REFERENCES "users"("id"),
        "sellerId" uuid NOT NULL REFERENCES "users"("id"),
        "logisticsId" uuid REFERENCES "users"("id"),
        "amount" numeric(18,2) NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "status" "transaction_status_enum" NOT NULL DEFAULT 'pending',
        "releaseConditions" text,
        "escrowFundedAt" timestamptz,
        "escrowReleasedAt" timestamptz,
        "settlement" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_transactions_reference" ON "transactions" ("reference")`);

    // ---------- shipments ----------
    await queryRunner.query(`CREATE TYPE "shipment_mode_enum" AS ENUM ('road','air','sea','none')`);
    await queryRunner.query(`
      CREATE TABLE "shipments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "mode" "shipment_mode_enum" NOT NULL DEFAULT 'none',
        "origin" varchar,
        "destination" varchar,
        "eta" date,
        "currentLat" numeric(9,6),
        "currentLng" numeric(9,6)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_shipments_transaction" ON "shipments" ("transactionId")`);

    // ---------- shipment_checkpoints ----------
    await queryRunner.query(`CREATE TYPE "checkpoint_status_enum" AS ENUM ('pending','active','done')`);
    await queryRunner.query(`
      CREATE TABLE "shipment_checkpoints" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "shipmentId" uuid NOT NULL REFERENCES "shipments"("id") ON DELETE CASCADE,
        "label" varchar NOT NULL,
        "status" "checkpoint_status_enum" NOT NULL DEFAULT 'pending',
        "sequence" int NOT NULL,
        "occurredAt" timestamptz
      )
    `);

    // ---------- chat_messages ----------
    await queryRunner.query(`
      CREATE TYPE "chat_message_type_enum" AS ENUM ('text','system','image','video','document','voice')
    `);
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "senderId" uuid REFERENCES "users"("id"),
        "type" "chat_message_type_enum" NOT NULL DEFAULT 'text',
        "body" text NOT NULL,
        "attachmentUrl" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- disputes ----------
    await queryRunner.query(`
      CREATE TYPE "dispute_status_enum" AS ENUM ('investigating','awaiting_evidence','resolved','closed')
    `);
    await queryRunner.query(`
      CREATE TABLE "disputes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "openedBy" uuid NOT NULL REFERENCES "users"("id"),
        "reason" text NOT NULL,
        "status" "dispute_status_enum" NOT NULL DEFAULT 'investigating',
        "assignedAgentId" uuid REFERENCES "users"("id"),
        "resolution" text,
        "openedAt" timestamptz NOT NULL DEFAULT now(),
        "closedAt" timestamptz
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_disputes_transaction" ON "disputes" ("transactionId")`);

    // ---------- dispute_notes ----------
    await queryRunner.query(`
      CREATE TABLE "dispute_notes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "disputeId" uuid NOT NULL REFERENCES "disputes"("id") ON DELETE CASCADE,
        "authorId" uuid NOT NULL REFERENCES "users"("id"),
        "body" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- reviews ----------
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "raterId" uuid NOT NULL REFERENCES "users"("id"),
        "rateeId" uuid NOT NULL REFERENCES "users"("id"),
        "rating" smallint NOT NULL,
        "comment" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- api_keys ----------
    await queryRunner.query(`CREATE TYPE "api_key_environment_enum" AS ENUM ('live','sandbox')`);
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "developerId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "label" varchar NOT NULL,
        "keyHash" varchar NOT NULL,
        "keyPrefix" varchar NOT NULL,
        "environment" "api_key_environment_enum" NOT NULL DEFAULT 'sandbox',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "revokedAt" timestamptz
      )
    `);

    // ---------- webhooks ----------
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "developerId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "url" varchar NOT NULL,
        "events" text[] NOT NULL DEFAULT '{}',
        "secret" varchar NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- audit_logs ----------
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actorId" uuid,
        "action" varchar NOT NULL,
        "entityType" varchar NOT NULL,
        "entityId" varchar NOT NULL,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "api_key_environment_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dispute_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "disputes"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_message_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_checkpoints"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkpoint_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "shipment_mode_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_ledger_entries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_entry_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "kyc_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
