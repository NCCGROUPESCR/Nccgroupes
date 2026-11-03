import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the role_audit_logs table used to record every admin-initiated
 * role change: who was changed, from what role to what role, by whom,
 * when, and from which IP address.
 */
export class RoleAuditLog1784208000000 implements MigrationInterface {
  name = 'RoleAuditLog1784208000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_audit_logs" (
        "id"             uuid        NOT NULL DEFAULT gen_random_uuid(),
        "userId"         uuid        NOT NULL,
        "userEmail"      varchar     NOT NULL,
        "oldRole"        varchar     NOT NULL,
        "newRole"        varchar     NOT NULL,
        "changedById"    uuid        NOT NULL,
        "changedByEmail" varchar     NOT NULL,
        "ipAddress"      varchar,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_audit_logs_userId"
        ON "role_audit_logs" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_audit_logs_changedById"
        ON "role_audit_logs" ("changedById")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_role_audit_logs_changedById"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_role_audit_logs_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_audit_logs"`);
  }
}
