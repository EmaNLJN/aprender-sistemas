import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.venv/**',
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.desloppify/**',
    'dist/**',
    'backend/api/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    ...reactHooks.configs.flat.recommended,
    files: ['frontend/src/**/*.{ts,tsx}'],
  },
  {
    files: ['frontend/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.browser },
  },
  {
    files: ['frontend/src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
  },
  {
    files: ['qa/**/*.ts', 'tools/**/*.ts', '*.config.ts', 'frontend/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      complexity: ['warn', { max: 10, variant: 'classic' }],
    },
  },
]);
