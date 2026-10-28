import type { CampaignMission, DerivedWorld } from '../../../entities/campaign';
import { campaignMissionHref } from '../../../shared/config/url-grammar';

interface MissionActionProps {
  world: DerivedWorld;
  mission: CampaignMission;
  boss: boolean;
  mastered: boolean;
}

const MissionAction = ({ world, mission, boss, mastered }: MissionActionProps) => {
  if (!mission.allowed)
    return (
      <details className="mission-requirements">
        <summary>Ver qué falta para entrar</summary>
        <ul>
          {mission.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      </details>
    );
  return (
    <a
      className={`button small ${boss ? '' : 'secondary'}`}
      href={campaignMissionHref(world.id, mission.id)}
    >
      {mastered ? 'Volver a experimentar' : boss ? 'Enfrentar el desafío final' : 'Abrir misión'} ↗
    </a>
  );
};

export default MissionAction;
