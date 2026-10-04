import { cloneJson } from '../../../../shared/lib/clone-json';
import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, SceneShape } from '../../model/types';
import { near } from './helpers';
import { PLAY_PALETTE } from './palette';
import { circle, line, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Point = [number, number];
// [a, b, c, d, tx, ty]: (a*x + c*y + tx, b*x + d*y + ty).
type Matrix = [number, number, number, number, number, number];
type Operation = 'T' | 'R';
type TransformsAction = 'order' | 'step' | 'inverse';

interface TransformsState extends PlayState {
  order: 'TR' | 'RT';
  step: number;
  matrix: Matrix;
  points: Point[];
  completedOrders: string[];
}
type TransformsHandler = PlayHandler<TransformsState>;

const { grid, ink, gold, muted } = PLAY_PALETTE;

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const BASE_SHIP: Point[] = [
  [0, 0],
  [2, 0],
  [0, 1],
];
const OPERATIONS: Record<Operation, Matrix> = { T: [1, 0, 0, 1, 2, 0], R: [0, 1, -1, 0, 0, 0] };
const OPERATION_MESSAGES: Record<Operation, string> = {
  T: 'Traslación: cada x aumenta 2.',
  R: 'Giro 90° antihorario: (x,y) → (−y,x).',
};

const transform = (m: Matrix, [x, y]: Point): Point => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const compose = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

const inverse = (m: Matrix): Matrix => {
  const d = m[0] * m[3] - m[1] * m[2];
  return [
    m[3] / d,
    -m[1] / d,
    -m[2] / d,
    m[0] / d,
    (m[2] * m[5] - m[3] * m[4]) / d,
    (m[1] * m[4] - m[0] * m[5]) / d,
  ];
};

const operationAt = (order: TransformsState['order'], step: number): Operation =>
  order[step] === 'T' ? 'T' : 'R';

function createInitialState(): TransformsState {
  return {
    order: 'TR',
    step: 0,
    matrix: [...IDENTITY],
    points: cloneJson(BASE_SHIP),
    completedOrders: [],
    seen: {},
    log: [],
  };
}

const invertOrder: TransformsHandler = (s, { log }) => {
  s.order = s.order === 'TR' ? 'RT' : 'TR';
  s.step = 0;
  s.matrix = [...IDENTITY];
  s.points = cloneJson(BASE_SHIP);
  log(s, 'Nueva secuencia: ' + s.order.split('').join(' → ') + '.');
};

function recordCompletedOrder(s: TransformsState): void {
  if (!s.completedOrders.includes(s.order)) s.completedOrders.push(s.order);
  remember(
    s,
    'transforms-order',
    s.completedOrders.includes('TR') && s.completedOrders.includes('RT'),
  );
}

const applyNextOperation: TransformsHandler = (s, { log }) => {
  if (s.step >= 2) return;
  const op = operationAt(s.order, s.step);
  s.matrix = compose(OPERATIONS[op], s.matrix);
  s.points = s.points.map((p) => transform(OPERATIONS[op], p));
  s.step++;
  remember(s, 'transforms-translation', op === 'T' && near(s.matrix[4], 2));
  log(s, OPERATION_MESSAGES[op]);
  if (s.step === 2) recordCompletedOrder(s);
};

const applyInverse: TransformsHandler = (s, { log }) => {
  if (s.step !== 2) return;
  s.points = s.points.map((p) => transform(inverse(s.matrix), p));
  remember(
    s,
    'transforms-inverse',
    s.points.every((p, i) => near(p[0], BASE_SHIP[i][0]) && near(p[1], BASE_SHIP[i][1])),
  );
  s.matrix = [...IDENTITY];
  s.step = 0;
  log(s, 'La inversa devuelve todos los vértices a su posición inicial.');
};

// Y crece hacia arriba: el origen queda a la izquierda y abajo del centro de la escena.
const toScreen = ([x, y]: Point): Point => [220 + x * 38, 230 - y * 38];

function gridShapes(): SceneShape[] {
  const shapes: SceneShape[] = [];
  for (let i = -4; i <= 7; i++) shapes.push(line(...toScreen([i, -1]), ...toScreen([i, 5])));
  for (let i = -1; i <= 5; i++) shapes.push(line(...toScreen([-4, i]), ...toScreen([7, i])));
  shapes.push(
    line(...toScreen([-4, 0]), ...toScreen([7, 0]), muted, 2),
    line(...toScreen([0, -1]), ...toScreen([0, 5]), muted, 2),
  );
  return shapes;
}

function shipShapes(s: TransformsState): SceneShape[] {
  const shapes: SceneShape[] = [
    {
      type: 'polygon',
      points: BASE_SHIP.map(toScreen),
      fill: grid,
      stroke: muted,
      strokeWidth: 2,
    },
    {
      type: 'polygon',
      points: s.points.map(toScreen),
      fill: gold,
      stroke: ink,
      strokeWidth: 2,
    },
  ];
  s.points.forEach((p, i) => {
    const [x, y] = toScreen(p);
    shapes.push(circle(x, y, 4, ink), text(x + 7, y - 7, String.fromCharCode(65 + i)));
  });
  return shapes;
}

function sceneShapes(s: TransformsState): SceneShape[] {
  return [
    ...gridShapes(),
    ...shipShapes(s),
    text(20, 24, 'Nave original · gris'),
    text(20, 43, 'Nave transformada · dorado', gold),
  ];
}

function transformsView(s: TransformsState): ModelView {
  const m = s.matrix;
  return {
    title: 'Tu nave obedece al orden',
    summary:
      s.order === 'TR' ? 'Primero trasladar, después girar.' : 'Primero girar, después trasladar.',
    metrics: [
      metric('Operaciones', s.step + '/2'),
      metric('Composición', s.order === 'TR' ? 'R·T' : 'T·R'),
      metric('Origen transformado', transform(m, [0, 0]).join(', ')),
    ],
    cells: s.points.map((p, i) =>
      cell('Vértice ' + String.fromCharCode(65 + i), '(' + p.join(', ') + ')', 'active'),
    ),
    columns: ['x', 'y', 'traslación'],
    rows: [
      [m[0], m[2], m[4]],
      [m[1], m[3], m[5]],
      [0, 0, 1],
    ].map((row) => row.map(String)),
    controls: [
      ...(s.step < 2
        ? [button('step', 'Aplicar ' + (s.order[s.step] === 'T' ? 'traslación' : 'giro 90°'))]
        : [button('inverse', 'Aplicar la inversa')]),
      button('order', 'Invertir el orden y comparar'),
    ],
    log: s.log,
    explanation:
      'Usamos vectores columna y coordenadas con y hacia arriba. La operación de la derecha actúa primero. Trasladar y girar producen posiciones distintas cuando intercambiás el orden.',
    scene: scene(
      'Grilla cartesiana con la nave original y sus vértices transformados.',
      sceneShapes(s),
    ),
  };
}

const ACTIONS: Record<TransformsAction, TransformsHandler> = {
  order: invertOrder,
  step: applyNextOperation,
  inverse: applyInverse,
};

export const transformsModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: transformsView,
  achieved: achievedGoals,
});
