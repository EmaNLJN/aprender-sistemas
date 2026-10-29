import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { initProbeEngine } from '../model/systems-page.factory';
import type { SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';
import ShipPart from './ShipPart';

interface HarnessProps {
  notify?: (message: string) => void;
  downloadKit?: (workshop: SystemsWorkshopView) => void;
}

const Subscribed = ({ notify = vi.fn(), downloadKit = vi.fn() }: HarnessProps) => {
  useStore(systemsEngine.changes, (state) => state.revision);
  return (
    <ShipPart
      workshop={workshopView('probe', 'rust')}
      language="rust"
      notify={notify}
      downloadKit={downloadKit}
    />
  );
};

describe('ShipPart', () => {
  beforeEach(() => {
    localStorage.clear();
    initProbeEngine();
  });

  it('downloads the kit of the fresh workshop and announces it', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const downloadKit = vi.fn();
    render(<Subscribed notify={notify} downloadKit={downloadKit} />);

    await user.click(screen.getByRole('button', { name: 'Descargar kit Rust ↓' }));

    expect(downloadKit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'probe', storageAvailable: true }),
    );
    expect(notify).toHaveBeenCalledWith('Kit descargado con tu borrador y sus pruebas.');
  });

  it('builds the kit with the progress of the mounted language', async () => {
    const user = userEvent.setup();
    const downloadKit = vi.fn();
    systemsEngine.setNote('probe', 'rust', 'nota de rust');
    systemsEngine.setNote('probe', 'go', 'nota de go');
    render(<Subscribed downloadKit={downloadKit} />);

    await user.click(screen.getByRole('button', { name: 'Descargar kit Rust ↓' }));

    expect(downloadKit).toHaveBeenCalledWith(
      expect.objectContaining({ progress: expect.objectContaining({ note: 'nota de rust' }) }),
    );
  });

  it('announces why the kit could not be prepared', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    render(
      <Subscribed
        notify={notify}
        downloadKit={() => {
          throw new Error('sin núcleo');
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Descargar kit Rust ↓' }));

    expect(notify).toHaveBeenCalledWith('No se pudo preparar el kit: sin núcleo');
  });

  it('a stage saves its index and stays checked', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    const boxes = screen.getAllByRole('checkbox', {
      name: 'Lo comprobé en mi proyecto · registro manual',
    });

    await user.click(boxes[2]);

    expect(workshopView('probe', 'rust').progress.steps).toEqual([2]);
    expect(boxes[2]).toBeChecked();
    expect(boxes[0]).not.toBeChecked();
  });

  it('the note saves on every key and says so', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    const note = screen.getByRole('textbox', { name: 'Dejá tu próximo experimento por escrito' });
    expect(
      screen.getByText(
        'La nota y las etapas se guardan con tu progreso. Las casillas son tu registro, no una evaluación automática.',
      ),
    ).toBeInTheDocument();

    await user.type(note, 'hola');

    expect(workshopView('probe', 'rust').progress.note).toBe('hola');
    expect(
      screen.getByText('Nota guardada. Dejá un test concreto para volver.'),
    ).toBeInTheDocument();
    expect(note).toHaveAttribute('maxlength', '10000');
  });

  it('says the note could not be saved when the storage fails', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    await user.type(
      screen.getByRole('textbox', { name: 'Dejá tu próximo experimento por escrito' }),
      'x',
    );

    expect(
      screen.getByText('No se pudo guardar: exportá tu avance antes de cerrar.'),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
