import type { ActionContext, ActionHandler, SimulationState } from '../../model/define-model';
import type { ModelWorkshop } from '../../model/types';
import { button } from '../../lib/view-builders';

// Estado común de los ocho modelos lowlevel: las metas observadas (`flags`, sólo las que
// valen true) y el registro. Cada modelo acota los ids de sus metas con una unión.
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

// `flags` y `log` van primero: así se serializa el estado inicial de cada modelo.
export function baseState<Flag extends string>(): LowlevelState<Flag> {
  return { flags: {}, log: [] };
}

// Las metas alcanzadas son los flags verdaderos, en el orden en que se observaron.
export function achievedFlags(state: LowlevelState<string>): string[] {
  return Object.keys(state.flags).filter((id) => state.flags[id]);
}

export const resetButton = button('reset', 'Reiniciar simulación');

export function resetAction<State extends LowlevelState<string>>(): LowlevelHandler<State> {
  return (_draft, { initial }) => initial();
}
