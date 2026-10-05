import { createCampaignEngine, type CampaignEngine } from '../../entities/campaign';

declare global {
  interface Window {
    TallerCampaignEngine: CampaignEngine;
  }
}

window.TallerCampaignEngine = createCampaignEngine();
