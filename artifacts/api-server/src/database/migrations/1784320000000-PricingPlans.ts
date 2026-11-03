import { MigrationInterface, QueryRunner } from 'typeorm';

export class PricingPlans1784320000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_plans (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(120) NOT NULL,
        tagline       VARCHAR(240),
        price         VARCHAR(120) NOT NULL,
        price_note    VARCHAR(240),
        features      JSONB NOT NULL DEFAULT '[]',
        highlighted   BOOLEAN NOT NULL DEFAULT FALSE,
        cta_label     VARCHAR(80) NOT NULL DEFAULT 'Get started',
        cta_url       VARCHAR(240) NOT NULL DEFAULT 'signup.html',
        display_order INT NOT NULL DEFAULT 0,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    /* Seed three default plans */
    await queryRunner.query(`
      INSERT INTO pricing_plans (name, tagline, price, price_note, features, highlighted, cta_label, cta_url, display_order) VALUES
      (
        'Starter',
        'For individuals and small teams',
        '2.5%',
        'of transaction value',
        '["Secure escrow protection","Multi-currency support","Dispute resolution","Email support","Up to $10,000 per transaction"]',
        FALSE,
        'Get started free',
        'signup.html',
        1
      ),
      (
        'Business',
        'For growing businesses',
        '1.8%',
        'of transaction value',
        '["Everything in Starter","Priority dispute resolution","Dedicated account manager","Logistics & tracking integration","Webhook notifications","Up to $500,000 per transaction"]',
        TRUE,
        'Start with Business',
        'signup.html',
        2
      ),
      (
        'Enterprise',
        'For high-volume and institutional trade',
        'Custom',
        'Contact us for a tailored rate',
        '["Everything in Business","Custom fee structure","SLA guarantee","Full API access","White-label option","Unlimited transaction size","24/7 priority support"]',
        FALSE,
        'Contact sales',
        'contact-us.html',
        3
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_plans;`);
  }
}
