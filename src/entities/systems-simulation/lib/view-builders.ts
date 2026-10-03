import type { CellTone, ViewCell, ViewControl, ViewMetric } from '../model/types';

export function button(action: string, label: string, value?: string | number): ViewControl {
  return { action, label, ...(value === undefined ? {} : { value: String(value) }) };
}

export function metric(label: string, value: string | number): ViewMetric {
  return { label, value: String(value) };
}

export function cell(label: string, value: string | number, tone: CellTone = 'muted'): ViewCell {
  return { label, value: String(value), tone };
}

// Agrega un mensaje y conserva sólo las últimas `limit` entradas. Acepta un registro
// ausente porque play lo tolera; el resultado es siempre un arreglo nuevo.
export function appendLog(
  log: readonly string[] | undefined,
  message: string,
  limit: number,
): string[] {
  return [...(log ?? []), message].slice(-limit);
}
