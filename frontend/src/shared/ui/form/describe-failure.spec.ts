import { describe, expect, it } from 'vitest';
import type { ApiFailure } from '../../api/http';
import { describeFailure } from './describe-failure';

const NOTHING = {
  fieldMessages: {},
  generalMessages: [],
  retryAfterSeconds: null,
  offerReload: false,
  signedOut: false,
};

function response(
  status: number,
  code: string,
  message: string,
  extra: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number | null } = {},
): ApiFailure {
  return {
    kind: 'response',
    status,
    code,
    message,
    fieldErrors: extra.fieldErrors ?? {},
    retryAfterSeconds: extra.retryAfterSeconds ?? null,
  };
}

describe('describeFailure', () => {
  it('says the workshop could not be reached on a network failure', () => {
    expect(describeFailure({ kind: 'network' }, [])).toEqual({
      ...NOTHING,
      generalMessages: ['No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.'],
    });
  });

  it('says the answer was not the expected one when it is not JSON', () => {
    expect(describeFailure({ kind: 'unexpected', status: 502 }, [])).toEqual({
      ...NOTHING,
      generalMessages: ['El taller no respondió como esperábamos. Probá de nuevo en un rato.'],
    });
  });

  it('sends every message of a visible field to that field and the rest to the general error', () => {
    const failure = response(422, 'validation_failed', 'Hay datos que corregir.', {
      fieldErrors: {
        password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
        token: ['El enlace para restablecer la contraseña no es válido o venció.'],
      },
    });
    expect(describeFailure(failure, ['password', 'password_confirmation'])).toEqual({
      ...NOTHING,
      fieldMessages: {
        password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
      },
      generalMessages: ['El enlace para restablecer la contraseña no es válido o venció.'],
    });
  });

  it('falls back to the message of the server when no field brings one', () => {
    expect(
      describeFailure(response(422, 'validation_failed', 'Hay datos que corregir.'), ['email']),
    ).toEqual({
      ...NOTHING,
      generalMessages: ['Hay datos que corregir.'],
    });
  });

  it('shows wrong credentials only in the general error', () => {
    const failure = response(422, 'auth_failed', 'El email o la contraseña no son correctos.');
    expect(describeFailure(failure, ['email', 'password'])).toEqual({
      ...NOTHING,
      generalMessages: ['El email o la contraseña no son correctos.'],
    });
  });

  it('adds the time left to a rate limit and keeps it', () => {
    const failure = response(
      429,
      'too_many_requests',
      'Demasiados intentos. Esperá un momento antes de volver a probar.',
      {
        retryAfterSeconds: 120,
      },
    );
    expect(describeFailure(failure, [])).toEqual({
      ...NOTHING,
      generalMessages: [
        'Demasiados intentos. Esperá un momento antes de volver a probar.',
        'Podés volver a intentar en 2 minutos.',
      ],
      retryAfterSeconds: 120,
    });
  });

  it('shows only the message of a rate limit without Retry-After', () => {
    const failure = response(
      429,
      'too_many_requests',
      'Demasiados intentos. Esperá un momento antes de volver a probar.',
    );
    expect(describeFailure(failure, [])).toEqual({
      ...NOTHING,
      generalMessages: ['Demasiados intentos. Esperá un momento antes de volver a probar.'],
    });
  });

  it('offers to reload when the session belongs to another account', () => {
    const mismatch = response(
      409,
      'account_mismatch',
      'La sesión cambió de cuenta: recargá la página.',
    );
    expect(describeFailure(mismatch, [])).toEqual({
      ...NOTHING,
      generalMessages: ['La sesión cambió de cuenta: recargá la página.'],
      offerReload: true,
    });
    expect(
      describeFailure(
        { kind: 'account-changed', message: 'La página venció: recargala e intentá de nuevo.' },
        [],
      ),
    ).toEqual({
      ...NOTHING,
      generalMessages: ['La página venció: recargala e intentá de nuevo.'],
      offerReload: true,
    });
  });

  it('asks for the sign-in on a 401 or on a 419 without an account, with nothing to show', () => {
    expect(
      describeFailure(response(401, 'unauthenticated', 'Iniciá sesión para continuar.'), []),
    ).toEqual({
      ...NOTHING,
      signedOut: true,
    });
    expect(describeFailure({ kind: 'signed-out' }, [])).toEqual({ ...NOTHING, signedOut: true });
  });

  it('shows the message of the server for any other answer', () => {
    const disabled = response(
      403,
      'account_disabled',
      'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
    );
    expect(describeFailure(disabled, ['email'])).toEqual({
      ...NOTHING,
      generalMessages: ['Tu cuenta está deshabilitada. Consultá con quien administra el taller.'],
    });
  });
});
