interface MissionSealProps {
  earned: boolean;
  label: string;
  points: number;
}

const MissionSeal = ({ earned, label, points }: MissionSealProps) => (
  <span className={earned ? 'earned' : ''}>
    {earned ? '✓' : '○'} {label} · {points}
  </span>
);

export default MissionSeal;
