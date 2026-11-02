import type { ApiFailure } from '../../../shared/api/http';

const SIGN_IN_INSTEAD = 'Si ya creaste tu cuenta, ingresá con tu email.';
const SIGN_IN_WITH_THAT_EMAIL = 'Ingresá con ese email.';

export function invitationProblem(failure: ApiFailure): readonly string[] | null {
  if (failure.kind !== 'response') return null;
  switch (failure.code) {
    case 'invitation_not_found':
      return [failure.message, SIGN_IN_INSTEAD];
    case 'invitation_expired':
      return [failure.message];
    case 'email_taken':
      return [failure.message, SIGN_IN_WITH_THAT_EMAIL];
    default:
      return null;
  }
}
