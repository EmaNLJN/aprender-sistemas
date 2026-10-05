/* Fusión del recorrido al importar una copia: node qa/route-progress-check.ts
 * Los valores esperados están escritos a mano desde la regla de importación vigente.
 */
import assert from 'node:assert/strict';
import { importModule } from './lib/sources.ts';

interface RouteNotes {
  learned: string;
  next: string;
}

interface RouteProgress {
  version: 1;
  language: 'rust' | 'go';
  completed: string[];
  milestones: string[];
  favorites: string[];
  quizAnswers: Record<string, number>;
  notes: Record<'rust' | 'go', RouteNotes>;
  minutes: number;
}

const { mergeRouteProgress } = await importModule<{
  mergeRouteProgress(base: RouteProgress, incoming: RouteProgress): RouteProgress;
}>('frontend/src/entities/guide/model/route-progress.ts');

function route(overrides: Partial<RouteProgress> = {}): RouteProgress {
  return {
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
    ...overrides,
  };
}

const base = route({
  language: 'go',
  completed: ['a', 'b'],
  milestones: ['go-memory'],
  favorites: ['rustlings'],
  quizAnswers: { a: 1, b: 0 },
  notes: {
    rust: { learned: 'rust base', next: 'siguiente base' },
    go: { learned: 'go base', next: '' },
  },
  minutes: 45,
});

const incoming = route({
  language: 'rust',
  completed: ['b', 'c'],
  milestones: ['go-memory', 'rust-files'],
  favorites: ['go-tour', 'rustlings'],
  quizAnswers: { a: 2, c: 1 },
  notes: {
    rust: { learned: 'rust importado', next: '' },
    go: { learned: '   ', next: 'go importado' },
  },
  minutes: 15,
});

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  process.stdout.write(`PASS ${name}\n`);
}

test('une los conjuntos sin repetidos: primero los de base y después los nuevos', () => {
  const merged = mergeRouteProgress(base, incoming);
  assert.deepEqual(merged.completed, ['a', 'b', 'c']);
  assert.deepEqual(merged.milestones, ['go-memory', 'rust-files']);
  assert.deepEqual(merged.favorites, ['rustlings', 'go-tour']);
});

test('en las respuestas del quiz gana incoming y se conservan las de base', () => {
  assert.deepEqual(mergeRouteProgress(base, incoming).quizAnswers, { a: 2, b: 0, c: 1 });
});

test('una nota en blanco de incoming no pisa la de base; una con texto sí', () => {
  assert.deepEqual(mergeRouteProgress(base, incoming).notes, {
    rust: { learned: 'rust importado', next: 'siguiente base' },
    go: { learned: 'go base', next: 'go importado' },
  });
});

test('una nota de sólo espacios cuenta como en blanco', () => {
  const merged = mergeRouteProgress(base, incoming);
  assert.equal(merged.notes.go.learned, 'go base');
});

test('el idioma y los minutos son los de base', () => {
  const merged = mergeRouteProgress(base, incoming);
  assert.equal(merged.language, 'go');
  assert.equal(merged.minutes, 45);
});

test('no muta base ni incoming', () => {
  const baseBefore = structuredClone(base);
  const incomingBefore = structuredClone(incoming);
  const merged = mergeRouteProgress(base, incoming);
  merged.completed.push('x');
  merged.notes.rust.learned = 'cambiada';
  merged.quizAnswers['z'] = 1;
  assert.deepEqual(base, baseBefore);
  assert.deepEqual(incoming, incomingBefore);
});

process.stdout.write(`\n${passed} passed, 0 failed\n`);
