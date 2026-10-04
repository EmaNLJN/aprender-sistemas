// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import type { Language } from './catalogs.ts';
import { expectDistinctIds, loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
  };
}
