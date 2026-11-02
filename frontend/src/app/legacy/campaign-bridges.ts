import type { RefreshResult, SyncLabResult } from '../../entities/campaign';

export interface CampaignBridges {
  refresh(): RefreshResult;
  sync(): SyncLabResult;
  returnURL(worldId: string): string;
  exerciseContextHTML(id: string, language: string): string;
  lockedExerciseHTML(id: string, language: string): string;
}

function notImplemented(): never {
  throw new Error('not implemented');
}

export const campaignBridges: CampaignBridges = {
  refresh: notImplemented,
  sync: notImplemented,
  returnURL: notImplemented,
  exerciseContextHTML: notImplemented,
  lockedExerciseHTML: notImplemented,
};
