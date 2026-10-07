import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { repoRoot } from './sources.ts';

export interface BuiltScript {
  readonly name: string;
  readonly source: string;
}

export interface BuiltPage {
  readonly html: string;
  readonly scripts: readonly BuiltScript[];
  readonly bootText: string;
  readonly bootSize: number;
}

const SCRIPT = /<script\b[^>]*>([\s\S]*?)<\/script>/g;

export function readBuiltPage(root: string = repoRoot): BuiltPage {
  const html = readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
  const scripts = [...html.matchAll(SCRIPT)].map((match, index) => ({
    name: `dist/index.html:inline-script-${index + 1}`,
    source: match[1] ?? '',
  }));
  return { html, scripts, bootText: html, bootSize: html.length };
}

export function readBuiltContent(root: string = repoRoot): { fileName: string; bytes: Buffer } {
  const directory = path.join(root, 'dist', 'content');
  const names = readdirSync(directory).filter((name) =>
    /^curriculum\.[0-9a-f]{32}\.json$/.test(name),
  );
  assert.equal(
    names.length,
    1,
    `dist/content tiene ${names.length} curriculum.<versión>.json y debe tener uno`,
  );
  const [fileName = ''] = names;
  return { fileName, bytes: readFileSync(path.join(directory, fileName)) };
}

const BUILT_PAGE_URL = 'http://taller.test/';

export async function evaluateBuiltPage(page: BuiltPage, context: vm.Context): Promise<void> {
  for (const script of page.scripts) {
    const module = new vm.SourceTextModule(script.source, {
      context,
      identifier: script.name,
      initializeImportMeta(meta) {
        meta.url = BUILT_PAGE_URL;
      },
      importModuleDynamically() {
        throw new Error('la salida usa import() dinámico real: la compuerta no lo espera');
      },
    });
    await module.link(() => {
      throw new Error(`${script.name} importa otro archivo: lo resuelve evaluateBuiltPage`);
    });
    await module.evaluate();
  }
}
