import {
  worldMapStatus,
  worldState,
  worldStateName,
  worldSymbol,
  type DerivedWorld,
} from '../../../entities/campaign';
import { LEVEL_LABELS } from '../../../shared/config/levels';

interface WorldMapProps {
  worlds: readonly DerivedWorld[];
  selectedId: string;
  onChoose: (worldId: string) => void;
}

const WorldMap = ({ worlds, selectedId, onChoose }: WorldMapProps) => (
  <nav className="quest-map" aria-label="Mundos de la campaña">
    {worlds.map((world, index) => {
      const state = worldState(world);
      const selected = world.id === selectedId;
      return (
        <button
          key={world.id}
          className={`world-node ${state} ${selected ? 'selected' : ''}`}
          aria-pressed={selected}
          aria-label={`Mundo ${index + 1}: ${world.title}, ${worldStateName(state)}`}
          onClick={() => onChoose(world.id)}
        >
          <span className="world-icon" aria-hidden="true">
            {world.completed ? '✓' : world.unlocked ? worldSymbol(index) : '◇'}
          </span>
          <span className="world-number">
            MUNDO 0{index + 1} · {LEVEL_LABELS[world.level]}
          </span>
          <strong>{world.title}</strong>
          <span className="world-status">{worldMapStatus(world)}</span>
          <progress
            value={world.score}
            max={world.maxScore}
            aria-label={`Experiencia en ${world.title}`}
          />
        </button>
      );
    })}
  </nav>
);

export default WorldMap;
