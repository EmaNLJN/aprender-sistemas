/* Contrato de IDs del currículo: ejercicios, mundos, talleres y conceptos del atlas.
 * node qa/curriculum-ids-check.ts
 *
 * Los IDs indexan el progreso guardado en localStorage (docs/architecture.md los
 * declara contrato). qa/fixtures/curriculum-ids.json es ese contrato: cambiar un ID
 * exige migrar el progreso guardado y actualizar el fixture a mano. Nunca se
 * regenera para que este check pase.
 *
 * Vínculo taller-núcleo: la app no calcula posiciones. Cada taller declara
 * `code: { rust, go }` con los IDs de sus ejercicios núcleo y los consume así:
 * systems-engine.js requireCore() resuelve `workshop.code[language]` contra el
 * catálogo de ejercicios, y systems.js usa `workshop.code[lang]` para elegir el
 * núcleo ejecutable y marcar "Núcleo del taller". Este check lee ese mismo campo.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { importModule, repoRoot, runSource } from './lib/sources.ts';
import { plainJson } from './lib/plain-json.ts';

type Language = 'rust' | 'go';
type Table = Record<string, unknown>;

interface Fixture {
  exercises: Table;
  worlds: Table;
  workshops: Table;
  atlas: Table;
}

interface ExerciseSource {
  id: string;
  language: Language;
  title: string;
}
interface WorldSource {
  id: string;
  trainingIds: string[];
  challengeIds: string[];
  bossId: string;
}
interface WorkshopSource {
  id: string;
  model: string;
  code: Record<Language, string>;
}
interface AtlasConcept {
  id: string;
  labId: string;
}
interface AtlasModule {
  atlasByLanguage: Record<Language, AtlasConcept[]>;
}
interface CatalogWindow {
  [name: string]: unknown;
}

const LOAD_ORDER = [
  'content',
  'lab-rust',
  'lab-go',
  'quests-rust',
  'quests-go',
  'systems-lowlevel',
  'systems-lowlevel-labs',
  'systems-infra',
  'systems-infra-labs',
  'systems-play',
  'systems-play-labs',
  'systems-pc',
  'systems-pc-labs',
  'campaign-rust',
  'campaign-go',
];
const EXERCISE_CATALOGS = [
  'RUST_LAB',
  'GO_LAB',
  'RUST_QUESTS',
  'GO_QUESTS',
  'SYSTEMS_LOWLEVEL_LABS',
  'SYSTEMS_INFRA_LABS',
  'SYSTEMS_PLAY_LABS',
  'SYSTEMS_PC_LABS',
];
const CAMPAIGNS: [string, Language][] = [
  ['RUST_CAMPAIGN', 'rust'],
  ['GO_CAMPAIGN', 'go'],
];
const WORKSHOP_CATALOGS = ['SYSTEMS_LOWLEVEL', 'SYSTEMS_INFRA', 'SYSTEMS_PLAY', 'SYSTEMS_PC'];

function loadWindow(): CatalogWindow {
  const fakeWindow: CatalogWindow = {};
  const context = vm.createContext({ window: fakeWindow });
  for (const name of LOAD_ORDER) runSource(context, `${name}.js`);
  return fakeWindow;
}

function list<T>(win: CatalogWindow, name: string): T[] {
  const value = win[name];
  assert.ok(Array.isArray(value), `window.${name} debe ser una lista`);
  return plainJson(value) as T[];
}

function collectExercises(win: CatalogWindow): Table {
  const result: Table = {};
  for (const catalog of EXERCISE_CATALOGS) {
    for (const exercise of list<ExerciseSource>(win, catalog)) {
      assert.ok(!(exercise.id in result), `ID de ejercicio duplicado: ${exercise.id}`);
      result[exercise.id] = { language: exercise.language, title: exercise.title };
    }
  }
  return result;
}

function collectWorlds(win: CatalogWindow): Table {
  const result: Table = {};
  for (const [catalog, language] of CAMPAIGNS) {
    for (const world of list<WorldSource>(win, catalog)) {
      result[world.id] = {
        language,
        trainingIds: world.trainingIds,
        challengeIds: world.challengeIds,
        bossId: world.bossId,
      };
    }
  }
  return result;
}

function collectWorkshops(win: CatalogWindow): Table {
  const result: Table = {};
  for (const catalog of WORKSHOP_CATALOGS) {
    const domain = plainJson(win[catalog]) as { workshops: WorkshopSource[] };
    for (const workshop of domain.workshops) {
      result[workshop.id] = {
        model: workshop.model,
        cores: { rust: workshop.code.rust, go: workshop.code.go },
      };
    }
  }
  return result;
}

async function collectAtlas(): Promise<Table> {
  const atlas = await importModule<AtlasModule>('src/features/atlas/atlas-content.ts');
  const result: Table = {};
  for (const language of ['rust', 'go'] as const) {
    for (const concept of atlas.atlasByLanguage[language]) {
      result[concept.id] = { language, labId: concept.labId };
    }
  }
  return result;
}

function diffEntry(section: string, id: string, expected: unknown, actual: unknown): string[] {
  if (expected === undefined) return [`${section}: ID nuevo no declarado en el fixture: ${id}`];
  if (actual === undefined) return [`${section}: falta el ID ${id} que declara el fixture`];
  const wanted = expected as Record<string, unknown>;
  const found = actual as Record<string, unknown>;
  const fields = new Set([...Object.keys(wanted), ...Object.keys(found)]);
  const changes: string[] = [];
  for (const field of fields) {
    if (JSON.stringify(wanted[field]) === JSON.stringify(found[field])) continue;
    changes.push(
      `${section}: ${id}.${field} cambió: esperado ${JSON.stringify(wanted[field])}, actual ${JSON.stringify(found[field])}`,
    );
  }
  return changes;
}

function compareSection(section: string, expected: Table, actual: Table): string[] {
  const ids = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  return [...ids].flatMap((id) => diffEntry(section, id, expected[id], actual[id]));
}

function compareCurriculum(fixture: Fixture, actual: Fixture): string[] {
  return [
    ...compareSection('exercises', fixture.exercises, actual.exercises),
    ...compareSection('worlds', fixture.worlds, actual.worlds),
    ...compareSection('workshops', fixture.workshops, actual.workshops),
    ...compareSection('atlas', fixture.atlas, actual.atlas),
  ];
}

const fixturePath = path.join(repoRoot, 'qa', 'fixtures', 'curriculum-ids.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Fixture;
const win = loadWindow();
const actual: Fixture = {
  exercises: collectExercises(win),
  worlds: collectWorlds(win),
  workshops: collectWorkshops(win),
  atlas: await collectAtlas(),
};

const differences = compareCurriculum(fixture, actual);
assert.deepEqual(differences, [], `El currículo difiere del contrato:\n${differences.join('\n')}`);
console.log(
  `curriculum-ids-check OK: ${Object.keys(actual.exercises).length} ejercicios, ` +
    `${Object.keys(actual.worlds).length} mundos, ${Object.keys(actual.workshops).length} talleres, ` +
    `${Object.keys(actual.atlas).length} conceptos del atlas.`,
);
