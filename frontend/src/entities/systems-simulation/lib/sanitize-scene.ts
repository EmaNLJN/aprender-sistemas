export interface UntrustedScene {
  width?: unknown;
  height?: unknown;
  background?: unknown;
  alt?: unknown;
  shapes?: unknown;
}

interface ShapePaint {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type SafeSceneShape =
  | ({ type: 'rect'; x: number; y: number; width: number; height: number } & ShapePaint)
  | ({ type: 'circle'; cx: number; cy: number; r: number } & ShapePaint)
  | ({ type: 'line'; x1: number; y1: number; x2: number; y2: number } & ShapePaint)
  | ({ type: 'polygon'; points: string } & ShapePaint)
  | { type: 'text'; x: number; y: number; fill: string; fontSize: number; text: string };

export interface SafeScene {
  viewBox: string;
  background: string;
  alt: string;
  shapes: SafeSceneShape[];
}

const MAX_SHAPES = 2500;
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|none|currentColor|transparent)$/i;

function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value: unknown, fallback: number): number {
  return Math.max(0, finiteOr(value, fallback));
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && SAFE_COLOR.test(value) ? value : fallback;
}

function paintOf(shape: Record<string, unknown>): ShapePaint {
  return {
    fill: safeColor(shape.fill, 'none'),
    stroke: safeColor(shape.stroke, 'none'),
    strokeWidth: nonNegative(shape.strokeWidth, 1),
  };
}

function pointsOf(points: unknown): string {
  if (!Array.isArray(points)) return '';
  return points
    .map((pair: unknown) => {
      const [x, y] = Array.isArray(pair) ? pair : [];
      return `${finiteOr(x, 0)},${finiteOr(y, 0)}`;
    })
    .join(' ');
}

function sanitizeShape(shape: unknown): SafeSceneShape | null {
  if (typeof shape !== 'object' || shape === null) return null;
  const raw = shape as Record<string, unknown>;
  switch (raw.type) {
    case 'rect':
      return {
        type: 'rect',
        x: finiteOr(raw.x, 0),
        y: finiteOr(raw.y, 0),
        width: nonNegative(raw.width, 0),
        height: nonNegative(raw.height, 0),
        ...paintOf(raw),
      };
    case 'circle':
      return {
        type: 'circle',
        cx: finiteOr(raw.x, 0),
        cy: finiteOr(raw.y, 0),
        r: nonNegative(raw.r, 0),
        ...paintOf(raw),
      };
    case 'line':
      return {
        type: 'line',
        x1: finiteOr(raw.x1, 0),
        y1: finiteOr(raw.y1, 0),
        x2: finiteOr(raw.x2, 0),
        y2: finiteOr(raw.y2, 0),
        ...paintOf(raw),
      };
    case 'polygon':
      return { type: 'polygon', points: pointsOf(raw.points), ...paintOf(raw) };
    case 'text':
      return {
        type: 'text',
        x: finiteOr(raw.x, 0),
        y: finiteOr(raw.y, 0),
        fill: safeColor(raw.fill, '#252c27'),
        fontSize: finiteOr(raw.fontSize, 12),
        text: String(raw.text ?? ''),
      };
    default:
      return null;
  }
}

export function sanitizeScene(scene: UntrustedScene): SafeScene {
  const width = Math.max(1, finiteOr(scene.width, 400));
  const height = Math.max(1, finiteOr(scene.height, 260));
  const shapes = Array.isArray(scene.shapes) ? scene.shapes.slice(0, MAX_SHAPES) : [];
  return {
    viewBox: `0 0 ${width} ${height}`,
    background: safeColor(scene.background, '#eeeae1'),
    alt: String(scene.alt ?? ''),
    shapes: shapes.map(sanitizeShape).filter((shape): shape is SafeSceneShape => shape !== null),
  };
}
