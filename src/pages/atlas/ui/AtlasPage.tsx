import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { AtlasConcept, AtlasLanguage } from '../content/atlas-content';
import {
  clearFilters,
  selectConcept,
  setCategory,
  setLevel,
  setQuery,
  type AtlasSession,
} from '../model/atlas-session';
import { filterConcepts } from '../model/filter-concepts';
import AtlasFilters from './AtlasFilters';
import ConceptDetail from './ConceptDetail';
import ConceptIndex from './ConceptIndex';

interface AtlasPageProps {
  entries: AtlasConcept[];
  initialSession: AtlasSession;
  language: AtlasLanguage;
  onSessionChange: (session: AtlasSession) => void;
}

const AtlasPage = ({ entries, initialSession, language, onSessionChange }: AtlasPageProps) => {
  const [session, setSession] = useState(initialSession);
  const latestSession = useRef(initialSession);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const languageName = language === 'go' ? 'Go' : 'Rust';
  const categories = [...new Set(entries.map((entry) => entry.category))];
  const filtered = filterConcepts(entries, session);
  const selectedEntry =
    filtered.find((entry) => entry.id === session.selected) || filtered[0] || null;
  const selectedIndex = selectedEntry
    ? filtered.findIndex((entry) => entry.id === selectedEntry.id)
    : -1;

  const updateSession = (change: (current: AtlasSession) => AtlasSession) => {
    const next = change(latestSession.current);
    latestSession.current = next;
    onSessionChange(next);
    setSession(next);
  };

  const chooseConcept = (id: string) => {
    flushSync(() => updateSession((current) => selectConcept(current, id)));
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  };

  const resetFilters = () => {
    updateSession(clearFilters);
    searchInputRef.current?.focus();
  };

  const navigate = (offset: number) => {
    const target = filtered[selectedIndex + offset];
    if (target) chooseConcept(target.id);
  };

  return (
    <section className="atlas-shell" aria-labelledby="atlas-title">
      <header className="atlas-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" />
            ATLAS DEL LENGUAJE · {languageName.toUpperCase()}
          </p>
          <h1 id="atlas-title">
            Entender el <em>porqué.</em>
          </h1>
          <p>
            Un mapa para conectar las ideas. Explorá un concepto, leé su razonamiento y poné a
            prueba tu intuición antes de llevarlo al código.
          </p>
        </div>
        <div className="atlas-stamp" aria-label={`${entries.length} conceptos de ${languageName}`}>
          <span className="atlas-stamp-symbol" aria-hidden="true">
            {language === 'rust' ? '&' : '*'}
          </span>
          <strong>{entries.length} conceptos</strong>
          <span>DE LA SINTAXIS AL DISEÑO</span>
        </div>
      </header>

      <AtlasFilters
        filters={session}
        categories={categories}
        searchInputRef={searchInputRef}
        onQueryChange={(query) => updateSession((current) => setQuery(current, query))}
        onCategoryChange={(category) => updateSession((current) => setCategory(current, category))}
        onLevelChange={(level) => updateSession((current) => setLevel(current, level))}
        onClear={resetFilters}
      />

      <p id="atlas-results" className="atlas-results" role="status" aria-live="polite">
        {filtered.length} de {entries.length} conceptos · {languageName}
      </p>
      <div className="atlas-layout">
        <ConceptIndex
          concepts={entries}
          filtered={filtered}
          selectedId={selectedEntry?.id}
          language={language}
          onSelect={chooseConcept}
        />
        <div id="atlas-detail" className="atlas-detail">
          {selectedEntry ? (
            <ConceptDetail
              entry={selectedEntry}
              language={language}
              position={selectedIndex}
              total={filtered.length}
              session={session}
              headingRef={headingRef}
              onChange={updateSession}
              onNavigate={navigate}
            />
          ) : (
            <section className="atlas-empty">
              <span aria-hidden="true">∅</span>
              <h2>No encontré esa combinación.</h2>
              <p>Probá otra palabra o ampliá el nivel y el área para volver a explorar.</p>
              <button type="button" className="button secondary" onClick={resetFilters}>
                Mostrar todos los conceptos
              </button>
            </section>
          )}
        </div>
      </div>
      <p className="atlas-session-note">
        Las respuestas de este atlas se mantienen durante esta visita. Al recargar la página se
        reinician; tu progreso del laboratorio se guarda por separado.
      </p>
    </section>
  );
};

export default AtlasPage;
