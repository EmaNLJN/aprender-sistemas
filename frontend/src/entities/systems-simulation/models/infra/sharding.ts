import { cloneJson } from '../../../../shared/lib/clone-json';
import { defineModel } from '../../model/define-model';
import type { SystemsModel } from '../../model/types';
import { button, cell, metric } from '../../lib/view-builders';
import {
  INFRA_LOG_LIMIT,
  achievedFlags,
  infraView,
  note,
  withInfraBase,
  type InfraHandler,
  type InfraState,
} from './base';

interface RingToken {
  token: number;
  node: string;
}

export interface ShardingState extends InfraState {
  ring: RingToken[];
  compared: boolean;
  selected: number;
}

type ShardingAction = 'inspect-wrap' | 'add' | 'compare' | 'remove';
type ShardingHandler = InfraHandler<ShardingState>;

const BASELINE_RING: RingToken[] = [
  { token: 10, node: 'A' },
  { token: 40, node: 'B' },
  { token: 70, node: 'C' },
];
const SHARD_KEYS = [5, 15, 30, 45, 65, 85, 95];

function owner(ring: RingToken[], hash: number): string | null {
  const sorted = ring.slice().sort((a, b) => a.token - b.token);
  return (sorted.find((n) => n.token >= hash) || sorted[0])?.node || null;
}

function movements(ring: RingToken[]): number[] {
  return SHARD_KEYS.filter((key) => owner(ring, key) !== owner(BASELINE_RING, key));
}

const hasD = (s: ShardingState): boolean => s.ring.some((n) => n.node === 'D');

const inspectWrap: ShardingHandler = (s, ctx) => {
  s.selected = 95;
  if (owner(s.ring, 95) === 'A') s.flags['sharding-wrap'] = true;
  note(
    s,
    ctx,
    'Hash 95 supera el último token: la búsqueda vuelve al primer token, 10/A. El anillo no tiene un final especial.',
  );
};

const add: ShardingHandler = (s, ctx) => {
  if (hasD(s)) {
    note(s, ctx, 'D ya tiene su token 25 en el anillo.');
    return;
  }
  s.ring.push({ token: 25, node: 'D' });
  s.ring.sort((a, b) => a.token - b.token);
  const moved = movements(s.ring);
  if (moved.length > 0 && moved.every((key) => key > 10 && key <= 25 && owner(s.ring, key) === 'D'))
    s.flags['sharding-local'] = true;
  note(
    s,
    ctx,
    `Agregar 25/D mueve únicamente hashes en (10,25]. Muestras movidas: ${moved.join(', ')}. No se migraron bytes reales.`,
  );
};

const compare: ShardingHandler = (s, ctx) => {
  if (!hasD(s)) {
    note(s, ctx, 'Agregá D para comparar el mismo cambio de membresía.');
    return;
  }
  const moduloMoved = SHARD_KEYS.filter((key) => 'ABC'[key % 3] !== 'ABCD'[key % 4]).length;
  s.compared = true;
  if (movements(s.ring).length < moduloMoved) s.flags['sharding-compared'] = true;
  note(
    s,
    ctx,
    `En estas 7 muestras: anillo mueve ${movements(s.ring).length}, hash mod N mueve ${moduloMoved}. Es un ejemplo concreto, no una garantía de equilibrio para toda carga.`,
  );
};

const remove: ShardingHandler = (s, ctx) => {
  s.ring = cloneJson(BASELINE_RING);
  s.compared = false;
  note(
    s,
    ctx,
    'Se retiró D: las claves de su intervalo vuelven al sucesor B. La migración de almacenamiento queda como proyecto.',
  );
};

export const shardingModel: SystemsModel<ShardingState> = defineModel<
  ShardingState,
  ShardingAction
>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      ring: cloneJson(BASELINE_RING),
      compared: false,
      selected: 95,
    }),
  actions: { 'inspect-wrap': inspectWrap, add, compare, remove },
  view: infraView((s) => ({
    title: 'Repartir sin moverlo todo',
    summary: 'Hashes ya calculados en 0…99; elegimos el primer token ≥ hash, con vuelta al inicio.',
    metrics: [
      metric('Nodos', s.ring.length),
      metric('Claves movidas', movements(s.ring).length + '/7'),
    ],
    cells: s.ring.map((n) => cell('Token ' + n.token, n.node, n.node === 'D' ? 'active' : 'good')),
    columns: ['Hash', 'Antes', 'Ahora'],
    rows: SHARD_KEYS.map((key) => [
      String(key),
      owner(BASELINE_RING, key) ?? '',
      owner(s.ring, key) ?? '',
    ]),
    controls: [
      button('inspect-wrap', 'Inspeccionar hash 95'),
      button('add', 'Agregar D en token 25'),
      button('compare', 'Comparar con hash mod N'),
      button('remove', 'Retirar D'),
    ],
  })),
  achieved: achievedFlags,
});
