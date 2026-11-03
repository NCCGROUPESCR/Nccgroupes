import { MigrationInterface, QueryRunner } from 'typeorm';

export class EscrowOnlyCopy1793618489754 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE i18n_translations
      SET value = CASE
        WHEN "key" = 'step2_num' THEN '02 — Agree & talk'
        WHEN "key" = 'step2_h3' THEN 'Buyer and seller agree terms'
        ELSE value
      END
      WHERE "languageCode" = 'en'
        AND namespace = 'landing'
        AND "key" IN ('step2_num', 'step2_h3')
    `);
    await queryRunner.query(`
      DELETE FROM i18n_translations
      WHERE namespace = 'landing'
        AND "key" IN (
          'eyebrow', 'hero_h1_3', 'hero_lead', 'step2_p', 'step3_p',
          'feat_tracking_h3', 'feat_tracking_p', 'feat_logistics_h3',
          'feat_logistics_p', 'feat_api_p'
        )
        OR (
          namespace = 'landing'
          AND "key" IN ('step2_num', 'step2_h3')
          AND "languageCode" <> 'en'
        )
        OR "key" ~* '(^|_)(logistics|shipments?|shipping|ship|tracking|track|freight|courier|carrier|transit|delivered|delivery|dispatch|warehouse|pickup|customs)(_|$)'
        OR COALESCE(value, '') ~* '\\m(logistics|shipments?|shipping|ship|ships|tracking|track|tracks|tracked|freight|courier|carrier|transit|delivered|delivery|deliveries|dispatch|warehouse|pickup|customs)\\M'
    `);
    await queryRunner.query(`
      UPDATE pricing_plans AS plan
      SET features = (
        SELECT COALESCE(
          jsonb_agg(
            CASE
              WHEN feature ~* '\\m(logistics|shipments?|shipping|ship|ships|tracking|track|tracks|tracked|freight|courier|carrier|transit|delivered|delivery|deliveries|dispatch|warehouse|pickup|customs)\\M'
                THEN 'Agreed-terms confirmation'
              ELSE feature
            END
            ORDER BY ordinal
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements_text(plan.features) WITH ORDINALITY AS item(feature, ordinal)
      )
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(plan.features) AS item(feature)
        WHERE feature ~* '\\m(logistics|shipments?|shipping|ship|ships|tracking|track|tracks|tracked|freight|courier|carrier|transit|delivered|delivery|deliveries|dispatch|warehouse|pickup|customs)\\M'
      )
    `);
  }

  async down(): Promise<void> {
    throw new Error('This content cleanup is intentionally irreversible.');
  }
}
