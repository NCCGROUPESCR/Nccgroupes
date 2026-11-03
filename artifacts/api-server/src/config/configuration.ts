export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  // Comma-separated list of allowed frontend origins. Defaults to
  // "*" (any origin) so local/dev setups keep working without config.
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : '*',

  database: {
    url: process.env.DATABASE_URL,
    // Managed Postgres providers (Render, Supabase, etc.) require SSL but use
    // certs not in Node's default CA store — rejectUnauthorized:false trusts
    // the provider's cert without a local CA bundle. Set PGSSL=false to
    // disable (e.g. local Postgres without SSL). Named PGSSL (not
    // DATABASE_SSL) because Render reserves the DATABASE_ prefix for
    // variables tied to a linked/managed database and won't let you add
    // another key with that prefix manually.
    ssl:
      process.env.PGSSL === 'false'
        ? false
        : process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
  },
});
