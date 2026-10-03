import { createRoot, type Root } from 'react-dom/client';
import { atlasByLanguage, type AtlasLanguage } from './atlas-content';
import { AtlasView, type AtlasSession } from './AtlasView';

declare global {
  interface Window {
    TallerAtlas: Readonly<{ mount: typeof mount; unmount: typeof unmount }>;
  }
}

function blankSession(): AtlasSession {
  return {
    query: '',
    level: 'all',
    category: 'all',
    selected: null,
    answers: {},
    compared: {},
    pitfalls: {},
  };
}

const sessions: Record<AtlasLanguage, AtlasSession> = { rust: blankSession(), go: blankSession() };
let root: Root | null = null;

function unmount() {
  root?.unmount();
  root = null;
}

function mount(host: HTMLElement | null, requestedLanguage: string = 'rust'): void {
  unmount();
  if (!host) return;

  const language: AtlasLanguage = requestedLanguage === 'go' ? 'go' : 'rust';
  root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar el Atlas.', error);
    },
  });
  root.render(
    <AtlasView
      entries={atlasByLanguage[language] || []}
      initialSession={sessions[language]}
      language={language}
      onSessionChange={(session) => {
        sessions[language] = session;
      }}
    />,
  );
}

window.TallerAtlas = Object.freeze({ mount, unmount });
