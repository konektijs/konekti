import type { JwtPrincipal, JwtVerifierOptions } from '../types.js';

import { type JwksClient } from './jwks.js';
import { DefaultJwtVerifier } from './verifier.js';

type AccessTokenVerifyOverrides = Pick<
  JwtVerifierOptions,
  'algorithms' | 'audience' | 'clockSkewSeconds' | 'issuer' | 'maxAge' | 'requireExp'
>;

type VerifierMethod = (
  token: string,
  options: JwtVerifierOptions,
  keyResolutionState: unknown,
  jwksClient: JwksClient | undefined,
) => Promise<JwtPrincipal>;

export function verifyAccessTokenWithOverrides(
  verifier: DefaultJwtVerifier,
  token: string,
  overrides: Partial<AccessTokenVerifyOverrides>,
): Promise<JwtPrincipal> {
  const internals = verifier as unknown as Record<string, unknown>;
  const options = internals.options as JwtVerifierOptions;
  const verifyToken = internals.verifyToken as VerifierMethod;

  return verifyToken.call(
    verifier,
    token,
    {
      ...options,
      algorithms: overrides.algorithms ?? options.algorithms,
      audience: overrides.audience ?? options.audience,
      clockSkewSeconds: overrides.clockSkewSeconds ?? options.clockSkewSeconds,
      issuer: overrides.issuer ?? options.issuer,
      maxAge: overrides.maxAge ?? options.maxAge,
      requireExp: overrides.requireExp ?? options.requireExp,
    },
    internals.keyResolutionState,
    internals.jwksClient as JwksClient | undefined,
  );
}
