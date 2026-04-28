---
"@fluojs/runtime": patch
---

Memoize request body and raw body parsing per request, and optimize module-graph transitive token computation and platform-shell snapshot collection.

- Request body and raw body parsing is now memoized per request; the body is parsed once during request creation and subsequent accesses return the same parsed result without re-parsing.
- Module-graph validation now caches transitive exported token closures, reducing repeated computations for modules with shared imports.
- Platform-shell snapshot now collects readiness and health directly from component snapshots in a single pass, eliminating redundant component iterations.