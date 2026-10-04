import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView } from '../../model/types';
import {
  achievedFlags,
  baseState,
  resetAction,
  resetButton,
  type LowlevelHandler,
  type LowlevelState,
} from './shared';

type InterruptsFlag = 'masked' | 'deliver' | 'again';

export interface InterruptsState extends LowlevelState<InterruptsFlag> {
  enabled: boolean;
  pending: boolean;
  inService: boolean;
  data: number | null;
  next: number;
  received: number[];
  overruns: number;
}

type InterruptsAction = 'reset' | 'inject' | 'toggle' | 'dispatch' | 'ack';

const FIRST_BYTE = 65;
const LAST_BYTE = 90;

const initialState = (): InterruptsState => ({
  ...baseState<InterruptsFlag>(),
  enabled: false,
  pending: false,
  inService: false,
  data: null,
  next: FIRST_BYTE,
  received: [],
  overruns: 0,
});

const inject: LowlevelHandler<InterruptsState> = (s, { log }) => {
  const arriving = s.next;
  s.next = s.next === LAST_BYTE ? FIRST_BYTE : s.next + 1;
  if (s.pending) {
    s.overruns++;
    log(
      s,
      `Registro RX lleno: se pierde el byte ${arriving}. Un dispositivo de un solo byte necesita atención o un buffer mayor.`,
    );
    return;
  }
  s.data = arriving;
  s.pending = true;
  if (!s.enabled) s.flags.masked = true;
  log(
    s,
    `El dispositivo puso ${s.data} en RX y activó PENDING. La máscara no impide que se registre el evento.`,
  );
};

const toggle: LowlevelHandler<InterruptsState> = (s, { log }) => {
  s.enabled = !s.enabled;
  log(s, `ENABLE=${s.enabled ? 1 : 0}. Cambiar la máscara no borra PENDING ni confirma atención.`);
};

const dispatch: LowlevelHandler<InterruptsState> = (s, { log }) => {
  if (!s.pending || !s.enabled || s.inService) {
    log(
      s,
      'No entramos a la ISR: hace falta evento pendiente, habilitación y ninguna atención activa.',
    );
    return;
  }
  s.inService = true;
  log(s, `Entrada a ISR: leemos RX=${s.data}. Todavía falta confirmar el evento antes de volver.`);
};

// Un evento en servicio siempre tiene su byte en RX; si falta, el estado está corrupto.
function servicedByte(s: InterruptsState): number {
  if (s.data === null) throw new Error('Estado de interrupciones inconsistente: falta RX');
  return s.data;
}

const ack: LowlevelHandler<InterruptsState> = (s, { log }) => {
  if (!s.inService) {
    log(
      s,
      'No hay ISR activa. Este control solo confirma después de atender; no descarta eventos pendientes.',
    );
    return;
  }
  s.received.push(servicedByte(s));
  s.pending = false;
  s.data = null;
  s.inService = false;
  s.flags.deliver = true;
  if (s.received.length >= 2) s.flags.again = true;
  log(
    s,
    'ACK: en nuestro registro W1C escribimos 1 para borrar PENDING. La ISR retorna; un evento nuevo puede notificarse de nuevo.',
  );
};

function interruptsView(s: InterruptsState): ModelView {
  return {
    title: 'El timbre y su máscara',
    summary:
      'Periférico ficticio: RX guarda un byte, STATUS.PENDING avisa, ENABLE permite atender. ACK es write-one-to-clear.',
    metrics: [
      metric('Entregados', s.received.join(', ') || 'Ninguno'),
      metric('Entradas perdidas', s.overruns),
      metric('CPU', s.inService ? 'Dentro de ISR' : 'Programa principal'),
    ],
    cells: [
      cell('MMIO RX', s.data === null ? 'Vacío' : s.data, 'active'),
      cell('PENDING', Number(s.pending), s.pending ? 'bad' : 'good'),
      cell('ENABLE', Number(s.enabled), s.enabled ? 'good' : 'muted'),
    ],
    controls: [
      button('inject', 'Llega un byte'),
      button('toggle', s.enabled ? 'Enmascarar IRQ' : 'Habilitar IRQ'),
      button('dispatch', 'Intentar entrar a ISR'),
      button('ack', 'ACK y retornar'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Generá un evento con IRQ enmascarada; queda pendiente. Habilitá, entrá a ISR y confirmá. Repetí para recibir otro byte. Los registros y la forma de ACK cambian entre dispositivos: el manual manda.',
  };
}

export const interruptsModel = defineModel<InterruptsState, InterruptsAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), inject, toggle, dispatch, ack },
  view: interruptsView,
  achieved: achievedFlags,
});
