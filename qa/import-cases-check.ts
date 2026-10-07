import assert from 'node:assert/strict';
import {
  SECTIONS,
  countWritten,
  normalizeWithParsers,
  rawOfFixture,
  readImportCases,
  sectionsOfRaw,
} from './lib/import-cases.ts';
import { importModule } from './lib/sources.ts';

const { isLosslessNormalization } = await importModule<{
  isLosslessNormalization: (original: unknown, normalized: unknown) => boolean;
}>('frontend/src/shared/lib/is-lossless-normalization.ts');

const fixture = readImportCases();

assert.deepEqual(
  fixture.cases.map((item) => [item.id, item.source, item.fixture]),
  [
    ['master-2a278ad-storage', 'storage', 'qa/fixtures/progress-master-2a278ad-storage.json'],
    ['master-2a278ad-export', 'export', 'qa/fixtures/progress-master-2a278ad-export.json'],
    ['d0e1b49-export', 'export', 'qa/fixtures/progress-d0e1b49-export.json'],
  ],
  'los casos del fixture no son los del contrato',
);

let sectionCount = 0;
for (const item of fixture.cases) {
  assert.equal(
    item.raw,
    rawOfFixture(item.source, item.fixture),
    `${item.id}: el crudo no es el de la fixture`,
  );

  const parsed = await normalizeWithParsers(item.source, item.raw);
  assert.deepEqual(
    item.normalized,
    parsed,
    `${item.id}: el normalizado no es la salida de los parsers`,
  );

  const rawSections = sectionsOfRaw(item.source, item.raw);
  for (const section of SECTIONS) {
    assert.ok(
      isLosslessNormalization(rawSections[section], item.normalized[section]),
      `${item.id}: la sección ${section} perdió datos al normalizarse`,
    );
    sectionCount++;
  }

  assert.deepEqual(
    countWritten(item.normalized),
    item.expect.written,
    `${item.id}: expect.written no coincide con lo que se cuenta del normalizado`,
  );
}

console.log(
  `import-cases-check: ${fixture.cases.length} casos, ${sectionCount} secciones sin pérdida y sus conteos PASS.`,
);
