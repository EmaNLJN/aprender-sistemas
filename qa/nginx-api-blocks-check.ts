import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { scenarios } from './lib/content-fixtures.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('nginx-api-blocks');

const config = readFileSync(path.join(repoRoot, 'docker/nginx/nginx.conf'), 'utf8');

const cappedLocations = [
  { name: 'runs', opening: 'location ^~ /api/runs {', size: '192k' },
  { name: 'sync', opening: 'location = /api/sync {', size: '2m' },
  { name: 'progress import', opening: 'location = /api/progress/import {', size: '24m' },
];

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

for (const { name, opening, size } of cappedLocations) {
  const bodyLimit = `client_max_body_size ${size};`;

  test(`the ${name} location caps the body at ${size} and the general API location does not`, () => {
    assert.equal(directivesOf(opening).filter((line) => line === bodyLimit).length, 1);
    assert.equal(apiDirectives.includes(bodyLimit), false);
  });

  test(`the ${name} location repeats the API directives in the same order`, () => {
    const withoutLimit = directivesOf(opening).filter((line) => line !== bodyLimit);
    assert.ok(apiDirectives.length > 0);
    assert.deepEqual(withoutLimit, apiDirectives);
  });
}

done();
