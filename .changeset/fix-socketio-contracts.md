---
"@fluojs/socket.io": patch
---

Fix namespace, shutdown, and payload limit behavioral contract risks:
- Set `cleanupEmptyChildNamespaces: false` to ensure Socket.IO v4 defaults don't prematurely clean up statically defined gateway namespaces.
- Detach the underlying HTTP server from the Socket.IO instance before calling `io.close()` during shutdown to prevent Socket.IO from aggressively shutting down the shared HTTP server.
- Forward `engine.maxHttpBufferSize` to the Bun engine binding so both HTTP body limits and WebSocket payload limits are correctly bounded under `@fluojs/platform-bun`.
