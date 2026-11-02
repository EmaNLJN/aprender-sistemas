import { Factory } from 'fishery';
import {
  emptyAreas,
  type ExerciseRow,
  type ProgressAreas,
  type ProgressPhoto,
} from './server-rows';

export const exerciseRowFactory = Factory.define<ExerciseRow>(() => ({
  exerciseId: 'rust-01',
  revision: 1,
  prediction: null,
  predictionCorrect: { value: false, at: null },
  assisted: false,
  solutionSeen: false,
  hintsRevealed: null,
  reflection: null,
  customTest: null,
  review: null,
  solvedAt: null,
  serverSolvedAt: null,
  proof: null,
  lastAttempt: null,
  attemptCount: 0,
  legacyAttempts: 0,
}));

export function areasWith(partial: Partial<ProgressAreas>): ProgressAreas {
  return { ...emptyAreas(), ...partial };
}

export const photoFactory = Factory.define<ProgressPhoto>(() => ({
  userId: 41,
  epoch: 1,
  revision: 0,
  resetAt: null,
  contentVersion: '0123456789abcdef0123456789abcdef',
  areas: emptyAreas(),
}));
