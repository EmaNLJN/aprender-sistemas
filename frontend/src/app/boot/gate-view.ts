import type { ContentLoadError } from '../../shared/api/content';
import type { GateView } from './content-gate';

const GENERAL_DETAIL =
  'El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.';
const VERSION_DETAIL =
  'El contenido del taller no se pudo cargar: puede que haya una versión nueva. Tu progreso sigue guardado en este navegador. Recargá la página y, si sigue igual, probá de nuevo.';

export const LOADING_MARKUP =
  '<section class="empty-state" data-content-gate="loading"><p role="status">Cargando el contenido del taller…</p></section>';

export function failureMarkup(kind: ContentLoadError['kind']): string {
  const detail = kind === 'version' ? VERSION_DETAIL : GENERAL_DETAIL;
  return (
    `<section class="empty-state" data-content-gate="failed" data-failure="${kind}">` +
    '<h2>No se pudo cargar el contenido</h2>' +
    `<p role="alert">${detail}</p>` +
    '<button class="button" id="content-retry" type="button">Reintentar</button>' +
    '</section>'
  );
}

export function createGateView(): GateView {
  const render = (markup: string): HTMLElement | null => {
    const main = document.getElementById('main');
    if (main) main.innerHTML = markup;
    return main;
  };
  return {
    showLoading() {
      const hadFocus = document.activeElement?.id === 'content-retry';
      const main = render(LOADING_MARKUP);
      if (hadFocus) main?.focus();
    },
    showFailure(failure, retry) {
      render(failureMarkup(failure.kind));
      const button = document.getElementById('content-retry');
      button?.addEventListener('click', retry);
      button?.focus();
    },
    clear() {
      render('');
    },
  };
}
