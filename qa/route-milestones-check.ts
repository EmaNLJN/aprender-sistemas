import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const source = readFileSync(join(root, 'frontend', 'app.js'), 'utf8');

const start = source.indexOf('const milestones = [');
const end = source.indexOf('\n  ];', start);
assert.ok(start >= 0 && end > start, 'no se encontró el arreglo milestones en frontend/app.js');

const ids = [...source.slice(start, end).matchAll(/^\s{6}id: '([a-z-]+)',/gm)].map(
  (match) => match[1],
);
const expected = ['rust', 'go'].flatMap((language) => ids.map((id) => `${language}-${id}`));
const shared = JSON.parse(
  readFileSync(join(root, 'qa', 'fixtures', 'shared', 'route-milestones.json'), 'utf8'),
) as string[];

assert.deepEqual(
  shared,
  expected,
  'route-milestones.json no coincide con los hitos de frontend/app.js',
);
console.log(`route-milestones-check: ${shared.length} hitos PASS.`);
