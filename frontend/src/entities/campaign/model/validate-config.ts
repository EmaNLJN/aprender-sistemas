import { LEVEL_IDS } from '../../../shared/config/levels';
import { cloneJson } from '../../../shared/lib/clone-json';
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import { CAMPAIGN_LANGUAGES, isCampaignLanguage, isOptionIndex } from './rules';
import type { CampaignCatalog, CampaignExercise, CampaignLanguage, CampaignWorld } from './types';

type Raw = Record<string, unknown>;

const EXERCISE_ID_PATTERN = /^(rust|go)-\d+$/;
const WORLD_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const MISSIONS_PER_WORLD = 6;
const MISSIONS_PER_GROUP = 3;
const LEVELS: readonly unknown[] = LEVEL_IDS;

function isNonBlankString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function hasUniqueNonBlankTestIds(tests: unknown[]): boolean {
  if (!tests.every((test) => isPlainObject(test) && isNonBlankString(test.id))) return false;
  const ids = tests.map((test) => (test as Raw).id);
  return new Set(ids).size === tests.length;
}

function isValidExercise(exercise: unknown, known: Map<string, CampaignExercise>): boolean {
  if (!isPlainObject(exercise)) return false;
  // String(): the pattern coerces the id just like RegExp.test in the original.
  if (!EXERCISE_ID_PATTERN.test(String(exercise.id))) return false;
  if (!isCampaignLanguage(exercise.language)) return false;
  if (typeof exercise.id !== 'string' || !exercise.id.startsWith(exercise.language + '-'))
    return false;
  if (known.has(exercise.id)) return false;
  if (!Array.isArray(exercise.tests) || !exercise.tests.length) return false;
  return hasUniqueNonBlankTestIds(exercise.tests);
}

function validateExercises(rawExercises: unknown[]): Map<string, CampaignExercise> {
  const exercises = new Map<string, CampaignExercise>();
  for (const exercise of rawExercises) {
    if (!isValidExercise(exercise, exercises)) throw new Error('Ejercicio de campaña inválido.');
    const accepted = exercise as CampaignExercise;
    exercises.set(accepted.id, accepted);
  }
  return exercises;
}

function groupWorldsByLanguage(worlds: unknown): Raw {
  if (!Array.isArray(worlds)) {
    if (!isPlainObject(worlds)) throw new Error('Faltan los mundos de la campaña.');
    return worlds;
  }
  const list: { language?: unknown }[] = worlds;
  return Object.fromEntries(
    CAMPAIGN_LANGUAGES.map((language) => [
      language,
      list.filter((world) => world.language === language),
    ]),
  );
}

function hasThreeTrainingAndThreeChallenges(world: Raw): boolean {
  return (
    Array.isArray(world.trainingIds) &&
    world.trainingIds.length === MISSIONS_PER_GROUP &&
    Array.isArray(world.challengeIds) &&
    world.challengeIds.length === MISSIONS_PER_GROUP
  );
}

function isValidWorldShape(
  world: unknown,
  language: CampaignLanguage,
  known: Map<string, CampaignWorld>,
): boolean {
  if (!isPlainObject(world)) return false;
  if (typeof world.id !== 'string' || !WORLD_ID_PATTERN.test(world.id)) return false;
  if (!world.id.startsWith(language + '-') || known.has(world.id)) return false;
  if (!LEVELS.includes(world.level) || !isNonBlankString(world.title)) return false;
  return hasThreeTrainingAndThreeChallenges(world);
}

function validateMissions(
  world: Raw,
  language: CampaignLanguage,
  exercises: Map<string, CampaignExercise>,
  assigned: Set<string>,
): string[] {
  const trainingIds = world.trainingIds as string[];
  const challengeIds = world.challengeIds as string[];
  const missionIds = [...trainingIds, ...challengeIds];
  if (new Set(missionIds).size !== MISSIONS_PER_WORLD || world.bossId !== challengeIds[2])
    throw new Error('Cada mundo necesita seis misiones y un jefe final.');
  for (const id of missionIds) {
    if (exercises.get(id)?.language !== language || assigned.has(id))
      throw new Error('Misión desconocida, repetida o de otro lenguaje: ' + id);
    assigned.add(id);
  }
  return missionIds;
}

function isValidCheckpoint(checkpoint: unknown): boolean {
  if (!isPlainObject(checkpoint)) return false;
  if (!isNonBlankString(checkpoint.question) || !isNonBlankString(checkpoint.explanation))
    return false;
  const { options, answer } = checkpoint;
  if (!Array.isArray(options) || options.length < 2) return false;
  if (!options.every(isNonBlankString)) return false;
  return isOptionIndex(answer, options.length);
}

function validateLanguageWorlds(
  language: CampaignLanguage,
  suppliedWorlds: unknown[],
  exercises: Map<string, CampaignExercise>,
  worldById: Map<string, CampaignWorld>,
  assigned: Set<string>,
): CampaignWorld[] {
  const validated: CampaignWorld[] = [];
  for (const world of suppliedWorlds) {
    if (!isValidWorldShape(world, language, worldById))
      throw new Error('Mundo de campaña inválido.');
    const raw = world as Raw;
    const missionIds = validateMissions(raw, language, exercises, assigned);
    if (!isValidCheckpoint(raw.checkpoint)) throw new Error('Pregunta de checkpoint inválida.');
    const copied = { ...cloneJson(raw), language, missionIds } as CampaignWorld;
    validated.push(copied);
    worldById.set(copied.id, copied);
  }
  return validated;
}

export function validateCampaignConfig(config: unknown): CampaignCatalog {
  if (!isPlainObject(config) || !Array.isArray(config.exercises))
    throw new Error('Faltan los ejercicios de la campaña.');
  const exercises = validateExercises(config.exercises);
  const supplied = groupWorldsByLanguage(config.worlds);
  const worlds: Record<CampaignLanguage, CampaignWorld[]> = { rust: [], go: [] };
  const worldById = new Map<string, CampaignWorld>();
  const assigned = new Set<string>();
  for (const language of CAMPAIGN_LANGUAGES) {
    const suppliedWorlds = supplied[language];
    if (!Array.isArray(suppliedWorlds)) throw new Error('Faltan mundos de ' + language + '.');
    worlds[language] = validateLanguageWorlds(
      language,
      suppliedWorlds,
      exercises,
      worldById,
      assigned,
    );
  }
  return { exercises, worlds, worldById };
}
