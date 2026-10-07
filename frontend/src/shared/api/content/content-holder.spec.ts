import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadHolder() {
  return import('./content-holder');
}

describe('content holder', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('refuses to be read before the content is stored', async () => {
    const { readStoredContent } = await loadHolder();
    expect(() => readStoredContent()).toThrow('todavía no se publicó');
  });

  it('returns the very object that was stored', async () => {
    const { readStoredContent, storeContent } = await loadHolder();
    const content = { lab: {} };
    storeContent(content);
    expect(readStoredContent()).toBe(content);
  });

  it('refuses to store the content twice', async () => {
    const { storeContent } = await loadHolder();
    storeContent({});
    expect(() => storeContent({})).toThrow('ya se publicó');
  });
});
