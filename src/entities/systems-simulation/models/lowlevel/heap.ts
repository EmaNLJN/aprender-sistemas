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

type HeapFlag = 'fragment' | 'allocate' | 'coalesce';

interface HeapBlock {
  start: number;
  size: number;
  owner: string | null;
}

export interface HeapState extends LowlevelState<HeapFlag> {
  blocks: HeapBlock[];
  serial: number;
  failures: number;
}

type HeapAction = 'reset' | 'allocate' | 'free' | 'coalesce';

const SIZES = [4, 6, 8, 12];

const initialState = (): HeapState => ({
  ...baseState<HeapFlag>(),
  blocks: [{ start: 0, size: 24, owner: null }],
  serial: 0,
  failures: 0,
});

const totalFree = (blocks: HeapBlock[]): number =>
  blocks.filter((b) => b.owner === null).reduce((n, b) => n + b.size, 0);

function rejectAllocation(s: HeapState, size: number, { log }: LowlevelContext<HeapState>) {
  const free = totalFree(s.blocks);
  s.failures++;
  if (free >= size) s.flags.fragment = true;
  log(
    s,
    `No entra un bloque de ${size}: hay ${free} unidades libres en total, pero ningún hueco individual suficiente.`,
  );
}

function placeBlock(
  s: HeapState,
  index: number,
  size: number,
  { log }: LowlevelContext<HeapState>,
): void {
  const b = s.blocks[index];
  const owner = `A${++s.serial}`;
  const pieces: HeapBlock[] = [{ start: b.start, size, owner }];
  if (b.size > size) pieces.push({ start: b.start + size, size: b.size - size, owner: null });
  s.blocks.splice(index, 1, ...pieces);
  s.flags.allocate = true;
  log(
    s,
    `${owner} ocupa [${b.start}, ${b.start + size}). First-fit eligió el primer hueco que alcanza; el sobrante sigue libre.`,
  );
}

const allocate: LowlevelHandler<HeapState> = (s, context) => {
  const size = Number(context.value);
  if (!SIZES.includes(size)) return;
  const index = s.blocks.findIndex((b) => b.owner === null && b.size >= size);
  if (index < 0) rejectAllocation(s, size, context);
  else placeBlock(s, index, size, context);
};

const free: LowlevelHandler<HeapState> = (s, { value, log }) => {
  const block = s.blocks.find((b) => b.owner === value);
  if (!block) {
    log(s, 'Ese bloque no está asignado; no cambiamos el mapa.');
    return;
  }
  block.owner = null;
  log(
    s,
    `Liberaste ${value}. Los bloques vecinos no se mueven. Usá Coalescer para unir huecos contiguos.`,
  );
};

const isAdjacentFree = (last: HeapBlock | undefined, block: HeapBlock): last is HeapBlock =>
  last !== undefined &&
  last.owner === null &&
  block.owner === null &&
  last.start + last.size === block.start;

const coalesce: LowlevelHandler<HeapState> = (s, { log }) => {
  const merged: HeapBlock[] = [];
  let joins = 0;
  for (const block of s.blocks) {
    const last = merged[merged.length - 1];
    if (isAdjacentFree(last, block)) {
      last.size += block.size;
      joins++;
    } else merged.push({ ...block });
  }
  s.blocks = merged;
  if (joins) s.flags.coalesce = true;
  log(
    s,
    joins
      ? `Se unieron ${joins} fronteras libres. Coalescer no desplaza objetos: solo combina intervalos vecinos.`
      : 'No hay huecos libres contiguos que unir.',
  );
};

function heapView(s: HeapState): ModelView {
  const holes = s.blocks.filter((b) => b.owner === null);
  return {
    title: 'Heap de 24 unidades',
    summary:
      'Cada intervalo incluye su inicio y excluye su final. Los bloques cubren exactamente 0..24.',
    metrics: [
      metric('Libre total', totalFree(s.blocks)),
      metric('Mayor hueco', Math.max(0, ...holes.map((b) => b.size))),
      metric('Rechazos', s.failures),
    ],
    cells: s.blocks.map((b) =>
      cell(`[${b.start}, ${b.start + b.size})`, b.owner || 'Libre', b.owner ? 'active' : 'good'),
    ),
    controls: [
      ...SIZES.map((n) => button('allocate', `Reservar ${n}`, n)),
      ...s.blocks.flatMap((b) => (b.owner ? [button('free', `Liberar ${b.owner}`, b.owner)] : [])),
      button('coalesce', 'Coalescer huecos'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Para observar fragmentación: reservá cuatro bloques de 6, liberá A2 y A4 e intentá reservar 8. Después liberá A3 y coalescé: tres huecos contiguos se vuelven uno.',
  };
}

export const heapModel = defineModel<HeapState, HeapAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), allocate, free, coalesce },
  view: heapView,
  achieved: achievedFlags,
});
