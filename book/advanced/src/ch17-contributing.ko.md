<!-- packages: fluo-repo -->
<!-- project-state: advanced -->
# Chapter 17. fluo Contributing Guide

fluo 시리즈의 마지막 장에 오신 것을 축하드립니다. 여기까지 오셨다면 표준 데코레이터의 복잡성, 의존성 주입, 그리고 고급 런타임 아키텍처를 완전히 마스터하셨다는 뜻입니다. 고급 fluo 개발자로서 논리적인 다음 단계는 프레임워크 자체를 형성하는 데 도움을 주는 것입니다.

fluo에 기여하는 것은 단순히 코드를 작성하는 것 이상입니다. 이는 엄격한 행동 계약(behavioral contracts), 명시적 설계, 그리고 플랫폼에 무관한 신뢰성이라는 문화에 참여하는 것을 의미합니다. 이 가이드는 fluo 저장소 구조, 기여 워크플로우, 그리고 생태계를 안정적으로 유지하는 거버넌스 모델에 대해 깊이 있게 다룹니다.

## Repository Structure and Philosophy

fluo 저장소는 `pnpm`으로 관리되는 고성능 모노레포입니다. 우리의 철학은 **행동 계약(Behavioral Contracts)**을 중심으로 합니다. 이는 모든 변경 사항이 단순히 기능뿐만 아니라, 다양한 런타임(Node.js, Bun, Workers)에서 프레임워크의 예측 가능성에 미치는 영향에 의해 평가됨을 의미합니다.

### Workspace Organization

- `packages/`: 프레임워크의 모듈식 구성 요소를 포함합니다.
- `docs/`: 운영 정책을 포함한 중앙 집중식 문서입니다.
- `examples/`: 검증을 위한 표준 애플리케이션 설정들입니다.
- `.github/`: 워크플로우 정의 및 이슈/PR 템플릿입니다.

`packages/` 디렉토리의 모든 패키지는 자체 테스트 스위트와 문서를 가진 독립된 단위로 취급되지만, 모두 전역 저장소 정책을 준수합니다. 예를 들어, `packages/di`는 고유한 컨테이너 로직을 유지하면서도 `docs/operations/behavioral-contract-policy.md`에 정의된 TC39 데코레이터 경로를 엄격히 따릅니다.

## Issue and Label Workflow

우리는 메인테이너의 시간이 영향력 있는 작업에 집중될 수 있도록 매우 구조화된 이슈 접수 프로세스를 사용합니다. 이러한 규율은 "범위 확장(scope creep)"을 방지하고, 모든 변경 사항이 명확한 근거와 검증 경로를 갖도록 보장합니다.

### Issue Templates

fluo 저장소에서는 빈 이슈(blank issue)가 비활성화되어 있습니다. 모든 이슈는 다음 템플릿 중 하나를 따라야 합니다:
- **Bug Report**: 최소 재현 사례(stackblitz 또는 저장소)가 필요합니다.
- **Feature Request**: 상세한 "이유(Why)"와 "방법(How)" 제안이 필요합니다.
- **Documentation Issue**: 가이드의 누락이나 오류를 수정하기 위한 것입니다.
- **DX/Maintainability**: 개발자를 돕는 내부 개선 사항을 위한 것입니다.

질문은 이슈 트래커가 아닌 **GitHub Discussions**로 유도되어야 합니다. 이러한 분리는 트래커를 실행 가능한 상태로 유지하는 동시에 커뮤니티 대화를 장려합니다.

### Labeling System

이슈는 사용된 템플릿에 따라 자동으로 라벨이 지정됩니다. 주요 라벨은 다음과 같습니다:
- `bug`: 확인된 회귀(regression) 또는 예기치 않은 동작.
- `enhancement`: 새로운 기능 또는 개선 사항.
- `type:maintainability`: 내부 정리 또는 도구 개선.
- `priority:p0` ~ `p2`: 이슈의 심각도.

`CONTRIBUTING.md:121-126`에 명시된 바와 같이, 우리는 핵심 런타임의 안정성을 유지하기 위해 명확한 재현 사례가 있는 버그 보고서를 우선적으로 처리합니다.

## Review Culture

fluo에서 Pull Request를 리뷰하는 것은 엄격한 프로세스입니다. 우리는 단순히 "LGTM"만 하지 않고 검증합니다. 우리의 리뷰 문화는 코드가 그 코드가 보장하는 행동(behavioral guarantee)보다 부차적이라는 원칙 위에 세워져 있습니다.

### Verification Gate

모든 PR은 `CONTRIBUTING.md:31-45`에 명시된 대로 `pnpm verify` 명령을 통과해야 합니다. 이 명령은 우리 저장소 상태의 최종 수호자로서 다음을 실행합니다:
- **린팅 및 포맷팅 확인**: Biome 기반 체크(`biome.json` 참조)를 통해 일관된 코드베이스를 유지합니다.
- **단위 및 통합 테스트**: `examples/` 프로젝트를 포함한 전체 워크스페이스에서 Vitest를 실행합니다.
- **타입 체크**: 모든 워크스페이스 패키지에 대해 엄격한 `tsc`를 실행하여 회귀를 방지합니다.
- **빌드 검증**: 모든 패키지가 배포를 위해 올바르게 번들링될 수 있는지 확인합니다.

### Behavioral Contract Review

고급 기여자로서 여러분의 리뷰는 변경 사항이 기존 계약을 보존하는지에 집중해야 합니다. `@fluojs/di`의 최적화가 `@fluojs/platform-cloudflare-workers`의 스코핑 규칙을 깨뜨리지는 않는지? `@fluojs/core`의 새로운 데코레이터가 TC39 표준을 준수하는지 확인해야 합니다.

우리는 종종 동일한 프레임워크 로직을 Node.js와 웹 표준 모의 환경(mocks) 모두에서 테스트하는 "이중 호스트(Dual-Host)" 테스트 전략을 사용합니다. 여러분의 리뷰는 디스패처나 런타임 쉘의 변경 사항이 이러한 동형성(isomorphism)을 유지하는지 확인해야 합니다.

### Documentation First

PR이 공개 API를 추가하는 경우, 인라인 문서(JSDoc)와 `docs/` 또는 `packages/*/README.md`의 관련 마크다운 파일 업데이트를 **반드시** 포함해야 합니다. **Public Export TSDoc Baseline**에 정의된 대로, 기능은 문서화되기 전까지 완료된 것이 아닙니다.

## Release Process and Governance

fluo는 높은 안정성을 유지하기 위해 감독된 릴리스 모델을 따릅니다.

### Package Tiers

패키지는 다음 세 가지 계층으로 분류됩니다:
- **Official**: 프로덕션 준비 완료, 엄격한 유의적 버전(semver)을 따름.
- **Preview**: 조기 채택자를 위한 준비 완료, 변경될 수 있음.
- **Experimental**: 인큐베이션 단계, 제거되거나 대폭 변경될 수 있음.

### SEMVER and Migration Notes

0.x 버전에서도 우리는 파괴적 변경(breaking changes)을 신중하게 다룹니다. 모든 파괴적 변경은 해당 패키지의 `CHANGELOG.md`에 상세한 마이그레이션 노트를 작성해야 합니다. 메인테이너는 `pnpm generate:release-readiness-drafts`를 사용하여 게시 작업 전에 이러한 노트가 정확하고 완전한지 확인합니다.

### Release Operations

릴리스 운영은 GitHub Actions를 통해 관리됩니다. 우리는 **"감독된 자동(supervised-auto)"** 모델(`CONTRIBUTING.md:73-80`)을 사용합니다. 메인테이너는 `pnpm verify:release-readiness` 통과를 확인한 후 `.github/workflows/release-single-package.yml` 워크플로우를 트리거합니다. 이는 보안이 강화된 격리된 환경에서 검증, OIDC를 통한 npm 게시, git 태그 생성을 처리합니다.

## Governance and RFC Workflow

작은 수정은 직접 PR할 수 있지만, 중요한 아키텍처 변경은 RFC(Request for Comments) 프로세스를 거쳐야 합니다.

### The RFC Path

1. **GitHub Discussions**: 커뮤니티의 관심도와 초기 실현 가능성을 측정하기 위해 "Ideas" 또는 "RFC" 카테고리에 스레드를 시작합니다.
2. **Formal Proposal**: 복잡한 변경의 경우 마크다운 제안서(`packages/graphql/field-resolver-rfc.md`의 예시 참조)를 작성하고 `docs/proposals` 디렉토리에 PR을 엽니다.
3. **Review and Consensus**: 핵심 메인테이너와 커뮤니티가 RFC를 리뷰합니다. 구현을 시작하기 전에 승인이 필요합니다.

### Behavioral Contract Policy

모든 기여자는 `docs/operations/behavioral-contract-policy.md`를 준수해야 합니다. 이 정책은 JavaScript 언어 경로에서 벗어나는 비표준 TypeScript 기능의 사용을 금지함으로써 fluo가 "표준 우선" 프레임워크로 남을 수 있도록 보장합니다. 이것이 모노레포의 모든 `tsconfig.json`에서 `experimentalDecorators: false`를 보게 되는 이유입니다.

## Local Development Workflow

fluo 저장소를 로컬에 설정하려면 다음을 실행하세요:

```bash
# Clone the repository
git clone https://github.com/fluojs/fluo.git
cd fluo

# Install dependencies (Node 20+ required)
pnpm install

# Run the full verification suite
pnpm verify
```

메인테이너는 격리된 이슈 작업을 위해 **git worktrees**를 사용하는 것이 권장됩니다. 우리의 표준 워크트리 경로는 `.worktrees/`입니다. 이를 통해 여러 PR이나 버그 수정을 동시에 작업하면서 `main` 브랜치를 깨끗하게 유지할 수 있습니다. 예를 들어, `git worktree add -b feat/new-adapter .worktrees/new-adapter origin/main`을 사용하면 현재 개발 환경을 방해하지 않고 새로운 플랫폼 어댑터를 빌드하고 테스트할 수 있습니다.

### Sandbox and Example Verification

`@fluojs/cli`나 핵심 런타임 패키지를 작업할 때는 `packages/cli/README.md:81-91`에 있는 특수 샌드박스 스크립트를 사용합니다. 이 스크립트를 통해 다음이 가능합니다:
- **sandbox:create**: 스캐폴딩 로직을 테스트하기 위해 새로운 스타터 앱을 생성합니다.
- **sandbox:matrix**: 다양한 스타터 템플릿(TCP, Web, Mixed)에 대해 스모크 테스트를 실행합니다.
- **sandbox:verify**: 생성된 앱 내부에서 전체 내부 검증을 실행합니다.

마찬가지로 `examples/`의 모든 예제는 1급 시민입니다. 이들은 모노레포의 타입 체크 및 테스트 실행(`pnpm test`)에 참여합니다. DI 컨테이너를 수정하는 경우 `examples/`의 모든 예제가 통합 테스트를 통과하는지 확인해야 합니다.

## Final Words

fluo의 강점은 커뮤니티에 있습니다. 프레임워크에 기여함으로써 여러분은 TypeScript 백엔드가 명시적이고, 표준을 준수하며, 플랫폼에 무관한 미래를 구축하는 데 도움을 주게 됩니다. 여러분의 첫 번째 PR을 기다리겠습니다!

---
<!-- lines: 208 -->

















































































