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
  ];
}
