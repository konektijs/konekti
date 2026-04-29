---
"@fluojs/di": patch
"@fluojs/http": patch
"@fluojs/runtime": patch
---

Skip HTTP request-scope container creation for singleton-only routes while preserving isolated request-scoped DI whenever a controller graph, middleware, guard, interceptor, observer, DTO converter, or custom binder may require it.
