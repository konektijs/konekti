import { createHmac } from 'node:crypto';

import { Inject } from '@konekti/core';

import { JwtConfigurationError, JwtInvalidTokenError } from './errors.js';
import type { JwtClaims, JwtVerifierOptions } from './types.js';
import { JWT_OPTIONS } from './verifier.js';

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
    if (!this.options.algorithms.includes('HS256')) {
      throw new JwtConfigurationError('JWT signer requires HS256 in the allowed algorithms list.');
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
      alg: 'HS256',
      typ: 'JWT',
      ...(activeKey ? { kid: activeKey.kid } : {}),
    };
    const headerSegment = encodeBase64Url(JSON.stringify(header));
    const payloadSegment = encodeBase64Url(JSON.stringify(payload));
    const signatureSegment = encodeBase64Url(
      createHmac('sha256', secret).update(`${headerSegment}.${payloadSegment}`).digest(),
    );

    return `${headerSegment}.${payloadSegment}.${signatureSegment}`;
  }
}
