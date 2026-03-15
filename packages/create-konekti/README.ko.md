# create-konekti

Konekti의 unscoped bootstrap 진입점 — `@konekti/cli`의 canonical `new` 경로에 직접 위임한다.

## 이 패키지가 하는 일

`create-konekti`는 compatibility bootstrap layer다. 이 패키지의 존재 이유는 아래처럼 실행할 수 있게 하기 위함이다.

```bash
npx create-konekti my-app
```

`npx @konekti/cli new my-app` 대신 사용하는 진입점이다. 진입점 이후의 모든 것 — 프롬프트, 스캐폴딩, 의존성 설치 — 은 `@konekti/cli`가 소유한다. 이 패키지는 별도의 scaffold 엔진을 유지하지 않는다.

생성된 starter app은 **살아있는 reference slice**다: 공개 health route, protected profile route, dispatcher wiring, app-local JWT strategy를 포함한 Passport adapter, 그리고 프롬프트에서 선택한 ORM 패키지가 포함된다. startup seam으로는 `@konekti/runtime`의 `runNodeApplication()`을 사용하며, app이 직접 `node-http-adapter.ts`를 생성하지 않는다.

## 설치

```bash
# 새 프로젝트 부트스트랩 — 별도 설치 불필요
npx create-konekti my-app
```

## 빠른 시작

```bash
npx create-konekti my-app
# 인터랙티브 프롬프트:
#   1. 프로젝트 이름
#   2. ORM: Prisma 또는 Drizzle
#   3. 데이터베이스
#   4. 패키지 매니저
#   5. 대상 디렉토리
#   (설치 시작 전 Support tier 안내 표시)

cd my-app
npm run dev
```

ORM 선택은 실제 scaffold output에 반영된다: 올바른 ORM 패키지가 `package.json`에 추가되고, `src/examples/user.repo.ts` 파일은 선택한 ORM의 transaction-aware 패턴을 사용한다.

## 핵심 API

| Export | 위치 | 설명 |
|---|---|---|
| `runCreateKonekti(argv)` | `src/index.ts` | 메인 진입점 — `@konekti/cli runCli(['new', ...argv])`에 위임 |
| `promptForCreateKonektiAnswers()` | `src/bootstrap/prompt.ts` | 인터랙티브 프롬프트 flow; 현재 support matrix 반영 |
| `resolveSupportTier(orm, db)` | `src/bootstrap/prompt.ts` | ORM+DB 조합의 support tier 반환 (`supported` / `community` / `experimental`) |
| `createTierNote(tier)` | `src/bootstrap/prompt.ts` | 설치 전 표시되는 tier 안내 포맷 |
| `scaffoldKonektiApp(answers)` | `src/bootstrap/scaffold.ts` | `@konekti/cli` scaffold 함수의 re-export surface |
| `CreateKonektiAnswers` | `src/types.ts` | 프롬프트 답변 shape (이름, ORM, DB, 패키지 매니저, tier) |

## 구조

```
runCreateKonekti(argv)
  → @konekti/cli runCli(['new', ...argv])에 위임
  → canonical prompt flow (promptForCreateKonektiAnswers)
  → ORM/DB → resolveSupportTier → createTierNote
  → scaffoldKonektiApp(answers)
  → 의존성 설치
  → next steps 출력
```

이 패키지는 unscoped 진입점과 프롬프트 시점의 support-tier 안내를 소유한다. canonical scaffold/install 엔진은 `@konekti/cli`가 소유한다.

### scaffold 테스트가 중요한 이유

`src/scaffold-app.test.ts`는 생성된 workspace에서 install → typecheck → build → test를 실제로 실행한다. 이를 통해 `create-konekti`를 통해 생성된 scaffold가 단순한 파일 트리가 아니라 실제로 실행 가능한 starter project를 만든다는 것을 검증한다.

## 파일 읽기 순서 (기여자용)

1. `src/types.ts` — `CreateKonektiOptions`, `CreateKonektiAnswers`, `OrmFamily`, `DatabaseFamily`, `PackageManager`, `SupportTier`
2. `src/bootstrap/prompt.ts` — 프롬프트 순서, support matrix, tier 결정 로직
3. `src/bootstrap/scaffold.ts` — `@konekti/cli` 위의 re-export surface
4. `src/bootstrap/install.ts` — 설치 orchestration
5. `src/index.ts` — `runCreateKonekti()` 진입점
6. `src/bootstrap.test.ts` — 프롬프트 순서 + tier 결정 테스트
7. `src/scaffold-app.test.ts` — full scaffold 통합 테스트

## 관련 패키지

- `@konekti/cli` — 이 패키지가 감싸는 canonical scaffold 엔진
- `@konekti/runtime` — 생성된 앱의 startup 경로 (`runNodeApplication`)
- `@konekti/http`, `@konekti/passport`, `@konekti/jwt` — 생성된 앱의 runtime/auth story
- `@konekti/prisma`, `@konekti/drizzle` — 생성된 workspace에 포함되는 ORM integration

## 한 줄 mental model

```text
create-konekti = `konekti new`로 바로 위임하는 compatibility bootstrap 진입점
```
