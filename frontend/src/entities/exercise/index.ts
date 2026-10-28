export { hasPassingEvidence, testPassed } from './model/passing-evidence';
export { interpretRun, readTestMarkers } from './model/run-outcome';
export { diagnose } from './model/diagnose';
export type { Diagnosis } from './model/diagnose';
export { liveHint } from './model/live-hint';
export {
  draftOf,
  isDueForReview,
  isReflectionSolved,
  isResultCurrent,
  isReviewComplete,
  isSolved,
  levelOf,
  normalizeCustomTest,
  practicePointsOf,
} from './model/selectors';
export {
  CONFIDENCE_DAYS,
  DAY_MS,
  HINT_LIMIT,
  attemptPatch,
  ensureRecord,
  hintPatch,
  loadSolutionPatch,
  passedRunPatch,
  predictionPatch,
  restoreStarterPatch,
  revealSolutionPatch,
  selfAssessmentPatch,
} from './model/record-rules';
export type { Confidence } from './model/record-rules';
export { reviewStateOf } from './model/review-state';
export type { ReviewState } from './model/review-state';
export type { LabResultV1, LabTestOutcome } from './model/lab-result';
export { syncAfterRun } from './model/sync-after-run';
export { mergeRecord } from './model/merge-record';
export { buildProgram } from './model/build-program';
export {
  createExerciseCatalog,
  createExerciseCatalogHolder,
  exerciseCatalog,
} from './model/exercise-catalog';
export { blankLabState } from './model/lab-state';
export type { LabStateV1 } from './model/lab-state';
export { createLabStore, labStore } from './model/lab-store';
export type { LabImportPlan, LabStore } from './model/lab-store';
export type { LabRecord } from './model/merge-record';
export type {
  ExerciseCatalog,
  ExerciseCatalogHolder,
  ExerciseGroups,
} from './model/exercise-catalog';
export type {
  ChallengeType,
  Exercise,
  ExerciseKind,
  ExercisePrediction,
  ExerciseReview,
  ExerciseSource,
  ExerciseTest,
  ExerciseVisual,
  ExerciseLanguage,
} from './model/types';
