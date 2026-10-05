import assert from 'node:assert/strict';
import { importModule } from './lib/sources.ts';

const { escapeHtml } = await importModule<{ escapeHtml: (value: unknown) => string }>(
  'frontend/src/shared/lib/escape-html.ts',
);
const { normalizeSearchText } = await importModule<{
  normalizeSearchText: (value: unknown) => string;
}>('frontend/src/shared/lib/normalize-search-text.ts');
const { cloneJson } = await importModule<{ cloneJson: <T>(value: T) => T }>(
  'frontend/src/shared/lib/clone-json.ts',
);
const { isPlainObject } = await importModule<{ isPlainObject: (value: unknown) => boolean }>(
  'frontend/src/shared/lib/is-plain-object.ts',
);
const { isBlankText } = await importModule<{ isBlankText: (value: unknown) => boolean }>(
  'frontend/src/shared/lib/is-blank-text.ts',
);
const { isLosslessNormalization } = await importModule<{
  isLosslessNormalization: (original: unknown, normalized: unknown) => boolean;
}>('frontend/src/shared/lib/is-lossless-normalization.ts');
const { LEVEL_IDS, LEVEL_LABELS } = await importModule<{
  LEVEL_IDS: string[];
  LEVEL_LABELS: Record<string, string>;
}>('frontend/src/shared/config/levels.ts');

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

for (const blank of ['', '  \n', undefined, null, 1]) assert.equal(isBlankText(blank), true);
assert.equal(isBlankText('a'), false);
assert.equal(isBlankText(' a '), false);

// Agregar claves o elementos al final es normalizar sin perder; todo lo demás es pérdida.
const lossless = isLosslessNormalization;
assert.equal(lossless({ a: 1 }, { a: 1, b: 2 }), true);
assert.equal(lossless([1, 2], [1, 2, 3]), true);
assert.equal(lossless({ a: [{ b: 'x' }] }, { a: [{ b: 'x', c: 0 }], d: null }), true);
assert.equal(lossless({ a: 1, b: 2 }, { a: 1 }), false, 'clave ausente');
assert.equal(lossless({ a: 1 }, { a: 2 }), false, 'valor cambiado');
assert.equal(lossless({ a: ' x ' }, { a: 'x' }), false, 'string recortado');
assert.equal(lossless([1, 2, 3], [1, 3]), false, 'elemento filtrado');
assert.equal(lossless([1, 2], [2, 1]), false, 'array reordenado');
assert.equal(lossless({ a: 1 }, { a: '1' }), false, 'cambio de tipo');
assert.equal(lossless({ a: null }, {}), false, 'null frente a clave ausente');
assert.equal(lossless({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }), false, 'tercer nivel');

assert.deepEqual(LEVEL_IDS, ['beginner', 'medium', 'advanced', 'expert']);
assert.deepEqual(LEVEL_LABELS, {
  beginner: 'Inicial',
  medium: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
});

console.log('shared-lib-check passed.');
