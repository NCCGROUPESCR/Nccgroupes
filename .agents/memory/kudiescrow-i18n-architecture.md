---
name: KudiEscrow i18n Architecture
description: Full i18n system — DB-backed translations, admin Language Manager, 32 languages, RTL support, migration 1784400000000.
---

## What was built
- **`i18n_languages`** and **`i18n_translations`** tables via migration `1784400000000-I18nTables`.
- **`I18nModule`** in `src/modules/i18n/` — service, public controller, admin controller.
- **Public API**: `GET /v1/i18n/languages`, `GET /v1/i18n/:lang/:namespace`, `GET /v1/i18n/:lang/all`
- **Admin API**: full CRUD under `/v1/admin/i18n/…` guarded by `JwtAuthGuard + RolesGuard(admin)`.
- **Frontend**: `public/js/i18n.js` (language detection, attribute translation, nav/footer selector map), `public/js/lang-modal.js` (first-visit modal).
- **RTL**: `public/css/rtl.css` lazy-loaded on demand; `<html data-dir="rtl">` set by JS.
- **Admin page**: `admin-languages.html` with tabs: All Languages, Translation Editor, Import/Export, Add Language.
- **Scripts injected** into all 25 HTML pages (before `KE_API_BASE` line).

## Guard import paths
Admin controller imports use `../../common/guards/` and `../../common/decorators/` — NOT `../auth/guards/`. Wrong path was the only compile error.

## API base in development and production
On Replit, the frontend and API use the same origin, so leave `VITE_API_BASE_URL` unset and use relative `/v1` and `/realtime` paths. On separate-domain hosting, set the API origin at build time.

**Why:** Replit routes the frontend and API by path; a localhost or absolute API base bypasses that routing.

## Migration applied
After adding the migration file, run: `pnpm --filter @workspace/api-server run migration:run`
Do NOT rely on `nest start --watch` restarting to pick up new DB tables — run migration separately then restart the API workflow.

## Non-English translations
Only English is seeded. Other 31 languages need translations via:
1. Admin Language Manager → "Auto-translate missing" button → `POST /v1/admin/i18n/auto-translate/:code`
2. Or import a flat JSON via the Import tab.
The `autoTranslate` endpoint is NOT yet implemented — it calls an LLM integration that needs to be wired up.

## ui.js + ke:shell:rendered
`ke_renderShell` in ui.js does NOT yet dispatch `ke:shell:rendered` custom event. i18n.js listens for this event to inject the language selector into `.app-topbar` on dashboard pages. This is still a TODO.

## Public copy hydrated from data
Public footer labels and pricing features may be replaced after page load by database-backed translations or pricing API data, so editing static HTML alone can leave old wording visible.

**Why:** the browser can receive the old copy after rendering the updated static page.

**How to apply:** when backend/database edits are out of scope, adjust only the public display layer for those values and verify the live preview. Keep stored values, API fields, event identifiers, and admin editing data unchanged.

## First-visit language selection
Do not auto-open the full-screen language modal. Keep the header language selector available and let the page use its detected language or English fallback.

**Why:** the forced modal covered sign-in and account-creation actions, especially on small screens.

**How to apply:** keep language choice available on demand; do not gate normal navigation or authentication behind the language prompt.
