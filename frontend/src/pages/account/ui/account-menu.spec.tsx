import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore, type PublishedUser } from '../../../entities/session';
import { ApiClientContext, createApiClient } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import AccountMenu from './AccountMenu';

const ANA: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};
const NOTE = 'Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

let entryHost: HTMLElement;

beforeEach(() => {
  entryHost = document.createElement('div');
  document.body.append(entryHost);
  sessionStore.setState({
    status: 'signed-in',
    user: ANA,
    features: { passwordReset: false, registration: false },
    contentVersion: null,
  });
});

afterEach(() => {
  entryHost.remove();
});

function renderMenu(replies: readonly FakeReply[] = []) {
  const user = userEvent.setup();
  const fake = createFakeFetch(replies);
  const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
  const reloadDocument = vi.fn();
  render(
    <ApiClientContext value={client}>
      <AccountMenu entryHost={entryHost} reloadDocument={reloadDocument} />
    </ApiClientContext>,
  );
  return {
    user,
    calls: fake.calls,
    reloadDocument,
    entry: () => within(entryHost).getByRole('button', { name: 'Tu cuenta' }),
  };
}

describe('«Tu cuenta»', () => {
  it('puts no entry while the account is missing or has not accepted the notice', () => {
    sessionStore.setState({ user: null, status: 'signed-out' });
    renderMenu();
    expect(entryHost).toBeEmptyDOMElement();
    act(() => {
      sessionStore.setState({ user: { ...ANA, privacyAccepted: false }, status: 'signed-in' });
    });
    expect(entryHost).toBeEmptyDOMElement();
  });

  it('puts the entry in its own element and opens a dialog with the name, the email and the note', async () => {
    const { user, entry } = renderMenu();
    await user.click(entry());
    const dialog = screen.getByRole('dialog', { name: 'Tu cuenta' });
    expect(dialog).toHaveTextContent('Ana Pérez · ana@x.com');
    expect(dialog).toHaveTextContent(NOTE);
    expect(entry()).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes with «Volver al taller» and gives the focus back to the entry', async () => {
    const { user, entry } = renderMenu();
    await user.click(entry());
    await user.click(screen.getByRole('button', { name: 'Volver al taller' }));
    expect(screen.queryByRole('dialog', { name: 'Tu cuenta' })).toBeNull();
    expect(entry()).toHaveFocus();
  });

  it('signs out with X-Taller-User and reloads the document', async () => {
    const { user, entry, calls, reloadDocument } = renderMenu([{ status: 204 }]);
    await user.click(entry());
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(calls[0]?.path).toBe('/api/auth/logout');
    expect(calls[0]?.headers['x-taller-user']).toBe('41');
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it('reloads too when there was no session any more', async () => {
    const { user, entry, reloadDocument } = renderMenu([
      { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
    ]);
    await user.click(entry());
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it('keeps the session and offers to retry when the sign-out fails', async () => {
    const { user, entry, reloadDocument } = renderMenu([
      { status: 503, text: '<html>' },
      { status: 204 },
    ]);
    await user.click(entry());
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cerrar la sesión.');
    expect(reloadDocument).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it('offers to reload when the session belongs to another account', async () => {
    const { user, entry, reloadDocument } = renderMenu([
      {
        status: 409,
        json: {
          message: 'La sesión cambió de cuenta: recargá la página.',
          code: 'account_mismatch',
        },
      },
    ]);
    await user.click(entry());
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La sesión cambió de cuenta: recargá la página.',
    );
    await user.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it('opens the privacy notice from «Tu cuenta»', async () => {
    const { user, entry } = renderMenu();
    await user.click(entry());
    await user.click(screen.getByRole('button', { name: 'Aviso de privacidad' }));
    expect(screen.getByRole('dialog', { name: 'Aviso de privacidad' })).toBeInTheDocument();
  });
});
