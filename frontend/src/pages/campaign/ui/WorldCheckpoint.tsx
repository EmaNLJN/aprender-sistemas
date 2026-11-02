import { PASS_SCORE, type DerivedWorld } from '../../../entities/campaign';

interface WorldCheckpointProps {
  world: DerivedWorld;
  onAnswer: (worldId: string, index: number, option: HTMLButtonElement) => void;
}

const WorldCheckpoint = ({ world, onAnswer }: WorldCheckpointProps) => {
  const question = world.checkpoint;
  const answer = world.checkpointAnswer;
  return (
    <section className="quest-checkpoint" id="quest-checkpoint" aria-labelledby="checkpoint-title">
      <div className="checkpoint-heading">
        <span aria-hidden="true">{world.checkpointPassed ? '✓' : '?'}</span>
        <div>
          <span className="small-label">CHECKPOINT · LA ÚLTIMA LLAVE</span>
          <h3 id="checkpoint-title">
            {world.checkpointPassed
              ? 'Una idea que ya podés explicar.'
              : 'El código funciona. ¿Sabés por qué?'}
          </h3>
        </div>
      </div>
      {world.checkpointReady ? (
        <>
          <p className="checkpoint-question">{question.question}</p>
          <div className="checkpoint-options">
            {question.options.map((option, index) => (
              <button
                key={index}
                aria-pressed={answer === index}
                className={
                  answer === index ? (index === question.answer ? 'correct' : 'incorrect') : ''
                }
                onClick={(event) => onAnswer(world.id, index, event.currentTarget)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option}
              </button>
            ))}
          </div>
          <div className="checkpoint-feedback" role="status">
            {answer === null ? (
              'Elegí la explicación que mejor sostenga tu decisión.'
            ) : (
              <>
                <strong>
                  {answer === question.answer ? 'Bien razonado.' : 'Revisemos esa idea.'}
                </strong>
                {` ${world.checkpointFeedback}`}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            {`Se abre al verificar las seis misiones, reunir ${PASS_SCORE} XP y resolver la predicción del desafío final.`}
          </p>
          <ul>
            {world.checkpointReasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

export default WorldCheckpoint;
