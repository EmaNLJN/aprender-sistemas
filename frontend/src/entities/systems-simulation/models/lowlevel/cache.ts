import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView } from '../../model/types';
import {
  achievedFlags,
  baseState,
  resetAction,
  resetButton,
  type LowlevelContext,
  type LowlevelHandler,
  type LowlevelState,
} from './shared';

export interface CacheState extends LowlevelState<'hit' | 'miss' | 'evict'> {
  entries: string[];
  capacity: number;
  hits: number;
  misses: number;
  evictions: number;
}

type CacheAction = 'reset' | 'read';

const KEYS: readonly string[] = ['A', 'B', 'C', 'D'];

const initialState = (): CacheState => ({
  ...baseState<'hit' | 'miss' | 'evict'>(),
  entries: [],
  capacity: 3,
  hits: 0,
  misses: 0,
  evictions: 0,
});

function recordHit(s: CacheState, key: string, { log }: LowlevelContext<CacheState>): void {
  s.entries.splice(s.entries.indexOf(key), 1);
  s.hits++;
  s.flags.hit = true;
  log(s, `HIT ${key}: ya estaba; pasa al extremo más reciente. No duplicamos la entrada.`);
}

function recordMiss(s: CacheState, key: string, { log }: LowlevelContext<CacheState>): void {
  s.misses++;
  s.flags.miss = true;
  if (s.entries.length !== s.capacity) {
    log(s, `MISS ${key}: hay un lugar libre; cargamos una copia de la fuente.`);
    return;
  }
  const victim = s.entries.shift();
  s.evictions++;
  s.flags.evict = true;
  log(
    s,
    `MISS ${key}: sale ${victim}, la menos recientemente usada. No necesariamente fue la primera insertada.`,
  );
}

const read: LowlevelHandler<CacheState> = (s, context) => {
  const key = context.value;
  if (key === undefined || !KEYS.includes(key)) return;
  if (s.entries.includes(key)) recordHit(s, key, context);
  else recordMiss(s, key, context);
  s.entries.push(key);
};

function cacheView(s: CacheState): ModelView {
  return {
    title: 'Una estantería de tres lugares',
    summary: 'Izquierda: menos reciente. Derecha: más reciente. Leer también cambia el orden.',
    metrics: [
      metric('Hits', s.hits),
      metric('Misses', s.misses),
      metric('Expulsiones', s.evictions),
    ],
    cells: Array.from({ length: 3 }, (_, i) =>
      cell(
        `Lugar ${i + 1}`,
        s.entries[i] || 'Vacío',
        i === s.entries.length - 1 ? 'active' : 'muted',
      ),
    ),
    controls: [...KEYS.map((key) => button('read', `Leer ${key}`, key)), resetButton],
    log: s.log,
    explanation:
      'Probá A → B → C → A → D. El segundo A es hit y protege A; al llegar D sale B. La localidad es una hipótesis sobre próximos accesos, no una garantía.',
  };
}

export const cacheModel = defineModel<CacheState, CacheAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), read },
  view: cacheView,
  achieved: achievedFlags,
});
