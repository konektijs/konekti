import { defineConfig } from 'vitest/config';

import { konektiBabelDecoratorsPlugin } from './tooling/vite/src';

export default defineConfig({
  plugins: [konektiBabelDecoratorsPlugin()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'packages',
          include: ['packages/**/*.test.ts'],
          exclude: ['packages/cli/.sandbox/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'apps',
          include: ['apps/**/*.test.ts'],
        },
      },
    ],
    environment: 'node',
  },
});
