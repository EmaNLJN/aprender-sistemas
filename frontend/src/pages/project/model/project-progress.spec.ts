import { describe, expect, it } from 'vitest';
import { projectProgress } from './project-progress';

const HEADINGS = [
  '01. Un lugar para guardar cosas',
  '02. Tu programa entiende comandos',
  '03. Los datos sobreviven al reinicio',
  '04. Medir antes de optimizar',
  '05. Una conversación por TCP',
];
const FIRST_HINT_TODAY =
  'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.';
const FIRST_HINT_GO =
  'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Go podés empezar con un map[string]string creado con make; leé con valor, ok := datos[clave] para distinguir una clave que no existe de un valor vacío.';

describe('the progress shown by the project page', () => {
  it('lists the five milestones of Rust with their numbered headings and their ids', () => {
    const { milestones } = projectProgress([], 'rust');
    expect(milestones.map((milestone) => milestone.heading)).toEqual(HEADINGS);
    expect(milestones.map((milestone) => milestone.id)).toEqual([
      'rust-memory',
      'rust-commands',
      'rust-files',
      'rust-measure',
      'rust-network',
    ]);
  });

  it('uses the same headings and the Go ids on the Go page', () => {
    const { milestones } = projectProgress([], 'go');
    expect(milestones.map((milestone) => milestone.heading)).toEqual(HEADINGS);
    expect(milestones.map((milestone) => milestone.id)).toEqual([
      'go-memory',
      'go-commands',
      'go-files',
      'go-measure',
      'go-network',
    ]);
  });

  it('counts only the marks of the active language', () => {
    const progress = projectProgress(['rust-memory', 'go-files', 'go-network'], 'go');
    expect(progress.completedCount).toBe(2);
    expect(
      progress.milestones
        .filter((milestone) => milestone.completed)
        .map((milestone) => milestone.id),
    ).toEqual(['go-files', 'go-network']);
  });

  it('counts 0 in Go and 1 in Rust with the marks of the frozen master progress', () => {
    expect(projectProgress(['rust-memory'], 'go').completedCount).toBe(0);
    expect(projectProgress(['rust-memory'], 'rust').completedCount).toBe(1);
  });

  it('ignores a mark that the catalog does not have', () => {
    expect(projectProgress(['go-inexistente'], 'go').completedCount).toBe(0);
  });

  it('keeps the task and the done criteria of the second milestone', () => {
    const second = projectProgress([], 'rust').milestones[1];
    expect(second.task).toBe(
      'Leé comandos desde la entrada estándar. Separá el texto recibido de la operación que ejecuta el almacén y devolvé errores claros.',
    );
    expect(second.doneWhen).toBe(
      'SET nombre Ana y GET nombre funcionan. Un comando desconocido o incompleto muestra un error sin terminar el programa.',
    );
  });

  it('shows the hint of the active language, and the one of Go does not name Rust', () => {
    expect(projectProgress([], 'rust').milestones[0].hint).toBe(FIRST_HINT_TODAY);
    expect(projectProgress([], 'go').milestones[0].hint).toBe(FIRST_HINT_GO);
    expect(projectProgress([], 'go').milestones[0].hint).not.toContain('Rust');
  });
});
