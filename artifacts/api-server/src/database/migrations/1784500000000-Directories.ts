import { MigrationInterface, QueryRunner } from 'typeorm';

export class Directories1784500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Create directory_categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_categories (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug          VARCHAR(120) NOT NULL UNIQUE,
        name          VARCHAR(200) NOT NULL,
        description   TEXT,
        display_order INT NOT NULL DEFAULT 0,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create directories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directories (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_name    VARCHAR(255) NOT NULL,
        website_url     VARCHAR(500) NOT NULL,
        description     TEXT NOT NULL,
        logo_url        VARCHAR(500),
        favicon_url     VARCHAR(500),
        category_id     UUID NOT NULL REFERENCES directory_categories(id) ON DELETE CASCADE,
        tags            TEXT[] DEFAULT '{}',
        status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
        is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
        display_order   INT NOT NULL DEFAULT 0,
        seo_title       VARCHAR(255),
        seo_description TEXT,
        created_by      UUID,
        updated_by      UUID,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for directories
    await queryRunner.query(`CREATE INDEX idx_directories_category_id ON directories(category_id);`);
    await queryRunner.query(`CREATE INDEX idx_directories_status ON directories(status);`);
    await queryRunner.query(`CREATE INDEX idx_directories_is_featured ON directories(is_featured);`);
    await queryRunner.query(`CREATE INDEX idx_directories_website_url ON directories(website_url);`);

    // Create directory_interactions table for analytics
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_interactions (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id     UUID NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
        interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'preview_click', 'open_click')),
        ip_address       VARCHAR(45),
        user_agent       VARCHAR(500),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for interactions
    await queryRunner.query(`CREATE INDEX idx_directory_interactions_directory_id ON directory_interactions(directory_id);`);
    await queryRunner.query(`CREATE INDEX idx_directory_interactions_type ON directory_interactions(interaction_type);`);
    await queryRunner.query(`CREATE INDEX idx_directory_interactions_created_at ON directory_interactions(created_at);`);

    // Seed default categories
    await queryRunner.query(`
      INSERT INTO directory_categories (slug, name, description, display_order) VALUES
      ('business', 'Business', 'Business services and companies', 1),
      ('finance', 'Finance', 'Financial institutions and services', 2),
      ('logistics', 'Logistics', 'Shipping and logistics providers', 3),
      ('shipping', 'Shipping', 'Shipping and courier services', 4),
      ('trade', 'Trade', 'Trade and commerce platforms', 5),
      ('technology', 'Technology', 'Technology solutions and tools', 6),
      ('marketplaces', 'Marketplaces', 'Online marketplaces and platforms', 7),
      ('developer-resources', 'Developer Resources', 'APIs and developer tools', 8),
      ('industry', 'Industry', 'Industry-specific resources', 9),
      ('business-services', 'Business Services', 'Consulting and business services', 10),
      ('government', 'Government', 'Government and regulatory resources', 11),
      ('other', 'Other', 'Other resources', 12);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS directory_interactions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS directories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_categories;`);
  }
}
