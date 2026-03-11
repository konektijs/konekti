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
  ];
}
