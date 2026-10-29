import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { initProbeEngine, passingLabState } from '../model/systems-page.factory';
import { workshopView } from '../model/workshop-views';
import BuildPart from './BuildPart';

describe('BuildPart', () => {
  beforeEach(() => localStorage.clear());

  it('shows the core of the language with its tests and its IDE link', () => {
    const exercises = initProbeEngine();
    render(
      <BuildPart
        workshop={workshopView('probe', 'rust')}
        language="rust"
        exercises={exercises}
        onPartChange={vi.fn()}
      />,
    );

    expect(screen.getByText('NÚCLEO EJECUTABLE · RUST')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'El núcleo de la sonda' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 pruebas reales')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar al IDE ↗' })).toHaveAttribute(
      'href',
      '?sistema=probe&ejercicio=rust-probe&paso=code#laboratorio',
    );
    expect(screen.getByText('Llevá la sonda a Cargo.')).toBeInTheDocument();
  });

  it('writes each pill as a single text node', () => {
    const exercises = initProbeEngine();
    const { container } = render(
      <BuildPart
        workshop={workshopView('probe', 'rust')}
        language="rust"
        exercises={exercises}
        onPartChange={vi.fn()}
      />,
    );

    const pills = container.querySelectorAll('.sys-pills span');
    expect(pills).toHaveLength(3);
    pills.forEach((pill) => expect(pill.childNodes).toHaveLength(1));
  });

  it('links the known previous tools and skips the unknown ones', () => {
    const exercises = initProbeEngine();
    render(
      <BuildPart
        workshop={{
          ...workshopView('probe', 'rust'),
          related: { rust: ['rust-tool', 'rust-gone'] },
        }}
        language="rust"
        exercises={exercises}
        onPartChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /^rust-tool/ })).toHaveAttribute(
      'href',
      '?sistema=probe&ejercicio=rust-tool&paso=code#laboratorio',
    );
    expect(screen.queryByText('rust-gone')).toBeNull();
  });

  it('shows the verified-code notice only with the code seal', () => {
    const exercises = initProbeEngine();
    const { rerender } = render(
      <BuildPart
        workshop={workshopView('probe', 'rust')}
        language="rust"
        exercises={exercises}
        onPartChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('status')).toBeNull();

    systemsEngine.syncLab(passingLabState());
    rerender(
      <BuildPart
        workshop={workshopView('probe', 'rust')}
        language="rust"
        exercises={exercises}
        onPartChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      /^✓ Este núcleo tiene una ejecución registrada/,
    );
  });

  it('the footer button asks for the ship part', async () => {
    const user = userEvent.setup();
    const onPartChange = vi.fn();
    const exercises = initProbeEngine();
    render(
      <BuildPart
        workshop={workshopView('probe', 'rust')}
        language="rust"
        exercises={exercises}
        onPartChange={onPartChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Armar mi proyecto →' }));

    expect(onPartChange).toHaveBeenCalledWith('ship');
  });
});
