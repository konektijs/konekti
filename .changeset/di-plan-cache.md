---
"@fluojs/di": patch
---

Cache DI provider resolution plans so repeated resolves and request-scope checks avoid redundant provider graph traversal without caching transient or request-scoped instances.
