/* Contenido de la guía (window.GUIDE_DATA de content.js).
 * node qa/guide-content-check.ts
 *
 * Los IDs de pasos y recursos indexan el progreso de la guía (app.js los valida
 * contra estos conjuntos). Los conjuntos esperados están escritos a mano: cambiar
 * uno exige migrar el progreso guardado y actualizar este check.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadGuideContent } from './lib/legacy-sources.ts';
import { plainJson } from './lib/plain-json.ts';

type Language = 'rust' | 'go';
interface Quiz {
  options: string[];
  answer: number;
}
interface Step {
  id: string;
  resourceIds: string[];
  quiz: Quiz;
}
interface GuideModule {
  id: string;
  steps: Step[];
}
interface Resource {
  id: string;
  url: string;
}
interface GuideData {
  resources: Resource[];
  sources: { url: string }[];
  tracks: Record<Language, { modules: GuideModule[] }>;
}

const LANGUAGES: Language[] = ['rust', 'go'];

const EXPECTED_STEP_IDS = [
  'rust-first-session',
  'rust-ownership',
  'rust-errors',
  'rust-kv-memory',
  'rust-kv-cli',
  'rust-kv-tests',
  'rust-save',
  'rust-load',
  'rust-measure',
  'rust-protocol',
  'rust-local-server',
  'rust-next-challenge',
  'go-first-session',
  'go-first-test',
  'go-errors',
  'go-kv-memory',
  'go-kv-cli',
  'go-kv-tests',
  'go-save',
  'go-load',
  'go-measure',
  'go-protocol',
  'go-local-server',
  'go-next-challenge',
];

const EXPECTED_RESOURCE_IDS = [
  'rust-100',
  'rust-rover',
  'rustlings',
  'rust-brown',
  'rust-google',
  'codecrafters',
  'protohackers',
  'go-tour',
  'go-tests',
  'go-exercism',
  'gophercises',
  'boot-dev',
  'context7',
  'rust-examples',
  'go-examples',
];

function loadGuide(): GuideData {
  const fakeWindow: { GUIDE_DATA?: unknown } = {};
  loadGuideContent(vm.createContext({ window: fakeWindow }));
  assert.ok(fakeWindow.GUIDE_DATA, 'el adaptador de catálogos debe publicar window.GUIDE_DATA');
  return plainJson(fakeWindow.GUIDE_DATA) as GuideData;
}

function assertUnique(ids: string[], what: string): void {
  const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(repeated, [], `${what} duplicados: ${repeated.join(', ')}`);
}

function stepsOf(guide: GuideData, language: Language): Step[] {
  return guide.tracks[language].modules.flatMap((module) => module.steps);
}

const guide = loadGuide();
const allSteps = LANGUAGES.flatMap((language) => stepsOf(guide, language));
const resourceIds = new Set(guide.resources.map((resource) => resource.id));

assert.deepEqual(Object.keys(guide.tracks).sort(), [...LANGUAGES].sort(), 'Recorridos esperados');

assertUnique(
  allSteps.map((step) => step.id),
  'IDs de pasos',
);
assertUnique(
  guide.resources.map((resource) => resource.id),
  'IDs de recursos',
);
assert.deepEqual(
  allSteps.map((step) => step.id).sort(),
  [...EXPECTED_STEP_IDS].sort(),
  'El conjunto de pasos de la guía cambió',
);
assert.deepEqual(
  [...resourceIds].sort(),
  [...EXPECTED_RESOURCE_IDS].sort(),
  'El conjunto de recursos de la guía cambió',
);

for (const language of LANGUAGES) {
  const { modules } = guide.tracks[language];
  assert.equal(modules.length, 4, `${language}: se esperan 4 módulos`);
  for (const module of modules) {
    assert.equal(module.steps.length, 3, `${module.id}: se esperan 3 pasos`);
  }
  for (const step of stepsOf(guide, language)) {
    assert.ok(step.id.startsWith(`${language}-`), `${step.id}: falta el prefijo ${language}-`);
  }
}

for (const step of allSteps) {
  assert.ok(step.resourceIds.length > 0, `${step.id}: sin recursos`);
  for (const id of step.resourceIds) {
    assert.ok(resourceIds.has(id), `${step.id}: resourceId inexistente ${id}`);
  }
  assert.equal(step.quiz.options.length, 3, `${step.id}: el quiz necesita 3 opciones`);
  assert.ok(
    Number.isInteger(step.quiz.answer) && step.quiz.answer >= 0 && step.quiz.answer < 3,
    `${step.id}: answer fuera de rango (${step.quiz.answer})`,
  );
}

for (const { id, url } of guide.resources) {
  assert.ok(url.startsWith('https://'), `${id}: la URL debe ser https (${url})`);
}
for (const { url } of guide.sources) {
  assert.ok(url.startsWith('https://'), `fuente: la URL debe ser https (${url})`);
}

console.log(
  `guide-content-check OK: ${allSteps.length} pasos, ${guide.resources.length} recursos.`,
);
