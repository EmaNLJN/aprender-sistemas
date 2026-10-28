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

export function sanitizeScene(scene: UntrustedScene): SafeScene {
  void scene;
  throw new Error('not implemented');
}
