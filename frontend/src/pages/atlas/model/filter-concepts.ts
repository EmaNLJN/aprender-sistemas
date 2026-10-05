import { normalizeSearchText } from '../../../shared/lib/normalize-search-text';
import type { LevelId } from '../../../shared/config/levels';
import type { AtlasConcept } from './types';

export type LevelFilter = 'all' | LevelId;

export interface ConceptFilters {
  query: string;
  level: LevelFilter;
  category: string;
}

const searchableText = (concept: AtlasConcept): string =>
  normalizeSearchText(
    [
      concept.title,
      concept.category,
      concept.summary,
      concept.why,
      concept.comparison,
      concept.code,
    ].join(' '),
  );

export const filterConcepts = (
  concepts: AtlasConcept[],
  { query, level, category }: ConceptFilters,
): AtlasConcept[] => {
  const words = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  return concepts.filter((concept) => {
    if (level !== 'all' && concept.level !== level) return false;
    if (category !== 'all' && concept.category !== category) return false;
    const text = searchableText(concept);
    return words.every((word) => text.includes(word));
  });
};
