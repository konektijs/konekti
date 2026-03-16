import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GenerateOptions, GeneratedFile, GeneratorKind } from '../types.js';

import { generateControllerFiles } from '../generators/controller.js';
import { generateDtoFiles } from '../generators/dto.js';
import { generateModuleFiles, registerInModule } from '../generators/module.js';
import { generateRepoFiles } from '../generators/repo.js';
import { generateServiceFiles } from '../generators/service.js';
import { toKebabCase, toPascalCase } from '../generators/utils.js';

function generateFiles(kind: GeneratorKind, name: string, options: GenerateOptions = {}): GeneratedFile[] {
  switch (kind) {
    case 'controller':
      return generateControllerFiles(name);
    case 'dto':
      return generateDtoFiles(name);
    case 'module':
      return generateModuleFiles(name);
    case 'repo':
      return generateRepoFiles(name, options);
    case 'service':
      return generateServiceFiles(name, options);
    default:
      return [];
  }
}

function moduleArrayKey(kind: GeneratorKind): 'controllers' | 'providers' | null {
  if (kind === 'controller') return 'controllers';
  if (kind === 'service' || kind === 'repo') return 'providers';
  return null;
}

function classNameForKind(name: string, kind: GeneratorKind): string {
  const resource = toPascalCase(name);
  if (kind === 'controller') return `${resource}Controller`;
  if (kind === 'service') return `${resource}Service`;
  if (kind === 'repo') return `${resource}Repo`;
  return resource;
}

function ensureModuleFile(domainDirectory: string, name: string): string {
  const kebab = toKebabCase(name);
  const modulePath = join(domainDirectory, `${kebab}.module.ts`);

  if (!existsSync(modulePath)) {
    const [moduleFile] = generateModuleFiles(name);
    if (moduleFile) {
      mkdirSync(domainDirectory, { recursive: true });
      writeFileSync(modulePath, moduleFile.content, 'utf8');
    }
  }

  return modulePath;
}

function updateModuleFile(modulePath: string, arrayKey: 'controllers' | 'providers', className: string, importPath: string): void {
  let source = readFileSync(modulePath, 'utf8');

  const alreadyImported = new RegExp(`\\b${className}\\b`).test(source);
  if (!alreadyImported) {
    const lastImportMatch = [...source.matchAll(/^import .+;$/gm)].at(-1);
    const importLine = `import { ${className} } from './${importPath}';\n`;
    if (lastImportMatch?.index !== undefined) {
      const insertAt = lastImportMatch.index + lastImportMatch[0].length;
      source = source.slice(0, insertAt) + '\n' + importLine + source.slice(insertAt);
    } else {
      source = importLine + source;
    }
  }

  source = registerInModule(source, arrayKey, className);
  writeFileSync(modulePath, source, 'utf8');
}

export function runGenerateCommand(kind: GeneratorKind, name: string, baseDirectory: string, options: GenerateOptions = {}): string[] {
  const kebab = toKebabCase(name);
  const domainDirectory = join(baseDirectory, `${kebab}s`);

  mkdirSync(domainDirectory, { recursive: true });

  const files = generateFiles(kind, name, options);

  const writtenPaths = files.map((file) => {
    const filePath = join(domainDirectory, file.path);
    writeFileSync(filePath, file.content, 'utf8');
    return filePath;
  });

  const arrayKey = moduleArrayKey(kind);
  if (arrayKey !== null) {
    const modulePath = ensureModuleFile(domainDirectory, name);
    const className = classNameForKind(name, kind);
    const importPath = `${kebab}.${kind}`;
    updateModuleFile(modulePath, arrayKey, className, importPath);

    if (!writtenPaths.includes(modulePath)) {
      writtenPaths.push(modulePath);
    }
  }

  return writtenPaths;
}
