---
name: NCC Group Escrow no-Redis rule
description: Project-level constraint for runtime infrastructure
---

**Rule:** NCC Group Escrow must not depend on Redis for Replit or application startup. Use Socket.IO's default adapter for the current single-process configuration; notification jobs log in-process.

**Why:** The user explicitly corrected that the project is not using Redis and repeated the instruction.

**How to apply:** Do not add a Redis service, environment variable, BullMQ/ioredis dependency, or Redis-backed adapter/cache unless the user changes this direction.
