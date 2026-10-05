import type { ActionContext, ActionHandler } from '../../model/define-model';
import type { ModelWorkshop } from '../../model/types';
import type { PcState } from './types';

export type PcContext = ActionContext<PcState, ModelWorkshop>;
export type PcHandler = ActionHandler<PcState, ModelWorkshop>;
