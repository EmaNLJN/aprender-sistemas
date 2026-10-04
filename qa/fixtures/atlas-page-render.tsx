// Entrada de qa/atlas-check.ts: empaquetada junto con AtlasPage para que
// react-dom/server y la página compartan la misma copia de React.
import { renderToString } from 'react-dom/server';
import { AtlasPage, atlasByLanguage, createAtlasSession } from '../../src/pages/atlas/index.ts';
import type { AtlasLanguage } from '../../src/pages/atlas/index.ts';

export const renderAtlasPage = (language: AtlasLanguage): string =>
  renderToString(
    <AtlasPage
      entries={atlasByLanguage[language]}
      initialSession={createAtlasSession()}
      language={language}
      onSessionChange={() => {}}
    />,
  );
