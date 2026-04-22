# Error Response Taxonomy

<p><strong><kbd>English</kbd></strong> <a href="./error-responses.ko.md"><kbd>한국어</kbd></a></p>

This document defines the HTTP error envelope used by `@fluojs/http`, the stable response codes exposed by built-in exceptions, and the dispatcher rules that normalize unknown failures.

## Error Shape

`packages/http/src/exceptions.ts` defines the canonical serialized envelope as `ErrorResponse`.

| Field | Type | Required | Source | Notes |
| --- | --- | --- | --- | --- |
| `error.code` | `string` | Yes | `HttpException.code` | Stable programmatic error code. |
| `error.status` | `number` | Yes | `HttpException.status` | HTTP status written to the response. |
| `error.message` | `string` | Yes | `HttpException.message` | Human readable failure message. |
| `error.details` | `HttpExceptionDetail[]` | No | `HttpException.details` | Field or source level diagnostics for binding and validation failures. |
| `error.meta` | `Record<string, unknown>` | No | `HttpException.meta` | Structured metadata for observability or client diagnostics. |
| `error.requestId` | `string` | No | Dispatcher argument | Present when the request context has a correlation ID. |

Structured contract:

```ts
interface ErrorResponse {
  error: {
    code: string;
    status: number;
    message: string;
    details?: Array<{
      code: string;
      field?: string;
      message: string;
      source?: 'body' | 'path' | 'query' | 'header' | 'cookie';
    }>;
    meta?: Record<string, unknown>;
    requestId?: string;
  };
}
```

Observed detail producers in the current HTTP pipeline:

| Producer | Top-level code | Detail codes currently emitted |
| --- | --- | --- |
| `DefaultBinder` request binding failures | `BAD_REQUEST` | `MISSING_FIELD`, `INVALID_BODY`, `DANGEROUS_KEY`, `UNKNOWN_FIELD` |
| `HttpDtoValidationAdapter` DTO validation failures | `BAD_REQUEST` | Validation issue codes mapped through `toInputErrorDetail(...)` |
| Built-in HTTP exceptions without field diagnostics | exception-specific | none |

## Error Codes

Built-in exception classes in `packages/http/src/exceptions.ts` currently serialize these top-level codes:

| HTTP status | Code | Class |
| --- | --- | --- |
| `400` | `BAD_REQUEST` | `BadRequestException` |
| `401` | `UNAUTHORIZED` | `UnauthorizedException` |
| `403` | `FORBIDDEN` | `ForbiddenException` |
| `404` | `NOT_FOUND` | `NotFoundException` |
| `406` | `NOT_ACCEPTABLE` | `NotAcceptableException` |
| `409` | `CONFLICT` | `ConflictException` |
| `413` | `PAYLOAD_TOO_LARGE` | `PayloadTooLargeException` |
| `429` | `TOO_MANY_REQUESTS` | `TooManyRequestsException` |
| `500` | `INTERNAL_SERVER_ERROR` | `InternalServerErrorException` |

Normalization rules in `packages/http/src/dispatch/dispatch-error-policy.ts` add these dispatcher mappings:

| Input failure | Output code | Output status | Rule |
| --- | --- | --- | --- |
| Existing `HttpException` | existing code | existing status | Serialized without remapping. |
| `HandlerNotFoundError` | `NOT_FOUND` | `404` | Converted to `NotFoundException`. |
| Any other thrown value | `INTERNAL_SERVER_ERROR` | `500` | Converted to `InternalServerErrorException`. |

## Handling Rules

| Rule | Statement | Source anchor |
| --- | --- | --- |
| Serialization boundary | HTTP clients receive the `{ error: ... }` envelope created by `createErrorResponse(...)`. | `packages/http/src/exceptions.ts` |
| Unknown failure masking | Non-`HttpException` values are normalized to `INTERNAL_SERVER_ERROR` with the message `Internal server error.` | `packages/http/src/dispatch/dispatch-error-policy.ts` |
| Route miss mapping | Missing handlers are exposed as `NOT_FOUND` instead of raw runtime errors. | `packages/http/src/dispatch/dispatch-error-policy.ts` |
| Response commit guard | `writeErrorResponse(...)` returns without writing when the response is already committed. | `packages/http/src/dispatch/dispatch-error-policy.ts` |
| Request correlation | The dispatcher passes `requestContext.requestId` into error serialization, and the correlation middleware populates that value from inbound headers when available. | `packages/http/src/dispatch/dispatcher.ts`, `packages/http/src/middleware/correlation.ts` |
| Binding diagnostics | Missing request fields, invalid body shapes, dangerous keys, and unknown body fields produce `BAD_REQUEST` with structured `details`. | `packages/http/src/adapters/binding.ts` |
| Validation diagnostics | DTO validation failures are converted to `BadRequestException` with mapped issue details. | `packages/http/src/adapters/dto-validation-adapter.ts` |

Constraints:

- Application and package code should throw `HttpException` subclasses when a stable client-facing status and code are required.
- Clients should treat `error.code` as the machine key, and `error.message` as human-facing text.
- `error.details` is optional. Consumers must handle envelopes that contain only `code`, `status`, and `message`.
- `requestId` is optional. Client correlation logic must not assume it exists on every response.
