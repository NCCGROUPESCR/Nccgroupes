import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const useSsl =
  process.env.PGSSL === 'false'
    ? false
    : process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: ['src/modules/**/entities/*.entity.ts', 'src/common/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  migrationsTransactionMode: 'each',
});
