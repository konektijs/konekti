import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

export function generateModuleFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Module`;

  return [
    {
      content: `import { Module } from '@konekti/core';

@Module({})
class ${pascal} {}

export { ${pascal} };
`,
      path: `${kebab}.module.ts`,
    },
  ];
}
