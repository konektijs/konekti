import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveWorkspaceBuildOrder } from './run-workspace-build-closure.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function expectBefore(order: string[], earlier: string, later: string) {
  expect(order).toContain(earlier);
  expect(order).toContain(later);
  expect(order.indexOf(earlier)).toBeLessThan(order.indexOf(later));
}

describe('resolveWorkspaceBuildOrder', () => {
  it('orders @fluojs/studio behind its declaration-producing dependencies', () => {
    const order = resolveWorkspaceBuildOrder('@fluojs/studio', repoRoot);

    expectBefore(order, '@fluojs/core', '@fluojs/di');
    expectBefore(order, '@fluojs/di', '@fluojs/http');
    expectBefore(order, '@fluojs/http', '@fluojs/runtime');
    expectBefore(order, '@fluojs/runtime', '@fluojs/studio');
  });

  it('orders @fluojs/testing behind runtime/http/di/core', () => {
    const order = resolveWorkspaceBuildOrder('@fluojs/testing', repoRoot);

    expectBefore(order, '@fluojs/core', '@fluojs/di');
    expectBefore(order, '@fluojs/di', '@fluojs/http');
    expectBefore(order, '@fluojs/http', '@fluojs/runtime');
    expectBefore(order, '@fluojs/runtime', '@fluojs/testing');
  });
});
