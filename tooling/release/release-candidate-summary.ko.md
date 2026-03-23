# release candidate summary

<p><strong><kbd>한국어</kbd></strong> <a href="./release-candidate-summary.md"><kbd>English</kbd></a></p>

## checklist

- [x] **Canonical bootstrap documentation**: 빠른 시작 가이드는 `pnpm add -g @konekti/cli` 및 `konekti new` 경로를 다룹니다.
- [x] **Internal verification documentation**: 레포지토리 로컬 샌드박스 경로는 프레임워크 개발을 위해 CLI README에 문서화되어 있습니다.
- [x] **Starter structure and ownership**: 생성된 스캐폴드는 런타임 소유의 부트스트랩 헬퍼와 로컬화된 헬스 모듈을 사용합니다.
- [x] **Simplified bootstrap contract**: 초기 프로젝트 생성 시 ORM/DB 선택 및 지원 티어에 대한 프롬프트를 제거했습니다.
- [x] **Toolchain stability**: 툴체인 계약 매트릭스가 명시적인 공개, 생성 및 내부 상태와 함께 확정되었습니다.
- [x] **Benchmark evidence**: 릴리스 문서에는 벤치마크 기반의 매니페스트 결정 스냅샷 링크가 포함되어 있습니다.
- [x] **Distribution-based entry points**: CLI 매니페스트 및 바이너리가 `dist` 폴더를 올바르게 가리킵니다.
- [x] **Open Source license**: 레포지토리 루트 레벨에 OSS 라이선스 파일이 존재합니다.
- [x] **Public package synchronization**: `release-governance.ko.md` 및 `package-surface.ko.md` 문서에 일치하는 패키지 목록이 포함되어 있습니다.
- [x] **Workspace verification**: 문서화된 모든 공개 패키지가 워크스페이스 내에 해당 매니페스트를 가지고 있습니다.

## verification commands

이 후보에 대해 다음 명령어들이 성공적으로 실행되었습니다:
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
