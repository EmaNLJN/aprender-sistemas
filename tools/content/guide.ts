// Guía (GUIDE_DATA) en content/guide/: la biblioteca ordenada por manifest.yaml, un archivo
// por recurso y por paso, el manifiesto de cada recorrido (módulos en orden con sus pasos) y
// las fuentes. Se arma con el mismo orden de claves que publicaba guide-data.ts.
import { expectSameIds, listYamlIds } from './catalog-files.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { fail, filePlace } from './content-error.ts';
import { loadRecord } from './records.ts';
import {
  checkQuestion,
  checkRecord,
  expectBoolean,
  expectText,
  integer,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';
import { readYamlFile } from './yaml-file.ts';

const RESOURCE_SPEC: Record<string, Check> = {
  id: expectText,
  title: expectText,
  url: expectText,
  languages: listOf(oneOf(['rust', 'go', 'both']), 1),
  category: oneOf(['ejercicios', 'lectura', 'proyectos', 'herramientas']),
  cost: oneOf(['gratis', 'mixto']),
  format: expectText,
  description: expectText,
  why: expectText,
  caveat: expectText,
  featured: expectBoolean,
};

const STEP_SPEC: Record<string, Check> = {
  id: expectText,
  title: expectText,
  minutes: integer(1),
  objective: expectText,
  task: expectText,
  doneWhen: expectText,
  resourceIds: textList(1),
  quiz: checkQuestion,
};

const TRACK_SPEC: Record<string, Check> = {
  title: expectText,
  description: expectText,
  modules: listOf(
    (value, place) =>
      checkRecord(value, place, {
        id: expectText,
        title: expectText,
        subtitle: expectText,
        steps: textList(1),
      }),
    1,
  ),
};

const SOURCES: Check = listOf(
  (value, place) =>
    checkRecord(value, place, { title: expectText, url: expectText, note: expectText }),
  1,
);

function loadTrack(root: string, language: Language): JsonRecord {
  const folder = `content/guide/${language}`;
  const file = `${folder}/manifest.yaml`;
  const place = filePlace(file);
  const track = checkRecord(readYamlFile(root, file), place, TRACK_SPEC);
  const modules = track.modules as JsonRecord[];
  const stepIds = modules.flatMap((module) => module.steps as string[]);
  expectSameIds(stepIds, listYamlIds(root, `${folder}/steps`), place, `${folder}/steps`, '.yaml');
  return {
    ...track,
    modules: modules.map((module) => ({
      ...module,
      steps: (module.steps as string[]).map((id) =>
        loadRecord(root, `${folder}/steps/${id}.yaml`, id, STEP_SPEC),
      ),
    })),
  };
}

// Los IDs de módulos y pasos indexan el progreso del recorrido: no se repiten en toda la guía.
function expectUniqueTrackIds(tracks: Record<Language, JsonRecord>): void {
  const seen = new Set<string>();
  for (const language of LANGUAGES) {
    for (const module of tracks[language].modules as JsonRecord[]) {
      const steps = module.steps as JsonRecord[];
      for (const id of [module.id as string, ...steps.map((step) => step.id as string)]) {
        if (seen.has(id))
          fail(
            filePlace(`content/guide/${language}/manifest.yaml`),
            `ID repetido en la guía: ${id}`,
          );
        seen.add(id);
      }
    }
  }
}

export function loadGuide(root: string): JsonRecord {
  const manifestFile = 'content/guide/manifest.yaml';
  const manifestPlace = filePlace(manifestFile);
  const manifest = checkRecord(readYamlFile(root, manifestFile), manifestPlace, {
    resources: textList(1),
  });
  const resourceIds = manifest.resources as string[];
  const resourcesFolder = 'content/guide/resources';
  expectSameIds(
    resourceIds,
    listYamlIds(root, resourcesFolder),
    manifestPlace,
    resourcesFolder,
    '.yaml',
  );
  const resources = resourceIds.map((id) =>
    loadRecord(root, `${resourcesFolder}/${id}.yaml`, id, RESOURCE_SPEC),
  );
  const tracks = {} as Record<Language, JsonRecord>;
  for (const language of LANGUAGES) tracks[language] = loadTrack(root, language);
  expectUniqueTrackIds(tracks);
  const sourcesFile = 'content/guide/sources.yaml';
  const sources = SOURCES(readYamlFile(root, sourcesFile), filePlace(sourcesFile)) as JsonRecord[];
  return { resources, tracks, sources };
}
