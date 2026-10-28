import path from 'node:path';

const KEY_OWNERS: Readonly<Record<string, string>> = {
  'taller-learning-v1': 'frontend/src/entities/guide/model/route-store.ts',
  'taller-laboratorio-v1': 'frontend/src/entities/exercise/model/lab-store.ts',
  'taller-campaign-v1': 'frontend/src/entities/campaign/model/create-campaign-engine.ts',
  'taller-systems-v1': 'frontend/src/entities/systems-workshop/model/create-systems-engine.ts',
};

const STORE_OPENERS: readonly string[] = Object.values(KEY_OWNERS);

const FACTORIES: readonly string[] = [
  'createRouteStore',
  'createLabStore',
  'createCampaignEngine',
  'createSystemsEngine',
];

const INDEX_OWNERS: Readonly<Record<string, string>> = {
  guide: 'frontend/app.js',
  exercise: 'frontend/lab.js',
  campaign: 'frontend/src/app/legacy/register-campaign-engine.ts',
  'systems-workshop': 'frontend/src/app/legacy/register-systems-engine.ts',
};

const SLICE_INDEX_SPECIFIER =
  /(?:^|\/)entities\/(guide|exercise|campaign|systems-workshop)(?:\/index(?:\.ts)?)?$/;

const SLICE_PATH_SPECIFIER = /(?:^|\/)entities\/(guide|exercise|campaign|systems-workshop)(\/.*)?$/;

const STATELESS_ENTRIES: readonly string[] = [
  'entities/campaign/bridge',
  'entities/systems-workshop/bridge',
  'entities/exercise/explorers',
];

const APP_CONTENT_DIRECTORY = 'frontend/src/app/content';

const IMPORT_PATTERN =
  /^\s*import\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;

interface ImportStatement {
  names: string[];
  specifier: string;
  isValueImport: boolean;
}

function parseImports(text: string): ImportStatement[] {
  const statements: ImportStatement[] = [];
  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const [, typeOnly, clause, fromSpecifier, bareSpecifier] = match;
    const names = typeOnly ? [] : importedNames(clause ?? '');
    statements.push({
      names,
      specifier: fromSpecifier ?? bareSpecifier ?? '',
      isValueImport: !typeOnly && hasRuntimeBinding(clause),
    });
  }
  return statements;
}

function hasRuntimeBinding(clause: string | undefined): boolean {
  if (clause === undefined) return true;
  const braces = clause.match(/\{([^}]*)\}/);
  const outsideBraces = clause
    .replace(/\{[^}]*\}/, '')
    .replace(/,/g, '')
    .trim();
  if (outsideBraces !== '') return true;
  return braces !== null && importedNames(clause).length > 0;
}

function importedNames(clause: string): string[] {
  const braces = clause.match(/\{([^}]*)\}/);
  if (!braces) return [];
  return braces[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '' && !entry.startsWith('type '))
    .map((entry) => entry.split(/\s+as\s+/)[0]);
}

function isLegacyOrAppFile(file: string): boolean {
  return /^frontend\/[^/]+\.js$/.test(file) || file.startsWith('frontend/src/app/');
}

function isLowerLayerFile(file: string): boolean {
  return /^frontend\/src\/(entities|features|shared)\//.test(file);
}

function isProductionFile(file: string): boolean {
  return !/\.spec\.tsx?$/.test(file);
}

function keyViolations(file: string, text: string): string[] {
  return Object.entries(KEY_OWNERS)
    .filter(([key, owner]) => text.includes(key) && file !== owner)
    .map(([key, owner]) => `R1 ${file}: contains the key ${key}, which only ${owner} may open`);
}

function openerViolations(file: string, imports: ImportStatement[]): string[] {
  const importsOpener = imports.some((statement) => statement.names.includes('openVersionedStore'));
  if (!importsOpener || STORE_OPENERS.includes(file)) return [];
  return [`R2 ${file}: imports openVersionedStore, which only the four store owners may use`];
}

function factoryViolations(file: string, imports: ImportStatement[]): string[] {
  return imports
    .flatMap((statement) => statement.names)
    .filter((name) => FACTORIES.includes(name))
    .map((name) => `R3 ${file}: imports the factory ${name}; import the singleton instead`);
}

// Pages and features consume the singletons from F3 on; the legacy sources and app/ (adapters and boot)
// evaluate each slice index in their own bundle or static graph, so only the owner may import values there.
function indexViolations(file: string, imports: ImportStatement[]): string[] {
  if (!isLegacyOrAppFile(file)) return [];
  return imports
    .filter((statement) => statement.isValueImport)
    .flatMap((statement) => {
      const slice = statement.specifier.match(SLICE_INDEX_SPECIFIER)?.[1];
      if (slice === undefined || INDEX_OWNERS[slice] === file) return [];
      return [
        `R4 ${file}: imports a value from entities/${slice}, whose index only ${INDEX_OWNERS[slice]} may import`,
      ];
    });
}

function isSliceIndexPath(pathInsideSlice: string | undefined): boolean {
  return (
    pathInsideSlice === undefined || pathInsideSlice === '/index' || pathInsideSlice === '/index.ts'
  );
}

function isStatelessEntry(specifier: string): boolean {
  return STATELESS_ENTRIES.some(
    (entry) => specifier.endsWith(entry) || specifier.endsWith(`${entry}.ts`),
  );
}

function deepSliceImportViolations(file: string, imports: ImportStatement[]): string[] {
  if (!isLegacyOrAppFile(file)) return [];
  return imports
    .filter((statement) => {
      const match = statement.specifier.match(SLICE_PATH_SPECIFIER);
      if (match === null) return false;
      return !isSliceIndexPath(match[2]) && !isStatelessEntry(statement.specifier);
    })
    .map(
      (statement) =>
        `R6 ${file}: imports ${statement.specifier}; outside a slice, import its index or a declared stateless entry`,
    );
}

function curriculumViolations(file: string, imports: ImportStatement[]): string[] {
  if (!isLowerLayerFile(file)) return [];
  return imports
    .filter((statement) => statement.specifier.endsWith('curriculum.json'))
    .map(() => `R5 ${file}: imports build/curriculum.json from a layer below pages`);
}

function isBelowApp(file: string): boolean {
  return file.startsWith('frontend/src/') && !file.startsWith('frontend/src/app/');
}

function resolvesInsideAppContent(file: string, specifier: string): boolean {
  if (!specifier.startsWith('.')) return false;
  const resolved = path.posix.join(path.posix.dirname(file), specifier);
  return resolved === APP_CONTENT_DIRECTORY || resolved.startsWith(`${APP_CONTENT_DIRECTORY}/`);
}

function appContentViolations(file: string, imports: ImportStatement[]): string[] {
  if (!isBelowApp(file)) return [];
  return imports
    .filter((statement) => resolvesInsideAppContent(file, statement.specifier))
    .map(() => `R5 ${file}: imports app/content, and only app/ may read getContent()`);
}

export function findViolations(sources: Readonly<Record<string, string>>): string[] {
  return Object.entries(sources)
    .filter(([file]) => isProductionFile(file))
    .flatMap(([file, text]) => {
      const imports = parseImports(text);
      return [
        ...keyViolations(file, text),
        ...openerViolations(file, imports),
        ...factoryViolations(file, imports),
        ...indexViolations(file, imports),
        ...deepSliceImportViolations(file, imports),
        ...curriculumViolations(file, imports),
        ...appContentViolations(file, imports),
      ];
    });
}
