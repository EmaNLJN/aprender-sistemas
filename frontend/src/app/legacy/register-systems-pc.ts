import { getContent } from '../content/content';
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

const content = getContent();
window.SYSTEMS_PC = {
  workshops: content.workshops.pc,
  models: { pc: pcModel },
};
window.SYSTEMS_PC_LABS = content.cores.pc;
