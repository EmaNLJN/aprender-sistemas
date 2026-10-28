import { screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sessionStore, type PublishedUser } from '../../../entities/session';
import type { FetchLike } from '../../../shared/api/http';
import { renderAccess, resetSession, signIn, stubDialogs, withReplies } from './render-access';

const ANA: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};
const PASSWORD = 'una frase larga para el taller';

beforeAll(stubDialogs);

beforeEach(() => {
  resetSession();
});

describe('signing in', () => {
  it('focuses the email and ends the request with the account in the session', async () => {
    const { user, signedIn, calls } = withReplies([{ status: 200, json: { data: ANA } }]);
    expect(screen.getByLabelText('Email')).toHaveFocus();
    await user.click(
      screen.getByRole('checkbox', { name: 'Recordarme en este navegador por 30 días' }),
    );
    await signIn(user, 'ana@x.com', PASSWORD);
    await expect(signedIn).resolves.toEqual(ANA);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({ email: 'ana@x.com', password: PASSWORD, remember: true });
    expect(sessionStore.getState().user).toEqual(ANA);
  });

  it('closes the access dialog once the account is in', async () => {
    const { user, signedIn } = withReplies([{ status: 200, json: { data: ANA } }], {});
    await signIn(user, 'ana@x.com', PASSWORD);
    await signedIn;
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Ingresá al taller' })).toBeNull();
  });

  it('stops in the browser when a field is empty, and focuses the first one', async () => {
    const { user, calls } = withReplies([]);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(calls).toHaveLength(0);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Completá este campo.');
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription('Completá este campo.');
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('shows wrong credentials in the general error, focuses it and marks no field', async () => {
    const { user } = withReplies([
      {
        status: 422,
        json: { message: 'El email o la contraseña no son correctos.', code: 'auth_failed' },
      },
    ]);
    await signIn(user, 'nadie@x.com', PASSWORD);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El email o la contraseña no son correctos.');
    expect(alert).toHaveFocus();
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-invalid');
  });

  it('tells a disabled account so, as the server words it', async () => {
    const { user } = withReplies([
      {
        status: 403,
        json: {
          message: 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
          code: 'account_disabled',
        },
      },
    ]);
    await signIn(user, 'ana@x.com', PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
    );
  });

  it('sends a validation error to its field and focuses it', async () => {
    const { user } = withReplies([
      {
        status: 422,
        json: {
          message: 'Hay datos que corregir.',
          code: 'validation_failed',
          errors: { email: ['El campo email debe ser un email válido.'] },
        },
      },
    ]);
    await signIn(user, 'ana', PASSWORD);
    const email = screen.getByLabelText('Email');
    expect(await screen.findByText('El campo email debe ser un email válido.')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
  });

  it('keeps the button busy and says so while the server answers', async () => {
    const pending: FetchLike = () => new Promise<Response>(() => {});
    const { user } = renderAccess(pending);
    await signIn(user, 'ana@x.com', PASSWORD);
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();
  });

  it('keeps the button disabled after a rate limit and says how long to wait', async () => {
    const { user } = withReplies([
      {
        status: 429,
        headers: { 'Retry-After': '120' },
        json: {
          message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
          code: 'too_many_requests',
        },
      },
    ]);
    await signIn(user, 'ana@x.com', PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Podés volver a intentar en 2 minutos.',
    );
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled();
  });

  it('shows its own message when the answer is not JSON and keeps what was typed', async () => {
    const { user } = withReplies([{ status: 502, text: '<html>Bad Gateway</html>' }]);
    await signIn(user, 'ana@x.com', PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El taller no respondió como esperábamos. Probá de nuevo en un rato.',
    );
    expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
  });

  it('says how to recover the access without mail and offers no link for it', () => {
    withReplies([]);
    expect(
      screen.getByText(
        '¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /olvidaste/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /olvidaste/ })).toBeNull();
  });

  it('leaves «Recordarme» unchecked and warns about shared computers', () => {
    withReplies([]);
    const remember = screen.getByRole('checkbox', {
      name: 'Recordarme en este navegador por 30 días',
    });
    expect(remember).not.toBeChecked();
    expect(remember).toHaveAccessibleDescription('No la marques en una computadora compartida.');
  });

  it('tells an expired session to sign in again, in a dialog with a level-two title', () => {
    withReplies([], {});
    expect(screen.getByText('Tu sesión venció. Ingresá de nuevo para seguir.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ingresá al taller' }),
    ).toBeInTheDocument();
  });
});
