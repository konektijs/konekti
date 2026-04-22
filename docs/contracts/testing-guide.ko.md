# 테스트 요구사항 (Testing Requirements)

<p><strong><kbd>한국어</kbd></strong> <a href="./testing-guide.md">English</a></p>

## 테스트 유형 (Test Types)

| 테스트 유형 | 필수 적용 표면 | 저장소 기준 도구 및 패턴 |
| --- | --- | --- |
| Unit | 네트워크나 외부 프로세스 의존성이 없는 순수 provider 로직, helper, 실패 분기 | Vitest를 직접 사용합니다. `@fluojs/testing/mock`은 명시적 double을 위한 `createMock(...)`, `createDeepMock(...)`를 제공합니다. |
| Integration | 하나의 애플리케이션 슬라이스 안에서 수행하는 실제 module graph 컴파일, provider override, DI visibility 점검 | `createTestingModule({ rootModule })`을 사용한 뒤 `.compile()` 전에 `overrideProvider(...)`, `overrideGuard(...)`, `overrideInterceptor(...)`, `overrideProviders(...)`를 적용합니다. |
| E2E 스타일 HTTP | 실제 HTTP 스택을 통과하는 request dispatch, guard, interceptor, DTO validation, response writing | `@fluojs/testing`의 `createTestApp({ rootModule })`을 사용합니다. 저장소 예제 `examples/ops-metrics-terminus/src/app.test.ts`는 이 방식으로 `/health`, `/ready`, `/metrics`, 애플리케이션 라우트를 검증합니다. |
| Platform conformance | 프레임워크 지향 플랫폼 패키지와 이식성에 민감한 adapter | 변경이 runtime 또는 adapter contract에 영향을 주는 경우 `@fluojs/testing/platform-conformance`, `@fluojs/testing/http-adapter-portability`, `@fluojs/testing/web-runtime-adapter-portability`, `@fluojs/testing/fetch-style-websocket-conformance`를 사용합니다. |

## 명령어 (Commands)

| 명령어 | 용도 |
| --- | --- |
| `pnpm test` | 저장소 루트에서 workspace Vitest 스위트를 실행합니다. |
| `pnpm vitest run --project packages` | release readiness check에서 쓰는 split project layout으로 package 테스트를 실행합니다. |
| `pnpm vitest run --project apps` | release readiness check에서 쓰는 split project layout으로 app project 테스트를 실행합니다. |
| `pnpm vitest run --project examples` | release readiness check에서 쓰는 split project layout으로 example application 테스트를 실행합니다. |
| `pnpm vitest run --project tooling` | release readiness check에서 쓰는 split project layout으로 tooling 테스트를 실행합니다. |
| `pnpm verify` | build, typecheck, lint, test 순서의 저장소 검증 체인을 실행합니다. |
| `pnpm verify:platform-consistency-governance` | testing 또는 release requirement가 바뀔 때 governed docs와 contract consistency를 검증합니다. |
| `pnpm verify:release-readiness` | `pnpm build`, `pnpm typecheck`, split Vitest projects, `pnpm --dir packages/cli sandbox:matrix`, governance checks를 포함한 canonical release gate를 실행합니다. |

## 커버리지 요구사항 (Coverage Requirements)

- 저장소는 `package.json`이나 governance tooling에서 단일 전역 라인 커버리지 비율을 정의하지 않습니다. 커버리지는 하나의 숫자 임계값이 아니라 contract surface 기준으로 강제됩니다.
- 모든 동작 변경은 영향을 받은 package, example, tooling project 안에서 테스트를 추가하거나 갱신해야 합니다. 가장 가까운 기존 `*.test.ts` 파일이 기본 배치 위치입니다.
- Module wiring 변경은 provider registration, override, DI resolution이 계속 실행되도록 `createTestingModule(...)` 기반 integration coverage를 유지해야 합니다.
- Request-facing HTTP 변경은 실제 request pipeline을 실행하는 `createTestApp(...)` 또는 동등한 dispatch test 기반 coverage를 유지해야 합니다.
- Platform 및 adapter 변경은 runtime portability에 영향을 줄 때 `@fluojs/testing` harness subpath를 통한 conformance 또는 portability coverage를 유지해야 합니다.
- Release-governed testing 변경은 `pnpm verify:release-readiness`가 사용하는 split Vitest project 모델에서 녹색 상태를 유지해야 합니다. 로컬 `pnpm test` 통과만으로 그 split project run을 대체하지 않습니다.
