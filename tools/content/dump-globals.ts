import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

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

function loadInto(context: vm.Context, file: string): void {
  const result = esbuild.buildSync({
    entryPoints: [join(root, file)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    logLevel: 'silent',
  });
  vm.runInContext(result.outputFiles[0].text, context, { filename: file, timeout: 5000 });
}

const window: Record<string, unknown> = {};
const context = vm.createContext({ window, console });
const errors: Record<string, string> = {};
for (const file of files) {
  try {
    loadInto(context, file);
  } catch (error) {
    errors[file] = String((error as Error | undefined)?.message);
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
out.atlas = canonical(atlasModule.atlasByLanguage);

process.stdout.write(JSON.stringify(out));
if (Object.keys(errors).length > 0) process.exitCode = 1;
