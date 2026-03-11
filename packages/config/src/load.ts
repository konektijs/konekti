import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KonektiError } from '@konekti/core';

import type { ConfigDictionary, ConfigLoadOptions } from './types';

function parseEnvFile(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    parsed[key] = value;
  }

  return parsed;
}

/**
 * Loads and validates configuration using the configured precedence order.
 */
export function loadConfig(options: ConfigLoadOptions): ConfigDictionary {
  const cwd = options.cwd ?? process.cwd();
  const envFile = options.envFile ?? join(cwd, `.env.${options.mode}`);
  const defaults = options.defaults ?? {};
  const processEnv = options.processEnv ?? process.env;
  const runtimeOverrides = options.runtimeOverrides ?? {};

  const envFileValues = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : {};

  // Precedence is total and deterministic: defaults < env file < process env < runtime overrides.
  const merged: ConfigDictionary = {
    ...defaults,
    ...envFileValues,
    ...processEnv,
    ...runtimeOverrides,
  };

  try {
    return options.validate ? options.validate(merged) : merged;
  } catch (error) {
    throw new KonektiError('Invalid configuration.', {
      code: 'INVALID_CONFIG',
      cause: error,
    });
  }
}
