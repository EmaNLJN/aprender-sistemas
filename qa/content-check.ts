/* Offline validation of exercise structure and minimum learning scaffolding. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadLabExercises, loadSystemsCatalogs } from './lib/legacy-sources.ts';

type Language = 'rust' | 'go';
type TextField =
  | 'topicId'
  | 'topic'
  | 'title'
  | 'intro'
  | 'why'
  | 'objective'
  | 'starter'
  | 'solution'
  | 'transfer';
interface TestCase {
  id: string;
  label: string;
  expression: string;
  why: string;
  failure: string;
  [field: string]: string;
}
interface Exercise extends Record<TextField, string> {
  id: string;
  language: Language;
  stage: number;
  level?: string;
  instructions: string[];
  hints: string[];
  review: { success: string; pitfall: string };
  tests: TestCase[];
  prediction: {
    question: string;
    explanation: string;
    options: string[];
    answer: number;
  };
  sources: { title: string; url: string }[];
}
interface CheckWindow {
  [name: string]: unknown;
}

const window: CheckWindow = {};
const context = vm.createContext({ window });
const partial = process.argv.includes('--partial');
const validLevels = new Set(['beginner', 'medium', 'advanced', 'expert']);
const extensionLevels: Record<number, string> = {
  16: 'beginner',
  17: 'medium',
  18: 'medium',
  19: 'advanced',
  20: 'expert',
  21: 'beginner',
  22: 'medium',
  23: 'advanced',
  24: 'expert',
};
loadSystemsCatalogs(context);
loadLabExercises(context);
const systems = ['LOWLEVEL', 'INFRA', 'PLAY', 'PC'].flatMap(
  (name) => window['SYSTEMS_' + name + '_LABS'] as Exercise[],
);
const ids = new Set<string>();
let count = 0;
let tests = 0;
for (const language of ['rust', 'go'] as const) {
  const core = window[language === 'rust' ? 'RUST_LAB' : 'GO_LAB'] as Exercise[];
  assert.ok(Array.isArray(core) && core.length > 0, language + ' curriculum');
  assert.ok(core.length <= 100, language + ' has at most 100 core exercises');
  if (!partial) assert.equal(core.length, 100, language + ' should have 100 core exercises');
  const quests = (window[language === 'rust' ? 'RUST_QUESTS' : 'GO_QUESTS'] || []) as Exercise[];
  assert.ok(
    Array.isArray(quests) && quests.length <= 12,
    language + ' has at most 12 campaign challenges',
  );
  if (!partial) assert.equal(quests.length, 12, language + ' should have12 campaign challenges');
  const kernels = systems.filter((item) => item.language === language);
  assert.equal(kernels.length, 25, language + ' has 25 systems kernels');
  const exercises = [...core, ...quests, ...kernels];
  const stages = new Set<number>();
  for (const [index, ex] of exercises.entries()) {
    const expectedId = language + '-' + String(index + 1).padStart(2, '0');
    assert.equal(ex.id, expectedId);
    assert.ok(!ids.has(ex.id), ex.id + ' unique');
    ids.add(ex.id);
    assert.equal(ex.language, language);
    assert.equal(
      ex.stage,
      index < 100
        ? Math.ceil((index + 1) / 5)
        : index < 112
          ? 21 + Math.floor((index - 100) / 3)
          : 25 + index - 112,
    );
    if (ex.level !== undefined)
      assert.ok(validLevels.has(ex.level), ex.id + ': supported difficulty level');
    if (index >= 75 && index < 112)
      assert.equal(
        ex.level,
        extensionLevels[ex.stage],
        ex.id + ': explicit difficulty for added stage',
      );
    stages.add(ex.stage);
    for (const key of [
      'topicId',
      'topic',
      'title',
      'intro',
      'why',
      'objective',
      'starter',
      'solution',
      'transfer',
    ] as const) {
      assert.ok(typeof ex[key] === 'string' && ex[key].trim(), ex.id + ': ' + key);
    }
    assert.notEqual(ex.starter.trim(), ex.solution.trim(), ex.id + ': starter already solved');
    assert.ok(
      Array.isArray(ex.instructions) && ex.instructions.length > 0,
      ex.id + ': instructions',
    );
    assert.equal(ex.hints.length, 3, ex.id + ': 3 graduated hints');
    assert.ok(ex.hints.every((value) => typeof value === 'string' && value.trim()));
    assert.ok(
      ex.review.success && ex.review.pitfall,
      ex.id + ': review explains both result and limitation',
    );
    assert.equal(ex.tests.length, 3, ex.id + ': three verification cases');
    assert.equal(
      new Set(ex.tests.map((test) => test.expression)).size,
      3,
      ex.id + ': duplicate test expressions',
    );
    for (const [i, test] of ex.tests.entries()) {
      assert.equal(test.id, 't' + (i + 1));
      for (const field of ['label', 'expression', 'why', 'failure'])
        assert.ok(test[field] && test[field].trim(), ex.id + ': test ' + field);
      assert.ok(
        !/^(true|false|\d+\s*==\s*\d+)$/.test(test.expression.trim()),
        ex.id + ': trivial constant-only test',
      );
      // Control bytes are intentionally rejected from curriculum expressions.
      assert.ok(
        // eslint-disable-next-line no-control-regex
        !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(test.expression),
        ex.id + ': control characters',
      );
    }
    const prediction = ex.prediction;
    assert.ok(prediction.question && prediction.explanation, ex.id + ': prediction feedback');
    assert.ok(
      prediction.options.length >= 2 &&
        new Set(prediction.options).size === prediction.options.length,
      ex.id + ': distinct prediction options',
    );
    assert.ok(
      Number.isInteger(prediction.answer) &&
        prediction.answer >= 0 &&
        prediction.answer < prediction.options.length,
      ex.id + ': correct option index',
    );
    assert.ok(
      Array.isArray(ex.sources) && ex.sources.length > 0,
      ex.id + ': documentation sources',
    );
    for (const source of ex.sources) {
      assert.ok(source.title, ex.id + ': source title');
      assert.equal(new URL(source.url).protocol, 'https:', ex.id + ': source URL');
    }
    tests += ex.tests.length;
    count++;
  }
  console.log(
    language +
      ': ' +
      core.length +
      ' core + ' +
      quests.length +
      ' campaign + ' +
      kernels.length +
      ' systems exercises, ' +
      stages.size +
      ' stages, structure and learning scaffolding PASS.',
  );
}
console.log(
  count +
    ' exercises / ' +
    tests +
    ' test cases validated offline. Compiler correctness is checked separately.',
);
