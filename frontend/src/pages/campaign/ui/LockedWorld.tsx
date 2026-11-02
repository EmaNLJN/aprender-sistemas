import type { DerivedWorld } from '../../../entities/campaign';

interface LockedWorldProps {
  world: DerivedWorld;
  previous: DerivedWorld | undefined;
  onChoose: (worldId: string) => void;
}

const LockedWorld = ({ world, previous, onChoose }: LockedWorldProps) => (
  <div className="quest-lock">
    <span className="lock-symbol" aria-hidden="true">
      ◇
    </span>
    <div>
      <h3>Esta región tiene un requisito.</h3>
      <p>
        Podés conocer su tema ahora. Sus misiones se habilitan cuando completes los mundos
        anteriores.
      </p>
      <ul>
        {world.reasons.map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>
      {previous ? (
        <button className="button" onClick={() => onChoose(previous.id)}>
          {`Volver a ${previous.title} →`}
        </button>
      ) : null}
    </div>
  </div>
);

export default LockedWorld;
