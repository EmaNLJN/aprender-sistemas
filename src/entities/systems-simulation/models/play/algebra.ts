import { defineModel, type ActionContext } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, ModelWorkshop, SceneShape } from '../../model/types';
import { PLAY_PALETTE } from './palette';
import { circle, line, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type AlgebraAction = 'x' | 'preset' | 'step' | 'finish' | 'derive';

interface AlgebraState extends PlayState {
  preset: number;
  x: number;
  index: number;
  acc: number;
  derived: boolean;
}
type AlgebraHandler = PlayHandler<AlgebraState>;
type AlgebraLog = ActionContext<AlgebraState, ModelWorkshop>['log'];

interface Polynomial {
  name: string;
  // Coeficientes en orden creciente de potencias.
  coef: number[];
}

const { ink, gold, green, blue, muted } = PLAY_PALETTE;

const POLYNOMIALS: Polynomial[] = [
  { name: 'x²−3', coef: [-3, 0, 1] },
  { name: 'x³−2x', coef: [0, -2, 0, 1] },
];

const evaluate = (coef: number[], x: number): number =>
  coef.reduceRight((acc, c) => acc * x + c, 0);

const derivative = (coef: number[]): number[] => coef.slice(1).map((c, i) => c * (i + 1));

function createInitialState(): AlgebraState {
  return { preset: 0, x: 1, index: 0, acc: 0, derived: false, seen: {}, log: [] };
}

function hornerStep(s: AlgebraState, log: AlgebraLog): void {
  const p = POLYNOMIALS[s.preset].coef;
  if (s.index >= p.length) return;
  const c = p[p.length - 1 - s.index];
  const before = s.acc;
  s.acc = s.acc * s.x + c;
  s.index++;
  log(s, before + ' × ' + s.x + ' + ' + c + ' = ' + s.acc);
  remember(s, 'algebra-horner', s.index === p.length && s.acc === evaluate(p, s.x));
}

// Se evalúa tras cada acción conocida: derivar y luego mover x puede llegar a P′(x)=0.
function rememberStationary(s: AlgebraState): void {
  const coef = POLYNOMIALS[s.preset].coef;
  remember(s, 'algebra-stationary', s.derived && evaluate(derivative(coef), s.x) === 0);
}

const moveX: AlgebraHandler = (s, { value, log }) => {
  if (Number.isFinite(Number(value))) {
    s.x = Math.max(-2, Math.min(2, s.x + Number(value)));
    s.index = 0;
    s.acc = 0;
    log(s, 'Nuevo punto de evaluación x=' + s.x + '.');
  }
  rememberStationary(s);
};

const switchPolynomial: AlgebraHandler = (s, { log }) => {
  s.preset = 1 - s.preset;
  s.index = 0;
  s.acc = 0;
  s.derived = false;
  log(s, 'Polinomio: ' + POLYNOMIALS[s.preset].name + '.');
  rememberStationary(s);
};

const hornerOne: AlgebraHandler = (s, { log }) => {
  hornerStep(s, log);
  rememberStationary(s);
};

// Horner termina en tantos pasos como coeficientes; el polinomio más largo tiene 4.
const hornerAll: AlgebraHandler = (s, { log }) => {
  for (let i = 0; i < 4; i++) hornerStep(s, log);
  rememberStationary(s);
};

const deriveCoefficients: AlgebraHandler = (s, { log }) => {
  s.derived = true;
  const coef = POLYNOMIALS[s.preset].coef;
  const d = derivative(coef);
  remember(s, 'algebra-derivative', d.length === coef.length - 1);
  log(s, 'Derivada por coeficientes: [' + d.join(',') + '].');
  rememberStationary(s);
};

const toScreen = (x: number, y: number): [number, number] => [280 + x * 100, 160 - y * 10];

function axesShapes(): SceneShape[] {
  const shapes: SceneShape[] = [];
  for (let x = -2; x <= 2; x++) shapes.push(line(...toScreen(x, -12), ...toScreen(x, 12)));
  for (let y = -10; y <= 10; y += 5) shapes.push(line(...toScreen(-2, y), ...toScreen(2, y)));
  shapes.push(
    line(...toScreen(-2, 0), ...toScreen(2, 0), muted, 2),
    line(...toScreen(0, -12), ...toScreen(0, 12), muted, 2),
  );
  return shapes;
}

// 80 segmentos entre x=-2 y x=2; la derivada se dibuja a continuación de cada tramo de P.
function curveShapes(p: Polynomial, d: number[], derived: boolean): SceneShape[] {
  const shapes: SceneShape[] = [];
  for (let i = 0; i < 80; i++) {
    const x = -2 + i * 0.05;
    const nx = x + 0.05;
    shapes.push(
      line(...toScreen(x, evaluate(p.coef, x)), ...toScreen(nx, evaluate(p.coef, nx)), gold, 2),
    );
    if (derived)
      shapes.push(line(...toScreen(x, evaluate(d, x)), ...toScreen(nx, evaluate(d, nx)), green, 2));
  }
  return shapes;
}

function tangentShape(s: AlgebraState, value: number, slope: number): SceneShape {
  const left = Math.max(-2, s.x - 0.45);
  const right = Math.min(2, s.x + 0.45);
  return line(
    ...toScreen(left, value + slope * (left - s.x)),
    ...toScreen(right, value + slope * (right - s.x)),
    blue,
    3,
  );
}

function sceneShapes(s: AlgebraState, p: Polynomial, d: number[]): SceneShape[] {
  const value = evaluate(p.coef, s.x);
  const slope = evaluate(d, s.x);
  return [
    ...axesShapes(),
    ...curveShapes(p, d, s.derived),
    ...(s.derived ? [tangentShape(s, value, slope)] : []),
    circle(...toScreen(s.x, value), 5, ink),
    text(20, 22, 'Dorado: P(x) · verde: P′(x) · celeste: tangente'),
  ];
}

function algebraView(s: AlgebraState): ModelView {
  const p = POLYNOMIALS[s.preset];
  const d = derivative(p.coef);
  const value = evaluate(p.coef, s.x);
  const slope = evaluate(d, s.x);
  return {
    title: p.name,
    summary: 'La curva y su representación simbólica cuentan la misma historia.',
    metrics: [
      metric('x', s.x),
      metric('P(x)', value),
      metric('P′(x)', s.derived ? slope : '—'),
      metric('Horner', s.index + '/' + p.coef.length),
    ],
    cells: p.coef.map((c, i) => cell('x^' + i, String(c), 'active')),
    columns: ['Representación', 'Coeficientes'],
    rows: [
      ['P', p.coef.join(', ')],
      ['P′', s.derived ? d.join(', ') : 'Derivá para construirla'],
      ['Acumulador', String(s.acc)],
    ],
    controls: [
      button('step', 'Un paso de Horner'),
      button('finish', 'Completar Horner'),
      button('derive', 'Construir la derivada'),
      button('x', 'x −1', -1),
      button('x', 'x +1', 1),
      button('preset', 'Cambiar de polinomio'),
    ],
    log: s.log,
    explanation:
      'Horner evalúa con multiplicaciones y sumas; derivar transforma la estructura de coeficientes. La pendiente de la tangente es P′(x), no P(x). El dibujo muestra x entre −2 y 2.',
    scene: scene(
      'Gráfica del polinomio, su derivada y la tangente en el punto seleccionado.',
      sceneShapes(s, p, d),
    ),
  };
}

const ACTIONS: Record<AlgebraAction, AlgebraHandler> = {
  x: moveX,
  preset: switchPolynomial,
  step: hornerOne,
  finish: hornerAll,
  derive: deriveCoefficients,
};

export const algebraModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: algebraView,
  achieved: achievedGoals,
});
