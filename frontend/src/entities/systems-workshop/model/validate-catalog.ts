import { cloneJson } from '../../../shared/lib/clone-json';
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { SystemsCatalog, SystemsExercise, SystemsLanguage, SystemsWorkshop } from './types';

type Raw = Record<string, unknown>;

export const SYSTEMS_LANGUAGES: readonly SystemsLanguage[] = ['rust', 'go'];

const WORKSHOP_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const OBJECTIVES_PER_WORKSHOP = 3;
const STEPS_PER_WORKSHOP = 4;

export function isSystemsLanguage(value: unknown): value is SystemsLanguage {
  return SYSTEMS_LANGUAGES.includes(value as SystemsLanguage);
}

export function isOptionIndex(value: unknown, count: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < count;
}

function requireCore(
  workshop: Raw,
  language: SystemsLanguage,
  allExercises: Map<unknown, SystemsExercise>,
): void {
  const code = workshop.code as Record<string, unknown> | undefined;
  const exercise = allExercises.get(code?.[language]);
  if (exercise?.language !== language) {
    throw new Error(`Falta el núcleo programable de ${workshop.id} en ${language}.`);
  }
  const tests: unknown = exercise.tests;
  if (!Array.isArray(tests) || !tests.length) {
    throw new Error(`Pruebas de núcleo inválidas: ${exercise.id}`);
  }
  const validIds = tests.every(
    (test) => isPlainObject(test) && typeof test.id === 'string' && test.id.trim(),
  );
  if (!validIds || new Set(tests.map((test: Raw) => test.id)).size !== tests.length) {
    throw new Error(`IDs de pruebas de núcleo inválidos: ${exercise.id}`);
  }
}

function assertWorkshopIdentity(
  workshop: Raw,
  known: Map<string, SystemsWorkshop>,
  models: Raw,
): void {
  // RegExp.test coerces the id: a workshop without id passes this pattern, as in the original.
  if (
    !WORKSHOP_ID_PATTERN.test(workshop.id as string) ||
    known.has(workshop.id as string) ||
    !models[workshop.model as string]
  )
    throw new Error('Taller duplicado o modelo desconocido.');
}

function assertObjectivesAndSteps(workshop: Raw): void {
  const objectives = workshop.objectives;
  if (
    !Array.isArray(objectives) ||
    objectives.length !== OBJECTIVES_PER_WORKSHOP ||
    new Set(objectives.map((goal: Raw) => goal.id)).size !== OBJECTIVES_PER_WORKSHOP
  )
    throw new Error('Se necesitan tres objetivos distintos por taller.');
  if (!Array.isArray(workshop.steps) || workshop.steps.length !== STEPS_PER_WORKSHOP)
    throw new Error('Se necesitan cuatro etapas de proyecto.');
}

function assertPrediction(workshop: Raw): void {
  const question = workshop.prediction as Raw | null | undefined;
  if (
    !question ||
    !Array.isArray(question.options) ||
    question.options.length < 2 ||
    !isOptionIndex(question.answer, question.options.length)
  )
    throw new Error('Checkpoint de taller inválido.');
}

export function validateSystemsConfig(config: unknown): SystemsCatalog {
  const input = config as Raw | null | undefined;
  if (!Array.isArray(input?.workshops) || !input.models || !Array.isArray(input.exercises))
    throw new Error('Falta el catálogo de Sistemas.');
  const allExercises = new Map<unknown, SystemsExercise>(
    input.exercises.map((exercise: SystemsExercise) => [exercise.id, exercise]),
  );
  const workshops = new Map<string, SystemsWorkshop>();
  for (const workshop of input.workshops as Raw[]) {
    assertWorkshopIdentity(workshop, workshops, input.models as Raw);
    assertObjectivesAndSteps(workshop);
    assertPrediction(workshop);
    for (const language of SYSTEMS_LANGUAGES) requireCore(workshop, language, allExercises);
    workshops.set(workshop.id as string, cloneJson(workshop) as SystemsWorkshop);
  }
  return { workshops, exercises: allExercises as Map<string, SystemsExercise> };
}
