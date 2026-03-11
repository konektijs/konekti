import { describe, expect, it } from 'vitest';

import { DefaultJwtSigner } from './signer';
import { DefaultJwtVerifier } from './verifier';

describe('DefaultJwtSigner', () => {
  it('creates an access token that the verifier accepts', async () => {
    const signer = new DefaultJwtSigner({
      accessTokenTtlSeconds: 120,
      algorithms: ['HS256'],
      audience: 'konekti',
      issuer: 'tests',
      secret: 'secret',
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['HS256'],
      audience: 'konekti',
      issuer: 'tests',
      secret: 'secret',
    });
    const token = await signer.signAccessToken({
      scope: 'read write',
      sub: 'signed-user',
    });

    await expect(verifier.verifyAccessToken(token)).resolves.toEqual(
      expect.objectContaining({
        scopes: ['read', 'write'],
        subject: 'signed-user',
      }),
    );
  });
});
