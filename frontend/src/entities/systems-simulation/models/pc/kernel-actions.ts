import { cloneJson } from '../../../../shared/lib/clone-json';
import type { PcHandler } from './handler-types';
import { createInitialState, protectionProgram } from './initial-state';
import { timerTrap } from './state-guards';
import type { PcScenario, PcState } from './types';

const isScenario = (value: string | undefined): value is PcScenario =>
  value === 'normal' || value === 'protection';

// Loading a program resets the machine but keeps observations and log.
export const loadProgram: PcHandler = (s, { value, log }) => {
  if (!isScenario(value)) return;
  const fresh: PcState = createInitialState();
  fresh.observed = cloneJson(s.observed);
  fresh.log = s.log;
  fresh.scenario = value;
  if (value === 'protection') fresh.program = protectionProgram();
  return log(
    fresh,
    `Programa ${value === 'normal' ? 'normal' : 'de protección'} cargado. Registros, RAM, TLB y métricas vuelven al inicio; conservamos las observaciones educativas.`,
  );
};

export const pulseTimer: PcHandler = (s, { log }) => {
  if (s.halted) {
    log(s, 'La CPU está detenida: cargá un programa antes de inyectar un timer.');
    return;
  }
  if (s.irqPending) {
    log(
      s,
      'La línea del timer ya está pendiente. Este modelo coalesce pulsos: no suma una cola de interrupciones.',
    );
    return;
  }
  s.irqPending = true;
  log(
    s,
    'El timer levantó IRQ. No modifica PC ni RAM: se atenderá en la próxima frontera de instrucciones en modo usuario.',
  );
};

export const mapAbsentPage: PcHandler = (s, { log }) => {
  if (s.phase !== 'fault' || s.trap?.cause !== 'absent' || s.trap.mapped) return;
  s.table[2] = { frame: 2, write: true };
  s.tlb[2] = null;
  s.ram.fill(0, 8, 12);
  s.trap.mapped = true;
  log(
    s,
    'Kernel: VPN 2 pertenece a la región demand-zero del programa. Reserva marco 2, lo pone en cero, publica PTE RW e invalida su traducción. PC todavía no avanza.',
  );
};

export const acknowledgeTimer: PcHandler = (s, { log }) => {
  if (s.phase !== 'irq') return;
  const trap = timerTrap(s);
  if (trap.acked) {
    log(s, 'Ese timer ya fue reconocido; falta volver al programa.');
    return;
  }
  s.irqPending = false;
  trap.acked = true;
  log(
    s,
    'ACK del timer: bajamos la señal pendiente. Atender la causa y volver a usuario son dos acciones distintas.',
  );
};

const returnFromIrq: PcHandler = (s, { log }) => {
  const trap = timerTrap(s);
  if (!trap.acked) {
    log(
      s,
      'Retorno bloqueado en este modelo: primero reconocé el timer para evitar una reentrada inmediata.',
    );
    return;
  }
  s.pc = trap.pc;
  s.acc = trap.acc;
  s.trap = null;
  s.mode = 'user';
  s.phase = 'fetch';
  s.observed.interrupt = true;
  log(
    s,
    `Retorno de IRQ: restauramos PC ${s.pc} y A ${s.acc}. Ninguna instrucción del usuario fue ejecutada por el handler.`,
  );
};

const retryAbsentAccess: PcHandler = (s, { log }) => {
  if (s.trap?.cause !== 'absent') return;
  if (!s.trap.mapped) {
    log(
      s,
      'Todavía no hay mapeo: volver ahora repetiría el mismo page fault. Primero resolvé su causa.',
    );
    return;
  }
  s.pc = s.trap.pc;
  s.acc = s.trap.acc;
  s.retryPC = s.pc;
  s.trap = null;
  s.mode = 'user';
  s.phase = 'fetch';
  s.instruction = null;
  s.translation = null;
  s.physical = null;
  log(
    s,
    `Volvemos a PC ${s.pc}, la misma instrucción fallida. Reintentar no significa saltear la operación.`,
  );
};

// `return` means something different for each exception: resume after an IRQ or retry the fault.
export const returnToUser: PcHandler = (s, context) => {
  if (s.phase === 'irq') return returnFromIrq(s, context);
  if (s.phase === 'fault') return retryAbsentAccess(s, context);
};

export const abortProgram: PcHandler = (s, { log }) => {
  if (s.phase !== 'fault' || s.trap?.cause !== 'protection') return;
  s.halted = true;
  s.phase = 'halt';
  log(
    s,
    'Política del kernel de juguete: termina este programa por escritura prohibida. No concede W ni saltea silenciosamente el STORE. Cargá el programa normal para continuar explorando.',
  );
};
