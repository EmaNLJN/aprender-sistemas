import type { Page, Request } from '@playwright/test';

export const CONTENT_URL = '**/content/curriculum.*.json';

const CONTENT_PATH = /\/content\/curriculum\.[0-9a-f]+\.json$/;

export function trackContentRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (CONTENT_PATH.test(new URL(request.url()).pathname)) requests.push(request);
  });
  return requests;
}
