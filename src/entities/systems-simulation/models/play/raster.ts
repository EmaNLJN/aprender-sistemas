import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, SceneShape } from '../../model/types';
import { sameJson } from './helpers';
import { PLAY_PALETTE } from './palette';
import { circle, line, rect, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Point = [number, number];
type RasterAction = 'preset' | 'step' | 'finish';

interface RasterState extends PlayState {
  preset: number;
  index: number;
}
type RasterHandler = PlayHandler<RasterState>;

interface RasterPixel {
  x: number;
  y: number;
  error: number;
}

interface RasterPreset {
  name: string;
  a: Point;
  b: Point;
}

const { grid, gold, green, ink } = PLAY_PALETTE;

const RASTER_PRESETS: RasterPreset[] = [
  { name: 'Diagonal suave', a: [1, 1], b: [10, 6] },
  { name: 'Pendiente empinada', a: [2, 8], b: [5, 1] },
  { name: 'Camino inverso', a: [10, 2], b: [1, 7] },
  { name: 'Un solo punto', a: [6, 4], b: [6, 4] },
];

// Bresenham de Zingl: dos decisiones independientes, por lo que x e y pueden avanzar a la vez.
function rasterPoints(a: Point, b: Point): RasterPixel[] {
  let [x, y] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x);
  const dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let error = dx + dy;
  const out: RasterPixel[] = [];
  for (let guard = 0; guard < 100; guard++) {
    out.push({ x, y, error });
    if (x === x1 && y === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
  }
  return out;
}

const pixelsOf = (s: RasterState): RasterPixel[] => {
  const { a, b } = RASTER_PRESETS[s.preset];
  return rasterPoints(a, b);
};

function createInitialState(): RasterState {
  return { preset: 0, index: 1, seen: {}, log: [] };
}

// Se evalúa tras cada acción conocida, también cuando no cambió nada.
function rememberRasterGoals(s: RasterState): void {
  const p = RASTER_PRESETS[s.preset];
  const points = rasterPoints(p.a, p.b);
  if (s.index !== points.length) return;
  remember(s, 'raster-line', s.preset === 0);
  remember(s, 'raster-steep', s.preset === 1);
  remember(s, 'raster-point', points.length === 1 && sameJson(p.a, p.b));
}

const choosePreset: RasterHandler = (s, { value, log }) => {
  const n = Number(value);
  if (Number.isInteger(n) && n >= 0 && n < 4) {
    s.preset = n;
    s.index = 1;
    log(s, 'Segmento: ' + RASTER_PRESETS[n].name + '.');
  }
  rememberRasterGoals(s);
};

const stepPixel: RasterHandler = (s, { log }) => {
  const points = pixelsOf(s);
  s.index = Math.min(points.length, s.index + 1);
  const at = points[s.index - 1];
  log(s, 'Píxel (' + at.x + ',' + at.y + '), error=' + at.error + '.');
  rememberRasterGoals(s);
};

const finishSegment: RasterHandler = (s, { log }) => {
  s.index = pixelsOf(s).length;
  log(s, 'Segmento completo, incluidos sus extremos.');
  rememberRasterGoals(s);
};

const toScreen = (p: Point): Point => [127 + p[0] * 25, 36 + p[1] * 25];

function sceneShapes(p: RasterPreset, visited: RasterPixel[]): SceneShape[] {
  const at = visited[visited.length - 1];
  const shapes: SceneShape[] = [];
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 12; x++) {
      const hit = visited.some((q) => q.x === x && q.y === y);
      shapes.push(rect(115 + x * 25, 24 + y * 25, 23, 23, hit ? gold : grid));
    }
  shapes.push(line(...toScreen(p.a), ...toScreen(p.b), ink, 1.5));
  shapes.push(circle(...toScreen([at.x, at.y]), 5, green));
  shapes.push(text(20, 293, 'Blanco: segmento ideal. Dorado: píxeles elegidos.'));
  return shapes;
}

function rasterView(s: RasterState): ModelView {
  const p = RASTER_PRESETS[s.preset];
  const points = rasterPoints(p.a, p.b);
  const visited = points.slice(0, s.index);
  const at = visited[visited.length - 1];
  return {
    title: p.name,
    summary: 'El error decide cuándo subir o bajar de fila.',
    metrics: [
      metric('Píxeles', s.index + '/' + points.length),
      metric('Error actual', at.error),
      metric('Δx / Δy', p.b[0] - p.a[0] + ' / ' + (p.b[1] - p.a[1])),
    ],
    cells: visited.map((q) => cell('Píxel', '(' + q.x + ',' + q.y + ')', 'active')),
    controls: [
      ...(s.index < points.length
        ? [button('step', 'Elegir próximo píxel'), button('finish', 'Completar segmento')]
        : []),
      ...RASTER_PRESETS.map((preset, i) => button('preset', preset.name, i)),
    ],
    log: s.log,
    explanation:
      'No hay antialiasing: cada casilla está encendida o apagada. Dos decisiones independientes pueden mover x e y a la vez. La grilla usa y hacia abajo, como una imagen.',
    scene: scene(
      'Píxeles enteros comparados con el segmento geométrico ideal.',
      sceneShapes(p, visited),
    ),
  };
}

const ACTIONS: Record<RasterAction, RasterHandler> = {
  preset: choosePreset,
  step: stepPixel,
  finish: finishSegment,
};

export const rasterModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: rasterView,
  achieved: achievedGoals,
});
