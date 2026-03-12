import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

export function generateControllerFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Controller`;

  return [
    {
      content: `import { Controller, Get } from '@konekti/http';

@Controller('/${kebab}')
class ${pascal} {
  @Get('/')
  get${toPascalCase(name)}() {
    return { ok: true };
  }
}

export { ${pascal} };
`,
      path: `${kebab}.controller.ts`,
    },
    {
      content: `import { describe, expect, it } from 'vitest';

import { ${pascal} } from './${kebab}.controller';

describe('${pascal}', () => {
  it('returns the default payload', () => {
    expect(new ${pascal}().get${toPascalCase(name)}()).toEqual({ ok: true });
  });
});
`,
      path: `${kebab}.controller.test.ts`,
    },
  ];
}
