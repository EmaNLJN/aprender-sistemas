import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { CellTone, ModelView } from '../../model/types';
import {
  achievedFlags,
  baseState,
  resetAction,
  resetButton,
  type LowlevelHandler,
  type LowlevelState,
} from './shared';

type SchedulerFlag = 'wake' | 'rotate' | 'finish';

export interface SchedulerState extends LowlevelState<SchedulerFlag> {
  jobs: Record<string, number>;
  ready: string[];
  blocked: string[];
  done: string[];
  time: number;
  running: string;
}

type SchedulerAction = 'reset' | 'block' | 'wake' | 'tick';

const JOB_IDS = ['A', 'B', 'C'];

const initialState = (): SchedulerState => ({
  ...baseState<SchedulerFlag>(),
  jobs: { A: 3, B: 2, C: 1 },
  ready: ['A', 'B', 'C'],
  blocked: [],
  done: [],
  time: 0,
  running: 'Ninguno',
});

const block: LowlevelHandler<SchedulerState> = (s, { log }) => {
  const id = s.ready.shift();
  if (id === undefined) return;
  s.blocked.push(id);
  log(s, `${id} espera I/O: sale de listos. Estar bloqueado no consume trabajo de CPU.`);
};

const wake: LowlevelHandler<SchedulerState> = (s, { log }) => {
  const id = s.blocked.shift();
  if (id === undefined) return;
  s.ready.push(id);
  s.flags.wake = true;
  log(s, `Terminó la espera de ${id}; vuelve al final de listos, sin saltarse la fila.`);
};

const tick: LowlevelHandler<SchedulerState> = (s, { log }) => {
  const id = s.ready.shift();
  if (id === undefined) {
    s.running = 'Idle';
    log(
      s,
      s.blocked.length
        ? 'CPU idle: quedan tareas, pero todas esperan un evento.'
        : 'No queda trabajo: todas las tareas terminaron.',
    );
    return;
  }
  s.running = id;
  s.time++;
  s.jobs[id]--;
  if (s.jobs[id] === 0) {
    s.done.push(id);
    log(s, `Tick ${s.time}: ${id} agotó su trabajo y termina; no vuelve a la cola.`);
  } else {
    if (s.ready.length) s.flags.rotate = true;
    s.ready.push(id);
    log(
      s,
      `Tick ${s.time}: ${id} usó su quantum de 1 y conserva ${s.jobs[id]} ticks; vuelve al final.`,
    );
  }
  if (s.done.length === 3) s.flags.finish = true;
};

interface JobStatus {
  label: string;
  tone: CellTone;
}

function jobStatus(s: SchedulerState, id: string): JobStatus {
  if (s.done.includes(id)) return { label: 'Terminó', tone: 'good' };
  if (s.blocked.includes(id)) return { label: 'Bloqueada', tone: 'bad' };
  return { label: 'Lista', tone: 'active' };
}

function schedulerView(s: SchedulerState): ModelView {
  return {
    title: 'Un procesador, varias tareas',
    summary:
      'Round-robin con quantum 1. A necesita 3 ticks, B 2 y C 1. No hay ejecución simultánea.',
    metrics: [
      metric('CPU consumida', s.time),
      metric('Última tarea', s.running),
      metric('Terminadas', s.done.length),
    ],
    cells: JOB_IDS.map((id) => {
      const status = jobStatus(s, id);
      return cell(id, `${s.jobs[id]} ticks · ${status.label}`, status.tone);
    }),
    columns: ['Listas: próximo primero', 'Bloqueadas', 'Terminadas'],
    rows: [
      [
        s.ready.join(' → ') || 'Vacía',
        s.blocked.join(', ') || 'Ninguna',
        s.done.join(', ') || 'Ninguna',
      ],
    ],
    controls: [
      button('tick', 'Consumir un quantum'),
      button('block', 'Bloquear próxima por I/O'),
      button('wake', 'Completar una espera I/O'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Ejecutá A, bloqueá la próxima tarea y despertala antes de seguir. Compará orden de llegada con orden de finalización. Fairness de turnos no significa que cada tarea termine al mismo tiempo.',
  };
}

export const schedulerModel = defineModel<SchedulerState, SchedulerAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), block, wake, tick },
  view: schedulerView,
  achieved: achievedFlags,
});
