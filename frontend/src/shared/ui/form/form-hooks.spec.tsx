import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useGuardedSubmit from './use-guarded-submit';
import useRetryCountdown from './use-retry-countdown';

const GuardedButton = ({ handler }: { readonly handler: () => Promise<void> }) => {
  const guarded = useGuardedSubmit(handler);
  return (
    <button type="button" onClick={() => void guarded()}>
      Enviar
    </button>
  );
};

const Countdown = ({ seconds }: { readonly seconds: number }) => {
  const { waiting, start } = useRetryCountdown();
  return (
    <button type="button" disabled={waiting} onClick={() => start(seconds)}>
      Esperar
    </button>
  );
};

describe('useGuardedSubmit', () => {
  it('lets one submission through while the previous one has not finished', async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const handler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    render(<GuardedButton handler={handler} />);
    await user.dblClick(screen.getByRole('button', { name: 'Enviar' }));
    expect(handler).toHaveBeenCalledOnce();
    await act(async () => {
      release();
    });
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('useRetryCountdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits the seconds it was given', () => {
    vi.useFakeTimers();
    render(<Countdown seconds={2} />);
    const button = screen.getByRole('button', { name: 'Esperar' });
    act(() => button.click());
    expect(button).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(1_999);
    });
    expect(button).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(button).toBeEnabled();
  });
});
