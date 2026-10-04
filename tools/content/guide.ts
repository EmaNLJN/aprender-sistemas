// Guía (GUIDE_DATA) en content/guide/: la biblioteca ordenada por manifest.yaml, un archivo
// por recurso y por paso, el manifiesto de cada recorrido (módulos en orden con sus pasos) y
// las fuentes. Se arma con el mismo orden de claves que publicaba guide-data.ts.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expectSameIds, listYamlIds } from './catalog-files.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { child, fail, filePlace, type Place } from './content-error.ts';
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

// content/guide/ y cada recorrido admiten sólo las entradas de la lista: un YAML suelto no lo
// lee nadie y quedaría sin publicar. Los nombres con punto se ignoran, como en catalog-files.ts.
function expectOnlyEntries(root: string, folder: string, allowed: string[], message: string): void {
  const absolute = join(root, folder);
  // Una carpeta ausente la informa después la lectura de su manifiesto.
  if (!existsSync(absolute)) return;
  for (const name of readdirSync(absolute).sort()) {
    if (name.startsWith('.') || allowed.includes(name)) continue;
    fail(filePlace(`${folder}/${name}`), message);
  }
}

// Cada módulo y cada paso aparece una sola vez en el manifiesto de su recorrido, y cada paso
// tiene su archivo; el error nombra el campo (`modules[i].id`, `modules[i].steps[j]`).
function checkTrackIds(modules: JsonRecord[], place: Place, folder: string, found: string[]): void {
  const seen = new Set<string>();
  modules.forEach((module, i) => {
    const moduleAt = child(child(place, 'modules'), i);
    const moduleId = module.id as string;
    if (seen.has(moduleId)) fail(child(moduleAt, 'id'), `ID repetido: ${moduleId}`);
    seen.add(moduleId);
    (module.steps as string[]).forEach((id, j) => {
      const stepAt = child(child(moduleAt, 'steps'), j);
      if (seen.has(id)) fail(stepAt, `ID repetido: ${id}`);
      seen.add(id);
      if (!found.includes(id)) fail(stepAt, `${id} no tiene ${folder}/${id}.yaml`);
    });
  });
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
  const found = listYamlIds(root, stepsFolder);
  checkTrackIds(modules, place, stepsFolder, found);
  // Los repetidos y faltantes ya fallaron con su campo; queda detectar los pasos huérfanos.
  const stepIds = modules.flatMap((module) => module.steps as string[]);
  expectSameIds(stepIds, found, place, stepsFolder, '.yaml');
  return {
    ...track,
    modules: modules.map((module) => ({
      ...module,
      steps: (module.steps as string[]).map((id) =>
        loadRecord(root, `${stepsFolder}/${id}.yaml`, id, STEP_SPEC),
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
