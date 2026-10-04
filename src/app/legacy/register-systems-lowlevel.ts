import type { Exercise } from '../../entities/exercise';
import { systemsLowlevelCores } from '../../entities/exercise/content/systems-lowlevel-cores';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { lowlevelWorkshops } from '../../entities/systems-workshop/content/lowlevel-workshops';
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

window.SYSTEMS_LOWLEVEL = { workshops: lowlevelWorkshops, models: lowlevelModels };
window.SYSTEMS_LOWLEVEL_LABS = systemsLowlevelCores;
