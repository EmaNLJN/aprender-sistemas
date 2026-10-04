// Conceptos del Atlas: content/atlas/manifest.yaml los ordena por lenguaje y cada
// content/atlas/<id>.yaml es un concepto de atlasByLanguage. `furtherSources` es opcional.
import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkSource,
  expectText,
  listOf,
  oneOf,
  type Check,
  type JsonRecord,
} from './shape.ts';

const CONCEPT_SPEC: Record<string, Check> = {
  id: expectText,
  level: oneOf(LEVEL_IDS),
  category: expectText,
  title: expectText,
  summary: expectText,
  why: expectText,
  code: expectText,
  explanation: expectText,
  comparison: expectText,
  pitfall: expectText,
  quiz: checkQuestion,
  labId: expectText,
  source: checkSource,
  furtherSources: listOf(checkSource, 1),
};

export function loadAtlas(root: string): Record<Language, JsonRecord[]> {
  return loadGroupedRecords(root, 'content/atlas', LANGUAGES, CONCEPT_SPEC, ['furtherSources']);
}
