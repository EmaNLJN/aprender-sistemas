import assert from 'node:assert/strict';
import { importModule } from './lib/sources.ts';

const { escapeHtml } = await importModule<{ escapeHtml: (value: unknown) => string }>(
  'src/shared/lib/escape-html.ts',
);
const { normalizeSearchText } = await importModule<{
  normalizeSearchText: (value: unknown) => string;
}>('src/shared/lib/normalize-search-text.ts');
const { cloneJson } = await importModule<{ cloneJson: <T>(value: T) => T }>(
  'src/shared/lib/clone-json.ts',
);
const { isPlainObject } = await importModule<{ isPlainObject: (value: unknown) => boolean }>(
  'src/shared/lib/is-plain-object.ts',
);
const { LEVEL_IDS, LEVEL_LABELS } = await importModule<{
  LEVEL_IDS: string[];
  LEVEL_LABELS: Record<string, string>;
}>('src/shared/config/levels.ts');

assert.equal(escapeHtml('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
assert.equal(escapeHtml(null), '');
assert.equal(escapeHtml(undefined), '');
assert.equal(escapeHtml(0), '0');

assert.equal(normalizeSearchText('Ñandú ÁRBOL'), 'nandu arbol');

const original = {
  nested: { list: [1, { deep: true }] },
  gone: undefined,
  fn: () => 1,
  when: new Date('2026-01-02T03:04:05.000Z'),
};
const copy = cloneJson(original) as Record<string, unknown>;
assert.deepEqual(copy, {
  nested: { list: [1, { deep: true }] },
  when: '2026-01-02T03:04:05.000Z',
});
assert.equal('gone' in copy, false);
assert.equal('fn' in copy, false);
(copy.nested as { list: unknown[] }).list.push(2);
assert.equal(original.nested.list.length, 2);

assert.equal(isPlainObject(null), false);
assert.equal(isPlainObject([]), false);
assert.equal(isPlainObject('x'), false);
assert.equal(isPlainObject(1), false);
assert.equal(isPlainObject({}), true);
assert.equal(isPlainObject(Object.create(null)), true);

assert.deepEqual(LEVEL_IDS, ['beginner', 'medium', 'advanced', 'expert']);
assert.deepEqual(LEVEL_LABELS, {
  beginner: 'Inicial',
  medium: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
});

console.log('shared-lib-check passed.');
