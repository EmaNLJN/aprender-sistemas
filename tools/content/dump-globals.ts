import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import type { BuildOptions } from 'esbuild';

interface SystemsModel {
  initial(workshop: unknown): unknown;
  view(state: unknown, workshop: unknown): unknown;
  achieved(state: unknown, workshop: unknown): unknown;
}
interface SystemsGroup {
  workshops?: { id: string; model: string }[];
  models?: Record<string, SystemsModel>;
}

if (!process.argv[2]) throw new Error('Uso: node tools/content/dump-globals.ts <raíz del repo>');
const root = resolve(process.argv[2]);
const esbuild = createRequire(join(root, 'package.json'))('esbuild') as typeof import('esbuild');

// Not shared with qa/lib/sources.ts: the oracle also runs on another root (an earlier commit).
const files = [
  'frontend/src/app/legacy/register-catalogs.ts',
  ...['lowlevel', 'infra', 'play', 'pc'].map(
    (domain) => `frontend/src/app/legacy/register-systems-${domain}.ts`,
  ),
];

function bundleIife(entry: BuildOptions): string {
  const result = esbuild.buildSync({
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    logLevel: 'silent',
    ...entry,
  });
  const output = result.outputFiles?.[0];
  if (!output) throw new Error('esbuild no produjo salida');
  return output.text;
}

function loadInto(context: vm.Context, file: string): void {
  const text = bundleIife({ entryPoints: [join(root, file)] });
  vm.runInContext(text, context, { filename: file, timeout: 5000 });
}

function importsBundledJson(file: string): boolean {
  return readFileSync(join(root, file), 'utf8').includes('curriculum.json');
}

function loadPublishedContentInto(context: vm.Context): void {
  const directory = mkdtempSync(join(tmpdir(), 'dump-globals-'));
  try {
    const publisher = join(directory, 'publish.ts');
    const holder = join(root, 'frontend/src/shared/api/content/content-holder.ts');
    writeFileSync(
      publisher,
      `import { storeContent } from ${JSON.stringify(holder)};\n` +
        'storeContent(JSON.parse((globalThis as any).__DUMP_CONTENT__));\n',
    );
    const imports = [publisher, ...files.map((file) => join(root, file))]
      .map((file) => `import ${JSON.stringify(file)};`)
      .join('\n');
    const contentModule = join(root, 'frontend/src/app/content/content.ts');
    const contents =
      `${imports}\n` +
      `import { getContent } from ${JSON.stringify(contentModule)};\n` +
      'globalThis.__dumpedAtlas = getContent().atlas;\n';
    const text = bundleIife({
      stdin: { contents, resolveDir: root, loader: 'ts', sourcefile: 'dump-globals-entry.ts' },
    });
    context.__DUMP_CONTENT__ = readFileSync(join(root, 'build/curriculum.json'), 'utf8');
    vm.runInContext(text, context, { filename: 'dump-globals-entry.ts', timeout: 5000 });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const window: Record<string, unknown> = {};
const context = vm.createContext({ window, console });
const errors: Record<string, string> = {};
const publishesContent = !importsBundledJson(files[0]);
if (publishesContent) {
  try {
    loadPublishedContentInto(context);
  } catch (error) {
    errors['dump-globals-entry.ts'] = String((error as Error | undefined)?.message);
  }
} else {
  for (const file of files) {
    try {
      loadInto(context, file);
    } catch (error) {
      errors[file] = String((error as Error | undefined)?.message);
    }
  }
}

function canonical(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'function' ? '[function]' : v)),
  );
}

const out: Record<string, unknown> = { errors, globals: {} };
const globals = out.globals as Record<string, unknown>;
for (const name of Object.keys(window).sort()) globals[name] = canonical(window[name]);

const models: Record<string, unknown> = {};
for (const domain of ['SYSTEMS_LOWLEVEL', 'SYSTEMS_INFRA', 'SYSTEMS_PLAY', 'SYSTEMS_PC']) {
  const group = window[domain] as SystemsGroup | undefined;
  if (!group) continue;
  for (const workshop of group.workshops || []) {
    const model = (group.models || {})[workshop.model];
    if (!model) {
      models[workshop.id] = 'missing-model';
      continue;
    }
    try {
      const state = model.initial(workshop);
      models[workshop.id] = {
        initial: canonical(state),
        view: canonical(model.view(state, workshop)),
        achieved: canonical(model.achieved(state, workshop)),
      };
    } catch (error) {
      models[workshop.id] = 'error: ' + String((error as Error | undefined)?.message);
    }
  }
}
out.models = models;

async function legacyAtlas(): Promise<unknown> {
  const atlasCandidates = [
    'frontend/src/pages/atlas/model/atlas-catalog.ts',
    'frontend/src/pages/atlas/content/atlas-content.ts',
  ];
  const atlasEntry = atlasCandidates
    .map((candidate) => join(root, candidate))
    .find((candidate) => existsSync(candidate));
  if (!atlasEntry) throw new Error('No se encontró el módulo del Atlas');
  const atlas = esbuild.buildSync({
    entryPoints: [atlasEntry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    logLevel: 'silent',
  });
  const atlasUrl =
    'data:text/javascript;base64,' + Buffer.from(atlas.outputFiles[0].text).toString('base64');
  const atlasModule = (await import(atlasUrl)) as { atlasByLanguage: unknown };
  return atlasModule.atlasByLanguage;
}

out.atlas = canonical(publishesContent ? context.__dumpedAtlas : await legacyAtlas());

process.stdout.write(JSON.stringify(out));
if (Object.keys(errors).length > 0) process.exitCode = 1;
