import type { GeneratedFile } from '../types';

import { toKebabCase, toPascalCase } from './utils';

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
