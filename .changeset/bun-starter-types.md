---
"@fluojs/cli": patch
---

Include Bun globals in generated Bun starter TypeScript configuration so pnpm typecheck succeeds when the starter references `Bun.env`.
