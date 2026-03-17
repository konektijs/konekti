import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { DefaultJwtSigner } from './signer.js';
import { DefaultJwtVerifier } from './verifier.js';

describe('DefaultJwtSigner', () => {
  it('creates an access token that the verifier accepts (HS256)', async () => {
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

  it('creates an access token that the verifier accepts (HS384)', async () => {
    const signer = new DefaultJwtSigner({
      algorithms: ['HS384'],
      issuer: 'tests',
      secret: 'secret',
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['HS384'],
      issuer: 'tests',
      secret: 'secret',
    });
    const token = await signer.signAccessToken({ sub: 'user-hs384' });

    await expect(verifier.verifyAccessToken(token)).resolves.toMatchObject({
      subject: 'user-hs384',
    });
  });

  it('creates an access token that the verifier accepts (HS512)', async () => {
    const signer = new DefaultJwtSigner({
      algorithms: ['HS512'],
      issuer: 'tests',
      secret: 'secret',
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['HS512'],
      issuer: 'tests',
      secret: 'secret',
    });
    const token = await signer.signAccessToken({ sub: 'user-hs512' });

    await expect(verifier.verifyAccessToken(token)).resolves.toMatchObject({
      subject: 'user-hs512',
    });
  });

  it('uses the first HMAC algorithm when multiple are configured', async () => {
    const signer = new DefaultJwtSigner({
      algorithms: ['HS384', 'HS256'],
      issuer: 'tests',
      secret: 'secret',
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['HS384'],
      issuer: 'tests',
      secret: 'secret',
    });
    const token = await signer.signAccessToken({ sub: 'user-first-alg' });

    // Token must be signed with HS384 (first in list) — HS384-only verifier must accept it
    await expect(verifier.verifyAccessToken(token)).resolves.toMatchObject({
      subject: 'user-first-alg',
    });
  });

  it('sign + verify roundtrip with RS256', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const signer = new DefaultJwtSigner({
      accessTokenTtlSeconds: 120,
      algorithms: ['RS256'],
      audience: 'konekti',
      issuer: 'tests',
      privateKey,
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['RS256'],
      audience: 'konekti',
      issuer: 'tests',
      publicKey,
    });
    const token = await signer.signAccessToken({ sub: 'user-rs256', scopes: ['read'] });

    await expect(verifier.verifyAccessToken(token)).resolves.toEqual(
      expect.objectContaining({
        scopes: ['read'],
        subject: 'user-rs256',
      }),
    );
  });

  it('sign + verify roundtrip with ES256', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const signer = new DefaultJwtSigner({
      accessTokenTtlSeconds: 120,
      algorithms: ['ES256'],
      audience: 'konekti',
      issuer: 'tests',
      privateKey,
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['ES256'],
      audience: 'konekti',
      issuer: 'tests',
      publicKey,
    });
    const token = await signer.signAccessToken({ sub: 'user-es256', scopes: ['write'] });

    await expect(verifier.verifyAccessToken(token)).resolves.toEqual(
      expect.objectContaining({
        scopes: ['write'],
        subject: 'user-es256',
      }),
    );
  });

  it('sign + verify roundtrip with RS256 using kid-keyed key entry', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const signer = new DefaultJwtSigner({
      algorithms: ['RS256'],
      issuer: 'tests',
      keys: [{ kid: 'key-1', privateKey, publicKey }],
    });
    const verifier = new DefaultJwtVerifier({
      algorithms: ['RS256'],
      issuer: 'tests',
      keys: [{ kid: 'key-1', publicKey }],
    });
    const token = await signer.signAccessToken({ sub: 'user-kid-rs256' });

    await expect(verifier.verifyAccessToken(token)).resolves.toMatchObject({
      subject: 'user-kid-rs256',
    });
  });
});
