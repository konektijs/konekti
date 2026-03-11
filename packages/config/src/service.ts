import { KonektiError } from '@konekti/core';

import type { ConfigDictionary } from './types';

/**
 * Minimal typed accessor over normalized configuration values.
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

  /**
   * Returns a shallow copy of the normalized config state.
   */
  snapshot(): ConfigDictionary {
    return { ...this.values };
  }
}
