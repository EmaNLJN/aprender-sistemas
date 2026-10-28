// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_LOADING_MARKUP, createSessionView, sessionFailureMarkup } from './session-view';

describe('the session markup', () => {
  it('says it is connecting, as a status', () => {
    expect(SESSION_LOADING_MARKUP).toContain('Conectando con el taller…');
    expect(SESSION_LOADING_MARKUP).toContain('role="status"');
  });

  it('says it could not connect and offers a retry', () => {
    const markup = sessionFailureMarkup({ kind: 'unreachable' });
    expect(markup).toContain(
      'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.',
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('>Reintentar</button>');
    expect(markup).not.toContain('style=');
  });

  it('shows the message of a rate limit, escaped, with the time left', () => {
    const markup = sessionFailureMarkup({
      kind: 'rate-limited',
      message: 'Demasiados <intentos>.',
      retryAfterSeconds: 120,
    });
    expect(markup).toContain('Demasiados &lt;intentos&gt;. Podés volver a intentar en 2 minutos.');
  });

  it('shows the message of a rate limit without Retry-After and no time left', () => {
    const markup = sessionFailureMarkup({
      kind: 'rate-limited',
      message: 'Demasiados intentos.',
      retryAfterSeconds: null,
    });
    expect(markup).toContain('Demasiados intentos.');
    expect(markup).not.toContain('Podés volver a intentar');
  });
});

describe('the session view', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="session-status" tabindex="-1"></div>';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function retryButton(): HTMLButtonElement {
    const button = document.getElementById('session-retry');
    if (!(button instanceof HTMLButtonElement)) throw new Error('no «Reintentar»');
    return button;
  }

  it('draws the failure, focuses «Reintentar» and calls retry on a click', () => {
    const retry = vi.fn();
    createSessionView().showFailure({ kind: 'unreachable' }, retry);
    expect(document.activeElement).toBe(retryButton());
    retryButton().click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('keeps «Reintentar» disabled until Retry-After passes, and then focuses it', () => {
    createSessionView().showFailure(
      { kind: 'rate-limited', message: 'Demasiados intentos.', retryAfterSeconds: 2 },
      vi.fn(),
    );
    expect(retryButton().disabled).toBe(true);
    vi.advanceTimersByTime(1_999);
    expect(retryButton().disabled).toBe(true);
    vi.advanceTimersByTime(1);
    expect(retryButton().disabled).toBe(false);
    expect(document.activeElement).toBe(retryButton());
  });

  it('keeps the focus in its element when «Reintentar» gives way to the wait', () => {
    const view = createSessionView();
    view.showFailure({ kind: 'unreachable' }, vi.fn());
    view.showLoading();
    expect(document.activeElement).toBe(document.getElementById('session-status'));
  });

  it('leaves no status or alert behind when it clears', () => {
    const view = createSessionView();
    view.showLoading();
    view.clear();
    expect(document.getElementById('session-status')?.innerHTML).toBe('');
  });

  it('does nothing without its element', () => {
    document.body.innerHTML = '';
    expect(() => createSessionView().showFailure({ kind: 'unreachable' }, vi.fn())).not.toThrow();
  });
});
