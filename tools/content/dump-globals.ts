// Oráculo de equivalencia para refactors puros: evalúa en una VM, con stubs mínimos de
// navegador y en el orden de src/app/main.tsx, los adaptadores que publican catálogos y
// modelos, y escribe un volcado JSON canónico. Port a TypeScript de dump-globals-v2.mjs
// (sesión del 2026-10-03): sobre el mismo árbol produce exactamente los mismos bytes.
// Uso: node tools/content/dump-globals.ts <raíz del repo> > volcado.json
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
// esbuild sale del árbol que se vuelca, así el oráculo también corre sobre otro checkout.
const esbuild = createRequire(join(root, 'package.json'))('esbuild') as typeof import('esbuild');

// Sólo fuentes de datos y modelos puros: las vistas necesitan un DOM real y las cubren QA y
// el navegador.
// No reutiliza qa/lib/sources.ts ni qa/lib/legacy-sources.ts: fijan repoRoot al checkout
// actual, y el oráculo corre también sobre otra raíz (un commit anterior extraído aparte). Si
// cambia la lista de adaptadores, actualizá las dos.
const files = [
  'src/app/legacy/register-catalogs.ts',
  ...['lowlevel', 'infra', 'play', 'pc'].map(
    (domain) => `src/app/legacy/register-systems-${domain}.ts`,
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

// Modelos de Sistemas: estado inicial y primera vista por taller vuelven observable un port.
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

// Contenido del Atlas, con el mismo empaquetador. La primera ruta que exista gana.
const atlasCandidates = [
  'src/pages/atlas/model/atlas-catalog.ts',
  'src/pages/atlas/content/atlas-content.ts',
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
// Los errores ya cambian el sha, pero además el proceso falla: un adaptador que se corta no
// pasa por un volcado válido cuando nadie compara el hash.
if (Object.keys(errors).length > 0) process.exitCode = 1;
