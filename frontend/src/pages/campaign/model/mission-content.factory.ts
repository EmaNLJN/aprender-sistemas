import { Factory } from 'fishery';
import type { CampaignConfig } from '../../../entities/campaign';
import type { MissionContent } from './types';

export const missionContentFactory = Factory.define<MissionContent>(() => ({
  title: 'Misión armada a mano',
  objective: 'Un objetivo sin números.',
}));

const CHALLENGE_TYPES = ['repair', 'kata', 'boss'] as const;

export function missionContentFor(
  config: CampaignConfig,
  language: 'rust' | 'go',
): Map<string, MissionContent> {
  const worlds = Array.isArray(config.worlds) ? config.worlds : config.worlds[language];
  const content = new Map<string, MissionContent>();
  for (const world of worlds) {
    for (const id of world.trainingIds) content.set(id, missionContentFactory.build());
    world.challengeIds.forEach((id, index) =>
      content.set(id, missionContentFactory.build({ challengeType: CHALLENGE_TYPES[index] })),
    );
  }
  return content;
}
