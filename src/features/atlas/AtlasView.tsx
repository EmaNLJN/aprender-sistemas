import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AtlasConcept, AtlasLanguage, AtlasLevel } from './atlas-content';

export type AtlasSession = {
  query: string;
  level: 'all' | AtlasLevel;
  category: string;
  selected: string | null;
  answers: Record<string, number>;
  compared: Record<string, boolean>;
  pitfalls: Record<string, boolean>;
};

type AtlasViewProps = {
  entries: AtlasConcept[];
  initialSession: AtlasSession;
  language: AtlasLanguage;
  onSessionChange: (session: AtlasSession) => void;
};

type SessionChange = (current: AtlasSession) => AtlasSession;
type ToggleRecord = 'compared' | 'pitfalls';

const LEVELS: Array<['all' | AtlasLevel, string]> = [
  ['all', 'Todos los niveles'],
  ['beginner', 'Principiante'],
  ['medium', 'Intermedio'],
  ['advanced', 'Avanzado'],
  ['expert', 'Experto'],
];
const LEVEL_NAMES = Object.fromEntries(LEVELS) as Record<'all' | AtlasLevel, string>;
const LEVEL_RANKS: Record<AtlasLevel, number> = { beginner: 1, medium: 2, advanced: 3, expert: 4 };

function normalize(value: string) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function safeLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '#';
  } catch {
    return '#';
  }
}

function Paragraphs({ children }: { children: ReactNode }) {
  return String(children || '')
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph, paragraphIndex) => (
      <p key={paragraphIndex}>
        {paragraph.split('\n').map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))}
      </p>
    ));
}

function LevelMeter({ level }: { level: AtlasLevel }) {
  return (
    <span className="atlas-level-meter" aria-hidden="true">
      {[1, 2, 3, 4].map((rank) => (
        <i className={rank <= LEVEL_RANKS[level] ? 'filled' : undefined} key={rank} />
      ))}
    </span>
  );
}

function Quiz({
  entry,
  answer,
  onAnswer,
  onRetry,
}: {
  entry: AtlasConcept;
  answer: number | undefined;
  onAnswer: (answer: number, button: HTMLButtonElement) => void;
  onRetry: () => void;
}) {
  const answered = Number.isInteger(answer);
  const correct = answered && answer === entry.quiz.answer;
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  function retryAndFocusFirstOption() {
    onRetry();
    requestAnimationFrame(() => firstOptionRef.current?.focus({ preventScroll: true }));
  }

  return (
    <section className="atlas-quiz" aria-labelledby="atlas-quiz-title">
      <div className="atlas-block-kicker">
        <span aria-hidden="true">?</span>ANTES DE SEGUIR
      </div>
      <h3 id="atlas-quiz-title">{entry.quiz.question}</h3>
      <div className="atlas-quiz-options" role="group" aria-label="Elegí tu predicción">
        {entry.quiz.options.map((option, index) => {
          const picked = answered && answer === index;
          const stateClass = picked ? (correct ? ' is-correct' : ' is-selected') : '';
          return (
            <button
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              className={`atlas-answer${stateClass}`}
              aria-pressed={picked}
              onClick={(event: MouseEvent<HTMLButtonElement>) =>
                onAnswer(index, event.currentTarget)
              }
              key={option}
            >
              <span className="atlas-answer-letter" aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      <div
        id="atlas-feedback"
        className={`atlas-feedback${answered ? (correct ? ' is-correct' : ' is-explained') : ''}`}
        role="status"
        aria-live="polite"
      >
        {answered ? (
          <>
            <strong>{correct ? 'Sí: esa es la idea.' : 'Esta diferencia importa.'}</strong>
            <p>
              {correct
                ? null
                : `La opción correcta es «${entry.quiz.options[entry.quiz.answer]}». `}
              {entry.quiz.explanation}
            </p>
            <button type="button" className="atlas-reset" onClick={retryAndFocusFirstOption}>
              Volver a pensar la pregunta ↺
            </button>
          </>
        ) : (
          <p>
            Elegí una respuesta para ver la explicación. Equivocarte también sirve para encontrar
            qué idea revisar.
          </p>
        )}
      </div>
    </section>
  );
}

function AdditionalSources({ sources }: { sources: AtlasConcept['furtherSources'] }) {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  return (
    <div className="atlas-more-sources">
      <span className="atlas-block-kicker">PARA ESPECIALIZARTE</span>
      {sources.map((source) => (
        <a
          className="atlas-source"
          href={safeLink(source.url)}
          target="_blank"
          rel="noopener noreferrer"
          key={source.url}
        >
          {source.title} ↗
        </a>
      ))}
    </div>
  );
}

function ConceptDetail({
  entry,
  language,
  position,
  total,
  session,
  updateSession,
  navigate,
}: {
  entry: AtlasConcept;
  language: AtlasLanguage;
  position: number;
  total: number;
  session: AtlasSession;
  updateSession: (change: SessionChange) => void;
  navigate: (offset: number) => void;
}) {
  const languageName = language === 'go' ? 'Go' : 'Rust';
  const compared = Boolean(session.compared[entry.id]);
  const pitfallShown = Boolean(session.pitfalls[entry.id]);
  const labLink = `?ejercicio=${encodeURIComponent(entry.labId)}&paso=learn#laboratorio`;

  function toggleRecord(recordName: ToggleRecord) {
    updateSession((current) => ({
      ...current,
      [recordName]: { ...current[recordName], [entry.id]: !current[recordName][entry.id] },
    }));
  }

  function answerQuiz(answer: number, button: HTMLButtonElement) {
    updateSession((current) => ({
      ...current,
      answers: { ...current.answers, [entry.id]: answer },
    }));
    button.focus({ preventScroll: true });
  }

  function retryQuiz() {
    updateSession((current) => {
      const answers = { ...current.answers };
      delete answers[entry.id];
      return { ...current, answers };
    });
  }

  return (
    <article className="atlas-concept" aria-labelledby="atlas-concept-title">
      <header className="atlas-concept-heading">
        <div className="atlas-concept-meta">
          <span>
            <LevelMeter level={entry.level} />
            {LEVEL_NAMES[entry.level] || entry.level}
          </span>
          <span>{entry.category}</span>
        </div>
        <h2 id="atlas-concept-title" tabIndex={-1}>
          {entry.title}
        </h2>
        <p className="atlas-summary">{entry.summary}</p>
      </header>

      <section className="atlas-why" aria-labelledby="atlas-why-title">
        <span className="atlas-why-icon" aria-hidden="true">
          ∴
        </span>
        <div>
          <h3 id="atlas-why-title">Por qué existe esta idea</h3>
          <Paragraphs>{entry.why}</Paragraphs>
        </div>
      </section>

      <section className="atlas-example" aria-labelledby="atlas-example-title">
        <div className="atlas-code-title">
          <h3 id="atlas-example-title">Leé el código con intención.</h3>
          <span>{languageName} · EJEMPLO ILUSTRATIVO</span>
        </div>
        <pre
          className="atlas-code"
          tabIndex={0}
          aria-label={`Ejemplo ilustrativo de ${languageName}, desplazable`}
        >
          <code>{entry.code}</code>
        </pre>
        <p className="atlas-code-caption">
          Este fragmento explica un concepto; puede necesitar contexto para compilar. Para editar y
          ejecutar, abrí el ejercicio relacionado.
        </p>
        <div className="atlas-explanation">
          <span className="atlas-block-kicker">LO QUE ESTÁ PASANDO</span>
          <Paragraphs>{entry.explanation}</Paragraphs>
        </div>
      </section>

      <div className="atlas-perspectives">
        <section className="atlas-perspective">
          <button
            type="button"
            className="atlas-disclosure"
            aria-expanded={compared}
            aria-controls="atlas-comparison"
            onClick={() => toggleRecord('compared')}
          >
            <span>
              <span className="atlas-disclosure-icon" aria-hidden="true">
                ⇄
              </span>
              Ver la comparación
            </span>
            <span aria-hidden="true">{compared ? '−' : '+'}</span>
          </button>
          <div id="atlas-comparison" className="atlas-disclosure-body" hidden={!compared}>
            <Paragraphs>{entry.comparison}</Paragraphs>
          </div>
        </section>
        <section className="atlas-perspective">
          <button
            type="button"
            className="atlas-disclosure"
            aria-expanded={pitfallShown}
            aria-controls="atlas-pitfall"
            onClick={() => toggleRecord('pitfalls')}
          >
            <span>
              <span className="atlas-disclosure-icon" aria-hidden="true">
                !
              </span>
              Mostrar la trampa habitual
            </span>
            <span aria-hidden="true">{pitfallShown ? '−' : '+'}</span>
          </button>
          <div
            id="atlas-pitfall"
            className="atlas-disclosure-body atlas-pitfall"
            hidden={!pitfallShown}
          >
            <Paragraphs>{entry.pitfall}</Paragraphs>
          </div>
        </section>
      </div>

      <Quiz
        entry={entry}
        answer={session.answers[entry.id]}
        onAnswer={answerQuiz}
        onRetry={retryQuiz}
      />

      <footer className="atlas-concept-footer">
        <div className="atlas-practice-callout">
          <div>
            <span className="atlas-block-kicker">DE LA IDEA A LAS MANOS</span>
            <h3>Hacelo funcionar.</h3>
            <p>Practicá este concepto con código editable, compilador real y revisión explicada.</p>
          </div>
          <a className="button" href={labLink}>
            Ir al laboratorio <span aria-hidden="true">↗</span>
          </a>
        </div>
        <a
          className="atlas-source"
          href={safeLink(entry.source.url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {entry.source.title} <span aria-hidden="true">↗</span>
          <span className="atlas-sr-only"> (abre en una pestaña nueva)</span>
        </a>
        <AdditionalSources sources={entry.furtherSources} />
        <nav className="atlas-next" aria-label="Navegar conceptos filtrados">
          <button type="button" onClick={() => navigate(-1)} disabled={position === 0}>
            <span aria-hidden="true">←</span> Anterior
          </button>
          <span>
            {position + 1} / {total}
          </span>
          <button type="button" onClick={() => navigate(1)} disabled={position === total - 1}>
            Siguiente idea <span aria-hidden="true">→</span>
          </button>
        </nav>
      </footer>
    </article>
  );
}

export function AtlasView({ entries, initialSession, language, onSessionChange }: AtlasViewProps) {
  const [session, setSession] = useState(initialSession);
  const sessionRef = useRef(initialSession);
  const focusConceptAfterRender = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const languageName = language === 'go' ? 'Go' : 'Rust';
  const categories = useMemo(() => [...new Set(entries.map((entry) => entry.category))], [entries]);
  const filtered = useMemo(() => {
    const words = normalize(session.query).trim().split(/\s+/).filter(Boolean);
    return entries.filter(
      (entry) =>
        (session.level === 'all' || entry.level === session.level) &&
        (session.category === 'all' || entry.category === session.category) &&
        words.every((word) =>
          normalize(
            [
              entry.title,
              entry.category,
              entry.summary,
              entry.why,
              entry.comparison,
              entry.code,
            ].join(' '),
          ).includes(word),
        ),
    );
  }, [entries, session.category, session.level, session.query]);
  const selectedEntry =
    filtered.find((entry) => entry.id === session.selected) || filtered[0] || null;
  const selectedIndex = selectedEntry
    ? filtered.findIndex((entry) => entry.id === selectedEntry.id)
    : -1;

  useEffect(() => {
    if (!focusConceptAfterRender.current) return;
    focusConceptAfterRender.current = false;
    const heading = document.querySelector<HTMLHeadingElement>('#atlas-concept-title');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });

  function updateSession(change: SessionChange) {
    const next = change(sessionRef.current);
    sessionRef.current = next;
    onSessionChange(next);
    setSession(next);
  }

  function selectTopic(id: string) {
    focusConceptAfterRender.current = true;
    updateSession((current) => ({ ...current, selected: id }));
  }

  function resetFilters() {
    updateSession((current) => ({ ...current, query: '', level: 'all', category: 'all' }));
    searchInput.current?.focus();
  }

  function navigate(offset: number) {
    const target = filtered[selectedIndex + offset];
    if (target) selectTopic(target.id);
  }

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

      <div className="atlas-tools">
        <label className="atlas-search">
          <span className="atlas-field-label">Buscar una idea</span>
          <span className="atlas-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchInput}
              id="atlas-search"
              type="search"
              value={session.query}
              onChange={(event) =>
                updateSession((current) => ({ ...current, query: event.target.value }))
              }
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
            value={session.category}
            onChange={(event) =>
              updateSession((current) => ({ ...current, category: event.target.value }))
            }
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
          {LEVELS.map(([value, label]) => (
            <button
              type="button"
              className="atlas-level-filter"
              aria-pressed={session.level === value}
              onClick={() => updateSession((current) => ({ ...current, level: value }))}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="atlas-reset" onClick={resetFilters}>
          Limpiar filtros ↺
        </button>
      </div>

      <p id="atlas-results" className="atlas-results" role="status" aria-live="polite">
        {filtered.length} de {entries.length} conceptos · {languageName}
      </p>
      <div className="atlas-layout">
        <details className="atlas-index" open>
          <summary>
            <span>Índice de conceptos</span>
            <span id="atlas-index-count">{String(filtered.length).padStart(2, '0')}</span>
          </summary>
          <nav id="atlas-topics" aria-label={`Conceptos de ${languageName}`}>
            {filtered.length > 0 ? (
              filtered.map((entry) => {
                const index = entries.findIndex((candidate) => candidate.id === entry.id) + 1;
                return (
                  <button
                    type="button"
                    className="atlas-topic"
                    aria-current={entry.id === selectedEntry?.id ? 'true' : undefined}
                    aria-controls="atlas-detail"
                    onClick={() => selectTopic(entry.id)}
                    key={entry.id}
                  >
                    <span className="atlas-topic-number">{String(index).padStart(2, '0')}</span>
                    <span>
                      <strong>{entry.title}</strong>
                      <small>{LEVEL_NAMES[entry.level] || entry.level}</small>
                    </span>
                    <span className="atlas-topic-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="atlas-index-empty">No hay coincidencias con estos filtros.</p>
            )}
          </nav>
          <p className="atlas-index-note">
            Elegí por curiosidad o avanzá en orden. Podés cambiar el lenguaje arriba.
          </p>
        </details>
        <div id="atlas-detail" className="atlas-detail">
          {selectedEntry ? (
            <ConceptDetail
              entry={selectedEntry}
              language={language}
              position={selectedIndex}
              total={filtered.length}
              session={session}
              updateSession={updateSession}
              navigate={navigate}
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
}
