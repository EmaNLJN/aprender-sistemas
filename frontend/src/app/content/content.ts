import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import type { GuideData } from '../../entities/guide';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import type { AtlasByLanguage } from '../../pages/atlas';
import { readStoredContent, type SystemsDomain } from '../../shared/api/content';

type Language = 'rust' | 'go';

export interface Content {
  lab: Record<Language, Exercise[]>;
  quests: Record<Language, Exercise[]>;
  cores: Record<SystemsDomain, Exercise[]>;
  campaign: Record<Language, CampaignWorldDefinition[]>;
  workshops: Record<SystemsDomain, SystemsWorkshop[]>;
  atlas: AtlasByLanguage;
  guide: GuideData;
}

export const CONTENT_PUBLISHED_EVENT = 'taller:content-published';

export function getContent(): Content {
  return readStoredContent() as Content;
}
