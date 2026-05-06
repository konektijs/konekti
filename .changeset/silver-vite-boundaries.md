---
"@fluojs/vite": minor
---

Align the Vite plugin peer dependency contract with its Babel runtime resolution and tighten transform boundaries for application TypeScript files.

This is a consumer-visible install contract change: `@babel/core` now requires `>=7.26.0`, `vite` now requires `>=6.2.0`, and the Babel decorator plugin/TypeScript preset are explicit peers. The minor bump is intentional for this beta package because consumers below those peer floors must update their build dependencies before upgrading.
