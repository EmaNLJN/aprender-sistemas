import { cloneJson } from '../../../../shared/lib/clone-json';
import { defineModel, type ActionContext } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, ModelWorkshop, SceneShape } from '../../model/types';
import { cellKey } from './helpers';
import { PLAY_PALETTE } from './palette';
import { rect, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Algorithm = 'bfs' | 'astar';
type PathfindingAction = 'algorithm' | 'terrain' | 'block' | 'step' | 'finish';

interface OpenNode {
  r: number;
  c: number;
  g: number;
}

interface PathSetup extends PlayState {
  algorithm: Algorithm;
  weighted: boolean;
  blocked: boolean;
}

interface PathSearch {
  open: OpenNode[];
  best: Record<string, number>;
  parents: Record<string, string>;
  visited: string[];
  path: string[];
  done: boolean;
  cost: number | null;
}

interface PathfindingState extends PathSetup, PathSearch {}
type PathfindingHandler = PlayHandler<PathfindingState>;
type PathfindingContext = ActionContext<PathfindingState, ModelWorkshop>;

const { grid, ink, gold, green, blue, floor, swamp } = PLAY_PALETTE;

const GAME_MAP: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 4, 4, 1, 1, 0],
  [0, 1, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 1, 0, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const START_KEY = '1,1';
const GOAL_KEY = '5,7';
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

function pathMap(s: PathSetup): number[][] {
  const g = cloneJson(GAME_MAP);
  if (!s.weighted)
    g.forEach((row) =>
      row.forEach((v, c) => {
        if (v) row[c] = 1;
      }),
    );
  if (s.blocked) {
    g[4][7] = 0;
    g[5][6] = 0;
  }
  return g;
}

function freshSearch(): PathSearch {
  return {
    open: [{ r: 1, c: 1, g: 0 }],
    best: { [START_KEY]: 0 },
    parents: {},
    visited: [],
    path: [],
    done: false,
    cost: null,
  };
}

function resetSearch(s: PathSetup): PathfindingState {
  return Object.assign(s, freshSearch());
}

function createInitialState(): PathfindingState {
  return resetSearch({ algorithm: 'bfs', weighted: false, blocked: false, seen: {}, log: [] });
}

const estimate = (n: OpenNode): number => n.g + 5 - n.r + 7 - n.c;

function indexOfLowestEstimate(open: OpenNode[]): number {
  let lowest = 0;
  for (let j = 1; j < open.length; j++) if (estimate(open[j]) < estimate(open[lowest])) lowest = j;
  return lowest;
}

function popBest(s: PathfindingState): OpenNode | null {
  let node: OpenNode | null = null;
  while (s.open.length && !node) {
    const index = s.algorithm === 'astar' ? indexOfLowestEstimate(s.open) : 0;
    const candidate = s.open.splice(index, 1)[0];
    if (candidate.g === s.best[cellKey(candidate.r, candidate.c)]) node = candidate;
  }
  return node;
}

function reconstructPath(parents: Record<string, string>, goal: string): string[] {
  const path = [goal];
  let p = goal;
  while (parents[p]) {
    p = parents[p];
    path.unshift(p);
  }
  return path;
}

function improvesBest(s: PathfindingState, key: string, cost: number): boolean {
  if (s.best[key] === undefined) return true;
  return s.algorithm !== 'bfs' && cost < s.best[key];
}

function relaxNeighbors(s: PathfindingState, g: number[][], node: OpenNode, key: string): void {
  for (const [dr, dc] of DIRECTIONS) {
    const r = node.r + dr;
    const c = node.c + dc;
    if (!g[r]?.[c]) continue;
    const nk = cellKey(r, c);
    const cost = node.g + g[r][c];
    if (!improvesBest(s, nk, cost)) continue;
    s.best[nk] = cost;
    s.parents[nk] = key;
    s.open.push({ r, c, g: cost });
  }
}

function reachGoal(s: PathfindingState, node: OpenNode, key: string, { log }: PathfindingContext) {
  s.done = true;
  s.cost = node.g;
  s.path = reconstructPath(s.parents, key);
  remember(s, 'pathfinding-bfs', s.algorithm === 'bfs' && !s.weighted);
  remember(s, 'pathfinding-astar', s.algorithm === 'astar' && s.weighted && s.cost === 10);
  log(s, 'Ruta encontrada: costo ' + s.cost + ', ' + (s.path.length - 1) + ' pasos.');
}

function pathStep(s: PathfindingState, context: PathfindingContext): void {
  if (s.done) return;
  const g = pathMap(s);
  const node = popBest(s);
  if (!node) {
    s.done = true;
    remember(s, 'pathfinding-blocked');
    context.log(s, 'Frontera agotada: no existe un camino.');
    return;
  }
  const key = cellKey(node.r, node.c);
  s.visited.push(key);
  if (key === GOAL_KEY) return reachGoal(s, node, key, context);
  relaxNeighbors(s, g, node, key);
  context.log(s, 'Expande (' + node.r + ',' + node.c + '); frontera=' + s.open.length + '.');
}

const chooseAlgorithm: PathfindingHandler = (s, { value, log }) => {
  s.algorithm = value === 'astar' ? 'astar' : 'bfs';
  resetSearch(s);
  log(s, 'Búsqueda reiniciada con ' + s.algorithm.toUpperCase() + '.');
};

const toggleTerrain: PathfindingHandler = (s, { log }) => {
  s.weighted = !s.weighted;
  resetSearch(s);
  log(s, s.weighted ? 'Pantanos: entrar cuesta 4.' : 'Terreno uniforme: cada entrada cuesta 1.');
};

const toggleBlock: PathfindingHandler = (s, { log }) => {
  s.blocked = !s.blocked;
  resetSearch(s);
  log(s, s.blocked ? 'La salida quedó aislada.' : 'La salida vuelve a estar conectada.');
};

const expandAll: PathfindingHandler = (s, context) => {
  for (let i = 0; i < 150 && !s.done; i++) pathStep(s, context);
};

function tileColor(s: PathfindingState, r: number, c: number, cost: number): string {
  const key = cellKey(r, c);
  if (!cost) return grid;
  if (s.path.includes(key)) return gold;
  if (s.visited.includes(key)) return green;
  if (s.open.some((n) => n.r === r && n.c === c)) return blue;
  return cost > 1 ? swamp : floor;
}

function sceneShapes(s: PathfindingState): SceneShape[] {
  const g = pathMap(s);
  const shapes: SceneShape[] = [];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 9; c++) {
      const key = cellKey(r, c);
      const v = g[r][c];
      const x = 123 + c * 35;
      const y = 27 + r * 35;
      shapes.push(rect(x, y, 33, 33, tileColor(s, r, c, v)));
      if (v > 1) shapes.push(text(x + 12, y + 21, v));
      if (key === START_KEY) shapes.push(text(x + 9, y + 22, 'S', ink));
      if (key === GOAL_KEY) shapes.push(text(x + 9, y + 22, 'G', ink));
    }
  shapes.push(text(20, 289, 'Celeste: frontera · verde: explorado · dorado: ruta.'));
  return shapes;
}

const searchStatus = (s: PathfindingState): string => {
  if (!s.done) return 'En búsqueda';
  return s.path.length ? 'Ruta encontrada' : 'Sin ruta';
};

function pathfindingView(s: PathfindingState): ModelView {
  return {
    title: s.algorithm === 'astar' ? 'A*: costo real + estimación' : 'BFS: explorar por capas',
    summary: s.weighted
      ? 'Con pantanos, BFS minimiza pasos; A* minimiza costo.'
      : 'Con costos uniformes, BFS encuentra una ruta mínima.',
    metrics: [
      metric('Exploradas', s.visited.length),
      metric('Frontera', s.open.length),
      metric('Costo', s.cost ?? '—'),
      metric('Estado', searchStatus(s)),
    ],
    cells: s.open
      .slice(0, 8)
      .map((n) =>
        cell('(' + n.r + ',' + n.c + ')', 'g=' + n.g + ' h=' + (5 - n.r + 7 - n.c), 'active'),
      ),
    controls: [
      ...(!s.done
        ? [button('step', 'Expandir una casilla'), button('finish', 'Completar búsqueda')]
        : []),
      button('algorithm', 'Usar BFS', 'bfs'),
      button('algorithm', 'Usar A*', 'astar'),
      button('terrain', s.weighted ? 'Quitar pantanos' : 'Agregar pantanos'),
      button('block', s.blocked ? 'Reabrir salida' : 'Aislar salida'),
    ],
    log: s.log,
    explanation:
      'A* usa distancia Manhattan como cota inferior. No promete menos expansiones en todos los mapas: depende de la heurística y de los desempates. La ruta dorada conserva padres de las casillas.',
    scene: scene(
      'Mapa de juego con paredes, terreno costoso, frontera de búsqueda y camino hallado.',
      sceneShapes(s),
    ),
  };
}

const ACTIONS: Record<PathfindingAction, PathfindingHandler> = {
  algorithm: chooseAlgorithm,
  terrain: toggleTerrain,
  block: toggleBlock,
  step: pathStep,
  finish: expandAll,
};

export const pathfindingModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: pathfindingView,
  achieved: achievedGoals,
});
