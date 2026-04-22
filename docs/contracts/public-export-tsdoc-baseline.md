# Public Export TSDoc Baseline

<p><strong><kbd>English</kbd></strong> <a href="./public-export-tsdoc-baseline.ko.md"><kbd>한국어</kbd></a></p>

This checklist defines the enforced TSDoc baseline for governed public exports under `packages/*/src`.

## Scope

- [ ] MUST: Apply this baseline to exported declarations under `packages/*/src`.
- [ ] MUST: Treat `.d.ts` files, test files, and non-package paths as out of scope for the automated check.
- [ ] MUST: Document the underlying declaration when a symbol is re-exported through a barrel.
- [ ] MUST: Expect changed-file enforcement by default and full-surface enforcement when baseline mode is requested.

## Required Rules

- [ ] MUST: Add a non-empty TSDoc summary to every governed public export.
- [ ] MUST: Add `@param` for every named parameter on exported functions.
- [ ] MUST: Add `@param` for every named parameter on exported arrow-function constants and exported function-expression constants.
- [ ] MUST: Add `@returns` for exported functions whose declared return type is not `void` or `never`.
- [ ] MUST: Add `@returns` for exported callable constants whose declared return type is not `void` or `never`.
- [ ] MUST: Keep the documented parameter names aligned with the source declaration names.
- [ ] MUST: Cover exported `function`, `class`, `interface`, `type`, `enum`, and exported `const` declarations when they are part of the governed surface.

## Recommended Rules

- [ ] SHOULD: Add `@throws` when caller-visible failure behavior is part of the contract.
- [ ] SHOULD: Add `@example` for entry points, decorators, and factory helpers that benefit from hoverable usage.
- [ ] SHOULD: Add `@remarks` for caveats, lifecycle notes, or contract context that does not fit the summary line.
- [ ] SHOULD: Keep source `@example` blocks short and keep scenario-level workflows in package `README.md` files.

## Violation Examples

Missing summary, `@param`, and `@returns` on an exported function:

```ts
export function greet(name: string): string {
  return name;
}
```

Missing `@param` and `@returns` on an exported arrow-function constant:

```ts
/**
 * Format a greeting.
 */
export const greet = (name: string): string => name;
```

Missing `@param` and `@returns` on an exported function-expression constant:

```ts
/**
 * Format a greeting.
 */
export const greet = function (name: string): string {
  return name;
};
```

Invalid barrel-only documentation. Document `greet` where it is defined, not only where it is re-exported:

```ts
/**
 * Re-exported greeting helper.
 */
export { greet } from './greet';
```

## Compliant Example

```ts
/**
 * Format a greeting for the current caller.
 *
 * @param name Name to interpolate into the greeting.
 * @returns A stable greeting string for HTTP or CLI responses.
 *
 * @example
 * ```ts
 * greet('Fluo');
 * ```
 */
export function greet(name: string): string {
  return `Hello, ${name}`;
}
```

## Automation

- [ ] MUST: Run `pnpm verify:public-export-tsdoc` for the default changed-file gate.
- [ ] MUST: Run `pnpm verify:public-export-tsdoc:baseline` or `node tooling/governance/verify-public-export-tsdoc.mjs --mode=full` for the full governed surface.
- [ ] MUST: Expect `pnpm lint` to include `pnpm verify:public-export-tsdoc`.
- [ ] MUST: Expect violation output to report file path, line, declaration kind, declaration name, and missing tags.

## Related Docs

- [Release Governance](./release-governance.md)
- [Behavioral Contract Policy](./behavioral-contract-policy.md)
- [Platform Conformance Authoring Checklist](./platform-conformance-authoring-checklist.md)
