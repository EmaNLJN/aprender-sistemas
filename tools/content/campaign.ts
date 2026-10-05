// Mundos de campaña: content/campaign/manifest.yaml ordena los IDs por lenguaje y cada
// content/campaign/<id>.yaml es un mundo de RUST_CAMPAIGN o GO_CAMPAIGN.
import { LEVEL_IDS } from '../../frontend/src/shared/config/levels.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkSource,
  expectText,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';

const WORLD_SPEC: Record<string, Check> = {
  id: expectText,
  level: oneOf(LEVEL_IDS),
  title: expectText,
  subtitle: expectText,
  story: expectText,
  concepts: textList(1),
  why: expectText,
  guide: textList(1),
  trainingIds: textList(1),
  challengeIds: textList(1),
  bossId: expectText,
  checkpoint: checkQuestion,
  badge: expectText,
  sources: listOf(checkSource, 1),
};

export function loadCampaign(root: string): Record<Language, JsonRecord[]> {
  return loadGroupedRecords(root, 'content/campaign', LANGUAGES, WORLD_SPEC);
}
