import { createRoot, type Root } from 'react-dom/client';
import { ProjectPage } from '../../pages/project';

declare global {
  interface Window {
    TallerProjectPage: Readonly<{ mount: typeof mount; unmount: typeof unmount }>;
  }
}

let root: Root | null = null;

function unmount(): void {
  root?.unmount();
  root = null;
}

function mount(host: HTMLElement | null, requestedLanguage: string = 'rust'): void {
  unmount();
  if (!host) return;

  const language = requestedLanguage === 'go' ? 'go' : 'rust';
  root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar el proyecto.', error);
    },
  });
  root.render(<ProjectPage language={language} />);
}

window.TallerProjectPage = Object.freeze({ mount, unmount });
