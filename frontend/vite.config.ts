import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const reactLicense = readFileSync(
  resolve(import.meta.dirname, '../node_modules/react/LICENSE'),
  'utf8',
);
const reactLicenseBanner = `/*! React, ReactDOM and Scheduler\n${reactLicense.trim()}\n*/`;

const buildDirectory = resolve(import.meta.dirname, '../build');
const NOTICES = ['EDITOR-LICENSES.txt', 'THIRD-PARTY-NOTICES.txt'];

function readCurriculum(): { bytes: Buffer; fileName: string; version: string } {
  const bytes = readFileSync(resolve(buildDirectory, 'curriculum.json'));
  const { documentHash } = JSON.parse(
    readFileSync(resolve(buildDirectory, 'curriculum.meta.json'), 'utf8'),
  ) as { documentHash: string };
  if (createHash('sha256').update(bytes).digest('hex') !== documentHash) {
    throw new Error(
      'build/curriculum.meta.json no describe a build/curriculum.json: corré npm run curriculum.',
    );
  }
  const version = documentHash.slice(0, 32);
  return { bytes, fileName: `content/curriculum.${version}.json`, version };
}

function webRootFiles(): Plugin {
  return {
    name: 'taller-web-root-files',
    config: () => ({ define: { __CONTENT_VERSION__: JSON.stringify(readCurriculum().version) } }),
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const { bytes, fileName } = readCurriculum();
        if (request.url?.split('?')[0] !== `/${fileName}`) return next();
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(bytes);
      });
    },
    generateBundle() {
      const { bytes, fileName } = readCurriculum();
      this.emitFile({ type: 'asset', fileName, source: bytes });
      for (const notice of NOTICES) {
        const source = readFileSync(resolve(import.meta.dirname, notice));
        this.emitFile({ type: 'asset', fileName: notice, source });
      }
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  publicDir: false,
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), webRootFiles()],
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
