/**
 * Options for creating a {@link FluoError}.
 */
export interface FluoErrorOptions {
  /** Stable error code for programmatic identification. */
  code?: string;
  /** Original error that caused this failure. */
  cause?: unknown;
  /** Additional structured metadata for diagnostics. */
  meta?: Record<string, unknown>;
}

/**
 * Base error class for all fluo framework errors.
 */
export class FluoError extends Error {
  /** Stable error code. */
  readonly code: string;
  /** Additional structured metadata. */
  readonly meta?: Record<string, unknown>;

  /**
   * Creates a new FluoError.
   *
   * @param message Human-readable error message.
   * @param options Optional error configuration including `code`, `cause`, and `meta`.
   */
  constructor(message: string, options: FluoErrorOptions = {}) {
    super(message, options.cause instanceof Error ? { cause: options.cause } : undefined);

    this.name = new.target.name;
    this.code = options.code ?? 'FLUO_ERROR';
    this.meta = options.meta;

    if (!(options.cause instanceof Error) && options.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        configurable: true,
        enumerable: false,
        value: options.cause,
        writable: true,
      });
    }
  }
}

/**
 * Error thrown when a system invariant is violated.
 */
export class InvariantError extends FluoError {
  /**
   * Creates an invariant error.
   *
   * @param message Human-readable description of the violation.
   * @param options Optional error configuration.
   */
  constructor(message: string, options: Omit<FluoErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'INVARIANT_ERROR' });
  }
}

/**
 * Abstract base class for errors that require a specific error code.
 */
export abstract class FluoCodeError extends FluoError {
  /**
   * Creates a code-specific error.
   *
   * @param message Human-readable error message.
   * @param code Programmatic error code.
   * @param options Optional error configuration.
   */
  constructor(message: string, code: string, options: Omit<FluoErrorOptions, 'code'> = {}) {
    super(message, { ...options, code });
  }
}

/**
 * Formats a DI token into a human-readable string for error messages.
 *
 * @param token The token to format.
 * @returns A string representation of the token.
 */
export function formatTokenName(token: unknown): string {
  if (typeof token === 'function' && 'name' in token && token.name) {
    return String(token.name);
  }

  if (typeof token === 'symbol') {
    return token.toString();
  }

  return String(token);
}
