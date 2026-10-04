// Valida content/ y escribe build/curriculum.json, que importan los adaptadores legacy.
// Lo corren `npm run typecheck` (y por eso build y test) y `npm run dev` antes de empezar.
// Uso: node tools/content/build-curriculum.ts [raíz]; sin argumento, la raíz del repositorio.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ContentError } from './content-error.ts';
import { loadCurriculum } from './load-curriculum.ts';

const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..', '..'));
try {
  const curriculum = loadCurriculum(root);
  mkdirSync(join(root, 'build'), { recursive: true });
  writeFileSync(join(root, 'build', 'curriculum.json'), JSON.stringify(curriculum, null, 2) + '\n');
} catch (error) {
  if (!(error instanceof ContentError)) throw error;
  console.error(`content/ no es válido: ${error.message}`);
  process.exitCode = 1;
}
