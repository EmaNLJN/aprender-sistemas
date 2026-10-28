export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 64;

const TOO_SHORT = 'Tiene que tener al menos 15 caracteres.';
const TOO_LONG = 'Puede tener hasta 64 caracteres.';

export function checkNewPasswordLength(value: string): true | string {
  const length = [...value.normalize('NFC')].length;
  if (length < PASSWORD_MIN_LENGTH) return TOO_SHORT;
  if (length > PASSWORD_MAX_LENGTH) return TOO_LONG;
  return true;
}
