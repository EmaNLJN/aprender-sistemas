import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfigFromFile } from 'vite';
import { repoRoot } from './lib/sources.ts';

const loaded = await loadConfigFromFile(
  { command: 'serve', mode: 'development' },
  path.join(repoRoot, 'frontend', 'vite.config.ts'),
);
assert.ok(loaded, 'no se pudo leer frontend/vite.config.ts');
const stackPort = process.env.TALLER_PORT ?? '8080';
assert.deepEqual(loaded.config.server?.proxy, {
  '/api': { target: `http://127.0.0.1:${stackPort}`, changeOrigin: false },
});
assert.deepEqual(
  loaded.config.preview?.proxy,
  {},
  'vite preview hereda server.proxy si no se lo vacía: los E2E pegarían contra el stack',
);
console.log('vite-proxy-check OK: npm run dev pasa /api/ al stack y vite preview no.');
