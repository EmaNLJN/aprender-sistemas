import { isBlankText } from '../../../shared/lib/is-blank-text';

export interface RouteNotes {
  learned: string;
  next: string;
}

export interface RouteProgressV1 {
  version: 1;
  language: 'rust' | 'go';
  completed: string[];
  milestones: string[];
  favorites: string[];
  quizAnswers: Record<string, number>;
  notes: Record<'rust' | 'go', RouteNotes>;
  minutes: number;
}

function mergeNotes(base: RouteNotes, incoming: RouteNotes): RouteNotes {
  return {
    learned: isBlankText(incoming.learned) ? base.learned : incoming.learned,
    next: isBlankText(incoming.next) ? base.next : incoming.next,
  };
}

// Merges `incoming` over `base` without mutating either: sets are unioned (`base` first),
// answers and notes with text from `incoming` win, and the language and minutes come
// from `base`.
export function mergeRouteProgress(
  base: RouteProgressV1,
  incoming: RouteProgressV1,
): RouteProgressV1 {
  return {
    ...base,
    completed: [...new Set([...base.completed, ...incoming.completed])],
    milestones: [...new Set([...base.milestones, ...incoming.milestones])],
    favorites: [...new Set([...base.favorites, ...incoming.favorites])],
    quizAnswers: { ...base.quizAnswers, ...incoming.quizAnswers },
    notes: {
      rust: mergeNotes(base.notes.rust, incoming.notes.rust),
      go: mergeNotes(base.notes.go, incoming.notes.go),
    },
  };
}
