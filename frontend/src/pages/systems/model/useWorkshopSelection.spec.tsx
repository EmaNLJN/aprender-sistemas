import { act, renderHook, waitFor } from '@testing-library/react';
import { withNuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';
import useWorkshopSelection from './useWorkshopSelection';

function renderSelection(searchParams: string) {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const view = renderHook(() => useWorkshopSelection('rust'), {
    wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate, hasMemory: true }),
  });
  return { ...view, onUrlUpdate };
}

describe('useWorkshopSelection', () => {
  it('reads the workshop and the part from the query', () => {
    const { result } = renderSelection('?lenguaje=go&taller=cache&parte=ship');

    expect(result.current.workshopId).toBe('cache');
    expect(result.current.part).toBe('ship');
  });

  it('falls back to explore when the part is missing or unknown', () => {
    expect(renderSelection('?taller=cache').result.current.part).toBe('explore');
    expect(renderSelection('?taller=cache&parte=inventada').result.current.part).toBe('explore');
  });

  it('writes nothing on mount, even with an unknown part', () => {
    const { onUrlUpdate } = renderSelection('?taller=cache&parte=inventada');

    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('opening writes the language, the workshop and parte=explore, replacing the entry', async () => {
    const { result, onUrlUpdate } = renderSelection('');

    act(() => result.current.open('cache'));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    const [event] = onUrlUpdate.mock.calls[0];
    expect(event.queryString).toBe('?lenguaje=rust&taller=cache&parte=explore');
    expect(event.options.history).toBe('replace');
    expect(result.current.workshopId).toBe('cache');
  });

  it('closing leaves only the language', async () => {
    const { result, onUrlUpdate } = renderSelection('?lenguaje=rust&taller=cache&parte=build');

    act(() => result.current.close());

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(onUrlUpdate.mock.calls[0][0].queryString).toBe('?lenguaje=rust');
  });

  it('changing the part writes the three keys', async () => {
    const { result, onUrlUpdate } = renderSelection('?lenguaje=rust&taller=cache&parte=explore');

    act(() => result.current.changePart('cache', 'ship'));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(onUrlUpdate.mock.calls[0][0].queryString).toBe('?lenguaje=rust&taller=cache&parte=ship');
    expect(result.current.part).toBe('ship');
  });
});
