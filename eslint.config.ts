import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.venv/**',
    // Imported skills keep their upstream code; .claude/skills only links to them.
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.desloppify/**',
    'dist/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    // Official React rules, including the compiler-powered purity, refs and effect checks.
    ...reactHooks.configs.flat.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    // Legacy browser scripts still publish window.Taller* globals as classic scripts.
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
    files: ['qa/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      complexity: ['warn', { max: 10, variant: 'classic' }],
    },
  },
]);
