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

interface Replica {
  name: string;
  version: number;
}

export interface QuorumState extends InfraState {
  nodes: Replica[];
  reachable: boolean[];
  version: number;
  lastRead: number | null;
}

type QuorumAction =
  'isolate-c' | 'minority' | 'heal' | 'write' | 'read-one' | 'read-quorum' | 'repair';
type QuorumHandler = InfraHandler<QuorumState>;

const respondingNodes = (s: QuorumState): Replica[] => s.nodes.filter((_, i) => s.reachable[i]);

const isolateC: QuorumHandler = (s, ctx) => {
  s.reachable = [true, true, false];
  note(s, ctx, 'C queda separada del coordinador; A y B todavía responden.');
};

const minority: QuorumHandler = (s, ctx) => {
  s.reachable = [false, false, true];
  note(s, ctx, 'Solo C responde al coordinador: una réplica no satisface W=2 ni R=2.');
};

const heal: QuorumHandler = (s, ctx) => {
  s.reachable = [true, true, true];
  note(s, ctx, 'La red vuelve; sanar la conectividad no copia los datos por sí solo.');
};

const write: QuorumHandler = (s, ctx) => {
  const available = respondingNodes(s);
  if (available.length < 2) {
    s.flags['quorum-unavailable'] = true;
    note(
      s,
      ctx,
      'W=2 no alcanzado. En este modelo la propuesta se rechaza antes de instalarla; sistemas reales pueden dejar escrituras parciales.',
    );
    return;
  }
  s.version++;
  for (const node of available) node.version = s.version;
  note(
    s,
    ctx,
    `Escritura v${s.version} confirmada por ${available.map((n) => n.name).join(', ')}. Un escritor único asigna versiones en este modelo.`,
  );
};

const readOne: QuorumHandler = (s, ctx) => {
  const node = s.reachable[2] ? s.nodes[2] : s.nodes.find((_, i) => s.reachable[i]);
  if (!node) return;
  s.lastRead = node.version;
  if (node.version < s.version) s.flags['quorum-stale'] = true;
  note(
    s,
    ctx,
    `Lectura R=1 desde ${node.name}: v${node.version}. Responder rápido no implica observar la última escritura confirmada.`,
  );
};

const readQuorum: QuorumHandler = (s, ctx) => {
  const responses = respondingNodes(s).slice(0, 2);
  if (responses.length < 2) {
    note(s, ctx, 'R=2 no alcanzado: la lectura queda indisponible.');
    return;
  }
  s.lastRead = Math.max(...responses.map((n) => n.version));
  note(
    s,
    ctx,
    `R=2 respondió v${s.lastRead}. W+R>N garantiza intersección de conjuntos fijos; elegir la versión exige las hipótesis adicionales de este juguete.`,
  );
};

const repair: QuorumHandler = (s, ctx) => {
  if (!s.reachable.every(Boolean)) {
    note(s, ctx, 'Reparación detenida: primero reuní las tres réplicas.');
    return;
  }
  const max = Math.max(...s.nodes.map((n) => n.version));
  const differed = s.nodes.some((n) => n.version < max);
  for (const node of s.nodes) node.version = max;
  if (differed && max > 0) s.flags['quorum-repaired'] = true;
  note(
    s,
    ctx,
    `Reparación explícita: las tres copias quedan en v${max}. No elegimos líder ni ejecutamos consenso.`,
  );
};

export const quorumModel: SystemsModel<QuorumState> = defineModel<QuorumState, QuorumAction>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      nodes: [
        { name: 'A', version: 0 },
        { name: 'B', version: 0 },
        { name: 'C', version: 0 },
      ],
      reachable: [true, true, true],
      version: 0,
      lastRead: null,
    }),
  actions: {
    'isolate-c': isolateC,
    minority,
    heal,
    write,
    'read-one': readOne,
    'read-quorum': readQuorum,
    repair,
  },
  view: infraView((s) => ({
    title: 'Tres copias, respuestas distintas',
    summary: 'N=3, W=2; compará R=1 y R=2 bajo particiones.',
    metrics: [
      metric('Última confirmada', 'v' + s.version),
      metric('Última lectura', s.lastRead === null ? '∅' : 'v' + s.lastRead),
    ],
    cells: s.nodes.map((n, i) =>
      cell(
        n.name + (s.reachable[i] ? ' conectada' : ' aislada'),
        'v' + n.version,
        !s.reachable[i] ? 'bad' : n.version === s.version ? 'good' : 'active',
      ),
    ),
    controls: [
      button('isolate-c', 'Aislar C'),
      button('write', 'Escribir con W=2'),
      button('heal', 'Sanar red'),
      button('read-one', 'Leer una copia (prefiere C)'),
      button('read-quorum', 'Leer con R=2'),
      button('minority', 'Dejar solo C accesible'),
      button('repair', 'Reparar réplicas conectadas'),
    ],
  })),
  achieved: achievedFlags,
});
