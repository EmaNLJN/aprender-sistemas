import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { infraModels, type InfraModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { infraWorkshops } from '../../entities/systems-workshop/content/infra-workshops';

declare global {
  interface Window {
    SYSTEMS_INFRA: {
      workshops: SystemsWorkshop[];
      models: InfraModels;
    };
    SYSTEMS_INFRA_LABS: Exercise[];
  }
}

window.SYSTEMS_INFRA = { workshops: infraWorkshops, models: infraModels };
window.SYSTEMS_INFRA_LABS = curriculum.cores.infra as Exercise[];
