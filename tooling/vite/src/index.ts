import { fileURLToPath } from 'node:url';

import { createFluoBabelDecoratorsPlugin } from '../../../packages/testing/src/babel-decorators-plugin.js';

const BABEL_CONFIG_FILE = fileURLToPath(new URL('../../babel/babel.config.cjs', import.meta.url));

export function fluoBabelDecoratorsPlugin() {
  return createFluoBabelDecoratorsPlugin(() => BABEL_CONFIG_FILE);
}
