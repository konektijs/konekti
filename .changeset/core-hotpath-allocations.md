---
'@fluojs/core': minor
---

Reduce repeated metadata read allocations for large dependency graphs by storing immutable snapshots and normalizing legacy injection tokens at decorator creation time.

The changed internal readers are `getModuleMetadata()`, `getRouteMetadata()`, `getClassDiMetadata()`, `getOwnClassDiMetadata()`, and `getInheritedClassDiMetadata()`. These readers now return frozen snapshots, so returned metadata cannot be mutated directly. `getModuleMetadata()`, `getClassDiMetadata()`, and `getOwnClassDiMetadata()` reuse stable snapshot references when metadata has not changed; `getInheritedClassDiMetadata()` returns frozen, value-correct merged snapshots without a stable-reference reuse contract. Consumers that previously mutated returned metadata from any of these readers must update their code to copy first or use the supported writer path.
