import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { AccountRole, PublishedUser, SessionFeatures, SessionSnapshot } from './types';

function isAccountRole(value: unknown): value is AccountRole {
  return value === 'student' || value === 'admin';
}

export function parsePublishedUser(value: unknown): PublishedUser | null {
  if (!isPlainObject(value)) return null;
  const { id, name, email, role, privacyAccepted } = value;
  if (typeof id !== 'number' || typeof name !== 'string' || typeof email !== 'string') return null;
  if (!isAccountRole(role) || typeof privacyAccepted !== 'boolean') return null;
  return { id, name, email, role, privacyAccepted };
}

function parseFeatures(value: unknown): SessionFeatures | null {
  if (!isPlainObject(value)) return null;
  const { passwordReset, registration } = value;
  if (typeof passwordReset !== 'boolean' || typeof registration !== 'boolean') return null;
  return { passwordReset, registration };
}

export function parseSessionBody(body: unknown): SessionSnapshot | null {
  if (!isPlainObject(body)) return null;
  const user = body.user === null ? null : parsePublishedUser(body.user);
  if (body.user !== null && user === null) return null;
  const features = parseFeatures(body.features);
  if (features === null) return null;
  const { contentVersion } = body;
  if (contentVersion !== null && typeof contentVersion !== 'string') return null;
  return { user, features, contentVersion };
}
