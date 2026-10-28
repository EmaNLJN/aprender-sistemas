import type { DerivedWorld, MissionFilter } from '../../../entities/campaign';

export interface CampaignSession {
  selected: string | null;
  filter: MissionFilter;
}

export const createCampaignSession = (): CampaignSession => ({ selected: null, filter: 'all' });

export const selectWorld = (session: CampaignSession, worldId: string): CampaignSession => ({
  ...session,
  selected: worldId,
  filter: 'all',
});

export const setMissionFilter = (
  session: CampaignSession,
  filter: MissionFilter,
): CampaignSession => ({
  ...session,
  filter,
});

export function resolveSelectedWorld(
  worlds: readonly Pick<DerivedWorld, 'id' | 'unlocked' | 'completed'>[],
  remembered: string | null,
  linked: string | null,
): string | null {
  let selected = remembered;
  if (worlds.some((world) => world.id === linked)) selected = linked;
  if (!worlds.some((world) => world.id === selected))
    selected =
      (worlds.find((world) => world.unlocked && !world.completed) ?? worlds[0])?.id ?? null;
  return selected;
}
