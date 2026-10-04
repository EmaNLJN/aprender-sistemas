import type { RefObject } from 'react';
import { LEVEL_IDS, LEVEL_LABELS } from '../../../shared/config/levels';
import type { ConceptFilters, LevelFilter } from '../model/filter-concepts';

interface AtlasFiltersProps {
  filters: ConceptFilters;
  categories: string[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onLevelChange: (level: LevelFilter) => void;
  onClear: () => void;
}

const LEVEL_OPTIONS: Array<{ value: LevelFilter; label: string }> = [
  { value: 'all', label: 'Todos los niveles' },
  ...LEVEL_IDS.map((id) => ({ value: id, label: LEVEL_LABELS[id] })),
];

const AtlasFilters = ({
  filters,
  categories,
  searchInputRef,
  onQueryChange,
  onCategoryChange,
  onLevelChange,
  onClear,
}: AtlasFiltersProps) => (
  <>
    <div className="atlas-tools">
      <label className="atlas-search">
        <span className="atlas-field-label">Buscar una idea</span>
        <span className="atlas-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchInputRef}
            id="atlas-search"
            type="search"
            value={filters.query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Punteros, funciones, memoria…"
            autoComplete="off"
            maxLength={160}
          />
        </span>
      </label>
      <label className="atlas-category">
        <span className="atlas-field-label">Área del lenguaje</span>
        <select
          id="atlas-category"
          value={filters.category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="all">Todas las áreas</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div className="atlas-filter-row">
      <div className="atlas-levels" role="group" aria-label="Filtrar conceptos por nivel">
        {LEVEL_OPTIONS.map(({ value, label }) => (
          <button
            type="button"
            className="atlas-level-filter"
            aria-pressed={filters.level === value}
            onClick={() => onLevelChange(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="button" className="atlas-reset" onClick={onClear}>
        Limpiar filtros ↺
      </button>
    </div>
  </>
);

export default AtlasFilters;
