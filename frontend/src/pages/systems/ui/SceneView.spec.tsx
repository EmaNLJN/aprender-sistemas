import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Scene } from '../../../entities/systems-simulation';
import SceneView from './SceneView';

const scene = (overrides: Partial<Scene>): Scene => ({
  width: 100,
  height: 50,
  background: '#14271f',
  alt: 'Una escena de prueba',
  shapes: [],
  ...overrides,
});

describe('SceneView', () => {
  it('draws a labelled image with its viewBox and its background', () => {
    render(<SceneView scene={scene({})} />);

    const svg = screen.getByRole('img', { name: 'Una escena de prueba' });
    expect(svg).toHaveAttribute('viewBox', '0 0 100 50');
    expect(svg).toHaveClass('sys-scene');
    expect(svg).toHaveStyle('background-color: #14271f');
  });

  it('uses the fallback background for an injected declaration and adds no other style', () => {
    render(<SceneView scene={scene({ background: '#fff;position:fixed' })} />);

    const svg = screen.getByRole('img');
    expect(svg).toHaveStyle('background-color: #eeeae1');
    expect(svg.style.position).toBe('');
  });

  it('writes a hostile text as text', () => {
    const { container } = render(
      <SceneView scene={scene({ shapes: [{ type: 'text', x: 1, y: 2, text: '<b>"x"</b>' }] })} />,
    );

    expect(screen.getByText('<b>"x"</b>').tagName).toBe('text');
    expect(container.querySelector('b')).toBeNull();
  });

  it('draws each shape with its attributes', () => {
    const { container } = render(
      <SceneView
        scene={scene({
          shapes: [
            {
              type: 'rect',
              x: 1,
              y: 2,
              width: 3,
              height: 4,
              fill: '#111',
              stroke: '#222',
              strokeWidth: 2,
            },
            { type: 'circle', x: 5, y: 6, r: 7 },
            { type: 'line', x1: 0, y1: 1, x2: 2, y2: 3 },
            {
              type: 'polygon',
              points: [
                [0, 0],
                [1, 1],
              ],
            },
            { type: 'text', x: 8, y: 9, text: 'hola', fontSize: 10 },
          ],
        })}
      />,
    );

    const attributes = (selector: string, names: string[]) =>
      names.map((name) => container.querySelector(selector)?.getAttribute(name));
    expect(
      attributes('rect', ['x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width']),
    ).toEqual(['1', '2', '3', '4', '#111', '#222', '2']);
    expect(attributes('circle', ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width'])).toEqual([
      '5',
      '6',
      '7',
      'none',
      'none',
      '1',
    ]);
    expect(attributes('line', ['x1', 'y1', 'x2', 'y2'])).toEqual(['0', '1', '2', '3']);
    expect(attributes('polygon', ['points'])).toEqual(['0,0 1,1']);
    expect(attributes('text', ['x', 'y', 'fill', 'font-size', 'font-family'])).toEqual([
      '8',
      '9',
      '#252c27',
      '10',
      'monospace',
    ]);
  });
});
