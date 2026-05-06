---
"@fluojs/microservices": patch
---

Fix TCP shutdown guards and gRPC streaming AbortSignal cleanup so closing microservice transports reject new work and release stream abort listeners reliably.
