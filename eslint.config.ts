import eslintReact from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
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
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ['frontend/src/**/*.{ts,tsx}'],
  },
  {
    ...eslintReact.configs['recommended-typescript'],
    files: ['frontend/src/**/*.{ts,tsx}'],
  },
  {
    ...jsxA11y.configs.recommended,
    files: ['frontend/src/**/*.tsx'],
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y-x/no-noninteractive-tabindex': [
        'error',
        { tags: ['pre'], roles: ['tabpanel'], allowExpressionValues: true },
      ],
    },
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
