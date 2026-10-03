import type { ConceptFilters, LevelFilter } from './filter-concepts';

export interface AtlasSession extends ConceptFilters {
  selected: string | null;
  answers: Record<string, number>;
  compared: Record<string, boolean>;
  pitfalls: Record<string, boolean>;
}

export const createAtlasSession = (): AtlasSession => ({
  query: '',
  level: 'all',
  category: 'all',
  selected: null,
  answers: {},
  compared: {},
  pitfalls: {},
});

export const setQuery = (session: AtlasSession, query: string): AtlasSession => ({
  ...session,
  query,
});

export const setLevel = (session: AtlasSession, level: LevelFilter): AtlasSession => ({
  ...session,
  level,
});

export const setCategory = (session: AtlasSession, category: string): AtlasSession => ({
  ...session,
  category,
});

export const selectConcept = (session: AtlasSession, id: string): AtlasSession => ({
  ...session,
  selected: id,
});

export const clearFilters = (session: AtlasSession): AtlasSession => ({
  ...session,
  query: '',
  level: 'all',
  category: 'all',
});

export const toggleCompared = (session: AtlasSession, id: string): AtlasSession => ({
  ...session,
  compared: { ...session.compared, [id]: !session.compared[id] },
});

export const togglePitfall = (session: AtlasSession, id: string): AtlasSession => ({
  ...session,
  pitfalls: { ...session.pitfalls, [id]: !session.pitfalls[id] },
});

export const answerQuiz = (session: AtlasSession, id: string, answer: number): AtlasSession => ({
  ...session,
  answers: { ...session.answers, [id]: answer },
});

export const retryQuiz = (session: AtlasSession, id: string): AtlasSession => {
  const answers = { ...session.answers };
  delete answers[id];
  return { ...session, answers };
};
