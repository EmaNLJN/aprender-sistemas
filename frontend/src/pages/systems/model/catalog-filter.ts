import { normalizeSearchText } from '../../../shared/lib/normalize-search-text';
import type { CatalogFilter, WorkshopCategory, WorkshopFamily } from './types';

export interface SearchableWorkshop {
  id: string;
  title: string;
  subtitle: string;
  what: string;
  why: string;
  category: WorkshopCategory;
}

export const FAMILY_LABELS: Readonly<Record<WorkshopFamily, string>> = {
  all: 'Todo el taller',
  machine: 'Dentro de la máquina',
  infra: 'Datos e infraestructura',
  play: 'Gráficos, álgebra y juegos',
};

export const FAMILY_SYMBOLS: Readonly<Record<WorkshopCategory, string>> = {
  machine: '▧',
  infra: '⌘',
  play: '◈',
};

export const EMPTY_CATALOG_FILTER: CatalogFilter = { family: 'all', query: '' };

export function filterWorkshops<Workshop extends SearchableWorkshop>(
  workshops: readonly Workshop[],
  filter: CatalogFilter,
): Workshop[] {
  const query = normalizeSearchText(filter.query);
  return workshops.filter(
    (workshop) =>
      (filter.family === 'all' || workshop.category === filter.family) &&
      normalizeSearchText(
        [workshop.title, workshop.subtitle, workshop.what, workshop.why, workshop.id].join(' '),
      ).includes(query),
  );
}
