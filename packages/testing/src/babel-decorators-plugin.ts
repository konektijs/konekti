import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { transformAsync } from '@babel/core';

const babelConfigFileCache = new Map<string, string>();

/**
 * Resolves the nearest `babel.config.cjs` file starting from the given file path
 * and searching upwards through the directory hierarchy.
 *
 * @param filePath - The path to the file whose nearest Babel configuration should be found.
 * @returns The absolute path to the nearest `babel.config.cjs` file.
 * @throws Error if no configuration file can be located.
 */
export function resolveNearestBabelConfigFile(filePath: string): string {
  let currentDirectory = dirname(filePath);

  while (true) {
    const cachedConfigFile = babelConfigFileCache.get(currentDirectory);

    if (cachedConfigFile) {
      return cachedConfigFile;
    }

    const configFile = join(currentDirectory, 'babel.config.cjs');

    if (existsSync(configFile)) {
      babelConfigFileCache.set(currentDirectory, configFile);
      return configFile;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      throw new Error(`Unable to locate babel.config.cjs for ${filePath}.`);
    }

    currentDirectory = parentDirectory;
  }
}

/**
 * Creates a Babel transformation plugin that handles fluo decorator syntax
 * during the testing process.
 *
 * @param resolveConfigFile - A function that resolves the Babel configuration file path for a given file.
 * @returns A transformation plugin compatible with testing tools like Vitest.
 */
export function createFluoBabelDecoratorsPlugin(
  resolveConfigFile: (filePath: string) => string,
){
  return {
    name: 'fluo-babel-decorators',
    async transform(code: string, id: string) {
      if (!id.endsWith('.ts') || id.includes('/node_modules/')) {
        return null;
      }

      const result = await transformAsync(code, {
        babelrc: false,
        configFile: resolveConfigFile(id),
        filename: id,
        sourceMaps: true,
      });

      if (!result?.code) {
        return null;
      }

      return {
        code: result.code,
        map: result.map ?? null,
      };
    },
  };
}

/**
 * Re-export type for the fluo Babel decorators plugin.
 */
export type FluoBabelDecoratorsPlugin = ReturnType<typeof createFluoBabelDecoratorsPlugin>;
