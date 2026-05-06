import { describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';

import { fluoDecoratorsPlugin } from './index.js';

function runTransform(plugin: Plugin, code: string, id: string): unknown {
  if (typeof plugin.transform !== 'function') {
    throw new Error('Expected fluoDecoratorsPlugin to expose a callable transform hook.');
  }

  return Reflect.apply(plugin.transform, {}, [code, id]);
}

describe('fluoDecoratorsPlugin', () => {
  it('skips generated test files', async () => {
    const plugin = fluoDecoratorsPlugin();

    await expect(runTransform(plugin, 'export const value: number = 1;', '/app/src/app.test.ts')).resolves.toBeNull();
  });

  it('keeps the Vite transform boundary on application TypeScript files', async () => {
    const plugin = fluoDecoratorsPlugin();

    await expect(runTransform(plugin, 'export const value: number = 1;', '/app/src/app.spec.ts')).resolves.toBeNull();
    await expect(runTransform(plugin, 'export const value: number = 1;', '/app/src/types.d.ts')).resolves.toBeNull();
    await expect(
      runTransform(plugin, 'export const value: number = 1;', '/app/node_modules/dependency/index.ts'),
    ).resolves.toBeNull();
    await expect(runTransform(plugin, 'export const value: number = 1;', '/app/src/component.tsx')).resolves.toBeNull();
  });

  it('transforms TypeScript files with standard decorators through Babel', async () => {
    const plugin = fluoDecoratorsPlugin();
    const result = await runTransform(
      plugin,
      `function logged(value: unknown, context: ClassMethodDecoratorContext) {
  context.name;
}

class Example {
  @logged
  greet(): string {
    return 'hello';
  }
}

export { Example };
`,
      '/app/src/example.ts',
    );

    expect(result).toEqual(expect.objectContaining({ code: expect.any(String) }));
    expect(result && typeof result === 'object' && 'code' in result ? result.code : '').not.toContain(': string');
  });
});
