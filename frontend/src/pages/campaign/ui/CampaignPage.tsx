import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useStore } from 'zustand';
import {
  PASS_SCORE,
  campaignCounts,
  campaignEngine,
  type CampaignLanguage,
  type CheckpointAnswerResult,
  type MissionFilter,
} from '../../../entities/campaign';
import { FREE_LAB_HREF, withWorldQuery } from '../../../shared/config/url-grammar';
import { celebrate } from '../../../shared/lib/celebration';
import { selectWorld, setMissionFilter, type CampaignSession } from '../model/campaign-session';
import type { MissionContent } from '../model/types';
import CampaignHero from './CampaignHero';
import CampaignRules from './CampaignRules';
import LockedWorld from './LockedWorld';
import OpenWorld from './OpenWorld';
import SelectedWorld from './SelectedWorld';
import TrophyCase from './TrophyCase';
import WorldMap from './WorldMap';

interface CampaignPageProps {
  language: CampaignLanguage;
  missions: ReadonlyMap<string, MissionContent>;
  initialSession: CampaignSession;
  notify: (message: string) => void;
  onSessionChange: (session: CampaignSession) => void;
}

const selectRevision = (state: { revision: number }) => state.revision;

const CampaignPage = ({
  language,
  missions,
  initialSession,
  notify,
  onSessionChange,
}: CampaignPageProps) => {
  useStore(campaignEngine.changes, selectRevision);
  const [session, setSession] = useState(initialSession);
  const latestSession = useRef(initialSession);
  const worldSectionRef = useRef<HTMLElement>(null);
  const worldTitleRef = useRef<HTMLHeadingElement>(null);
  const worlds = campaignEngine.getWorlds(language);
  const summary = campaignEngine.getSummary(language);
  const world = worlds.find((item) => item.id === session.selected) ?? worlds[0];

  const updateSession = (change: (current: CampaignSession) => CampaignSession) => {
    const next = change(latestSession.current);
    latestSession.current = next;
    onSessionChange(next);
    setSession(next);
  };

  const chooseWorld = (worldId: string) => {
    history.replaceState(null, '', withWorldQuery(new URL(location.href), worldId));
    flushSync(() => updateSession((current) => selectWorld(current, worldId)));
    worldSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    worldTitleRef.current?.focus({ preventScroll: true });
  };

  const chooseFilter = (filter: MissionFilter, button: HTMLButtonElement) => {
    flushSync(() => updateSession((current) => setMissionFilter(current, filter)));
    button.focus({ preventScroll: true });
  };

  const answerCheckpoint = (worldId: string, index: number, option: HTMLButtonElement) => {
    const before = campaignEngine.getWorlds(language).find((item) => item.id === worldId);
    let result!: CheckpointAnswerResult;
    flushSync(() => {
      result = campaignEngine.answerCheckpoint(worldId, index);
    });
    if (!result.accepted) {
      notify(result.reasons.join(' '));
      return;
    }
    option.focus({ preventScroll: true });
    const after = campaignEngine.getWorlds(language).find((item) => item.id === worldId);
    if (!before?.completed && after?.completed) {
      celebrate();
      const finished =
        campaignEngine.getSummary(language).completedWorlds ===
        campaignEngine.getWorlds(language).length;
      notify(
        `¡${after.badge}! ${finished ? 'Completaste los cuatro mundos. Es hora de llevarlo a tu proyecto.' : 'Un mundo completado. Tu próximo nivel está disponible.'}`,
      );
    } else
      notify(
        result.correct
          ? 'Checkpoint superado. Tu explicación conecta las piezas.'
          : 'Leé el porqué y probá otra explicación.',
      );
  };

  if (!world) return <p>La campaña todavía no tiene mundos disponibles.</p>;

  const completed = worlds.filter((item) => item.completed).length;
  const previous = worlds.find((item) => item.unlocked && !item.completed);
  const nextWorld = worlds[worlds.findIndex((item) => item.id === world.id) + 1];
  return (
    <>
      <CampaignHero
        language={language}
        counts={campaignCounts(worlds)}
        summary={summary}
        completed={completed}
      />
      {summary.storageAvailable === false ? (
        <p className="quest-mode-note" role="status">
          Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.
        </p>
      ) : null}
      <div className="quest-mode-note">
        <span aria-hidden="true">↗</span>
        <p>
          <strong>Una ruta con propósito.</strong> Cada mundo abre el siguiente al reunir{' '}
          {PASS_SCORE} XP, verificar sus seis misiones, resolver la predicción final y superar su
          checkpoint. Tu <a href={FREE_LAB_HREF}>laboratorio libre</a> sigue disponible.
        </p>
      </div>
      <WorldMap worlds={worlds} selectedId={world.id} onChoose={chooseWorld} />
      <SelectedWorld world={world} sectionRef={worldSectionRef} titleRef={worldTitleRef}>
        {world.unlocked ? (
          <OpenWorld
            world={world}
            nextWorld={nextWorld}
            missions={missions}
            filter={session.filter}
            onChooseWorld={chooseWorld}
            onFilter={chooseFilter}
            onAnswer={answerCheckpoint}
          />
        ) : (
          <LockedWorld world={world} previous={previous} onChoose={chooseWorld} />
        )}
      </SelectedWorld>
      <TrophyCase worlds={worlds} />
      <CampaignRules />
    </>
  );
};

export default CampaignPage;
