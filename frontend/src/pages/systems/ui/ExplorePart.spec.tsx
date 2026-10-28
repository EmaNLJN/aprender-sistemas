import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { celebrate } from '../../../shared/lib/celebration';
import { readSimulation, resetSimulations } from '../model/systems-session';
import { initProbeEngine, passingLabState, probeModel } from '../model/systems-page.factory';
import { workshopView } from '../model/workshop-views';
import type { SystemsLanguage } from '../model/types';
import ExplorePart from './ExplorePart';

vi.mock('../../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const Subscribed = ({
  notify = vi.fn(),
  language = 'rust',
}: {
  notify?: (message: string) => void;
  language?: SystemsLanguage;
}) => {
  useStore(systemsEngine.changes, (state) => state.revision);
  return (
    <ExplorePart
      workshop={workshopView('probe', language)}
      language={language}
      model={probeModel}
      notify={notify}
      onPartChange={vi.fn()}
    />
  );
};

const traceLines = (container: HTMLElement) => container.querySelectorAll('.sys-trace li');

describe('ExplorePart', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSimulations();
    initProbeEngine();
  });

  it('an action traces, marks the objective, announces it and keeps the focus on the control', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const { container } = render(<Subscribed notify={notify} />);

    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    expect(traceLines(container)).toHaveLength(1);
    expect(container.querySelector('.sys-goal.earned')).toHaveTextContent('Tocá A');
    expect(notify).toHaveBeenCalledWith('Nueva situación comprendida: Tocá A');
    expect(screen.getByRole('button', { name: 'Tocar A' })).toHaveFocus();
  });

  it('repeating a situation grows the trace without a new objective, announcement or write (FR-019)', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const { container } = render(<Subscribed notify={notify} />);
    await user.click(screen.getByRole('button', { name: 'Tocar A' }));
    const revision = systemsEngine.changes.getState().revision;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    expect(traceLines(container)).toHaveLength(2);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalled();
    expect(systemsEngine.changes.getState().revision).toBe(revision);
    setItem.mockRestore();
  });

  it('a control without a value reaches the model as an empty string', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);

    await user.click(screen.getByRole('button', { name: 'Tocar sin valor' }));

    expect(screen.getByText('Último valor').nextSibling).toHaveTextContent('[]');
  });

  it('updates the live text in place', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    const live = screen.getByText('Último valor: ninguno');

    await user.click(screen.getByRole('button', { name: 'Tocar B' }));

    expect(live).toHaveTextContent('Último valor: [b]');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('«Reiniciar modelo ↺» empties the trace and keeps the objectives', async () => {
    const user = userEvent.setup();
    const { container } = render(<Subscribed />);
    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    await user.click(screen.getByRole('button', { name: 'Reiniciar modelo ↺' }));

    expect(traceLines(container)).toHaveLength(0);
    expect(container.querySelector('.sys-goal.earned')).toHaveTextContent('Tocá A');
  });

  it('keeps the simulation across mounts and loses it after resetSimulations', async () => {
    const user = userEvent.setup();
    const first = render(<Subscribed />);
    await user.click(screen.getByRole('button', { name: 'Tocar A' }));
    first.unmount();

    const second = render(<Subscribed />);
    expect(traceLines(second.container)).toHaveLength(1);
    second.unmount();

    resetSimulations();
    expect(readSimulation('rust:probe')).toBeUndefined();
    const third = render(<Subscribed />);
    expect(traceLines(third.container)).toHaveLength(0);
  });

  it('celebrates before announcing the third seal', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.mocked(celebrate).mockImplementation(() => calls.push('celebrate'));
    systemsEngine.observe('probe', 'rust', ['touched-b', 'touched-empty']);
    systemsEngine.answer('probe', 'rust', 1);
    systemsEngine.syncLab(passingLabState());
    render(<Subscribed notify={(message) => calls.push(message)} />);

    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    expect(calls).toEqual([
      'Nueva situación comprendida: Tocá A',
      'celebrate',
      'Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.',
    ]);
  });

  it('keeps the simulation of each language apart', async () => {
    const user = userEvent.setup();
    const rust = render(<Subscribed language="rust" />);
    await user.click(screen.getByRole('button', { name: 'Tocar B' }));
    rust.unmount();

    const go = render(<Subscribed language="go" />);
    expect(screen.getByText('Último valor: ninguno')).toBeInTheDocument();
    go.unmount();

    render(<Subscribed language="rust" />);
    expect(screen.getByText('Último valor: [b]')).toBeInTheDocument();
  });
});
