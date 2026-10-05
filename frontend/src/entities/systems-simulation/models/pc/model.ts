import { defineModel } from '../../model/define-model';
import type { ModelWorkshop, SystemsModel } from '../../model/types';
import type { PcHandler } from './handler-types';
import { createInitialState } from './initial-state';
import {
  abortProgram,
  acknowledgeTimer,
  loadProgram,
  mapAbsentPage,
  pulseTimer,
  returnToUser,
} from './kernel-actions';
import { stepCpu } from './step-phases';
import type { PcAction, PcState } from './types';
import { pcView } from './view';

const ACTIONS: Record<PcAction, PcHandler> = {
  reset: (_draft, { initial }) => initial(),
  program: loadProgram,
  pulse: pulseTimer,
  map: mapAbsentPage,
  ack: acknowledgeTimer,
  return: returnToUser,
  abort: abortProgram,
  step: stepCpu,
};

export const pcModel: SystemsModel<PcState, ModelWorkshop> = defineModel({
  logLimit: 12,
  initial: createInitialState,
  actions: ACTIONS,
  view: pcView,
  achieved: (s) => [
    ...(s.observed.walk && s.observed.hit ? ['translate'] : []),
    ...(s.observed.protection && s.observed.recovered ? ['protect-retry'] : []),
    ...(s.observed.interrupt ? ['interrupt'] : []),
  ],
});
