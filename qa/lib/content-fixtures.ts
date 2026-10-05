import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ContentError } from '../../tools/content/content-error.ts';

const roots: string[] = [];

process.on('exit', () => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

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
    assert.ok(error instanceof ContentError, `ContentError expected: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

export interface Scenarios {
  test(title: string, run: () => void): void;
  done(): void;
}

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
