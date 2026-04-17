# Error Handling & Responses

<p><strong><kbd>English</kbd></strong> <a href="./error-responses.ko.md"><kbd>한국어</kbd></a></p>

A backend's quality is often judged by how it handles failure. fluo enforces a **standardized error response format** across the framework, ensuring your API remains predictable, actionable, and secure for clients even when things go wrong.

## Why Standardized Errors in fluo?

- **Predictable API Surface**: Clients can implement a single error-handling logic that works across all endpoints, whether the error came from a database, a validation rule, or an auth guard.
- **Actionable Feedback**: Validation errors include detailed field-level information, allowing frontend developers to show precise error messages without guessing.
- **Security by Design**: Internal stack traces and sensitive database errors are automatically stripped in production, preventing information leakage.
- **Request Correlation**: Every error response includes the `requestId`, making it trivial to find corresponding logs in the observability stack.

## Responsibility Split

- **`@fluojs/http` (The Filter)**: Provides the global exception filter, the base `HttpException` class, and standard exceptions like `NotFoundException` or `ForbiddenException`.
- **`@fluojs/validation` (The Reporter)**: Specialized in generating rich, nested error structures when DTO validation fails.
- **`@fluojs/core` (The Contract)**: Defines shared framework error primitives like `fluoError` and the lower-level invariants other packages build on.

## Typical Workflow

### 1. Throwing an Exception
Use built-in exceptions to communicate intent clearly and stay consistent with HTTP status codes.

```typescript
if (!user) {
  throw new NotFoundException('User not found');
}
```

### 2. The Global Catch-All
Any exception thrown (or unhandled) during a request is caught by the fluo dispatcher. It identifies if the exception is a known `HttpException` or a raw JavaScript `Error`.

### 3. Envelope Formatting
The error is wrapped in the standard fluo envelope.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "status": 404,
    "message": "User not found",
    "requestId": "req_abc123",
    "timestamp": "2024-04-08T..."
  }
}
```

### 4. Validation Specifics
When a DTO fails validation, the `details` array is populated with specific field violations.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "status": 400,
    "message": "Bad Request",
    "details": [
      { "field": "email", "issue": "must be a valid email" }
    ]
  }
}
```

## Core Boundaries

- **The Production Shield**: In production mode, raw `Error` objects like database connection failures are mapped to a generic `INTERNAL_SERVER_ERROR` code to protect infrastructure details.
- **Correlation is Key**: Always include the `requestId` in client-side error reporting or support tickets. It is the glue between the client experience and the server logs.
- **Consistency over Customization**: While you can customize error filters, we recommend sticking to the standard envelope to maintain ecosystem compatibility with our CLI and client generators.

## Custom Exception Classes

When built-in exceptions don't cover your domain requirements, you can create custom ones by extending `HttpException`. This ensures your custom errors still benefit from the global filter and standard envelope formatting.

```typescript
import { HttpException } from '@fluojs/http';

export class PaymentRequiredException extends HttpException {
  constructor(message = 'Payment required to access this resource') {
    super(message, 402, 'PAYMENT_REQUIRED');
  }
}
```

By extending `HttpException`, which itself extends `FluoError`, you maintain type compatibility across the framework while providing specific semantic meaning to your API failures.

## Custom Exception Filters

Exception filters allow you to intercept and modify how errors are processed or logged. You can implement the `ExceptionFilterHandler` interface from `@fluojs/runtime` to create specialized logic for specific error types.

```typescript
import { ExceptionFilterHandler } from '@fluojs/runtime';
import { MaybePromise } from '@fluojs/core';

export class DatabaseExceptionFilter implements ExceptionFilterHandler {
  catch(error: any, context: any): MaybePromise<boolean | void> {
    if (error.name === 'PrismaClientKnownRequestError') {
      // Custom logging or transformation logic
      console.error('Database error detected:', error.message);
      
      // Returning false allows the next filter to handle it
      // Returning void or true stops the propagation
      return false;
    }
  }
}
```

### Non-HTTP Error Handling

While fluo is heavily optimized for HTTP, it handles errors in other contexts like WebSockets or CQRS command handlers with the same rigor. 

- **WebSockets**: Errors thrown in gateway handlers are caught and sent back through the configured socket error event, maintaining the same `{ error: { ... } }` structure.
- **CQRS**: Command and Query handlers should throw standard exceptions. The dispatcher calling these handlers will normalize the errors based on the active transport layer.

## Troubleshooting

- **Raw Errors in Dev vs Prod**: If you see full stack traces in your JSON responses, your environment is likely set to `development`. In `production`, these are replaced by `InternalServerErrorException` to prevent data leaks.
- **Lost Details**: Ensure you are not catching errors and re-throwing them as generic `Error` objects, as this strips the `HttpException` metadata required for the rich envelope.
- **Filter Order**: Custom filters are executed in the order they are registered. If a filter returns `true` or `void`, subsequent filters won't see the error.

## Next Steps

- **Hierarchy**: Review the built-in exception classes in the [HTTP Package README](../../packages/http/README.md).
- **Validation**: Learn about rich error reporting in the [Validation Package](../../packages/validation/README.md).
- **Advanced**: Learn how to create custom exception filters in the [HTTP Package README](../../packages/http/README.md).
