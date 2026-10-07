import type { AttemptPermission } from './types';

export interface BridgeMission {
  id: string;
  points: number;
  code: boolean;
  prediction: boolean;
}

export interface BridgeWorld {
  id: string;
  title: string;
  missions: readonly BridgeMission[];
}

export interface CampaignMissionContext {
  worldId: string;
  worldTitle: string;
  points: number;
  code: boolean;
  prediction: boolean;
}

export interface CampaignLinkAccess {
  allowed: boolean;
  reasons: readonly string[];
  worldId: string | null;
}

export function campaignMissionContext(
  worlds: readonly BridgeWorld[],
  linkedWorldId: string,
  exerciseId: string,
): CampaignMissionContext | null {
  throw new Error('not implemented');
}

export function campaignLinkAccess(
  worlds: readonly BridgeWorld[],
  linkedWorldId: string,
  exerciseId: string,
  permission: Pick<AttemptPermission, 'allowed' | 'reasons' | 'worldId'>,
): CampaignLinkAccess {
  throw new Error('not implemented');
}
