import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { celebrate } from '../../../shared/lib/celebration';
import { initProbeEngine, passingLabState } from '../model/systems-page.factory';
import { workshopView } from '../model/workshop-views';
import Checkpoint from './Checkpoint';

vi.mock('../../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const Subscribed = ({ notify }: { notify: (message: string) => void }) => {
  useStore(systemsEngine.changes, (state) => state.revision);
  return <Checkpoint workshop={workshopView('probe', 'rust')} language="rust" notify={notify} />;
};

describe('Checkpoint', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(celebrate).mockReset();
  });

  it('invites to answer before any answer', () => {
    initProbeEngine();
    render(<Subscribed notify={vi.fn()} />);

    expect(
      screen.getByText('Probá una explicación. Después contrastala con el porqué.'),
    ).toBeInTheDocument();
  });

  it('a wrong answer explains, keeps the focus and announces the retry, in the same feedback node', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    initProbeEngine();
    const { container } = render(<Subscribed notify={notify} />);
    const feedback = container.querySelector('.sys-feedback');

    await user.click(screen.getByRole('button', { name: 'ANada' }));

    expect(container.querySelector('.sys-feedback')).toBe(feedback);
    expect(feedback).toHaveTextContent(
      'Revisemos esa decisión. El control sin valor manda una cadena vacía.',
    );
    expect(screen.getByRole('button', { name: 'ANada' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ANada' })).toHaveClass('incorrect');
    expect(screen.getByRole('button', { name: 'ANada' })).toHaveFocus();
    expect(notify).toHaveBeenCalledWith('Revisá el porqué y probá otra explicación.');
  });

  it('the right answer earns the prediction seal and announces it', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    initProbeEngine();
    render(<Subscribed notify={notify} />);

    await user.click(screen.getByRole('button', { name: 'BUna cadena vacía' }));

    expect(screen.getByText('Esa es la idea.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BUna cadena vacía' })).toHaveClass('correct');
    expect(workshopView('probe', 'rust').progress.predicted).toBe(true);
    expect(notify).toHaveBeenCalledWith(
      'Checkpoint razonado. Contrastá la explicación con tu experimento.',
    );
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('celebrates before the announcement when the answer earns the third seal', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.mocked(celebrate).mockImplementation(() => {
      calls.push('celebrate');
    });
    initProbeEngine();
    systemsEngine.observe('probe', 'rust', ['touched-a', 'touched-b', 'touched-empty']);
    systemsEngine.syncLab(passingLabState());
    render(<Subscribed notify={(message) => calls.push(message)} />);

    await user.click(screen.getByRole('button', { name: 'BUna cadena vacía' }));

    expect(calls).toEqual([
      'celebrate',
      'Checkpoint razonado. Contrastá la explicación con tu experimento.',
    ]);
  });
});
