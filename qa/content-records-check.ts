/* Registros literales de content/: mundos de campaña y talleres de Sistemas
 * (tools/content/records.ts, campaign.ts y workshops.ts).
 * node qa/content-records-check.ts
 *
 * Contrato: el manifiesto agrupa y ordena los IDs; cada <id>.yaml se publica tal cual, con
 * las claves en el orden del archivo, y su `id` coincide con el nombre del archivo.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadCampaign } from '../tools/content/campaign.ts';
import { ContentError } from '../tools/content/content-error.ts';
import { loadGroupedRecords } from '../tools/content/records.ts';
import { expectText } from '../tools/content/shape.ts';
import { loadWorkshops } from '../tools/content/workshops.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-records-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

const SPEC = { id: expectText, title: expectText, minutes: expectText };

test('el manifiesto ordena los grupos y cada registro conserva el orden del YAML', () => {
  const root = fixture({
    'content/x/manifest.yaml': 'a:\n  - b2\n  - b1\nb:\n  - c1\n',
    'content/x/b1.yaml': 'id: b1\ntitle: Uno\nminutes: diez\n',
    'content/x/b2.yaml': 'minutes: veinte\nid: b2\ntitle: Dos\n',
    'content/x/c1.yaml': 'title: Tres\nid: c1\nminutes: cinco\n',
  });
  const groups = loadGroupedRecords(root, 'content/x', ['a', 'b'], SPEC);
  assert.deepEqual(groups, {
    a: [
      { minutes: 'veinte', id: 'b2', title: 'Dos' },
      { id: 'b1', title: 'Uno', minutes: 'diez' },
    ],
    b: [{ title: 'Tres', id: 'c1', minutes: 'cinco' }],
  });
  assert.deepEqual(Object.keys(groups.a[0]), ['minutes', 'id', 'title']);
});

test('el id coincide con el archivo y no hay registros fuera del manifiesto', () => {
  const mismatch = fixture({
    'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\n',
    'content/x/b1.yaml': 'id: otro\ntitle: Uno\nminutes: diez\n',
    'content/x/c1.yaml': 'id: c1\ntitle: Tres\nminutes: cinco\n',
  });
  throwsContent(
    () => loadGroupedRecords(mismatch, 'content/x', ['a', 'b'], SPEC),
    'content/x/b1.yaml: id: debe ser «b1», como el nombre del archivo',
  );
  const orphan = fixture({
    'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\n',
    'content/x/b1.yaml': 'id: b1\ntitle: Uno\nminutes: diez\n',
    'content/x/c1.yaml': 'id: c1\ntitle: Tres\nminutes: cinco\n',
    'content/x/d1.yaml': 'id: d1\ntitle: Cuatro\nminutes: uno\n',
  });
  throwsContent(
    () => loadGroupedRecords(orphan, 'content/x', ['a', 'b'], SPEC),
    'content/x/d1.yaml: no figura en content/x/manifest.yaml',
  );
});

const WORLD = `id: rust-world-1
level: beginner
title: Estación
subtitle: Repará los controles.
story: Llegás a una estación.
concepts:
  - Estado
why: Porque el estado importa.
guide:
  - Entrená.
trainingIds:
  - rust-02
challengeIds:
  - rust-101
bossId: rust-101
checkpoint:
  question: ¿Cuándo descontar batería?
  options:
    - Antes
    - Después
  answer: 1
  explanation: Después de validar.
badge: Piloto
sources:
  - title: Rust Book
    url: https://doc.rust-lang.org/book/
`;

function campaignFixture(world = WORLD): string {
  return fixture({
    'content/campaign/manifest.yaml': 'rust:\n  - rust-world-1\ngo:\n  - go-world-1\n',
    'content/campaign/rust-world-1.yaml': world,
    'content/campaign/go-world-1.yaml': WORLD.replace('rust-world-1', 'go-world-1'),
  });
}

test('campaña: mundos por lenguaje, con el checkpoint validado', () => {
  const campaign = loadCampaign(campaignFixture());
  assert.deepEqual(
    campaign.rust.map((world) => world.id),
    ['rust-world-1'],
  );
  assert.deepEqual(
    campaign.go.map((world) => world.id),
    ['go-world-1'],
  );
  throwsContent(
    () => loadCampaign(campaignFixture(WORLD.replace('  answer: 1\n', '  answer: 5\n'))),
    'content/campaign/rust-world-1.yaml: checkpoint.answer: 5 no es el índice de una opción: hay 2',
  );
  throwsContent(
    () => loadCampaign(campaignFixture(WORLD.replace('badge: Piloto\n', ''))),
    'content/campaign/rust-world-1.yaml: falta la clave «badge»',
  );
});

const WORKSHOP = `id: cache
category: machine
model: cache
level: medium
minutes: 45
title: Una caché
subtitle: Localidad.
story: La cocina.
what: Una LRU.
why: Separar corrección de política.
uses:
  - Cachés
limits: Guarda claves.
objectives:
  - id: hit
    label: Provocá un hit
    why: Distingue hit de miss.
prediction:
  question: ¿Qué sale?
  options:
    - A
    - B
  answer: 1
  explanation: Sale B.
steps:
  - title: Dibujá
    task: Dibujá la traza.
    why: Para ver la política.
    done: Hay una traza.
sources:
  - title: OSTEP
    url: https://pages.cs.wisc.edu/~remzi/OSTEP/
code:
  rust: rust-113
  go: go-113
related:
  rust:
    - rust-15
  go:
    - go-15
bridge:
  rust: Exportá a Cargo.
  go: Exportá a un módulo.
`;

test('talleres: un grupo por dominio y la ficha completa por lenguaje', () => {
  const domains = ['lowlevel', 'infra', 'play', 'pc'];
  const files: Record<string, string> = {
    'content/workshops/manifest.yaml': domains
      .map((domain) => `${domain}:\n  - ${domain}-w\n`)
      .join(''),
  };
  for (const domain of domains) {
    files[`content/workshops/${domain}-w.yaml`] = WORKSHOP.replace('id: cache', `id: ${domain}-w`);
  }
  const workshops = loadWorkshops(fixture(files));
  assert.deepEqual(
    domains.map((domain) => workshops[domain as keyof typeof workshops][0].id),
    ['lowlevel-w', 'infra-w', 'play-w', 'pc-w'],
  );
  files['content/workshops/pc-w.yaml'] = WORKSHOP.replace('id: cache', 'id: pc-w').replace(
    '  go: Exportá a un módulo.\n',
    '',
  );
  throwsContent(
    () => loadWorkshops(fixture(files)),
    'content/workshops/pc-w.yaml: bridge: falta la clave «go»',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-records scenarios PASS.`);
