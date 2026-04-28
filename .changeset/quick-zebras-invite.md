---
'@fluojs/platform-fastify': patch
---

Preserve the original raw request bytes when `rawBody` capture is enabled so webhook verification and other byte-sensitive Fastify handlers receive the exact payload buffer.
