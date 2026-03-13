import type { GeneratedFile } from '../types.js';

import { toKebabCase, toPascalCase } from './utils.js';

export function generateDtoFiles(name: string): GeneratedFile[] {
  const kebab = toKebabCase(name);
  const pascal = `${toPascalCase(name)}Dto`;

  return [
    {
      content: `export class ${pascal} {
  ok!: boolean;
}
`,
      path: `${kebab}.dto.ts`,
    },
  ];
}
