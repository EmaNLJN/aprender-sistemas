import type { ChallengeType } from '../../exercise/@x/campaign';
import type { CampaignWorld, DerivedWorld } from './types';

const RANKS = [
  'Explorador',
  'Aprendiz de sistemas',
  'Constructor',
  'Arquitecto',
  'Maestro del taller',
] as const;
const WORLD_SYMBOLS = ['⌘', '◈', '⌁', '✳'] as const;

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

const WORLD_STATE_NAMES: Record<WorldState, string> = {
  complete: 'completado',
  available: 'disponible',
  locked: 'bloqueado; ver requisitos',
};

export function rankName(completedWorlds: number): string | undefined {
  return RANKS[completedWorlds];
}

export function rankSymbol(completedWorlds: number): string {
  return WORLD_SYMBOLS[Math.min(completedWorlds, WORLD_SYMBOLS.length - 1)];
}

export function worldSymbol(index: number): string | undefined {
  return WORLD_SYMBOLS[index];
}

export function worldState(world: Pick<DerivedWorld, 'completed' | 'unlocked'>): WorldState {
  if (world.completed) return 'complete';
  return world.unlocked ? 'available' : 'locked';
}

export function worldStateName(state: WorldState): string {
  return WORLD_STATE_NAMES[state];
}

export function worldMapStatus(
  world: Pick<DerivedWorld, 'completed' | 'unlocked' | 'score' | 'maxScore'>,
): string {
  if (world.completed) return 'Insignia conseguida';
  if (world.unlocked) return `${world.score}/${world.maxScore} XP · explorar →`;
  return 'Bloqueado · ver requisitos';
}

export function missionTypeLabel(challengeType: ChallengeType | undefined): MissionTypeLabel {
  if (challengeType === 'boss') return 'Desafío final';
  if (challengeType === 'repair') return 'Reparación · lings';
  if (challengeType === 'kata') return 'Kata';
  return 'Entrenamiento';
}

export function matchesMissionFilter(label: MissionTypeLabel, filter: MissionFilter): boolean {
  return filter === 'all' || label.startsWith(filter);
}

export function campaignCounts(
  worlds: readonly Pick<CampaignWorld, 'missionIds' | 'challengeIds'>[],
): CampaignCounts {
  return {
    worlds: worlds.length,
    missions: worlds.reduce((sum, world) => sum + world.missionIds.length, 0),
    newChallenges: worlds.reduce((sum, world) => sum + world.challengeIds.length, 0),
  };
}
