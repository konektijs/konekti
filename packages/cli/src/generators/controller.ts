import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

export function generateControllerFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Controller`;

  return [
    {
      content: `import { Controller, Get } from '@konekti/http';

class ${pascal} {
  get${toPascalCase(name)}() {
    return { ok: true };
  }
}

Controller('/${kebab}')(${pascal});
Get('/')( ${pascal}.prototype, 'get${toPascalCase(name)}');

export { ${pascal} };
`,
      path: `${kebab}.controller.ts`,
    },
  ];
}
