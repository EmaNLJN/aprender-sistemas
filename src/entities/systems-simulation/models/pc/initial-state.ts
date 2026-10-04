import type { Instruction, PcState } from './types';

export const normalProgram = (): Instruction[] => [
  { op: 'LOAD', va: 1 },
  { op: 'LOAD', va: 2 },
  { op: 'LOAD', va: 9 },
  { op: 'STORE', va: 10, value: 77 },
  { op: 'LOAD', va: 10 },
  { op: 'HALT' },
];

export const protectionProgram = (): Instruction[] => [
  { op: 'STORE', va: 1, value: 99 },
  { op: 'HALT' },
];

export function createInitialState(): PcState {
  return {
    program: normalProgram(),
    scenario: 'normal',
    pc: 0,
    acc: 0,
    phase: 'fetch',
    mode: 'user',
    instruction: null,
    translation: null,
    physical: null,
    ram: [10, 11, 12, 13, 20, 21, 22, 23, 0, 0, 0, 0],
    table: [{ frame: 1, write: false }, { frame: 0, write: true }, null],
    tlb: [null, null, null],
    irqPending: false,
    trap: null,
    retryPC: null,
    halted: false,
    hits: 0,
    misses: 0,
    faults: 0,
    interrupts: 0,
    retired: 0,
    observed: {},
    log: [
      'CPU lista: empezá con Un paso. Cada pulsación muestra una decisión, no un ciclo de hardware real.',
    ],
  };
}
