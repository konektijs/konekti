# open issues

<p><a href="./open-issues.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

이 문서는 현재 GitHub issue backlog를 보기 쉽게 묶어 놓은 색인입니다.

planning의 source of truth는 여전히 GitHub Issues입니다. 이 문서는 현재 열려 있는 issue들을 묶어서 보여주고, 각 issue가 무엇을 다루는지 설명하며, 실무적인 진행 순서를 제안하기 위해서만 존재합니다.

## 현재 source of truth

- canonical planning source -> `konektijs/konekti`의 GitHub Issues
- 현재 ship된 동작 -> `README.md`, `docs/`, `packages/*/README*.md`

## 추천 실행 순서

1. bootstrap 및 scaffold UX
2. core runtime 및 validation 계약
3. transport 확장
4. auth 기본값 및 ecosystem 확장

## 관련 참조

- `nestjs-parity-gaps.ko.md` — Konekti와 NestJS 사이의 기능 격차 스냅샷

## issue 그룹

### A 티어 — 하드 블로커

| 이슈 | 제목 |
|---|---|
| [#163](https://github.com/konektijs/konekti/issues/163) | feat(runtime): KonektiFactory.createApplicationContext — HTTP 없이 독립형 모듈 부트스트랩 |
| [#164](https://github.com/konektijs/konekti/issues/164) | feat(microservices): 트랜스포트 추상화 계층과 createMicroservice — TCP 및 Redis Pub/Sub |
| [#165](https://github.com/konektijs/konekti/issues/165) | feat(platform): @konekti/platform-fastify — Fastify HTTP 어댑터 |
| [#166](https://github.com/konektijs/konekti/issues/166) | feat(http): 헤더 및 미디어 타입 버저닝 전략 |
| [#167](https://github.com/konektijs/konekti/issues/167) | feat(dto-validator): 스키마 라이브러리 유효성 검사 어댑터 — Zod, Valibot, ArkType |
| [#168](https://github.com/konektijs/konekti/issues/168) | feat(graphql): GraphQL 리졸버의 request 스코프 및 transient 프로바이더 주입 |
| [#169](https://github.com/konektijs/konekti/issues/169) | feat(throttler): @konekti/throttler — 인메모리 및 Redis 스토어 속도 제한 |
| [#170](https://github.com/konektijs/konekti/issues/170) | feat(event-bus): 외부 트랜스포트 어댑터 인터페이스 — Redis Pub/Sub |

### B 티어 — 생태계 격차

| 이슈 | 제목 |
|---|---|
| [#171](https://github.com/konektijs/konekti/issues/171) | docs: NestJS에서 Konekti로 마이그레이션 가이드 |
| [#172](https://github.com/konektijs/konekti/issues/172) | docs: 서드파티 확장 계약 — 플랫폼 어댑터, 트랜스포트 어댑터, 메타데이터 카테고리 |
| [#173](https://github.com/konektijs/konekti/issues/173) | docs: 프로덕션 배포 가이드 — Docker, Kubernetes 프로브, 그레이스풀 셧다운 |
| [#174](https://github.com/konektijs/konekti/issues/174) | ops: 공개 CHANGELOG 및 버전 안정성 신호 |

### C 티어 — 포지셔닝 격차

| 이슈 | 제목 |
|---|---|
| [#175](https://github.com/konektijs/konekti/issues/175) | docs: 표준 데코레이터 차별점 전면화 — NestJS 레거시 데코레이터 대비 중요성 |
| [#176](https://github.com/konektijs/konekti/issues/176) | docs: TypeScript-first 메시지 구체화 — 명시적 DI, 리플렉션 없음, 레거시 플래그 없음 |
| [#177](https://github.com/konektijs/konekti/issues/177) | ops: 공개 npm 배포, GitHub Discussions, 채택 신호 기준선 |

## 유지 규칙

어떤 issue가 해결되면:

- GitHub issue를 닫고
- 영향을 받는 `docs/` 주제와 package README를 업데이트하고
- backlog 구조 자체가 바뀐 경우에만 이 파일을 수정합니다.
