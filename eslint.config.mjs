import js from '@eslint/js';
import globals from 'globals';
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
  {
    files: ['*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['*-source.js'],
    languageOptions: { sourceType: 'module' },
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      complexity: ['warn', { max: 10, variant: 'classic' }],
    },
  },
]);
