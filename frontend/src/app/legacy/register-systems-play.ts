import curriculum from '../../../../build/curriculum.json';
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

window.SYSTEMS_PLAY = {
  workshops: curriculum.workshops.play as SystemsWorkshop[],
  models: playModels,
};
window.SYSTEMS_PLAY_LABS = curriculum.cores.play as Exercise[];
