import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const root = resolve(import.meta.dirname, '../..');
const port = Number(process.env.E2E_PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;

if (!existsSync(resolve(root, 'dist/index.html'))) {
  throw new Error('Falta dist/index.html: corré npm run build antes de npm run test:e2e.');
}

export default defineConfig({
  testDir: resolve(import.meta.dirname, 'specs'),
  outputDir: resolve(root, 'test-results'),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: resolve(root, 'playwright-report') }]]
    : 'list',
  use: {
    baseURL: origin,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: root,
    url: origin,
    reuseExistingServer: false,
  },
});
