// Entrada de qa/atlas-check.ts: empaquetada junto con AtlasPage para que
// react-dom/server y la página compartan la misma copia de React.
import type { ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { AtlasPage, createAtlasSession } from '../../frontend/src/pages/atlas/index.ts';
import type { AtlasLanguage } from '../../frontend/src/pages/atlas/index.ts';

type AtlasEntries = ComponentProps<typeof AtlasPage>['entries'];

export const renderAtlasPage = (language: AtlasLanguage, entries: AtlasEntries): string =>
  renderToString(
    <AtlasPage
      entries={entries}
      initialSession={createAtlasSession()}
      language={language}
      onSessionChange={() => {}}
    />,
  );
