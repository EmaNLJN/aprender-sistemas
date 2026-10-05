export type PcPhase = 'fetch' | 'tlb' | 'walk' | 'permission' | 'memory' | 'fault' | 'irq' | 'halt';
export type PcMode = 'user' | 'kernel';
export type PcScenario = 'normal' | 'protection';

export type PcAction = 'reset' | 'program' | 'pulse' | 'map' | 'ack' | 'return' | 'abort' | 'step';

export interface PageEntry {
  frame: number;
  write: boolean;
}

export interface LoadInstruction {
  op: 'LOAD';
  va: number;
}

export interface StoreInstruction {
  op: 'STORE';
  va: number;
  value: number;
}

export type DataInstruction = LoadInstruction | StoreInstruction;

export type Instruction = DataInstruction | { op: 'HALT' };

export interface AbsentPageTrap {
  cause: 'absent';
  pc: number;
  acc: number;
  mapped: boolean;
}

export interface ProtectionTrap {
  cause: 'protection';
  pc: number;
  acc: number;
  mapped: boolean;
}

export interface TimerTrap {
  cause: 'timer';
  pc: number;
  acc: number;
  acked: boolean;
}

export type PcTrap = AbsentPageTrap | ProtectionTrap | TimerTrap;

export type PcObservation = 'protection' | 'hit' | 'walk' | 'interrupt' | 'recovered';

export interface PcState {
  program: Instruction[];
  scenario: PcScenario;
  pc: number;
  acc: number;
  phase: PcPhase;
  mode: PcMode;
  instruction: DataInstruction | null;
  translation: PageEntry | null;
  physical: number | null;
  ram: number[];
  table: (PageEntry | null)[];
  tlb: (PageEntry | null)[];
  irqPending: boolean;
  trap: PcTrap | null;
  retryPC: number | null;
  halted: boolean;
  hits: number;
  misses: number;
  faults: number;
  interrupts: number;
  retired: number;
  observed: Partial<Record<PcObservation, true>>;
  log: string[];
}
