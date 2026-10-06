import type { ExerciseLanguage } from './types';

export interface BuildableExercise {
  language: ExerciseLanguage;
  tests: readonly { id: string; expression: string }[];
  imports?: readonly string[];
}

export function buildProgram(item: BuildableExercise, code: string, customTest = ''): string {
  throw new Error('not implemented');
}
