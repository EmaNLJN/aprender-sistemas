// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos; `atlas` no pasa
// por un adaptador: la importa src/pages/atlas/model/atlas-catalog.ts.
import { loadAtlas } from './atlas.ts';
import { loadCampaign } from './campaign.ts';
import type { Language, SystemsDomain } from './catalogs.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
import { loadGuide } from './guide.ts';
import type { JsonRecord } from './shape.ts';
import { loadWorkshops } from './workshops.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
  cores: Record<SystemsDomain, JsonRecord[]>;
  campaign: Record<Language, JsonRecord[]>;
  workshops: Record<SystemsDomain, JsonRecord[]>;
  guide: JsonRecord;
  atlas: Record<Language, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
    cores: interleaveCores(rust, go),
    campaign: loadCampaign(root),
    workshops: loadWorkshops(root),
    guide: loadGuide(root),
    atlas: loadAtlas(root),
  };
}
