// Catalogs come from content/ (YAML and code) through build/curriculum.json, which
// tools/content/build-curriculum.ts generates before `npm run typecheck` and `npm run dev`.
import curriculum from '../../../../build/curriculum.json';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import type { GuideData } from '../../entities/guide';

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

window.GUIDE_DATA = curriculum.guide as GuideData;
window.RUST_LAB = curriculum.lab.rust as Exercise[];
window.GO_LAB = curriculum.lab.go as Exercise[];
window.RUST_QUESTS = curriculum.quests.rust as Exercise[];
window.GO_QUESTS = curriculum.quests.go as Exercise[];
window.RUST_CAMPAIGN = curriculum.campaign.rust as CampaignWorldDefinition[];
window.GO_CAMPAIGN = curriculum.campaign.go as CampaignWorldDefinition[];
