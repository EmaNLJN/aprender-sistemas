import assert from 'node:assert/strict';
import { importModule } from './lib/sources.ts';

interface AtlasConcept {
  id: string;
  labId: string;
}
interface AtlasModule {
  atlasByLanguage: Record<string, AtlasConcept[]>;
}

const { atlasByLanguage } = await importModule<AtlasModule>('src/features/atlas/atlas-content.ts');

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
