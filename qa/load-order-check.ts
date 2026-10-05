/* Dependencias de evaluación entre los imports de frontend/src/app/main.tsx.
 * node qa/load-order-check.ts
 *
 * Los scripts legacy se comunican por window.* y leen sus dependencias al
 * evaluarse, así que el orden de los imports es el contrato de carga. El check
 * sólo lee el texto de main.tsx: no ejecuta nada.
 *
 * Cada import se normaliza a una ruta relativa a la raíz del repo (resuelta desde el
 * directorio de la entrada, probando .ts, .tsx y .js cuando no lleva extensión), y la
 * tabla de restricciones usa esas rutas: mover la entrada no obliga a reescribirla.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './lib/sources.ts';

type Constraint = [before: string, after: string, reason: string];

const APP = 'frontend/app.js';
const LAB = 'frontend/lab.js';
const STYLES = 'frontend/styles.css';
const ATLAS = 'frontend/src/app/legacy/register-atlas.tsx';
const CAMPAIGN_ENGINE = 'frontend/src/app/legacy/register-campaign-engine.ts';
const SYSTEMS_ENGINE = 'frontend/src/app/legacy/register-systems-engine.ts';
const CATALOGS = 'frontend/src/app/legacy/register-catalogs.ts';
const SYSTEMS_DOMAINS = ['lowlevel', 'infra', 'play', 'pc'].map(
  (domain) => `frontend/src/app/legacy/register-systems-${domain}.ts`,
);

const BEFORE_LAB = [CATALOGS, ...SYSTEMS_DOMAINS];
const SYSTEMS_CATALOGS = SYSTEMS_DOMAINS;
const BEFORE_APP_REASONS: Record<string, string> = {
  [LAB]:
    'render() de app.js llama a window.TallerLab.mount(); app.js también usa getExercises() en syncLinkedLanguage()',
  'frontend/campaign.js':
    'app.js llama a window.TallerCampaign?.init() al cargar y a mount() en render()',
  'frontend/systems.js':
    'app.js llama a window.TallerSystems?.init() al cargar y a mount() en render()',
  [CATALOGS]:
    'app.js lee window.GUIDE_DATA al cargar; syncLinkedLanguage() lee window.RUST_CAMPAIGN/GO_CAMPAIGN y campaign.js init() los pasa al motor al cargar app.js',
  [ATLAS]:
    'render() de app.js llama a window.TallerAtlas.mount() sin guarda opcional en la vista atlas',
};

const CONSTRAINTS: Constraint[] = [
  ...BEFORE_LAB.map((catalog): Constraint => [
    catalog,
    LAB,
    'lab.js arma la lista exercises/byId con window.RUST_LAB, GO_LAB, *_QUESTS y SYSTEMS_*_LABS al evaluarse; sanitize() descarta el progreso de IDs ausentes en byId',
  ]),
  ...SYSTEMS_CATALOGS.map((catalog): Constraint => [
    catalog,
    APP,
    'TallerSystems.init() lee el catálogo de Sistemas (window.SYSTEMS_*) cuando app.js carga',
  ]),
  [
    CAMPAIGN_ENGINE,
    'frontend/campaign.js',
    'campaign.js captura window.TallerCampaignEngine en const engine al evaluarse',
  ],
  [
    SYSTEMS_ENGINE,
    'frontend/systems.js',
    'systems.js captura window.TallerSystemsEngine en const engine al evaluarse',
  ],
  ...Object.entries(BEFORE_APP_REASONS).map(([module, reason]): Constraint => [
    module,
    APP,
    reason,
  ]),
];

const SOURCE_EXTENSIONS = ['', '.ts', '.tsx', '.js'];

// Ruta del import relativa a la raíz del repo, con barras; lo no relativo queda igual.
function normalizeImport(specifier: string, entryDirectory: string): string {
  if (!specifier.startsWith('.')) return specifier;
  const absolute = path.resolve(entryDirectory, specifier);
  const resolved =
    SOURCE_EXTENSIONS.map((extension) => absolute + extension).find(
      (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    ) ?? absolute;
  return path.relative(repoRoot, resolved).split(path.sep).join('/');
}

function readImports(source: string, entryDirectory: string): string[] {
  return [...source.matchAll(/^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm)].map((match) =>
    normalizeImport(match[1] ?? '', entryDirectory),
  );
}

function checkLoadOrder(imports: string[]): string[] {
  const problems: string[] = [];
  const position = (name: string) => imports.indexOf(name);
  const duplicates = imports.filter((name, index) => imports.indexOf(name) !== index);
  for (const name of new Set(duplicates)) problems.push(`import duplicado: ${name}`);
  for (const [before, after, reason] of CONSTRAINTS) {
    const first = position(before);
    const second = position(after);
    if (first < 0 || second < 0) {
      problems.push(`falta el import ${first < 0 ? before : after} (${before} antes que ${after})`);
    } else if (first > second) {
      problems.push(`${before} debe importarse antes que ${after}: ${reason}`);
    }
  }
  if (imports.at(-1) !== APP) {
    problems.push(`${APP} debe ser el último import, pero lo es ${imports.at(-1)}`);
  }
  const firstStyle = imports.find((name) => name.endsWith('.css'));
  if (firstStyle !== STYLES) {
    problems.push(`${STYLES} debe ser la primera hoja de estilos, pero lo es ${firstStyle}`);
  }
  return problems;
}

const mainPath = path.join(repoRoot, 'frontend', 'src', 'app', 'main.tsx');
const imports = readImports(fs.readFileSync(mainPath, 'utf8'), path.dirname(mainPath));
const problems = checkLoadOrder(imports);
assert.deepEqual(
  problems,
  [],
  `Orden de carga inválido en frontend/src/app/main.tsx:\n${problems.join('\n')}`,
);
console.log(
  `load-order-check OK: ${imports.length} imports, ${CONSTRAINTS.length} restricciones de orden.`,
);
