import type { LevelId } from '../../../shared/config/levels';

export type ExerciseLanguage = 'rust' | 'go';

export type ExerciseKind = 'completar' | 'reparar';

export type ChallengeType = 'repair' | 'kata' | 'boss';

export type ExerciseVisual =
  'flow' | 'memory' | 'ownership' | 'collections' | 'pointers' | 'generics' | 'concurrency';

export interface ExerciseSource {
  title: string;
  url: string;
}

export interface ExerciseTest {
  id: string;
  label: string;
  expression: string;
  why: string;
  failure: string;
}

export interface ExerciseReview {
  success: string;
  pitfall: string;
}

export interface ExercisePrediction {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Exercise {
  id: string;
  language: ExerciseLanguage;
  topicId: string;
  topic: string;
  stage: number;
  level?: LevelId;
  challengeType?: ChallengeType;
  kind: ExerciseKind;
  minutes: number;
  imports: string[];
  visual: ExerciseVisual;
  sources: ExerciseSource[];
  title: string;
  intro: string;
  why: string;
  objective: string;
  instructions: string[];
  starter: string;
  solution: string;
  tests: ExerciseTest[];
  hints: string[];
  review: ExerciseReview;
  transfer: string;
  prediction: ExercisePrediction;
}
