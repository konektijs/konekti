---
'@fluojs/platform-fastify': patch
---

Preserve `FrameworkRequest.rawBody` as the exact original bytes in the Fastify adapter when `rawBody: true` is enabled for non-multipart requests.
