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

type StackFlag = 'guard' | 'nested' | 'return';

interface Frame {
  name: string;
  returnPC: number | null;
  local: number;
}

export interface StackState extends LowlevelState<StackFlag> {
  frames: Frame[];
  pc: number;
  calls: number;
  returns: number;
}

type StackAction = 'reset' | 'call' | 'local' | 'return';

const MAX_FRAMES = 4;
const CALLABLE: readonly string[] = ['f', 'g'];

const initialState = (): StackState => ({
  ...baseState<StackFlag>(),
  frames: [{ name: 'main', returnPC: null, local: 1 }],
  pc: 0,
  calls: 0,
  returns: 0,
});

const topFrame = (s: StackState): Frame => s.frames[s.frames.length - 1];

const call: LowlevelHandler<StackState> = (s, { value, log }) => {
  if (value === undefined || !CALLABLE.includes(value)) return;
  const caller = topFrame(s);
  if (s.frames.length === MAX_FRAMES) {
    s.flags.guard = true;
    log(s, 'Límite de cuatro frames: rechazamos CALL sin sobrescribir un retorno.');
    return;
  }
  s.frames.push({ name: value, returnPC: s.pc + 1, local: 0 });
  s.pc = 0;
  s.calls++;
  if (s.frames.length >= 3) s.flags.nested = true;
  log(
    s,
    `CALL ${value}: guardamos la continuación y creamos un local propio. El local de ${caller.name} permanece en su frame.`,
  );
};

const incrementLocal: LowlevelHandler<StackState> = (s, { log }) => {
  const top = topFrame(s);
  top.local++;
  s.pc++;
  log(
    s,
    `Solo el local de ${top.name} cambia a ${top.local}. Los otros frames conservan sus datos.`,
  );
};

// A called frame always stores its continuation; only `main` lacks one.
function savedReturn(frame: Frame): number {
  if (frame.returnPC === null)
    throw new Error(`Estado de pila inconsistente: ${frame.name} no guardó su retorno`);
  return frame.returnPC;
}

const returnFromCall: LowlevelHandler<StackState> = (s, { log }) => {
  if (s.frames.length === 1) {
    s.flags.guard = true;
    log(s, 'main no tiene llamador. RET se rechaza y el frame raíz queda intacto.');
    return;
  }
  const frame = s.frames.pop();
  if (!frame) throw new Error('Estado de pila inconsistente: no hay frames');
  s.pc = savedReturn(frame);
  s.returns++;
  s.flags.return = true;
  log(
    s,
    `RET ${frame.name}: recuperamos PC=${s.pc}; vuelve a ser visible el local ${topFrame(s).local} del llamador.`,
  );
};

function stackView(s: StackState): ModelView {
  return {
    title: 'Cada llamada lleva su mochila',
    summary: 'Los frames se apilan de abajo hacia arriba. El frame superior es el único activo.',
    metrics: [
      metric('Profundidad', `${s.frames.length}/4`),
      metric('PC actual', s.pc),
      metric('Retornos', s.returns),
    ],
    cells: s.frames.map((f, i) =>
      cell(`${i}: ${f.name}`, `local=${f.local}`, i === s.frames.length - 1 ? 'active' : 'muted'),
    ),
    columns: ['Función', 'Retorno guardado', 'Local'],
    rows: s.frames.map((f) => [
      f.name,
      f.returnPC === null ? 'Sin llamador' : String(f.returnPC),
      String(f.local),
    ]),
    controls: [
      button('call', 'CALL f', 'f'),
      button('call', 'CALL g', 'g'),
      button('local', 'Incrementar local'),
      button('return', 'RET'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Incrementá main, llamá f y luego g; cambiá un local y volvé. Provocá también un RET en main o una quinta llamada. Este es un modelo de frames; la disposición real depende del ABI y optimizaciones.',
  };
}

export const stackModel = defineModel<StackState, StackAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), call, local: incrementLocal, return: returnFromCall },
  view: stackView,
  achieved: achievedFlags,
});
