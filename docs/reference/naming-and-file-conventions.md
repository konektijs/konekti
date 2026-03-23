# naming and file conventions

<p><strong><kbd>English</kbd></strong> <a href="./naming-and-file-conventions.ko.md"><kbd>한국어</kbd></a></p>

This page summarizes the naming and file conventions used by the Konekti CLI and scaffolding.

## naming conventions

The CLI uses consistent suffix rules for generated files:

- **Controllers**: `user.controller.ts`
- **Services**: `user.service.ts`
- **Repositories**: `user.repo.ts`
- **Request DTOs**: `user.request.dto.ts`
- **Response DTOs**: `user.response.dto.ts`

## generator philosophy

- **Granular Generation**: Use individual generators to build components.
- **Explicit DTOs**: Request and response DTOs are managed via separate schematics to ensure clear boundaries.
- **Simplicity**: Complex monolithic generators (e.g., `g resource`) are currently avoided.

## environment and configuration

- **Standard Modes**: `dev`, `prod`, `test`.
- **Environment Files**:
  - `.env.dev`
  - `.env.prod`
  - `.env.test`

## package managers

- **Detection**: The scaffold auto-detects the active package manager by default.
- **Overrides**: Use the `--package-manager` flag for explicit selection.
- **Reference**: See `../getting-started/bootstrap-paths.md` for more details on the bootstrap process.
