import { worldSymbol, type DerivedWorld } from '../../../entities/campaign';

interface TrophyCaseProps {
  worlds: readonly DerivedWorld[];
}

const TrophyCase = ({ worlds }: TrophyCaseProps) => (
  <section className="quest-trophy-case">
    <div>
      <span className="eyebrow">TU COLECCIÓN</span>
      <h2>Ideas que ya pusiste a prueba.</h2>
      <p>
        Las insignias registran práctica y checkpoints superados. Podés volver a cualquier mundo sin
        perder tus logros.
      </p>
    </div>
    <div className="quest-badges">
      {worlds.map((world, index) => (
        <div
          key={world.id}
          className={`quest-badge ${world.completed ? 'earned' : ''}`}
          aria-label={`${world.badge}: ${world.completed ? 'conseguida' : 'pendiente'}`}
        >
          <span aria-hidden="true">{worldSymbol(index)}</span>
          <strong>{world.badge}</strong>
          <small>{world.completed ? 'CONSEGUIDA' : 'POR DESCUBRIR'}</small>
        </div>
      ))}
    </div>
  </section>
);

export default TrophyCase;
