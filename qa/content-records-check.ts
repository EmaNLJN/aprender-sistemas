/* Registros literales de content/: mundos de campaña y talleres de Sistemas
 * (tools/content/records.ts, campaign.ts y workshops.ts).
 * node qa/content-records-check.ts
 *
 * Contrato: el manifiesto agrupa y ordena los IDs; cada <id>.yaml se publica tal cual, con
 * las claves en el orden del archivo, y su `id` coincide con el nombre del archivo.
 */
import assert from 'node:assert/strict';
import { loadCampaign } from '../tools/content/campaign.ts';
import { loadGroupedRecords } from '../tools/content/records.ts';
import { expectText } from '../tools/content/shape.ts';
import { loadWorkshops } from '../tools/content/workshops.ts';
import { fixture, scenarios, throwsContent } from './lib/content-fixtures.ts';

const { test, done } = scenarios('content-records');

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
  - id: e1
    title: Dibujá
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
  const { workshops } = loadWorkshops(fixture(files));
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

function workshopsWithSteps(steps: string): Record<string, string> {
  const domains = ['lowlevel', 'infra', 'play', 'pc'];
  const files: Record<string, string> = {
    'content/workshops/manifest.yaml': domains
      .map((domain) => `${domain}:\n  - ${domain}-w\n`)
      .join(''),
  };
  for (const domain of domains) {
    files[`content/workshops/${domain}-w.yaml`] = WORKSHOP.replace(
      'id: cache',
      `id: ${domain}-w`,
    ).replace(/steps:\n[\s\S]*?sources:/, `steps:\n${steps}sources:`);
  }
  return files;
}

function step(id: string, v1Index: number | null, title: string): string {
  const index = v1Index === null ? '' : `    v1Index: ${v1Index}\n`;
  return `  - id: ${id}\n${index}    title: ${title}\n    task: Hacé ${title}.\n    why: Por ${title}.\n    done: ${title} listo.\n`;
}

test('workshops: step keys travel separately and the published step keeps its four texts', () => {
  const steps = step('e1', 0, 'Uno') + step('e2', 1, 'Dos') + step('e3', null, 'Tres');
  const { workshops, stepKeys } = loadWorkshops(fixture(workshopsWithSteps(steps)));
  assert.deepEqual(stepKeys['lowlevel-w'], [
    { id: 'e1', v1Index: 0 },
    { id: 'e2', v1Index: 1 },
    { id: 'e3', v1Index: null },
  ]);
  const published = workshops.lowlevel[0].steps as Record<string, unknown>[];
  assert.deepEqual(published[2], {
    title: 'Tres',
    task: 'Hacé Tres.',
    why: 'Por Tres.',
    done: 'Tres listo.',
  });
  assert.deepEqual(Object.keys(published[0]), ['title', 'task', 'why', 'done']);
});

test('workshops: the step key must exist, be valid and not repeat', () => {
  const where = 'content/workshops/lowlevel-w.yaml: ';
  const load = (steps: string) => () => loadWorkshops(fixture(workshopsWithSteps(steps)));
  throwsContent(
    load(step('e1', 0, 'Uno') + step('e1', 1, 'Dos')),
    `${where}steps[1].id: «e1» se repite en el taller`,
  );
  throwsContent(
    load(step('e1', 0, 'Uno') + step('e2', 0, 'Dos')),
    `${where}steps[1].v1Index: 0 se repite en el taller`,
  );
  throwsContent(
    load(step('E1', 0, 'Uno')),
    `${where}steps[0].id: se esperaba una clave en minúsculas, dígitos y guiones (hasta 64), como e1`,
  );
  throwsContent(
    load(step('e1', -1, 'Uno')),
    `${where}steps[0].v1Index: se esperaba un entero mayor o igual que 0`,
  );
  const withoutKey =
    '  - title: Uno\n    task: Hacé Uno.\n    why: Por Uno.\n    done: Uno listo.\n';
  throwsContent(load(withoutKey), `${where}steps[0]: falta la clave «id»`);
});

test('registros: ID sin archivo, repetido entre grupos, clave y grupo desconocidos', () => {
  const base = {
    'content/x/b1.yaml': 'id: b1\ntitle: Uno\nminutes: diez\n',
    'content/x/c1.yaml': 'id: c1\ntitle: Tres\nminutes: cinco\n',
  };
  const load = (files: Record<string, string>) =>
    loadGroupedRecords(fixture(files), 'content/x', ['a', 'b'], SPEC);
  throwsContent(
    () => load({ ...base, 'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\n  - d1\n' }),
    'content/x/manifest.yaml: d1 no tiene content/x/d1.yaml',
  );
  throwsContent(
    () => load({ ...base, 'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - b1\n  - c1\n' }),
    'content/x/manifest.yaml: ID repetido: b1',
  );
  throwsContent(
    () =>
      load({
        ...base,
        'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\n',
        'content/x/c1.yaml': 'id: c1\ntitle: Tres\nminutes: cinco\ncolor: rojo\n',
      }),
    'content/x/c1.yaml: color: clave desconocida',
  );
  throwsContent(
    () => load({ ...base, 'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\nz:\n  - b1\n' }),
    'content/x/manifest.yaml: z: clave desconocida',
  );
});

test('talleres: category es una de las que conoce systems.js', () => {
  const files: Record<string, string> = {
    'content/workshops/manifest.yaml': ['lowlevel', 'infra', 'play', 'pc']
      .map((domain) => `${domain}:\n  - ${domain}-w\n`)
      .join(''),
  };
  for (const domain of ['lowlevel', 'infra', 'play', 'pc']) {
    const category = domain === 'pc' ? 'inventada' : 'play';
    files[`content/workshops/${domain}-w.yaml`] = WORKSHOP.replace(
      'id: cache',
      `id: ${domain}-w`,
    ).replace('category: machine', `category: ${category}`);
  }
  throwsContent(
    () => loadWorkshops(fixture(files)),
    'content/workshops/pc-w.yaml: category: se esperaba uno de: machine, infra, play',
  );
});

done();
