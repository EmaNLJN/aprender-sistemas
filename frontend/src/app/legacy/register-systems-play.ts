import { getContent } from '../content/content';
import type { Exercise } from '../../entities/exercise';
import { playModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';

declare global {
  interface Window {
    SYSTEMS_PLAY: {
      workshops: SystemsWorkshop[];
      models: typeof playModels;
    };
    SYSTEMS_PLAY_LABS: Exercise[];
  }
}

const content = getContent();
window.SYSTEMS_PLAY = {
  workshops: content.workshops.play,
  models: playModels,
};
window.SYSTEMS_PLAY_LABS = content.cores.play;
