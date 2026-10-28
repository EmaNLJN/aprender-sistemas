import { act, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiClientContext, createApiClient } from '../../../shared/api/http';
import { createFakeFetch } from '../../../shared/api/http/fake-fetch';
import { createAccessRequests, type AccessRequests } from '../model/access-request';
import AccessGate from './AccessGate';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

function renderGate(requests: AccessRequests) {
  const client = createApiClient({ fetch: createFakeFetch([]).fetch, readCookies: () => '' });
  const setShellInert = vi.fn();
  const reloadDocument = vi.fn();
  const view = render(
    <ApiClientContext value={client}>
      <AccessGate
        requests={requests}
        setShellInert={setShellInert}
        reloadDocument={reloadDocument}
      />
    </ApiClientContext>,
  );
  return { ...view, setShellInert };
}

describe('the access gate', () => {
  it('draws nothing, and no live region, while nobody asks', () => {
    const { container } = renderGate(createAccessRequests());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the access as a page with a level-one title and the shell inert', () => {
    const requests = createAccessRequests();
    const { setShellInert } = renderGate(requests);
    act(() => {
      void requests.request({ presentation: 'page', reason: 'boot' });
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Ingresá al taller' })).toBeVisible();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(setShellInert).toHaveBeenLastCalledWith(true);
  });

  it('gives the shell back when the request finishes', () => {
    const requests = createAccessRequests();
    const { setShellInert } = renderGate(requests);
    act(() => {
      void requests.request({ presentation: 'page', reason: 'boot' });
    });
    act(() => {
      requests.finish({
        id: 41,
        name: 'Ana Pérez',
        email: 'ana@x.com',
        role: 'student',
        privacyAccepted: true,
      });
    });
    expect(screen.queryByRole('heading', { name: 'Ingresá al taller' })).toBeNull();
    expect(setShellInert).toHaveBeenLastCalledWith(false);
  });

  it('shows the access as a dialog over a running shell, with a level-two title', () => {
    const requests = createAccessRequests();
    const { setShellInert } = renderGate(requests);
    act(() => {
      void requests.request();
    });
    expect(screen.getByRole('dialog', { name: 'Ingresá al taller' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ingresá al taller' }),
    ).toBeInTheDocument();
    expect(setShellInert).not.toHaveBeenCalled();
  });
});
