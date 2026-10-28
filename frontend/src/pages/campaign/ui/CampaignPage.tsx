import type { FC } from 'react';
import type { CampaignLanguage } from '../../../entities/campaign';
import type { CampaignSession } from '../model/campaign-session';
import type { MissionContent } from '../model/types';

interface CampaignPageProps {
  language: CampaignLanguage;
  missions: ReadonlyMap<string, MissionContent>;
  initialSession: CampaignSession;
  notify: (message: string) => void;
  onSessionChange: (session: CampaignSession) => void;
}

const CampaignPage: FC<CampaignPageProps> = () => {
  throw new Error('not implemented');
};

export default CampaignPage;
