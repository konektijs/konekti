# @fluojs/platform-deno

## 1.0.0-beta.3

### Patch Changes

- [#1467](https://github.com/fluojs/fluo/pull/1467) [`c3ef937`](https://github.com/fluojs/fluo/commit/c3ef9375d83e9c3ee0e3caf52f6b3414c5b8e5d3) Thanks [@ayden94](https://github.com/ayden94)! - Reuse shared Web request-response factories across adapter requests while preserving per-request body materialization and error/fallback response semantics.

- Updated dependencies [[`c3ef937`](https://github.com/fluojs/fluo/commit/c3ef9375d83e9c3ee0e3caf52f6b3414c5b8e5d3)]:
  - @fluojs/runtime@1.0.0-beta.6

## 1.0.0-beta.2

### Patch Changes

- [#1369](https://github.com/fluojs/fluo/pull/1369) [`f87a041`](https://github.com/fluojs/fluo/commit/f87a04142032f4d9a94ba7654971c1565d01a100) Thanks [@ayden94](https://github.com/ayden94)! - Document and verify Deno HTTPS startup portability by forwarding `https.cert` and `https.key` to `Deno.serve` and reporting HTTPS listen URLs.

- Updated dependencies [[`4333cee`](https://github.com/fluojs/fluo/commit/4333cee59deefe0e96e96903e8a2681cd174761f)]:
  - @fluojs/runtime@1.0.0-beta.2
