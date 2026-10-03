import type { ExercisePrediction, ExerciseSource, ExerciseTestDraft } from './types';

// Constructores de los catálogos: fijan el orden de claves que ve el código legacy.
export function testCase(
  label: string,
  expression: string,
  why: string,
  failure: string,
): ExerciseTestDraft {
  return { label, expression, why, failure };
}

export function prediction(
  question: string,
  options: string[],
  answer: number,
  explanation: string,
): ExercisePrediction {
  return { question, options, answer, explanation };
}

export function source(title: string, url: string): ExerciseSource {
  return { title, url };
}

// El ID indexa el progreso guardado: `rust-07`, `go-42`, `rust-101`.
export function formatExerciseId(language: string, number: number): string {
  return `${language}-${String(number).padStart(2, '0')}`;
}

// Numera las pruebas de un ejercicio como t1, t2…
export function numberTests<T extends ExerciseTestDraft>(tests: T[]): (T & { id: string })[] {
  return tests.map((test, index) => ({ id: `t${index + 1}`, ...test }));
}
