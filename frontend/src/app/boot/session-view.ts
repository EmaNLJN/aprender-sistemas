import { escapeHtml } from '../../shared/lib/escape-html';
import { formatWait } from '../../shared/lib/format-wait';

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

const UNREACHABLE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';
const RETRY_ID = 'session-retry';

export const SESSION_LOADING_MARKUP =
  '<section class="empty-state" data-session-gate="loading"><p role="status">Conectando con el taller…</p></section>';

function failureText(failure: SessionFailure): string {
  if (failure.kind === 'unreachable') return UNREACHABLE;
  const message = escapeHtml(failure.message);
  if (failure.retryAfterSeconds === null) return message;
  return `${message} Podés volver a intentar en ${formatWait(failure.retryAfterSeconds)}.`;
}

export function sessionFailureMarkup(failure: SessionFailure): string {
  return (
    `<section class="empty-state" data-session-gate="failed" data-failure="${failure.kind}">` +
    `<p role="alert">${failureText(failure)}</p>` +
    `<button class="button" id="${RETRY_ID}" type="button">Reintentar</button>` +
    '</section>'
  );
}

function waitOf(failure: SessionFailure): number {
  return failure.kind === 'rate-limited' ? (failure.retryAfterSeconds ?? 0) : 0;
}

export function createSessionView(): SessionView {
  let enableTimer: ReturnType<typeof setTimeout> | undefined;
  const render = (markup: string): HTMLElement | null => {
    clearTimeout(enableTimer);
    const host = document.getElementById('session-status');
    if (host) host.innerHTML = markup;
    return host;
  };
  return {
    showLoading() {
      const hadFocus = document.activeElement?.id === RETRY_ID;
      const host = render(SESSION_LOADING_MARKUP);
      if (hadFocus) host?.focus();
    },
    showFailure(failure, retry) {
      if (render(sessionFailureMarkup(failure)) === null) return;
      const button = document.getElementById(RETRY_ID);
      if (!(button instanceof HTMLButtonElement)) return;
      button.addEventListener('click', retry);
      const wait = waitOf(failure);
      if (wait === 0) {
        button.focus();
        return;
      }
      button.disabled = true;
      enableTimer = setTimeout(() => {
        button.disabled = false;
        button.focus();
      }, wait * 1000);
    },
    clear() {
      render('');
    },
  };
}
