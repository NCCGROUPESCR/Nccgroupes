#!/bin/bash
# Build command for a SINGLE Render Web Service that serves both the
# NCC Group Escrow frontend and API from one process/one URL.
#
# Run from the repo root (Render's default root directory). It:
#   1. installs workspace deps
#   2. builds the frontend (Vite -> artifacts/kudi-frontend/dist)
#   3. copies that build into artifacts/api-server/public, which the API
#      server serves as static files when present (see src/main.ts)
#   4. builds the API server (Nest -> artifacts/api-server/dist)
#
# Pair with start command: bash artifacts/api-server/start-prod.sh
set -e

# Render's Node image ships pnpm preinstalled at a read-only path; running
# `corepack enable` to manage it fails with EROFS. pnpm is already on PATH,
# so skip corepack entirely.
pnpm install --frozen-lockfile

pnpm --filter @workspace/kudi-frontend run build
pnpm --filter @workspace/api-server run build

echo "Combined build complete — API server will serve frontend directly from artifacts/kudi-frontend/dist"
