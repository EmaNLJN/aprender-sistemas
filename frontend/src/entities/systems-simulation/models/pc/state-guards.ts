import { cloneJson } from '../../../../shared/lib/clone-json';
import type { DataInstruction, PageEntry, PcState, TimerTrap } from './types';

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined)
    throw new Error(`Estado de PC inconsistente: falta ${name}`);
  return value;
}

export const currentInstruction = (s: PcState): DataInstruction =>
  required(s.instruction, 'instruction');

export const currentTranslation = (s: PcState): PageEntry => required(s.translation, 'translation');

export const currentPhysical = (s: PcState): number => required(s.physical, 'physical');

export const copyEntry = (entry: PageEntry): PageEntry => cloneJson(entry);

export function timerTrap(s: PcState): TimerTrap {
  const trap = required(s.trap, 'trap');
  if (trap.cause !== 'timer') throw new Error('Estado de PC inconsistente: el trap no es de timer');
  return trap;
}
