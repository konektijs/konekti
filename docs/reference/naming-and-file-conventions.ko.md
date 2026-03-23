# naming and file conventions

<p><strong><kbd>한국어</kbd></strong> <a href="./naming-and-file-conventions.md"><kbd>English</kbd></a></p>

이 페이지는 Konekti CLI 및 스캐폴딩에서 사용하는 명명 및 파일 규칙을 요약합니다.

## naming conventions

CLI는 생성된 파일에 대해 일관된 접미사 규칙을 사용합니다.

- **Controllers**: `user.controller.ts`
- **Services**: `user.service.ts`
- **Repositories**: `user.repo.ts`
- **Request DTOs**: `user.request.dto.ts`
- **Response DTOs**: `user.response.dto.ts`

## generator philosophy

- **Granular Generation**: 개별 생성기를 사용하여 컴포넌트를 빌드합니다.
- **Explicit DTOs**: 요청 및 응답 DTO는 명확한 경계를 보장하기 위해 별도의 스키마틱을 통해 관리됩니다.
- **Simplicity**: `g resource`와 같은 복잡한 모놀리식 생성기는 현재 지양합니다.

## environment and configuration

- **Standard Modes**: `dev`, `prod`, `test`.
- **Environment Files**:
  - `.env.dev`
  - `.env.prod`
  - `.env.test`

## package managers

- **Detection**: 스캐폴드는 기본적으로 활성 패키지 매니저를 자동 감지합니다.
- **Overrides**: 명시적인 선택을 위해 `--package-manager` 플래그를 사용합니다.
- **Reference**: 부트스트랩 프로세스에 대한 자세한 내용은 `../getting-started/bootstrap-paths.ko.md`를 참조하세요.
