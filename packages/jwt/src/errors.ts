import { FluoError } from '@fluojs/core';

/**
 * Error thrown when JWT verification fails due to signature or structural issues.
 */
export class JwtVerificationError extends FluoError {
  constructor(message: string, options: { cause?: unknown; code?: string } = {}) {
    super(message, {
      cause: options.cause,
      code: options.code ?? 'JWT_VERIFICATION_ERROR',
    });
  }
}

/**
 * Error thrown when a provided JWT string is malformed or not a valid token.
 */
export class JwtInvalidTokenError extends JwtVerificationError {
  constructor(message = 'Invalid JWT.') {
    super(message, { code: 'JWT_INVALID_TOKEN' });
  }
}

/**
 * Error thrown when a JWT is valid but has exceeded its expiration time.
 */
export class JwtExpiredTokenError extends JwtVerificationError {
  constructor(message = 'JWT has expired.') {
    super(message, { code: 'JWT_EXPIRED' });
  }
}

/**
 * Error thrown when the JWT module is misconfigured (e.g. missing keys).
 */
export class JwtConfigurationError extends FluoError {
  constructor(message: string) {
    super(message, { code: 'JWT_CONFIGURATION_ERROR' });
  }
}
