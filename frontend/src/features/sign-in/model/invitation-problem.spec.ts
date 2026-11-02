import { describe, expect, it } from 'vitest';
import type { ApiFailure } from '../../../shared/api/http';
import { invitationProblem } from './invitation-problem';

function response(status: number, code: string, message: string): ApiFailure {
  return { kind: 'response', status, code, message, fieldErrors: {}, retryAfterSeconds: null };
}

describe('invitationProblem', () => {
  it.each([
    [
      response(404, 'invitation_not_found', 'La invitación no existe o ya se usó.'),
      ['La invitación no existe o ya se usó.', 'Si ya creaste tu cuenta, ingresá con tu email.'],
    ],
    [
      response(
        410,
        'invitation_expired',
        'La invitación venció. Pedí una nueva a quien te invitó.',
      ),
      ['La invitación venció. Pedí una nueva a quien te invitó.'],
    ],
    [
      response(409, 'email_taken', 'Ya hay una cuenta con ese email.'),
      ['Ya hay una cuenta con ese email.', 'Ingresá con ese email.'],
    ],
  ])('explains %o and what to do', (failure, messages) => {
    expect(invitationProblem(failure)).toEqual(messages);
  });

  it('leaves any other failure to the common messages', () => {
    expect(invitationProblem({ kind: 'network' })).toBeNull();
    expect(
      invitationProblem(response(422, 'validation_failed', 'Hay datos que corregir.')),
    ).toBeNull();
  });
});
