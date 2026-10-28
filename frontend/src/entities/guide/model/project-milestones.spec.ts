import { describe, expect, it } from 'vitest';
import {
  MILESTONE_LANGUAGES,
  PROJECT_MILESTONES,
  milestoneHint,
  milestoneId,
} from './project-milestones';

const TITLES = [
  'Un lugar para guardar cosas',
  'Tu programa entiende comandos',
  'Los datos sobreviven al reinicio',
  'Medir antes de optimizar',
  'Una conversación por TCP',
];
const TEN_IDS = [
  'rust-memory',
  'rust-commands',
  'rust-files',
  'rust-measure',
  'rust-network',
  'go-memory',
  'go-commands',
  'go-files',
  'go-measure',
  'go-network',
];
const FIRST_HINT_TODAY =
  'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.';
const LAST_HINT =
  'TCP transporta un flujo de bytes: cada lectura no equivale a un comando completo. Acumulá bytes hasta el delimitador. Después podés investigar varios clientes y acceso compartido a los datos.';

describe('the catalog of project milestones', () => {
  it('has five milestones, in the order and with the titles of the page', () => {
    expect(PROJECT_MILESTONES.map((milestone) => milestone.title)).toEqual(TITLES);
  });

  it('builds the ten persisted ids, Rust first and then Go', () => {
    expect(
      MILESTONE_LANGUAGES.flatMap((language) =>
        PROJECT_MILESTONES.map((milestone) => milestoneId(language, milestone)),
      ),
    ).toEqual(TEN_IDS);
  });

  it('shares the hint of the last four milestones between the two languages', () => {
    const rest = PROJECT_MILESTONES.slice(1);
    expect(rest).toHaveLength(4);
    expect(rest.map((milestone) => milestoneHint(milestone, 'go'))).toEqual(
      rest.map((milestone) => milestoneHint(milestone, 'rust')),
    );
    expect(milestoneHint(PROJECT_MILESTONES[4], 'go')).toBe(LAST_HINT);
  });

  it('KNOWN DEFECT (spec 013, FR-015): the first milestone gives Go the hint that names Rust', () => {
    expect(milestoneHint(PROJECT_MILESTONES[0], 'rust')).toBe(FIRST_HINT_TODAY);
    expect(milestoneHint(PROJECT_MILESTONES[0], 'go')).toBe(FIRST_HINT_TODAY);
  });
});
