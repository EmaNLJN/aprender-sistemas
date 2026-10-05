import type { LevelId } from '../../../shared/config/levels';

export type ExerciseLanguage = 'rust' | 'go';

// `reparar` marks exercises whose starter code has a defect to fix.
export type ExerciseKind = 'completar' | 'reparar';

// Only campaign challenges declare their type; route exercises do not.
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

// Real shape of RUST_LAB, GO_LAB, RUST_QUESTS and GO_QUESTS. `level` appears on 25 of
// the 100 exercises of each language and on every challenge; `challengeType` only on
// challenges. `imports` is [] in Rust and lists standard-library packages in Go.
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
