# open issues

<p><strong><kbd>English</kbd></strong> <a href="./open-issues.ko.md"><kbd>한국어</kbd></a></p>

This file is a convenience index for the current GitHub issue backlog.

GitHub Issues remain the source of truth for planning. This document exists only to group the current open issues, explain what each one is about, and suggest a practical execution order.

## current source of truth

- canonical planning source -> GitHub Issues in `konektijs/konekti`
- current shipped behavior -> `README.md`, `docs/`, and `packages/*/README*.md`

## recommended execution order

1. bootstrap and scaffold UX
2. core runtime and validation contracts
3. transport expansion
4. auth defaults and ecosystem expansion

## related reference

- `nestjs-parity-gaps.md` — capability gap snapshot between Konekti and NestJS

## issue groups

### tier A — hard blockers

| Issue | Title |
|---|---|
| [#163](https://github.com/konektijs/konekti/issues/163) | feat(runtime): KonektiFactory.createApplicationContext — standalone module bootstrap without HTTP |
| [#164](https://github.com/konektijs/konekti/issues/164) | feat(microservices): transport abstraction layer and createMicroservice — TCP and Redis Pub/Sub |
| [#165](https://github.com/konektijs/konekti/issues/165) | feat(platform): @konekti/platform-fastify — Fastify HTTP adapter |
| [#166](https://github.com/konektijs/konekti/issues/166) | feat(http): Header and Media-type versioning strategies |
| [#167](https://github.com/konektijs/konekti/issues/167) | feat(dto-validator): schema-library validation adapter — Zod, Valibot, ArkType |
| [#168](https://github.com/konektijs/konekti/issues/168) | feat(graphql): request-scoped and transient provider injection in GraphQL resolvers |
| [#169](https://github.com/konektijs/konekti/issues/169) | feat(throttler): @konekti/throttler — rate limiting with in-memory and Redis store |
| [#170](https://github.com/konektijs/konekti/issues/170) | feat(event-bus): external transport adapter interface — Redis Pub/Sub |

### tier B — ecosystem gaps

| Issue | Title |
|---|---|
| [#171](https://github.com/konektijs/konekti/issues/171) | docs: migration guide from NestJS to Konekti |
| [#172](https://github.com/konektijs/konekti/issues/172) | docs: third-party extension contract — platform adapters, transport adapters, metadata categories |
| [#173](https://github.com/konektijs/konekti/issues/173) | docs: production deployment guide — Docker, Kubernetes probes, graceful shutdown |
| [#174](https://github.com/konektijs/konekti/issues/174) | ops: public CHANGELOG and version stability signal |

### tier C — positioning gaps

| Issue | Title |
|---|---|
| [#175](https://github.com/konektijs/konekti/issues/175) | docs: lead with standard decorator differentiator — why it matters vs NestJS legacy decorators |
| [#176](https://github.com/konektijs/konekti/issues/176) | docs: sharpen TypeScript-first messaging — explicit DI, no reflection magic, no legacy flags |
| [#177](https://github.com/konektijs/konekti/issues/177) | ops: public npm publish, GitHub Discussions, and adoption signal baseline |

If new future-work questions appear, open them as GitHub Issues and update this file only if a grouped backlog index becomes useful again.

## maintenance rule

When an issue is resolved:

- close the GitHub issue
- update the affected `docs/` topic and package README
- update this file only if the backlog shape itself changed
