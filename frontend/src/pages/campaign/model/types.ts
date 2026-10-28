import type { ChallengeType } from '../../../entities/exercise';

export interface MissionContent {
  title: string;
  objective: string;
  challengeType?: ChallengeType;
}
