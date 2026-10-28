import { createApiClient } from '../../shared/api/http';

export const apiClient = createApiClient({
  fetch: (input, init) => window.fetch(input, init),
  readCookies: () => document.cookie,
});
