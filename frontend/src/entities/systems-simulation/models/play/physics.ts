import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, SceneShape } from '../../model/types';
import { PLAY_PALETTE } from './palette';
import { circle, line, rect, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Point = [number, number];
// [x, y, width, height]
type Box = [number, number, number, number];
type PhysicsPreset = 'brick' | 'wall' | 'touch';
type PhysicsAction = 'preset' | 'step';

interface PhysicsState extends PlayState {
  preset: PhysicsPreset;
  x: number;
  y: number;
  vx: number;
  vy: number;
  step: number;
  last: string;
  trail: Point[];
}
type PhysicsHandler = PlayHandler<PhysicsState>;

// Candidate position and velocity of the step, before resolving collisions.
interface Motion {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const { ink, gold, red, muted, arena } = PLAY_PALETTE;

const BRICK: Box = [10, 4, 2, 3];
const PRESET_NAMES: readonly string[] = ['brick', 'wall', 'touch'];
const PRESET_CONFIGS: Record<PhysicsPreset, [number, number, number, number]> = {
  brick: [4, 5, 1, 0.25],
  wall: [18, 1, 1.25, 0],
  touch: [9, 5, 0, 0],
};

const isPhysicsPreset = (value: string | undefined): value is PhysicsPreset =>
  value !== undefined && PRESET_NAMES.includes(value);

// Region shared by two boxes, or null if they only touch or one has no area.
function intersection(a: Box, b: Box): Box | null {
  if (a[2] <= 0 || a[3] <= 0 || b[2] <= 0 || b[3] <= 0) return null;
  const x = Math.max(a[0], b[0]);
  const y = Math.max(a[1], b[1]);
  const right = Math.min(a[0] + a[2], b[0] + b[2]);
  const bottom = Math.min(a[1] + a[3], b[1] + b[3]);
  return right > x && bottom > y ? [x, y, right - x, bottom - y] : null;
}

function physicsPreset(name: PhysicsPreset, seen: PlayState['seen'] = {}, history: string[] = []) {
  const [x, y, vx, vy] = PRESET_CONFIGS[name];
  const state: PhysicsState = {
    preset: name,
    x,
    y,
    vx,
    vy,
    step: 0,
    last: 'Listo',
    trail: [],
    seen,
    log: history,
  };
  return state;
}

const createInitialState = (): PhysicsState => physicsPreset('brick');

const choosePreset: PhysicsHandler = (s, { value, log }) => {
  if (!isPhysicsPreset(value)) return;
  return log(physicsPreset(value, s.seen, s.log), 'Nueva escena: ' + value + '.');
};

// Walls reflect the position that went past the edge: x in [0, 19] and y in [0, 9].
function reflectWalls(s: PhysicsState, motion: Motion): void {
  if (motion.x < 0 || motion.x > 19) {
    motion.x = motion.x < 0 ? -motion.x : 38 - motion.x;
    motion.vx = -motion.vx;
    s.last = 'Pared';
    remember(s, 'physics-wall');
  }
  if (motion.y < 0 || motion.y > 9) {
    motion.y = motion.y < 0 ? -motion.y : 18 - motion.y;
    motion.vy = -motion.vy;
    s.last = 'Pared';
    remember(s, 'physics-wall');
  }
}

// Decides from the previous position (`s.x`) whether the square entered from the side or from above/below.
function resolveBrick(s: PhysicsState, motion: Motion): void {
  if (s.x + 1 <= BRICK[0] || s.x >= BRICK[0] + BRICK[2]) {
    motion.x = motion.vx > 0 ? BRICK[0] - 1 : BRICK[0] + BRICK[2];
    motion.vx = -motion.vx;
  } else {
    motion.y = motion.vy > 0 ? BRICK[1] - 1 : BRICK[1] + BRICK[3];
    motion.vy = -motion.vy;
  }
  s.last = 'Caja';
  remember(s, 'physics-brick');
}

const advance: PhysicsHandler = (s, { log }) => {
  const motion: Motion = { x: s.x + s.vx, y: s.y + s.vy, vx: s.vx, vy: s.vy };
  s.last = 'Sin choque';
  reflectWalls(s, motion);
  const overlap = intersection([motion.x, motion.y, 1, 1], BRICK);
  if (overlap) resolveBrick(s, motion);
  remember(
    s,
    'physics-touch',
    s.preset === 'touch' &&
      !overlap &&
      motion.x === 9 &&
      motion.y === 5 &&
      motion.vx === 0 &&
      motion.vy === 0,
  );
  s.trail = [...s.trail, [s.x + 0.5, s.y + 0.5] as Point].slice(-18);
  s.x = motion.x;
  s.y = motion.y;
  s.vx = motion.vx;
  s.vy = motion.vy;
  s.step++;
  log(s, 'Paso ' + s.step + ': ' + s.last + '; v=(' + motion.vx + ',' + motion.vy + ').');
};

const toScreen = ([x, y]: Point): Point => [50 + x * 23, 42 + y * 23];

function sceneShapes(s: PhysicsState): SceneShape[] {
  const shapes: SceneShape[] = [rect(50, 42, 460, 230, arena, muted)];
  const [brickX, brickY] = toScreen([BRICK[0], BRICK[1]]);
  shapes.push(rect(brickX, brickY, BRICK[2] * 23, BRICK[3] * 23, red));
  s.trail.forEach((p) => shapes.push(circle(...toScreen(p), 2, muted)));
  const [x, y] = toScreen([s.x, s.y]);
  shapes.push(
    rect(x, y, 23, 23, gold),
    line(x + 11.5, y + 11.5, x + 11.5 + s.vx * 28, y + 11.5 + s.vy * 28, ink, 2),
  );
  shapes.push(text(20, 25, 'Un botón = un intervalo fijo. La flecha muestra velocidad.'));
  return shapes;
}

function physicsView(s: PhysicsState): ModelView {
  return {
    title: 'Mover, detectar, responder',
    summary: 'El cuadrado conserva su velocidad en magnitud al reflejar un componente.',
    metrics: [
      metric('Posición', s.x.toFixed(2) + ', ' + s.y.toFixed(2)),
      metric('Velocidad', s.vx + ', ' + s.vy),
      metric('|v|²', (s.vx * s.vx + s.vy * s.vy).toFixed(4)),
      metric('Último paso', s.last),
    ],
    cells: [cell('Caja estática', '[10,4,2,3]', 'bad'), cell('Objeto móvil', '1×1', 'active')],
    controls: [
      button('step', 'Avanzar un paso fijo'),
      button('preset', 'Apuntar a la caja', 'brick'),
      button('preset', 'Apuntar a la pared', 'wall'),
      button('preset', 'Probar contacto sin área', 'touch'),
    ],
    log: s.log,
    explanation:
      'Este es un modelo discreto con velocidades pequeñas y sin gravedad. No es un motor físico general: detectar solo al final de un paso puede perder colisiones de objetos muy rápidos.',
    scene: scene(
      'Cancha rectangular, obstáculo y cuadrado móvil con su trayectoria y vector de velocidad.',
      sceneShapes(s),
    ),
  };
}

const ACTIONS: Record<PhysicsAction, PhysicsHandler> = { preset: choosePreset, step: advance };

export const physicsModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: physicsView,
  achieved: achievedGoals,
});
