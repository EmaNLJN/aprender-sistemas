export type Clock = string | null;

export interface Written<V> {
  value: V;
  at: Clock;
}

export interface Merged<S> {
  state: S;
  changed: boolean;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function incomingWins(stored: Written<unknown> | null, incoming: Written<unknown>): boolean {
  if (stored === null || stored.at === null) return true;
  return incoming.at !== null && incoming.at >= stored.at;
}

export function mergeRegister<V>(
  stored: Written<V> | null,
  incoming: Written<V>,
): Merged<Written<V>> {
  if (!incomingWins(stored, incoming)) return { state: stored as Written<V>, changed: false };
  const state = { value: incoming.value, at: incoming.at };
  return { state, changed: stored === null || !sameJson(stored, state) };
}

function earliestKnown(a: Clock, b: Clock): Clock {
  if (a === null) return b;
  if (b === null) return a;
  return a <= b ? a : b;
}

export function mergeFlag(stored: boolean, incoming: boolean): Merged<boolean> {
  return { state: stored || incoming, changed: !stored && incoming };
}

export function mergeMax(stored: number | null, incoming: number): Merged<number> {
  const changed = stored === null || incoming > stored;
  return { state: changed ? incoming : (stored as number), changed };
}

export interface DatedFlag {
  value: boolean;
  at: Clock;
}

export function mergeDatedFlag(stored: DatedFlag | null, incoming: DatedFlag): Merged<DatedFlag> {
  const base = stored ?? { value: false, at: null };
  if (!incoming.value) return { state: base, changed: false };
  const state = { value: true, at: earliestKnown(base.at, incoming.at) };
  return { state, changed: !base.value || state.at !== base.at };
}

export interface Observed {
  key: string;
  at: Clock;
}

export function mergeObserved(stored: readonly Observed[], incoming: Observed): Merged<Observed[]> {
  const existing = stored.find((item) => item.key === incoming.key);
  const at = existing === undefined ? incoming.at : earliestKnown(existing.at, incoming.at);
  const changed = existing === undefined || existing.at !== at;
  const others = stored.filter((item) => item.key !== incoming.key);
  const state = [...others, { key: incoming.key, at }].sort((x, y) => (x.key < y.key ? -1 : 1));
  return { state: changed ? state : [...stored], changed };
}
