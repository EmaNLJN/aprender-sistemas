// Talleres de Sistemas: content/workshops/manifest.yaml ordena los IDs por dominio y cada
// content/workshops/<id>.yaml es la ficha que publica SYSTEMS_<DOMINIO>.workshops. Cada dominio
// conserva su orden de claves legacy porque el YAML es el objeto tal cual.
import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
import { SYSTEMS_DOMAINS, type SystemsDomain } from './catalogs.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkRecord,
  checkSource,
  expectText,
  integer,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';

const perLanguage =
  (check: Check): Check =>
  (value, place) =>
    checkRecord(value, place, { rust: check, go: check });

const WORKSHOP_SPEC: Record<string, Check> = {
  id: expectText,
  // Las categorías que conoce systems.js.
  category: oneOf(['machine', 'infra', 'play']),
  model: expectText,
  level: oneOf(LEVEL_IDS),
  minutes: integer(1),
  title: expectText,
  subtitle: expectText,
  story: expectText,
  what: expectText,
  why: expectText,
  uses: textList(1),
  limits: expectText,
  objectives: listOf(
    (value, place) =>
      checkRecord(value, place, { id: expectText, label: expectText, why: expectText }),
    1,
  ),
  prediction: checkQuestion,
  steps: listOf(
    (value, place) =>
      checkRecord(value, place, {
        title: expectText,
        task: expectText,
        why: expectText,
        done: expectText,
      }),
    1,
  ),
  sources: listOf(checkSource, 1),
  code: perLanguage(expectText),
  related: perLanguage(textList(1)),
  bridge: perLanguage(expectText),
};

export function loadWorkshops(root: string): Record<SystemsDomain, JsonRecord[]> {
  return loadGroupedRecords(root, 'content/workshops', SYSTEMS_DOMAINS, WORKSHOP_SPEC);
}
