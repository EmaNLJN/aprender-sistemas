import { cloneJson } from '../../../shared/lib/clone-json';
import { appendLog } from '../lib/view-builders';
import type { ModelView, ModelWorkshop, SystemsModel } from './types';

export interface SimulationState {
  log: string[];
}

export interface ActionContext<State extends SimulationState, Workshop extends ModelWorkshop> {
  value: string | undefined;
  workshop: Workshop;
  // Estado inicial del taller: lo que devuelve la acción de reinicio.
  initial(): State;
  // Agrega al registro de `state` (tope del modelo) y lo devuelve.
  log(state: State, message: string): State;
}

// Recibe una copia que puede mutar. Si devuelve un estado, ese reemplaza a la copia.
export type ActionHandler<State extends SimulationState, Workshop extends ModelWorkshop> = (
  draft: State,
  context: ActionContext<State, Workshop>,
) => State | void;

export interface ModelDefinition<
  State extends SimulationState,
  Action extends string,
  Workshop extends ModelWorkshop,
> {
  // Cantidad de mensajes que conserva el registro: 12, 8 o 6 según el dominio.
  logLimit: number;
  initial(workshop: Workshop): State;
  actions: Record<Action, ActionHandler<State, Workshop>>;
  view(state: State, workshop: Workshop): ModelView;
  achieved(state: State, workshop: Workshop): string[];
}

// Mecánica común de los modelos: clona el estado, despacha la acción por tabla y trata
// una acción desconocida como ninguna acción (la copia, sin cambios). Cada modelo conserva
// la forma de su estado y su vista.
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
