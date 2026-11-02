import {
  CODE_XP,
  PREDICTION_XP,
  missionTypeLabel,
  type CampaignMission,
  type DerivedWorld,
} from '../../../entities/campaign';
import type { MissionContent } from '../model/types';
import MissionAction from './MissionAction';
import MissionSeal from './MissionSeal';

interface MissionCardProps {
  world: DerivedWorld;
  mission: CampaignMission;
  content: MissionContent;
}

const MissionCard = ({ world, mission, content }: MissionCardProps) => {
  const boss = mission.id === world.bossId;
  const mastered = mission.code && mission.prediction;
  return (
    <article
      className={`quest-mission ${boss ? 'is-boss' : ''} ${mastered ? 'is-mastered' : ''} ${!mission.allowed ? 'is-locked' : ''}`}
    >
      <div className="quest-mission-title">
        <span className="mission-type">{missionTypeLabel(content.challengeType)}</span>
        <span className="mission-points">{`${mission.points}/${CODE_XP + PREDICTION_XP} XP`}</span>
      </div>
      <h4>{content.title}</h4>
      <p>{content.objective}</p>
      <div className="mission-seals">
        <MissionSeal earned={mission.code} label="Pruebas" points={CODE_XP} />
        <MissionSeal earned={mission.prediction} label="Predicción" points={PREDICTION_XP} />
      </div>
      {mission.assisted ? (
        <small className="mission-assisted">Práctica con solución de apoyo</small>
      ) : null}
      <MissionAction world={world} mission={mission} boss={boss} mastered={mastered} />
    </article>
  );
};

export default MissionCard;
