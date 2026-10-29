import { createRoot, type Root } from 'react-dom/client';
import type { Exercise } from '../../entities/exercise';
import { mergeModelGroups } from '../../entities/systems-simulation';
import type {
  SystemsInitResult,
  SystemsSyncResult,
  SystemsWorkshop,
} from '../../entities/systems-workshop';
import {
  workshopExerciseRole,
  workshopMissionIds,
  workshopReturnTarget,
} from '../../entities/systems-workshop/bridge';
import {
  SystemsPage,
  resetSimulations,
  type SystemsModelRegistry,
  type SystemsWorkshopView,
} from '../../pages/systems';
import { readLinkQuery, workshopReturnHref } from '../../shared/config/url-grammar';
import { stop } from '../../shared/lib/celebration';
import { escapeHtml } from '../../shared/lib/escape-html';
import { UrlStateProvider, startUrlStateSync } from './url-state';

interface SystemsLab {
  getExercises(): Exercise[];
  exportState(): unknown;
}

interface BridgedWorkshop extends SystemsWorkshop {
  title: string;
  related?: Readonly<Record<string, readonly string[]>>;
}

interface SystemsPackage {
  workshops: SystemsWorkshop[];
  models: object;
}

type Toast = (message: string) => void;

interface TallerSystemsAdapter {
  init(): SystemsInitResult;
  refresh(): SystemsSyncResult;
  sync(): SystemsSyncResult;
  mount(host: HTMLElement | null, lang: string, toast: Toast): void;
  unmount(): void;
  returnURL(id: string, lang?: string): string;
  missionIDs(id: string, lang: string): string[];
  exerciseContextHTML(id: string, lang: string): string;
  resetSimulations(): void;
}

declare global {
  interface Window {
    TallerSystems: TallerSystemsAdapter;
  }
}

const engine = window.TallerSystemsEngine;
let models: SystemsModelRegistry = {};
let mountedLanguage = 'rust';
let root: Root | null = null;

function lab(): SystemsLab {
  return window.TallerLab as unknown as SystemsLab;
}

function packages(): SystemsPackage[] {
  const sources: SystemsPackage[] = [
    window.SYSTEMS_PC,
    window.SYSTEMS_LOWLEVEL,
    window.SYSTEMS_INFRA,
    window.SYSTEMS_PLAY,
  ];
  return sources.filter(Boolean);
}

function workshops(): BridgedWorkshop[] {
  return packages().flatMap((source) => source.workshops) as BridgedWorkshop[];
}

function refresh(): SystemsSyncResult {
  return engine.refreshFromLab(lab().exportState());
}

function sync(): SystemsSyncResult {
  return engine.syncLab(lab().exportState());
}

function init(): SystemsInitResult {
  models = mergeModelGroups(packages().map((source) => source.models)) as SystemsModelRegistry;
  return engine.init({ workshops: workshops(), models, exercises: lab().getExercises() });
}

function unmount(): void {
  root?.unmount();
  root = null;
  stop();
}

function mount(host: HTMLElement | null, lang: string, toast: Toast): void {
  unmount();
  if (!host) return;
  const language = lang === 'go' ? 'go' : 'rust';
  mountedLanguage = language;
  startUrlStateSync();
  refresh();
  root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar Sistemas.', error);
    },
  });
  root.render(
    <UrlStateProvider>
      <SystemsPage
        language={language}
        models={models}
        exercises={lab().getExercises()}
        notify={toast}
        downloadKit={(workshop: SystemsWorkshopView) =>
          window.TallerProjectKit.download(workshop, language)
        }
        scrollToTop={() => host.scrollIntoView({ block: 'start' })}
      />
    </UrlStateProvider>,
  );
}

function returnURL(id: string, lang: string = mountedLanguage): string {
  return workshopReturnHref(workshopReturnTarget(id, lang));
}

function missionIDs(id: string, lang: string): string[] {
  return workshopMissionIds(
    workshops().find((item) => item.id === id),
    lang,
  );
}

function exerciseContextHTML(id: string, lang: string): string {
  const parent = readLinkQuery(location.search).missionWorkshop;
  const workshop = workshops().find((item) => item.id === parent);
  const role = workshopExerciseRole(workshop, id, lang);
  if (!role || !workshop || parent === null) return '';
  refresh();
  const progress = engine.get(parent, lang);
  return `<div class="quest-lab-context"><a href="${workshopReturnHref(workshopReturnTarget(parent, lang))}">← ${escapeHtml(workshop.title)}</a><span>${role === 'core' ? 'Núcleo del taller' : 'Herramienta previa'}</span><span>${progress.progress.code ? '✓ Núcleo verificado' : 'Tres pruebas para verificar el núcleo'}</span></div>`;
}

window.TallerSystems = {
  init,
  refresh,
  sync,
  mount,
  unmount,
  returnURL,
  missionIDs,
  exerciseContextHTML,
  resetSimulations,
};
