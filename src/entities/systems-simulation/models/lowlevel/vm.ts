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

type VmFlag = 'bounded' | 'halt' | 'branch';

export interface VmState extends LowlevelState<VmFlag> {
  bytes: number[];
  pc: number;
  accumulator: number;
  budget: number;
  executed: number;
  stopped: boolean;
  error: string;
}

type VmAction = 'reset' | 'loop' | 'normal' | 'step';

type Instruction = (s: VmState, context: LowlevelContext<VmState>) => void;

const initialState = (): VmState => ({
  ...baseState<VmFlag>(),
  bytes: [1, 3, 2, 3, 2, 0],
  pc: 0,
  accumulator: 0,
  budget: 12,
  executed: 0,
  stopped: false,
  error: '',
});

const loadLoop: LowlevelHandler<VmState> = (s, { log }) => {
  Object.assign(s, {
    bytes: [3, 0],
    pc: 0,
    accumulator: 1,
    budget: 4,
    executed: 0,
    stopped: false,
    error: '',
  });
  log(
    s,
    'Cargaste JNZ 0 con acumulador 1 y presupuesto 4: el programa no progresa. Las metas observadas se conservan.',
  );
};

// Vuelve al programa inicial pero conserva lo observado: flags y registro del estado actual.
const loadNormal: LowlevelHandler<VmState> = (s, { initial, log }) => {
  const fresh = initial();
  fresh.flags = s.flags;
  fresh.log = s.log;
  return log(
    fresh,
    'Programa normal cargado. Los registros vuelven al inicio; conservamos las observaciones.',
  );
};

function fail(s: VmState, message: string, { log }: LowlevelContext<VmState>): void {
  s.error = message;
  log(s, message);
}

const halt: Instruction = (s, { log }) => {
  s.stopped = true;
  s.flags.halt = true;
  log(
    s,
    `HALT en byte ${s.pc}: termina con acumulador ${s.accumulator}. HALT también consume un paso.`,
  );
};

const set: Instruction = (s, { log }) => {
  s.accumulator = s.bytes[s.pc + 1];
  s.pc += 2;
  log(s, `SET ${s.accumulator}: consume opcode y operando; PC avanza dos bytes.`);
};

const dec: Instruction = (s, { log }) => {
  s.accumulator--;
  s.pc++;
  log(s, `DEC: acumulador=${s.accumulator}; PC avanza un byte.`);
};

const jumpIfNotZero: Instruction = (s, { log }) => {
  const target = s.bytes[s.pc + 1];
  const taken = s.accumulator !== 0;
  s.pc = taken ? target : s.pc + 2;
  if (taken) s.flags.branch = true;
  log(
    s,
    `JNZ ${target}: ${taken ? 'salto tomado porque el acumulador no es cero' : 'no salta porque el acumulador llegó a cero'}.`,
  );
};

const INSTRUCTIONS = new Map<number, Instruction>([
  [0, halt],
  [1, set],
  [2, dec],
  [3, jumpIfNotZero],
]);

const step: LowlevelHandler<VmState> = (s, context) => {
  if (s.stopped || s.error) return;
  if (s.pc < 0 || s.pc >= s.bytes.length) return fail(s, 'PC inválido', context);
  if (s.executed >= s.budget) {
    s.flags.bounded = true;
    s.error = 'Presupuesto agotado';
    context.log(
      s,
      'El motor detiene un programa que consumiría pasos indefinidamente. Esto limita instrucciones, no milisegundos.',
    );
    return;
  }
  const instruction = INSTRUCTIONS.get(s.bytes[s.pc]);
  s.executed++;
  if (instruction) instruction(s, context);
  else fail(s, 'Opcode inválido', context);
};

function vmView(s: VmState): ModelView {
  return {
    title: 'Una máquina de seis bytes',
    summary: 'ISA didáctica: 0 HALT · 1,n SET n · 2 DEC · 3,p JNZ p. PC cuenta bytes.',
    metrics: [
      metric('PC', s.pc),
      metric('Acumulador', s.accumulator),
      metric('Pasos', `${s.executed}/${s.budget}`),
      metric('Estado', s.error || (s.stopped ? 'HALT' : 'En pausa')),
    ],
    cells: s.bytes.map((byte, i) => cell(`Byte ${i}`, byte, i === s.pc ? 'active' : 'muted')),
    controls: [
      button('step', 'Ejecutar una instrucción'),
      button('loop', 'Cargar bucle sin progreso'),
      button('normal', 'Cargar programa normal'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Seguí PC y acumulador hasta HALT. Luego cargá el bucle: tras cuatro instrucciones, el siguiente intento rechaza por presupuesto. El núcleo de código valida que los saltos apunten a opcodes, no a operandos.',
  };
}

export const vmModel = defineModel<VmState, VmAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), loop: loadLoop, normal: loadNormal, step },
  view: vmView,
  achieved: achievedFlags,
});
