import type { ActionContext, ActionHandler, SimulationState } from '../../model/define-model';
import type { ModelView, ModelWorkshop } from '../../model/types';

export const INFRA_LOG_LIMIT = 8;

const INTRO_NOTICE = 'Elegí una acción y observá qué garantía cambia.';

export interface InfraState extends SimulationState {
  flags: Record<string, boolean>;
  notice: string;
}

export type InfraContext<State extends InfraState> = ActionContext<State, ModelWorkshop>;
export type InfraHandler<State extends InfraState> = ActionHandler<State, ModelWorkshop>;
export type InfraDescription = Omit<ModelView, 'log' | 'explanation'>;

// Key order is part of the contract: the domain's own fields first, then the base.
export function withInfraBase<Domain extends object>(
  domain: Domain,
): Domain & { flags: Record<string, boolean>; log: string[]; notice: string } {
  return { ...domain, flags: {}, log: [], notice: INTRO_NOTICE };
}

export function shown(value: unknown): string {
  return value === null || value === undefined ? '∅' : String(value);
}

export function note<State extends InfraState>(
  state: State,
  context: InfraContext<State>,
  message: string,
): void {
  state.notice = message;
  context.log(state, message);
}

export function infraView<State extends InfraState>(
  describe: (state: State) => InfraDescription,
): (state: State) => ModelView {
  return (state) => ({ ...describe(state), log: state.log.slice(), explanation: state.notice });
}

export function achievedFlags(state: InfraState): string[] {
  return Object.keys(state.flags).filter((id) => state.flags[id] === true);
}
