import { defineModel } from '../../model/define-model';
import type { SystemsModel } from '../../model/types';
import { button, cell, metric } from '../../lib/view-builders';
import {
  INFRA_LOG_LIMIT,
  achievedFlags,
  infraView,
  note,
  withInfraBase,
  type InfraContext,
  type InfraHandler,
  type InfraState,
} from './base';

interface ActiveTask {
  id: number;
  remaining: number;
}

export interface BackpressureState extends InfraState {
  capacity: number;
  queue: number[];
  active: ActiveTask | null;
  pending: number | null;
  next: number;
  completed: number[];
  wasBlocked: boolean;
}

type BackpressureAction = 'produce' | 'worker';
type BackpressureHandler = InfraHandler<BackpressureState>;
type BackpressureContext = InfraContext<BackpressureState>;

const WORK_STEPS = 2;

function rejectFullQueue(s: BackpressureState, ctx: BackpressureContext, task: number): void {
  s.wasBlocked = true;
  s.flags['backpressure-blocked'] = true;
  note(
    s,
    ctx,
    `Cola llena: tarea ${task} queda con el productor. No se descarta ni se encola por encima del límite.`,
  );
}

function admitTask(s: BackpressureState, ctx: BackpressureContext, task: number): void {
  s.queue.push(task);
  s.pending = null;
  if (s.wasBlocked) {
    s.flags['backpressure-resumed'] = true;
    s.wasBlocked = false;
  }
  note(
    s,
    ctx,
    `Tarea ${task} aceptada. La cola ocupa ${s.queue.length}/${s.capacity}; el trabajo activo se cuenta aparte.`,
  );
}

const produce: BackpressureHandler = (s, ctx) => {
  if (s.pending === null) s.pending = s.next++;
  if (s.queue.length === s.capacity) rejectFullQueue(s, ctx, s.pending);
  else admitTask(s, ctx, s.pending);
};

// Returns false if the worker had nothing to do.
function takeNextTask(s: BackpressureState, ctx: BackpressureContext): boolean {
  const id = s.queue.shift();
  if (id === undefined) {
    note(s, ctx, 'El trabajador espera: no hay tareas en la cola.');
    return false;
  }
  s.active = { id, remaining: WORK_STEPS };
  note(s, ctx, `El trabajador toma ${id}; liberó un lugar. Todavía faltan dos pasos de trabajo.`);
  return true;
}

function advanceActiveTask(s: BackpressureState, ctx: BackpressureContext, task: ActiveTask): void {
  task.remaining--;
  if (task.remaining > 0) {
    note(s, ctx, `Tarea ${task.id}: resta ${task.remaining} paso de trabajo.`);
    return;
  }
  s.completed.push(task.id);
  note(s, ctx, `Terminó la tarea ${task.id}. La siguiente aún debe salir de la cola.`);
  s.active = null;
}

const completedInOrder = (s: BackpressureState): boolean =>
  s.completed.length >= 2 && s.completed.every((id, i) => i === 0 || id > s.completed[i - 1]);

const worker: BackpressureHandler = (s, ctx) => {
  if (s.active === null) {
    if (!takeNextTask(s, ctx)) return;
  } else {
    advanceActiveTask(s, ctx, s.active);
  }
  if (completedInOrder(s)) s.flags['backpressure-fifo'] = true;
};

export const backpressureModel: SystemsModel<BackpressureState> = defineModel<
  BackpressureState,
  BackpressureAction
>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      capacity: 2,
      queue: [],
      active: null,
      pending: null,
      next: 1,
      completed: [],
      wasBlocked: false,
    }),
  actions: { produce, worker },
  view: infraView((s) => ({
    title: 'La fábrica tiene un límite',
    summary: 'Cola de 2, un trabajador y un productor que conserva la tarea rechazada.',
    metrics: [
      metric('Cola', s.queue.length + '/2'),
      metric('Terminadas', s.completed.join(', ') || 'ninguna'),
    ],
    cells: [
      cell(
        'Productor',
        s.pending === null ? 'listo' : 'espera tarea ' + s.pending,
        s.pending === null ? 'muted' : 'bad',
      ),
      ...[0, 1].map((i) =>
        cell(
          'Slot ' + i,
          s.queue[i] === undefined ? 'libre' : 'tarea ' + s.queue[i],
          s.queue[i] === undefined ? 'muted' : 'active',
        ),
      ),
      cell(
        'Trabajador',
        s.active ? '#' + s.active.id + ' · faltan ' + s.active.remaining : 'libre',
        s.active ? 'active' : 'good',
      ),
    ],
    controls: [
      button('produce', 'Producir / reintentar pendiente'),
      button('worker', 'Avanzar trabajador un paso'),
    ],
  })),
  achieved: achievedFlags,
});
