import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  FLUO_VITEST_SHUTDOWN_DEBUG_DIR_ENV,
  FLUO_VITEST_SHUTDOWN_DEBUG_ENV,
  isFluoVitestShutdownDebugEnabled,
  resolveFluoVitestShutdownDebugDirectory,
  writeVitestShutdownDebugSnapshot,
} from './shutdown-debug.js';

describe('shutdown debug helpers', () => {
  it('treats the attribution path as opt-in', () => {
    expect(isFluoVitestShutdownDebugEnabled({ [FLUO_VITEST_SHUTDOWN_DEBUG_ENV]: '1' })).toBe(true);
    expect(isFluoVitestShutdownDebugEnabled({ [FLUO_VITEST_SHUTDOWN_DEBUG_ENV]: 'true' })).toBe(true);
    expect(isFluoVitestShutdownDebugEnabled({ [FLUO_VITEST_SHUTDOWN_DEBUG_ENV]: '0' })).toBe(false);
    expect(isFluoVitestShutdownDebugEnabled({})).toBe(false);
  });

  it('resolves the debug directory from the environment when present', () => {
    expect(
      resolveFluoVitestShutdownDebugDirectory('/repo/root', {
        [FLUO_VITEST_SHUTDOWN_DEBUG_DIR_ENV]: 'custom/debug-dir',
      }),
    ).toBe('custom/debug-dir');
  });

  it('writes structured current-run evidence snapshots', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'fluo-vitest-shutdown-debug-'));
    const filePath = writeVitestShutdownDebugSnapshot(
      repoRoot,
      'run-end',
      {
        kind: 'run-end',
        reason: 'failed',
      },
      {},
    );

    const written = JSON.parse(readFileSync(filePath, 'utf8')) as {
      kind: string;
      reason: string;
      schemaVersion: number;
    };

    expect(written).toEqual({
      kind: 'run-end',
      reason: 'failed',
      schemaVersion: 1,
    });
  });
});
