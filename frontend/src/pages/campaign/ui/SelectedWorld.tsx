import type { ReactNode, RefObject } from 'react';
import { worldState, type DerivedWorld, type WorldState } from '../../../entities/campaign';
import { LEVEL_LABELS } from '../../../shared/config/levels';

interface SelectedWorldProps {
  world: DerivedWorld;
  sectionRef: RefObject<HTMLElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}

const STAGE_LABELS: Record<WorldState, string> = {
  complete: 'MUNDO COMPLETADO',
  available: 'TU EXPEDICIÓN',
  locked: 'PRÓXIMA FRONTERA',
};

const SelectedWorld = ({ world, sectionRef, titleRef, children }: SelectedWorldProps) => (
  <section
    className="quest-world"
    id="quest-world"
    aria-labelledby="quest-world-title"
    ref={sectionRef}
  >
    <div className="quest-world-head">
      <div>
        <span className="eyebrow">
          {`${LEVEL_LABELS[world.level]} / ${STAGE_LABELS[worldState(world)]}`}
        </span>
        <h2 id="quest-world-title" tabIndex={-1} ref={titleRef}>
          {world.title}
        </h2>
        <p>{world.subtitle}</p>
      </div>
      <span className="world-score">
        {world.score}
        <small>{`/ ${world.maxScore} XP`}</small>
      </span>
    </div>
    <p className="world-story">{world.story}</p>
    <div className="concept-chips">
      {world.concepts?.map((concept, index) => (
        <span key={index}>{concept}</span>
      ))}
    </div>
    {children}
  </section>
);

export default SelectedWorld;
