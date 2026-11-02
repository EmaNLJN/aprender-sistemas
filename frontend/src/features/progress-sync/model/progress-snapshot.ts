import type { CampaignStateV1 } from '../../../entities/campaign';
import type { LabStateV1 } from '../../../entities/exercise';
import type { RouteProgressV1 } from '../../../entities/guide';
import type { SystemsStateV1 } from '../../../entities/systems-workshop';
import type { Language } from './operations';

export type ProgressAreaName = 'route' | 'lab' | 'campaign' | 'systems';

export interface ProgressSnapshot {
  route: RouteProgressV1;
  lab: LabStateV1;
  campaign: CampaignStateV1;
  systems: SystemsStateV1;
}

export const AREA_NAMES: readonly ProgressAreaName[] = ['route', 'lab', 'campaign', 'systems'];

export interface ProgressContext {
  readonly contentVersion: string;
  blankSnapshot(): ProgressSnapshot;
  knowsExercise(exerciseId: string): boolean;
  knowsCampaignMission(exerciseId: string): boolean;
  knowsWorld(worldId: string): boolean;
  knowsGuideStep(stepId: string): boolean;
  knowsGuideResource(resourceId: string): boolean;
  knowsMilestone(itemKey: string): boolean;
  knowsWorkshop(workshopId: string, language: Language): boolean;
  knowsObjective(workshopId: string, language: Language, objectiveKey: string): boolean;
  stepKeyAt(workshopId: string, language: Language, position: number): string | null;
  stepPositionOf(workshopId: string, language: Language, stepKey: string): number | null;
  starterHashOf(exerciseId: string): string | null;
  predictionAnswerOf(exerciseId: string): number | null;
  checkpointAnswerOf(worldId: string): number | null;
  workshopAnswerOf(workshopId: string, language: Language): number | null;
}

export function blankSnapshot(): ProgressSnapshot {
  return {
    route: {
      version: 1,
      language: 'rust',
      completed: [],
      milestones: [],
      favorites: [],
      quizAnswers: {},
      notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
      minutes: 25,
    },
    lab: { version: 1, records: {}, selected: { rust: null, go: null } },
    campaign: { version: 1, seals: {}, checkpoints: {} },
    systems: { version: 1, records: {} },
  };
}
