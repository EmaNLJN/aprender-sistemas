import { cloneJson } from '../../../shared/lib/clone-json';
import type {
  AttemptPermission,
  CampaignCatalog,
  CampaignCheckpointRecord,
  CampaignLanguage,
  CampaignMission,
  CampaignSeal,
  CampaignStateV1,
  CampaignSummary,
  CampaignWorld,
  DerivedWorld,
} from './types';

export const CODE_XP = 20;
export const PREDICTION_XP = 10;
// Un mundo vale 6 misiones de CODE_XP + PREDICTION_XP; se aprueba con PASS_SCORE.
export const PASS_SCORE = 150;
export const WORLD_MAX_SCORE = 180;

export const CAMPAIGN_LANGUAGES: readonly CampaignLanguage[] = ['rust', 'go'];

export function isCampaignLanguage(value: unknown): value is CampaignLanguage {
  return CAMPAIGN_LANGUAGES.includes(value as CampaignLanguage);
}

// Índice entero dentro de una lista de `count` opciones.
export function isOptionIndex(value: unknown, count: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < count;
}

export function blankCampaignState(): CampaignStateV1 {
  return { version: 1, seals: {}, checkpoints: {} };
}

export function sealOf(state: CampaignStateV1, id: string): CampaignSeal {
  return state.seals[id] || { code: false, prediction: false, assisted: false };
}

function pointsOf(state: CampaignStateV1, id: string): number {
  const seal = sealOf(state, id);
  return (seal.code ? CODE_XP : 0) + (seal.prediction ? PREDICTION_XP : 0);
}

export function totalXP(
  catalog: CampaignCatalog,
  state: CampaignStateV1,
  language?: CampaignLanguage,
): number {
  return [...catalog.exercises.values()]
    .filter((exercise) => !language || exercise.language === language)
    .reduce((sum, exercise) => sum + pointsOf(state, exercise.id), 0);
}

// `init` garantiza que cada misión del mundo existe en el catálogo.
function titleOf(catalog: CampaignCatalog, id: string): string {
  return catalog.exercises.get(id)!.title;
}

function blockedByWorldReason(previous: DerivedWorld): string {
  const pending = previous.requirements.length
    ? previous.requirements.join('; ')
    : 'primero deben completarse sus mundos anteriores';
  return 'Completá «' + previous.title + '»: ' + pending + '.';
}

function verifyTestsReason(title: string, id: string): string {
  return 'Verificá las pruebas de «' + title + '» (' + id + ').';
}

interface WorldGate {
  lockReasons: string[];
  bossReasons: string[];
  requirements: string[];
  checkpointReasons: string[];
  completionReasons: string[];
}

function bossRequirements(
  catalog: CampaignCatalog,
  state: CampaignStateV1,
  world: CampaignWorld,
  score: number,
): string[] {
  const requirements: string[] = [];
  const boss = sealOf(state, world.bossId);
  const bossTitle = titleOf(catalog, world.bossId);
  if (score < PASS_SCORE)
    requirements.push(
      'Sumá ' +
        (PASS_SCORE - score) +
        ' puntos para llegar a ' +
        PASS_SCORE +
        '/' +
        WORLD_MAX_SCORE +
        '.',
    );
  if (!boss.code) requirements.push('Verificá las pruebas del jefe «' + bossTitle + '».');
  if (!boss.prediction) requirements.push('Acertá la predicción del jefe «' + bossTitle + '».');
  return requirements;
}

// Reúne por qué un mundo está bloqueado, qué falta para su jefe y qué falta para completarlo.
function evaluateWorldGate(
  catalog: CampaignCatalog,
  state: CampaignStateV1,
  world: CampaignWorld,
  previous: DerivedWorld[],
  score: number,
  checkpoint: CampaignCheckpointRecord,
): WorldGate {
  const lockReasons = previous.filter((earlier) => !earlier.completed).map(blockedByWorldReason);
  const missingCodeReasons = world.missionIds
    .filter((id) => id !== world.bossId && !sealOf(state, id).code)
    .map((id) => verifyTestsReason(titleOf(catalog, id), id));
  const requirements = [...missingCodeReasons, ...bossRequirements(catalog, state, world, score)];
  const checkpointReasons = [...lockReasons, ...requirements];
  const completionReasons = [...checkpointReasons];
  if (!checkpoint.passed) {
    const text = 'Respondé correctamente el checkpoint del mundo.';
    completionReasons.push(text);
    requirements.push(text);
  }
  return {
    lockReasons,
    bossReasons: [...lockReasons, ...missingCodeReasons],
    requirements,
    checkpointReasons,
    completionReasons,
  };
}

function deriveMission(
  state: CampaignStateV1,
  world: CampaignWorld,
  gate: WorldGate,
  id: string,
): CampaignMission {
  const isBoss = id === world.bossId;
  const points = pointsOf(state, id);
  return {
    id,
    ...sealOf(state, id),
    points,
    score: points,
    allowed: isBoss ? gate.bossReasons.length === 0 : gate.lockReasons.length === 0,
    reasons: isBoss ? [...gate.bossReasons] : [...gate.lockReasons],
  };
}

function deriveWorld(
  catalog: CampaignCatalog,
  state: CampaignStateV1,
  world: CampaignWorld,
  previous: DerivedWorld[],
): DerivedWorld {
  const score = world.missionIds.reduce((sum, id) => sum + pointsOf(state, id), 0);
  const checkpoint = state.checkpoints[world.id] || { passed: false, lastAnswer: null };
  const gate = evaluateWorldGate(catalog, state, world, previous, score, checkpoint);
  const checkpointReady = gate.checkpointReasons.length === 0;
  return {
    ...cloneJson(world),
    score,
    maxScore: WORLD_MAX_SCORE,
    unlocked: gate.lockReasons.length === 0,
    completed: checkpointReady && checkpoint.passed,
    checkpointPassed: checkpoint.passed,
    checkpointReady,
    checkpointAnswer: checkpoint.lastAnswer,
    checkpointFeedback: checkpoint.lastAnswer === null ? '' : world.checkpoint.explanation,
    checkpointReasons: gate.checkpointReasons,
    completionReasons: gate.completionReasons,
    requirements: gate.requirements,
    bossReady: gate.bossReasons.length === 0,
    reasons: gate.lockReasons,
    missions: world.missionIds.map((id) => deriveMission(state, world, gate, id)),
  };
}

// Cada mundo exige completar los anteriores del mismo lenguaje.
export function deriveWorlds(
  catalog: CampaignCatalog,
  state: CampaignStateV1,
  language: CampaignLanguage,
): DerivedWorld[] {
  const derived: DerivedWorld[] = [];
  for (const world of catalog.worlds[language])
    derived.push(deriveWorld(catalog, state, world, derived));
  return derived;
}

export function summarizeWorlds(
  worlds: DerivedWorld[],
  xp: number,
  storageAvailable: boolean,
): CampaignSummary {
  const completed = worlds.filter((world) => world.completed);
  return {
    score: worlds.reduce((sum, world) => sum + world.score, 0),
    maxScore: worlds.length * WORLD_MAX_SCORE,
    completedWorlds: completed.length,
    badges: completed.map((world) => world.badge),
    totalXP: xp,
    storageAvailable,
  };
}

export function permissionToAttempt(
  catalog: CampaignCatalog,
  state: CampaignStateV1,
  id: string,
  language: string,
): AttemptPermission {
  if (!isCampaignLanguage(language) || catalog.exercises.get(id)?.language !== language)
    return {
      allowed: false,
      reasons: ['Ese ejercicio no pertenece al lenguaje elegido.'],
      worldId: null,
      isBoss: false,
    };
  for (const world of deriveWorlds(catalog, state, language)) {
    const mission = world.missions.find((item) => item.id === id);
    if (mission)
      return {
        allowed: mission.allowed,
        reasons: [...mission.reasons],
        worldId: world.id,
        isBoss: id === world.bossId,
      };
  }
  return { allowed: true, reasons: [], worldId: null, isBoss: false };
}
