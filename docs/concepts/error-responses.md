# error responses

<p><strong><kbd>English</kbd></strong> <a href="./error-responses.ko.md"><kbd>한국어</kbd></a></p>

This guide outlines the standard error response format and exposure policies used in the Konekti HTTP runtime.

### related documentation

- `./http-runtime.md`
- `./auth-and-jwt.md`
- `../../packages/http/README.md`

## standard error format

Success responses return plain objects. Error responses follow a standard envelope:

```ts
type ErrorResponse = {
  error: {
    code: string;
    status: number;
    message: string;
    requestId?: string;
    details?: Array<{
      field?: string;
      source?: 'path' | 'query' | 'header' | 'cookie' | 'body';
      code: string;
      message: string;
    }>;
    meta?: Record<string, unknown>;
  };
};
```

## default status mapping

The framework uses several standard HTTP status codes for common error scenarios:

- **400 (Bad Request)**: Binding and validation failures.
- **401 (Unauthorized)**: Authentication failures.
- **403 (Forbidden)**: Authorization failures.
- **404 (Not Found)**: Resource not found.
- **409 (Conflict)**: Resource conflict.
- **500 (Internal Server Error)**: Uncaught internal exceptions.

## architectural split

- **Core Layer**: Defines transport-agnostic error contracts.
- **`@konekti/http`**: Provides HTTP-aware exception classes.
- **Adapters**: Guards and resolvers translate internal failures into the HTTP exception model.

## exposure policy

### safe to expose

- Validation field paths.
- Client-friendly validation messages.
- Request IDs.
- General authentication failure categories.

### sensitive (do not expose)

- Stack traces.
- Internal cause chains.
- Raw database or ORM error payloads.
- JWT verification internal details.
- Configuration or secret values.

## request correlation

The `requestId` is included in error responses when available. This ID serves as the primary correlation key across logs, traces, and metrics.
