---
"@fluojs/socket.io": patch
---

Fix namespace, shutdown, and payload limit behavioral contract risks:
- Set `cleanupEmptyChildNamespaces: false` to ensure Socket.IO v4 defaults don't prematurely clean up statically defined gateway namespaces.
- Detach the underlying HTTP server from the Socket.IO instance before calling `io.close()` during shutdown so Socket.IO cleans up clients without closing adapter-owned/shared HTTP listeners.
- Forward `engine.maxHttpBufferSize` to the Bun engine binding so both HTTP body limits and WebSocket payload limits are correctly bounded under `@fluojs/platform-bun`.
