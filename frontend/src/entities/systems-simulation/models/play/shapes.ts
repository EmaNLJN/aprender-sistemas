import type {
  CircleShape,
  LineShape,
  RectShape,
  Scene,
  SceneShape,
  TextShape,
} from '../../model/types';
import { PLAY_PALETTE } from './palette';

const { background, grid, ink, gold } = PLAY_PALETTE;

export const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string = grid,
  strokeWidth = 1,
): LineShape => ({ type: 'line', x1, y1, x2, y2, stroke, strokeWidth });

export const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string = grid,
  stroke: string = background,
): RectShape => ({ type: 'rect', x, y, width, height, fill, stroke, strokeWidth: 1 });

export const circle = (x: number, y: number, r: number, fill: string = gold): CircleShape => ({
  type: 'circle',
  x,
  y,
  r,
  fill,
  stroke: background,
  strokeWidth: 1,
});

export const text = (
  x: number,
  y: number,
  value: string | number,
  fill: string = ink,
): TextShape => ({
  type: 'text',
  x,
  y,
  text: String(value),
  fill,
});

// All play scenes measure the same; the order of the shapes is their contract.
export const scene = (alt: string, shapes: SceneShape[]): Scene => ({
  width: 560,
  height: 310,
  alt,
  background,
  shapes,
});
