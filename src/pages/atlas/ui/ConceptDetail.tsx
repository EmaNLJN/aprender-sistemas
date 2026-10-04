import type { RefObject } from 'react';
import { LEVEL_LABELS } from '../../../shared/config/levels';
import type { AtlasConcept, AtlasLanguage } from '../content/atlas-content';
import safeHttpsUrl from '../lib/safe-https-url';
import {
  answerQuiz,
  retryQuiz,
  toggleCompared,
  togglePitfall,
  type AtlasSession,
} from '../model/atlas-session';
import AdditionalSources from './AdditionalSources';
import ConceptQuiz from './ConceptQuiz';
import LevelMeter from './LevelMeter';
import Paragraphs from './Paragraphs';

interface ConceptDetailProps {
  entry: AtlasConcept;
  language: AtlasLanguage;
  position: number;
  total: number;
  session: AtlasSession;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onChange: (change: (current: AtlasSession) => AtlasSession) => void;
  onNavigate: (offset: number) => void;
}

const ConceptDetail = ({
  entry,
  language,
  position,
  total,
  session,
  headingRef,
  onChange,
  onNavigate,
}: ConceptDetailProps) => {
  const languageName = language === 'go' ? 'Go' : 'Rust';
  const compared = Boolean(session.compared[entry.id]);
  const pitfallShown = Boolean(session.pitfalls[entry.id]);
  const labLink = `?ejercicio=${encodeURIComponent(entry.labId)}&paso=learn#laboratorio`;

  const handleAnswer = (answer: number, button: HTMLButtonElement) => {
    onChange((current) => answerQuiz(current, entry.id, answer));
    button.focus({ preventScroll: true });
  };

  const handleRetry = () => onChange((current) => retryQuiz(current, entry.id));

  return (
    <article className="atlas-concept" aria-labelledby="atlas-concept-title">
      <header className="atlas-concept-heading">
        <div className="atlas-concept-meta">
          <span>
            <LevelMeter level={entry.level} />
            {LEVEL_LABELS[entry.level]}
          </span>
          <span>{entry.category}</span>
        </div>
        <h2 id="atlas-concept-title" tabIndex={-1} ref={headingRef}>
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
            onClick={() => onChange((current) => toggleCompared(current, entry.id))}
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
            onClick={() => onChange((current) => togglePitfall(current, entry.id))}
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

      <ConceptQuiz
        concept={entry}
        answer={session.answers[entry.id]}
        onAnswer={handleAnswer}
        onRetry={handleRetry}
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
          href={safeHttpsUrl(entry.source.url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {entry.source.title} <span aria-hidden="true">↗</span>
          <span className="atlas-sr-only"> (abre en una pestaña nueva)</span>
        </a>
        <AdditionalSources sources={entry.furtherSources} />
        <nav className="atlas-next" aria-label="Navegar conceptos filtrados">
          <button type="button" onClick={() => onNavigate(-1)} disabled={position === 0}>
            <span aria-hidden="true">←</span> Anterior
          </button>
          <span>
            {position + 1} / {total}
          </span>
          <button type="button" onClick={() => onNavigate(1)} disabled={position === total - 1}>
            Siguiente idea <span aria-hidden="true">→</span>
          </button>
        </nav>
      </footer>
    </article>
  );
};

export default ConceptDetail;
