import { systemsEngine } from '../../../entities/systems-workshop';
import { celebrate } from '../../../shared/lib/celebration';
import type { SystemsLanguage, SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';

interface CheckpointProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  notify: (message: string) => void;
}

function answerClass(answer: number | null, index: number, correct: number): string {
  if (answer !== index) return '';
  return index === correct ? 'correct' : 'incorrect';
}

const Checkpoint = ({ workshop, language, notify }: CheckpointProps) => {
  const { prediction } = workshop;
  const answer = workshop.progress.answer;

  const choose = (index: number) => {
    const before = workshopView(workshop.id, language);
    const result = systemsEngine.answer(workshop.id, language, index);
    if (!before.completed && result.completed) celebrate();
    notify(
      result.correct
        ? 'Checkpoint razonado. Contrastá la explicación con tu experimento.'
        : 'Revisá el porqué y probá otra explicación.',
    );
  };

  return (
    <section className="sys-checkpoint">
      <div className="small-label">CHECKPOINT · EXPLICÁ LA DECISIÓN</div>
      <h2>{prediction.question}</h2>
      <div className="sys-answers">
        {prediction.options.map((option, index) => (
          <button
            key={index}
            aria-pressed={answer === index}
            className={answerClass(answer, index, prediction.answer)}
            onClick={() => choose(index)}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            {option}
          </button>
        ))}
      </div>
      <div className="sys-feedback" role="status">
        {answer === null ? (
          'Probá una explicación. Después contrastala con el porqué.'
        ) : (
          <>
            <strong>
              {answer === prediction.answer ? 'Esa es la idea.' : 'Revisemos esa decisión.'}
            </strong>{' '}
            {prediction.explanation}
          </>
        )}
      </div>
    </section>
  );
};

export default Checkpoint;
