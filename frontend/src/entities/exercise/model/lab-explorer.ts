export interface LabExplorerState {
  value: number;
  copy: number;
  capacity: number;
  queue: number[];
  sender: boolean;
  receiver: boolean;
  delivered: number;
  notice: string;
  type: string;
  constraint: string;
}

export interface GenericContract {
  valid: boolean;
  constraintName: string;
}

export const FIRST_STEP_NOTICE = 'Elegí qué participante da el primer paso.';

export function initialLabExplorerState(): LabExplorerState {
  throw new Error('not implemented');
}

export function applyLabExplorerOperation(
  state: LabExplorerState,
  operation: string,
): LabExplorerState {
  throw new Error(`not implemented: ${state.notice} ${operation}`);
}

export function chooseLabExplorerOption(
  state: LabExplorerState,
  field: 'constraint' | 'type',
  value: string,
): LabExplorerState {
  throw new Error(`not implemented: ${state.notice} ${field} ${value}`);
}

export function genericContract(
  constraint: string,
  type: string,
  language: string,
): GenericContract {
  throw new Error(`not implemented: ${constraint} ${type} ${language}`);
}
