import { Factory } from 'fishery';
import {
  button,
  cell,
  defineModel,
  metric,
  type SimulationState,
} from '../../../entities/systems-simulation';
import { systemsEngine } from '../../../entities/systems-workshop';
import type {
  SystemsLanguage,
  SystemsModelRegistry,
  SystemsPageExercise,
  WorkshopContent,
} from './types';

export interface ProbeExercise extends SystemsPageExercise {
  language: SystemsLanguage;
  tests: { id: string; label: string; why: string }[];
}

export const workshopFactory = Factory.define<WorkshopContent>(() => ({
  id: 'probe',
  model: 'probe',
  title: 'Una sonda de prueba',
  subtitle: 'Registra cada toque.',
  story: 'Una sonda escucha lo que mandan los controles.',
  what: 'Un registro del último valor recibido.',
  why: 'Para ver qué valor llega de cada control.',
  limits: 'Sólo guarda el último valor.',
  category: 'machine',
  level: 'beginner',
  minutes: 20,
  objectives: [
    { id: 'touched-a', label: 'Tocá A', why: 'El primer valor.' },
    { id: 'touched-b', label: 'Tocá B', why: 'El segundo valor.' },
    { id: 'touched-empty', label: 'Tocá sin valor', why: 'Un control sin valor.' },
  ],
  prediction: {
    question: '¿Qué llega de un control sin valor?',
    options: ['Nada', 'Una cadena vacía'],
    answer: 1,
    explanation: 'El control sin valor manda una cadena vacía.',
  },
  steps: [
    { title: 'Etapa uno', task: 'Hacé la uno.', why: 'Por la uno.', done: 'La uno está.' },
    { title: 'Etapa dos', task: 'Hacé la dos.', why: 'Por la dos.', done: 'La dos está.' },
    { title: 'Etapa tres', task: 'Hacé la tres.', why: 'Por la tres.', done: 'La tres está.' },
    {
      title: 'Etapa cuatro',
      task: 'Hacé la cuatro.',
      why: 'Por la cuatro.',
      done: 'La cuatro está.',
    },
  ],
  uses: ['Registros', 'Sondas'],
  sources: [{ title: 'Fuente de la sonda', url: 'https://example.org/sonda' }],
  bridge: { rust: 'Llevá la sonda a Cargo.', go: 'Llevá la sonda a un módulo Go.' },
  related: { rust: ['rust-tool'], go: [] },
  code: { rust: 'rust-probe', go: 'go-probe' },
}));

export const exerciseFactory = Factory.define<ProbeExercise>(() => ({
  id: 'rust-probe',
  language: 'rust',
  title: 'El núcleo de la sonda',
  objective: 'Guardá el último valor.',
  tests: [
    { id: 'first', label: 'Primer caso', why: 'Cubre A.' },
    { id: 'second', label: 'Segundo caso', why: 'Cubre B.' },
    { id: 'third', label: 'Tercer caso', why: 'Cubre el vacío.' },
  ],
}));

interface ProbeState extends SimulationState {
  last: string;
}

export const probeModel = defineModel<ProbeState, 'touch' | 'reset'>({
  logLimit: 12,
  initial: () => ({ last: 'ninguno', log: [] }),
  actions: {
    touch(draft, { value, log }) {
      draft.last = `[${value}]`;
      log(draft, `Llegó ${draft.last}.`);
    },
    reset(_draft, { initial }) {
      return initial();
    },
  },
  view: (state) => ({
    title: 'Una sonda',
    summary: 'Muestra el último valor.',
    explanation: `Último valor: ${state.last}`,
    metrics: [metric('Último valor', state.last)],
    cells: [cell('Estado', state.last, state.last === 'ninguno' ? 'muted' : 'active')],
    controls: [
      button('touch', 'Tocar A', 'a'),
      button('touch', 'Tocar B', 'b'),
      button('touch', 'Tocar sin valor'),
    ],
    log: state.log,
  }),
  achieved: (state) => {
    if (state.last === '[a]') return ['touched-a'];
    if (state.last === '[b]') return ['touched-b'];
    if (state.last === '[]') return ['touched-empty'];
    return [];
  },
});

export const probeModels: SystemsModelRegistry = { probe: probeModel };

export function passingLabState(exerciseId = 'rust-probe') {
  const tests = ['first', 'second', 'third'].map((id) => ({ id, passed: true }));
  return { records: { [exerciseId]: { result: { success: true, code: 'fn probe() {}', tests } } } };
}

export function initProbeEngine(
  workshops: WorkshopContent[] = [workshopFactory.build()],
): ProbeExercise[] {
  const exercises = [
    exerciseFactory.build(),
    exerciseFactory.build({ id: 'go-probe', language: 'go', title: 'El núcleo de la sonda en Go' }),
    exerciseFactory.build({ id: 'rust-tool', title: 'Una herramienta previa' }),
  ];
  systemsEngine.init({ workshops, models: probeModels, exercises });
  return exercises;
}
