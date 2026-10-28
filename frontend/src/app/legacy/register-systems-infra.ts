import { getContent } from '../content/content';
import type { Exercise } from '../../entities/exercise';
import { infraModels, type InfraModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';

declare global {
  interface Window {
    SYSTEMS_INFRA: {
      workshops: SystemsWorkshop[];
      models: InfraModels;
    };
    SYSTEMS_INFRA_LABS: Exercise[];
  }
}

const content = getContent();
window.SYSTEMS_INFRA = {
  workshops: content.workshops.infra,
  models: infraModels,
};
window.SYSTEMS_INFRA_LABS = content.cores.infra;
