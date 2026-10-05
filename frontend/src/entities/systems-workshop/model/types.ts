import type { BackupEntry } from '../../../shared/lib/versioned-storage';

export type SystemsLanguage = 'rust' | 'go';

export interface SystemsTest {
  id: string;
}

export interface SystemsExercise {
  id: string;
  language: SystemsLanguage;
  tests: SystemsTest[];
}

export interface WorkshopObjective {
  id: string;
  [content: string]: unknown;
}

export interface WorkshopPrediction {
  options: string[];
  answer: number;
  explanation: string;
}

export interface SystemsWorkshop {
  id: string;
  model: string;
  objectives: WorkshopObjective[];
  steps: unknown[];
  prediction: WorkshopPrediction;
  code: Record<SystemsLanguage, string>;
  [content: string]: unknown;
}

export interface SystemsConfig {
  workshops: SystemsWorkshop[];
  models: Record<string, unknown>;
  exercises: SystemsExercise[];
}

export interface SystemsCatalog {
  workshops: Map<string, SystemsWorkshop>;
  exercises: Map<string, SystemsExercise>;
}

export interface WorkshopRecord {
  observed: string[];
  code: boolean;
  predicted: boolean;
  answer: number | null;
  steps: number[];
  note: string;
}

export interface SystemsStateV1 {
  version: 1;
  records: Record<string, WorkshopRecord>;
}

export interface WorkshopView extends SystemsWorkshop {
  progress: WorkshopRecord;
  modelDone: boolean;
  completed: boolean;
  seals: number;
  storageAvailable: boolean;
}

export interface ObserveResult extends WorkshopView {
  added: string[];
}

export interface AnswerResult extends WorkshopView {
  correct: boolean;
  explanation: string;
}

export interface SystemsInitResult {
  storageAvailable: boolean;
  loadWarning: string;
}

export interface SystemsSyncResult {
  changed: boolean;
  storageAvailable: boolean;
}

export interface SystemsImportPlan {
  state: SystemsStateV1;
  lossy: boolean;
}

export interface SystemsResetResult {
  removed: boolean;
}

export interface NoteResult {
  storageAvailable: boolean;
}

export interface SystemsEngine {
  init(config: SystemsConfig): SystemsInitResult;
  get(id: string, language: string): WorkshopView;
  observe(id: string, language: string, goals: unknown): ObserveResult;
  answer(id: string, language: string, index: number): AnswerResult;
  refreshFromLab(lab?: unknown): SystemsSyncResult;
  syncLab(lab?: unknown): SystemsSyncResult;
  planImport(raw: unknown): SystemsImportPlan;
  applyImport(plan: SystemsImportPlan): SystemsSyncResult;
  backups(): BackupEntry[];
  list(language: string): WorkshopView[];
  setStep(id: string, language: string, index: number, checked: boolean): void;
  setNote(id: string, language: string, note: string): NoteResult;
  exportState(): SystemsStateV1;
  reset(): SystemsResetResult;
}
