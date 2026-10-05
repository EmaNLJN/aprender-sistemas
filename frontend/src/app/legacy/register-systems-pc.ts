import curriculum from '../../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { pcModel, type PcState, type SystemsModel } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';

declare global {
  interface Window {
    SYSTEMS_PC: {
      workshops: SystemsWorkshop[];
      models: { pc: SystemsModel<PcState> };
    };
    SYSTEMS_PC_LABS: Exercise[];
  }
}

window.SYSTEMS_PC = {
  workshops: curriculum.workshops.pc as SystemsWorkshop[],
  models: { pc: pcModel },
};
window.SYSTEMS_PC_LABS = curriculum.cores.pc as Exercise[];
