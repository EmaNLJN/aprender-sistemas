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
const EXERCISE_PHASES: readonly string[] = ['learn', 'code', 'reflect'];
const WORKSHOP_PARTS: readonly string[] = ['explore', 'build', 'ship'];
const LINK_LANGUAGES: readonly string[] = ['rust', 'go'];
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
  return VIEWS.find((view) => view === hash.slice(1)) ?? 'recorrido';
}

export function readLinkQuery(search: string): LinkQuery {
  const params = new URLSearchParams(search);
  return {
    exercise: params.get('ejercicio'),
    phase: params.get('paso'),
    missionWorld: params.get('campana'),
    missionWorkshop: params.get('sistema'),
    world: params.get('mundo'),
    language: params.get('lenguaje'),
    workshop: params.get('taller'),
    part: params.get('parte'),
  };
}

export function exercisePhaseOr(value: string | null, fallback: ExercisePhase): ExercisePhase {
  return value !== null && EXERCISE_PHASES.includes(value) ? (value as ExercisePhase) : fallback;
}

export function workshopPartOr(value: string | null, fallback: WorkshopPart): WorkshopPart {
  return value !== null && WORKSHOP_PARTS.includes(value) ? (value as WorkshopPart) : fallback;
}

export function isLinkLanguage(value: string | null): value is LinkLanguage {
  return value !== null && LINK_LANGUAGES.includes(value);
}

export function exerciseHref(exerciseId: string, phase: ExercisePhase): string {
  return `?ejercicio=${encodeURIComponent(exerciseId)}&paso=${phase}#laboratorio`;
}

export function campaignMissionHref(worldId: string, exerciseId: string): string {
  return `?campana=${encodeURIComponent(worldId)}&ejercicio=${encodeURIComponent(exerciseId)}&paso=learn#laboratorio`;
}

export function workshopExerciseHref(workshopId: string, exerciseId: string): string {
  return `?sistema=${encodeURIComponent(workshopId)}&ejercicio=${encodeURIComponent(exerciseId)}&paso=code#laboratorio`;
}

export function worldHref(worldId: string): string {
  return `?mundo=${encodeURIComponent(worldId)}#campana`;
}

export function workshopReturnHref(location: WorkshopLocation): string {
  return `?taller=${encodeURIComponent(location.workshopId)}&parte=${location.part}&lenguaje=${location.language}#sistemas`;
}

export function withLabQuery(
  current: URL,
  mode: 'map' | 'exercise',
  exerciseId: string,
  phase: ExercisePhase,
): URL {
  const url = new URL(current.href);
  if (mode === 'map') {
    url.searchParams.delete('campana');
    url.searchParams.delete('sistema');
  }
  if (mode === 'exercise') {
    url.searchParams.set('ejercicio', exerciseId);
    url.searchParams.set('paso', phase);
  } else {
    url.searchParams.delete('ejercicio');
    url.searchParams.delete('paso');
  }
  return url;
}

export function withWorldQuery(current: URL, worldId: string): URL {
  const url = new URL(current.href);
  url.search = '';
  url.searchParams.set('mundo', worldId);
  return url;
}

export function withWorkshopQuery(
  current: URL,
  language: string,
  workshopId: string | null,
  part: WorkshopPart,
): URL {
  const url = new URL(current.href);
  url.search = '';
  url.searchParams.set('lenguaje', language);
  if (workshopId) {
    url.searchParams.set('taller', workshopId);
    url.searchParams.set('parte', part);
  }
  return url;
}

export function withLanguageQuery(current: URL, view: View, language: string): URL {
  const url = new URL(current.href);
  if (view === 'sistemas') url.searchParams.set('lenguaje', language);
  else url.search = '';
  return url;
}
