import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { resetSimulations, saveCatalogFilter } from '../model/systems-session';
import { initProbeEngine, probeModels, workshopFactory } from '../model/systems-page.factory';
import SystemsPage from './SystemsPage';

function renderPage(searchParams: string) {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const scrollToTop = vi.fn();
  const exercises = initProbeEngine([
    workshopFactory.build(),
    workshopFactory.build({ id: 'wal', title: 'Un registro previo', category: 'infra' }),
  ]);
  render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
      <SystemsPage
        language="rust"
        models={probeModels}
        exercises={exercises}
        notify={vi.fn()}
        downloadKit={vi.fn()}
        scrollToTop={scrollToTop}
      />
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate, scrollToTop };
}

describe('SystemsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSimulations();
    saveCatalogFilter({ family: 'all', query: '' });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('opens the catalog for an unknown workshop', () => {
    renderPage('?taller=inexistente');

    expect(screen.getByRole('heading', { level: 1, name: /Abrí la caja\./ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '← Todos los talleres' })).toBeNull();
  });

  it('writes the breadcrumb label as a single text node', () => {
    renderPage('?lenguaje=rust&taller=probe&parte=explore');

    const label = document.querySelector('.sys-breadcrumb span');
    expect(label?.childNodes).toHaveLength(1);
  });

  it('opens the workshop of the query at the part of the query, and Explorar for an unknown part', () => {
    renderPage('?lenguaje=rust&taller=probe&parte=inventada');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Una sonda de prueba' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manipulá el sistema/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('«Explorar →» writes the query, focuses the title and scrolls #main to the top', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, scrollToTop } = renderPage('?lenguaje=rust');

    await user.click(screen.getAllByRole('button', { name: 'Explorar →' })[0]);

    expect(screen.getByRole('heading', { level: 1, name: 'Una sonda de prueba' })).toHaveFocus();
    expect(scrollToTop).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        '?lenguaje=rust&taller=probe&parte=explore',
      ),
    );
  });

  it('going back writes the catalog query and focuses «Explorar →» of the workshop it leaves', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, scrollToTop } = renderPage('?lenguaje=rust&taller=wal&parte=explore');

    await user.click(screen.getByRole('button', { name: '← Todos los talleres' }));

    expect(screen.getAllByRole('button', { name: 'Explorar →' })[1]).toHaveFocus();
    expect(scrollToTop).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?lenguaje=rust'),
    );
  });

  it('back falls back to the search box when the session filter hides the workshop', async () => {
    const user = userEvent.setup();
    saveCatalogFilter({ family: 'machine', query: '' });
    renderPage('?lenguaje=rust&taller=wal&parte=explore');

    await user.click(screen.getByRole('button', { name: '← Todos los talleres' }));

    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveFocus();
  });

  it('a part change writes the query, focuses its tab and scrolls the tabs to the top', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderPage('?lenguaje=rust&taller=probe&parte=explore');

    await user.click(screen.getByRole('button', { name: 'Programar el núcleo →' }));

    expect(screen.getByRole('button', { name: /Programá su núcleo/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: /Programá su núcleo/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        '?lenguaje=rust&taller=probe&parte=build',
      ),
    );
  });

  it('shows a write made outside the page (FR-018)', async () => {
    renderPage('?lenguaje=rust');
    expect(screen.getByText('0 / 2')).toBeInTheDocument();

    systemsEngine.observe('probe', 'rust', ['touched-a', 'touched-b', 'touched-empty']);
    systemsEngine.answer('probe', 'rust', 1);

    await waitFor(() => expect(screen.getAllByText('2/3 sellos')).toHaveLength(1));
  });
});
