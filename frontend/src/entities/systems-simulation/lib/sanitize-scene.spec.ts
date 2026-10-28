import { describe, expect, it } from 'vitest';
import { sanitizeScene } from './sanitize-scene';

const DEFAULT_PAINT = { fill: 'none', stroke: 'none', strokeWidth: 1 };

describe('sanitizeScene', () => {
  it('uses the fallback for NaN, Infinity and undefined numbers', () => {
    const scene = sanitizeScene({
      width: Number.NaN,
      height: Number.POSITIVE_INFINITY,
      shapes: [
        { type: 'rect', x: undefined, y: Number.NaN, width: Number.POSITIVE_INFINITY, height: 5 },
      ],
    });

    expect(scene.viewBox).toBe('0 0 400 260');
    expect(scene.shapes).toEqual([
      { type: 'rect', x: 0, y: 0, width: 0, height: 5, ...DEFAULT_PAINT },
    ]);
  });

  it('turns null into zero, as Number does', () => {
    const scene = sanitizeScene({
      width: null,
      shapes: [{ type: 'circle', x: null, y: 4, r: null }],
    });

    expect(scene.viewBox).toBe('0 0 1 260');
    expect(scene.shapes).toEqual([{ type: 'circle', cx: 0, cy: 4, r: 0, ...DEFAULT_PAINT }]);
  });

  it('never lets sizes, radii or stroke widths go below zero', () => {
    const scene = sanitizeScene({
      shapes: [
        { type: 'rect', x: -5, y: -6, width: -10, height: -1, strokeWidth: -2 },
        { type: 'circle', x: 1, y: 2, r: -3 },
      ],
    });

    expect(scene.shapes).toEqual([
      {
        type: 'rect',
        x: -5,
        y: -6,
        width: 0,
        height: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
      },
      { type: 'circle', cx: 1, cy: 2, r: 0, ...DEFAULT_PAINT },
    ]);
  });

  it('keeps the viewBox at one or more when it is zero', () => {
    expect(sanitizeScene({ width: 0, height: 0 }).viewBox).toBe('0 0 1 1');
  });

  it('lets through only hex colors, none, currentColor and transparent, in any case', () => {
    const scene = sanitizeScene({
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: '#ABCDEF', stroke: 'CurrentColor' },
        { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'TRANSPARENT', stroke: '#fff' },
      ],
    });

    expect(
      scene.shapes.map((shape) => [shape.fill, 'stroke' in shape ? shape.stroke : '']),
    ).toEqual([
      ['#ABCDEF', 'CurrentColor'],
      ['TRANSPARENT', '#fff'],
    ]);
  });

  it('replaces red, url(…) and an injected declaration with the fallback colors', () => {
    const scene = sanitizeScene({
      background: '#fff;position:fixed',
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'red', stroke: 'url(#evil)' },
        { type: 'text', x: 0, y: 0, text: 'a', fill: 'url(https://example.org/x)' },
      ],
    });

    expect(scene.background).toBe('#eeeae1');
    expect(scene.shapes).toEqual([
      { type: 'rect', x: 0, y: 0, width: 1, height: 1, ...DEFAULT_PAINT },
      { type: 'text', x: 0, y: 0, fill: '#252c27', fontSize: 12, text: 'a' },
    ]);
  });

  it('keeps a text with < and " as plain text', () => {
    const [shape] = sanitizeScene({
      shapes: [{ type: 'text', x: 1, y: 2, text: '<b>"x"</b>' }],
    }).shapes;

    expect(shape).toEqual({
      type: 'text',
      x: 1,
      y: 2,
      fill: '#252c27',
      fontSize: 12,
      text: '<b>"x"</b>',
    });
  });

  it('draws only the first 2 500 shapes', () => {
    const shapes = Array.from({ length: 2501 }, (_, index) => ({
      type: 'line',
      x1: index,
      y1: 0,
      x2: 0,
      y2: 0,
    }));

    const scene = sanitizeScene({ shapes });

    expect(scene.shapes).toHaveLength(2500);
    expect(scene.shapes.at(-1)).toEqual({
      type: 'line',
      x1: 2499,
      y1: 0,
      x2: 0,
      y2: 0,
      ...DEFAULT_PAINT,
    });
  });

  it('cuts at 2 500 before dropping the shapes of an unknown type', () => {
    const shapes = [
      ...Array.from({ length: 2500 }, () => ({ type: 'ellipse' })),
      { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
    ];

    expect(sanitizeScene({ shapes }).shapes).toEqual([]);
  });

  it('drops a shape of an unknown type', () => {
    const scene = sanitizeScene({
      shapes: [
        { type: 'ellipse', x: 1 },
        { type: 'circle', x: 1, y: 1, r: 1 },
      ],
    });

    expect(scene.shapes).toEqual([{ type: 'circle', cx: 1, cy: 1, r: 1, ...DEFAULT_PAINT }]);
  });

  it('fills the text defaults and keeps a negative font size, as the template did', () => {
    const scene = sanitizeScene({
      shapes: [{ type: 'text' }, { type: 'text', fontSize: -4, text: 7 }],
    });

    expect(scene.shapes).toEqual([
      { type: 'text', x: 0, y: 0, fill: '#252c27', fontSize: 12, text: '' },
      { type: 'text', x: 0, y: 0, fill: '#252c27', fontSize: -4, text: '7' },
    ]);
  });

  it('writes the polygon points as x,y pairs and an undefined alt as an empty label', () => {
    const scene = sanitizeScene({
      shapes: [
        {
          type: 'polygon',
          points: [
            [1, 2],
            [Number.NaN, '3'],
          ],
        },
      ],
    });

    expect(scene.alt).toBe('');
    expect(scene.shapes).toEqual([{ type: 'polygon', points: '1,2 0,3', ...DEFAULT_PAINT }]);
  });
});
