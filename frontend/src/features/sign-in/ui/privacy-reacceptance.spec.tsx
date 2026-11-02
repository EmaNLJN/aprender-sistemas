import { screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PublishedUser } from '../../../entities/session';
import { resetSession, stubDialogs, withReplies } from './render-access';

const ANA_BEFORE: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: false,
};
const CHANGED =
  'El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.';

beforeAll(stubDialogs);

beforeEach(() => {
  resetSession(ANA_BEFORE);
});

describe('accepting the notice again', () => {
  it('shows the current notice and accepts it with its version and X-Taller-User', async () => {
    const { user, signedIn, calls } = withReplies([{ status: 204 }]);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Aviso de privacidad' }),
    ).toBeInTheDocument();
    expect(screen.getByText(CHANGED)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acepto' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Acepto' }));
    await expect(signedIn).resolves.toEqual({ ...ANA_BEFORE, privacyAccepted: true });
    expect(calls[0]?.path).toBe('/api/me/privacy');
    expect(calls[0]?.body).toEqual({ privacyVersion: '2026-10-dev' });
    expect(calls[0]?.headers['x-taller-user']).toBe('41');
  });

  it('asks to reload when the server has another version, and does not retry', async () => {
    const { user, calls, reloadDocument } = withReplies([
      {
        status: 422,
        json: {
          message: 'Hay datos que corregir.',
          code: 'validation_failed',
          errors: {
            privacyVersion: ['El aviso de privacidad cambió: leelo de nuevo antes de aceptarlo.'],
          },
        },
      },
    ]);
    await user.click(screen.getByRole('button', { name: 'Acepto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El aviso de privacidad cambió: recargá la página para leer el vigente.',
    );
    expect(calls).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it('goes to the sign-in when the session ended', async () => {
    const { user } = withReplies([
      { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
    ]);
    await user.click(screen.getByRole('button', { name: 'Acepto' }));
    expect(await screen.findByRole('heading', { name: 'Ingresá al taller' })).toBeInTheDocument();
    expect(screen.getByText('Tu sesión venció. Ingresá de nuevo para seguir.')).toBeInTheDocument();
  });

  it('signs out and reloads with «Salir»', async () => {
    const { user, calls, reloadDocument } = withReplies([{ status: 204 }]);
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(calls[0]?.path).toBe('/api/auth/logout');
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it('asks for the notice after a sign-in whose account has an older one', async () => {
    resetSession();
    const { user, signedIn } = withReplies([
      { status: 200, json: { data: ANA_BEFORE } },
      { status: 204 },
    ]);
    await user.type(screen.getByLabelText('Email'), 'ana@x.com');
    await user.type(screen.getByLabelText('Contraseña'), 'una frase larga para el taller');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('heading', { name: 'Aviso de privacidad' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Acepto' }));
    await expect(signedIn).resolves.toEqual({ ...ANA_BEFORE, privacyAccepted: true });
  });
});
