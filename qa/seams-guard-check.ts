import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findViolations } from './lib/seams-guard.ts';
import { repoRoot } from './lib/sources.ts';

const STORE_FILES: Record<string, string> = {
  'frontend/src/entities/guide/model/route-store.ts': `
    import { openVersionedStore } from '../../../shared/lib/versioned-storage';
    const KEY = 'taller-learning-v1';
    export const createRouteStore = () => openVersionedStore(KEY, {});
    export const routeStore = createRouteStore();`,
  'frontend/src/entities/exercise/model/lab-store.ts': `
    import { openVersionedStore } from '../../../shared/lib/versioned-storage';
    const KEY = 'taller-laboratorio-v1';
    export const createLabStore = () => openVersionedStore(KEY, {});`,
  'frontend/src/entities/campaign/model/create-campaign-engine.ts': `
    import { openVersionedStore } from '../../../shared/lib/versioned-storage';
    const STORAGE_KEY = 'taller-campaign-v1';
    export const createCampaignEngine = () => openVersionedStore(STORAGE_KEY, {});`,
  'frontend/src/entities/systems-workshop/model/create-systems-engine.ts': `
    import { openVersionedStore } from '../../../shared/lib/versioned-storage';
    const STORAGE_KEY = 'taller-systems-v1';
    export const createSystemsEngine = () => openVersionedStore(STORAGE_KEY, {});`,
};

const LEGACY_OWNERS: Record<string, string> = {
  'frontend/lab.js': `import { labStore, exerciseCatalog } from './src/entities/exercise';`,
  'frontend/app.js': `import {\n  mergeRouteProgress,\n  routeStore,\n} from './src/entities/guide';`,
  'frontend/src/app/legacy/register-campaign-engine.ts': `import { campaignEngine, type CampaignEngine } from '../../entities/campaign';`,
  'frontend/src/app/legacy/register-systems-engine.ts': `import { systemsEngine, type SystemsEngine } from '../../entities/systems-workshop';`,
};

const INDEXES: Record<string, string> = {
  'frontend/src/entities/guide/index.ts': `export { createRouteStore, routeStore } from './model/route-store';`,
};

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

function rulesOf(violations: string[]): string[] {
  return violations.map((violation) => violation.slice(0, 2));
}

test('the four store owners, the legacy owners, an index, a spec and a clean file give no violations', () => {
  const sources = {
    ...STORE_FILES,
    ...LEGACY_OWNERS,
    ...INDEXES,
    'frontend/src/pages/atlas/model/filter-concepts.ts': `export const filter = () => [];`,
    'frontend/src/pages/atlas/model/atlas-catalog.ts': `import curriculum from '../../../../../build/curriculum.json';`,
    'frontend/src/entities/guide/model/route-store.spec.ts': `
      import { createRouteStore } from './route-store';
      const KEY = 'taller-learning-v1';`,
  };
  assert.deepEqual(findViolations(sources), []);
});

test('R1: a page that opens a progress key is reported', () => {
  const violations = findViolations({
    ...STORE_FILES,
    'frontend/src/pages/route/model/open-route.ts': `const key = "taller-learning-v1";`,
  });
  assert.deepEqual(rulesOf(violations), ['R1']);
  assert.match(violations[0], /frontend\/src\/pages\/route\/model\/open-route\.ts/);
  assert.match(violations[0], /taller-learning-v1/);
});

test('R1: a key literal repeated in another owner is reported', () => {
  const violations = findViolations({
    ...STORE_FILES,
    'frontend/src/entities/campaign/model/create-campaign-engine.ts': `
      import { openVersionedStore } from '../../../shared/lib/versioned-storage';
      const A = 'taller-campaign-v1';
      const B = 'taller-systems-v1';`,
  });
  assert.deepEqual(rulesOf(violations), ['R1']);
  assert.match(violations[0], /taller-systems-v1/);
});

test('R2: a page that imports openVersionedStore is reported', () => {
  const violations = findViolations({
    ...STORE_FILES,
    'frontend/src/pages/route/model/open-route.ts': `
      import { openVersionedStore } from '../../../shared/lib/versioned-storage';
      openVersionedStore('another-key', {});`,
  });
  assert.deepEqual(rulesOf(violations), ['R2']);
});

test('R1 and R2 together: a page that opens a progress key with openVersionedStore', () => {
  const violations = findViolations({
    ...STORE_FILES,
    'frontend/src/pages/route/model/open-route.ts': `
      import { openVersionedStore } from '../../../shared/lib/versioned-storage';
      openVersionedStore('taller-learning-v1', {});`,
  });
  assert.deepEqual(rulesOf(violations).sort(), ['R1', 'R2']);
});

test('R3: an adapter that imports a factory is reported, but a re-export is not', () => {
  const violations = findViolations({
    ...INDEXES,
    'frontend/src/app/legacy/register-campaign-engine.ts': `
      import { createCampaignEngine } from '../../entities/campaign';
      export const engine = createCampaignEngine();`,
  });
  assert.deepEqual(rulesOf(violations), ['R3']);
  assert.match(violations[0], /register-campaign-engine\.ts/);
  assert.match(violations[0], /createCampaignEngine/);
});

test('R3: a multi-line import of a factory next to other names is reported', () => {
  const violations = findViolations({
    'frontend/lab.js': `
      import {
        blankLabState,
        createLabStore as makeStore,
      } from '../../../entities/exercise';`,
  });
  assert.deepEqual(rulesOf(violations), ['R3']);
});

test('R3: a type-only import of a factory name is erased and is not reported', () => {
  assert.deepEqual(
    findViolations({
      'frontend/src/pages/lab/ui/lab-page.tsx': `
        import type { createLabStore } from '../../../entities/exercise';
        import { type createRouteStore } from '../../../entities/guide';`,
    }),
    [],
  );
});

test('R4: a legacy view that imports a singleton of another owner is reported', () => {
  const violations = findViolations({
    ...LEGACY_OWNERS,
    'frontend/campaign.js': `import { routeStore } from './src/entities/guide';`,
  });
  assert.deepEqual(rulesOf(violations), ['R4']);
  assert.match(violations[0], /frontend\/campaign\.js/);
  assert.match(violations[0], /entities\/guide/);
});

test('R4: an adapter under app/legacy that imports a singleton of another owner is reported', () => {
  const violations = findViolations({
    'frontend/src/app/legacy/register-systems-engine.ts': `import { campaignEngine } from '../../entities/campaign';`,
  });
  assert.deepEqual(rulesOf(violations), ['R4']);
});

test('R4: any value import of a slice index outside its legacy owner is reported', () => {
  const violations = findViolations({
    ...LEGACY_OWNERS,
    'frontend/systems.js': `import { interpretRun } from './src/entities/exercise';`,
  });
  assert.deepEqual(rulesOf(violations), ['R4']);
  assert.match(violations[0], /frontend\/systems\.js/);
  assert.match(violations[0], /entities\/exercise/);
});

test('R4: a value import of an index from a boot module or a page is reported', () => {
  const violations = findViolations({
    'frontend/src/app/boot/start.ts': `import { summarizeWorlds } from '../../entities/campaign';`,
    'frontend/src/pages/route/ui/route-page.tsx': `import { routeStore } from '../../../entities/guide';`,
    'frontend/src/pages/workshop/model/pick.ts': `import '../../../entities/systems-workshop';`,
  });
  assert.deepEqual(rulesOf(violations), ['R4', 'R4', 'R4']);
});

test('R4: an inline type import mixed with a value import is reported, a type-only one is not', () => {
  assert.deepEqual(
    rulesOf(
      findViolations({
        'frontend/src/app/boot/start.ts': `import { type Exercise, interpretRun } from '../../entities/exercise';`,
      }),
    ),
    ['R4'],
  );
  assert.deepEqual(
    findViolations({
      'frontend/src/app/legacy/register-atlas.ts': `
        import type { Exercise } from '../../entities/exercise';
        import { type GuideData } from '../../entities/guide';`,
    }),
    [],
  );
});

test('R4: a spec and an @x entry are not reported', () => {
  assert.deepEqual(
    findViolations({
      'frontend/src/entities/guide/model/route-store.spec.ts': `import { routeStore } from '..';`,
      'frontend/src/entities/exercise/@x/systems-workshop.ts': `export { hasPassingEvidence } from '../model/evidence';`,
      'frontend/src/app/engine-init-order.spec.ts': `import { campaignEngine } from '../entities/campaign';`,
    }),
    [],
  );
});

test('R5: entities, features and shared that import the curriculum JSON are reported', () => {
  const importJson = `import curriculum from '../../../../build/curriculum.json';`;
  const violations = findViolations({
    'frontend/src/entities/guide/model/read-curriculum.ts': importJson,
    'frontend/src/features/search/model/read-curriculum.ts': importJson,
    'frontend/src/shared/lib/read-curriculum.ts': importJson,
  });
  assert.deepEqual(rulesOf(violations), ['R5', 'R5', 'R5']);
});

function productionSources(): Record<string, string> {
  const sources: Record<string, string> = {};
  const frontend = path.join(repoRoot, 'frontend');
  for (const entry of fs.readdirSync(frontend)) {
    if (entry.endsWith('.js')) sources[`frontend/${entry}`] = readFrontend(entry);
  }
  for (const entry of fs.readdirSync(path.join(frontend, 'src'), { recursive: true })) {
    const relative = String(entry).split(path.sep).join('/');
    if (/\.tsx?$/.test(relative) && !/\.spec\.tsx?$/.test(relative)) {
      sources[`frontend/src/${relative}`] = readFrontend(`src/${relative}`);
    }
  }
  return sources;
}

function readFrontend(relative: string): string {
  return fs.readFileSync(path.join(repoRoot, 'frontend', relative), 'utf8');
}

const REAL_KEY_OWNERS: Record<string, string> = {
  'taller-learning-v1': 'frontend/src/entities/guide/model/route-store.ts',
  'taller-laboratorio-v1': 'frontend/src/entities/exercise/model/lab-store.ts',
  'taller-campaign-v1': 'frontend/src/entities/campaign/model/create-campaign-engine.ts',
  'taller-systems-v1': 'frontend/src/entities/systems-workshop/model/create-systems-engine.ts',
};

test('the real tree opens each key in exactly one file', () => {
  const sources = productionSources();
  for (const [key, owner] of Object.entries(REAL_KEY_OWNERS)) {
    const files = Object.keys(sources).filter((file) => sources[file].includes(key));
    assert.deepEqual(files, [owner]);
  }
});

test('the real tree has no violations', () => {
  const sources = productionSources();
  assert.ok(Object.keys(sources).length > 100);
  assert.deepEqual(findViolations(sources), []);
});

console.log(passed + ' seams-guard scenarios PASS.');
