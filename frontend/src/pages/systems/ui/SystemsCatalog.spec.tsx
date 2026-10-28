import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveCatalogFilter } from '../model/systems-session';
import { initProbeEngine, workshopFactory } from '../model/systems-page.factory';
import { workshopViews } from '../model/workshop-views';
import SystemsCatalog from './SystemsCatalog';

function seedCatalog() {
  initProbeEngine([
    workshopFactory.build({ id: 'probe', title: 'Una sonda de prueba', category: 'machine' }),
    workshopFactory.build({ id: 'wal', title: 'Un registro previo', category: 'infra' }),
  ]);
  return workshopViews('rust');
}

describe('SystemsCatalog', () => {
  beforeEach(() => {
    localStorage.clear();
    saveCatalogFilter({ family: 'all', query: '' });
  });

  it('counts the workshops, the cores and the completed ones', () => {
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);

    expect(screen.getByText('2 talleres')).toBeInTheDocument();
    expect(screen.getByText('4 núcleos programables')).toBeInTheDocument();
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Talleres con modelo, código y checkpoint completados' })).toHaveAttribute('max', '2');
  });

  it('filters by family with aria-pressed, keeps the focus and keeps the counter node', async () => {
    const user = userEvent.setup();
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);
    const counter = screen.getByText('2 talleres para explorar');

    await user.click(screen.getByRole('button', { name: 'Datos e infraestructura' }));

    expect(screen.getByRole('button', { name: 'Datos e infraestructura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Datos e infraestructura' })).toHaveFocus();
    expect(counter).toHaveTextContent('1 talleres para explorar');
    expect(screen.getAllByRole('button', { name: 'Explorar →' })).toHaveLength(1);
  });

  it('shows the empty state and «Ver todos los talleres» clears the filter and focuses the search box', async () => {
    const user = userEvent.setup();
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' }), 'zzzz');
    expect(screen.getByRole('heading', { name: 'No aparece ese taller.' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver todos los talleres' }));

    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveValue('');
    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveFocus();
    expect(screen.getAllByRole('button', { name: 'Explorar →' })).toHaveLength(2);
  });

  it('keeps the family and the search across mounts', async () => {
    const user = userEvent.setup();
    const first = render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Datos e infraestructura' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' }), 'registro');
    first.unmount();

    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Datos e infraestructura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveValue('registro');
  });

  it('opens a workshop by its id', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={onOpen} />);

    await user.click(screen.getAllByRole('button', { name: 'Explorar →' })[1]);

    expect(onOpen).toHaveBeenCalledWith('wal');
  });

  it('focuses «Explorar →» of the workshop it returns from', () => {
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo="wal" onOpen={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: 'Explorar →' })[1]).toHaveFocus();
  });

  it('focuses the search box when the session filter hides the workshop it returns from', () => {
    saveCatalogFilter({ family: 'machine', query: '' });

    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo="wal" onOpen={vi.fn()} />);

    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveFocus();
  });
});
