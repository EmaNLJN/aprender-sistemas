import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { buildHarness, exportedProgress } from './app-shell-harness.ts';
import {
  loadCampaignEngine,
  loadLab,
  loadLabCatalogs,
  loadSystemsEngine,
} from './legacy-sources.ts';
import { plainJson } from './plain-json.ts';
import { repoRoot } from './sources.ts';

export const SECTIONS = ['route', 'lab', 'campaign', 'systems'] as const;
export type SectionName = (typeof SECTIONS)[number];
export type Sections = Record<SectionName, unknown>;
export type ImportSource = 'storage' | 'export';

export interface Written {
  exercises: number;
  drafts: number;
  attempts: number;
  campaignSeals: number;
  campaignCheckpoints: number;
  workshops: number;
  workshopObjectives: number;
  workshopSteps: number;
  routeMarks: number;
  routeQuiz: number;
  routeNotes: number;
  preferences: number;
}

export interface ImportCase {
  id: string;
  source: ImportSource;
  fixture: string;
  raw: string;
  normalized: Sections;
  expect: { written: Written };
}

export interface ImportCases {
  format: number;
  contract: string;
  parsers: Record<SectionName, string>;
  cases: ImportCase[];
}

const SHARED = join(import.meta.dirname, '..', 'fixtures', 'shared');
const STEPS_FIXTURE = join(import.meta.dirname, '..', 'fixtures', 'workshop-steps-v1.json');

const STORAGE_KEYS: Record<SectionName, string> = {
  route: 'taller-learning-v1',
  lab: 'taller-laboratorio-v1',
  campaign: 'taller-campaign-v1',
  systems: 'taller-systems-v1',
};

const MIN_DATETIME_MS = Date.UTC(1000, 0, 1);
const MAX_DATETIME_MS = Date.UTC(9999, 11, 31, 23, 59, 59, 999);

export function readImportCases(directory: string = SHARED): ImportCases {
  const bytes = readFileSync(join(directory, 'import-cases.json'));
  const pinned = readFileSync(join(directory, 'import-cases.sha256'), 'utf8')
    .trim()
    .split(/\s+/)[0];
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pinned) {
    throw new Error(
      `import-cases.json cambió (${actual}) y import-cases.sha256 dice ${pinned}: es un fixture congelado`,
    );
  }
  return JSON.parse(bytes.toString('utf8')) as ImportCases;
}

export function rawOfFixture(source: ImportSource, fixture: string): string {
  const text = readFileSync(join(repoRoot, fixture), 'utf8');
  return source === 'storage' ? JSON.stringify(JSON.parse(text)) : text;
}

export function sectionsOfRaw(source: ImportSource, raw: string): Sections {
  if (source === 'storage') {
    const stored = JSON.parse(raw) as Record<string, string>;
    const parsed = (name: SectionName): unknown => JSON.parse(stored[STORAGE_KEYS[name]]);
    return {
      route: parsed('route'),
      lab: parsed('lab'),
      campaign: parsed('campaign'),
      systems: parsed('systems'),
    };
  }
  const file = JSON.parse(raw) as Record<string, unknown>;
  return {
    route: omitKeys(file, ['lab', 'campaign', 'systems', 'exportedAt']),
    lab: file.lab,
    campaign: file.campaign,
    systems: file.systems,
  };
}

function omitKeys(object: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

export async function normalizeWithParsers(source: ImportSource, raw: string): Promise<Sections> {
  const sections = sectionsOfRaw(source, raw);
  return { route: await parseRoute(sections.route), ...parseStores(sections) };
}

async function parseRoute(section: unknown): Promise<unknown> {
  const harness = buildHarness({ storedRaw: JSON.stringify(section) });
  const exported = await exportedProgress(harness);
  return omitKeys(exported, ['lab', 'campaign', 'systems', 'exportedAt']);
}

interface StoreEngine {
  init(config: unknown): unknown;
  exportState(): unknown;
}

interface StoreWindow {
  TallerLab: StoreEngine & { getExercises(): unknown[] };
  TallerCampaignEngine: StoreEngine;
  TallerSystemsEngine: StoreEngine;
  RUST_CAMPAIGN: unknown[];
  GO_CAMPAIGN: unknown[];
  SYSTEMS_PC: SystemsPackage;
  SYSTEMS_LOWLEVEL: SystemsPackage;
  SYSTEMS_INFRA: SystemsPackage;
  SYSTEMS_PLAY: SystemsPackage;
}

interface SystemsPackage {
  workshops: unknown[];
  models: Record<string, unknown>;
}

function parseStores(sections: Sections): Pick<Sections, 'lab' | 'campaign' | 'systems'> {
  const stored = new Map<string, string>([
    [STORAGE_KEYS.lab, JSON.stringify(sections.lab)],
    [STORAGE_KEYS.campaign, JSON.stringify(sections.campaign)],
    [STORAGE_KEYS.systems, JSON.stringify(sections.systems)],
  ]);
  const window = {} as StoreWindow;
  const context = vm.createContext({
    window,
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    },
  });
  loadLabCatalogs(context);
  loadLab(context);
  loadCampaignEngine(context);
  loadSystemsEngine(context);

  const exercises = window.TallerLab.getExercises();
  window.TallerCampaignEngine.init({
    exercises,
    worlds: { rust: window.RUST_CAMPAIGN, go: window.GO_CAMPAIGN },
  });
  const packages = [
    window.SYSTEMS_PC,
    window.SYSTEMS_LOWLEVEL,
    window.SYSTEMS_INFRA,
    window.SYSTEMS_PLAY,
  ];
  window.TallerSystemsEngine.init({
    workshops: packages.flatMap((systemsPackage) => systemsPackage.workshops),
    models: Object.assign({}, ...packages.map((systemsPackage) => systemsPackage.models)),
    exercises,
  });
  return {
    lab: plainJson(window.TallerLab.exportState()),
    campaign: plainJson(window.TallerCampaignEngine.exportState()),
    systems: plainJson(window.TallerSystemsEngine.exportState()),
  };
}

type Record_ = Record<string, unknown>;

function recordsOf(section: unknown, key: string): Record_[] {
  const container = (section as Record_)[key] as Record_;
  return Object.values(container) as Record_[];
}

function isDatetimeMillisecond(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_DATETIME_MS &&
    value <= MAX_DATETIME_MS
  );
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value !== '';
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function countWritten(normalized: Sections): Written {
  const stepPositions = JSON.parse(readFileSync(STEPS_FIXTURE, 'utf8')) as Record<
    string,
    { v1Index: number }[]
  >;
  const labRecords = recordsOf(normalized.lab, 'records');
  const workshopEntries = Object.entries((normalized.systems as Record_).records as Record_);
  const route = normalized.route as Record_;
  const notes = route.notes as Record<string, Record<string, unknown>>;

  const workshopSteps = workshopEntries.map(([key, record]) => {
    const known = (stepPositions[key.split(':')[1]] ?? []).map((step) => step.v1Index);
    return (record as { steps: number[] }).steps.filter((position) => known.includes(position))
      .length;
  });
  const objectives = workshopEntries.map(
    ([, record]) => (record as { observed: string[] }).observed.length,
  );

  return {
    exercises: labRecords.length,
    drafts: labRecords.filter((record) => hasText(record.draft)).length,
    attempts: labRecords.filter((record) =>
      isDatetimeMillisecond((record.result as Record_ | undefined)?.time),
    ).length,
    campaignSeals: Object.keys((normalized.campaign as Record_).seals as Record_).length,
    campaignCheckpoints: Object.keys((normalized.campaign as Record_).checkpoints as Record_)
      .length,
    workshops: workshopEntries.length,
    workshopObjectives: sum(objectives),
    workshopSteps: sum(workshopSteps),
    routeMarks: sum(
      ['completed', 'milestones', 'favorites'].map((kind) => (route[kind] as unknown[]).length),
    ),
    routeQuiz: Object.keys(route.quizAnswers as Record_).length,
    routeNotes: Object.values(notes)
      .flatMap((language) => Object.values(language))
      .filter(hasText).length,
    preferences: 1,
  };
}
