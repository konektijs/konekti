---
"@fluojs/runtime": minor
---

Harden runtime microservice ownership by cascading parent application shutdown to connected microservices, rolling back started children when `startAllMicroservices()` fails, preserving original microservice bootstrap errors when cleanup also fails, and keeping the root runtime export surface aligned with Studio-owned Mermaid rendering.
