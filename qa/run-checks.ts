import { spawnSync } from 'node:child_process';
import path from 'node:path';

const checks = [
  'build-check.ts',
  'dist-content-check.ts',
  'load-order-check.ts',
  'seams-guard-check.ts',
  'content-tools-check.ts',
  'content-exercises-check.ts',
  'content-records-check.ts',
  'content-guide-check.ts',
  'content-atlas-check.ts',
  'curriculum-meta-check.ts',
  'curriculum-ids-check.ts',
  'atlas-check.ts',
  'guide-content-check.ts',
  'content-check.ts',
  'runner-check.ts',
  'exercise-evidence-check.ts',
  'lab-state-check.ts',
  'app-shell-check.ts',
  'boot-check.ts',
  'lab-bridge-check.ts',
  'campaign-check.ts',
  'campaign-content-check.ts',
  'quest-explorers-check.ts',
  'systems-check.ts',
  'systems-lowlevel-check.ts',
  'systems-infra-check.ts',
  'systems-play-check.ts',
  'systems-pc-check.ts',
  'project-kit-check.ts',
  'shared-lib-check.ts',
  'route-progress-check.ts',
  'versioned-storage-check.ts',
];

for (const check of checks) {
  const result = spawnSync(process.execPath, [path.join(import.meta.dirname, check)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`FAIL ${check} (exit ${result.status ?? result.signal})`);
    process.exit(result.status ?? 1);
  }
}

console.log(`${checks.length} checks passed.`);
