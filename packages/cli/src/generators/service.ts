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
  ];
}
