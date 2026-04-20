<!-- packages: fluo-repo -->
<!-- project-state: advanced -->
# Chapter 17. fluo Contributing Guide

fluo 시리즈의 마지막 장에 오신 것을 축하드립니다. 여기까지 오셨다면 표준 데코레이터의 복잡성, 의존성 주입, 그리고 고급 런타임 아키텍처를 완전히 마스터하셨다는 뜻입니다. 고급 fluo 개발자로서 논리적인 다음 단계는 프레임워크 자체를 형성하는 데 도움을 주는 것입니다.

fluo에 기여하는 것은 단순히 코드를 작성하는 것 이상입니다. 이는 엄격한 행동 계약(behavioral contracts), 명시적 설계, 그리고 플랫폼에 무관한 신뢰성이라는 문화에 참여하는 것을 의미합니다. 이 가이드는 fluo 저장소 구조, 기여 워크플로우, 그리고 생태계를 안정적으로 유지하는 거버넌스 모델에 대해 깊이 있게 다룹니다.

## Repository Structure and Philosophy

fluo 저장소는 `pnpm`으로 관리되는 고성능 모노레포입니다. 우리의 철학은 **행동 계약(Behavioral Contracts)**을 중심으로 합니다. 이는 모든 변경 사항이 단순히 기능뿐만 아니라, 다양한 런타임(Node.js, Bun, Workers)에서 프레임워크의 예측 가능성에 미치는 영향에 의해 평가됨을 의미합니다.

### Workspace Organization

디렉토리 구조는 패키지 간의 불필요한 누수를 최소화하면서 필수적인 빌드 및 린팅 로직을 공유하도록 설계되었습니다:

- `packages/`: 프레임워크의 모듈식 구성 요소를 포함합니다.
- `docs/`: 운영 정책, 아키텍처 결정 기록(ADR)을 포함한 중앙 집중식 문서입니다.
- `examples/`: 다양한 플랫폼에서의 검증을 위한 표준 애플리케이션 설정들입니다.
- `.github/`: 워크플로우 정의, 이슈/PR 템플릿, 자동 라벨링 설정입니다.

`packages/` 디렉토리의 모든 패키지는 자체 테스트 스위트와 문서를 가진 독립된 단위로 취급되지만, 모두 전역 저장소 정책을 준수합니다. 예를 들어, `packages/di`는 고유한 컨테이너 로직을 유지하면서도 `docs/operations/behavioral-contract-policy.md`에 정의된 TC39 데코레이터 경로를 엄격히 따릅니다. 이러한 격리는 `pnpm-workspace.yaml`과 CI 스위트의 커스텀 가시성 체크를 통해 우발적인 결합을 방지하도록 강제됩니다.

## Issue and Label Workflow

우리는 메인테이너의 시간이 영향력 있는 작업에 집중될 수 있도록 매우 구조화된 이슈 접수 프로세스를 사용합니다. 이러한 규율은 "범위 확장(scope creep)"을 방지하고, 모든 변경 사항이 명확한 근거와 검증 경로를 갖도록 보장합니다.

### Issue Templates

fluo 저장소에서는 빈 이슈(blank issue)가 비활성화되어 있습니다. 모든 이슈는 `.github/ISSUE_TEMPLATE/`에 정의된 다음 템플릿 중 하나를 따라야 합니다:
- **Bug Report**: 최소 재현 사례(StackBlitz, 저장소, 또는 fluo 코어의 실패하는 테스트 케이스)가 필요합니다.
- **Feature Request**: 상세한 "이유(문제 정의)"와 "방법(아키텍처 스케치)" 제안이 필요합니다.
- **Documentation Issue**: 가이드의 누락, 번역 오류, 또는 기술적 부정확성을 수정하기 위한 것입니다.
- **DX/Maintainability**: CI 최적화나 공개 API를 변경하지 않는 리팩토링과 같은 내부 개선 사항을 위한 것입니다.

질문은 이슈 트래커가 아닌 **GitHub Discussions**로 유도되어야 합니다. 이러한 분리는 트래커를 실행 가능한 상태로 유지하는 동시에 커뮤니티 주도의 지원을 장려합니다.

### Labeling System

이슈는 사용된 템플릿과 수정된 파일에 따라 자동으로 라벨이 지정됩니다. 주요 라벨은 다음과 같습니다:
- `bug`: 행동 계약을 위반하는 확인된 회귀(regression) 또는 예기치 않은 동작.
- `enhancement`: 프레임워크의 기능을 확장하는 새로운 기능 또는 개선 사항.
- `type:maintainability`: 내부 정리, 의존성 업데이트, 또는 도구 개선.
- `priority:p0` ~ `p2`: 이슈의 심각도와 시급성.

`CONTRIBUTING.md:121-126`에 명시된 바와 같이, 우리는 핵심 런타임의 안정성을 유지하기 위해 명확한 재현 사례가 있는 버그 보고서를 우선적으로 처리합니다. Cloudflare Workers에서 DI 컨테이너를 깨뜨리는 `p0` 버그는 새로운 데이터베이스 어댑터를 위한 `enhancement`보다 항상 우선순위가 높습니다.

## Review Culture

fluo에서 Pull Request를 리뷰하는 것은 엄격한 프로세스입니다. 우리는 단순히 "LGTM"만 하지 않고 검증합니다. 우리의 리뷰 문화는 코드가 그 코드가 보장하는 행동(behavioral guarantee)보다 부차적이라는 원칙 위에 세워져 있습니다.

### Verification Gate

모든 PR은 우리 저장소 상태의 최종 수호자인 `pnpm verify` 명령을 통과해야 하며, 다음을 실행합니다:
- **린팅 및 포맷팅 확인**: Biome 기반 체크(`biome.json` 참조)를 통해 일관된 코드베이스를 유지합니다.
- **단위 및 통합 테스트**: 실전 스모크 테스트 역할을 하는 `examples/` 프로젝트를 포함한 전체 워크스페이스에서 Vitest를 실행합니다.
- **타입 체크**: 타입 수준의 회귀를 방지하기 위해 모든 워크스페이스 패키지에 대해 엄격한 `tsc`를 실행합니다.
- **빌드 검증**: 모든 패키지가 ESM 및 CJS 타겟에 대해 배포를 위해 올바르게 번들링될 수 있는지 확인합니다.

### Behavioral Contract Review

고급 기여자로서 여러분의 리뷰는 변경 사항이 기존 계약을 보존하는지에 집중해야 합니다. `@fluojs/di`의 최적화가 `@fluojs/platform-cloudflare-workers`의 스코핑 규칙을 깨뜨리는지는 않는지? `@fluojs/core`의 새로운 데코레이터가 TC39 표준을 준수하는지 확인해야 합니다.

우리는 종종 동일한 프레임워크 로직을 Node.js와 웹 표준 모의 환경(mocks) 모두에서 테스트하는 "이중 호스트(Dual-Host)" 테스트 전략을 사용합니다. 여러분의 리뷰는 디스패처나 런타임 쉘의 변경 사항이 이러한 동형성(isomorphism)을 유지하는지 확인해야 합니다. 예를 들어, 플랫폼 중립적인 유틸리티를 작성할 때 `process` 대신 `globalThis`가 올바르게 사용되었는지 확인하십시오.

### Documentation First

PR이 공개 API를 추가하는 경우, 인라인 문서(JSDoc)와 `docs/` 또는 `packages/*/README.md`의 관련 마크다운 파일 업데이트를 **반드시** 포함해야 합니다. 기능은 문서화되기 전까지 완료된 것이 아닙니다. 우리는 `@internal` 태그를 사용하여 구현 세부 사항을 숨기는 동시에, 내보낸 모든 심볼이 사용자를 위한 명확한 `@example` 블록을 갖도록 보장합니다.

## Release Process and Governance

fluo는 높은 안정성과 예측 가능한 버전을 유지하기 위해 감독된 릴리스 모델을 따릅니다.

### Package Tiers

패키지는 사용자에게 안정성을 알리기 위해 다음 세 가지 계층으로 분류됩니다:
- **Official**: 프로덕션 준비 완료, 엄격한 유의적 버전(semver)을 따르며, 즉각적인 보안 패치를 받음.
- **Preview**: 조기 채택자를 위한 준비 완료, 공지 후 파괴적 변경이 발생할 수 있음.
- **Experimental**: 인큐베이션 단계, 공식적인 마이그레이션 경로 없이 제거되거나 대폭 변경될 수 있음.

### SEMVER and Migration Notes

0.x 버전에서도 우리는 파괴적 변경(breaking changes)을 극도로 신중하게 다룹니다. 모든 파괴적 변경은 해당 패키지의 `CHANGELOG.md`에 상세한 마이그레이션 노트를 작성해야 합니다. 메인테이너는 게시 작업 전에 이러한 노트가 정확하고 완전한지 확인하기 위해 `pnpm generate:release-readiness-drafts`를 사용합니다. 이 도구는 `feat!:` 또는 `fix!:` 태그가 지정된 커밋 메시지를 스캔하여 "Breaking Changes" 섹션을 자동으로 채웁니다.

### Release Operations

릴리스 운영은 GitHub Actions를 통해 관리됩니다. 우리는 메인테이너가 `pnpm verify:release-readiness` 통과를 확인한 후 릴리스 워크플로우를 트리거하는 "감독된 자동(supervised-auto)" 모델을 사용합니다. 이는 다음을 처리합니다:
1. **출처 검증(Provenance Verification)**: 빌드가 메인 브랜치와 신뢰할 수 있는 CI 러너에서 시작되었는지 확인합니다.
2. **NPM 게시**: 비밀번호 없는 안전한 게시를 위해 OIDC(OpenID Connect)를 사용합니다.
3. **Git 태깅**: 릴리스된 모든 버전에 대해 서명된 태그를 생성하고 푸시합니다.
4. **릴리스 노트**: 생성된 변경 로그 내용을 바탕으로 GitHub Releases를 자동으로 생성합니다.

## Governance and RFC Workflow

작은 수정은 직접 PR할 수 있지만, 중요한 아키텍처 변경은 RFC(Request for Comments) 프로세스를 거쳐야 합니다.

### The RFC Path

RFC 프로세스는 구현에 착수하기 전에 커뮤니티와 핵심 메인테이너가 "이유"에 대해 토론할 수 있는 기회를 보장합니다:

1. **GitHub Discussions**: 커뮤니티의 관심도와 초기 실현 가능성을 측정하기 위해 "Ideas" 또는 "RFC" 카테고리에 스레드를 시작합니다.
2. **Formal Proposal**: 복잡한 변경의 경우 마크다운 제안서(`packages/graphql/field-resolver-rfc.md`의 예시 참조)를 작성하고 `docs/proposals` 디렉토리에 PR을 엽니다.
3. **Review and Consensus**: 핵심 메인테이너와 커뮤니티가 RFC를 리뷰합니다. 구현을 시작하기 전에 승인(FCP, Final Comment Period)이 필요합니다.

### Behavioral Contract Policy

모든 기여자는 `docs/operations/behavioral-contract-policy.md`를 준수해야 합니다. 이 정책은 JavaScript 언어 경로에서 벗어나는 비표준 TypeScript 기능의 사용을 금지함으로써 fluo가 "표준 우선" 프레임워크로 남을 수 있도록 보장합니다. 이것이 모노레포의 모든 `tsconfig.json`에서 `experimentalDecorators: false` 및 `emitDecoratorMetadata: false`를 보게 되는 이유입니다. 우리는 구문적 설탕(syntactic sugar)보다 표준 호환성을 우선시합니다.

## Local Development Workflow

fluo 저장소를 로컬에 설정하려면 다음을 실행하세요:

```bash
# Clone the repository
git clone https://github.com/fluojs/fluo.git
cd fluo

# Install dependencies
pnpm install

# Run verification
pnpm verify
```

Maintainers are encouraged to use **git worktrees** for isolated issue work. Our standard worktree path is `.worktrees/`. This allows you to work on multiple PRs or bug fixes simultaneously while keeping the `main` branch clean. For example, using `git worktree add -b feat/new-adapter .worktrees/new-adapter origin/main` lets you build and test a new platform adapter without disturbing your current development environment.

### Sandbox and Example Verification

`@fluojs/cli`나 핵심 런타임 패키지를 작업할 때는 `packages/cli/README.md:81-91`에 있는 특수 샌드박스 스크립트를 사용합니다. 이 스크립트를 통해 다음이 가능합니다:
- **sandbox:create**: 스캐폴딩 로직을 테스트하기 위해 새로운 스타터 앱을 생성합니다.
- **sandbox:matrix**: 다양한 스타터 템플릿(TCP, Web, Mixed)에 대해 스모크 테스트를 실행합니다.
- **sandbox:verify**: Execute a full internal verification within the generated app.

Similarly, every example in `examples/` is a first-class citizen; they participate in the monorepo's type checking and test runs (`pnpm test`). If you modify the DI container, you must ensure that every example in `examples/` still passes its integration tests. 코어 변경 후에는 `pnpm test:examples`를 별도로 실행하는 것이 좋습니다.

## Final Words
## Community and Mentorship

fluo는 공유된 지식과 멘토링을 바탕으로 성장하는 커뮤니티 주도 프로젝트입니다. 우리는 모든 기여자가 가치 있는 무언가를 제공할 수 있다고 믿으며, 여러분이 우리 생태계 내에서 개발자로서 성장할 수 있도록 돕는 데 전념하고 있습니다. 모노레포나 표준 데코레이터가 처음이라도 두려워하지 마세요. 우리의 메인테이너들이 프로세스 전반에 걸쳐 여러분을 안내할 것입니다.


코드 기여 외에도 아키텍처 토론, 문서 개선, 커뮤니티 지원 등의 분야에서의 기여도 매우 소중하게 생각합니다. 이러한 활동에 참여함으로써 여러분은 모두를 위한 더 포용적이고 강력한 프레임워크를 만드는 데 도움을 줄 수 있습니다. 여러분의 경험을 공유하고, 질문하고, 다른 사람들과 협업하는 것을 주저하지 마세요.

### 메인테이너가 되는 길

fluo의 행동 계약에 대해 지속적인 헌신과 깊은 이해를 보여주는 분들께는 메인테이너의 길을 열어드리고 있습니다. 이는 이슈 분류, PR 리뷰, 아키텍처 결정 등에 있어 더 많은 책임을 지는 것을 의미합니다. 메인테이너는 단순히 타이틀이 아니라, 프로젝트의 장기적인 건강과 안정성에 대한 약속입니다.

우리는 메인테이너가 커뮤니티의 봉사자라는 "봉사 우선(Service-First)" 리더십 모델을 지지합니다. 이는 사용자나 기여자의 요구를 최우선으로 생각하고, 모두를 위한 환영받고 생산적인 환경을 만들기 위해 노력하는 것을 의미합니다. 이 길에 관심이 있다면, 일관되게 고품질의 작업을 기여하고 커뮤니티와 긍정적으로 소통하는 것부터 시작해 보시길 권장합니다.

### 연결 유지

fluo의 최신 소식을 접하려면 공식 블로그를 팔로우하고, 커뮤니티 토론에 참여하며, 릴리스 알림을 구독하는 것이 좋습니다. 이러한 채널들은 다가올 기능, 아키텍처 변경, 커뮤니티 이벤트에 대한 풍부한 정보를 제공합니다.

또한 핵심 메인테이너 및 다른 기여자들과 직접 소통할 수 있는 정기적인 오피스 아워와 커뮤니티 미팅을 개최합니다. 이러한 세션은 여러분의 아이디어에 대한 피드백을 받고, 프로젝트의 내부에 대해 더 배우고, 다른 커뮤니티 멤버들과 관계를 맺을 수 있는 좋은 기회입니다.

## Final Words

fluo의 힘은 커뮤니티에서 나옵니다. 프레임워크에 기여함으로써 여러분은 TypeScript 백엔드가 명시적이고, 표준을 준수하며, 플랫폼에 무관하게 동작하는 미래를 만드는 데 도움을 줄 수 있습니다. 작은 오타 수정부터 대규모 아키텍처 개선까지, 여러분의 첫 번째 PR을 기대하고 있겠습니다. 차세대 TypeScript 개발 환경을 함께 만들어 갑시다!

우리는 여러분의 모든 기여를 소중히 여기며, 기술적인 기여뿐만 아니라 문서화, 커뮤니티 지원, 그리고 디자인 피드백 또한 환영합니다. fluo는 단순한 코드가 아니라, 더 나은 엔지니어링 문화를 지향하는 사람들의 모임입니다. 이 여정에 동참해 주셔서 감사합니다. 여러분의 아이디어와 열정이 fluo를 더 완벽하게 만듭니다.

마지막으로, 이 가이드북 시리즈가 여러분의 fluo 여정에 훌륭한 나침반이 되었기를 바랍니다. 고급 장까지 모두 마친 여러분은 이제 fluo의 진정한 마스터입니다. 이제 여러분의 창의력을 발휘하여 놀라운 프로젝트들을 세상에 선보여 주세요. 우리는 언제나 여러분의 뒤에서 응원하고 지원할 준비가 되어 있습니다. 행운을 빕니다!

---
<!-- lines: 241 -->

