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

export function appendLog(
  log: readonly string[] | undefined,
  message: string,
  limit: number,
): string[] {
  return [...(log ?? []), message].slice(-limit);
}
