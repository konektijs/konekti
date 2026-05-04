---
"@fluojs/cli": patch
---

Update generated Bun, Deno, and Cloudflare Workers starter lifecycles so `fluo dev` defaults to runtime-native watch loops with an explicit `--runner fluo` fallback, while production and deployment use runtime-native commands.
