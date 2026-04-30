---
'@fluojs/http': patch
---

Improve `@RequestDto` request-pipeline throughput by skipping unnecessary validation work for DTOs without validation rules and by reducing per-request binding overhead on the common no-converter path.
