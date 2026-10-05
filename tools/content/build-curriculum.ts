// Valida content/ y escribe build/curriculum.json, que importan los adaptadores legacy.
// Lo corren `npm run typecheck` (y por eso build y test) y `npm run dev` antes de empezar.
// Uso: node tools/content/build-curriculum.ts [raíz]; sin argumento, la raíz del repositorio.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ContentError } from './content-error.ts';
import { loadCurriculumSource } from './load-curriculum.ts';
import { curriculumMeta, sourceCommitFrom } from './meta.ts';

function writeAtomically(output: string, text: string): void {
  const temporary = `${output}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, output);
}

const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..', '..'));
try {
  const { curriculum, workshopSteps } = loadCurriculumSource(root);
  const sourceCommit = sourceCommitFrom(process.env);
  const document = JSON.stringify(curriculum, null, 2) + '\n';
  mkdirSync(join(root, 'build'), { recursive: true });
  // Document first, meta second: a crash in between leaves a stale meta that content:import
  // rejects by documentHash (FR-039).
  writeAtomically(join(root, 'build', 'curriculum.json'), document);
  const meta = curriculumMeta(curriculum, document, sourceCommit, workshopSteps);
  writeAtomically(
    join(root, 'build', 'curriculum.meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );
} catch (error) {
  if (!(error instanceof ContentError)) throw error;
  console.error(`content/ no es válido: ${error.message}`);
  process.exitCode = 1;
}
