import type { ExerciseLanguage } from './types';

export interface Diagnosis {
  explanation: string;
  action: string;
}

export const diagnose: (stderr: string, language: ExerciseLanguage) => Diagnosis = () => {
  throw new Error('not implemented');
};
