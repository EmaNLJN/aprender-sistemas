import type { Exercise } from '../../entities/exercise';
import { systemsPlayCores } from '../../entities/exercise/content/systems-play-cores';
import { playModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { playWorkshops } from '../../entities/systems-workshop/content/play-workshops';

declare global {
  interface Window {
    SYSTEMS_PLAY: {
      workshops: SystemsWorkshop[];
      models: typeof playModels;
    };
    SYSTEMS_PLAY_LABS: Exercise[];
  }
}

window.SYSTEMS_PLAY = { workshops: playWorkshops, models: playModels };
window.SYSTEMS_PLAY_LABS = systemsPlayCores;
