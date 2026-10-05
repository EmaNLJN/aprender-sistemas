import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, SceneShape } from '../../model/types';
import { PLAY_PALETTE } from './palette';
import { circle, line, scene, text } from './shapes';
import { PLAY_LOG_LIMIT, achievedGoals, remember, type PlayHandler, type PlayState } from './state';

type Vector = [number, number];
type RaycastAction = 'aim' | 'cast';

interface RaycastState extends PlayState {
  angle: number;
  cast: boolean;
}
type RaycastHandler = PlayHandler<RaycastState>;

interface Planet {
  x: number;
  y: number;
  r: number;
  name: string;
  color: string;
}

interface RayHit {
  index: number;
  t: number;
}

const { grid, ink, gold, green, blue, red, background } = PLAY_PALETTE;

const RAY_ORIGIN: Vector = [50, 155];
const PLANETS: Planet[] = [
  { x: 250, y: 155, r: 40, name: 'Cerca', color: gold },
  { x: 414, y: 155, r: 47, name: 'Lejos', color: blue },
  { x: 335, y: 75, r: 30, name: 'Luna', color: green },
];

function hitCircle(o: Vector, d: Vector, c: Vector, r: number): number | null {
  const x = o[0] - c[0];
  const y = o[1] - c[1];
  const a = d[0] * d[0] + d[1] * d[1];
  if (a === 0 || r <= 0) return null;
  const b = 2 * (x * d[0] + y * d[1]);
  const disc = b * b - 4 * a * (x * x + y * y - r * r);
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const first = (-b - root) / (2 * a);
  const last = (-b + root) / (2 * a);
  return first >= 0 ? first : last >= 0 ? last : null;
}

const directionOf = (angle: number): Vector => {
  const rad = (angle * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
};

function rayHits(angle: number): RayHit[] {
  const d = directionOf(angle);
  return PLANETS.map((p, index) => ({ index, t: hitCircle(RAY_ORIGIN, d, [p.x, p.y], p.r) }))
    .filter((h): h is RayHit => h.t !== null)
    .sort((a, b) => a.t - b.t);
}

function createInitialState(): RaycastState {
  return { angle: 0, cast: false, seen: {}, log: [] };
}

const aim: RaycastHandler = (s, { value }) => {
  if (!Number.isFinite(Number(value))) return;
  s.angle = Math.max(-45, Math.min(45, s.angle + Number(value)));
  s.cast = false;
};

const castRay: RaycastHandler = (s, { log }) => {
  s.cast = true;
  const hits = rayHits(s.angle);
  remember(s, 'raycast-hit', hits.length > 0);
  remember(s, 'raycast-miss', hits.length === 0);
  remember(s, 'raycast-nearest', hits.length > 1 && hits[0].t < hits[1].t);
  log(
    s,
    hits.length
      ? 'Primero alcanza ' + PLANETS[hits[0].index].name + ' en t=' + hits[0].t.toFixed(2) + '.'
      : 'Ningún círculo corta este rayo hacia delante.',
  );
};

function rayLimitFor(dy: number): number {
  return Math.min(490, dy < 0 ? 145 / -dy : dy > 0 ? 125 / dy : Infinity);
}

function captionFor(s: RaycastState, hit: RayHit | undefined): string {
  if (!s.cast) return 'Apuntá y emití un rayo.';
  return hit
    ? 'La superficie cercana oculta lo que queda detrás.'
    : 'Este disparo atraviesa espacio vacío.';
}

function sceneShapes(s: RaycastState, hits: RayHit[]): SceneShape[] {
  const d = directionOf(s.angle);
  const hit: RayHit | undefined = hits[0];
  const rayLimit = rayLimitFor(d[1]);
  const distance = hit ? hit.t : rayLimit;
  const end: Vector = [50 + d[0] * distance, 155 + d[1] * distance];
  const shapes: SceneShape[] = [
    line(50, 155, 50 + d[0] * rayLimit, 155 + d[1] * rayLimit, grid, 2),
  ];
  PLANETS.forEach((p) =>
    shapes.push(circle(p.x, p.y, p.r, p.color), text(p.x - p.r + 8, p.y + 5, p.name, background)),
  );
  shapes.push({
    type: 'polygon',
    points: [
      [24, 143],
      [24, 167],
      [50, 155],
    ],
    fill: ink,
    stroke: ink,
  });
  if (s.cast) {
    shapes.push(line(50, 155, ...end, hit ? gold : red, 3));
    if (hit) shapes.push(circle(...end, 6, ink));
  }
  shapes.push(text(20, 292, captionFor(s, hit)));
  return shapes;
}

function raycastView(s: RaycastState): ModelView {
  const hits = s.cast ? rayHits(s.angle) : [];
  const hit: RayHit | undefined = hits[0];
  return {
    title: '¿Qué planeta toca primero?',
    summary: 'No alcanza con encontrar una raíz: debe estar delante y ser la menor válida.',
    metrics: [
      metric('Ángulo', s.angle + '°'),
      metric('Intersecciones', s.cast ? hits.length : '—'),
      metric('Primer t', hit ? hit.t.toFixed(2) : '—'),
    ],
    cells: PLANETS.map((p, i) =>
      cell(
        p.name,
        s.cast ? (hits.some((h) => h.index === i) ? 'En el rayo' : 'Fuera') : 'Sin probar',
        hit?.index === i ? 'good' : 'muted',
      ),
    ),
    columns: ['Círculo', 't de entrada'],
    rows: hits.map((h) => [PLANETS[h.index].name, h.t.toFixed(2)]),
    controls: [
      button('aim', 'Apuntar 15° arriba', -15),
      button('aim', 'Apuntar 15° abajo', 15),
      button('cast', 'Emitir rayo'),
    ],
    log: s.log,
    explanation:
      'El vector de dirección tiene longitud 1, por eso t coincide con distancia en esta escena. Los círculos simplifican las esferas de un trazador 3D; aquí no calculamos iluminación ni refracción.',
    scene: scene(
      'Linterna, tres planetas circulares y el primer punto de intersección del rayo.',
      sceneShapes(s, hits),
    ),
  };
}

const ACTIONS: Record<RaycastAction, RaycastHandler> = { aim, cast: castRay };

export const raycastModel = defineModel({
  logLimit: PLAY_LOG_LIMIT,
  initial: createInitialState,
  actions: ACTIONS,
  view: raycastView,
  achieved: achievedGoals,
});
