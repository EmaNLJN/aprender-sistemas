import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blankRouteProgress,
  routeStore,
  type GuideData,
  type RouteProgressV1,
} from '../../../entities/guide';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import ProjectPage from './ProjectPage';

const KEY = 'taller-learning-v1';
const HEADINGS = [
  '01. Un lugar para guardar cosas',
  '02. Tu programa entiende comandos',
  '03. Los datos sobreviven al reinicio',
  '04. Medir antes de optimizar',
  '05. Una conversación por TCP',
];
const TERMINAL = '> SET curiosidad encendida\nOK\n> GET curiosidad\nencendida\n> _';
const RUST_INTRO =
  'Un pequeño almacén clave-valor en Rust. Cada capacidad te da una razón para aprender el siguiente concepto. El proyecto tiene su propio avance: los ejercicios del recorrido lo preparan.';

const guide: GuideData = {
  resources: [],
  tracks: {
    rust: { title: 'Rust', description: '', modules: [] },
    go: { title: 'Go', description: '', modules: [] },
  },
  sources: [],
};

interface SpecStorage extends StorageLike {
  items: Map<string, string>;
  writes: string[];
  failWrites: boolean;
}

const storage: SpecStorage = {
  items: new Map(),
  writes: [],
  failWrites: false,
  getItem: (key) => storage.items.get(key) ?? null,
  setItem: (key, value) => {
    if (storage.failWrites) throw new Error('quota');
    storage.writes.push(key);
    storage.items.set(key, value);
  },
  removeItem: (key) => void storage.items.delete(key),
};

function progress(overrides: Partial<RouteProgressV1>): RouteProgressV1 {
  return { ...blankRouteProgress(), ...overrides };
}

function seed(overrides: Partial<RouteProgressV1>): void {
  routeStore.applyImport({ state: progress(overrides), lossy: false });
  storage.writes.length = 0;
}

function storedMilestones(): string[] {
  const text = storage.items.get(KEY);
  return text === undefined ? [] : (JSON.parse(text) as RouteProgressV1).milestones;
}

function milestone(title: string): HTMLElement {
  return screen.getByRole('checkbox', { name: `Completar hito: ${title}` });
}

beforeAll(() => {
  routeStore.open(guide, { storage });
});

beforeEach(() => {
  storage.failWrites = false;
  routeStore.reset();
  storage.items.clear();
  storage.writes.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the project page', () => {
  it('shows the five milestones of Rust in order, its introduction and the counter at zero', () => {
    render(<ProjectPage language="rust" />);

    const headings = screen
      .getAllByRole('article')
      .map((article) => within(article).getByRole('heading', { level: 2 }).textContent);
    expect(headings).toEqual(HEADINGS);
    expect(screen.getByText('PROYECTO PERSONAL · 0 / 5 HITOS')).toBeInTheDocument();
    expect(screen.getByText(RUST_INTRO)).toBeInTheDocument();
  });

  it('counts only the marks of the active language', () => {
    seed({ milestones: ['rust-memory', 'go-files'] });

    render(<ProjectPage language="go" />);

    expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
    expect(milestone('Los datos sobreviven al reinicio')).toBeChecked();
    expect(milestone('Un lugar para guardar cosas')).not.toBeChecked();
    expect(screen.getByText(/^Un pequeño almacén clave-valor en Go\. /)).toBeInTheDocument();
  });

  it('saves the id of a checked milestone with one write and raises the counter', async () => {
    const user = userEvent.setup();
    render(<ProjectPage language="go" />);

    await user.click(milestone('Un lugar para guardar cosas'));

    expect(milestone('Un lugar para guardar cosas')).toBeChecked();
    expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
    expect(storage.writes).toEqual([KEY]);
    expect(storedMilestones()).toEqual(['go-memory']);
  });

  it('removes the id of an unchecked milestone', async () => {
    seed({ milestones: ['rust-memory', 'rust-files'] });
    const user = userEvent.setup();
    render(<ProjectPage language="rust" />);

    await user.click(milestone('Un lugar para guardar cosas'));

    expect(milestone('Un lugar para guardar cosas')).not.toBeChecked();
    expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
    expect(storedMilestones()).toEqual(['rust-files']);
  });

  it('toggles twice and writes twice on two quick clicks, and ends unchecked', async () => {
    const user = userEvent.setup();
    render(<ProjectPage language="rust" />);

    await user.dblClick(milestone('Tu programa entiende comandos'));

    expect(milestone('Tu programa entiende comandos')).not.toBeChecked();
    expect(storage.writes).toEqual([KEY, KEY]);
    expect(storedMilestones()).toEqual([]);
  });

  it('keeps the same checkbox focused and an open hint open after toggling (clarify Q3, X1)', async () => {
    const user = userEvent.setup();
    render(<ProjectPage language="rust" />);
    const hint = within(screen.getAllByRole('article')[1])
      .getByText('Necesito una pista')
      .closest('details');
    if (hint === null) throw new Error('the second milestone has no hint');
    hint.setAttribute('open', '');
    const checkbox = milestone('Un lugar para guardar cosas');

    await user.click(checkbox);

    expect(milestone('Un lugar para guardar cosas')).toBe(checkbox);
    expect(checkbox).toHaveFocus();
    expect(hint).toHaveAttribute('open');
  });

  it('shows a change made by another way and the blank progress after a reset', () => {
    render(<ProjectPage language="rust" />);

    act(() => {
      routeStore.applyImport({
        state: progress({ milestones: ['rust-memory', 'rust-files'] }),
        lossy: false,
      });
    });
    expect(screen.getByText('PROYECTO PERSONAL · 2 / 5 HITOS')).toBeInTheDocument();
    expect(milestone('Los datos sobreviven al reinicio')).toBeChecked();

    act(() => {
      routeStore.reset();
    });
    expect(screen.getByText('PROYECTO PERSONAL · 0 / 5 HITOS')).toBeInTheDocument();
    expect(milestone('Los datos sobreviven al reinicio')).not.toBeChecked();
  });

  it('keeps the toggled milestone in memory when the write fails', async () => {
    storage.failWrites = true;
    const user = userEvent.setup();
    render(<ProjectPage language="rust" />);

    await user.click(milestone('Medir antes de optimizar'));

    expect(milestone('Medir antes de optimizar')).toBeChecked();
    expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
    expect(storage.items.has(KEY)).toBe(false);
  });

  it('releases its subscription to the revision when it unmounts', () => {
    const subscribe = routeStore.changes.subscribe;
    let active = 0;
    vi.spyOn(routeStore.changes, 'subscribe').mockImplementation((listener) => {
      active += 1;
      const unsubscribe = subscribe(listener);
      return () => {
        active -= 1;
        unsubscribe();
      };
    });

    const { unmount } = render(<ProjectPage language="rust" />);
    expect(active).toBe(1);

    unmount();
    expect(active).toBe(0);
  });

  it('writes the example terminal with its line breaks and spaces', () => {
    const { container } = render(<ProjectPage language="rust" />);

    expect(container.querySelector('pre.terminal')?.textContent).toBe(TERMINAL);
  });

  it('links to the library by its hash', () => {
    render(<ProjectPage language="go" />);

    expect(screen.getByRole('link', { name: 'Encontralos en la biblioteca' })).toHaveAttribute(
      'href',
      '#biblioteca',
    );
  });
});
