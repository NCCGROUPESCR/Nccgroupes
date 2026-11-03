---
name: TypeORM nullable union types
description: Why string | null columns without explicit type: crash TypeORM on startup
---

TypeORM uses TypeScript's `emitDecoratorMetadata` to reflect column types at runtime. When a property is typed `string | null`, TypeScript emits `Object` as the reflected type (not `String`), so TypeORM cannot map it to a Postgres column and throws:

```
DataTypeNotSupportedError: Data type "Object" in "Entity.field" is not supported by "postgres" database.
```

**Fix:** Always add an explicit `type` to any `@Column` decorator on a union-typed property:

```ts
// WRONG — TypeORM sees "Object"
@Column({ nullable: true })
refreshTokenHash: string | null;

// CORRECT
@Column({ type: 'varchar', nullable: true })
refreshTokenHash: string | null;
```

This applies to any union: `string | null`, `number | null`, `boolean | null`. Non-union types (`string` alone) are fine without an explicit type.

**Why:** TypeScript reflection emits the base type for concrete types but `Object` for union types. TypeORM cannot resolve `Object` to a Postgres data type.

**How to apply:** Before deploying any NestJS+TypeORM entity, grep for `string | null\|number | null\|boolean | null` and confirm every matching `@Column` has an explicit `type:`.
