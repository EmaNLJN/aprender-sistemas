import {
  MISSION_FILTERS,
  matchesMissionFilter,
  missionTypeLabel,
  type DerivedWorld,
  type MissionFilter,
} from '../../../entities/campaign';
import type { MissionContent } from '../model/types';
import MissionCard from './MissionCard';
import WorldCheckpoint from './WorldCheckpoint';
import WorldProgress from './WorldProgress';

interface OpenWorldProps {
  world: DerivedWorld;
  nextWorld: DerivedWorld | undefined;
  missions: ReadonlyMap<string, MissionContent>;
  filter: MissionFilter;
  onChooseWorld: (worldId: string) => void;
  onFilter: (filter: MissionFilter, button: HTMLButtonElement) => void;
  onAnswer: (worldId: string, index: number, option: HTMLButtonElement) => void;
}

const OpenWorld = ({
  world,
  nextWorld,
  missions,
  filter,
  onChooseWorld,
  onFilter,
  onAnswer,
}: OpenWorldProps) => {
  const shownMissions = world.missions.filter((mission) =>
    matchesMissionFilter(missionTypeLabel(missions.get(mission.id)!.challengeType), filter),
  );
  return (
    <>
      <div className="quest-brief">
        <div>
          <span className="small-label">POR QUÉ EXPLORARLO</span>
          <p>{world.why}</p>
        </div>
        <ol>
          {world.guide?.map((step, index) => (
            <li key={index}>
              <span>0{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <WorldProgress
        world={world}
        nextWorld={nextWorld}
        missions={missions}
        onChooseWorld={onChooseWorld}
      />
      <div className="quest-mission-top">
        <h3>Seis misiones para conectar las piezas.</h3>
        <div className="quest-filters" role="group" aria-label="Tipo de misión">
          {MISSION_FILTERS.map((type) => (
            <button
              key={type}
              aria-pressed={filter === type}
              onClick={(event) => onFilter(type, event.currentTarget)}
            >
              {type === 'all' ? 'Todas' : type}
            </button>
          ))}
        </div>
      </div>
      <div className="quest-missions">
        {shownMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            world={world}
            mission={mission}
            content={missions.get(mission.id)!}
          />
        ))}
      </div>
      <WorldCheckpoint world={world} onAnswer={onAnswer} />
    </>
  );
};

export default OpenWorld;
