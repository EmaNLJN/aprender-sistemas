// Rutas y orden de carga de las fuentes legacy en los contextos vm de los checks.
// Cada loadX evalúa sus archivos con runSource en el orden que exigen las
// dependencias por window.* (ver qa/load-order-check.ts); los checks no repiten listas.
import type vm from 'node:vm';
import { runSource, type RunOptions } from './sources.ts';

export type Language = 'rust' | 'go';
export type SystemsDomain = 'lowlevel' | 'infra' | 'play' | 'pc';

export const GUIDE_CONTENT_SOURCE = 'content.js';
export const APP_SHELL_SOURCE = 'app.js';
export const LAB_SOURCE = 'lab.js';
export const CAMPAIGN_ENGINE_SOURCE = 'src/app/legacy/register-campaign-engine.ts';
export const CAMPAIGN_UI_SOURCE = 'campaign.js';
export const SYSTEMS_ENGINE_SOURCE = 'src/app/legacy/register-systems-engine.ts';
export const SYSTEMS_UI_SOURCE = 'systems.js';

export const LAB_SOURCES: Record<Language, string> = { rust: 'lab-rust.js', go: 'lab-go.js' };
export const QUEST_SOURCES: Record<Language, string> = {
  rust: 'quests-rust.js',
  go: 'quests-go.js',
};
export const CAMPAIGN_WORLD_SOURCES: Record<Language, string> = {
  rust: 'campaign-rust.js',
  go: 'campaign-go.js',
};

// Ejercicios del recorrido y desafíos de campaña, en el orden en que se evalúan.
export const LAB_EXERCISE_SOURCES: readonly string[] = [
  LAB_SOURCES.rust,
  LAB_SOURCES.go,
  QUEST_SOURCES.rust,
  QUEST_SOURCES.go,
];

export const SYSTEMS_DOMAINS: readonly SystemsDomain[] = ['lowlevel', 'infra', 'play', 'pc'];

// Cada dominio publica su catálogo y luego sus núcleos programables, que lo leen.
export function systemsDomainSources(domain: SystemsDomain): [catalog: string, labs: string] {
  return [`systems-${domain}.js`, `systems-${domain}-labs.js`];
}

export const SYSTEMS_CATALOG_SOURCES: readonly string[] =
  SYSTEMS_DOMAINS.flatMap(systemsDomainSources);

export function loadGuideContent(context: vm.Context): void {
  runSource(context, GUIDE_CONTENT_SOURCE);
}

export function loadAppShell(context: vm.Context): void {
  runSource(context, APP_SHELL_SOURCE);
}

export function loadLabExercises(context: vm.Context): void {
  for (const source of LAB_EXERCISE_SOURCES) runSource(context, source);
}

export function loadSystemsDomain(
  context: vm.Context,
  domain: SystemsDomain,
  options?: RunOptions,
): void {
  for (const source of systemsDomainSources(domain)) runSource(context, source, options);
}

export function loadSystemsCatalogs(context: vm.Context): void {
  for (const domain of SYSTEMS_DOMAINS) loadSystemsDomain(context, domain);
}

// Todo lo que lab.js lee al evaluarse: ejercicios, desafíos y núcleos de Sistemas.
export function loadLabCatalogs(context: vm.Context): void {
  loadLabExercises(context);
  loadSystemsCatalogs(context);
}

export function loadCampaignWorlds(context: vm.Context): void {
  for (const source of Object.values(CAMPAIGN_WORLD_SOURCES)) runSource(context, source);
}

export function loadLab(context: vm.Context): void {
  runSource(context, LAB_SOURCE);
}

export function loadCampaignEngine(context: vm.Context): void {
  runSource(context, CAMPAIGN_ENGINE_SOURCE);
}

export function loadCampaignUi(context: vm.Context): void {
  runSource(context, CAMPAIGN_UI_SOURCE);
}

export function loadSystemsEngine(context: vm.Context): void {
  runSource(context, SYSTEMS_ENGINE_SOURCE);
}

export function loadSystemsUi(context: vm.Context): void {
  runSource(context, SYSTEMS_UI_SOURCE);
}
