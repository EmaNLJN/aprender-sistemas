import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { EMPTY_CATALOG_FILTER, FAMILY_LABELS, filterWorkshops } from '../model/catalog-filter';
import { readCatalogFilter, saveCatalogFilter } from '../model/systems-session';
import type {
  CatalogFilter,
  SystemsLanguage,
  SystemsWorkshopView,
  WorkshopFamily,
} from '../model/types';
import ExternalTools from './ExternalTools';
import WorkshopCard from './WorkshopCard';

interface SystemsCatalogProps {
  language: SystemsLanguage;
  workshops: readonly SystemsWorkshopView[];
  returnFocusTo: string | null;
  onOpen: (workshopId: string) => void;
}

const FAMILIES = Object.entries(FAMILY_LABELS) as [WorkshopFamily, string][];

const SystemsCatalog = ({ language, workshops, returnFocusTo, onOpen }: SystemsCatalogProps) => {
  const [filter, setFilter] = useState<CatalogFilter>(readCatalogFilter);
  const searchRef = useRef<HTMLInputElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const languageName = language === 'rust' ? 'Rust' : 'Go';
  const done = workshops.filter((workshop) => workshop.completed).length;
  const visible = filterWorkshops(workshops, filter);

  useLayoutEffect(() => {
    if (returnFocusTo === null) return;
    const target = openButtons.current.get(returnFocusTo) ?? searchRef.current;
    target?.focus({ preventScroll: true });
  }, [returnFocusTo]);

  const updateFilter = (next: CatalogFilter) => {
    setFilter(next);
    saveCatalogFilter(next);
  };

  const clearFilter = () => {
    // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- the search box takes the focus after the filter is cleared
    flushSync(() => updateFilter(EMPTY_CATALOG_FILTER));
    searchRef.current?.focus();
  };

  const registerOpenButton = (workshopId: string) => (node: HTMLButtonElement) => {
    openButtons.current.set(workshopId, node);
    return () => {
      openButtons.current.delete(workshopId);
    };
  };

  return (
    <>
      <section className="sys-hero">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line"></span> SISTEMAS · APRENDER DESARMANDO
          </div>
          <h1>
            Abrí la caja.
            <br />
            <em>Construí lo que hay adentro.</em>
          </h1>
          <p>
            Memoria que se fragmenta. Bases de datos que sobreviven a un corte. Rayos que dibujan un
            mundo. Hacé visible una idea, provocá un fallo y construí su núcleo en {languageName}.
          </p>
          <div className="sys-pills">
            <span>{`${workshops.length} talleres`}</span>
            <span>{`${workshops.length * 2} núcleos programables`}</span>
            <span>Modelos paso a paso</span>
          </div>
        </div>
        <div className="sys-hero-board" aria-hidden="true">
          <div className="sys-board-row">
            <span>01</span>
            <b>ESTADO</b>
            <i>▧</i>
          </div>
          <div className="sys-board-path">↓ proponer · observar · explicar</div>
          <div className="sys-board-row">
            <span>10</span>
            <b>REGLA</b>
            <i>⌘</i>
          </div>
          <div className="sys-board-path">↓ escribir · comprobar · cambiar</div>
          <div className="sys-board-row last">
            <span>11</span>
            <b>PROYECTO</b>
            <i>◈</i>
          </div>
        </div>
      </section>
      <div className="sys-overview-progress">
        <div>
          <strong>{`${done} / ${workshops.length}`}</strong>
          <span>{`talleres con sus tres sellos en ${languageName}`}</span>
        </div>
        <progress
          value={done}
          max={workshops.length}
          aria-label="Talleres con modelo, código y checkpoint completados"
        ></progress>
      </div>
      <section className="sys-start">
        <h2>Elegí una curiosidad. Seguí sus consecuencias.</h2>
        <p>
          En cada taller: explorás tres situaciones, verificás un núcleo con pruebas reales y
          razonás un checkpoint. Después podés descargar tu proyecto y ampliarlo. El proyecto
          completo tiene criterios manuales; los sellos registran el trabajo del taller.
        </p>
      </section>
      <div className="sys-toolbar">
        <div className="sys-filters" role="group" aria-label="Familia de talleres">
          {FAMILIES.map(([family, label]) => (
            <button
              key={family}
              aria-pressed={filter.family === family}
              onClick={() => updateFilter({ ...filter, family })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="sys-search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            id="sys-search"
            type="search"
            autoComplete="off"
            placeholder="Caché, rayos, kernel, colisiones…"
            aria-label="Buscar talleres de sistemas"
            value={filter.query}
            onChange={(event) => updateFilter({ ...filter, query: event.target.value })}
          />
        </label>
      </div>
      <p id="sys-count" className="sys-result-count" role="status">
        {visible.length} talleres para explorar
      </p>
      <div id="sys-catalog" className="sys-catalog">
        {visible.length ? (
          visible.map((workshop) => (
            <WorkshopCard
              key={workshop.id}
              workshop={workshop}
              openRef={registerOpenButton(workshop.id)}
              onOpen={onOpen}
            />
          ))
        ) : (
          <div className="lab-empty">
            <h2>No aparece ese taller.</h2>
            <p>Probá otra idea o quitá los filtros.</p>
            <button className="button secondary" onClick={clearFilter}>
              Ver todos los talleres
            </button>
          </div>
        )}
      </div>
      <ExternalTools />
      <details className="sys-boundaries">
        <summary>Del modelo a una implementación real</summary>
        <p>
          Los modelos corren localmente y explican sus reglas. Tu código se compila con el runner de
          Rust o Go. Un MMU de papel no programa la MMU física; una cola visual no simula el
          scheduler completo del sistema operativo. Cada taller delimita qué enseña, enlaza fuentes
          y propone pasos concretos para seguir fuera del navegador.
        </p>
        <p>
          Los proyectos reutilizan el IDE, el runner y un formato común de modelos, objetivos y
          pruebas. Las descargas ZIP usan{' '}
          <a href="https://github.com/101arrowz/fflate" target="_blank" rel="noopener noreferrer">
            fflate
          </a>
          . Tu avance sigue siendo local y se incluye al exportar la guía.
        </p>
      </details>
    </>
  );
};

export default SystemsCatalog;
