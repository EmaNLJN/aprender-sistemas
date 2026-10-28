import type { ChallengeType } from '../../exercise/@x/campaign';
import type { CampaignWorld, DerivedWorld } from './types';

export type WorldState = 'complete' | 'available' | 'locked';
export type MissionTypeLabel = 'Desafío final' | 'Reparación · lings' | 'Kata' | 'Entrenamiento';
export const MISSION_FILTERS = [
  'all',
  'Entrenamiento',
  'Reparación',
  'Kata',
  'Desafío final',
] as const;
export type MissionFilter = (typeof MISSION_FILTERS)[number];

export interface CampaignCounts {
  worlds: number;
  missions: number;
  newChallenges: number;
}

export function rankName(completedWorlds: number): string | undefined {
  throw new Error('not implemented');
}

export function rankSymbol(completedWorlds: number): string {
  throw new Error('not implemented');
}

export function worldSymbol(index: number): string | undefined {
  throw new Error('not implemented');
}

export function worldState(world: Pick<DerivedWorld, 'completed' | 'unlocked'>): WorldState {
  throw new Error('not implemented');
}

export function worldStateName(state: WorldState): string {
  throw new Error('not implemented');
}

export function worldMapStatus(
  world: Pick<DerivedWorld, 'completed' | 'unlocked' | 'score' | 'maxScore'>,
): string {
  throw new Error('not implemented');
}

export function missionTypeLabel(challengeType: ChallengeType | undefined): MissionTypeLabel {
  throw new Error('not implemented');
}

export function matchesMissionFilter(label: MissionTypeLabel, filter: MissionFilter): boolean {
  throw new Error('not implemented');
}

export function campaignCounts(
  worlds: readonly Pick<CampaignWorld, 'missionIds' | 'challengeIds'>[],
): CampaignCounts {
  throw new Error('not implemented');
}
