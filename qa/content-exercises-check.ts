/* Ejercicios de content/<lenguaje>/ (tools/content/exercises.ts).
 * node qa/content-exercises-check.ts
 *
 * Contrato: cada ejercicio hereda `defaults`, después su etapa y, en los desafíos, lo que
 * `defineQuest` derivaba de la posición; su exercise.yaml manda sobre todo eso. La etapa es la
 * posición en el manifiesto y las claves salen en el orden de cada catálogo legacy. Los
 * esperados están escritos a mano a partir de esas reglas.
 */
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expectDistinctIds, interleaveCores, loadLanguage } from '../tools/content/exercises.ts';
import { fixture, scenarios, throwsContent } from './lib/content-fixtures.ts';

const EXERCISE = `title: Sumar
intro: Una función suma.
why: Practicás expresiones.
objective: Sumá dos enteros.
instructions:
  - Completá la función.
tests:
  - id: t1
    label: Uno más uno
    expression: suma(1, 1) == 2
    why: Caso base.
    failure: Revisá el operador.
hints:
  - Pista uno.
  - Pista dos.
  - Pista tres.
review:
  success: Bien.
  pitfall: Ojo con el overflow.
transfer: Probá con restas.
prediction:
  question: ¿Cuánto da suma(1, 1)?
  options:
    - '1'
    - '2'
  answer: 1
  explanation: Uno más uno es dos.
`;

const DEFAULTS = `defaults:
  kind: completar
  imports: []
  visual: flow
`;

function labStage(topicId: string, ids: string[]): string {
  return `  - topicId: ${topicId}
    topic: Tema ${topicId}
    minutes: 8
    sources:
      - title: Libro · ${topicId}
        url: https://example.org/${topicId}
    exercises:
${ids.map((id) => `      - ${id}`).join('\n')}
`;
}

function exerciseFiles(language: 'rust' | 'go', id: string, yaml = EXERCISE) {
  const folder = `content/${language}/exercises/${id}`;
  const extension = language === 'rust' ? 'rs' : 'go';
  const header = language === 'go' ? 'package main\n\n' : '';
  return {
    [`${folder}/exercise.yaml`]: yaml,
    [`${folder}/starter.${extension}`]: `${header}// ${id}: inicial`,
    [`${folder}/solution.${extension}`]: `${header}// ${id}: resuelto`,
  };
}

function rustLab(extra: Record<string, string> = {}): string {
  return fixture({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02'])}`,
    ...exerciseFiles('rust', 'rust-01'),
    ...exerciseFiles('rust', 'rust-02', `level: medium\nkind: reparar\n${EXERCISE}`),
    ...extra,
  });
}

const { test, done } = scenarios('content-exercises');

const SHARED_TEXT = {
  title: 'Sumar',
  intro: 'Una función suma.',
  why: 'Practicás expresiones.',
  objective: 'Sumá dos enteros.',
  instructions: ['Completá la función.'],
};
const SHARED_TAIL = {
  tests: [
    {
      id: 't1',
      label: 'Uno más uno',
      expression: 'suma(1, 1) == 2',
      why: 'Caso base.',
      failure: 'Revisá el operador.',
    },
  ],
  hints: ['Pista uno.', 'Pista dos.', 'Pista tres.'],
  review: { success: 'Bien.', pitfall: 'Ojo con el overflow.' },
  transfer: 'Probá con restas.',
  prediction: {
    question: '¿Cuánto da suma(1, 1)?',
    options: ['1', '2'],
    answer: 1,
    explanation: 'Uno más uno es dos.',
  },
};

test('recorrido: defaults, etapa y exercise.yaml se combinan en el orden de RUST_LAB', () => {
  const { lab } = loadLanguage(rustLab(), 'rust');
  const stageFields = {
    topicId: 'rust-a',
    topic: 'Tema rust-a',
    stage: 1,
  };
  const sources = [{ title: 'Libro · rust-a', url: 'https://example.org/rust-a' }];
  assert.deepEqual(lab, [
    {
      id: 'rust-01',
      language: 'rust',
      ...stageFields,
      kind: 'completar',
      minutes: 8,
      imports: [],
      visual: 'flow',
      sources,
      ...SHARED_TEXT,
      starter: '// rust-01: inicial',
      solution: '// rust-01: resuelto',
      ...SHARED_TAIL,
    },
    {
      id: 'rust-02',
      language: 'rust',
      ...stageFields,
      kind: 'reparar',
      minutes: 8,
      imports: [],
      visual: 'flow',
      sources,
      level: 'medium',
      ...SHARED_TEXT,
      starter: '// rust-02: inicial',
      solution: '// rust-02: resuelto',
      ...SHARED_TAIL,
    },
  ]);
  // deepEqual no mira el orden de las claves: el oráculo sí.
  assert.deepEqual(Object.keys(lab[1]), [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'kind',
    'minutes',
    'imports',
    'visual',
    'sources',
    'level',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'starter',
    'solution',
    'tests',
    'hints',
    'review',
    'transfer',
    'prediction',
  ]);
});

test('desafíos: la etapa sigue al recorrido y la posición fija tipo, kind y minutos', () => {
  const root = fixture({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:
${labStage('rust-a', ['rust-01'])}${labStage('rust-b', ['rust-02'])}quests:
  - topicId: rust-quest-a
    topic: Mundo A
    level: beginner
    minutes: 12
    bossMinutes: 20
    exercises:
      - rust-101
      - rust-102
      - rust-103
`,
    ...exerciseFiles('rust', 'rust-01'),
    ...exerciseFiles('rust', 'rust-02'),
    ...exerciseFiles('rust', 'rust-101', `${EXERCISE}sources:\n  - title: A\n    url: https://a\n`),
    ...exerciseFiles('rust', 'rust-102', `${EXERCISE}sources:\n  - title: B\n    url: https://b\n`),
    ...exerciseFiles(
      'rust',
      'rust-103',
      `minutes: 25\n${EXERCISE}sources:\n  - title: C\n    url: https://c\n`,
    ),
  });
  const { lab, quests } = loadLanguage(root, 'rust');
  assert.deepEqual(
    lab.map((exercise) => exercise.stage),
    [1, 2],
  );
  const summary = quests.map(({ id, stage, level, challengeType, kind, minutes }) => ({
    id,
    stage,
    level,
    challengeType,
    kind,
    minutes,
  }));
  assert.deepEqual(summary, [
    {
      id: 'rust-101',
      stage: 3,
      level: 'beginner',
      challengeType: 'repair',
      kind: 'reparar',
      minutes: 12,
    },
    {
      id: 'rust-102',
      stage: 3,
      level: 'beginner',
      challengeType: 'kata',
      kind: 'completar',
      minutes: 12,
    },
    {
      id: 'rust-103',
      stage: 3,
      level: 'beginner',
      challengeType: 'boss',
      kind: 'completar',
      minutes: 25,
    },
  ]);
  assert.deepEqual(Object.keys(quests[0]), [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'level',
    'challengeType',
    'kind',
    'minutes',
    'imports',
    'visual',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'starter',
    'solution',
    'tests',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
  ]);
});

function coresFixture(): string {
  const files: Record<string, string> = {};
  for (const language of ['rust', 'go'] as const) {
    const domains = ['lowlevel', 'infra', 'play', 'pc']
      .map((domain, index) => {
        const id = `${language}-${113 + index}`;
        Object.assign(
          files,
          exerciseFiles(
            language,
            id,
            `level: expert\nminutes: 20\n${domain === 'infra' ? 'workshopId: wal\nchallengeType: kata\n' : ''}${EXERCISE}sources:\n  - title: S\n    url: https://s\n`,
          ),
        );
        return `  ${domain}:\n    - topicId: ${language}-systems-${domain}\n      topic: Núcleo ${domain}\n      exercises:\n        - ${id}\n`;
      })
      .join('');
    const lab = `${language}-01`;
    Object.assign(files, exerciseFiles(language, lab));
    files[`content/${language}/manifest.yaml`] =
      `${DEFAULTS}lab:\n${labStage(`${language}-a`, [lab])}systems:\n${domains}`;
  }
  return fixture(files);
}

test('núcleos: cada dominio con su orden de claves y Rust y Go intercalados', () => {
  const root = coresFixture();
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  assert.deepEqual(
    rust.cores.pc.map((core) => [core.id, core.stage]),
    [['rust-116', 5]],
  );
  assert.deepEqual(Object.keys(rust.cores.pc[0]), [
    'stage',
    'level',
    'kind',
    'minutes',
    'visual',
    'imports',
    'topic',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
    'id',
    'language',
    'topicId',
    'starter',
    'solution',
    'tests',
  ]);
  assert.deepEqual(Object.keys(rust.cores.infra[0]).slice(0, 9), [
    'id',
    'language',
    'topicId',
    'topic',
    'workshopId',
    'stage',
    'level',
    'kind',
    'challengeType',
  ]);
  const cores = interleaveCores(rust, go);
  assert.deepEqual(
    cores.lowlevel.map((core) => core.id),
    ['rust-113', 'go-113'],
  );
  assert.deepEqual(
    cores.pc.map((core) => core.id),
    ['rust-116', 'go-116'],
  );
});

test('Go: el archivo empieza con package main y una línea en blanco, que no se publica', () => {
  const root = coresFixture();
  const { lab } = loadLanguage(root, 'go');
  assert.equal(lab[0].starter, '// go-01: inicial');
  writeFileSync(
    join(root, 'content/go/exercises/go-01/solution.go'),
    'package main\n// sin blanco',
  );
  throwsContent(
    () => loadLanguage(root, 'go'),
    'content/go/exercises/go-01/solution.go: debe empezar con «package main» y una línea en blanco',
  );
});

test('Rust: el código se publica byte a byte, sin agregar un salto final', () => {
  const root = rustLab();
  writeFileSync(join(root, 'content/rust/exercises/rust-01/starter.rs'), 'fn a() {\n\tb()\n}');
  assert.equal(loadLanguage(root, 'rust').lab[0].starter, 'fn a() {\n\tb()\n}');
});

const RUST_01 = 'content/rust/exercises/rust-01';

test('validación: pistas, pruebas y predicción', () => {
  const cases: [string, string][] = [
    [
      EXERCISE.replace('  - Pista tres.\n', ''),
      `${RUST_01}/exercise.yaml: hints: se esperaban 3 pistas y hay 2`,
    ],
    [
      EXERCISE.replace('  - id: t1\n', '  - id: t2\n'),
      `${RUST_01}/exercise.yaml: tests[0].id: se esperaba «t1»`,
    ],
    [
      EXERCISE.replace('  answer: 1\n', '  answer: 2\n'),
      `${RUST_01}/exercise.yaml: prediction.answer: 2 no es el índice de una opción: hay 2`,
    ],
    [EXERCISE.replace('title: Sumar\n', ''), `${RUST_01}/exercise.yaml: falta la clave «title»`],
    [`color: rojo\n${EXERCISE}`, `${RUST_01}/exercise.yaml: color: clave desconocida en lab`],
    [
      `stage: 3\n${EXERCISE}`,
      `${RUST_01}/exercise.yaml: stage: no va en exercise.yaml: es la posición de la etapa en el manifiesto`,
    ],
    [
      `kind: arreglar\n${EXERCISE}`,
      `${RUST_01}/exercise.yaml: kind: se esperaba uno de: completar, reparar`,
    ],
  ];
  for (const [yaml, message] of cases) {
    const root = rustLab({ [`${RUST_01}/exercise.yaml`]: yaml });
    throwsContent(() => loadLanguage(root, 'rust'), message);
  }
});

test('validación: manifiesto y carpetas sin faltantes, huérfanos ni repetidos', () => {
  const manifest = 'content/rust/manifest.yaml';
  const orphan = rustLab(exerciseFiles('rust', 'rust-03'));
  throwsContent(
    () => loadLanguage(orphan, 'rust'),
    `content/rust/exercises/rust-03: no figura en ${manifest}`,
  );
  const missing = rustLab();
  rmSync(join(missing, 'content/rust/exercises/rust-02'), { recursive: true });
  throwsContent(
    () => loadLanguage(missing, 'rust'),
    `${manifest}: rust-02 no tiene content/rust/exercises/rust-02`,
  );
  const repeated = rustLab({
    [manifest]: `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02', 'rust-01'])}`,
  });
  throwsContent(() => loadLanguage(repeated, 'rust'), `${manifest}: ID repetido: rust-01`);
  const extra = rustLab({ [`${RUST_01}/notas.md`]: 'borrador' });
  throwsContent(
    () => loadLanguage(extra, 'rust'),
    `${RUST_01}: debe tener exactamente exercise.yaml, solution.rs, starter.rs; tiene exercise.yaml, notas.md, solution.rs, starter.rs`,
  );
});

test('validación: cada mundo de desafíos tiene reparación, kata y jefe', () => {
  const root = rustLab({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02'])}quests:
  - topicId: rust-quest-a
    topic: Mundo A
    level: beginner
    minutes: 12
    bossMinutes: 20
    exercises:
      - rust-101
`,
    ...exerciseFiles('rust', 'rust-101'),
  });
  throwsContent(
    () => loadLanguage(root, 'rust'),
    'content/rust/manifest.yaml: quests[0].exercises: cada mundo tiene reparación, kata y jefe, en ese orden',
  );
});

test('validación: un ID no se repite entre lenguajes y cada taller tiene núcleo en los dos', () => {
  const root = coresFixture();
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  throwsContent(
    () => expectDistinctIds(rust, rust),
    'content/go/manifest.yaml: el ID rust-01 también está en content/rust/',
  );
  const shortGo = { ...go, cores: { ...go.cores, pc: [] } };
  throwsContent(
    () => interleaveCores(rust, shortGo),
    'content/go/manifest.yaml: systems.pc tiene 0 núcleos y el de Rust 1',
  );
});

test('validación: bossMinutes sólo existe en los mundos de desafíos', () => {
  const root = rustLab({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02'])}    bossMinutes: 20\n`,
  });
  throwsContent(
    () => loadLanguage(root, 'rust'),
    'content/rust/manifest.yaml: lab[0].bossMinutes: clave desconocida',
  );
});

function questWorld(extra = ''): string {
  return `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01'])}quests:
  - topicId: rust-quest-a
    topic: Mundo A
    level: beginner
    minutes: 12
    bossMinutes: 20
${extra}    exercises:
      - rust-101
      - rust-102
      - rust-103
`;
}

function questFixture(manifest: string, bossYaml = EXERCISE): string {
  const sources = `sources:\n  - title: A\n    url: https://a\n`;
  return fixture({
    'content/rust/manifest.yaml': manifest,
    ...exerciseFiles('rust', 'rust-01'),
    ...exerciseFiles('rust', 'rust-101', EXERCISE + sources),
    ...exerciseFiles('rust', 'rust-102', EXERCISE + sources),
    ...exerciseFiles('rust', 'rust-103', bossYaml + sources),
  });
}

test('desafíos: la posición fija el rol; challengeType y kind del mundo no se aceptan', () => {
  throwsContent(
    () => loadLanguage(questFixture(questWorld(), `challengeType: boss\n${EXERCISE}`), 'rust'),
    'content/rust/exercises/rust-103/exercise.yaml: challengeType: no va en exercise.yaml: lo fija la posición en el mundo de desafíos',
  );
  throwsContent(
    () => loadLanguage(questFixture(questWorld('    kind: reparar\n')), 'rust'),
    'content/rust/manifest.yaml: quests[0].kind: clave desconocida',
  );
});

test('precedencia: la etapa pisa a defaults y el jefe sin minutes toma bossMinutes', () => {
  const stage = loadLanguage(
    fixture({
      'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01'])}    visual: memory\n`,
      ...exerciseFiles('rust', 'rust-01'),
    }),
    'rust',
  );
  assert.equal(stage.lab[0].visual, 'memory');
  const { quests } = loadLanguage(questFixture(questWorld()), 'rust');
  assert.equal(quests[0].minutes, 12);
  assert.equal(quests[2].minutes, 20);
});

test('código: UTF-8, LF, no vacío y un único salto final se quita', () => {
  const starter = `${RUST_01}/starter.rs`;
  const cases: [Buffer | string, string][] = [
    [Buffer.from('// energía\nfn a() {}', 'latin1'), `${starter}: no es UTF-8 válido`],
    ['fn a() {\r\n}', `${starter}: tiene finales de línea CRLF; guardalo con LF`],
    ['', `${starter}: el código está vacío`],
    ['  \n', `${starter}: el código está vacío`],
  ];
  for (const [code, message] of cases) {
    const root = rustLab();
    writeFileSync(join(root, starter), code);
    throwsContent(() => loadLanguage(root, 'rust'), message);
  }
  const root = rustLab();
  writeFileSync(join(root, starter), 'fn a() {}\n\n');
  assert.equal(loadLanguage(root, 'rust').lab[0].starter, 'fn a() {}\n');
});

test('Go: sin código después de la cabecera el ejercicio está vacío', () => {
  const root = coresFixture();
  writeFileSync(join(root, 'content/go/exercises/go-01/starter.go'), 'package main\n\n');
  throwsContent(
    () => loadLanguage(root, 'go'),
    'content/go/exercises/go-01/starter.go: el código está vacío',
  );
});

test('la carpeta de un ejercicio ignora ocultos y rechaza subcarpetas', () => {
  const hidden = rustLab({ [`${RUST_01}/.DS_Store`]: '' });
  assert.equal(loadLanguage(hidden, 'rust').lab.length, 2);
  const root = rustLab();
  // El starter es una carpeta con el nombre del archivo esperado.
  rmSync(join(root, RUST_01, 'starter.rs'));
  mkdirSync(join(root, RUST_01, 'starter.rs'));
  throwsContent(
    () => loadLanguage(root, 'rust'),
    `${RUST_01}/starter.rs: sólo se admiten exercise.yaml, starter y solution`,
  );
});

test('content/<lenguaje>/ rechaza archivos sueltos e ignora ocultos', () => {
  const loose = rustLab();
  writeFileSync(join(loose, 'content/rust/stages-old.yaml'), 'a: 1\n');
  throwsContent(
    () => loadLanguage(loose, 'rust'),
    'content/rust/stages-old.yaml: sólo se admiten manifest.yaml y exercises/',
  );
  const hidden = rustLab();
  writeFileSync(join(hidden, 'content/rust/.DS_Store'), '');
  assert.doesNotThrow(() => loadLanguage(hidden, 'rust'));
});

done();
