---
name: KudiEscrow CMS Architecture
description: Backend module, entity/slug conventions, API contract, frontend page/nav patterns for the CMS feature (blog, legal, pages, staff, contact, documentation center)
---

## Module layout

All CMS lives under `src/modules/content/`:
- `entities/` — TypeORM entities
- `dto/` — class-validator DTOs
- `*.service.ts` — one service per domain
- `content.controller.ts` — public endpoints at `GET /v1/cms/*`
- `admin-content.controller.ts` — admin endpoints at `/v1/admin/cms/*`, guarded by `@Roles(UserRole.ADMIN)`
- `content.module.ts` — registers all entities + services + both controllers

## Entities and tables

| Entity | Table | Notes |
|--------|-------|-------|
| Page | cms_pages | Static editable pages (about-us, faq, privacy-policy, terms-conditions) |
| BlogPost | cms_blog_posts | Blog articles; status enum draft/published |
| StaffMember | cms_staff_members | Staff profiles |
| ContactInfo | cms_contact_info | Single row singleton |
| ContactMessage | cms_contact_messages | User-submitted contact form messages |
| LegalDocument | cms_legal_documents | Legal docs with revision history |
| LegalDocumentRevision | cms_legal_document_revisions | Immutable revision snapshots |
| DocCategory | cms_doc_categories | Documentation categories (8 seeded) |
| DocArticle | cms_doc_articles | Documentation articles; JSONB for galleryImages/attachments/videos |
| DocVersion | cms_doc_versions | Pre-save snapshots before every article update |

## Documentation Center specifics (added 2026-07-17)

**Backend:**
- Migration: `1784220000000-DocsCenter.ts` — creates 3 tables + seeds 8 categories
- `DocCategoryService`: standard CRUD, no soft delete
- `DocArticleService`: CRUD + publish + full-text search (title/shortDescription/tags) + version snapshots on every update + version restore
- File uploads: `docsFileStorage` (multer diskStorage to `uploads/docs-files/`) exposed at `POST /v1/admin/cms/docs-upload`
- No FK constraint between articles.categoryId and categories (plain varchar UUID, same pattern as blog)
- `icon` column added to `cms_doc_categories` (not in original migration — add manually if needed; entity has it)

**Public API (no auth):**
- `GET /v1/cms/docs/categories`
- `GET /v1/cms/docs/articles?search=&category=&tag=`
- `GET /v1/cms/docs/articles/:slug`

**Admin API:**
- `GET/POST /v1/admin/cms/docs/categories`
- `GET/PATCH/DELETE /v1/admin/cms/docs/categories/:id`
- `GET/POST /v1/admin/cms/docs/articles`
- `GET/PATCH/DELETE /v1/admin/cms/docs/articles/:id`
- `POST /v1/admin/cms/docs/articles/:id/publish|unpublish`
- `GET /v1/admin/cms/docs/articles/:id/versions`
- `POST /v1/admin/cms/docs/articles/:id/versions/:versionId/restore`
- `POST /v1/admin/cms/docs-upload`

**Frontend:**
- `documentation.html` — public Docs Center (category pills, article grid, live API reference with code tabs)
- `doc-article.html` — single article viewer (HTML body, gallery lightbox, video player for YouTube/Vimeo/Loom/uploaded, downloads, related docs)
- `admin-cms.html` — "Documentation" tab added (Articles sub-tab + Categories sub-tab)
- "Documentation" link added to nav on all 11 public pages
- "Docs CMS" link added to admin sidebar in `public/js/ui.js`
- `vite.config.ts` rollup inputs: `documentation` and `docArticle`

## JSONB field shape (cms_doc_articles)

```json
galleryImages: [{ "url": "/v1/uploads/docs-files/xxx.jpg", "caption": "" }]
attachments:   [{ "url": "...", "originalName": "...", "mimeType": "...", "size": 12345 }]
videos:        [{ "type": "embedded"|"uploaded", "embedUrl": "...", "fileUrl": "...", "title": "...", "description": "" }]
```

## Slug convention

All slugs are auto-generated from title in the admin CMS using `docs_slugify()` on new articles/categories. Existing records keep their slug on edits (slug field stays editable).

## Key patterns shared across CMS domains

- `categoryId` stored as plain uuid varchar — no FK constraint, no cascade
- JSONB for array-type fields (gallery, attachments, videos) — avoids join tables
- `ON CONFLICT ("slug") DO NOTHING` in seeds
- Public controller reads `.published` status only; admin controller sees all statuses
- Revision/version history: immutable row inserted before every update; restore copies snapshot fields back to main record
