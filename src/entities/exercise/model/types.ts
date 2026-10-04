import type { LevelId } from '../../../shared/config/levels';

export type ExerciseLanguage = 'rust' | 'go';

// `reparar` marca los ejercicios cuyo código inicial trae un defecto a corregir.
export type ExerciseKind = 'completar' | 'reparar';

// Sólo los desafíos de campaña declaran su tipo; los ejercicios del recorrido no.
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

// Forma real de RUST_LAB, GO_LAB, RUST_QUESTS y GO_QUESTS. `level` aparece en 25 de
// los 100 ejercicios de cada lenguaje y en todos los desafíos; `challengeType` sólo en
// los desafíos. `imports` es [] en Rust y lista paquetes de la biblioteca estándar en Go.
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
