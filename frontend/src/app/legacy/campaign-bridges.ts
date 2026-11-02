import type {
  CampaignEngine,
  CampaignLabState,
  RefreshResult,
  SyncLabResult,
} from '../../entities/campaign';
import {
  CODE_XP,
  PREDICTION_XP,
  campaignLinkAccess,
  campaignMissionContext,
  missionTypeLabel,
} from '../../entities/campaign/bridge';
import type { ChallengeType } from '../../entities/exercise';
import { readLinkQuery, worldHref } from '../../shared/config/url-grammar';
import { escapeHtml } from '../../shared/lib/escape-html';

interface CampaignLab {
  getExercises(): readonly { id: string; challengeType?: ChallengeType }[];
  exportState(): CampaignLabState;
}

export interface CampaignBridges {
  refresh(): RefreshResult;
  sync(): SyncLabResult;
  returnURL(worldId: string): string;
  exerciseContextHTML(id: string, language: string): string;
  lockedExerciseHTML(id: string, language: string): string;
}

const engine: CampaignEngine = window.TallerCampaignEngine;
const lab = (): CampaignLab => window.TallerLab as unknown as CampaignLab;

function refresh(): RefreshResult {
  return engine.refreshFromLab(lab().exportState());
}

function sync(): SyncLabResult {
  return engine.syncLab(lab().exportState());
}

function exerciseContextHTML(id: string, language: string): string {
  const worldId = readLinkQuery(location.search).missionWorld;
  if (!worldId) return '';
  refresh();
  const context = campaignMissionContext(engine.getWorlds(language), worldId, id);
  if (!context) return '';
  const exercise = lab()
    .getExercises()
    .find((item) => item.id === id);
  return `<div class="quest-lab-context"><a href="${worldHref(context.worldId)}">← ${escapeHtml(context.worldTitle)}</a><span>${context.points}/${CODE_XP + PREDICTION_XP} XP · ${escapeHtml(missionTypeLabel(exercise?.challengeType))}</span><span>${context.code ? '✓' : '○'} Pruebas ${context.prediction ? '✓' : '○'} Predicción</span></div>`;
}

function lockedExerciseHTML(id: string, language: string): string {
  const worldId = readLinkQuery(location.search).missionWorld;
  if (!worldId) return '';
  const access = campaignLinkAccess(
    engine.getWorlds(language),
    worldId,
    id,
    engine.canAttempt(id, language),
  );
  if (access.allowed) return '';
  return `<section class="quest-direct-lock"><div class="eyebrow">CAMPAÑA · ACCESO A LA MISIÓN</div><h1>Primero, las piezas<br><em>que te preparan.</em></h1><p>Esta misión todavía no está disponible en tu campaña.</p><ul>${access.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul><a class="button" href="${access.worldId ? worldHref(access.worldId) : '#campana'}">Ver mi mapa →</a></section>`;
}

export const campaignBridges: CampaignBridges = {
  refresh,
  sync,
  returnURL: worldHref,
  exerciseContextHTML,
  lockedExerciseHTML,
};
