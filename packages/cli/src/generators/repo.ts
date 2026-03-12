import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

export function generateRepoFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Repo`;

  return [
    {
      content: `export class ${pascal} {
  find${toPascalCase(name)}() {
    return { ok: true };
  }
}
`,
      path: `${kebab}.repo.ts`,
    },
    {
      content: `import { describe, expect, it } from 'vitest';

import { ${pascal} } from './${kebab}.repo';

describe('${pascal}', () => {
  it('returns the default payload', () => {
    expect(new ${pascal}().find${toPascalCase(name)}()).toEqual({ ok: true });
  });
});
`,
      path: `${kebab}.repo.test.ts`,
    },
  ];
}
