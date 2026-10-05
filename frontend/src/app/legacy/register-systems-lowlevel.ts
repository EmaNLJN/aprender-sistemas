import curriculum from '../../../../build/curriculum.json';
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

window.SYSTEMS_LOWLEVEL = {
  workshops: curriculum.workshops.lowlevel as SystemsWorkshop[],
  models: lowlevelModels,
};
window.SYSTEMS_LOWLEVEL_LABS = curriculum.cores.lowlevel as Exercise[];
