import { LEVEL_LABELS } from '../../../shared/config/levels';
import type { AtlasConcept, AtlasLanguage } from '../content/atlas-content';

interface ConceptIndexProps {
  concepts: AtlasConcept[];
  filtered: AtlasConcept[];
  selectedId: string | undefined;
  language: AtlasLanguage;
  onSelect: (id: string) => void;
}

const ConceptIndex = ({
  concepts,
  filtered,
  selectedId,
  language,
  onSelect,
}: ConceptIndexProps) => {
  const languageName = language === 'go' ? 'Go' : 'Rust';

  return (
    <details className="atlas-index" open>
      <summary>
        <span>Índice de conceptos</span>
        <span id="atlas-index-count">{String(filtered.length).padStart(2, '0')}</span>
      </summary>
      <nav id="atlas-topics" aria-label={`Conceptos de ${languageName}`}>
        {filtered.length > 0 ? (
          filtered.map((concept) => {
            const number = concepts.findIndex((candidate) => candidate.id === concept.id) + 1;
            return (
              <button
                type="button"
                className="atlas-topic"
                aria-current={concept.id === selectedId ? 'true' : undefined}
                aria-controls="atlas-detail"
                onClick={() => onSelect(concept.id)}
                key={concept.id}
              >
                <span className="atlas-topic-number">{String(number).padStart(2, '0')}</span>
                <span>
                  <strong>{concept.title}</strong>
                  <small>{LEVEL_LABELS[concept.level]}</small>
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
  );
};

export default ConceptIndex;
