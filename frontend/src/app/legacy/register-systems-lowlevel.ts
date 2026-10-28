import { getContent } from '../content/content';
import type { Exercise } from '../../entities/exercise';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { lowlevelModels, type LowlevelModels } from '../../entities/systems-simulation';

declare global {
  interface Window {
    SYSTEMS_LOWLEVEL: {
      workshops: SystemsWorkshop[];
      models: LowlevelModels;
    };
    SYSTEMS_LOWLEVEL_LABS: Exercise[];
  }
}

const content = getContent();
window.SYSTEMS_LOWLEVEL = {
  workshops: content.workshops.lowlevel,
  models: lowlevelModels,
};
window.SYSTEMS_LOWLEVEL_LABS = content.cores.lowlevel;
