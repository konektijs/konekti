import {
  createFluoBabelDecoratorsPlugin,
  type FluoBabelDecoratorsPlugin,
  resolveNearestBabelConfigFile,
} from './babel-decorators-plugin.js';

/**
 * Creates a Vitest-compatible Babel plugin that enables fluo decorator support
 * using the nearest configuration file.
 *
 * @returns A {@link FluoBabelDecoratorsPlugin} instance.
 */
export function fluoBabelDecoratorsPlugin(): FluoBabelDecoratorsPlugin {
  return createFluoBabelDecoratorsPlugin(resolveNearestBabelConfigFile);
}
