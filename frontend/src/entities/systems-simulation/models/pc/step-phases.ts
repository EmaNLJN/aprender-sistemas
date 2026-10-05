import { cloneJson } from '../../../../shared/lib/clone-json';
import type { PcContext, PcHandler } from './handler-types';
import { storeSuffix, virtualPageOf } from './instruction-text';
import { currentInstruction, currentPhysical, currentTranslation, copyEntry } from './state-guards';
import type { PcPhase, PcState } from './types';

type PageFault = 'absent' | 'protection';

// Un fault es síncrono: entra al kernel sin retirar la instrucción ni tocar RAM.
function raiseFault(s: PcState, cause: PageFault, { log }: PcContext): void {
  s.trap = { cause, pc: s.pc, acc: s.acc, mapped: false };
  s.mode = 'kernel';
  s.phase = 'fault';
  s.faults++;
  if (cause === 'protection') s.observed.protection = true;
  log(
    s,
    cause === 'absent'
      ? `PAGE FAULT síncrono en PC ${s.pc}: VPN ${virtualPageOf(currentInstruction(s).va)} no está presente. No retiramos la instrucción ni cambiamos RAM.`
      : `FAULT de protección en PC ${s.pc}: STORE pidió escritura en una página R. RAM queda intacta, incluso si hubo TLB HIT.`,
  );
}

function acceptTimerIrq(s: PcState, { log }: PcContext): void {
  s.trap = { cause: 'timer', pc: s.pc, acc: s.acc, acked: false };
  s.mode = 'kernel';
  s.phase = 'irq';
  s.interrupts++;
  log(
    s,
    `IRQ asíncrona aceptada antes de PC ${s.pc}: guardamos PC y A. Interrupciones anidadas quedan enmascaradas en el handler.`,
  );
}

const fetchInstruction: PcHandler = (s, context) => {
  if (s.irqPending) return acceptTimerIrq(s, context);
  const instruction = s.program[s.pc];
  if (!instruction || instruction.op === 'HALT') {
    s.halted = true;
    s.phase = 'halt';
    if (instruction) s.retired++;
    context.log(s, 'HALT: terminó el programa. Cargá otro escenario o reiniciá para repetir.');
    return;
  }
  s.instruction = cloneJson(instruction);
  s.translation = null;
  s.physical = null;
  s.phase = 'tlb';
  context.log(
    s,
    `CPU decodifica ${instruction.op} VA ${instruction.va}${storeSuffix(instruction)}. VPN=${virtualPageOf(instruction.va)}, offset=${instruction.va % 4}. PC queda ${s.pc} hasta completar.`,
  );
};

const consultTlb: PcHandler = (s, { log }) => {
  const vpn = virtualPageOf(currentInstruction(s).va);
  const cached = s.tlb[vpn];
  if (cached) {
    s.hits++;
    s.observed.hit = true;
    s.translation = copyEntry(cached);
    s.phase = 'permission';
    log(
      s,
      `TLB HIT en VPN ${vpn}: recuperamos marco y permisos cacheados. Aún hay que comprobar el tipo de acceso.`,
    );
    return;
  }
  s.misses++;
  s.phase = 'walk';
  log(
    s,
    `TLB MISS en VPN ${vpn}: falta la copia rápida. Un miss no es un page fault: ahora consultamos la tabla.`,
  );
};

const walkPageTable: PcHandler = (s, context) => {
  const vpn = virtualPageOf(currentInstruction(s).va);
  const entry = s.table[vpn];
  if (!entry) return raiseFault(s, 'absent', context);
  s.translation = copyEntry(entry);
  s.tlb[vpn] = copyEntry(entry);
  s.observed.walk = true;
  s.phase = 'permission';
  context.log(
    s,
    `PTE presente: VPN ${vpn} → marco ${entry.frame}, ${entry.write ? 'RW' : 'R'}. Llenamos la TLB sin entrar al kernel; esta PC modela page walk por hardware.`,
  );
};

const checkPermission: PcHandler = (s, context) => {
  const instruction = currentInstruction(s);
  const translation = currentTranslation(s);
  if (instruction.op === 'STORE' && !translation.write) return raiseFault(s, 'protection', context);
  s.physical = translation.frame * 4 + (instruction.va % 4);
  s.phase = 'memory';
  context.log(
    s,
    `Acceso autorizado: PA=${translation.frame}×4+${instruction.va % 4}=${s.physical}. Solo ahora habilitamos el acceso a RAM.`,
  );
};

function accessMemory(s: PcState, { log }: PcContext): void {
  const instruction = currentInstruction(s);
  const physical = currentPhysical(s);
  if (instruction.op === 'LOAD') {
    s.acc = s.ram[physical];
    log(s, `RAM[${physical}]=${s.acc} → acumulador.`);
  } else {
    s.ram[physical] = instruction.value;
    log(s, `RAM[${physical}] ← ${instruction.value}. La escritura se confirma una sola vez.`);
  }
}

function completeRetry(s: PcState, { log }: PcContext): void {
  if (s.retryPC !== s.pc) return;
  s.observed.recovered = true;
  s.retryPC = null;
  log(
    s,
    'La instrucción reintentada completó después del mapeo. El fault no había consumido su avance de PC.',
  );
}

const retireInstruction: PcHandler = (s, context) => {
  accessMemory(s, context);
  completeRetry(s, context);
  s.pc++;
  s.retired++;
  s.phase = 'fetch';
  context.log(
    s,
    `Retiramos la instrucción: PC=${s.pc}. Si hay IRQ pendiente, podrá entrar antes de buscar la siguiente.`,
  );
};

// Un handler por fase de la CPU en modo usuario; kernel, IRQ y HALT no avanzan con `step`.
const STEP_PHASES: Partial<Record<PcPhase, PcHandler>> = {
  fetch: fetchInstruction,
  tlb: consultTlb,
  walk: walkPageTable,
  permission: checkPermission,
  memory: retireInstruction,
};

export const stepCpu: PcHandler = (s, context) => {
  if (s.halted || s.mode !== 'user') return;
  return STEP_PHASES[s.phase]?.(s, context);
};
