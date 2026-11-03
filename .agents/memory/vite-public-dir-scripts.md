---
name: Vite multi-page classic scripts — public dir required
description: Classic script/link tags in Vite multi-page apps must reference files in public/ to appear in dist/
---

In a Vite multi-page setup, classic `<script src="js/foo.js">` (without `type="module"`) and `<link href="css/bar.css">` are NOT bundled or copied to `dist/` if those files sit at the project root.

Vite only processes files that are:
1. Entrypoints defined in `rollupOptions.input` (HTML files)
2. Imported via `import` / `<script type="module">` (ES modules)
3. Placed in the **`public/`** directory (copied as-is to `dist/`)

**Fix:** Move any shared JS/CSS that is loaded via classic tags into `public/`:
- `public/js/store.js`, `public/js/ui.js`
- `public/css/tokens.css`, `public/css/components.css`

Vite copies `public/` verbatim to `dist/`, so `public/js/store.js` → `dist/js/store.js`. Dev server also serves `public/` at root, so `<script src="js/store.js">` works in both dev and production.

**Why:** Vite prints `<script src="..."> can't be bundled without type="module"` warnings, which are harmless in dev (files are served from the filesystem) but fatal in production (files don't exist in dist/).

**How to apply:** After scaffolding any Vite multi-page app with shared global scripts, check whether those scripts use classic tags. If yes, move them to `public/` before doing a production build.
