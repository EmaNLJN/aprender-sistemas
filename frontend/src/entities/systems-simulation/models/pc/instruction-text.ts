import type { DataInstruction } from './types';

// « ← valor» sólo acompaña a un STORE; un LOAD no lleva sufijo.
export const storeSuffix = (instruction: DataInstruction): string =>
  instruction.op === 'STORE' ? ` ← ${instruction.value}` : '';

export const virtualPageOf = (va: number): number => Math.floor(va / 4);
