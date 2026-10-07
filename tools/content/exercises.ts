import { LEVEL_IDS } from '../../frontend/src/shared/config/levels.ts';
import { expectOnlyEntries, expectSameIds, listDirectories, listFiles } from './catalog-files.ts';
import {
  EXERCISE_KEY_ORDER,
  OPTIONAL_EXERCISE_KEYS,
  SYSTEMS_DOMAINS,
  type Catalog,
  type ExerciseKey,
  type Language,
  type SystemsDomain,
} from './catalogs.ts';
import { child, fail, filePlace, type Place } from './content-error.ts';
import {
  checkQuestion,
  checkRecord,
  checkSource,
  expectList,
  expectRecord,
  expectText,
  expectTextList,
  integer,
  listOf,
  oneOf,
  recordOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';
import { readContentText, readYamlFile } from './yaml-file.ts';

export interface LanguageExercises {
  lab: JsonRecord[];
  quests: JsonRecord[];
  cores: Record<SystemsDomain, JsonRecord[]>;
}

const DEFAULT_KEYS = [
  'kind',
  'minutes',
  'imports',
  'visual',
  'sources',
  'level',
] as const satisfies readonly ExerciseKey[];
const DERIVED_KEYS: Record<string, string> = {
  id: 'es el nombre de la carpeta',
  language: 'sale de content/<lenguaje>/',
  topicId: 'la define la etapa en el manifiesto',
  topic: 'la define la etapa en el manifiesto',
  stage: 'es la posición de la etapa en el manifiesto',
  starter: 'va en el archivo starter',
  solution: 'va en el archivo solution',
};
const QUEST_DERIVED_KEYS: Record<string, string> = {
  challengeType: 'lo fija la posición en el mundo de desafíos',
};
const QUEST_ROLES = ['repair', 'kata', 'boss'];
const VISUALS = [
  'flow',
  'memory',
  'ownership',
  'collections',
  'pointers',
  'generics',
  'concurrency',
];
const CODE_EXTENSION: Record<Language, string> = { rust: 'rs', go: 'go' };
// gofmt needs this header to parse each .go; the published code omits it.
const GO_HEADER = 'package main\n\n';

function checkHints(value: unknown, place: Place): string[] {
  const hints = expectTextList(value, place, 1);
  if (hints.length !== 3) fail(place, `se esperaban 3 pistas y hay ${hints.length}`);
  return hints;
}

// A test key is stable and never reused (ADR 0006 D14): the evidence markers and the stored
// verdicts name it. `custom` is the student's own test.
const TEST_KEY = /^[A-Za-z0-9_]{1,64}$/;
const RESERVED_TEST_KEY = 'custom';

function checkTests(value: unknown, place: Place): unknown[] {
  const tests = expectList(value, place, 1);
  const keys = new Set<string>();
  tests.forEach((item, index) => {
    const at = child(place, index);
    const test = checkRecord(item, at, {
      id: expectText,
      label: expectText,
      expression: expectText,
      why: expectText,
      failure: expectText,
    });
    const key = test.id as string;
    const keyPlace = child(at, 'id');
    if (!TEST_KEY.test(key)) {
      fail(
        keyPlace,
        'la clave de una prueba tiene de 1 a 64 letras ASCII, dígitos o guiones bajos',
      );
    }
    if (key === RESERVED_TEST_KEY) {
      fail(keyPlace, `«${RESERVED_TEST_KEY}» está reservada para la prueba propia del alumno`);
    }
    if (keys.has(key)) fail(keyPlace, `la clave «${key}» se repite en el ejercicio`);
    keys.add(key);
  });
  return tests;
}

const EXERCISE_CHECKS: Record<ExerciseKey, Check> = {
  id: expectText,
  language: expectText,
  topicId: expectText,
  topic: expectText,
  stage: integer(1),
  level: oneOf(LEVEL_IDS),
  challengeType: oneOf(QUEST_ROLES),
  workshopId: expectText,
  kind: oneOf(['completar', 'reparar']),
  minutes: integer(1),
  imports: textList(0),
  visual: oneOf(VISUALS),
  sources: listOf(checkSource, 1),
  title: expectText,
  intro: expectText,
  why: expectText,
  objective: expectText,
  instructions: textList(1),
  starter: expectText,
  solution: expectText,
  tests: checkTests,
  hints: checkHints,
  review: recordOf({ success: expectText, pitfall: expectText }),
  transfer: expectText,
  prediction: checkQuestion,
};

const DEFAULTS_SPEC: Record<string, Check> = Object.fromEntries(
  DEFAULT_KEYS.map((key) => [key, EXERCISE_CHECKS[key]]),
);
const STAGE_SPEC: Record<string, Check> = {
  topicId: expectText,
  topic: expectText,
  ...DEFAULTS_SPEC,
  exercises: textList(1),
};
const QUEST_STAGE_SPEC: Record<string, Check> = {
  ...Object.fromEntries(Object.entries(STAGE_SPEC).filter(([key]) => key !== 'kind')),
  bossMinutes: integer(1),
};
const QUEST_STAGE_OPTIONAL = ['imports', 'visual', 'sources'];

function stageList(spec: Record<string, Check>, optional: readonly string[]): Check {
  return listOf(recordOf(spec, optional), 1);
}

function checkQuestStages(value: unknown, place: Place): unknown[] {
  const stages = stageList(QUEST_STAGE_SPEC, QUEST_STAGE_OPTIONAL)(value, place) as JsonRecord[];
  stages.forEach((stage, index) => {
    if ((stage.exercises as string[]).length !== QUEST_ROLES.length) {
      fail(
        child(child(place, index), 'exercises'),
        'cada mundo tiene reparación, kata y jefe, en ese orden',
      );
    }
  });
  return stages;
}

const MANIFEST_SPEC: Record<string, Check> = {
  defaults: recordOf(DEFAULTS_SPEC, DEFAULT_KEYS),
  lab: stageList(STAGE_SPEC, DEFAULT_KEYS),
  quests: checkQuestStages,
  systems: recordOf(
    Object.fromEntries(
      SYSTEMS_DOMAINS.map((domain) => [domain, stageList(STAGE_SPEC, DEFAULT_KEYS)]),
    ),
  ),
};
const MANIFEST_OPTIONAL = ['quests', 'systems'];

interface Section {
  catalog: Catalog;
  stages: JsonRecord[];
}

function sectionsOf(manifest: JsonRecord): Section[] {
  const systems = (manifest.systems ?? {}) as JsonRecord;
  return [
    { catalog: 'lab', stages: manifest.lab as JsonRecord[] },
    { catalog: 'quests', stages: (manifest.quests ?? []) as JsonRecord[] },
    ...SYSTEMS_DOMAINS.map((domain) => ({
      catalog: domain,
      stages: (systems[domain] ?? []) as JsonRecord[],
    })),
  ];
}

function pickDefaults(record: JsonRecord): JsonRecord {
  const defaults: JsonRecord = {};
  for (const key of DEFAULT_KEYS) {
    if (Object.hasOwn(record, key)) defaults[key] = record[key];
  }
  return defaults;
}

function questDefaults(stage: JsonRecord, position: number): JsonRecord {
  const challengeType = QUEST_ROLES[position];
  return {
    challengeType,
    kind: position === 0 ? 'reparar' : 'completar',
    minutes: challengeType === 'boss' ? stage.bossMinutes : stage.minutes,
  };
}

function checkExerciseFiles(root: string, folder: string, language: Language): void {
  const extension = CODE_EXTENSION[language];
  const expected = ['exercise.yaml', `solution.${extension}`, `starter.${extension}`];
  const found = listFiles(root, folder, 'sólo se admiten exercise.yaml, starter y solution');
  if (found.join() !== expected.join()) {
    fail(
      filePlace(folder),
      `debe tener exactamente ${expected.join(', ')}; tiene ${found.join(', ')}`,
    );
  }
}

function readCode(root: string, folder: string, language: Language, name: string): string {
  const file = `${folder}/${name}.${CODE_EXTENSION[language]}`;
  let code = readContentText(root, file);
  if (code.includes('\r')) fail(filePlace(file), 'tiene finales de línea CRLF; guardalo con LF');
  if (language === 'go') {
    if (!code.startsWith(GO_HEADER)) {
      fail(filePlace(file), 'debe empezar con «package main» y una línea en blanco');
    }
    code = code.slice(GO_HEADER.length);
  }
  // Editors add a trailing newline: one is removed so the published code stays the same.
  if (code.endsWith('\n')) code = code.slice(0, -1);
  if (code.trim() === '') fail(filePlace(file), 'el código está vacío');
  return code;
}

function orderExercise(fields: JsonRecord, catalog: Catalog, place: Place): JsonRecord {
  const order: readonly ExerciseKey[] = EXERCISE_KEY_ORDER[catalog];
  for (const key of Object.keys(fields)) {
    if (!(order as readonly string[]).includes(key))
      fail(child(place, key), `clave desconocida en ${catalog}`);
  }
  const exercise: JsonRecord = {};
  for (const key of order) {
    if (Object.hasOwn(fields, key)) {
      EXERCISE_CHECKS[key](fields[key], child(place, key));
      exercise[key] = fields[key];
    } else if (!OPTIONAL_EXERCISE_KEYS[catalog].includes(key)) {
      fail(place, `falta la clave «${key}»`);
    }
  }
  return exercise;
}

interface Slot {
  language: Language;
  catalog: Catalog;
  defaults: JsonRecord;
  stage: JsonRecord;
  stageNumber: number;
  position: number;
  id: string;
}

function buildExercise(root: string, slot: Slot): JsonRecord {
  const folder = `content/${slot.language}/exercises/${slot.id}`;
  checkExerciseFiles(root, folder, slot.language);
  const file = `${folder}/exercise.yaml`;
  const place = filePlace(file);
  const own = expectRecord(readYamlFile(root, file), place);
  const derived =
    slot.catalog === 'quests' ? { ...DERIVED_KEYS, ...QUEST_DERIVED_KEYS } : DERIVED_KEYS;
  for (const [key, reason] of Object.entries(derived)) {
    if (Object.hasOwn(own, key)) fail(child(place, key), `no va en exercise.yaml: ${reason}`);
  }
  const fields: JsonRecord = {
    ...slot.defaults,
    ...pickDefaults(slot.stage),
    ...(slot.catalog === 'quests' ? questDefaults(slot.stage, slot.position) : {}),
    ...own,
    id: slot.id,
    language: slot.language,
    topicId: slot.stage.topicId,
    topic: slot.stage.topic,
    stage: slot.stageNumber,
    starter: readCode(root, folder, slot.language, 'starter'),
    solution: readCode(root, folder, slot.language, 'solution'),
  };
  return orderExercise(fields, slot.catalog, place);
}

export function loadLanguage(root: string, language: Language): LanguageExercises {
  expectOnlyEntries(
    root,
    `content/${language}`,
    ['manifest.yaml', 'exercises'],
    'sólo se admiten manifest.yaml y exercises/',
  );
  const manifestFile = `content/${language}/manifest.yaml`;
  const manifestPlace = filePlace(manifestFile);
  const manifest = checkRecord(
    readYamlFile(root, manifestFile),
    manifestPlace,
    MANIFEST_SPEC,
    MANIFEST_OPTIONAL,
  );
  const sections = sectionsOf(manifest);
  const ids = sections.flatMap(({ stages }) =>
    stages.flatMap((stage) => stage.exercises as string[]),
  );
  const folder = `content/${language}/exercises`;
  expectSameIds(ids, listDirectories(root, folder), manifestPlace, folder, '');

  const result: LanguageExercises = {
    lab: [],
    quests: [],
    cores: { lowlevel: [], infra: [], play: [], pc: [] },
  };
  let stageNumber = 0;
  for (const { catalog, stages } of sections) {
    const target =
      catalog === 'lab' || catalog === 'quests' ? result[catalog] : result.cores[catalog];
    for (const stage of stages) {
      stageNumber += 1;
      (stage.exercises as string[]).forEach((id, position) => {
        const defaults = manifest.defaults as JsonRecord;
        target.push(
          buildExercise(root, { language, catalog, defaults, stage, stageNumber, position, id }),
        );
      });
    }
  }
  return result;
}

function allExercises(exercises: LanguageExercises): JsonRecord[] {
  return [
    ...exercises.lab,
    ...exercises.quests,
    ...SYSTEMS_DOMAINS.flatMap((domain) => exercises.cores[domain]),
  ];
}

export function expectDistinctIds(rust: LanguageExercises, go: LanguageExercises): void {
  const rustIds = new Set(allExercises(rust).map((exercise) => exercise.id));
  for (const exercise of allExercises(go)) {
    if (rustIds.has(exercise.id)) {
      fail(
        filePlace('content/go/manifest.yaml'),
        `el ID ${exercise.id} también está en content/rust/`,
      );
    }
  }
}

export function interleaveCores(
  rust: LanguageExercises,
  go: LanguageExercises,
): Record<SystemsDomain, JsonRecord[]> {
  const cores: Record<SystemsDomain, JsonRecord[]> = { lowlevel: [], infra: [], play: [], pc: [] };
  for (const domain of SYSTEMS_DOMAINS) {
    const rustCores = rust.cores[domain];
    const goCores = go.cores[domain];
    if (rustCores.length !== goCores.length) {
      fail(
        filePlace('content/go/manifest.yaml'),
        `systems.${domain} tiene ${goCores.length} núcleos y el de Rust ${rustCores.length}`,
      );
    }
    cores[domain] = rustCores.flatMap((core, index) => [core, goCores[index]]);
  }
  return cores;
}
