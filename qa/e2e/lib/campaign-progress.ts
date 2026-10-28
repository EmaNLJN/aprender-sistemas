import { curriculumIds } from './curriculum';

interface SavedSeal {
  code: boolean;
  prediction: boolean;
  assisted: boolean;
}

interface SavedCheckpoint {
  passed: boolean;
  lastAnswer: number | null;
}

interface SavedCampaignV1 {
  version: 1;
  seals: Record<string, SavedSeal>;
  checkpoints: Record<string, SavedCheckpoint>;
}

interface CampaignSeed {
  mastered?: readonly string[];
  codeOnly?: readonly string[];
  passedCheckpoints?: Readonly<Record<string, number>>;
}

export function missionsOf(worldId: string): string[] {
  const world = curriculumIds.worlds[worldId];
  return [...world.trainingIds, ...world.challengeIds];
}

export function savedCampaign(seed: CampaignSeed): string {
  const seals: Record<string, SavedSeal> = {};
  for (const id of seed.mastered ?? [])
    seals[id] = { code: true, prediction: true, assisted: false };
  for (const id of seed.codeOnly ?? [])
    seals[id] = { code: true, prediction: false, assisted: false };
  const checkpoints: Record<string, SavedCheckpoint> = {};
  for (const [worldId, answer] of Object.entries(seed.passedCheckpoints ?? {}))
    checkpoints[worldId] = { passed: true, lastAnswer: answer };
  const saved: SavedCampaignV1 = { version: 1, seals, checkpoints };
  return JSON.stringify(saved);
}
