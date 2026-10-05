import type { ActionHandler, SimulationState } from '../../model/define-model';
import type { ModelWorkshop } from '../../model/types';

export const PLAY_LOG_LIMIT = 6;

export interface PlayState extends SimulationState {
  seen: Record<string, boolean>;
}

export type PlayHandler<State extends PlayState> = ActionHandler<State, ModelWorkshop>;

export function remember(state: PlayState, id: string, condition = true): void {
  if (condition) state.seen[id] = true;
}

export function achievedGoals(state: PlayState, workshop: ModelWorkshop): string[] {
  return workshop.objectives.filter((objective) => state.seen[objective.id]).map((o) => o.id);
}
