---
name: NCC Group Escrow is live on Render
description: This app has a real production deployment on Render (separate from Replit). Read before touching schema, env vars, or anything that could affect prod.
---

The user confirmed (2026-07-15) that this project, now branded NCC Group Escrow, is **live in production on Render**, not just a Replit dev project.

**Why it matters:** Replit's own dev/deploy environment is separate from the Render production deployment. Schema migrations, breaking API changes, env var renames, or destructive DB operations done here do not automatically sync to Render — but if the user later runs migrations against the same production Postgres/Redis Render uses, or shares env vars/secrets between environments, mistakes here can affect real users.

**How to apply:** Before doing anything destructive (migrations, data resets, dependency major-version bumps, renaming env vars used by the API), pause and confirm scope/impact with the user rather than assuming Replit is a low-stakes sandbox. Treat this like any other production-backing project.

**Current source and Render link:** The user designated `NCCGROUPESCR/Nccgroupes` on `main` as the source for the existing Render service `Nccgroupes`; auto-deploy is enabled.

**Why:** The user explicitly chose this repository and service. Publishing from the old workspace remote or an unrelated Render service would deploy the wrong project.

**How to apply:** Push production code only to this repository's `main` branch, and verify a Render deployment completed before saying the changes are live.

**Production JWT refresh key:** The API reads `JWT_REFRESH_SECRET` from the Render service; the Replit-side `RENDER_JWT_REFRESH_SECRET` is not used by the app.

**Why:** The production refresh key must be distinct from the access key and is stored in Render, not the Replit workspace.

**How to apply:** For an approved rotation, warn that existing refresh sessions will stop working, update Render's `JWT_REFRESH_SECRET`, explicitly trigger a deploy (changing env vars alone did not start one), and verify the deployment is live and healthy.

**Public frontend origin:** Users visit `archandaag.com`; its frontend calls the API hosted at `nccgroupes.onrender.com`. The API CORS allowlist must include both `https://archandaag.com` and `https://www.archandaag.com`, in addition to any existing allowed origins.

**Why:** API endpoints can return successful responses to curl while browser fetches from the custom domain fail silently if the CORS response omits `Access-Control-Allow-Origin`.

**How to apply:** When About Us, Legal, or another API-backed public page is blank, test the API with `Origin: https://archandaag.com` and check both the allow-origin header and OPTIONS preflight before blaming the content or database.
