import { defineModel, type ActionContext } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, ModelWorkshop, SceneShape } from '../../model/types';
import { cellKey, sameJson } from './helpers';
import { PLAY_PALETTE } from './palette';
import { rect, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Board = boolean[][];
type Cell = [number, number];
type LifeAction = 'pattern' | 'step' | 'four';

interface LifeState extends PlayState {
  preset: string;
  grid: Board;
  generation: number;
  born: string[];
  died: string[];
}
type LifeHandler = PlayHandler<LifeState>;
type LifeLog = ActionContext<LifeState, ModelWorkshop>['log'];

const { background, grid: gridColor, gold, green, red } = PLAY_PALETTE;

const ROWS = 8;
const COLUMNS = 10;

const lifePatterns: Record<string, Cell[]> = {
  blinker: [
    [3, 3],
    [3, 4],
    [3, 5],
  ],
  block: [
    [3, 3],
    [3, 4],
    [4, 3],
    [4, 4],
  ],
  glider: [
    [2, 3],
    [3, 4],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
};

const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<boolean>(COLUMNS).fill(false));

function lifeBoard(pattern: string): Board {
  const g = emptyBoard();
  lifePatterns[pattern].forEach(([r, c]) => (g[r][c] = true));
  return g;
}

function lifeNext(g: Board): Board {
  return g.map((row, r) =>
    row.map((live, c) => {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && g[r + dr]?.[c + dc]) count++;
      return count === 3 || (live && count === 2);
    }),
  );
}

function createInitialState(): LifeState {
  return {
    preset: 'blinker',
    grid: lifeBoard('blinker'),
    generation: 0,
    born: [],
    died: [],
    seen: {},
    log: [],
  };
}

function changedCells(previous: Board, next: Board): { born: string[]; died: string[] } {
  const born: string[] = [];
  const died: string[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLUMNS; c++) {
      if (!previous[r][c] && next[r][c]) born.push(cellKey(r, c));
      if (previous[r][c] && !next[r][c]) died.push(cellKey(r, c));
    }
  return { born, died };
}

function glidedBoard(): Board {
  const expected = emptyBoard();
  lifePatterns.glider.forEach(([r, c]) => (expected[r + 1][c + 1] = true));
  return expected;
}

function rememberLifeGoals(s: LifeState, previous: Board, next: Board): void {
  remember(
    s,
    'life-oscillator',
    s.preset === 'blinker' && s.generation >= 2 && sameJson(next, lifeBoard('blinker')),
  );
  remember(s, 'life-still', s.preset === 'block' && sameJson(previous, next));
  if (s.preset === 'glider' && s.generation === 4) {
    remember(s, 'life-travel', sameJson(glidedBoard(), next));
  }
}

function lifeStep(s: LifeState, log: LifeLog): void {
  const previous = s.grid;
  const next = lifeNext(previous);
  const { born, died } = changedCells(previous, next);
  s.born = born;
  s.died = died;
  s.grid = next;
  s.generation++;
  rememberLifeGoals(s, previous, next);
  log(
    s,
    'Generación ' + s.generation + ': ' + s.born.length + ' nacen, ' + s.died.length + ' mueren.',
  );
}

const choosePattern: LifeHandler = (s, { value, log }) => {
  const pattern = String(value);
  if (!lifePatterns[pattern]) return;
  s.preset = pattern;
  s.grid = lifeBoard(pattern);
  s.generation = 0;
  s.born = [];
  s.died = [];
  log(s, 'Semilla: ' + value + '.');
};

const stepOne: LifeHandler = (s, { log }) => lifeStep(s, log);

const stepFour: LifeHandler = (s, { log }) => {
  for (let i = 0; i < 4; i++) lifeStep(s, log);
};

function sceneShapes(s: LifeState): SceneShape[] {
  const shapes: SceneShape[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLUMNS; c++) {
      const k = cellKey(r, c);
      const fill = s.grid[r][c] ? (s.born.includes(k) ? gold : green) : gridColor;
      shapes.push(
        rect(139 + c * 28, 26 + r * 28, 26, 26, fill, s.died.includes(k) ? red : background),
      );
    }
  shapes.push(text(20, 285, 'Verde: viva · dorado: recién nacida · borde rojo: murió.'));
  return shapes;
}

function lifeView(s: LifeState): ModelView {
  return {
    title: 'Un universo sin jugador',
    summary: 'Las reglas son locales; los patrones que aparecen pueden viajar u oscilar.',
    metrics: [
      metric('Generación', s.generation),
      metric('Población', s.grid.flat().filter(Boolean).length),
      metric('Nacimientos', s.born.length),
      metric('Muertes', s.died.length),
    ],
    cells: [
      cell('Nacimiento', '3 vecinas', 'good'),
      cell('Supervivencia', '2 o 3 vecinas', 'active'),
      cell('Borde', 'Muerto, sin wrap', 'muted'),
    ],
    controls: [
      button('step', 'Una generación'),
      button('four', 'Cuatro generaciones'),
      button('pattern', 'Oscilador', 'blinker'),
      button('pattern', 'Bloque estable', 'block'),
      button('pattern', 'Glider viajero', 'glider'),
    ],
    log: s.log,
    explanation:
      'Todas las celdas leen la misma generación y escriben en otra. El tablero es finito: si un patrón alcanza un borde, ya no se comporta como en una grilla infinita.',
    scene: scene(
      'Jardín de Conway con celdas vivas, nacimientos y muertes por generación.',
      sceneShapes(s),
    ),
  };
}

const ACTIONS: Record<LifeAction, LifeHandler> = {
  pattern: choosePattern,
  step: stepOne,
  four: stepFour,
};

export const lifeModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: lifeView,
  achieved: achievedGoals,
});
