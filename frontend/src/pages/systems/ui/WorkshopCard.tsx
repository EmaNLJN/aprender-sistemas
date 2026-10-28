import type { RefCallback } from 'react';
import { LEVEL_LABELS } from '../../../shared/config/levels';
import { FAMILY_LABELS, FAMILY_SYMBOLS } from '../model/catalog-filter';
import type { SystemsWorkshopView } from '../model/types';

interface WorkshopCardProps {
  workshop: SystemsWorkshopView;
  openRef: RefCallback<HTMLButtonElement>;
  onOpen: (workshopId: string) => void;
}

const WorkshopCard = ({ workshop, openRef, onOpen }: WorkshopCardProps) => (
  <article className="sys-card">
    <div className="sys-card-top">
      <span className="sys-card-symbol" aria-hidden="true">
        {FAMILY_SYMBOLS[workshop.category]}
      </span>
      <span>
        {LEVEL_LABELS[workshop.level]} · {workshop.minutes} min orientativos
      </span>
    </div>
    <span className="small-label">{FAMILY_LABELS[workshop.category]}</span>
    <h2>{workshop.title}</h2>
    <p>{workshop.subtitle}</p>
    <div className="sys-card-bottom">
      <span>{workshop.completed ? '✓ Tres sellos conseguidos' : `${workshop.seals}/3 sellos`}</span>
      <button className="button small secondary" ref={openRef} onClick={() => onOpen(workshop.id)}>
        Explorar →
      </button>
    </div>
  </article>
);

export default WorkshopCard;
