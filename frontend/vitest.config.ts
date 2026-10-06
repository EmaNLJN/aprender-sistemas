import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Vite's root is frontend/src: without this the cache would land in frontend/src/node_modules.
    cacheDir: resolve(import.meta.dirname, '../node_modules/.vite'),
    test: {
      name: 'node',
      environment: 'node',
      include: ['**/*.spec.ts'],
    },
  }),
);
