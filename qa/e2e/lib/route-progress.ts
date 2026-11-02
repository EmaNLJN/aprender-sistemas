import type { Language } from './curriculum';

export const RUST_MODULES = [
  'Ganá confianza con el compilador',
  'Construí tu almacén clave-valor',
  'Mirá qué pasa en disco y en el tiempo',
  'Abrí la puerta a las redes',
] as const;

export const RUST_STEPS = [
  { id: 'rust-first-session', title: 'Tu primer cambio comprobable' },
  { id: 'rust-ownership', title: 'Seguí el recorrido de un valor' },
  { id: 'rust-errors', title: 'Tratamiento de entradas inválidas' },
  { id: 'rust-kv-memory', title: 'Guardá y recuperá dos valores' },
  { id: 'rust-kv-cli', title: 'Dale una conversación por terminal' },
  { id: 'rust-kv-tests', title: 'Protegé las decisiones con tests' },
  { id: 'rust-save', title: 'Guardá una foto del almacén' },
  { id: 'rust-load', title: 'Reiniciá sin perder el estado' },
  { id: 'rust-measure', title: 'Medí antes de optimizar' },
  { id: 'rust-protocol', title: 'Especificá antes de conectar' },
  { id: 'rust-local-server', title: 'Atendé una conexión local' },
  { id: 'rust-next-challenge', title: 'Elegí tu próximo problema real' },
] as const;

export const ROUTE_KEYS = [
  'version',
  'language',
  'completed',
  'milestones',
  'favorites',
  'quizAnswers',
  'notes',
  'minutes',
];

interface RouteSeed {
  language?: Language;
  completed?: string[];
  quizAnswers?: Record<string, number>;
  minutes?: number;
}

export function routeProgress(seed: RouteSeed = {}): string {
  return JSON.stringify({
    version: 1,
    language: seed.language ?? 'rust',
    completed: seed.completed ?? [],
    milestones: [],
    favorites: [],
    quizAnswers: seed.quizAnswers ?? {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: seed.minutes ?? 25,
  });
}
