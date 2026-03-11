import { KonektiError } from '@konekti/core';

import type { ConfigDictionary } from './types';

/**
 * 정규화된 설정 값을 읽기 위한 최소한의 typed accessor다.
 */
export class ConfigService {
  constructor(private readonly values: ConfigDictionary) {}

  get<T>(key: string): T {
    if (!(key in this.values)) {
      throw new KonektiError(`Missing config key: ${key}`, { code: 'CONFIG_KEY_MISSING' });
    }

    return this.values[key] as T;
  }

  getOptional<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }

  snapshot(): ConfigDictionary {
    return { ...this.values };
  }
}
