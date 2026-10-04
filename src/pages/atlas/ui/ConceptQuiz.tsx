import { useRef } from 'react';
import type { AtlasConcept } from '../content/atlas-content';

interface ConceptQuizProps {
  concept: AtlasConcept;
  answer: number | undefined;
  onAnswer: (answer: number, button: HTMLButtonElement) => void;
  onRetry: () => void;
}

const ConceptQuiz = ({ concept, answer, onAnswer, onRetry }: ConceptQuizProps) => {
  const { quiz } = concept;
  const answered = Number.isInteger(answer);
  const correct = answered && answer === quiz.answer;
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  const retryAndFocusFirstOption = () => {
    onRetry();
    requestAnimationFrame(() => firstOptionRef.current?.focus({ preventScroll: true }));
  };

  return (
    <section className="atlas-quiz" aria-labelledby="atlas-quiz-title">
      <div className="atlas-block-kicker">
        <span aria-hidden="true">?</span>ANTES DE SEGUIR
      </div>
      <h3 id="atlas-quiz-title">{quiz.question}</h3>
      <div className="atlas-quiz-options" role="group" aria-label="Elegí tu predicción">
        {quiz.options.map((option, index) => {
          const picked = answered && answer === index;
          const stateClass = picked ? (correct ? ' is-correct' : ' is-selected') : '';
          return (
            <button
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              className={`atlas-answer${stateClass}`}
              aria-pressed={picked}
              onClick={(event) => onAnswer(index, event.currentTarget)}
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
              {correct ? null : `La opción correcta es «${quiz.options[quiz.answer]}». `}
              {quiz.explanation}
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
};

export default ConceptQuiz;
