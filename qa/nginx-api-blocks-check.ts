import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { scenarios } from './lib/content-fixtures.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('nginx-api-blocks');

const BODY_LIMIT = 'client_max_body_size 192k;';
const config = readFileSync(path.join(repoRoot, 'docker/nginx/nginx.conf'), 'utf8');

function directivesOf(opening: string): string[] {
  const start = config.indexOf(opening);
  assert.notEqual(start, -1, `${opening} is missing from nginx.conf`);
  const bodyStart = start + opening.length;
  const bodyEnd = config.indexOf('\n        }', bodyStart);
  assert.notEqual(bodyEnd, -1, `${opening} has no closing brace`);
  return config
    .slice(bodyStart, bodyEnd)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

const apiDirectives = directivesOf('location ^~ /api/ {');
const runsDirectives = directivesOf('location ^~ /api/runs {');

test('the runs location caps the body at 192k and the general API location does not', () => {
  assert.equal(runsDirectives.filter((line) => line === BODY_LIMIT).length, 1);
  assert.equal(apiDirectives.includes(BODY_LIMIT), false);
});

test('the runs location repeats the API directives in the same order', () => {
  const withoutLimit = runsDirectives.filter((line) => line !== BODY_LIMIT);
  assert.ok(apiDirectives.length > 0);
  assert.deepEqual(withoutLimit, apiDirectives);
});

done();
