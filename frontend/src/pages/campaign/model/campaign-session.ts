import type { DerivedWorld, MissionFilter } from '../../../entities/campaign';

export interface CampaignSession {
  selected: string | null;
  filter: MissionFilter;
}

export const createCampaignSession = (): CampaignSession => {
  throw new Error('not implemented');
};

export const selectWorld = (session: CampaignSession, worldId: string): CampaignSession => {
  throw new Error('not implemented');
};

export const setMissionFilter = (
  session: CampaignSession,
  filter: MissionFilter,
): CampaignSession => {
  throw new Error('not implemented');
};

export function resolveSelectedWorld(
  worlds: readonly Pick<DerivedWorld, 'id' | 'unlocked' | 'completed'>[],
  remembered: string | null,
  linked: string | null,
): string | null {
  throw new Error('not implemented');
}
