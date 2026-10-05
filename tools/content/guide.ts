// Guía (GUIDE_DATA) en content/guide/: la biblioteca ordenada por manifest.yaml, un archivo
// por recurso y por paso, el manifiesto de cada recorrido (módulos en orden con sus pasos) y
// las fuentes. Se arma con el mismo orden de claves que publicaba guide-data.ts.
import { expectOnlyEntries, expectSameIds, expectUniqueIds, listYamlIds } from './catalog-files.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { child, filePlace, type Place } from './content-error.ts';
import { loadListedRecords } from './records.ts';
import {
  checkQuestion,
  checkRecord,
  expectBoolean,
  expectText,
  integer,
  listOf,
  oneOf,
  recordOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';
import { readYamlFile } from './yaml-file.ts';
import type {
  GuideModule,
  GuideResource,
  GuideResourceLanguage,
  GuideSource,
  GuideStep,
  GuideTrack,
} from '../../frontend/src/entities/guide/model/types.ts';

const RESOURCE_LANGUAGES = [
  'rust',
  'go',
  'both',
] as const satisfies readonly GuideResourceLanguage[];

const RESOURCE_SPEC = {
  id: expectText,
  title: expectText,
  url: expectText,
  languages: listOf(oneOf(RESOURCE_LANGUAGES), 1),
  category: oneOf(['ejercicios', 'lectura', 'proyectos', 'herramientas']),
  cost: oneOf(['gratis', 'mixto']),
  format: expectText,
  description: expectText,
  why: expectText,
  caveat: expectText,
  featured: expectBoolean,
} satisfies Record<keyof GuideResource, Check>;

const STEP_SPEC = {
  id: expectText,
  title: expectText,
  minutes: integer(1),
  objective: expectText,
  task: expectText,
  doneWhen: expectText,
  resourceIds: textList(1),
  quiz: checkQuestion,
} satisfies Record<keyof GuideStep, Check>;

// En el manifiesto del recorrido, `steps` lista los IDs de los pasos.
const MODULE_SPEC = {
  id: expectText,
  title: expectText,
  subtitle: expectText,
  steps: textList(1),
} satisfies Record<keyof GuideModule, Check>;

const TRACK_SPEC = {
  title: expectText,
  description: expectText,
  modules: listOf(recordOf(MODULE_SPEC), 1),
} satisfies Record<keyof GuideTrack, Check>;

const SOURCES: Check = listOf(
  recordOf({ title: expectText, url: expectText, note: expectText } satisfies Record<
    keyof GuideSource,
    Check
  >),
  1,
);

// Un ID de módulo o de paso del manifiesto de un recorrido, con su lugar (`modules[i].id` o
// `modules[i].steps[j]`) para que los errores nombren el campo.
interface TrackId {
  id: string;
  kind: 'module' | 'step';
  place: Place;
}

interface ModuleIds {
  id: string;
  stepIds: string[];
}

function trackIds(modules: ModuleIds[], manifest: Place): TrackId[] {
  const ids: TrackId[] = [];
  modules.forEach((module, i) => {
    const moduleAt = child(child(manifest, 'modules'), i);
    ids.push({ id: module.id, kind: 'module', place: child(moduleAt, 'id') });
    module.stepIds.forEach((id, j) => {
      ids.push({ id, kind: 'step', place: child(child(moduleAt, 'steps'), j) });
    });
  });
  return ids;
}

function loadTrack(root: string, language: Language): JsonRecord {
  const folder = `content/guide/${language}`;
  const file = `${folder}/manifest.yaml`;
  const place = filePlace(file);
  expectOnlyEntries(
    root,
    folder,
    ['manifest.yaml', 'steps'],
    'sólo se admiten manifest.yaml y steps/',
  );
  const track = checkRecord(readYamlFile(root, file), place, TRACK_SPEC);
  const modules = track.modules as JsonRecord[];
  const stepsFolder = `${folder}/steps`;
  const ids = trackIds(
    modules.map((module) => ({ id: module.id as string, stepIds: module.steps as string[] })),
    place,
  );
  // Un módulo o un paso aparece una sola vez en el manifiesto; los errores nombran el campo.
  expectUniqueIds(
    ids.map((entry) => entry.id),
    (index) => ids[index].place,
  );
  const steps = ids.filter((entry) => entry.kind === 'step');
  const stepIds = steps.map((entry) => entry.id);
  expectSameIds(
    stepIds,
    listYamlIds(root, stepsFolder),
    place,
    stepsFolder,
    '.yaml',
    (index) => steps[index].place,
  );
  // Repite la comprobación de IDs ya hecha arriba, sin campo: así el cargador es el mismo.
  const records = loadListedRecords(root, stepIds, place, stepsFolder, STEP_SPEC);
  let next = 0;
  return {
    ...track,
    modules: modules.map((module) => {
      const count = (module.steps as string[]).length;
      const moduleSteps = records.slice(next, next + count);
      next += count;
      return { ...module, steps: moduleSteps };
    }),
  };
}

// Los IDs de módulos y pasos indexan el progreso del recorrido: no se repiten en toda la guía.
function expectUniqueGuideIds(tracks: Record<Language, JsonRecord>): void {
  const ids = LANGUAGES.flatMap((language) => {
    const modules = (tracks[language].modules as JsonRecord[]).map((module) => ({
      id: module.id as string,
      stepIds: (module.steps as JsonRecord[]).map((step) => step.id as string),
    }));
    return trackIds(modules, filePlace(`content/guide/${language}/manifest.yaml`));
  });
  expectUniqueIds(
    ids.map((entry) => entry.id),
    (index) => ids[index].place,
    'ID repetido en la guía',
  );
}

export function loadGuide(root: string): JsonRecord {
  expectOnlyEntries(
    root,
    'content/guide',
    ['manifest.yaml', 'sources.yaml', 'resources', ...LANGUAGES],
    'sólo se admiten manifest.yaml, sources.yaml, resources/, rust/ y go/',
  );
  const manifestFile = 'content/guide/manifest.yaml';
  const manifestPlace = filePlace(manifestFile);
  const manifest = checkRecord(readYamlFile(root, manifestFile), manifestPlace, {
    resources: textList(1),
  });
  const resourceIds = manifest.resources as string[];
  const resourcesFolder = 'content/guide/resources';
  const resources = loadListedRecords(
    root,
    resourceIds,
    manifestPlace,
    resourcesFolder,
    RESOURCE_SPEC,
  );
  const tracks = {} as Record<Language, JsonRecord>;
  for (const language of LANGUAGES) tracks[language] = loadTrack(root, language);
  expectUniqueGuideIds(tracks);
  const sourcesFile = 'content/guide/sources.yaml';
  const sources = SOURCES(readYamlFile(root, sourcesFile), filePlace(sourcesFile)) as JsonRecord[];
  return { resources, tracks, sources };
}
