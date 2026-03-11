import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { loadConfig } from './load';
import { ConfigService } from './service';

describe('loadConfig', () => {
  it('merges defaults, env file, process env, and runtime overrides in order', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'konekti-config-'));
    const envPath = join(cwd, '.env.dev');

    writeFileSync(envPath, 'PORT=4000\nNAME=from-file\n');

    const loaded = loadConfig({
      cwd,
      defaults: { NAME: 'from-default', PORT: '3000' },
      mode: 'dev',
      processEnv: { NAME: 'from-process' },
      runtimeOverrides: { NAME: 'from-runtime' },
    });

    expect(loaded).toMatchObject({
      NAME: 'from-runtime',
      PORT: '4000',
    });
  });

  it('fails when validation rejects the merged config', () => {
    expect(() =>
      loadConfig({
        mode: 'test',
        validate: () => {
          throw new Error('PORT is required');
        },
      }),
    ).toThrow('Invalid configuration.');
  });
});

describe('ConfigService', () => {
  it('reads required and optional keys', () => {
    const service = new ConfigService({ PORT: '3000' });

    expect(service.get<string>('PORT')).toBe('3000');
    expect(service.getOptional<string>('MISSING')).toBeUndefined();
  });
});
