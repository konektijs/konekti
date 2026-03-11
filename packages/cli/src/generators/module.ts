import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

export function generateModuleFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Module`;

  return [
    {
      content: `import { defineModule } from '@konekti-internal/module';

class ${pascal} {}

defineModule(${pascal}, {});

export { ${pascal} };
`,
      path: `${kebab}.module.ts`,
    },
  ];
}
