import { describe, expect, it } from 'vitest';
import { EMPTY_CATALOG_FILTER, FAMILY_LABELS, filterWorkshops, type SearchableWorkshop } from './catalog-filter';

const workshop = (overrides: Partial<SearchableWorkshop>): SearchableWorkshop => ({
  id: 'alfa',
  title: 'Alfa',
  subtitle: 'Beta',
  what: 'Gamma',
  why: 'Delta',
  category: 'machine',
  ...overrides,
});

const ids = (list: readonly SearchableWorkshop[]) => list.map((item) => item.id);

describe('filterWorkshops', () => {
  const catalog = [
    workshop({ id: 'cache', title: 'Una caché', category: 'machine' }),
    workshop({ id: 'wal', subtitle: 'Un registro previo', category: 'infra' }),
    workshop({ id: 'raster', what: 'Píxeles en fila', category: 'play' }),
    workshop({ id: 'quorum', why: 'Mayorías que se cruzan', category: 'infra' }),
  ];

  it('keeps every workshop with the empty filter, in order', () => {
    expect(ids(filterWorkshops(catalog, EMPTY_CATALOG_FILTER))).toEqual(['cache', 'wal', 'raster', 'quorum']);
  });

  it('keeps only the chosen family', () => {
    expect(ids(filterWorkshops(catalog, { family: 'infra', query: '' }))).toEqual(['wal', 'quorum']);
  });

  it('ignores accents and case', () => {
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'CACHE' }))).toEqual(['cache']);
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'pixeles' }))).toEqual(['raster']);
  });

  it('searches the subtitle, the why and the id', () => {
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'registro previo' }))).toEqual(['wal']);
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'mayorias' }))).toEqual(['quorum']);
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'quorum' }))).toEqual(['quorum']);
  });

  it('combines the family and the query', () => {
    expect(ids(filterWorkshops(catalog, { family: 'machine', query: 'registro' }))).toEqual([]);
  });

  it('does not trim the query', () => {
    const only = [workshop({ id: 'cache', title: 'Alfa', subtitle: 'Beta', what: 'Gamma', why: 'Delta' })];

    expect(ids(filterWorkshops(only, { family: 'all', query: ' cache' }))).toEqual(['cache']);
    expect(ids(filterWorkshops(only, { family: 'all', query: 'cache ' }))).toEqual([]);
  });
});

describe('FAMILY_LABELS', () => {
  it('lists the four families in the order of the filter buttons', () => {
    expect(Object.values(FAMILY_LABELS)).toEqual([
      'Todo el taller',
      'Dentro de la máquina',
      'Datos e infraestructura',
      'Gráficos, álgebra y juegos',
    ]);
  });
});
