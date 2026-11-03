# NCC Group Escrow

A fintech escrow platform with integrated logistics tracking and payments (Paystack). Buyers, sellers, and logistics partners transact through a secure escrow flow with real-time chat and shipment tracking.

## Stack

- **Backend:** NestJS + TypeORM + PostgreSQL (Replit built-in)
- **Frontend:** Vite + plain HTML/TypeScript (multi-page app)
- **Queue/Cache:** No external queue/cache service; notifications log in-process
- **Real-time:** Socket.io's built-in single-process adapter
- **Payments:** Paystack

## Monorepo layout

```
artifacts/api-server/     NestJS REST + WebSocket API
artifacts/kudi-frontend/  Vite MPA frontend
lib/db/                   Shared Drizzle schema & migrations
lib/api-spec/             OpenAPI spec
lib/api-client-react/     Generated React API client
lib/api-zod/              Zod schemas
```

## Running locally on Replit

Two workflows are configured and start automatically:

| Workflow | Command |
|---|---|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |
| `artifacts/kudi-frontend: web` | `pnpm --filter @workspace/kudi-frontend run dev` |

On a fresh Replit development database, apply the schema once with `pnpm --filter @workspace/api-server run migration:run`. Demo users and transactions are not seeded automatically; run `pnpm --filter @workspace/api-server run seed` only when sample data is wanted.

## Required secrets / env vars

| Key | Type | Notes |
|---|---|---|
| `DATABASE_URL` | Runtime-managed | Provided by Replit automatically |
| `NODE_ENV` | Env var | Set to `development` |
| `JWT_ACCESS_SECRET` | Secret | Signs access tokens |
| `JWT_REFRESH_SECRET` | Secret | Signs refresh tokens |
| `PAYSTACK_SECRET_KEY` | Secret | Optional — payment processing |
| `PAYSTACK_WEBHOOK_SECRET` | Secret | Optional — payment webhooks |

## Deploying to Render

No `render.yaml` blueprint — set up manually in the dashboard. You need managed Postgres. Two deploy shapes are supported:

### Option A — one Web Service (recommended, simplest)

The API server serves the built frontend itself, so there's a single Render service and one URL. `src/main.ts` serves `artifacts/api-server/public` as static files when that folder exists (it's empty/absent on Replit and in Option B, so neither is affected).

- **Root directory:** repo root (not `artifacts/api-server`) — the build needs both artifacts
- **Build command:** `bash scripts/render-combined-build.sh` (builds the frontend, builds the API, copies the frontend's `dist` into `artifacts/api-server/public`)
- **Start command:** `bash artifacts/api-server/start-prod.sh`
- **Env vars** — see `artifacts/api-server/.env.example`: `DATABASE_URL`, `PGSSL=true`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, optional Paystack keys. `CORS_ORIGIN` and `VITE_API_BASE_URL` aren't needed here — frontend and API are same-origin. (Named `PGSSL`, not `DATABASE_SSL` — Render reserves the `DATABASE_` prefix for variables tied to a linked database and rejects manually-added keys with that prefix.)
- Verified locally: one process serves `/login.html`, `/js/store.js`, `/api/healthz`, and `/v1/...` routes together correctly.

### Option B — two separate services (frontend and API on different domains)

**API server** (`artifacts/api-server`) — Web Service
- Build: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
- Start: `bash artifacts/api-server/start-prod.sh`
- Same env vars as Option A, plus `CORS_ORIGIN` (comma-separated frontend origins)

**Frontend** (`artifacts/kudi-frontend`) — Static Site
- Build: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @workspace/kudi-frontend run build`
- Publish directory: `artifacts/kudi-frontend/dist`
- Env var — see `.env.example`: `VITE_API_BASE_URL` set to the deployed API's full origin (build-time only, must be set before each build)

On Replit, and in Option A, frontend and API share one domain, so `VITE_API_BASE_URL` stays unset and all API/socket calls use relative paths. Option B puts them on separate domains, so the frontend's `js/store.js` and `transaction.html` prefix every API/socket/file-URL call with `window.KE_API_BASE` (injected from `VITE_API_BASE_URL` via an inline `<script>` in each HTML page's `<head>`).

### Both options
- No shell access is needed (works on Render's free tier): `start-prod.sh` runs `pnpm run migration:run` automatically on every boot before starting the app — idempotent, a no-op once migrations are applied. Set `SEED_ON_BOOT=true` to also load demo accounts/transactions on boot; the seed script skips itself if demo data already exists.
- Uploaded files (`uploads/`) are stored on local disk — Render's filesystem is ephemeral, so funding-proof/tracking-photo uploads are lost on redeploy/restart unless moved to a persistent disk or object storage (S3 config keys already exist in `configuration.ts` but aren't wired to the upload code yet).

## User preferences

- **This is a live production project deployed on Render. Handle all changes with production-level care — do not modify schema, env vars, data, or dependencies without explicit instruction.**
