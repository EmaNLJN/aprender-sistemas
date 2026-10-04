import { createRoot, type Root } from 'react-dom/client';
import {
  AtlasPage,
  atlasByLanguage,
  createAtlasSession,
  type AtlasLanguage,
  type AtlasSession,
} from '../../pages/atlas';

declare global {
  interface Window {
    TallerAtlas: Readonly<{ mount: typeof mount; unmount: typeof unmount }>;
  }
}

const sessions: Record<AtlasLanguage, AtlasSession> = {
  rust: createAtlasSession(),
  go: createAtlasSession(),
};
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
    <AtlasPage
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
