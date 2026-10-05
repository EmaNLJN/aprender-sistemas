import type { ActionContext, ActionHandler, SimulationState } from '../../model/define-model';
import type { ModelWorkshop } from '../../model/types';
import { button } from '../../lib/view-builders';

export interface LowlevelState<Flag extends string> extends SimulationState {
  flags: Partial<Record<Flag, boolean>>;
}

export type LowlevelContext<State extends LowlevelState<string>> = ActionContext<
  State,
  ModelWorkshop
>;
export type LowlevelHandler<State extends LowlevelState<string>> = ActionHandler<
  State,
  ModelWorkshop
>;

// `flags` and `log` come first: that is how each model's initial state is serialized.
export function baseState<Flag extends string>(): LowlevelState<Flag> {
  return { flags: {}, log: [] };
}

export function achievedFlags(state: LowlevelState<string>): string[] {
  return Object.keys(state.flags).filter((id) => state.flags[id]);
}

export const resetButton = button('reset', 'Reiniciar simulación');

export function resetAction<State extends LowlevelState<string>>(): LowlevelHandler<State> {
  return (_draft, { initial }) => initial();
}
