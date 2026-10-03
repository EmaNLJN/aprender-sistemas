import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

// Node no ejecuta TypeScript directamente; transpilar este módulo puro permite
// validar el mismo catálogo fuente sin generar artefactos ni cargar Vite.
const source = await readFile(
  new URL('../src/features/atlas/atlas-content.ts', import.meta.url),
  'utf8',
);
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`;
const { atlasByLanguage } = await import(moduleUrl);

for (const language of ['rust', 'go']) {
  const concepts = atlasByLanguage[language];
  assert.equal(concepts.length, 16, `Atlas ${language}: se esperan 16 conceptos`);
  assert.equal(
    new Set(concepts.map((concept) => concept.id)).size,
    16,
    `Atlas ${language}: IDs únicos`,
  );
  assert(
    concepts.every((concept) => concept.labId.startsWith(`${language}-`)),
    `Atlas ${language}: ejercicios relacionados`,
  );
}

console.log('Atlas: 16 conceptos únicos por lenguaje y enlaces al laboratorio. PASS');
