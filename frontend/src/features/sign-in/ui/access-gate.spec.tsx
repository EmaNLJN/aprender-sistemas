import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi, type Mock } from 'vitest';
import { ApiClientContext, createApiClient } from '../../../shared/api/http';
import { createFakeFetch } from '../../../shared/api/http/fake-fetch';
import { createAccessRequests, type AccessRequests } from '../model/access-request';
import AccessDialog from './AccessDialog';
import AccessGate from './AccessGate';
import { stubDialogs } from './render-access';

let showModal: Mock<(this: HTMLDialogElement) => void>;

beforeAll(() => {
  stubDialogs();
  showModal = vi.fn(HTMLDialogElement.prototype.showModal);
  HTMLDialogElement.prototype.showModal = showModal;
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

  it('opens the dialog again when the browser closes it while the request is pending', () => {
    const requests = createAccessRequests();
    const { container } = renderGate(requests);
    act(() => {
      void requests.request();
    });
    const dialog = container.querySelector('dialog')!;
    showModal.mockClear();
    dialog.open = false;
    fireEvent(dialog, new Event('close'));
    expect(showModal.mock.contexts).toEqual([dialog]);
    expect(dialog.open).toBe(true);
  });

  it('gives the focus back to whoever had it, even though opening moves it inside', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    try {
      opener.focus();
      const requests = createAccessRequests();
      const { container } = renderGate(requests);
      act(() => {
        void requests.request();
      });
      expect(container.querySelector('dialog')!.contains(document.activeElement)).toBe(true);
      act(() => {
        requests.finish({
          id: 41,
          name: 'Ana Pérez',
          email: 'ana@x.com',
          role: 'student',
          privacyAccepted: true,
        });
      });
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });

  it('keeps itself open on Esc but lets a dialog inside it close', () => {
    const { container } = render(
      <AccessDialog>
        <dialog className="inner" />
      </AccessDialog>,
    );
    const own = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog', { name: 'Ingresá al taller' }), own);
    expect(own.defaultPrevented).toBe(true);
    const inner = new Event('cancel', { cancelable: true });
    fireEvent(container.querySelector('dialog.inner')!, inner);
    expect(inner.defaultPrevented).toBe(false);
  });
});
