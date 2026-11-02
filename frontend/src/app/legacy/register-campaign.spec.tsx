import { act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import curriculum from '../../../../build/curriculum.json';
import masterStorage from '../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import type { CampaignConfig } from '../../entities/campaign';
import type { StorageLike } from '../../shared/lib/versioned-storage';

const METHODS = [
  'exerciseContextHTML',
  'lockedExerciseHTML',
  'mount',
  'refresh',
  'returnURL',
  'sync',
  'unmount',
];
const MASTER_LAB = JSON.parse(masterStorage['taller-laboratorio-v1']);
const EXERCISES = [
  ...curriculum.lab.rust,
  ...curriculum.quests.rust,
  ...curriculum.lab.go,
  ...curriculum.quests.go,
  ...curriculum.cores.lowlevel,
  ...curriculum.cores.infra,
  ...curriculum.cores.play,
  ...curriculum.cores.pc,
];

interface LoadedAdapter {
  host: HTMLElement;
  writes: string[];
  stop: Mock;
  toast: Mock<(message: string) => void>;
}

const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
let currentHost: HTMLElement | undefined;

async function loadAdapter(url = '/#campana'): Promise<LoadedAdapter> {
  vi.resetModules();
  Element.prototype.scrollIntoView = vi.fn();
  history.replaceState(null, '', url);
  const writes: string[] = [];
  const items = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => items.get(key) ?? null,
    setItem(key, value) {
      writes.push(key);
      items.set(key, value);
    },
    removeItem(key) {
      writes.push(key);
      items.delete(key);
    },
  };
  vi.stubGlobal('localStorage', storage);
  const stop = vi.fn();
  vi.doMock('../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop }));
  vi.doMock('../content/content', () => ({
    getContent: () => ({ lab: curriculum.lab, quests: curriculum.quests }),
  }));
  const { campaignEngine } = await import('../../entities/campaign');
  campaignEngine.init(
    { exercises: EXERCISES, worlds: curriculum.campaign } as CampaignConfig,
    MASTER_LAB,
  );
  window.TallerCampaignEngine = campaignEngine;
  Object.assign(window, {
    TallerLab: { getExercises: () => EXERCISES, exportState: () => MASTER_LAB },
  });
  await import('./register-campaign');
  const host = document.createElement('div');
  document.body.append(host);
  currentHost = host;
  return { host, writes, stop, toast: vi.fn() };
}

afterEach(() => {
  try {
    act(() => window.TallerCampaign?.unmount());
  } finally {
    currentHost?.remove();
    currentHost = undefined;
    if (originalScrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
    } else {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.doUnmock('../../shared/lib/celebration');
    vi.doUnmock('../content/content');
    history.replaceState(null, '', '/');
  }
});

describe('the campaign adapter', () => {
  it('publishes exactly the seven methods that the lab and app.js use', async () => {
    await loadAdapter();

    expect(Object.keys(window.TallerCampaign).sort()).toEqual(METHODS);
    expect(Object.isFrozen(window.TallerCampaign)).toBe(true);
  });

  it('unmount stops the celebration even when nothing is mounted', async () => {
    const { stop } = await loadAdapter();

    window.TallerCampaign.unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('mount draws the campaign in the host and writes nothing', async () => {
    const { host, writes, toast } = await loadAdapter();

    act(() => window.TallerCampaign.mount(host, 'rust', toast));

    expect(within(host).getByRole('region', { name: 'Estación del robot' })).toBeInTheDocument();
    expect(writes).toEqual([]);
  });

  it('mount reads ?mundo= once and does not rewrite the URL', async () => {
    const { host, toast } = await loadAdapter('/?mundo=rust-world-2#campana');
    const replace = vi.spyOn(history, 'replaceState');

    act(() => window.TallerCampaign.mount(host, 'rust', toast));

    expect(within(host).getByRole('region', { name: 'Puerto de señales' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(location.search).toBe('?mundo=rust-world-2');
  });

  it('a second mount replaces the first page and keeps the chosen world', async () => {
    const { host, toast } = await loadAdapter();
    const user = userEvent.setup();
    act(() => window.TallerCampaign.mount(host, 'rust', toast));
    await user.click(within(host).getByRole('button', { name: /^Mundo 3: / }));
    history.replaceState(null, '', '/#campana');

    act(() => window.TallerCampaign.mount(host, 'rust', toast));

    expect(host.querySelectorAll('.quest-hero')).toHaveLength(1);
    expect(within(host).getByRole('region', { name: 'Archivo de rutas' })).toBeInTheDocument();
  });

  it('a Go mount after a Rust choice falls back to the first open Go world', async () => {
    const { host, toast } = await loadAdapter();
    const user = userEvent.setup();
    act(() => window.TallerCampaign.mount(host, 'rust', toast));
    await user.click(within(host).getByRole('button', { name: /^Mundo 2: / }));
    history.replaceState(null, '', '/#campana');

    act(() => window.TallerCampaign.mount(host, 'go', toast));

    expect(within(host).getByRole('region', { name: 'La estación del rover' })).toBeInTheDocument();
  });

  it('returnURL is the world link', async () => {
    await loadAdapter();

    expect(window.TallerCampaign.returnURL('rust-world-1')).toBe('?mundo=rust-world-1#campana');
  });
});
