import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

export function generateServiceFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Service`;

  return [
    {
      content: `export class ${pascal} {
  get${toPascalCase(name)}() {
    return { ok: true };
  }
}
`,
      path: `${kebab}.service.ts`,
    },
    {
      content: `import { describe, expect, it } from 'vitest';

import { ${pascal} } from './${kebab}.service';

describe('${pascal}', () => {
  it('returns the default payload', () => {
    expect(new ${pascal}().get${toPascalCase(name)}()).toEqual({ ok: true });
  });
});
`,
      path: `${kebab}.service.test.ts`,
    },
  ];
}
