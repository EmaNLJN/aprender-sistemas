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

interface Backend {
  name: string;
  healthy: boolean;
  open: boolean;
  inflight: number;
  failures: number;
}

export interface BalancingState extends InfraState {
  nodes: Backend[];
  last: string;
  probed: boolean;
}

type BalancingAction = 'health-a' | 'route' | 'finish' | 'fail-b' | 'probe-b';
type BalancingHandler = InfraHandler<BalancingState>;

const BACKEND_NAMES = ['A', 'B', 'C'];
const MAX_INFLIGHT = 2;
const FAILURE_THRESHOLD = 2;

function chooseBackend(nodes: Backend[]): Backend | undefined {
  return nodes
    .filter((n) => n.healthy && !n.open && n.inflight < MAX_INFLIGHT)
    .sort((a, b) => a.inflight - b.inflight || a.name.localeCompare(b.name))[0];
}

const healthA: BalancingHandler = (s, ctx) => {
  const a = s.nodes[0];
  a.healthy = !a.healthy;
  note(
    s,
    ctx,
    `Health de A: ${a.healthy ? 'sano' : 'no sano'}. No cancelamos las peticiones que ya estaban activas.`,
  );
};

const route: BalancingHandler = (s, ctx) => {
  const target = chooseBackend(s.nodes);
  if (!target) {
    s.last = 'rechazada';
    note(
      s,
      ctx,
      'No hay backend elegible con cupo. La petición se rechaza; no inventamos capacidad.',
    );
    return;
  }
  target.inflight++;
  s.last = target.name;
  if (!s.nodes[0].healthy && target.name !== 'A') s.flags['balancing-health'] = true;
  if (s.probed && target.name === 'B') s.flags['balancing-recovered'] = true;
  note(
    s,
    ctx,
    `Petición enviada a ${target.name}: menor carga elegible; empate por nombre. Salud, circuito y cupo se evalúan antes de elegir.`,
  );
};

const finish: BalancingHandler = (s, ctx) => {
  const name = String(ctx.value);
  const node = BACKEND_NAMES.includes(name) ? s.nodes.find((n) => n.name === name) : undefined;
  if (!node) return;
  if (!node.inflight) {
    note(s, ctx, `No hay petición activa en ${name} para completar.`);
    return;
  }
  node.inflight--;
  if (!node.open) node.failures = 0;
  note(
    s,
    ctx,
    `Éxito en ${name}: libera cupo y corta la racha de fallos si el circuito sigue cerrado.`,
  );
};

const failB: BalancingHandler = (s, ctx) => {
  const b = s.nodes[1];
  if (!b.inflight) {
    note(s, ctx, 'Primero encaminá una petición a B. Un fallo requiere trabajo activo.');
    return;
  }
  b.inflight--;
  if (!b.open) b.failures++;
  if (b.failures >= FAILURE_THRESHOLD) {
    b.open = true;
    s.flags['balancing-opened'] = true;
  }
  note(
    s,
    ctx,
    `Fallo de B: racha ${b.failures}; circuito ${b.open ? 'abierto y excluido' : 'cerrado'}. Umbral didáctico: dos fallos consecutivos.`,
  );
};

const probeB: BalancingHandler = (s, ctx) => {
  const b = s.nodes[1];
  if (!b.open) {
    note(
      s,
      ctx,
      'B no tiene el circuito abierto. Esta sonda manual sirve para recuperarlo después del fallo.',
    );
    return;
  }
  b.open = false;
  b.failures = 0;
  b.healthy = true;
  s.probed = true;
  note(
    s,
    ctx,
    'La sonda manual de B tuvo éxito: cerramos el circuito. No simulamos timers ni una implementación completa de half-open.',
  );
};

export const balancingModel: SystemsModel<BalancingState> = defineModel<
  BalancingState,
  BalancingAction
>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      nodes: BACKEND_NAMES.map((name) => ({
        name,
        healthy: true,
        open: false,
        inflight: 0,
        failures: 0,
      })),
      last: '∅',
      probed: false,
    }),
  actions: {
    'health-a': healthA,
    route,
    finish,
    'fail-b': failB,
    'probe-b': probeB,
  },
  view: infraView((s) => ({
    title: 'El portero de las peticiones',
    summary: 'Menor carga elegible; máximo 2 peticiones activas por backend.',
    metrics: [metric('Último destino', s.last)],
    cells: s.nodes.map((n) =>
      cell(
        n.name,
        `${n.healthy ? 'sano' : 'no sano'} · ${n.open ? 'abierto' : 'cerrado'} · ${n.inflight}/2`,
        !n.healthy || n.open ? 'bad' : n.inflight === 2 ? 'active' : 'good',
      ),
    ),
    controls: [
      button('route', 'Enviar petición'),
      button('health-a', 'Alternar health A'),
      button('finish', 'Completar éxito A', 'A'),
      button('finish', 'Completar éxito B', 'B'),
      button('finish', 'Completar éxito C', 'C'),
      button('fail-b', 'Fallar petición activa B'),
      button('probe-b', 'Sonda exitosa manual B'),
    ],
  })),
  achieved: achievedFlags,
});
