import { cloneJson } from '../../../../shared/lib/clone-json';
import { defineModel } from '../../model/define-model';
import type { SystemsModel } from '../../model/types';
import { appendLog, button, cell, metric } from '../../lib/view-builders';
import {
  INFRA_LOG_LIMIT,
  achievedFlags,
  infraView,
  note,
  shown,
  withInfraBase,
  type InfraHandler,
  type InfraState,
} from './base';

type WalRecord = { kind: 'put'; value: number } | { kind: 'commit' };

export interface WalState extends InfraState {
  records: WalRecord[];
  durable: number;
  visible: number | null;
  pending: number | null;
  down: boolean;
}

type WalAction = 'crash' | 'recover' | 'put' | 'commit' | 'sync';
type WalHandler = InfraHandler<WalState>;

const PUT_VALUES = ['10', '20'];
const DOWN_NOTICE = 'El proceso está caído. Ejecutá recuperación antes de aceptar otra operación.';

function walValue(records: WalRecord[]): number | null {
  let pending: number | null = null;
  let value: number | null = null;
  for (const record of records) {
    if (record.kind === 'put') pending = record.value;
    if (record.kind === 'commit' && pending !== null) {
      value = pending;
      pending = null;
    }
  }
  return value;
}

const crash: WalHandler = (s, ctx) => {
  const recovered = walValue(s.records.slice(0, s.durable));
  if (s.visible !== null && s.visible !== recovered) s.flags['wal-loss'] = true;
  s.records = s.records.slice(0, s.durable);
  s.visible = null;
  s.pending = null;
  s.down = true;
  note(
    s,
    ctx,
    'Corte de energía: se perdió RAM y la cola no sincronizada. Solo sobrevive el prefijo durable.',
  );
};

const recover: WalHandler = (s, ctx) => {
  s.visible = walValue(s.records.slice(0, s.durable));
  if (s.down && s.visible !== null) s.flags['wal-recovered'] = true;
  s.pending = null;
  s.down = false;
  note(
    s,
    ctx,
    `Replay: valor visible ${shown(s.visible)}. Los PUT sin COMMIT durable no se publican.`,
  );
};

const put: WalHandler = (s, ctx) => {
  if (!PUT_VALUES.includes(String(ctx.value))) return;
  s.pending = Number(ctx.value);
  s.records.push({ kind: 'put', value: s.pending });
  note(
    s,
    ctx,
    `PUT saldo=${ctx.value} agregado al buffer del WAL; todavía no hay commit ni promesa de durabilidad.`,
  );
};

const commit: WalHandler = (s, ctx) => {
  if (s.pending === null) {
    note(s, ctx, 'No hay escritura pendiente que confirmar.');
    return;
  }
  s.records.push({ kind: 'commit' });
  s.visible = s.pending;
  s.pending = null;
  note(
    s,
    ctx,
    `COMMIT visible en este proceso: ${s.visible}. Aún no prometimos supervivencia a un corte.`,
  );
};

const sync: WalHandler = (s, ctx) => {
  s.durable = s.records.length;
  if (walValue(s.records) !== null) s.flags['wal-durable'] = true;
  note(
    s,
    ctx,
    'Barrera durable completada en el modelo: el WAL y sus commits hasta aquí sobrevivirán al corte simulado.',
  );
};

const wal = defineModel<WalState, WalAction>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      records: [],
      durable: 0,
      visible: null,
      pending: null,
      down: false,
    }),
  actions: { crash, recover, put, commit, sync },
  view: infraView((s) => ({
    title: 'La caja negra de la base',
    summary: 'Un escritor, una clave, un prefijo durable explícito.',
    metrics: [
      metric('Valor visible', shown(s.visible)),
      metric('Registros durables', s.durable),
      metric('Proceso', s.down ? 'caído' : 'activo'),
    ],
    cells: s.records.map((r, i) =>
      cell(
        '#' + (i + 1),
        r.kind === 'put' ? 'PUT ' + r.value : 'COMMIT',
        i < s.durable ? 'good' : 'active',
      ),
    ),
    controls: [
      button('put', 'Preparar saldo=10', 10),
      button('put', 'Preparar saldo=20', 20),
      button('commit', 'Agregar COMMIT'),
      button('sync', 'Sincronizar WAL durable'),
      button('crash', 'Cortar energía'),
      button('recover', 'Recuperar desde WAL'),
    ],
  })),
  achieved: achievedFlags,
});

// Caído, el proceso sólo atiende `crash` y `recover`: cualquier otra acción, conocida o no,
// recibe el aviso. La tabla de acciones no ve las desconocidas, por eso la guarda va afuera.
function rejectWhileDown(state: WalState): WalState {
  const next = cloneJson(state);
  next.notice = DOWN_NOTICE;
  next.log = appendLog(next.log, DOWN_NOTICE, INFRA_LOG_LIMIT);
  return next;
}

export const walModel: SystemsModel<WalState> = {
  ...wal,
  act(state, action, value, workshop) {
    const blocked = state.down && action !== 'crash' && action !== 'recover';
    return blocked ? rejectWhileDown(state) : wal.act(state, action, value, workshop);
  },
};
