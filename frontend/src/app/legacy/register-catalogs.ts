import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import type { GuideData } from '../../entities/guide';
import { getContent } from '../content/content';

declare global {
  interface Window {
    GUIDE_DATA: GuideData;
    RUST_LAB: Exercise[];
    GO_LAB: Exercise[];
    RUST_QUESTS: Exercise[];
    GO_QUESTS: Exercise[];
    RUST_CAMPAIGN: CampaignWorldDefinition[];
    GO_CAMPAIGN: CampaignWorldDefinition[];
  }
}

const content = getContent();
window.GUIDE_DATA = content.guide;
window.RUST_LAB = content.lab.rust;
window.GO_LAB = content.lab.go;
window.RUST_QUESTS = content.quests.rust;
window.GO_QUESTS = content.quests.go;
window.RUST_CAMPAIGN = content.campaign.rust;
window.GO_CAMPAIGN = content.campaign.go;
