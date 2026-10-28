import type { MilestoneView } from '../model/project-progress';

interface MilestoneCardProps {
  milestone: MilestoneView;
  onToggle: () => void;
}

const MilestoneCard = ({ milestone, onToggle }: MilestoneCardProps) => (
  <article className="milestone">
    <div className="milestone-head">
      <input
        className="step-check"
        type="checkbox"
        aria-label={`Completar hito: ${milestone.title}`}
        checked={milestone.completed}
        onChange={onToggle}
      />
      <h2>{milestone.heading}</h2>
    </div>
    <p>{milestone.task}</p>
    <p>
      <strong>Está listo cuando:</strong>
      {` ${milestone.doneWhen}`}
    </p>
    <details>
      <summary>Necesito una pista</summary>
      <p>{milestone.hint}</p>
    </details>
  </article>
);

export default MilestoneCard;
