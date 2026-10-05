import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const reactLicense = readFileSync(
  resolve(import.meta.dirname, '../node_modules/react/LICENSE'),
  'utf8',
);
const reactLicenseBanner = `/*! React, ReactDOM and Scheduler\n${reactLicense.trim()}\n*/`;

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  publicDir: false,
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: resolve(import.meta.dirname, '../dist'),
    emptyOutDir: true,
    target: 'es2020',
    minify: true,
    rolldownOptions: {
      output: {
        banner: reactLicenseBanner,
        comments: { legal: true },
      },
    },
  },
});
