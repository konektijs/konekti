# decorators and metadata

<p><strong><kbd>English</kbd></strong> <a href="./decorators-and-metadata.ko.md"><kbd>한국어</kbd></a></p>

This guide outlines the decorator and metadata model used in `@konekti/core`, `@konekti/http`, `@konekti/validation`, and `@konekti/serialization`.

### related documentation

- `./http-runtime.md`
- `./di-and-modules.md`
- `../../packages/core/README.md`

## decorator implementation

Konekti uses a decorator-first approach based exclusively on TC39 standard decorators.

### core decorator families

- **Module and DI**: `@Module()`, `@Inject()`, `@Scope()`, `@Global()`
- **HTTP Routing**: `@Controller()`, `@Get()`, `@Post()`, `@UseGuards()`, `@UseInterceptors()`
- **Input Binding**: `@FromBody()`, `@FromPath()`, `@FromQuery()`, `@FromHeader()`, `@FromCookie()`
- **Validation**: Input materialization and validation decorators provided by the `@konekti/validation` package
- **Serialization**: Output shaping and response serialization decorators provided by the `@konekti/serialization` package

## input and output strategy

- Input materialization (binding) is an explicit opt-in.
- Method-level route metadata and input field decorators are used instead of parameter-based injection magic.
- Validation is driven by framework-owned decorator metadata on the input-side.
- Serialization is handled as a separate output-side concern to shape response data.
- Nested validation and serialization are first-class features.

### current constraints

- The decorator-driven model is the primary supported contract.
- Direct schema-object validation or serialization is not a priority at this time.
- Validation and serialization adapter contracts will not be expanded into a general extension API for now.

## boundary security

- Input models, output models, and persistence models remain separate.
- Each input field maps to a single request source.
- Body materialization uses a strict allowlist.
- Sensitive or dangerous keys (e.g., `__proto__`, `constructor`, `prototype`) are blocked during input processing.
- Output serialization ensures only intended fields are sent to the client.

## metadata management

- Low-level metadata read/write operations are handled by internal helper APIs.
- The runtime and other packages must access normalized metadata through these helpers.
- Custom decorators should not rely on the internal storage format.
- Third-party extensions to the metadata system are not currently part of the public API.
- Use `ensureMetadataSymbol()` and other exported helpers to ensure compatibility when `Symbol.metadata` is required.

## conceptual model

```text
decorators write framework-owned metadata
runtime packages read normalized metadata
internal storage remains private
```
