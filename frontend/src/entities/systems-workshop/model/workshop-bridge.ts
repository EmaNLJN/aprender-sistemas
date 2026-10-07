import type { WorkshopLocation } from '../../../shared/config/url-grammar';

export interface BridgeWorkshop {
  code: Readonly<Record<string, string>>;
  related?: Readonly<Record<string, readonly string[]>>;
}

export type WorkshopExerciseRole = 'core' | 'tool';

export function workshopMissionIds(
  workshop: BridgeWorkshop | undefined,
  language: string,
): string[] {
  throw new Error('not implemented');
}

export function workshopExerciseRole(
  workshop: BridgeWorkshop | undefined,
  exerciseId: string,
  language: string,
): WorkshopExerciseRole | null {
  throw new Error('not implemented');
}

export function workshopReturnTarget(workshopId: string, language: string): WorkshopLocation {
  throw new Error('not implemented');
}
