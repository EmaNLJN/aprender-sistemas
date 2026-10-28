import type { CampaignLanguage } from '../../../entities/campaign';
import type { CampaignSession } from './campaign-session';

export function openCampaignSession(
  session: CampaignSession,
  language: CampaignLanguage,
  linkedWorldId: string | null,
): CampaignSession {
  throw new Error('not implemented');
}
