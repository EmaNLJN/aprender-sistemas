import type { PortionName, SourcePortion } from '../../shared/api/content';
import type { Content } from './content';

// The portions are already validated: every name is present and has its shape. The casts live here,
// once, and the values are the parsed objects themselves (no copies, same key order).
export function assembleContent(portions: readonly SourcePortion[]): Content {
  const byName = new Map(portions.map((portion) => [portion.name, portion.data]));
  const get = <T>(name: PortionName): T => byName.get(name) as T;
  return {
    lab: { rust: get('lab.rust'), go: get('lab.go') },
    quests: { rust: get('quests.rust'), go: get('quests.go') },
    cores: {
      lowlevel: get('cores.lowlevel'),
      infra: get('cores.infra'),
      play: get('cores.play'),
      pc: get('cores.pc'),
    },
    campaign: { rust: get('campaign.rust'), go: get('campaign.go') },
    workshops: {
      lowlevel: get('workshops.lowlevel'),
      infra: get('workshops.infra'),
      play: get('workshops.play'),
      pc: get('workshops.pc'),
    },
    atlas: { rust: get('atlas.rust'), go: get('atlas.go') },
    guide: get('guide'),
  };
}
