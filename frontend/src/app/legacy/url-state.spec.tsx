import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAsString, useQueryStates } from 'nuqs';
import { beforeEach, describe, expect, it } from 'vitest';
import { UrlStateProvider, startUrlStateSync } from './url-state';

const Probe = () => {
  const [query, setQuery] = useQueryStates({ taller: parseAsString }, { history: 'replace' });
  return (
    <>
      <p>taller: {query.taller ?? 'none'}</p>
      <button onClick={() => void setQuery({ taller: 'heap' })}>open heap</button>
    </>
  );
};

describe('url state', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/?lenguaje=rust#sistemas');
  });

  it('writes with replace, keeps the other keys and keeps the hash', async () => {
    const user = userEvent.setup();
    const entries = history.length;
    render(
      <UrlStateProvider>
        <Probe />
      </UrlStateProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open heap' }));

    await waitFor(() => expect(location.search).toBe('?lenguaje=rust&taller=heap'));
    expect(location.hash).toBe('#sistemas');
    expect(history.length).toBe(entries);
  });

  it('shows a foreign replaceState while mounted once the sync started', async () => {
    startUrlStateSync();
    startUrlStateSync();
    render(
      <UrlStateProvider>
        <Probe />
      </UrlStateProvider>,
    );
    expect(screen.getByText('taller: none')).toBeInTheDocument();

    history.replaceState(null, '', '/?lenguaje=go&taller=wal#sistemas');

    expect(await screen.findByText('taller: wal')).toBeInTheDocument();
  });
});
