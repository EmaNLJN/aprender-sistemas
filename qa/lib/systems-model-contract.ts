import assert from 'node:assert/strict';

export const CELL_TONES: readonly string[] = ['active', 'good', 'bad', 'muted'];

export interface ViewMetric {
  label: string;
  value: string | number;
}

export interface ViewCell extends ViewMetric {
  tone: string;
}

export interface ViewControl {
  action: string;
  label: string;
  value?: string;
}

export interface ModelView {
  title: string;
  summary: string;
  explanation: string;
  metrics: ViewMetric[];
  cells: ViewCell[];
  controls: ViewControl[];
  log: string[];
  rows?: string[][];
  columns?: string[];
  scene?: unknown;
}

export interface ModelWorkshop {
  id: string;
  model: string;
  objectives: { id: string }[];
}

export interface SystemsModel<
  S,
  V extends ModelView = ModelView,
  W extends ModelWorkshop = ModelWorkshop,
> {
  initial(workshop?: W): S;
  act(state: S, action: string, value?: string, workshop?: W): S;
  view(state: S, workshop?: W): V;
  achieved(state: S, workshop?: W): string[];
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export function assertUnchanged(value: unknown, before: string, message: string): void {
  assert.equal(JSON.stringify(value), before, message);
}

export function isFiniteJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFiniteJsonValue);
  if (Object.prototype.toString.call(value) === '[object Object]')
    return Object.values(value as Record<string, unknown>).every(isFiniteJsonValue);
  return false;
}

export function assertFiniteJson(value: unknown, owner: string): void {
  if (typeof value === 'number') {
    assert(Number.isFinite(value), `${owner}: non-finite numeric state`);
  } else if (Array.isArray(value)) {
    value.forEach((item) => assertFiniteJson(item, owner));
  } else if (Object.prototype.toString.call(value) === '[object Object]') {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      assertFiniteJson(item, owner),
    );
  } else {
    assert(
      ['string', 'boolean'].includes(typeof value) || value === null,
      `${owner}: state contains non-JSON value`,
    );
  }
}

export function hasTextFields(view: ModelView): boolean {
  return (
    typeof view.title === 'string' &&
    typeof view.summary === 'string' &&
    typeof view.explanation === 'string'
  );
}

export function hasViewCollections(view: ModelView): boolean {
  return (
    Array.isArray(view.metrics) &&
    Array.isArray(view.cells) &&
    Array.isArray(view.controls) &&
    Array.isArray(view.log)
  );
}

export function hasSupportedTones(cells: readonly ViewCell[]): boolean {
  return cells.every((cell) => CELL_TONES.includes(cell.tone));
}

export function isControlContract(control: ViewControl): boolean {
  return (
    typeof control.action === 'string' &&
    typeof control.label === 'string' &&
    (control.value === undefined || typeof control.value === 'string')
  );
}

export function rowsMatchColumns(view: ModelView): boolean {
  if (!view.rows) return true;
  const columns = view.columns;
  if (!columns) return false;
  return view.rows.every(
    (row) => row.length === columns.length && row.every((value) => typeof value === 'string'),
  );
}

export function achievedBelongToWorkshop(
  achieved: readonly string[],
  workshop: Pick<ModelWorkshop, 'objectives'>,
): boolean {
  return achieved.every((goal) => workshop.objectives.some((objective) => objective.id === goal));
}
