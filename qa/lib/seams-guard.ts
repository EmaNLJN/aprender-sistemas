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

const SINGLETON_OWNERS: Readonly<Record<string, readonly string[]>> = {
  routeStore: ['frontend/app.js'],
  labStore: ['frontend/lab.js'],
  exerciseCatalog: ['frontend/lab.js'],
  campaignEngine: ['frontend/src/app/legacy/register-campaign-engine.ts'],
  systemsEngine: ['frontend/src/app/legacy/register-systems-engine.ts'],
};

const IMPORT_PATTERN =
  /^\s*import\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;

interface ImportStatement {
  names: string[];
  specifier: string;
}

function parseImports(text: string): ImportStatement[] {
  const statements: ImportStatement[] = [];
  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const [, typeOnly, clause, fromSpecifier, bareSpecifier] = match;
    const names = typeOnly ? [] : importedNames(clause ?? '');
    statements.push({ names, specifier: fromSpecifier ?? bareSpecifier ?? '' });
  }
  return statements;
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

function isLegacyFile(file: string): boolean {
  return /^frontend\/[^/]+\.js$/.test(file) || file.startsWith('frontend/src/app/legacy/');
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

function singletonViolations(file: string, imports: ImportStatement[]): string[] {
  if (!isLegacyFile(file)) return [];
  return imports
    .flatMap((statement) => statement.names)
    .filter((name) => name in SINGLETON_OWNERS && !SINGLETON_OWNERS[name].includes(file))
    .map(
      (name) =>
        `R4 ${file}: imports the singleton ${name}, which only ${SINGLETON_OWNERS[name].join(' and ')} may import`,
    );
}

function curriculumViolations(file: string, imports: ImportStatement[]): string[] {
  if (!isLowerLayerFile(file)) return [];
  return imports
    .filter((statement) => statement.specifier.endsWith('curriculum.json'))
    .map(() => `R5 ${file}: imports build/curriculum.json from a layer below pages`);
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
        ...singletonViolations(file, imports),
        ...curriculumViolations(file, imports),
      ];
    });
}
