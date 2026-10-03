import { goWorlds } from '../../entities/campaign/content/go-worlds';
import { rustWorlds } from '../../entities/campaign/content/rust-worlds';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import { goLab } from '../../entities/exercise/content/go-lab';
import { goQuests } from '../../entities/exercise/content/go-quests';
import { rustLab } from '../../entities/exercise/content/rust-lab';
import { rustQuests } from '../../entities/exercise/content/rust-quests';
import { guideData, type GuideData } from '../../entities/guide';

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

window.GUIDE_DATA = guideData;
window.RUST_LAB = rustLab;
window.GO_LAB = goLab;
window.RUST_QUESTS = rustQuests;
window.GO_QUESTS = goQuests;
window.RUST_CAMPAIGN = rustWorlds;
window.GO_CAMPAIGN = goWorlds;
