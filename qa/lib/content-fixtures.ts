// Utilidades compartidas por los checks de contenido (qa/content-*-check.ts): directorios
// temporales con archivos, aserción de ContentError y contador de escenarios.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ContentError } from '../../tools/content/content-error.ts';

const roots: string[] = [];

// Se borran al salir aunque un escenario falle y corte el proceso con una excepción.
process.on('exit', () => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

// Crea un directorio temporal con los archivos dados (ruta relativa -> contenido).
export function fixture(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-content-'));
  roots.push(root);
  for (const [file, data] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), data);
  }
  return root;
}

export function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

export interface Scenarios {
  test(title: string, run: () => void): void;
  done(): void;
}

// `test` corre un escenario y escribe `PASS <título>`; `done` escribe el total del check.
export function scenarios(name: string): Scenarios {
  let passed = 0;
  return {
    test(title, run) {
      run();
      passed++;
      console.log('PASS ' + title);
    },
    done() {
      console.log(`${passed} ${name} scenarios PASS.`);
    },
  };
}
