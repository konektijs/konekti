import { defineConfig } from 'vitest/config';

import { konektiBabelDecoratorsPlugin } from './tooling/vite/src';

export default defineConfig({
  plugins: [konektiBabelDecoratorsPlugin()],
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts'],
  },
});
