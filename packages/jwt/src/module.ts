import type { Provider } from '@konekti-internal/di';

import type { JwtVerifierOptions } from './types';
import { DefaultJwtSigner } from './signer';
import { DefaultJwtVerifier, JWT_OPTIONS } from './verifier';

export function createJwtCoreProviders(options: JwtVerifierOptions): Provider[] {
  return [
    {
      provide: JWT_OPTIONS,
      useValue: options,
    },
    DefaultJwtVerifier,
    DefaultJwtSigner,
  ];
}
