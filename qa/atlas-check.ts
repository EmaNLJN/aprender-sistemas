import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { importModule } from './lib/sources.ts';

interface AtlasConcept {
  id: string;
  title: string;
  labId: string;
}
interface AtlasContentModule {
  atlasByLanguage: Record<string, AtlasConcept[]>;
}
interface ConceptFilters {
  query: string;
  level: string;
  category: string;
}
interface AtlasSession extends ConceptFilters {
  selected: string | null;
  answers: Record<string, number>;
  compared: Record<string, boolean>;
  pitfalls: Record<string, boolean>;
}
interface FilterModule {
  filterConcepts: (concepts: AtlasConcept[], filters: ConceptFilters) => AtlasConcept[];
}
interface SessionModule {
  createAtlasSession: () => AtlasSession;
  setQuery: (session: AtlasSession, query: string) => AtlasSession;
  setLevel: (session: AtlasSession, level: string) => AtlasSession;
  setCategory: (session: AtlasSession, category: string) => AtlasSession;
  selectConcept: (session: AtlasSession, id: string) => AtlasSession;
  clearFilters: (session: AtlasSession) => AtlasSession;
  toggleCompared: (session: AtlasSession, id: string) => AtlasSession;
  togglePitfall: (session: AtlasSession, id: string) => AtlasSession;
  answerQuiz: (session: AtlasSession, id: string, answer: number) => AtlasSession;
  retryQuiz: (session: AtlasSession, id: string) => AtlasSession;
}
interface RenderModule {
  renderAtlasPage: (language: string) => string;
}

// The esbuild ESM bundle resolves Node builtins through a global require.
(globalThis as { require?: NodeJS.Require }).require ??= createRequire(import.meta.url);

const { atlasByLanguage } = await importModule<AtlasContentModule>(
  'frontend/src/pages/atlas/model/atlas-catalog.ts',
);
const { filterConcepts } = await importModule<FilterModule>(
  'frontend/src/pages/atlas/model/filter-concepts.ts',
);
const session = await importModule<SessionModule>(
  'frontend/src/pages/atlas/model/atlas-session.ts',
);
const { renderAtlasPage } = await importModule<RenderModule>('qa/fixtures/atlas-page-render.tsx');

for (const language of ['rust', 'go']) {
  const concepts = atlasByLanguage[language];
  assert.equal(concepts.length, 16, `Atlas ${language}: 16 concepts expected`);
  assert.equal(
    new Set(concepts.map((concept) => concept.id)).size,
    16,
    `Atlas ${language}: unique IDs`,
  );
  assert(
    concepts.every((concept) => concept.labId.startsWith(`${language}-`)),
    `Atlas ${language}: related exercises`,
  );
}

const rust = atlasByLanguage.rust;
const all = { query: '', level: 'all', category: 'all' };
const ids = (filters: Partial<ConceptFilters>) =>
  filterConcepts(rust, { ...all, ...filters }).map((concept) => concept.id);

assert.deepEqual(
  ids({}),
  rust.map((concept) => concept.id),
  'no filters returns everything',
);
assert.deepEqual(ids({ level: 'beginner' }), [
  'rust-identity',
  'rust-syntax',
  'rust-types',
  'rust-flow',
]);
assert.deepEqual(ids({ level: 'expert' }), ['rust-async', 'rust-expert']);
assert.deepEqual(ids({ category: 'Abstracción' }), [
  'rust-functions',
  'rust-structs',
  'rust-interfaces',
  'rust-functional',
  'rust-generics',
]);
assert.deepEqual(ids({ category: 'Herramientas' }), ['rust-modules']);
assert.deepEqual(ids({ level: 'medium', category: 'Abstracción' }), [
  'rust-functions',
  'rust-structs',
  'rust-functional',
]);
assert.deepEqual(ids({ level: 'expert', category: 'Herramientas' }), []);
assert.deepEqual(ids({ query: 'genericos' }), ['rust-generics']);
assert.deepEqual(ids({ query: 'GENÉRICOS' }), ['rust-generics']);
assert.deepEqual(ids({ query: 'polimorfismo' }), ['rust-structs', 'rust-interfaces']);
assert.deepEqual(ids({ query: 'polimorfismo estatico' }), ['rust-interfaces']);
assert.deepEqual(ids({ query: '  polimorfismo   ' }), ['rust-structs', 'rust-interfaces']);
assert.deepEqual(ids({ query: 'polimorfismo', level: 'advanced' }), ['rust-interfaces']);
assert.deepEqual(ids({ query: 'polimorfismo', category: 'Herramientas' }), []);
assert.deepEqual(ids({ query: 'palabra-inexistente-xyz' }), []);

const initial = session.createAtlasSession();
const snapshot = structuredClone(initial);
assert.deepEqual(snapshot, {
  query: '',
  level: 'all',
  category: 'all',
  selected: null,
  answers: {},
  compared: {},
  pitfalls: {},
});

const updates: Array<[string, (current: AtlasSession) => AtlasSession]> = [
  ['setQuery', (current) => session.setQuery(current, 'traits')],
  ['setLevel', (current) => session.setLevel(current, 'expert')],
  ['setCategory', (current) => session.setCategory(current, 'Abstracción')],
  ['selectConcept', (current) => session.selectConcept(current, 'rust-types')],
  ['clearFilters', (current) => session.clearFilters(current)],
  ['toggleCompared', (current) => session.toggleCompared(current, 'rust-types')],
  ['togglePitfall', (current) => session.togglePitfall(current, 'rust-types')],
  ['answerQuiz', (current) => session.answerQuiz(current, 'rust-types', 2)],
  ['retryQuiz', (current) => session.retryQuiz(current, 'rust-types')],
];
for (const [name, update] of updates) {
  const input = session.answerQuiz(session.togglePitfall(initial, 'x'), 'x', 1);
  const before = structuredClone(input);
  update(input);
  assert.deepEqual(input, before, `${name} does not mutate its input`);
  assert.notEqual(update(input), input, `${name} returns a new session`);
}
assert.deepEqual(initial, snapshot, 'the initial session did not change');

for (const toggle of [session.toggleCompared, session.togglePitfall]) {
  const once = toggle(initial, 'rust-types');
  const record = toggle === session.toggleCompared ? 'compared' : 'pitfalls';
  assert.equal(once[record]['rust-types'], true, 'toggling once activates');
  const twice = toggle(once, 'rust-types');
  assert.equal(twice[record]['rust-types'], false, 'toggling twice deactivates');
  assert.deepEqual(
    { ...twice, [record]: {} },
    initial,
    'toggling twice returns to the initial state except for the false key',
  );
}

const answered = session.answerQuiz(initial, 'rust-types', 2);
assert.deepEqual(answered.answers, { 'rust-types': 2 });
const retried = session.retryQuiz(answered, 'rust-types');
assert.deepEqual(retried.answers, {}, 'retrying removes the answer');
assert.equal('rust-types' in retried.answers, false);

const busy = session.answerQuiz(
  session.toggleCompared(
    session.togglePitfall(
      session.selectConcept(
        session.setCategory(
          session.setLevel(session.setQuery(initial, 'traits'), 'expert'),
          'Abstracción',
        ),
        'rust-types',
      ),
      'rust-flow',
    ),
    'rust-types',
  ),
  'rust-types',
  1,
);
const cleared = session.clearFilters(busy);
assert.deepEqual(
  [cleared.query, cleared.level, cleared.category],
  ['', 'all', 'all'],
  'clearing filters resets query, level and category',
);
assert.equal(cleared.selected, 'rust-types');
assert.deepEqual(cleared.answers, { 'rust-types': 1 });
assert.deepEqual(cleared.compared, { 'rust-types': true });
assert.deepEqual(cleared.pitfalls, { 'rust-flow': true });

const html = renderAtlasPage('rust');
assert(html.includes('Entender el'), 'AtlasPage: title');
assert(html.includes('16 conceptos'), 'AtlasPage: concept count');
assert(html.includes(rust[0].title), 'AtlasPage: title of the first concept');
assert(html.includes('Qué lenguaje estás aprendiendo'), 'AtlasPage: first concept literal');
assert(html.includes('Inicial'), 'AtlasPage: beginner level label');
assert(!html.includes('Principiante'), 'AtlasPage: no longer uses «Principiante»');
assert(html.includes('Todos los niveles'), 'AtlasPage: all-levels option');

console.log('Atlas: content, filters, session and AtlasPage render. PASS');
