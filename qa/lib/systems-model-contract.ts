import assert from 'node:assert/strict';

// Contrato de vista de los modelos de Sistemas (systems-*.js): reglas que los
// cinco checks de qa/systems-*-check.ts verifican de la misma manera. Las reglas
// de cada dominio (estado, escenas, invariantes) viven en su propio check.

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

// Congela en profundidad para que cualquier mutación de `act` o `view` falle o
// quede detectada por la comparación posterior.
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

// Regla: la entrada no cambió. `before` es el JSON capturado antes de operar.
export function assertUnchanged(value: unknown, before: string, message: string): void {
  assert.equal(JSON.stringify(value), before, message);
}

// Regla: el estado sólo contiene valores JSON con números finitos.
export function isFiniteJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFiniteJsonValue);
  if (Object.prototype.toString.call(value) === '[object Object]')
    return Object.values(value as Record<string, unknown>).every(isFiniteJsonValue);
  return false;
}

// Misma regla que `isFiniteJsonValue` (objetos planos, arreglos, null, textos,
// booleanos y números finitos), con mensajes que distinguen el motivo.
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

// Regla: title, summary y explanation son textos.
export function hasTextFields(view: ModelView): boolean {
  return (
    typeof view.title === 'string' &&
    typeof view.summary === 'string' &&
    typeof view.explanation === 'string'
  );
}

// Regla: metrics, cells, controls y log son colecciones.
export function hasViewCollections(view: ModelView): boolean {
  return (
    Array.isArray(view.metrics) &&
    Array.isArray(view.cells) &&
    Array.isArray(view.controls) &&
    Array.isArray(view.log)
  );
}

// Regla: cada celda usa uno de los tonos que el renderizador sabe pintar.
export function hasSupportedTones(cells: readonly ViewCell[]): boolean {
  return cells.every((cell) => CELL_TONES.includes(cell.tone));
}

// Regla: cada control tiene action y label de texto, y value ausente o de texto.
export function isControlContract(control: ViewControl): boolean {
  return (
    typeof control.action === 'string' &&
    typeof control.label === 'string' &&
    (control.value === undefined || typeof control.value === 'string')
  );
}

// Regla: si hay filas, hay columnas y cada fila tiene un texto por columna.
export function rowsMatchColumns(view: ModelView): boolean {
  if (!view.rows) return true;
  const columns = view.columns;
  if (!columns) return false;
  return view.rows.every(
    (row) => row.length === columns.length && row.every((value) => typeof value === 'string'),
  );
}

// Regla: todo objetivo logrado pertenece al taller.
export function achievedBelongToWorkshop(
  achieved: readonly string[],
  workshop: Pick<ModelWorkshop, 'objectives'>,
): boolean {
  return achieved.every((goal) => workshop.objectives.some((objective) => objective.id === goal));
}
