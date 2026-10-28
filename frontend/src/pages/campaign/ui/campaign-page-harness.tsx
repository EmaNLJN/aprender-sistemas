import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import {
  campaignEngine,
  type CampaignConfig,
  type CampaignLabState,
  type CampaignLanguage,
} from '../../../entities/campaign';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { createCampaignSession, type CampaignSession } from '../model/campaign-session';
import { openCampaignSession } from '../model/open-campaign-session';
import type { MissionContent } from '../model/types';
import CampaignPage from './CampaignPage';

export interface RecordingStorage extends StorageLike {
  items: Map<string, string>;
  writes: string[];
  failWrites: boolean;
}

export function memoryStorage(initial: Record<string, string> = {}): RecordingStorage {
  const storage: RecordingStorage = {
    items: new Map(Object.entries(initial)),
    writes: [],
    failWrites: false,
    getItem: (key) => storage.items.get(key) ?? null,
    setItem(key, value) {
      if (storage.failWrites)
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      storage.writes.push(key);
      storage.items.set(key, value);
    },
    removeItem(key) {
      storage.writes.push(key);
      storage.items.delete(key);
    },
  };
  return storage;
}

export function realCampaign(): CampaignConfig {
  return {
    exercises: [
      ...curriculum.lab.rust,
      ...curriculum.quests.rust,
      ...curriculum.lab.go,
      ...curriculum.quests.go,
      ...curriculum.cores.lowlevel,
      ...curriculum.cores.infra,
      ...curriculum.cores.play,
      ...curriculum.cores.pc,
    ],
    worlds: curriculum.campaign,
  } as CampaignConfig;
}

export function realMissions(language: CampaignLanguage): Map<string, MissionContent> {
  return new Map(
    [...curriculum.lab[language], ...curriculum.quests[language]].map((exercise) => [
      exercise.id,
      {
        title: exercise.title,
        objective: exercise.objective,
        challengeType: 'challengeType' in exercise ? exercise.challengeType : undefined,
      },
    ]),
  ) as Map<string, MissionContent>;
}

export interface CampaignPageSetup {
  config: CampaignConfig;
  missions: ReadonlyMap<string, MissionContent>;
  language?: CampaignLanguage;
  stored?: Record<string, string>;
  labState?: CampaignLabState | null;
  session?: CampaignSession;
  linkedWorldId?: string | null;
  blockedStorage?: boolean;
}

export function renderCampaignPage(setup: CampaignPageSetup) {
  const storage = memoryStorage(setup.stored);
  if (setup.blockedStorage)
    storage.getItem = () => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    };
  vi.stubGlobal('localStorage', storage);
  campaignEngine.init(setup.config, setup.labState ?? null);
  const language = setup.language ?? 'rust';
  const notify = vi.fn<(message: string) => void>();
  const onSessionChange = vi.fn<(session: CampaignSession) => void>();
  const initialSession = openCampaignSession(
    setup.session ?? createCampaignSession(),
    language,
    setup.linkedWorldId ?? null,
  );
  const user = userEvent.setup();
  const view = render(
    <CampaignPage
      language={language}
      missions={setup.missions}
      initialSession={initialSession}
      notify={notify}
      onSessionChange={onSessionChange}
    />,
  );
  return { ...view, user, storage, notify, onSessionChange };
}
