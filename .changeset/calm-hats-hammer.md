---
'@fluojs/http': patch
---

Reduce `@RequestDto()` binding overhead by reusing compiled HTTP DTO binding plans while preserving request-scoped converter resolution and existing validation/binding error contracts.
