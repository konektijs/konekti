import { FluoError, type FluoErrorOptions } from '@fluojs/core';

/**
 * Error thrown when a requested authentication strategy cannot be resolved.
 */
export class AuthStrategyResolutionError extends FluoError {
  constructor(message: string) {
    super(message, { code: 'AUTH_STRATEGY_RESOLUTION_ERROR' });
  }
}

/**
 * Error thrown when an anonymous user attempts to access a protected resource.
 */
export class AuthenticationRequiredError extends FluoError {
  constructor(message = 'Authentication required.', options: Omit<FluoErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'AUTHENTICATION_REQUIRED' });
  }
}

/**
 * Error thrown when authentication credentials are provided but invalid.
 */
export class AuthenticationFailedError extends FluoError {
  constructor(message = 'Authentication failed.', options: Omit<FluoErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'AUTHENTICATION_FAILED' });
  }
}

/**
 * Error thrown when an authentication token is well-formed but expired.
 */
export class AuthenticationExpiredError extends FluoError {
  constructor(message = 'Authentication token has expired.', options: Omit<FluoErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'AUTHENTICATION_EXPIRED' });
  }
}
