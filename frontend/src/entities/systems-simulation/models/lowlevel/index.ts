import type { SystemsModel } from '../../model/types';
import { cacheModel, type CacheState } from './cache';
import { heapModel, type HeapState } from './heap';
import { interruptsModel, type InterruptsState } from './interrupts';
import { mmuModel, type MmuState } from './mmu';
import { schedulerModel, type SchedulerState } from './scheduler';
import { stackModel, type StackState } from './stack';
import { tlbModel, type TlbState } from './tlb';
import { vmModel, type VmState } from './vm';

export interface LowlevelModels {
  cache: SystemsModel<CacheState>;
  heap: SystemsModel<HeapState>;
  mmu: SystemsModel<MmuState>;
  tlb: SystemsModel<TlbState>;
  vm: SystemsModel<VmState>;
  stack: SystemsModel<StackState>;
  scheduler: SystemsModel<SchedulerState>;
  interrupts: SystemsModel<InterruptsState>;
}

// Map of workshop id → model, in card order.
export const lowlevelModels: LowlevelModels = {
  cache: cacheModel,
  heap: heapModel,
  mmu: mmuModel,
  tlb: tlbModel,
  vm: vmModel,
  stack: stackModel,
  scheduler: schedulerModel,
  interrupts: interruptsModel,
};

export type {
  CacheState,
  HeapState,
  InterruptsState,
  MmuState,
  SchedulerState,
  StackState,
  TlbState,
  VmState,
};
