/* Dependencias de evaluación entre las etapas de arranque y los módulos legacy.
 * node qa/load-order-check.ts
 *
 * Los scripts legacy se comunican por window.* y leen sus dependencias al
 * evaluarse, así que el orden de la cadena es el contrato de carga. El check
 * sólo lee texto y no ejecuta nada: de frontend/src/app/main.tsx, las hojas de estilo y
 * la secuencia de etapas (runBoot([...])); de frontend/src/app/boot/legacy-views.ts, la cadena
 * de módulos, un `() => import('…'),` por línea, y la llamada a startApp().
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

const STAGE_CONSTRAINTS: Constraint[] = [
  [
    'contentGate',
    'legacyViews',
    'los adaptadores y las vistas legacy leen el contenido publicado al evaluarse',
  ],
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

const IMPORT_STATEMENT = /^\s*import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
const CHAIN_ENTRY = /^\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\),?\s*$/gm;
const BOOT_STAGES = /runBoot\(\s*\[([^\]]*)\]/;
const START_CALL = /^[ \t]*startApp\(\);?[ \t]*$/gm;

function readStyles(source: string, entryDirectory: string): string[] {
  return [...source.matchAll(IMPORT_STATEMENT)]
    .map((match) => normalizeImport(match[1] ?? '', entryDirectory))
    .filter((name) => name.endsWith('.css'));
}

function readChain(source: string, entryDirectory: string): string[] {
  return [...source.matchAll(CHAIN_ENTRY)].map((match) =>
    normalizeImport(match[1] ?? '', entryDirectory),
  );
}

function readStages(source: string): string[] | undefined {
  const list = BOOT_STAGES.exec(source)?.[1];
  if (list === undefined) return undefined;
  return list
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function checkStages(stages: string[] | undefined): string[] {
  if (stages === undefined) return ['main.tsx debe arrancar con runBoot([...]) y no lo hace'];
  const problems: string[] = [];
  for (const [before, after, reason] of STAGE_CONSTRAINTS) {
    const first = stages.indexOf(before);
    const second = stages.indexOf(after);
    if (first < 0 || second < 0) {
      problems.push(
        `falta la etapa ${first < 0 ? before : after} en runBoot([${stages.join(', ')}])`,
      );
    } else if (first > second) {
      problems.push(`la etapa ${before} debe correr antes que ${after}: ${reason}`);
    }
  }
  return problems;
}

function checkStartCall(source: string): string[] {
  const calls = [...source.matchAll(START_CALL)];
  if (calls.length !== 1) {
    return [`startApp() debe llamarse exactamente una vez, pero se llama ${calls.length} veces`];
  }
  const lastEntry = [...source.matchAll(CHAIN_ENTRY)].at(-1);
  const lastEntryEnd = (lastEntry?.index ?? 0) + (lastEntry?.[0].length ?? 0);
  if ((calls[0]?.index ?? 0) < lastEntryEnd) {
    return ['startApp() debe llamarse después del último import() de la cadena'];
  }
  return [];
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

const bootDirectory = path.join(repoRoot, 'frontend', 'src', 'app');
const mainPath = path.join(bootDirectory, 'main.tsx');
const viewsPath = path.join(bootDirectory, 'boot', 'legacy-views.ts');

function checkBoot(): { problems: string[]; imports: string[] } {
  const mainSource = fs.readFileSync(mainPath, 'utf8');
  const stageProblems = checkStages(readStages(mainSource));
  if (!fs.existsSync(viewsPath)) {
    return {
      problems: [...stageProblems, 'falta frontend/src/app/boot/legacy-views.ts'],
      imports: [],
    };
  }
  const viewsSource = fs.readFileSync(viewsPath, 'utf8');
  const imports = [
    ...readStyles(mainSource, path.dirname(mainPath)),
    ...readChain(viewsSource, path.dirname(viewsPath)),
  ];
  return {
    problems: [...stageProblems, ...checkLoadOrder(imports), ...checkStartCall(viewsSource)],
    imports,
  };
}

const { problems, imports } = checkBoot();
assert.deepEqual(problems, [], `Orden de carga inválido:\n${problems.join('\n')}`);
console.log(
  `load-order-check OK: ${imports.length} imports, ${CONSTRAINTS.length} restricciones de orden y ${STAGE_CONSTRAINTS.length} de etapas.`,
);
