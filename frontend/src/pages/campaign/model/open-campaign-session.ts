import { campaignEngine, type CampaignLanguage } from '../../../entities/campaign';
import { resolveSelectedWorld, type CampaignSession } from './campaign-session';

export function openCampaignSession(
  session: CampaignSession,
  language: CampaignLanguage,
  linkedWorldId: string | null,
): CampaignSession {
  return {
    ...session,
    selected: resolveSelectedWorld(
      campaignEngine.getWorlds(language),
      session.selected,
      linkedWorldId,
    ),
  };
}
