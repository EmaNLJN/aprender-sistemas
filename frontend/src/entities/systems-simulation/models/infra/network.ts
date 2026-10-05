import { defineModel } from '../../model/define-model';
import type { SystemsModel } from '../../model/types';
import { button, cell, metric } from '../../lib/view-builders';
import {
  INFRA_LOG_LIMIT,
  achievedFlags,
  infraView,
  note,
  withInfraBase,
  type InfraContext,
  type InfraHandler,
  type InfraState,
} from './base';

export interface NetworkState extends InfraState {
  received: Record<string, string>;
  dropped: boolean;
  retried: boolean;
  conflicts: number;
}

type NetworkAction = 'drop-one' | 'retry-one' | 'deliver' | 'conflict';
type NetworkHandler = InfraHandler<NetworkState>;

const FRAGMENTS = ['GO', 'PH', 'ER'];
const FRAGMENT_INDEXES = [0, 1, 2];

const hasReceived = (s: NetworkState, index: number): boolean =>
  Object.hasOwn(s.received, String(index));

function assembled(s: NetworkState): string {
  return FRAGMENT_INDEXES.map((i) => s.received[i]).join('');
}

function acceptNewFragment(
  s: NetworkState,
  ctx: InfraContext<NetworkState>,
  index: number,
  payload: string,
): void {
  if (index === 2 && !hasReceived(s, 0)) s.flags['network-reordered'] = true;
  s.received[String(index)] = payload;
  note(
    s,
    ctx,
    `Guardado fragmento #${index}=${payload}. La posición final depende del índice, no del orden de llegada.`,
  );
}

function reviewKnownFragment(
  s: NetworkState,
  ctx: InfraContext<NetworkState>,
  index: number,
  payload: string,
): void {
  if (s.received[String(index)] === payload) {
    s.flags['network-deduped'] = true;
    note(s, ctx, `Duplicado idéntico #${index}: se reconoce sin agregar datos dos veces.`);
    return;
  }
  s.conflicts++;
  note(
    s,
    ctx,
    `Conflicto #${index}: el mismo índice trae otros bytes. Rechazado; se conserva la primera copia.`,
  );
}

function receiveFragment(
  s: NetworkState,
  ctx: InfraContext<NetworkState>,
  index: number,
  payload: string,
): void {
  if (hasReceived(s, index)) reviewKnownFragment(s, ctx, index, payload);
  else acceptNewFragment(s, ctx, index, payload);
  if (Object.keys(s.received).length === FRAGMENTS.length && s.retried && assembled(s) === 'GOPHER')
    s.flags['network-assembled'] = true;
}

const dropOne: NetworkHandler = (s, ctx) => {
  if (hasReceived(s, 1)) {
    note(s, ctx, 'El fragmento 1 ya fue recibido; perder otra copia no lo borra.');
    return;
  }
  s.dropped = true;
  note(
    s,
    ctx,
    'El fragmento 1 se pierde antes de llegar. El receptor conserva 0 y 2 si ya los tiene.',
  );
};

const retryOne: NetworkHandler = (s, ctx) => {
  if (!s.dropped) {
    note(s, ctx, 'Primero perdé el fragmento 1 para observar una retransmisión necesaria.');
    return;
  }
  s.retried = true;
  s.dropped = false;
  receiveFragment(s, ctx, 1, FRAGMENTS[1]);
};

const deliver: NetworkHandler = (s, ctx) => {
  const index = Number(ctx.value);
  if (!FRAGMENT_INDEXES.includes(index)) return;
  if (index === 1 && s.dropped) {
    note(s, ctx, 'Esa copia se perdió. Usá reintentar para enviar otra copia del fragmento 1.');
    return;
  }
  receiveFragment(s, ctx, index, FRAGMENTS[index]);
};

const conflict: NetworkHandler = (s, ctx) => {
  receiveFragment(s, ctx, 0, 'XX');
};

export const networkModel: SystemsModel<NetworkState> = defineModel<NetworkState, NetworkAction>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      received: {},
      dropped: false,
      retried: false,
      conflicts: 0,
    }),
  actions: { 'drop-one': dropOne, 'retry-one': retryOne, deliver, conflict },
  view: infraView((s) => ({
    title: 'El mensaje llega en pedazos',
    summary: 'Desordená, perdé, duplicá y reensamblá por índice.',
    metrics: [
      metric('Recibidos', Object.keys(s.received).length + '/3'),
      metric('Mensaje', Object.keys(s.received).length === 3 ? assembled(s) : 'incompleto'),
      metric('Conflictos', s.conflicts),
    ],
    cells: FRAGMENTS.map((_, i) =>
      cell(
        '#' + i,
        s.received[i] || (i === 1 && s.dropped ? 'perdido' : 'pendiente'),
        s.received[i] ? 'good' : i === 1 && s.dropped ? 'bad' : 'muted',
      ),
    ),
    controls: [
      button('deliver', 'Entregar #2', 2),
      button('deliver', 'Entregar #0', 0),
      button('drop-one', 'Perder #1'),
      button('deliver', 'Entregar #1', 1),
      button('retry-one', 'Reintentar #1'),
      button('deliver', 'Duplicar #0', 0),
      button('conflict', 'Inyectar #0 distinto'),
    ],
  })),
  achieved: achievedFlags,
});
