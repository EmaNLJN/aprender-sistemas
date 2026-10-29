import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ModelView } from '../../../entities/systems-simulation';
import ModelPanel from './ModelPanel';

const view = (overrides: Partial<ModelView>): ModelView => ({
  title: 'Una estantería',
  summary: 'Izquierda: menos reciente.',
  explanation: 'Probá A.',
  metrics: [{ label: 'Hits', value: '2' }],
  cells: [
    { label: 'Lugar 1', value: 'A', tone: 'active' },
    { label: 'Lugar 2', value: 'Vacío', tone: 'muted' },
  ],
  controls: [
    { action: 'read', label: 'Leer A', value: 'A' },
    { action: 'reset', label: 'Reiniciar simulación' },
  ],
  log: [],
  ...overrides,
});

describe('ModelPanel', () => {
  it('draws the title, the metrics, the cells with their tone and the controls group', () => {
    const { container } = render(<ModelPanel view={view({})} onAction={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Una estantería' })).toBeInTheDocument();
    expect(screen.getByText('Izquierda: menos reciente.')).toHaveClass('sys-model-summary');
    expect(screen.getByText('Hits').nextSibling).toHaveTextContent('2');
    expect([...container.querySelectorAll('.sys-cell')].map((cell) => cell.className)).toEqual([
      'sys-cell active',
      'sys-cell muted',
    ]);
    expect(
      screen.getByRole('group', { name: 'Acciones del modelo' }).querySelectorAll('button'),
    ).toHaveLength(2);
  });

  it('drops an unknown tone from the cell class', () => {
    const { container } = render(
      <ModelPanel
        view={view({ cells: [{ label: 'X', value: '1', tone: 'loud' as never }] })}
        onAction={vi.fn()}
      />,
    );

    expect(container.querySelector('.sys-cell')?.className.trim()).toBe('sys-cell');
  });

  it('calls back with the control the student pressed', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ModelPanel view={view({})} onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Leer A' }));

    expect(onAction).toHaveBeenCalledWith({ action: 'read', label: 'Leer A', value: 'A' });
  });

  it('shows the last 8 lines of the trace, open, and no trace without lines', () => {
    const lines = Array.from({ length: 10 }, (_, index) => `Paso ${index + 1}`);
    const { container, rerender } = render(
      <ModelPanel view={view({ log: lines })} onAction={vi.fn()} />,
    );

    expect(container.querySelector('details.sys-trace')).toHaveAttribute('open');
    expect(
      [...container.querySelectorAll('.sys-trace li')].map((item) => item.textContent),
    ).toEqual(lines.slice(2));

    rerender(<ModelPanel view={view({ log: [] })} onAction={vi.fn()} />);
    expect(container.querySelector('details.sys-trace')).toBeNull();
  });

  it('leaves the trace closed when the student closed it and the log grows (C2)', () => {
    const { container, rerender } = render(
      <ModelPanel view={view({ log: ['Uno'] })} onAction={vi.fn()} />,
    );
    const trace = container.querySelector('details') as HTMLDetailsElement;
    trace.open = false;

    rerender(<ModelPanel view={view({ log: ['Uno', 'Dos'] })} onAction={vi.fn()} />);

    expect(container.querySelector('details')).toBe(trace);
    expect(trace.open).toBe(false);
  });

  it('draws the state table as a focusable region and keeps the same node when the rows change (C2)', () => {
    const { rerender } = render(
      <ModelPanel
        view={view({ columns: ['Tarea', 'Estado'], rows: [['A', 'lista']] })}
        onAction={vi.fn()}
      />,
    );
    const region = screen.getByRole('region', { name: 'Estado del modelo' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Tarea',
      'Estado',
    ]);

    rerender(
      <ModelPanel
        view={view({ columns: ['Tarea', 'Estado'], rows: [['A', 'hecha']] })}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Estado del modelo' })).toBe(region);
  });

  it('keeps the focus on the pressed one of two controls with the same action and value', () => {
    const twins = [
      { action: 'deliver', label: 'Entregar #0', value: '0' },
      { action: 'deliver', label: 'Duplicar #0', value: '0' },
    ];
    const { rerender } = render(<ModelPanel view={view({ controls: twins })} onAction={vi.fn()} />);
    screen.getByRole('button', { name: 'Duplicar #0' }).focus();

    rerender(
      <ModelPanel
        view={view({ controls: [{ action: 'drop-one', label: 'Perder #1' }, ...twins] })}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Perder #1',
      'Entregar #0',
      'Duplicar #0',
    ]);
    expect(screen.getByRole('button', { name: 'Duplicar #0' })).toHaveFocus();
  });

  it('keeps the focus on the same control when its label and its neighbours change', () => {
    const { rerender } = render(
      <ModelPanel
        view={view({
          controls: [
            { action: 'toggle', label: 'Habilitar IRQ' },
            { action: 'reset', label: 'Reiniciar simulación' },
          ],
        })}
        onAction={vi.fn()}
      />,
    );
    screen.getByRole('button', { name: 'Habilitar IRQ' }).focus();

    rerender(
      <ModelPanel
        view={view({
          controls: [
            { action: 'step', label: 'Un paso' },
            { action: 'toggle', label: 'Enmascarar IRQ' },
            { action: 'reset', label: 'Reiniciar simulación' },
          ],
        })}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Enmascarar IRQ' })).toHaveFocus();
  });

  it('draws the rows of the state table under headers scoped to their column', () => {
    render(
      <ModelPanel
        view={view({
          columns: ['Tarea', 'Estado'],
          rows: [
            ['A', 'lista'],
            ['B', 'espera'],
          ],
        })}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col');
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'A',
      'lista',
      'B',
      'espera',
    ]);
  });

  it('presses a control with Enter and with Space', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ModelPanel view={view({})} onAction={onAction} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Leer A' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenLastCalledWith({ action: 'read', label: 'Leer A', value: 'A' });
  });
});
