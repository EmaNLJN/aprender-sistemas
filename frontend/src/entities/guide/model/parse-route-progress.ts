import type { ParsedState } from '../../../shared/lib/versioned-storage';
import { MILESTONE_IDS } from './milestone-ids';
import type { RouteProgressV1 } from './route-progress';
import type { GuideData } from './types';

export const ROUTE_FORMAT_ERROR = 'Formato de progreso no compatible.';

const LANGUAGES = ['rust', 'go'] as const;
const NOTE_FIELDS = ['learned', 'next'] as const;

const MINUTE_OPTIONS: readonly unknown[] = [15, 25, 45];

interface RawRoute {
  version?: unknown;
  language?: unknown;
  completed?: unknown;
  milestones?: unknown;
  favorites?: unknown;
  minutes?: unknown;
  quizAnswers?: unknown;
  notes?: Record<string, Record<string, unknown> | undefined>;
}

function isObjectLike(value: unknown): value is RawRoute {
  return Boolean(value) && typeof value === 'object';
}

export function blankRouteProgress(): RouteProgressV1 {
  return {
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  };
}

export function parseRouteProgress(raw: unknown, guide: GuideData): ParsedState<RouteProgressV1> {
  if (!isObjectLike(raw) || raw.version !== 1) throw new Error(ROUTE_FORMAT_ERROR);
  const allSteps = Object.values(guide.tracks).flatMap((track) =>
    track.modules.flatMap((module) => module.steps),
  );
  const stepIds = new Set(allSteps.map((step) => step.id));
  const resourceIds = new Set(guide.resources.map((resource) => resource.id));
  const milestoneIds = new Set(MILESTONE_IDS);
  const result = blankRouteProgress();
  let dropped = 0;
  const languageIsValid = raw.language === 'rust' || raw.language === 'go';
  if (raw.language !== undefined && !languageIsValid) dropped++;
  result.language = raw.language === 'go' ? 'go' : 'rust';
  const filtered = (items: unknown, valid: Set<string>): string[] => {
    if (items === undefined) return [];
    if (!Array.isArray(items)) {
      dropped++;
      return [];
    }
    const kept = items.filter((id): id is string => typeof id === 'string' && valid.has(id));
    dropped += items.length - kept.length;
    return [...new Set(kept)];
  };
  result.completed = filtered(raw.completed, stepIds);
  result.milestones = filtered(raw.milestones, milestoneIds);
  result.favorites = filtered(raw.favorites, resourceIds);
  if (MINUTE_OPTIONS.includes(raw.minutes)) result.minutes = raw.minutes as number;
  else if (raw.minutes !== undefined) dropped++;
  for (const language of LANGUAGES)
    for (const field of NOTE_FIELDS) {
      const value = raw.notes?.[language]?.[field];
      if (typeof value === 'string') result.notes[language][field] = value.slice(0, 20000);
      else if (value !== undefined) dropped++;
    }
  const answers = (isObjectLike(raw.quizAnswers) ? raw.quizAnswers : {}) as Record<string, unknown>;
  if (raw.quizAnswers !== undefined && answers !== raw.quizAnswers) dropped++;
  for (const step of allSteps) {
    const answer = answers[step.id] as number;
    if (Number.isInteger(answer) && answer >= 0 && answer < step.quiz.options.length)
      result.quizAnswers[step.id] = answer;
  }
  dropped += Object.keys(answers).length - Object.keys(result.quizAnswers).length;
  return { state: result, dropped };
}
