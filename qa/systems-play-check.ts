/* Behavioral checks for the original visual-computing models. No network. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { plainJson as plain } from './lib/plain-json.ts';
import { loadSystemsDomain } from './lib/legacy-sources.ts';
import {
  achievedBelongToWorkshop,
  assertUnchanged,
  hasSupportedTones,
  hasTextFields,
  hasViewCollections,
  isControlContract,
  rowsMatchColumns,
} from './lib/systems-model-contract.ts';
import type { ModelView, ModelWorkshop, SystemsModel } from './lib/systems-model-contract.ts';

type Language = 'rust' | 'go';
// Una forma por tipo de figura: los campos que no aplican quedan ausentes en runtime.
interface Shape {
  type: string;
  x: number;
  y: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  width: number;
  height: number;
  r: number;
  strokeWidth: number;
  points: number[][];
  text: string;
  fill?: string;
  stroke?: string;
}
const SHAPE_NUMBER_FIELDS = [
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'width',
  'height',
  'r',
  'strokeWidth',
] as const;
interface Scene {
  width: number;
  height: number;
  alt: string;
  shapes: Shape[];
}
interface PlayView extends ModelView {
  metrics: { label: string; value: string }[];
  cells: { label: string; value: string; tone: string }[];
  scene: Scene;
}
interface TransformsState {
  points: number[][];
  matrix: number[];
}
interface RasterState {
  [key: string]: unknown;
}
interface RaycastState {
  angle: number;
}
interface PathfindingState {
  cost: number | null;
  path: string[];
  done: boolean;
  open: unknown[];
}
interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  seen: Record<string, boolean | undefined>;
  last: string;
}
interface LifeState {
  grid: boolean[][];
}
interface AlgebraState {
  acc: number;
  x: number;
}
interface MinimaxState {
  winner: string | null;
  n: number;
  turn: string;
}
interface States {
  transforms: TransformsState;
  raster: RasterState;
  raycast: RaycastState;
  pathfinding: PathfindingState;
  physics: PhysicsState;
  life: LifeState;
  algebra: AlgebraState;
  minimax: MinimaxState;
}
type ModelId = keyof States;
interface PlayWorkshop extends ModelWorkshop {
  id: ModelId;
  model: ModelId;
  category: string;
  level: string;
  minutes: number;
  steps: { title: string; task: string; why: string; done: string }[];
  uses: unknown[];
  prediction: { options: unknown[]; answer: number };
  sources: { url: string }[];
  code: Record<Language, string>;
  related: Record<Language, unknown[]>;
  title: string;
  subtitle: string;
  story: string;
  what: string;
  why: string;
  limits: string;
}
type Models = { [Id in ModelId]: SystemsModel<States[Id], PlayView, PlayWorkshop> };
interface PlayLab {
  id: string;
  language: string;
  stage: number;
  level: string;
  topicId: string;
  tests: { id: string; label: string; expression: string; why: string; failure: string }[];
  starter: string;
  solution: string;
}
interface PlayWindow {
  SYSTEMS_PLAY?: { workshops: PlayWorkshop[]; models: Models };
  SYSTEMS_PLAY_LABS?: PlayLab[];
}

const context: { window: PlayWindow } = { window: {} };
vm.createContext(context);
loadSystemsDomain(context, 'play', { timeout: 3000 });
const playDomain = context.window.SYSTEMS_PLAY;
const labs = context.window.SYSTEMS_PLAY_LABS;
if (!playDomain || !labs) throw new Error('SYSTEMS_PLAY was not published by systems-play.js');
const { workshops, models } = playDomain;
function equal(actual: unknown, expected: unknown, message?: string): void {
  if (message === undefined) assert.deepEqual(plain(actual), plain(expected));
  else assert.deepEqual(plain(actual), plain(expected), message);
}
const tests: string[] = [];
let observedStates = 0;
let inspectedShapes = 0;
const completed = new Set<string>();
function test(name: string, body: () => void): void {
  body();
  tests.push(name);
}
function descriptor(id: ModelId): PlayWorkshop {
  const workshop = workshops.find((item) => item.id === id);
  if (!workshop) throw new Error(`Missing workshop ${id}`);
  return workshop;
}
function checkNumbers(value: unknown): void {
  if (typeof value === 'number')
    assert.ok(Number.isFinite(value), 'No NaN or Infinity in model output');
  else if (value && typeof value === 'object') Object.values(value).forEach(checkNumbers);
}
function inspectShape(shape: Shape): void {
  assert.ok(['rect', 'line', 'circle', 'polygon', 'text'].includes(shape.type));
  if (shape.type === 'rect') assert.ok(shape.width > 0 && shape.height > 0);
  if (shape.type === 'circle') assert.ok(shape.r > 0);
  if (shape.type === 'polygon') {
    assert.ok(shape.points.length >= 3);
    shape.points.forEach((point) => assert.ok(point.length === 2 && point.every(Number.isFinite)));
  }
  if (shape.type === 'text') assert.equal(typeof shape.text, 'string');
  for (const field of SHAPE_NUMBER_FIELDS) {
    if (shape[field] !== undefined) assert.equal(typeof shape[field], 'number');
  }
  for (const field of ['fill', 'stroke'] as const)
    if (shape[field]) assert.match(shape[field], /^(#[0-9a-fA-F]{3,8}|currentColor)$/);
  inspectedShapes++;
}
function inspectScene(scene: Scene): void {
  assert.ok(scene && scene.width > 0 && scene.height > 0 && scene.alt.length > 20);
  assert.ok(scene.shapes.length > 0, 'Each visual model draws an actual scene');
  scene.shapes.forEach(inspectShape);
}
function inspectViewContract(view: PlayView): void {
  checkNumbers(view);
  assert.ok(hasTextFields(view));
  assert.ok(hasViewCollections(view));
  for (const item of [...view.metrics, ...view.cells]) {
    assert.equal(typeof item.label, 'string');
    assert.equal(typeof item.value, 'string');
  }
  assert.ok(hasSupportedTones(view.cells));
  for (const button of view.controls) assert.ok(isControlContract(button));
  assert.ok(rowsMatchColumns(view));
  assert.ok(view.log.length <= 6, 'Logs remain bounded');
  inspectScene(view.scene);
}
function inspect<Id extends ModelId>(id: Id, state: States[Id]): PlayView {
  const model: SystemsModel<States[Id], PlayView, PlayWorkshop> = models[id],
    workshop = descriptor(id);
  checkNumbers(state);
  const before = JSON.stringify(state);
  const view = model.view(state, workshop);
  assertUnchanged(state, before, 'view must not mutate its state');
  equal(model.view(state, workshop), view, 'view is deterministic');
  inspectViewContract(view);
  const goals = model.achieved(state, workshop);
  assert.equal(new Set(goals).size, goals.length);
  assert.ok(achievedBelongToWorkshop(goals, workshop));
  assertUnchanged(state, before, 'achieved must not mutate its state');
  observedStates++;
  return view;
}
function initial<Id extends ModelId>(id: Id): States[Id] {
  const model: SystemsModel<States[Id], PlayView, PlayWorkshop> = models[id];
  const state = model.initial(descriptor(id));
  inspect(id, state);
  assert.equal(model.achieved(state, descriptor(id)).length, 0, 'Initial state awards no goals');
  return state;
}
function act<Id extends ModelId>(
  id: Id,
  state: States[Id],
  action: string,
  value?: string,
): States[Id] {
  const before = JSON.stringify(state),
    model: SystemsModel<States[Id], PlayView, PlayWorkshop> = models[id],
    workshop = descriptor(id);
  const next = model.act(state, action, value, workshop);
  assertUnchanged(state, before, 'act must not mutate its input');
  equal(model.act(state, action, value, workshop), next, 'Transitions are deterministic');
  inspect(id, next);
  for (const earned of model.achieved(state, workshop)) {
    assert.ok(
      model.achieved(next, workshop).includes(earned),
      'Observed goals remain earned after a new scene',
    );
  }
  return next;
}
function metricValue(view: PlayView, label: string): string {
  const metric = view.metrics.find((item) => item.label === label);
  if (!metric) throw new Error(`Missing metric ${label}`);
  return metric.value;
}
function allGoals<Id extends ModelId>(id: Id, state: States[Id]): void {
  const model: SystemsModel<States[Id], PlayView, PlayWorkshop> = models[id];
  equal(
    model.achieved(state, descriptor(id)).slice().sort(),
    descriptor(id)
      .objectives.map((item) => item.id)
      .sort(),
  );
  completed.add(id);
}

test('Eight workshop schemas link to sixteen complete exercise kernels', () => {
  assert.equal(workshops.length, 8);
  assert.equal(new Set(workshops.map((item) => item.id)).size, 8);
  assert.equal(labs.length, 16);
  assert.equal(new Set(labs.map((item) => item.id)).size, 16);
  for (const [index, workshop] of workshops.entries()) {
    assert.equal(workshop.category, 'play');
    assert.ok(['beginner', 'medium', 'advanced', 'expert'].includes(workshop.level));
    assert.ok(workshop.minutes > 0);
    assert.equal(workshop.objectives.length, 3);
    assert.equal(workshop.steps.length, 4);
    assert.equal(workshop.uses.length, 3);
    assert.equal(workshop.prediction.options.length, 3);
    assert.ok(
      Number.isInteger(workshop.prediction.answer) &&
        workshop.prediction.answer >= 0 &&
        workshop.prediction.answer < 3,
    );
    for (const field of ['title', 'subtitle', 'story', 'what', 'why', 'limits'] as const)
      assert.ok(workshop[field].length > 10);
    for (const step of workshop.steps)
      for (const field of ['title', 'task', 'why', 'done'] as const)
        assert.ok(step[field].length > 3);
    workshop.sources.forEach((source) => assert.equal(new URL(source.url).protocol, 'https:'));
    for (const language of ['rust', 'go'] as const) {
      const id = language + '-' + (129 + index),
        lab: PlayLab | undefined = labs.find((item) => item.id === id);
      assert.equal(workshop.code[language], id);
      assert.ok(lab, `${id}: missing exercise kernel`);
      assert.equal(lab.language, language);
      assert.equal(lab.stage, 41 + index);
      assert.equal(lab.level, workshop.level);
      assert.equal(lab.topicId, 'play-' + workshop.id);
      assert.equal(lab.tests.length, 3);
      equal(
        lab.tests.map((item) => item.id),
        ['t1', 't2', 't3'],
      );
      assert.notEqual(lab.starter, lab.solution);
      for (const test of lab.tests)
        for (const field of ['label', 'expression', 'why', 'failure'] as const)
          assert.ok(test[field].length > 3);
      assert.ok(workshop.related[language].length <= 3);
    }
    for (const method of ['initial', 'act', 'view', 'achieved'] as const)
      assert.equal(typeof models[workshop.model][method], 'function');
  }
});

test('Every exposed initial action preserves the renderer contract and input state', () => {
  for (const workshop of workshops) {
    const state = initial(workshop.id),
      view = inspect(workshop.id, state);
    for (const button of view.controls) act(workshop.id, state, button.action, button.value);
    equal(act(workshop.id, state, 'unknown-action'), state, 'Unknown actions are harmless');
  }
});

test('Affine composition changes the translated origin; inverse restores all vertices', () => {
  let s = initial('transforms');
  s = act('transforms', s, 'step');
  equal(s.points, [
    [2, 0],
    [4, 0],
    [2, 1],
  ]);
  s = act('transforms', s, 'step');
  equal(s.points, [
    [0, 2],
    [0, 4],
    [-1, 2],
  ]);
  equal(s.matrix, [0, 1, -1, 0, 0, 2]);
  s = act('transforms', s, 'inverse');
  equal(s.points, [
    [0, 0],
    [2, 0],
    [0, 1],
  ]);
  s = act('transforms', s, 'order');
  s = act('transforms', act('transforms', s, 'step'), 'step');
  equal(s.points, [
    [2, 0],
    [2, 2],
    [1, 0],
  ]);
  equal(s.matrix, [0, 1, -1, 0, 2, 0]);
  allGoals('transforms', s);
});

test('Bresenham includes endpoints, moves by neighbor pixels and handles zero length', () => {
  let s = initial('raster');
  const endpoints = [
    [
      [1, 1],
      [10, 6],
    ],
    [
      [2, 8],
      [5, 1],
    ],
    [
      [10, 2],
      [1, 7],
    ],
    [
      [6, 4],
      [6, 4],
    ],
  ];
  for (let preset = 0; preset < 4; preset++) {
    s = act('raster', s, 'preset', String(preset));
    s = act('raster', s, 'finish');
    const points = models.raster
      .view(s)
      .cells.map((cell) => cell.value.slice(1, -1).split(',').map(Number));
    equal(points[0], endpoints[preset][0]);
    equal(points.at(-1), endpoints[preset][1]);
    assert.equal(
      points.length,
      Math.max(...endpoints[preset][0].map((n, i) => Math.abs(n - endpoints[preset][1][i]))) + 1,
    );
    for (let i = 1; i < points.length; i++) {
      assert.equal(
        Math.max(
          Math.abs(points[i][0] - points[i - 1][0]),
          Math.abs(points[i][1] - points[i - 1][1]),
        ),
        1,
      );
    }
  }
  allGoals('raster', s);
});

test('Ray scene chooses the nearest forward surface and safely draws misses', () => {
  let s = act('raycast', initial('raycast'), 'cast');
  let view = models.raycast.view(s);
  equal(view.rows, [
    ['Cerca', '160.00'],
    ['Lejos', '317.00'],
  ]);
  s = act('raycast', s, 'aim', '-15');
  s = act('raycast', s, 'cast');
  equal(
    models.raycast.view(s).rows?.map((row) => row[0]),
    ['Luna'],
  );
  s = act('raycast', s, 'aim', '-30');
  s = act('raycast', s, 'cast');
  assert.equal(models.raycast.view(s).rows?.length, 0);
  for (const value of ['999', '-999', 'invalid']) {
    s = act('raycast', s, 'aim', value);
    view = models.raycast.view(s);
    assert.ok(s.angle >= -45 && s.angle <= 45);
    for (const shape of view.scene.shapes.filter((shape) => shape.type === 'line')) {
      assert.ok(
        shape.x1 >= 0 &&
          shape.x2 <= view.scene.width &&
          shape.y1 >= 0 &&
          shape.y2 >= 0 &&
          shape.y2 <= view.scene.height,
      );
    }
  }
  allGoals('raycast', s);
});

test('BFS minimizes steps; A* avoids weighted terrain and reconstructs a legal path', () => {
  let s = act('pathfinding', initial('pathfinding'), 'finish');
  assert.equal(s.cost, 10);
  assert.equal(s.path.length, 11);
  s = act('pathfinding', act('pathfinding', s, 'terrain'), 'finish');
  assert.equal(s.cost, 16, 'BFS takes the equal-length expensive route in this tie order');
  s = act('pathfinding', act('pathfinding', s, 'algorithm', 'astar'), 'finish');
  assert.equal(s.cost, 10);
  assert.equal(s.path[0], '1,1');
  assert.equal(s.path.at(-1), '5,7');
  for (let i = 1; i < s.path.length; i++) {
    const a = s.path[i - 1].split(',').map(Number),
      b = s.path[i].split(',').map(Number);
    assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1);
    assert.ok(!['1,4', '1,5'].includes(s.path[i]), 'The cheap route avoids both swamps');
  }
  s = act('pathfinding', act('pathfinding', s, 'block'), 'finish');
  assert.equal(s.done, true);
  assert.equal(s.cost, null);
  assert.equal(s.path.length, 0);
  assert.equal(s.open.length, 0);
  allGoals('pathfinding', s);
});

test('Single-step and complete-search actions produce identical route states', () => {
  for (const algorithm of ['bfs', 'astar']) {
    let start = initial('pathfinding');
    start = act('pathfinding', start, 'algorithm', algorithm);
    start = act('pathfinding', start, 'terrain');
    const finished = act('pathfinding', start, 'finish');
    let stepped = start,
      guard = 0;
    while (!stepped.done && guard++ < 100) stepped = act('pathfinding', stepped, 'step');
    assert.ok(stepped.done);
    equal(stepped, finished);
  }
});

test('Fixed-step AABB response preserves speed and prevents penetration over 500 steps', () => {
  let s = initial('physics');
  const speedSquared = s.vx * s.vx + s.vy * s.vy;
  for (let i = 0; i < 500; i++) {
    s = act('physics', s, 'step');
    assert.ok(s.x >= 0 && s.x <= 19 && s.y >= 0 && s.y <= 9);
    assert.equal(s.vx * s.vx + s.vy * s.vy, speedSquared);
    assert.ok(
      !(s.x < 12 && s.x + 1 > 10 && s.y < 7 && s.y + 1 > 4),
      'No positive-area overlap remains',
    );
  }
  assert.ok(s.seen['physics-brick']);
  assert.ok(s.seen['physics-wall']);
  s = act('physics', s, 'preset', 'touch');
  s = act('physics', s, 'step');
  equal([s.x, s.y, s.vx, s.vy], [9, 5, 0, 0]);
  assert.equal(s.last, 'Sin choque');
  allGoals('physics', s);
});

test('A wall crossing reflects its overshoot rather than losing the entire step', () => {
  let s = act('physics', initial('physics'), 'preset', 'wall');
  s = act('physics', s, 'step');
  equal([s.x, s.y, s.vx, s.vy], [18.75, 1, -1.25, 0]);
  assert.equal(s.last, 'Pared');
});

test('Conway blinker, block and glider have their known periods and displacement', () => {
  let s = initial('life'),
    first = plain(s.grid);
  s = act('life', s, 'step');
  assert.equal(s.grid.flat().filter(Boolean).length, 3);
  assert.ok(s.grid[2][4] && s.grid[3][4] && s.grid[4][4]);
  s = act('life', s, 'step');
  equal(s.grid, first);
  s = act('life', s, 'pattern', 'block');
  first = plain(s.grid);
  s = act('life', s, 'four');
  equal(s.grid, first);
  s = act('life', s, 'pattern', 'glider');
  s = act('life', s, 'four');
  const live: number[][] = [];
  s.grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) live.push([r, c]);
    }),
  );
  equal(live, [
    [3, 4],
    [4, 5],
    [5, 3],
    [5, 4],
    [5, 5],
  ]);
  allGoals('life', s);
});

test('Conway updates simultaneously and never wraps across the finite border', () => {
  let s = initial('life');
  s.grid = Array.from({ length: 8 }, () => Array(10).fill(false));
  s.grid[0][0] = s.grid[0][9] = s.grid[7][0] = true;
  s = act('life', s, 'step');
  assert.equal(s.grid.flat().filter(Boolean).length, 0, 'Opposite edges are not neighbors');
  let a = initial('life'),
    b = a;
  a = act('life', a, 'four');
  for (let i = 0; i < 4; i++) b = act('life', b, 'step');
  equal(a, b);
});

test('Horner accumulator, symbolic derivative and horizontal tangent agree', () => {
  let s = initial('algebra');
  s = act('algebra', s, 'step');
  assert.equal(s.acc, 1);
  s = act('algebra', s, 'step');
  assert.equal(s.acc, 1);
  s = act('algebra', s, 'step');
  assert.equal(s.acc, -2);
  s = act('algebra', s, 'derive');
  equal(models.algebra.view(s).rows?.[1], ['P′', '0, 2']);
  s = act('algebra', s, 'x', '-1');
  assert.equal(s.x, 0);
  const view = models.algebra.view(s);
  equal(
    view.metrics.filter((item) => ['P(x)', 'P′(x)'].includes(item.label)).map((item) => item.value),
    ['-3', '0'],
  );
  allGoals('algebra', s);
  s = act('algebra', s, 'preset');
  s = act('algebra', s, 'x', '2');
  s = act('algebra', s, 'finish');
  s = act('algebra', s, 'derive');
  assert.equal(s.acc, 4);
  equal(models.algebra.view(s).rows?.[1], ['P′', '-2, 0, 3']);
  s = act('algebra', s, 'x', '-999');
  s = act('algebra', s, 'finish');
  assert.equal(s.x, -2);
  assert.equal(s.acc, -4);
  equal(act('algebra', s, 'x', 'invalid'), s);
});

test('Negamax explains a forced loss and optimal play wins from seven', () => {
  let s = act('minimax', initial('minimax'), 'preset', '6');
  s = act('minimax', s, 'analyze');
  assert.equal(metricValue(models.minimax.view(s), 'Valor'), '−1');
  assert.equal(metricValue(models.minimax.view(s), 'Sugerencia'), '1');
  s = act('minimax', s, 'preset', '7');
  let guard = 0;
  while (!s.winner && guard++ < 10) {
    if (s.turn === 'IA') s = act('minimax', s, 'ai');
    else {
      s = act('minimax', s, 'analyze');
      const move = metricValue(models.minimax.view(s), 'Sugerencia');
      s = act('minimax', s, 'take', move);
    }
  }
  assert.equal(s.winner, 'Vos');
  assert.equal(s.n, 0);
  allGoals('minimax', s);
  equal(act('minimax', s, 'take', '1'), s, 'Terminal games reject further moves');
});

test('Negamax rejects invalid moves and refuses a human move on the opponent turn', () => {
  let s = initial('minimax');
  for (const value of ['0', '3', '-1', '1.5', 'bad']) equal(act('minimax', s, 'take', value), s);
  s = act('minimax', s, 'take', '1');
  equal(act('minimax', s, 'take', '2'), s);
  s = act('minimax', s, 'ai');
  assert.equal(s.turn, 'Vos');
  assert.equal(s.n, 5, 'The losing AI uses the documented one-token tie break');
});

test('All 24 conceptual goals are attainable with the visible controls', () => {
  assert.equal(completed.size, 8);
});

console.log(
  JSON.stringify(
    {
      status: 'pass',
      testCases: tests.length,
      workshops: workshops.length,
      labs: labs.length,
      labTestCases: labs.reduce((sum, lab) => sum + lab.tests.length, 0),
      conceptualGoals: completed.size * 3,
      inspectedStates: observedStates,
      inspectedShapes,
      checks: tests,
    },
    null,
    2,
  ),
);
