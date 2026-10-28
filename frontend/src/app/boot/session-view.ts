export type SessionFailure =
  | { readonly kind: 'unreachable' }
  | {
      readonly kind: 'rate-limited';
      readonly message: string;
      readonly retryAfterSeconds: number | null;
    };

export interface SessionView {
  showLoading(): void;
  showFailure(failure: SessionFailure, retry: () => void): void;
  clear(): void;
}

export const SESSION_LOADING_MARKUP = '';

export function sessionFailureMarkup(_failure: SessionFailure): string {
  throw new Error('not implemented');
}

export function createSessionView(): SessionView {
  throw new Error('not implemented');
}
