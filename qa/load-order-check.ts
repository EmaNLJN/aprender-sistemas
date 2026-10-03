/* Dependencias de evaluación entre los imports de src/main.tsx.
 * node qa/load-order-check.ts
 *
 * Los scripts legacy se comunican por window.* y leen sus dependencias al
 * evaluarse, así que el orden de los imports es el contrato de carga. El check
 * sólo lee el texto de main.tsx: no ejecuta nada.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './lib/sources.ts';

type Constraint = [before: string, after: string, reason: string];

const BEFORE_LAB = [
  '../lab-rust.js',
  '../lab-go.js',
  '../quests-rust.js',
  '../quests-go.js',
  '../systems-lowlevel-labs.js',
  '../systems-infra-labs.js',
  '../systems-play-labs.js',
  '../systems-pc-labs.js',
];
const BEFORE_APP = [
  '../lab.js',
  '../campaign.js',
  '../systems.js',
  '../campaign-rust.js',
  '../campaign-go.js',
  './features/atlas/index',
];

const CONSTRAINTS: Constraint[] = [
  [
    '../content.js',
    '../app.js',
    'app.js lee window.GUIDE_DATA al cargar (const data = window.GUIDE_DATA, que usa allSteps y resourceIds)',
  ],
  ...BEFORE_LAB.map((catalog): Constraint => [
    catalog,
    '../lab.js',
    'lab.js arma la lista exercises/byId con window.RUST_LAB, GO_LAB, *_QUESTS y SYSTEMS_*_LABS al evaluarse; sanitize() descarta el progreso de IDs ausentes en byId',
  ]),
  [
    '../systems-lowlevel.js',
    '../systems-lowlevel-labs.js',
    'systems-lowlevel-labs.js lee window.SYSTEMS_LOWLEVEL.workshops al evaluarse (pair() usa workshops[index])',
  ],
  [
    '../systems-pc.js',
    '../systems-pc-labs.js',
    'systems-pc-labs.js lee window.SYSTEMS_PC.workshops[0] al evaluarse (const workshop)',
  ],
  [
    '../campaign-engine.js',
    '../campaign.js',
    'campaign.js captura window.TallerCampaignEngine en const engine al evaluarse',
  ],
  [
    '../systems-engine.js',
    '../systems.js',
    'systems.js captura window.TallerSystemsEngine en const engine al evaluarse',
  ],
  ...BEFORE_APP.map((module): Constraint => {
    const reason: Record<string, string> = {
      '../lab.js':
        'render() de app.js llama a window.TallerLab.mount(); app.js también usa getExercises() en syncLinkedLanguage()',
      '../campaign.js':
        'app.js llama a window.TallerCampaign?.init() al cargar y a mount() en render()',
      '../systems.js':
        'app.js llama a window.TallerSystems?.init() al cargar y a mount() en render()',
      '../campaign-rust.js':
        'syncLinkedLanguage() de app.js lee window.RUST_CAMPAIGN y campaign.js init() la pasa al motor al cargar app.js',
      '../campaign-go.js':
        'syncLinkedLanguage() de app.js lee window.GO_CAMPAIGN y campaign.js init() la pasa al motor al cargar app.js',
      './features/atlas/index':
        'render() de app.js llama a window.TallerAtlas.mount() sin guarda opcional en la vista atlas',
    };
    return [module, '../app.js', reason[module] ?? ''];
  }),
];

function readImports(source: string): string[] {
  return [...source.matchAll(/^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm)].map((match) => match[1]);
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
  if (imports.at(-1) !== '../app.js') {
    problems.push(`../app.js debe ser el último import, pero lo es ${imports.at(-1)}`);
  }
  const firstStyle = imports.find((name) => name.endsWith('.css'));
  if (firstStyle !== '../styles.css') {
    problems.push(`../styles.css debe ser la primera hoja de estilos, pero lo es ${firstStyle}`);
  }
  return problems;
}

const mainPath = path.join(repoRoot, 'src', 'main.tsx');
const imports = readImports(fs.readFileSync(mainPath, 'utf8'));
const problems = checkLoadOrder(imports);
assert.deepEqual(problems, [], `Orden de carga inválido en src/main.tsx:\n${problems.join('\n')}`);
console.log(
  `load-order-check OK: ${imports.length} imports, ${CONSTRAINTS.length} restricciones de orden.`,
);
