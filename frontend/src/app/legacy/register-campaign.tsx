import { createRoot, type Root } from 'react-dom/client';
import type { CampaignLanguage } from '../../entities/campaign';
import {
  CampaignPage,
  createCampaignSession,
  openCampaignSession,
  type CampaignSession,
  type MissionContent,
} from '../../pages/campaign';
import { readLinkQuery } from '../../shared/config/url-grammar';
import { stop } from '../../shared/lib/celebration';
import { getContent, type Content } from '../content/content';
import { campaignBridges, type CampaignBridges } from './campaign-bridges';

declare global {
  interface Window {
    TallerCampaign: Readonly<CampaignBridges & { mount: typeof mount; unmount: typeof unmount }>;
  }
}

let session: CampaignSession = createCampaignSession();
let root: Root | null = null;

function missionContentFor(
  content: Content,
  language: CampaignLanguage,
): Map<string, MissionContent> {
  return new Map(
    [...content.lab[language], ...content.quests[language]].map((exercise) => [
      exercise.id,
      {
        title: exercise.title,
        objective: exercise.objective,
        challengeType: exercise.challengeType,
      },
    ]),
  );
}

function unmount(): void {
  root?.unmount();
  root = null;
  stop();
}

function mount(
  host: HTMLElement | null,
  requestedLanguage: string,
  notify: (message: string) => void,
): void {
  unmount();
  if (!host) return;
  const language: CampaignLanguage = requestedLanguage === 'go' ? 'go' : 'rust';
  campaignBridges.refresh();
  session = openCampaignSession(session, language, readLinkQuery(location.search).world);
  root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar la campaña.', error);
    },
  });
  root.render(
    <CampaignPage
      language={language}
      missions={missionContentFor(getContent(), language)}
      initialSession={session}
      notify={notify}
      onSessionChange={(next) => {
        session = next;
      }}
    />,
  );
}

window.TallerCampaign = Object.freeze({ mount, unmount, ...campaignBridges });
