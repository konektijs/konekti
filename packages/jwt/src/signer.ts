import { createHmac } from 'node:crypto';

import { Inject } from '@konekti/core';

import { JwtConfigurationError } from './errors.js';
import type { JwtAlgorithm, JwtClaims, JwtVerifierOptions } from './types.js';
import { HMAC_HASH, JWT_OPTIONS } from './verifier.js';

function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

@Inject([JWT_OPTIONS])
export class DefaultJwtSigner {
  constructor(private readonly options: JwtVerifierOptions) {}

  async signAccessToken(claims: JwtClaims): Promise<string> {
    const algorithm: JwtAlgorithm | undefined = this.options.algorithms.find((alg) => alg in HMAC_HASH);

    if (!algorithm) {
      throw new JwtConfigurationError('JWT signer requires at least one HMAC algorithm (HS256, HS384, or HS512) in the allowed algorithms list.');
    }

    const activeKey = this.options.keys?.[0];
    const secret = activeKey?.secret ?? this.options.secret;

    if (!secret) {
      throw new JwtConfigurationError('JWT secret is not configured.');
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = this.options.accessTokenTtlSeconds ?? 3600;
    const payload: JwtClaims = {
      ...claims,
      aud: claims.aud ?? this.options.audience,
      exp: claims.exp ?? now + ttl,
      iat: claims.iat ?? now,
      iss: claims.iss ?? this.options.issuer,
    };
    const header: Record<string, string> = {
      alg: algorithm,
      typ: 'JWT',
      ...(activeKey ? { kid: activeKey.kid } : {}),
    };
    const headerSegment = encodeBase64Url(JSON.stringify(header));
    const payloadSegment = encodeBase64Url(JSON.stringify(payload));
    const hash = HMAC_HASH[algorithm];
    const signatureSegment = encodeBase64Url(
      createHmac(hash, secret).update(`${headerSegment}.${payloadSegment}`).digest(),
    );

    return `${headerSegment}.${payloadSegment}.${signatureSegment}`;
  }
}
