import { LEVEL_IDS, type LevelId } from '../../../shared/config/levels';

interface LevelMeterProps {
  level: LevelId;
}

const LevelMeter = ({ level }: LevelMeterProps) => {
  const filledCount = LEVEL_IDS.indexOf(level) + 1;
  return (
    <span className="atlas-level-meter" aria-hidden="true">
      {LEVEL_IDS.map((id, index) => (
        <i className={index < filledCount ? 'filled' : undefined} key={id} />
      ))}
    </span>
  );
};

export default LevelMeter;
