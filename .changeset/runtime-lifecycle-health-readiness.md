---
"@fluojs/runtime": patch
---

Reset runtime health readiness markers as soon as application or context shutdown begins so `/ready` leaves traffic rotation before cleanup hooks and remains unavailable even when shutdown fails.
