import { loadAtlas } from './atlas.ts';
import { loadCampaign } from './campaign.ts';
import { expectOnlyEntries } from './catalog-files.ts';
import { LANGUAGES, type Language, type SystemsDomain } from './catalogs.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
import { loadGuide } from './guide.ts';
import type { JsonRecord } from './shape.ts';
import { loadWorkshops, type WorkshopStepKeys } from './workshops.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
  cores: Record<SystemsDomain, JsonRecord[]>;
  campaign: Record<Language, JsonRecord[]>;
  workshops: Record<SystemsDomain, JsonRecord[]>;
  guide: JsonRecord;
  atlas: Record<Language, JsonRecord[]>;
}

export interface CurriculumSource {
  curriculum: Curriculum;
  workshopSteps: WorkshopStepKeys;
}

export function loadCurriculumSource(root: string): CurriculumSource {
  expectOnlyEntries(
    root,
    'content',
    ['atlas', 'campaign', 'guide', 'workshops', ...LANGUAGES],
    'sólo se admiten atlas/, campaign/, guide/, workshops/, rust/ y go/',
  );
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  const { workshops, stepKeys } = loadWorkshops(root);
  const curriculum: Curriculum = {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
    cores: interleaveCores(rust, go),
    campaign: loadCampaign(root),
    workshops,
    guide: loadGuide(root),
    atlas: loadAtlas(root),
  };
  return { curriculum, workshopSteps: stepKeys };
}

export function loadCurriculum(root: string): Curriculum {
  return loadCurriculumSource(root).curriculum;
}
