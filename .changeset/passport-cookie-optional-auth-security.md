---
"@fluojs/passport": patch
---

Reject protected cookie-auth routes without an access-token cookie even when `requireAccessToken: false`, and require explicit `@UseOptionalAuth(...)` opt-in for guest-capable cookie-auth endpoints.
