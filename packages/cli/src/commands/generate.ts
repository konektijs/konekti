import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GeneratedFile, GeneratorKind } from '../types';

import { generateControllerFiles } from '../generators/controller';
import { generateDtoFiles } from '../generators/dto';
import { generateModuleFiles } from '../generators/module';
import { generateRepoFiles } from '../generators/repo';
import { generateServiceFiles } from '../generators/service';

function generateFiles(kind: GeneratorKind, name: string): GeneratedFile[] {
  switch (kind) {
    case 'controller':
      return generateControllerFiles(name);
    case 'dto':
      return generateDtoFiles(name);
    case 'module':
      return generateModuleFiles(name);
    case 'repo':
      return generateRepoFiles(name);
    case 'service':
      return generateServiceFiles(name);
    default:
      return [];
  }
}

export function runGenerateCommand(kind: GeneratorKind, name: string, targetDirectory: string): string[] {
  const files = generateFiles(kind, name);

  mkdirSync(targetDirectory, { recursive: true });

  return files.map((file) => {
    const filePath = join(targetDirectory, file.path);
    writeFileSync(filePath, file.content, 'utf8');
    return filePath;
  });
}
