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

test('unions the sets without duplicates: base entries first, then the new ones', () => {
  const merged = mergeRouteProgress(base, incoming);
  assert.deepEqual(merged.completed, ['a', 'b', 'c']);
  assert.deepEqual(merged.milestones, ['go-memory', 'rust-files']);
  assert.deepEqual(merged.favorites, ['rustlings', 'go-tour']);
});

test('incoming wins in quiz answers and the base ones are kept', () => {
  assert.deepEqual(mergeRouteProgress(base, incoming).quizAnswers, { a: 2, b: 0, c: 1 });
});

test('a blank incoming note does not overwrite the base one; one with text does', () => {
  assert.deepEqual(mergeRouteProgress(base, incoming).notes, {
    rust: { learned: 'rust importado', next: 'siguiente base' },
    go: { learned: 'go base', next: 'go importado' },
  });
});

test('a whitespace-only note counts as blank', () => {
  const merged = mergeRouteProgress(base, incoming);
  assert.equal(merged.notes.go.learned, 'go base');
});

test('the language and minutes are the base ones', () => {
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
