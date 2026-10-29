import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import type { SystemsLanguage } from './types';

const selectionParsers = {
  lenguaje: parseAsStringLiteral(['rust', 'go'] as const),
  taller: parseAsString,
  parte: parseAsStringLiteral(['explore', 'build', 'ship'] as const)
    .withDefault('explore')
    .withOptions({ clearOnDefault: false }),
};

export interface WorkshopSelection {
  workshopId: string | null;
  part: WorkshopPart;
  open(workshopId: string): void;
  close(): void;
  changePart(workshopId: string, part: WorkshopPart): void;
}

const useWorkshopSelection = (language: SystemsLanguage): WorkshopSelection => {
  const [query, setQuery] = useQueryStates(selectionParsers, { history: 'replace' });
  return {
    workshopId: query.taller,
    part: query.parte,
    open(workshopId) {
      void setQuery({ lenguaje: language, taller: workshopId, parte: 'explore' });
    },
    close() {
      void setQuery({ lenguaje: language, taller: null, parte: null });
    },
    changePart(workshopId, part) {
      void setQuery({ lenguaje: language, taller: workshopId, parte: part });
    },
  };
};

export default useWorkshopSelection;
