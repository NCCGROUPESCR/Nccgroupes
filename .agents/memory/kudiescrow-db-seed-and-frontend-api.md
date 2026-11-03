---
name: KudiEscrow demo DB seeding and frontend data source
description: How demo accounts are seeded and why dashboards must use the live API, not localStorage
---

The api-server's TypeORM `synchronize` is false, so a fresh Postgres database has no tables until
`npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts` is run, followed by
`npx ts-node -r tsconfig-paths/register src/database/seeds/seed.ts` (from `artifacts/api-server/`).
Without both steps, `/v1/auth/login` fails with `relation "users" does not exist`, and the demo
quick-fill login buttons appear broken even though the frontend/backend code is correct.

**Why:** the demo login bug report initially looked like a frontend email-mismatch bug (and partly
was — `login.html`/`signup.html` had stale demo emails not matching `seed.ts`), but the deeper cause
was that no one had run migrations+seed against the dev database yet.

**How to apply:** whenever demo/login issues are reported on this project, check first whether the
DB has been migrated+seeded before diving into frontend auth code. Also: the frontend
(`kudi-frontend`, static multi-page HTML/vanilla JS) originally had `dashboard-buyer/seller/logistics/support.html`
reading transactions from `localStorage` (`ke_getTxns`) instead of the real backend
(`/v1/transactions`), which is why transactions created by one role were invisible to others. The
fix pattern: add `ke_apiTxnsForUser()` / `ke_loadPartyNames()` / `ke_connectRealtime()` helpers to
`public/js/store.js` (modeled on the pre-existing correct pattern in `transaction.html`), call them
in each dashboard, and listen for the `transaction.created` / `transaction.status_changed` socket
events (emitted by `RealtimeGateway` to `user:{sellerId}`, `user:{logisticsId}`, and a `staff` room
for admin/support) to refresh lists live.
