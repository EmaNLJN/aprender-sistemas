import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.venv/**',
    '.agents/**',
    '.codex/**',
    '.desloppify/**',
    '**/*.bundle.js',
    'index.html',
    'dist/**',
    'build/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['*-source.js'],
    languageOptions: { sourceType: 'module' },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      complexity: ['warn', { max: 10, variant: 'classic' }],
    },
  },
]);
