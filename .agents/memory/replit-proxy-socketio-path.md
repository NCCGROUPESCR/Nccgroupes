---
name: Socket.io through Replit's path-based proxy
description: Why the default /socket.io/ path breaks WebSocket/engine.io traffic behind Replit's artifact proxy, and the fix.
---

Replit's per-artifact preview proxy only forwards a fixed set of path prefixes (e.g. `/api`, `/v1`, `/docs`, and any custom prefix you register) to a given artifact's service. It does not know about Socket.io's default `/socket.io/` path, so engine.io polling/upgrade requests 404 or fail silently even though the gateway itself is running fine.

**Why:** the proxy routes by path prefix, not by port or protocol — anything outside the registered prefixes never reaches the backend process, regardless of whether it's HTTP or a WebSocket upgrade.

**How to apply:** give the Socket.io server (or NestJS `@WebSocketGateway`) an explicit `path` option that falls under an already-routed prefix, e.g. `path: '/realtime/socket.io'` when `/realtime` is registered. The client must connect with the matching `path` (and namespace, if used): `io('/realtime', { path: '/realtime/socket.io', auth: { token } })`. Verify by checking the adapter that constructs the underlying `http.Server`/`io()` actually forwards custom `ServerOptions` like `path` through (e.g. a custom Redis IO adapter's `createIOServer`).
