import type { SystemsModel } from '../../../entities/systems-simulation';
import type {
  SystemsLanguage,
  SystemsWorkshop,
  WorkshopRecord,
} from '../../../entities/systems-workshop';
import type { LevelId } from '../../../shared/config/levels';

export type { SystemsLanguage };
export type WorkshopCategory = 'machine' | 'infra' | 'play';
export type WorkshopFamily = 'all' | WorkshopCategory;

type WorkshopObjectiveBase = SystemsWorkshop['objectives'][number];
type WorkshopPredictionBase = SystemsWorkshop['prediction'];

export interface WorkshopGoal extends WorkshopObjectiveBase {
  label: string;
  why: string;
}

export interface WorkshopCheckpoint extends WorkshopPredictionBase {
  question: string;
}

export interface WorkshopStep {
  title: string;
  task: string;
  why: string;
  done: string;
}

export interface WorkshopSource {
  title: string;
  url: string;
}

export interface WorkshopContent extends SystemsWorkshop {
  title: string;
  subtitle: string;
  story: string;
  what: string;
  why: string;
  limits: string;
  category: WorkshopCategory;
  level: LevelId;
  minutes: number;
  objectives: WorkshopGoal[];
  prediction: WorkshopCheckpoint;
  steps: WorkshopStep[];
  uses: string[];
  sources: WorkshopSource[];
  bridge: Record<SystemsLanguage, string>;
  related?: Partial<Record<SystemsLanguage, string[]>>;
}

export interface SystemsWorkshopView extends WorkshopContent {
  progress: WorkshopRecord;
  modelDone: boolean;
  completed: boolean;
  seals: number;
  storageAvailable: boolean;
}

export interface CatalogFilter {
  family: WorkshopFamily;
  query: string;
}

export interface SystemsPageExercise {
  id: string;
  title: string;
  objective: string;
  tests: readonly { label: string; why: string }[];
}

export type SystemsPageModel = SystemsModel<unknown>;
export type SystemsModelRegistry = Readonly<Record<string, SystemsPageModel>>;

export interface SystemsPageProps {
  language: SystemsLanguage;
  models: SystemsModelRegistry;
  exercises: readonly SystemsPageExercise[];
  notify: (message: string) => void;
  downloadKit: (workshop: SystemsWorkshopView) => void;
  scrollToTop: () => void;
}
