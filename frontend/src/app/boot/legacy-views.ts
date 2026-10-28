import type { BootStage } from './run-boot';

// qa/load-order-check.ts reads this list: one `() => import('…'),` per line, in evaluation order.
const LEGACY_MODULES: readonly (() => Promise<unknown>)[] = [
  () => import('../legacy/register-catalogs'),
  () => import('../legacy/register-runner'),
  () => import('../legacy/register-editor'),
  () => import('../../../lab-explorers.js'),
  () => import('../../../quest-explorers.js'),
  () => import('../legacy/register-systems-lowlevel'),
  () => import('../legacy/register-systems-infra'),
  () => import('../legacy/register-systems-play'),
  () => import('../legacy/register-systems-pc'),
  () => import('../../../lab.js'),
  () => import('../legacy/register-atlas'),
  () => import('../legacy/register-campaign-engine'),
  () => import('../legacy/register-effects'),
  () => import('../../../campaign.js'),
  () => import('../legacy/register-systems-engine'),
  () => import('../legacy/register-project-kit'),
  () => import('../../../systems.js'),
  () => import('../../../app.js'),
];

export const legacyViews: BootStage = {
  name: 'legacyViews',
  async run() {
    for (const load of LEGACY_MODULES) await load();
    const { startApp } = await import('../../../app.js');
    startApp();
  },
};
