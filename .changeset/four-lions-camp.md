---
'@fluojs/cache-manager': patch
---

Fix built-in HTTP cache key strategies so parameterized routes use the concrete request path in cache keys, preventing `/users/1` and `/users/2` from sharing the same cached response.
