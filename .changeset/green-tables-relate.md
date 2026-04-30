---
'@fluojs/platform-express': patch
'@fluojs/platform-fastify': patch
'@fluojs/platform-nodejs': patch
'@fluojs/runtime': patch
---

Optimize Node-backed request shell creation so Express, Fastify, and raw Node adapters reuse host-parsed request data where possible without changing query, body, raw body, multipart, or native route handoff behavior.
