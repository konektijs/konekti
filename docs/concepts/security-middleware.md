# security middleware

<p><strong><kbd>English</kbd></strong> <a href="./security-middleware.ko.md"><kbd>한국어</kbd></a></p>

This guide outlines the transport-level security middleware implemented in `@konekti/http`.

### related documentation

- `./http-runtime.md`
- `../../packages/http/README.md`

## middleware families

### rate limiting

The `RateLimitMiddleware` provides transport-level protection:

- **Availability**: Exported from `@konekti/http`.
- **Interface**: Implements the standard middleware interface.
- **Identification**: Supports custom resolvers for request identification.
- **Response**: Returns `429 Too Many Requests` with a `Retry-After` header when limits are exceeded.
- **Storage**: Uses an in-process store by default. It is not cluster-safe without a shared adapter.
- **Usage**: Recommended for single-process protection. For distributed systems, use shared limiters at the edge or infrastructure level.

### security headers

The `SecurityHeadersMiddleware` manages security-focused HTTP headers:

- **Availability**: Exported from `@konekti/http`.
- **Behavior**: Writes a baseline set of security headers.
- **Customization**: Supports overriding or disabling specific headers.
- **Safety**: Never includes `X-Powered-By`.

## default security headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`

## responsibilities

- **Location**: These middleware reside within the HTTP runtime package.
- **Opt-in**: Security middleware must be explicitly enabled by the application.
- **Lifecycle**:
  - Rate limiting occurs before route dispatch and is independent of handler logic.
  - Security headers are applied to all responses, regardless of the handler's outcome.
