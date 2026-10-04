import { defineModel, type ActionContext } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, ModelWorkshop, SceneShape, ViewControl } from '../../model/types';
import { PLAY_PALETTE } from './palette';
import { circle, line, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Player = 'Vos' | 'IA';
type MinimaxAction = 'preset' | 'analyze' | 'take' | 'ai';

interface MinimaxState extends PlayState {
  n: number;
  start: number;
  turn: Player;
  winner: '' | Player;
  analyzed: boolean;
}
type MinimaxHandler = PlayHandler<MinimaxState>;
type MinimaxLog = ActionContext<MinimaxState, ModelWorkshop>['log'];

const { grid, ink, muted, gold, green, red, blue, background } = PLAY_PALETTE;

const START_OPTIONS: readonly string[] = ['6', '7'];

// Negamax: valor de la posición para quien debe mover; sin fichas es derrota (−1).
function gameValue(n: number): number {
  if (n === 0) return -1;
  let best = -2;
  for (let k = 1; k <= 2 && k <= n; k++) best = Math.max(best, -gameValue(n - k));
  return best;
}

// Primera jugada de mayor valor: ante un empate elige retirar 1.
function gameBest(n: number): number {
  let chosen = 0;
  let best = -2;
  for (let k = 1; k <= 2 && k <= n; k++) {
    const v = -gameValue(n - k);
    if (v > best) {
      best = v;
      chosen = k;
    }
  }
  return chosen;
}

function makeGame(n: number, seen: PlayState['seen'] = {}, history: string[] = []): MinimaxState {
  return { n, start: n, turn: 'Vos', winner: '', analyzed: false, seen, log: history };
}

const createInitialState = (): MinimaxState => makeGame(7);

const isLegalTake = (s: MinimaxState, k: number): boolean =>
  !s.winner && Number.isInteger(k) && k >= 1 && k <= 2 && k <= s.n;

function gameMove(s: MinimaxState, k: number, log: MinimaxLog): void {
  if (!isLegalTake(s, k)) return;
  const who = s.turn;
  remember(s, 'minimax-choice', who === 'Vos' && gameValue(s.n) === 1 && -gameValue(s.n - k) === 1);
  s.n -= k;
  s.analyzed = false;
  log(s, who + ' retira ' + k + '; quedan ' + s.n + '.');
  if (s.n === 0) {
    s.winner = who;
    remember(s, 'minimax-win', who === 'Vos');
  } else s.turn = who === 'Vos' ? 'IA' : 'Vos';
}

const newGame: MinimaxHandler = (s, { value, log }) => {
  if (!START_OPTIONS.includes(String(value))) return;
  return log(makeGame(Number(value), s.seen, s.log), 'Nueva partida con ' + value + ' fichas.');
};

const analyzePosition: MinimaxHandler = (s, { log }) => {
  if (s.winner) return;
  s.analyzed = true;
  remember(s, 'minimax-loss', s.n > 0 && gameValue(s.n) === -1);
  log(
    s,
    gameValue(s.n) === 1
      ? 'Existe una jugada ganadora con rival perfecto.'
      : 'No hay victoria forzada: el rival puede responder a ambas jugadas.',
  );
};

const takeTokens: MinimaxHandler = (s, { value, log }) => {
  if (s.turn === 'Vos') gameMove(s, Number(value), log);
};

const aiMove: MinimaxHandler = (s, { log }) => {
  if (s.turn === 'IA') gameMove(s, gameBest(s.n), log);
};

// Una rama por cada jugada posible, hasta dos; el color sólo se revela tras analizar.
function branchShapes(s: MinimaxState): SceneShape[] {
  const shapes: SceneShape[] = [];
  for (let k = 1; k <= 2 && k <= s.n; k++) {
    const x = k === 1 ? 155 : 405;
    const v = -gameValue(s.n - k);
    shapes.push(
      line(280, 144, x, 213, muted, 2),
      circle(x, 237, 27, s.analyzed ? (v === 1 ? green : red) : grid),
      text(x - 5, 242, s.n - k, ink),
      text(x - 37, 191, 'Retirar ' + k),
    );
    if (s.analyzed)
      shapes.push(
        text(
          x - 52,
          290,
          v === 1 ? 'Gana el jugador actual' : 'El rival puede ganar',
          v === 1 ? green : red,
        ),
      );
  }
  return shapes;
}

function sceneShapes(s: MinimaxState): SceneShape[] {
  const shapes: SceneShape[] = [];
  for (let i = 0; i < s.start; i++) shapes.push(circle(95 + i * 51, 47, 16, i < s.n ? gold : grid));
  shapes.push(circle(280, 118, 26, s.winner ? green : blue), text(272, 123, s.n, background));
  if (s.winner) shapes.push(text(202, 210, 'Ganador: ' + s.winner, green));
  else shapes.push(...branchShapes(s));
  return shapes;
}

function moveControls(s: MinimaxState): ViewControl[] {
  if (s.winner) return [];
  if (s.turn !== 'Vos') return [button('ai', 'Dejar responder a la IA')];
  return [button('take', 'Retirar 1', 1), ...(s.n >= 2 ? [button('take', 'Retirar 2', 2)] : [])];
}

function minimaxControls(s: MinimaxState): ViewControl[] {
  return [
    ...moveControls(s),
    ...(!s.winner ? [button('analyze', 'Explorar el árbol')] : []),
    button('preset', 'Nueva partida: 7', 7),
    button('preset', 'Posición difícil: 6', 6),
  ];
}

const valueLabel = (s: MinimaxState): string => {
  if (!s.analyzed) return 'Sin explorar';
  return gameValue(s.n) > 0 ? '+1' : '−1';
};

function minimaxView(s: MinimaxState): ModelView {
  return {
    title: s.winner ? 'La partida terminó' : 'Tu rival también piensa',
    summary: 'Se pueden retirar 1 o 2 fichas. Quien toma la última gana.',
    metrics: [
      metric('Quedan', s.n),
      metric('Turno', s.winner ? 'Fin' : s.turn),
      metric('Valor', valueLabel(s)),
      metric('Sugerencia', s.analyzed ? gameBest(s.n) : '—'),
    ],
    cells: [
      cell('Utilidad +1', 'Victoria forzada', 'good'),
      cell('Utilidad −1', 'El rival puede evitar tu victoria', 'bad'),
    ],
    controls: minimaxControls(s),
    log: s.log,
    explanation:
      'Los valores corresponden al jugador cuyo turno se indica. Cada rama invierte la perspectiva: el valor de una acción es el negativo del valor del rival. Calculamos el árbol completo de este juego pequeño; el dibujo muestra sus primeras dos opciones. En empate, la IA elige retirar 1.',
    scene: scene(
      'Fichas restantes y primeras ramas del árbol de decisiones, coloreadas según el juego perfecto.',
      sceneShapes(s),
    ),
  };
}

const ACTIONS: Record<MinimaxAction, MinimaxHandler> = {
  preset: newGame,
  analyze: analyzePosition,
  take: takeTokens,
  ai: aiMove,
};

export const minimaxModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: minimaxView,
  achieved: achievedGoals,
});
