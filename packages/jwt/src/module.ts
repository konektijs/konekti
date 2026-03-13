import type { Provider } from '@konekti/di';

import type { JwtVerifierOptions } from './types.js';
import { DefaultJwtSigner } from './signer.js';
import { DefaultJwtVerifier, JWT_OPTIONS } from './verifier.js';

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
