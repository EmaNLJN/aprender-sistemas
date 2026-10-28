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
  const world = worlds.find((candidate) => candidate.id === linkedWorldId);
  const mission = world?.missions.find((candidate) => candidate.id === exerciseId);
  if (!world || !mission) return null;
  return {
    worldId: world.id,
    worldTitle: world.title,
    points: mission.points,
    code: mission.code,
    prediction: mission.prediction,
  };
}

export function campaignLinkAccess(
  worlds: readonly BridgeWorld[],
  linkedWorldId: string,
  exerciseId: string,
  permission: Pick<AttemptPermission, 'allowed' | 'reasons' | 'worldId'>,
): CampaignLinkAccess {
  const world = worlds.find((candidate) => candidate.id === linkedWorldId);
  const mission = world?.missions.find((candidate) => candidate.id === exerciseId);
  return {
    allowed: Boolean(
      world && mission && permission.allowed && permission.worldId === linkedWorldId,
    ),
    reasons: mission
      ? permission.reasons
      : ['El enlace no corresponde a una misión de este mundo.'],
    worldId: world ? world.id : null,
  };
}
