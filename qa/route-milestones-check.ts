import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importModule } from './lib/sources.ts';

interface MilestoneCatalog {
  MILESTONE_LANGUAGES: readonly string[];
  PROJECT_MILESTONES: readonly { suffix: string }[];
}

const root = join(import.meta.dirname, '..');
const catalog = await importModule<MilestoneCatalog>(
  'frontend/src/entities/guide/model/project-milestones.ts',
);
const { MILESTONE_IDS } = await importModule<{ MILESTONE_IDS: readonly string[] }>(
  'frontend/src/entities/guide/model/milestone-ids.ts',
);

const fromCatalog = catalog.MILESTONE_LANGUAGES.flatMap((language) =>
  catalog.PROJECT_MILESTONES.map((milestone) => `${language}-${milestone.suffix}`),
);
const shared = JSON.parse(
  readFileSync(join(root, 'qa', 'fixtures', 'shared', 'route-milestones.json'), 'utf8'),
) as string[];

assert.deepEqual(
  shared,
  fromCatalog,
  'route-milestones.json no coincide con el catálogo de hitos de entities/guide',
);
assert.deepEqual(
  shared,
  [...MILESTONE_IDS],
  'route-milestones.json no coincide con MILESTONE_IDS de entities/guide',
);
console.log(`route-milestones-check: ${shared.length} hitos PASS.`);
