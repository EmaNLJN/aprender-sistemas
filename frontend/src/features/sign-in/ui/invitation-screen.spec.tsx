import { screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import type { SignInOptions } from '../model/access-request';
import {
  renderAccess,
  resetSession,
  stubDialogs,
  withReplies,
  type AccessUser,
} from './render-access';

const INVITED: SignInOptions = {
  presentation: 'page',
  reason: 'boot',
  token: { kind: 'invitation', token: 'k3J8' },
};

function invited(replies: readonly FakeReply[]) {
  return withReplies(replies, INVITED);
}

beforeAll(stubDialogs);

beforeEach(() => {
  resetSession();
});

const LOOKUP: FakeReply = {
  status: 200,
  json: { email: 'bruno@x.com', role: 'student', expiresAt: '2026-10-12T15:30:00.000Z' },
};
const BRUNO = {
  id: 77,
  name: 'Bruno Díaz',
  email: 'bruno@x.com',
  role: 'student' as const,
  privacyAccepted: true,
};
const PASSWORD = 'una frase larga para el alta';

async function fillSignup(user: AccessUser, password: string, confirmation = password) {
  await user.type(await screen.findByLabelText('Tu nombre'), 'Bruno Díaz');
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.type(screen.getByLabelText('Repetí la contraseña'), confirmation);
}

describe('the invitation', () => {
  it('checks the invitation, then shows its email, its expiry and the warning, and focuses the name', async () => {
    invited([LOOKUP]);
    expect(screen.getByRole('status')).toHaveTextContent('Revisando tu invitación…');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Creá tu cuenta' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Te invitaron con bruno@x.com.')).toBeInTheDocument();
    expect(
      screen.getByText(/^La invitación vence el 12 de octubre de 2026 a las \d{2}:30\.$/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Si recargás esta página, vas a tener que abrir el enlace otra vez.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('La cuenta va a tener rol de admin.')).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('Tu nombre')).toHaveFocus());
  });

  it('says when the account will be an admin', async () => {
    invited([{ status: 200, json: { ...(LOOKUP.json as object), role: 'admin' } }]);
    expect(await screen.findByText('La cuenta va a tener rol de admin.')).toBeInTheDocument();
  });

  it('creates the account with the token, the name, both passwords and the version of the notice', async () => {
    const { user, signedIn, calls } = invited([LOOKUP, { status: 201, json: { data: BRUNO } }]);
    await fillSignup(user, PASSWORD);
    await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await expect(signedIn).resolves.toEqual(BRUNO);
    expect(calls[1]?.body).toEqual({
      token: 'k3J8',
      name: 'Bruno Díaz',
      password: PASSWORD,
      password_confirmation: PASSWORD,
      privacyVersion: '2026-10-dev',
    });
  });

  it('stops a 14-character password in the browser and lets a 15-character one with a decomposed «á» go', async () => {
    const { user, calls } = invited([LOOKUP, { status: 201, json: { data: BRUNO } }]);
    await fillSignup(user, 'a'.repeat(14));
    await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      /Tiene que tener al menos 15 caracteres\./,
    );
    expect(calls).toHaveLength(1);
    const decomposed = `${'a'.repeat(14)}a\u0301`;
    await user.clear(screen.getByLabelText('Contraseña'));
    await user.clear(screen.getByLabelText('Repetí la contraseña'));
    await user.type(screen.getByLabelText('Contraseña'), decomposed);
    await user.type(screen.getByLabelText('Repetí la contraseña'), decomposed);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await vi.waitFor(() => expect(calls).toHaveLength(2));
  });

  it('allows 63 characters plus a decomposed accented character after NFC', async () => {
    const { user, calls } = invited([LOOKUP, { status: 201, json: { data: BRUNO } }]);
    const password = `${'a'.repeat(63)}a\u0301`;
    await fillSignup(user, password);
    await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]?.body).toMatchObject({ password, password_confirmation: password });
  });

  it('stops a confirmation that does not match in the browser', async () => {
    const { user, calls } = invited([LOOKUP]);
    await fillSignup(user, PASSWORD, 'otra frase larga distinta');
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(screen.getByLabelText('Repetí la contraseña')).toHaveAccessibleDescription(
      'La confirmación de la contraseña no coincide.',
    );
    expect(calls).toHaveLength(1);
  });

  it('asks for the box of the notice, which comes unchecked', async () => {
    const { user, calls } = invited([LOOKUP]);
    await fillSignup(user, PASSWORD);
    const box = screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' });
    expect(box).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(box).toHaveAccessibleDescription('Para crear tu cuenta, aceptá el aviso de privacidad.');
    expect(calls).toHaveLength(1);
  });

  it('shows every reason of the server on the password, marks it and focuses it', async () => {
    const { user } = invited([
      LOOKUP,
      {
        status: 422,
        json: {
          message: 'Hay datos que corregir.',
          code: 'validation_failed',
          errors: {
            password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
          },
        },
      },
    ]);
    await fillSignup(user, PASSWORD);
    await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    const password = screen.getByLabelText('Contraseña');
    expect(await screen.findByText('Es una contraseña muy usada: elegí otra.')).toBeInTheDocument();
    expect(screen.getByText('No puede contener tu nombre.')).toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveFocus();
  });

  it('keeps the button busy while the account is created', async () => {
    let calls = 0;
    const fetch: FetchLike = async (path, init) => {
      calls += 1;
      if (calls === 1) return createFakeFetch([LOOKUP]).fetch(path, init);
      return new Promise<Response>(() => {});
    };
    const { user } = renderAccess(fetch, INVITED);
    await fillSignup(user, PASSWORD);
    await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(screen.getByRole('button', { name: 'Creando tu cuenta…' })).toBeDisabled();
  });

  it('reads the notice without losing what was typed', async () => {
    const { user } = invited([LOOKUP]);
    await user.type(await screen.findByLabelText('Tu nombre'), 'Bruno Díaz');
    await user.click(screen.getByRole('button', { name: 'Leer el aviso' }));
    expect(screen.getByRole('dialog', { name: 'Aviso de privacidad' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByLabelText('Tu nombre')).toHaveValue('Bruno Díaz');
    expect(
      screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }),
    ).not.toBeChecked();
  });

  it.each([
    [
      404,
      'invitation_not_found',
      'La invitación no existe o ya se usó.',
      'Si ya creaste tu cuenta, ingresá con tu email.',
    ],
    [410, 'invitation_expired', 'La invitación venció. Pedí una nueva a quien te invitó.', null],
  ])(
    'shows a %i of the lookup without a form and offers the sign-in',
    async (status, code, message, next) => {
      const { user } = invited([{ status, json: { message, code } }]);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(message);
      if (next !== null) expect(alert).toHaveTextContent(next);
      expect(screen.queryByLabelText('Tu nombre')).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Ir al ingreso' }));
      expect(screen.getByRole('heading', { name: 'Ingresá al taller' })).toBeInTheDocument();
    },
  );

  it('shows the common message when the lookup meets a server error', async () => {
    invited([
      {
        status: 500,
        json: {
          message: 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.',
          code: 'server_error',
        },
      },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo salió mal de nuestro lado. Probá de nuevo en un rato.',
    );
  });

  it('offers the sign-in when the email was taken in the meantime', async () => {
    const { user } = invited([
      LOOKUP,
      { status: 409, json: { message: 'Ya hay una cuenta con ese email.', code: 'email_taken' } },
    ]);
    await fillSignup(user, PASSWORD);
    await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ya hay una cuenta con ese email.');
    expect(alert).toHaveTextContent('Ingresá con ese email.');
    expect(screen.getByRole('button', { name: 'Ir al ingreso' })).toBeInTheDocument();
  });
});
