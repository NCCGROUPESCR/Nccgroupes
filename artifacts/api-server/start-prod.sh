#!/bin/bash
set -e
cd "$(dirname "$0")"

# Free-tier hosts like Render have no shell/SSH access, so migrations (and,
# optionally, demo seeding) run here on every boot instead of being a manual
# step. Both are idempotent: migration:run only applies pending migrations,
# and seed.ts checks for existing demo data and skips if already present.
pnpm run migration:run
if [ "$SEED_ON_BOOT" = "true" ]; then
  pnpm run seed
fi

exec node --enable-source-maps dist/main.js
