import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApiClient } from './api-client-context';

describe('useApiClient', () => {
  it('throws when there is no provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useApiClient())).toThrow('Falta ApiClientContext');
    vi.restoreAllMocks();
  });
});
