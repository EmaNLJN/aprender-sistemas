export const VIEWS = [
  'recorrido',
  'campana',
  'sistemas',
  'atlas',
  'laboratorio',
  'biblioteca',
  'proyecto',
  'metodo',
] as const;
export type View = (typeof VIEWS)[number];
export type ExercisePhase = 'learn' | 'code' | 'reflect';
export type WorkshopPart = 'explore' | 'build' | 'ship';
export type LinkLanguage = 'rust' | 'go';
export const FREE_LAB_HREF = '?#laboratorio';

export interface LinkQuery {
  exercise: string | null;
  phase: string | null;
  missionWorld: string | null;
  missionWorkshop: string | null;
  world: string | null;
  language: string | null;
  workshop: string | null;
  part: string | null;
}

export interface WorkshopLocation {
  workshopId: string;
  part: WorkshopPart;
  language: LinkLanguage;
}

export function viewFromHash(hash: string): View {
  throw new Error('not implemented');
}

export function readLinkQuery(search: string): LinkQuery {
  throw new Error('not implemented');
}

export function exercisePhaseOr(value: string | null, fallback: ExercisePhase): ExercisePhase {
  throw new Error('not implemented');
}

export function workshopPartOr(value: string | null, fallback: WorkshopPart): WorkshopPart {
  throw new Error('not implemented');
}

export function isLinkLanguage(value: string | null): value is LinkLanguage {
  throw new Error('not implemented');
}

export function exerciseHref(exerciseId: string, phase: ExercisePhase): string {
  throw new Error('not implemented');
}

export function campaignMissionHref(worldId: string, exerciseId: string): string {
  throw new Error('not implemented');
}

export function workshopExerciseHref(workshopId: string, exerciseId: string): string {
  throw new Error('not implemented');
}

export function worldHref(worldId: string): string {
  throw new Error('not implemented');
}

export function workshopReturnHref(location: WorkshopLocation): string {
  throw new Error('not implemented');
}

export function withLabQuery(
  current: URL,
  mode: 'map' | 'exercise',
  exerciseId: string,
  phase: ExercisePhase,
): URL {
  throw new Error('not implemented');
}

export function withWorldQuery(current: URL, worldId: string): URL {
  throw new Error('not implemented');
}

export function withWorkshopQuery(
  current: URL,
  language: string,
  workshopId: string | null,
  part: WorkshopPart,
): URL {
  throw new Error('not implemented');
}

export function withLanguageQuery(current: URL, view: View, language: string): URL {
  throw new Error('not implemented');
}
