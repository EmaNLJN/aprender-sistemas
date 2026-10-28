export interface PublishedAccount {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'admin';
  privacyAccepted: boolean;
}

export const STUDENT: PublishedAccount = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};

export const ADMIN: PublishedAccount = {
  id: 1,
  name: 'Olga Ruiz',
  email: 'olga@x.com',
  role: 'admin',
  privacyAccepted: true,
};

export const INVITATION = {
  token: 'k3J8xQ2mN7pL4vR9tY6wZ1aB5cD0eF3gH8iJ2kL7mN4',
  email: 'bruno@x.com',
  role: 'student' as const,
  expiresAt: '2026-10-12T15:30:00.000Z',
};

export const RESET_LINK = {
  token: '9f2c4e6a8b0d1f3e5a7c9b1d3f5e7a9c2b4d6f8a0c1e3b5d7f9a1c3e5b7d9f0a',
  email: 'ana@x.com',
};

export const MESSAGES = {
  auth_failed: 'El email o la contraseña no son correctos.',
  account_disabled: 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
  invitation_not_found: 'La invitación no existe o ya se usó.',
  invitation_expired: 'La invitación venció. Pedí una nueva a quien te invitó.',
  email_taken: 'Ya hay una cuenta con ese email.',
  account_mismatch: 'La sesión cambió de cuenta: recargá la página.',
  csrf_token_mismatch: 'La página venció: recargala e intentá de nuevo.',
  validation_failed: 'Hay datos que corregir.',
  too_many_requests: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
  unauthenticated: 'Iniciá sesión para continuar.',
  not_found: 'No existe lo que pedís.',
  server_error: 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.',
} as const;

export type ApiCode = keyof typeof MESSAGES;

export const FIELD_MESSAGES = {
  resetToken: 'El enlace para restablecer la contraseña no es válido o venció.',
  privacyChanged: 'El aviso de privacidad cambió: leelo de nuevo antes de aceptarlo.',
  tooShort: 'Tiene que tener al menos 15 caracteres.',
  blocked: 'Es una contraseña muy usada: elegí otra.',
  containsName: 'No puede contener tu nombre.',
} as const;

export function errorBody(code: ApiCode, errors?: Record<string, string[]>) {
  return errors === undefined
    ? { message: MESSAGES[code], code }
    : { message: MESSAGES[code], code, errors };
}
