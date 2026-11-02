import { screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FakeReply } from '../../../shared/api/http/fake-fetch';
import type { SignInOptions } from '../model/access-request';
import {
  renderAccess,
  resetSession,
  stubDialogs,
  withReplies,
  type AccessUser,
} from './render-access';

const RESET_REQUEST: SignInOptions = {
  presentation: 'page',
  reason: 'boot',
  token: { kind: 'reset', token: '9f2c', email: 'ana@x.com' },
};

function resetting(replies: readonly FakeReply[]) {
  return withReplies(replies, RESET_REQUEST);
}

beforeAll(stubDialogs);

beforeEach(() => {
  resetSession();
});

const NEW_PASSWORD = 'otra frase larga para el cambio';
const ASK_NEW_LINK = 'Pedile uno nuevo a quien administra el taller.';

async function chooseNewPassword(user: AccessUser, password: string, confirmation = password) {
  await user.type(screen.getByLabelText('Contraseña nueva'), password);
  await user.type(screen.getByLabelText('Repetí la contraseña nueva'), confirmation);
  await user.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));
}

describe('resetting the password', () => {
  it('shows the email of the link, changes the password and shows the sign-in with the email, without a session', async () => {
    const { user, calls, requests } = resetting([{ status: 200, json: {} }]);
    expect(screen.getByText('Para ana@x.com.')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña nueva')).toHaveFocus();
    await chooseNewPassword(user, NEW_PASSWORD);
    expect(
      await screen.findByText(
        'Listo: tu contraseña cambió y cerramos tus sesiones abiertas. Ingresá con la nueva.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
    expect(screen.getByLabelText('Contraseña')).toHaveFocus();
    expect(requests.current()).not.toBeNull();
    expect(calls[0]?.body).toEqual({
      token: '9f2c',
      email: 'ana@x.com',
      password: NEW_PASSWORD,
      password_confirmation: NEW_PASSWORD,
    });
  });

  it('shows a rejected link in the general error, with how to ask for another one', async () => {
    const { user } = resetting([
      {
        status: 422,
        json: {
          message: 'Hay datos que corregir.',
          code: 'validation_failed',
          errors: { token: ['El enlace para restablecer la contraseña no es válido o venció.'] },
        },
      },
    ]);
    await chooseNewPassword(user, NEW_PASSWORD);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'El enlace para restablecer la contraseña no es válido o venció.',
    );
    expect(alert).toHaveTextContent(ASK_NEW_LINK);
    expect(alert).toHaveFocus();
    expect(screen.getByLabelText('Contraseña nueva')).not.toHaveAttribute('aria-invalid');
  });

  it('shows a reason of the policy on the new password', async () => {
    const { user } = resetting([
      {
        status: 422,
        json: {
          message: 'Hay datos que corregir.',
          code: 'validation_failed',
          errors: { password: ['Es una contraseña muy usada: elegí otra.'] },
        },
      },
    ]);
    await chooseNewPassword(user, NEW_PASSWORD);
    expect(await screen.findByText('Es una contraseña muy usada: elegí otra.')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña nueva')).toHaveAttribute('aria-invalid', 'true');
  });

  it('stops a confirmation that does not match in the browser', async () => {
    const { user, calls } = resetting([]);
    await chooseNewPassword(user, NEW_PASSWORD, 'otra frase que no es igual');
    expect(screen.getByLabelText('Repetí la contraseña nueva')).toHaveAccessibleDescription(
      'La confirmación de la contraseña no coincide.',
    );
    expect(calls).toHaveLength(0);
  });

  it('keeps the button busy while the password changes', async () => {
    const { user } = renderAccess(() => new Promise<Response>(() => {}), RESET_REQUEST);
    await chooseNewPassword(user, NEW_PASSWORD);
    expect(screen.getByRole('button', { name: 'Cambiando la contraseña…' })).toBeDisabled();
  });

  it('says a link without an email is incomplete, and shows no form', () => {
    withReplies([], {
      presentation: 'page',
      reason: 'boot',
      token: { kind: 'reset', token: '9f2c', email: null },
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('El enlace para restablecer la contraseña no está completo.');
    expect(alert).toHaveTextContent(ASK_NEW_LINK);
    expect(screen.queryByLabelText('Contraseña nueva')).toBeNull();
  });
});
