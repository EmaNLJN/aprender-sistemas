// Talleres de Sistemas: content/workshops/manifest.yaml ordena los IDs por dominio y cada
// content/workshops/<id>.yaml es la ficha que publica SYSTEMS_<DOMINIO>.workshops. Cada dominio
// conserva su orden de claves legacy porque el YAML es el objeto tal cual.
import { LEVEL_IDS } from '../../frontend/src/shared/config/levels.ts';
import { LANGUAGES, SYSTEMS_DOMAINS, type SystemsDomain } from './catalogs.ts';
import { child, fail, filePlace } from './content-error.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkSource,
  expectText,
  integer,
  listOf,
  oneOf,
  recordOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';

export interface WorkshopStepKey {
  id: string;
  v1Index: number | null;
}
export type WorkshopStepKeys = Record<string, WorkshopStepKey[]>;

export interface LoadedWorkshops {
  workshops: Record<SystemsDomain, JsonRecord[]>;
  stepKeys: WorkshopStepKeys;
}

const perLanguage = (check: Check): Check =>
  recordOf(Object.fromEntries(LANGUAGES.map((language) => [language, check])));

const STEP_KEY = /^[a-z][a-z0-9-]{0,63}$/;

const expectStepKey: Check = (value, place) => {
  const key = expectText(value, place);
  if (!STEP_KEY.test(key)) {
    fail(place, 'se esperaba una clave en minúsculas, dígitos y guiones (hasta 64), como e1');
  }
  return key;
};

// FR-029, FR-030 (ADR 0006 D14): id and v1Index feed the meta; they are not published until D1.
const STEP_SPEC: Record<string, Check> = {
  id: expectStepKey,
  v1Index: integer(0),
  title: expectText,
  task: expectText,
  why: expectText,
  done: expectText,
};

const WORKSHOP_SPEC: Record<string, Check> = {
  id: expectText,
  // Las categorías que conoce systems.js.
  category: oneOf(['machine', 'infra', 'play']),
  model: expectText,
  level: oneOf(LEVEL_IDS),
  minutes: integer(1),
  title: expectText,
  subtitle: expectText,
  story: expectText,
  what: expectText,
  why: expectText,
  uses: textList(1),
  limits: expectText,
  objectives: listOf(recordOf({ id: expectText, label: expectText, why: expectText }), 1),
  prediction: checkQuestion,
  steps: listOf(recordOf(STEP_SPEC, ['v1Index']), 1),
  sources: listOf(checkSource, 1),
  code: perLanguage(expectText),
  related: perLanguage(textList(1)),
  bridge: perLanguage(expectText),
};

function publishedStep(step: JsonRecord): JsonRecord {
  const published: JsonRecord = {};
  for (const [key, value] of Object.entries(step)) {
    if (key !== 'id' && key !== 'v1Index') published[key] = value;
  }
  return published;
}

function stepKeysOf(workshop: JsonRecord): WorkshopStepKey[] {
  const file = filePlace(`content/workshops/${workshop.id as string}.yaml`);
  const seenIds = new Set<string>();
  const seenIndexes = new Set<number>();
  return (workshop.steps as JsonRecord[]).map((step, index) => {
    const at = child(child(file, 'steps'), index);
    const id = step.id as string;
    if (seenIds.has(id)) fail(child(at, 'id'), `«${id}» se repite en el taller`);
    seenIds.add(id);
    const v1Index = Object.hasOwn(step, 'v1Index') ? (step.v1Index as number) : null;
    if (v1Index !== null) {
      if (seenIndexes.has(v1Index)) fail(child(at, 'v1Index'), `${v1Index} se repite en el taller`);
      seenIndexes.add(v1Index);
    }
    return { id, v1Index };
  });
}

export function loadWorkshops(root: string): LoadedWorkshops {
  const loaded = loadGroupedRecords(root, 'content/workshops', SYSTEMS_DOMAINS, WORKSHOP_SPEC);
  const stepKeys: WorkshopStepKeys = {};
  const workshops = {} as Record<SystemsDomain, JsonRecord[]>;
  for (const domain of SYSTEMS_DOMAINS) {
    workshops[domain] = loaded[domain].map((workshop) => {
      stepKeys[workshop.id as string] = stepKeysOf(workshop);
      const steps = (workshop.steps as JsonRecord[]).map(publishedStep);
      return { ...workshop, steps };
    });
  }
  return { workshops, stepKeys };
}
