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

type NodeName = 'A' | 'B' | 'C';

interface Message {
  from: NodeName;
  to: NodeName;
  stamp: number;
  chained: boolean;
}

export interface ClocksState extends InfraState {
  clocks: Record<NodeName, number>;
  messages: Message[];
  events: string[][];
  sawAB: boolean;
}

type ClocksAction = 'local-a' | 'local-b' | 'send-ab' | 'send-bc' | 'deliver';
type ClocksHandler = InfraHandler<ClocksState>;

const EVENT_LIMIT = 10;

function keepRecentEvents(s: ClocksState): void {
  s.events = s.events.slice(-EVENT_LIMIT);
}

function localEvent(node: 'A' | 'B'): ClocksHandler {
  return (s, ctx) => {
    const stamp = ++s.clocks[node];
    s.events.push([node, 'local', String(stamp)]);
    if (!s.messages.length && !s.sawAB && s.clocks.A === 1 && s.clocks.B === 1)
      s.flags['clocks-independent'] = true;
    note(
      s,
      ctx,
      `${node} ejecuta un evento local: L=${stamp}. Igualdad o desigualdad de contadores no prueba causalidad entre nodos.`,
    );
    keepRecentEvents(s);
  };
}

function sendEvent(from: 'A' | 'B', to: 'B' | 'C'): ClocksHandler {
  return (s, ctx) => {
    const stamp = ++s.clocks[from];
    s.messages.push({ from, to, stamp, chained: from === 'B' && s.sawAB });
    s.events.push([from, 'envía a ' + to, String(stamp)]);
    note(
      s,
      ctx,
      `Enviar también es un evento: ${from} incrementa a ${stamp} y adjunta ese sello al mensaje.`,
    );
    keepRecentEvents(s);
  };
}

const deliver: ClocksHandler = (s, ctx) => {
  const message = s.messages.shift();
  if (!message) {
    note(s, ctx, 'No hay mensaje pendiente que recibir.');
    return;
  }
  const old = s.clocks[message.to];
  s.clocks[message.to] = Math.max(old, message.stamp) + 1;
  s.events.push([message.to, 'recibe de ' + message.from, String(s.clocks[message.to])]);
  s.flags['clocks-receive'] = true;
  if (message.from === 'A' && message.to === 'B') s.sawAB = true;
  if (message.chained && message.to === 'C') s.flags['clocks-chain'] = true;
  note(
    s,
    ctx,
    `${message.to}: max(${old}, ${message.stamp}) + 1 = ${s.clocks[message.to]}. La recepción sucede después del envío en el orden causal.`,
  );
  keepRecentEvents(s);
};

export const clocksModel: SystemsModel<ClocksState> = defineModel<ClocksState, ClocksAction>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      clocks: { A: 0, B: 0, C: 0 },
      messages: [],
      events: [],
      sawAB: false,
    }),
  actions: {
    'local-a': localEvent('A'),
    'local-b': localEvent('B'),
    'send-ab': sendEvent('A', 'B'),
    'send-bc': sendEvent('B', 'C'),
    deliver,
  },
  view: infraView((s) => ({
    title: 'Orden sin reloj de pared',
    summary: 'Los sellos Lamport respetan precedencia causal; no miden segundos.',
    metrics: [metric('Mensajes en tránsito', s.messages.length)],
    cells: Object.entries(s.clocks).map(([name, time]) => cell(name, 'L=' + time, 'active')),
    columns: ['Nodo', 'Evento', 'Lamport'],
    rows: s.events,
    controls: [
      button('local-a', 'Evento local A'),
      button('local-b', 'Evento local B'),
      button('send-ab', 'Enviar A → B'),
      button('send-bc', 'Enviar B → C'),
      button('deliver', 'Entregar siguiente mensaje'),
    ],
  })),
  achieved: achievedFlags,
});
