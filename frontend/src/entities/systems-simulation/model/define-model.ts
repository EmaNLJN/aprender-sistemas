import { cloneJson } from '../../../shared/lib/clone-json';
import { appendLog } from '../lib/view-builders';
import type { ModelView, ModelWorkshop, SystemsModel } from './types';

export interface SimulationState {
  log: string[];
}

export interface ActionContext<State extends SimulationState, Workshop extends ModelWorkshop> {
  value: string | undefined;
  workshop: Workshop;
  initial(): State;
  log(state: State, message: string): State;
}

export type ActionHandler<State extends SimulationState, Workshop extends ModelWorkshop> = (
  draft: State,
  context: ActionContext<State, Workshop>,
) => State | void;

export interface ModelDefinition<
  State extends SimulationState,
  Action extends string,
  Workshop extends ModelWorkshop,
> {
  logLimit: number;
  initial(workshop: Workshop): State;
  actions: Record<Action, ActionHandler<State, Workshop>>;
  view(state: State, workshop: Workshop): ModelView;
  achieved(state: State, workshop: Workshop): string[];
}

export function defineModel<
  State extends SimulationState,
  Action extends string,
  Workshop extends ModelWorkshop = ModelWorkshop,
>(definition: ModelDefinition<State, Action, Workshop>): SystemsModel<State, Workshop> {
  const { logLimit, actions } = definition;
  const handlerFor = (action: string): ActionHandler<State, Workshop> | undefined =>
    Object.hasOwn(actions, action) ? actions[action as Action] : undefined;

  return {
    initial: definition.initial,
    act(state, action, value, workshop) {
      const draft = cloneJson(state);
      const handler = handlerFor(action);
      if (!handler) return draft;
      const result = handler(draft, {
        value,
        workshop,
        initial: () => definition.initial(workshop),
        log(target, message) {
          target.log = appendLog(target.log, message, logLimit);
          return target;
        },
      });
      return result === undefined ? draft : result;
    },
    view: definition.view,
    achieved: definition.achieved,
  };
}
