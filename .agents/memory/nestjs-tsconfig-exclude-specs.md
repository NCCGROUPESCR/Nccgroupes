---
name: NestJS spec files in watch mode
description: nest start --watch picks up *.spec.ts by default; exclude them in tsconfig.json
---

`nest start --watch` compiles using `tsconfig.json` by default. If that tsconfig does not exclude spec files, TypeScript attempts to compile them and fails because Jest globals (`describe`, `it`, `expect`, `jest`) are not in scope:

```
error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner?
```

**Fix 1 (recommended):** Add spec exclusions to `tsconfig.json`:
```json
{
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.e2e-spec.ts", "test"]
}
```

**Fix 2 (alternative):** Create a `tsconfig.build.json` that excludes specs and point `nest-cli.json` at it via `"tsConfigPath": "tsconfig.build.json"`.

Also add `@types/jest` to `devDependencies` so spec files compile cleanly in IDE and CI even if excluded from the watch build.

**Why:** NestJS scaffolds typically include both `tsconfig.json` and `tsconfig.build.json`; if only one is present and it doesn't exclude specs, watch mode breaks on any spec file in the tree.

**How to apply:** Any time a NestJS project is brought in without a `tsconfig.build.json`, check that `tsconfig.json` excludes spec files.
