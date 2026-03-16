import { configDefaults, defineConfig } from 'vitest/config';

import { konektiBabelDecoratorsPlugin } from './tooling/vite/src';

export default defineConfig({
  plugins: [konektiBabelDecoratorsPlugin()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'packages',
          exclude: [...configDefaults.exclude, 'packages/cli/.sandbox/**'],
          include: ['packages/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'apps',
          exclude: configDefaults.exclude,
          include: ['apps/**/*.test.ts'],
        },
      },
    ],
    environment: 'node',
  },
});
