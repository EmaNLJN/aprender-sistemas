import { test as base, expect } from '@playwright/test';
import { STUDENT, type PublishedAccount } from '../lib/api-contract';
import { AccessPage } from '../pages/access';
import { AtlasPage } from '../pages/atlas';
import { CampaignPage } from '../pages/campaign';
import { LabPage } from '../pages/lab';
import { MethodPage } from '../pages/method';
import { ProjectPage } from '../pages/project';
import { ShellPage } from '../pages/shell';
import { SystemsPage } from '../pages/systems';
import { ApiDouble } from './api-double';
import { CompilerDouble } from './compiler-double';
import { PageIssues } from './page-issues';
import { StorageControl } from './storage-control';
import { StrictNetwork } from './strict-network';

interface Options {
  sessionAccount: PublishedAccount | null;
}

interface Fixtures {
  pageIssues: PageIssues;
  strictNetwork: StrictNetwork;
  api: ApiDouble;
  compiler: CompilerDouble;
  storage: StorageControl;
  shell: ShellPage;
  lab: LabPage;
  campaign: CampaignPage;
  systems: SystemsPage;
  atlas: AtlasPage;
  project: ProjectPage;
  method: MethodPage;
  access: AccessPage;
}

export const test = base.extend<Fixtures & Options>({
  sessionAccount: [STUDENT, { option: true }],
  pageIssues: [
    async ({ page }, use) => {
      const issues = new PageIssues(page);
      await use(issues);
      issues.assertClean();
    },
    { auto: true },
  ],
  strictNetwork: [
    async ({ context, baseURL }, use) => {
      const network = await StrictNetwork.install(context, baseURL!);
      await use(network);
      network.assertNothingBlocked();
    },
    { auto: true },
  ],
  api: [
    async ({ page, context, baseURL, sessionAccount }, use) => {
      const api = await ApiDouble.install(page, context, baseURL!, sessionAccount);
      await use(api);
      api.assertAllHandled();
    },
    { auto: true },
  ],
  compiler: async ({ page }, use) => use(new CompilerDouble(page)),
  storage: async ({ context, page }, use) => use(new StorageControl(context, page)),
  shell: async ({ page }, use) => use(new ShellPage(page)),
  lab: async ({ page }, use) => use(new LabPage(page)),
  campaign: async ({ page }, use) => use(new CampaignPage(page)),
  systems: async ({ page }, use) => use(new SystemsPage(page)),
  atlas: async ({ page }, use) => use(new AtlasPage(page)),
  project: async ({ page }, use) => use(new ProjectPage(page)),
  method: async ({ page }, use) => use(new MethodPage(page)),
  access: async ({ page }, use) => use(new AccessPage(page)),
});

export { expect };
