/* IDs index saved progress: qa/fixtures/curriculum-ids.json is the contract and is never regenerated to make this check pass. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadCampaignWorlds, loadGuideContent, loadLabCatalogs } from './lib/legacy-sources.ts';
import { importModule, repoRoot } from './lib/sources.ts';
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
  objectives: { id: string }[];
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
  loadGuideContent(context);
  loadLabCatalogs(context);
  loadCampaignWorlds(context);
  return fakeWindow;
}

function list<T>(win: CatalogWindow, name: string): T[] {
  const value = win[name];
  assert.ok(Array.isArray(value), `window.${name} must be a list`);
  return plainJson(value) as T[];
}

function collectExercises(win: CatalogWindow): Table {
  const result: Table = {};
  for (const catalog of EXERCISE_CATALOGS) {
    for (const exercise of list<ExerciseSource>(win, catalog)) {
      assert.ok(!(exercise.id in result), `duplicate exercise ID: ${exercise.id}`);
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
        objectives: workshop.objectives.map((objective) => objective.id),
      };
    }
  }
  return result;
}

async function collectAtlas(): Promise<Table> {
  const atlas = await importModule<AtlasModule>('frontend/src/pages/atlas/model/atlas-catalog.ts');
  const result: Table = {};
  for (const language of ['rust', 'go'] as const) {
    for (const concept of atlas.atlasByLanguage[language]) {
      result[concept.id] = { language, labId: concept.labId };
    }
  }
  return result;
}

function fieldChangeMessage(
  section: string,
  id: string,
  field: string,
  wanted: unknown,
  found: unknown,
): string {
  const detail = `expected ${JSON.stringify(wanted)}, actual ${JSON.stringify(found)}`;
  if (field === 'title') return `${section}: ${id} title edited: ${detail}`;
  return `${section}: ${id}.${field} changed: ${detail}`;
}

function diffEntry(section: string, id: string, expected: unknown, actual: unknown): string[] {
  if (expected === undefined) return [`${section}: new ID not declared in the fixture: ${id}`];
  if (actual === undefined) return [`${section}: ID ${id} declared by the fixture is missing`];
  const wanted = expected as Record<string, unknown>;
  const found = actual as Record<string, unknown>;
  const fields = new Set([...Object.keys(wanted), ...Object.keys(found)]);
  const changes: string[] = [];
  for (const field of fields) {
    if (JSON.stringify(wanted[field]) === JSON.stringify(found[field])) continue;
    changes.push(fieldChangeMessage(section, id, field, wanted[field], found[field]));
  }
  return changes;
}

function fieldOf(entry: unknown, field: string): unknown {
  return (entry as Record<string, unknown> | undefined)?.[field];
}

// A title moved to another ID means an ID change, not a text edit: saved progress would point at the old ID.
// Rust and Go repeat titles, so the language disambiguates.
function findPreviousId(id: string, expected: Table, actual: Table): string | undefined {
  const title = fieldOf(actual[id], 'title');
  if (typeof title !== 'string' || fieldOf(expected[id], 'title') === title) return undefined;
  const language = fieldOf(actual[id], 'language');
  const owners = Object.keys(expected).filter(
    (other) =>
      other !== id &&
      fieldOf(expected[other], 'title') === title &&
      fieldOf(expected[other], 'language') === language,
  );
  return owners.length === 1 ? owners[0] : undefined;
}

function compareSection(section: string, expected: Table, actual: Table): string[] {
  const ids = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
  const previousIds = new Map<string, string>();
  for (const id of ids) {
    const previous = findPreviousId(id, expected, actual);
    if (previous !== undefined) previousIds.set(id, previous);
  }
  const movedAway = new Set(previousIds.values());
  return ids.flatMap((id) => {
    const previous = previousIds.get(id);
    const renameNotice =
      previous === undefined
        ? []
        : [
            `${section}: ${id} changed ID (was ${previous}): restore the order or migrate the progress; do not update the fixture`,
          ];
    if (actual[id] === undefined && movedAway.has(id)) return renameNotice;
    if (previous === undefined) return diffEntry(section, id, expected[id], actual[id]);
    if (expected[id] === undefined) return renameNotice;
    const withoutTitle = { ...(actual[id] as Table), title: fieldOf(expected[id], 'title') };
    return [...renameNotice, ...diffEntry(section, id, expected[id], withoutTitle)];
  });
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
assert.deepEqual(
  differences,
  [],
  `The curriculum differs from the contract:\n${differences.join('\n')}`,
);
console.log(
  `curriculum-ids-check OK: ${Object.keys(actual.exercises).length} exercises, ` +
    `${Object.keys(actual.worlds).length} worlds, ${Object.keys(actual.workshops).length} workshops, ` +
    `${Object.keys(actual.atlas).length} Atlas concepts.`,
);
