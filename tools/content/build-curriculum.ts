// Valida content/ y escribe build/curriculum.json, que importan los adaptadores legacy.
// Lo corren `npm run typecheck` (y por eso build y test) y `npm run dev` antes de empezar.
// Uso: node tools/content/build-curriculum.ts [raíz]; sin argumento, la raíz del repositorio.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ContentError } from './content-error.ts';
import { loadCurriculum } from './load-curriculum.ts';

const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..', '..'));
try {
  const curriculum = loadCurriculum(root);
  mkdirSync(join(root, 'build'), { recursive: true });
  // Se escribe a un temporal y se renombra: dos procesos a la vez (dos auditorías, o una con
  // `npm test`) nunca leen un archivo a medio escribir; rename reemplaza de forma atómica.
  const output = join(root, 'build', 'curriculum.json');
  const temporary = `${output}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(curriculum, null, 2) + '\n');
  renameSync(temporary, output);
} catch (error) {
  if (!(error instanceof ContentError)) throw error;
  console.error(`content/ no es válido: ${error.message}`);
  process.exitCode = 1;
}
