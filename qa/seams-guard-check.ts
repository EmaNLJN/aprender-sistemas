import assert from 'node:assert/strict';
import { findViolations } from './lib/seams-guard.ts';

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
    'frontend/src/pages/lab/ui/lab-page.tsx': `
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
  assert.match(violations[0], /routeStore/);
});

test('R4: an adapter under app/legacy that imports a singleton of another owner is reported', () => {
  const violations = findViolations({
    'frontend/src/app/legacy/register-systems-engine.ts': `import { campaignEngine } from '../../entities/campaign';`,
  });
  assert.deepEqual(rulesOf(violations), ['R4']);
});

test('R4: a React page may import a singleton', () => {
  assert.deepEqual(
    findViolations({
      'frontend/src/pages/route/ui/route-page.tsx': `import { routeStore } from '../../../entities/guide';`,
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

console.log(passed + ' seams-guard scenarios PASS.');
