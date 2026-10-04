// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import { loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';

export interface Curriculum {
  lab: { rust: JsonRecord[] };
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  return {
    lab: { rust: rust.lab },
  };
}
