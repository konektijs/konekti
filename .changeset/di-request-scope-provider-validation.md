---
"@fluojs/di": minor
---

Validate DI provider object shapes during registration and prevent request scopes from owning implicit singleton multi-provider registrations.

Migration: consumers that registered default-scope multi providers directly on a request container must move those registrations to the root container before calling `createRequestScope()`. If the multi provider is intentionally request-local, declare it with `scope: 'request'`/`Scope.REQUEST`, or replace the request-local set with `override()` so the ownership boundary is explicit.
