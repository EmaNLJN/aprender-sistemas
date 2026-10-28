export type AccountRole = 'student' | 'admin';

export interface PublishedUser {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: AccountRole;
  readonly privacyAccepted: boolean;
}

export interface SessionFeatures {
  readonly passwordReset: boolean;
  readonly registration: boolean;
}

export interface SessionSnapshot {
  readonly user: PublishedUser | null;
  readonly features: SessionFeatures;
  readonly contentVersion: string | null;
}

export type SessionStatus = 'unknown' | 'signed-out' | 'signed-in';

export interface SessionState extends SessionSnapshot {
  readonly status: SessionStatus;
  applySnapshot(snapshot: SessionSnapshot): void;
  applyUser(user: PublishedUser): void;
}

export type SessionOutcome =
  | { readonly kind: 'session'; readonly snapshot: SessionSnapshot }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'rate-limited'; readonly message: string; readonly retryAfterSeconds: number | null };
