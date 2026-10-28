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
  return workshop
    ? [...new Set([...(workshop.related?.[language] || []), workshop.code[language]])]
    : [];
}

export function workshopExerciseRole(
  workshop: BridgeWorkshop | undefined,
  exerciseId: string,
  language: string,
): WorkshopExerciseRole | null {
  if (!workshop || !workshopMissionIds(workshop, language).includes(exerciseId)) return null;
  return exerciseId === workshop.code[language] ? 'core' : 'tool';
}

export function workshopReturnTarget(workshopId: string, language: string): WorkshopLocation {
  return { workshopId, part: 'build', language: language === 'go' ? 'go' : 'rust' };
}
