import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import masterFixture from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import { campaignEngine, type CampaignLabState } from '../../../entities/campaign';
import { celebrate } from '../../../shared/lib/celebration';
import {
  realCampaign,
  realMissions,
  renderCampaignPage,
  type CampaignPageSetup,
} from './campaign-page-harness';

vi.mock(import('../../../shared/lib/celebration'), () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const CAMPAIGN_KEY = 'taller-campaign-v1';
const masterRecords = masterFixture as Record<string, string>;
const masterLabState = JSON.parse(masterRecords['taller-laboratorio-v1']) as CampaignLabState;
const masterCampaignStorage = { [CAMPAIGN_KEY]: masterRecords[CAMPAIGN_KEY] };

function rustSetup(overrides: Partial<CampaignPageSetup> = {}): CampaignPageSetup {
  return { config: realCampaign(), missions: realMissions('rust'), ...overrides };
}

function checkpointRegion() {
  return screen.getByRole('region', { name: 'El código funciona. ¿Sabés por qué?' });
}

function hasStatusWith(text: string): boolean {
  return screen.getAllByRole('status').some((status) => status.textContent?.includes(text));
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CampaignPage', () => {
  it('shows the hero, the rank and the map of an empty browser', () => {
    renderCampaignPage(rustSetup());

    expect(screen.getByText('CAMPAÑA · RUST')).toBeInTheDocument();
    expect(screen.getByText('4 mundos')).toBeInTheDocument();
    expect(screen.getByText('24 misiones')).toBeInTheDocument();
    expect(screen.getByText('12 desafíos nuevos')).toBeInTheDocument();
    expect(screen.getByText('Explorador')).toBeInTheDocument();
    expect(screen.getByText('0 / 720 XP de campaña')).toBeInTheDocument();
    expect(screen.getByText('0 de 4 insignias')).toBeInTheDocument();
    const map = within(screen.getByRole('navigation', { name: 'Mundos de la campaña' }));
    const nodes = map.getAllByRole('button');
    expect(nodes.map((node) => node.getAttribute('aria-label'))).toEqual([
      'Mundo 1: Estación del robot, disponible',
      'Mundo 2: Puerto de señales, bloqueado; ver requisitos',
      'Mundo 3: Archivo de rutas, bloqueado; ver requisitos',
      'Mundo 4: Núcleo de la máquina, bloqueado; ver requisitos',
    ]);
    expect(nodes.map((node) => node.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    expect(screen.getByRole('region', { name: 'Estación del robot' })).toBeInTheDocument();
  });

  it('with the progress of master selects world 2 and counts one badge', () => {
    renderCampaignPage(rustSetup({ stored: masterCampaignStorage, labState: masterLabState }));

    expect(screen.getByText('Aprendiz de sistemas')).toBeInTheDocument();
    expect(screen.getByText('180 / 720 XP de campaña')).toBeInTheDocument();
    expect(screen.getByText('1 de 4 insignias')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Puerto de señales' })).toBeInTheDocument();
  });

  it('in Go shows the Go campaign', () => {
    renderCampaignPage({ config: realCampaign(), missions: realMissions('go'), language: 'go' });

    expect(screen.getByText('CAMPAÑA · GO')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'La estación del rover' })).toBeInTheDocument();
  });

  it('choosing a world rewrites ?mundo= in place, scrolls without animation and focuses its title', async () => {
    history.replaceState(null, '', '/?mundo=rust-world-1&x=1#campana');
    const replaceState = vi.spyOn(history, 'replaceState');
    const titlesWhenScrolled: (string | undefined)[] = [];
    vi.mocked(Element.prototype.scrollIntoView).mockImplementation(function (this: Element) {
      titlesWhenScrolled.push(this.querySelector('h2')?.textContent);
    });
    const { user, onSessionChange } = renderCampaignPage(rustSetup());

    await user.click(screen.getByRole('button', { name: /^Mundo 2: / }));

    const [state, unused, url] = replaceState.mock.lastCall!;
    expect(state).toBeNull();
    expect(unused).toBe('');
    expect(String(url).endsWith('/?mundo=rust-world-2#campana')).toBe(true);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    expect((scroll.mock.contexts[0] as Element).id).toBe('quest-world');
    expect(scroll.mock.invocationCallOrder[0]).toBeGreaterThan(
      replaceState.mock.invocationCallOrder.at(-1)!,
    );
    expect(titlesWhenScrolled).toEqual(['Puerto de señales']);
    expect(screen.getByRole('heading', { level: 2, name: 'Puerto de señales' })).toHaveFocus();
    expect(onSessionChange).toHaveBeenLastCalledWith({ selected: 'rust-world-2', filter: 'all' });
  });

  it('filtering shows the missions of the type and keeps the focus on the button', () => {
    const { onSessionChange } = renderCampaignPage(
      rustSetup({ stored: masterCampaignStorage, labState: masterLabState }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Kata' }));

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(1);
    expect(
      within(articles[0]).getByRole('heading', {
        level: 4,
        name: 'Kata · Una huella que recuerda el orden',
      }),
    ).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Kata' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveFocus();
    expect(onSessionChange).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'Kata' }));
  });

  it('choosing another world resets the filter', async () => {
    const { user } = renderCampaignPage(
      rustSetup({ stored: masterCampaignStorage, labState: masterLabState }),
    );

    await user.click(screen.getByRole('button', { name: 'Kata' }));
    await user.click(screen.getByRole('button', { name: /^Mundo 1: / }));

    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('answering wrong marks the option, keeps the focus and writes once', () => {
    const { notify, storage } = renderCampaignPage(rustSetup({ labState: masterLabState }));
    const optionA = within(checkpointRegion()).getAllByRole('button')[0];

    fireEvent.click(optionA);

    expect(optionA).toHaveAttribute('aria-pressed', 'true');
    expect(optionA).toHaveClass('incorrect');
    expect(optionA).toHaveFocus();
    expect(within(checkpointRegion()).getByRole('status')).toHaveTextContent('Revisemos esa idea.');
    expect(notify).toHaveBeenCalledWith('Leé el porqué y probá otra explicación.');
    expect(storage.writes).toEqual([CAMPAIGN_KEY]);
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('answering right completes the world and celebrates once', async () => {
    const { user, notify } = renderCampaignPage(rustSetup({ labState: masterLabState }));

    await user.click(within(checkpointRegion()).getAllByRole('button')[1]);

    expect(notify).toHaveBeenCalledWith(
      '¡Piloto de estados! Un mundo completado. Tu próximo nivel está disponible.',
    );
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(hasStatusWith('Insignia conseguida: Piloto de estados')).toBe(true);
    expect(screen.getByRole('button', { name: 'Siguiente mundo →' })).toBeInTheDocument();
  });

  it('the feedback region is the same node after answering', async () => {
    const { user } = renderCampaignPage(rustSetup({ labState: masterLabState }));
    const feedback = screen.getByText('Elegí la explicación que mejor sostenga tu decisión.');

    await user.click(within(checkpointRegion()).getAllByRole('button')[0]);

    expect(within(checkpointRegion()).getByRole('status')).toBe(feedback);
  });

  it("the rules and a mission's requirements stay open after an action", async () => {
    const { user } = renderCampaignPage(rustSetup());
    const rules = screen.getByText(/^Las reglas del juego/).closest('details')!;
    const boss = screen.getAllByRole('article').at(-1)!;
    const requirements = within(boss).getByText('Ver qué falta para entrar').closest('details')!;
    rules.open = true;
    requirements.open = true;

    await user.click(screen.getByRole('button', { name: 'Desafío final' }));
    await user.click(screen.getByRole('button', { name: /^Mundo 1: / }));

    expect(requirements).toBeInTheDocument();
    expect(requirements.open).toBe(true);

    await user.click(screen.getByRole('button', { name: /^Mundo 2: / }));

    expect(rules).toBeInTheDocument();
    expect(rules.open).toBe(true);
  });

  it('a locked world shows its requirements and the way back to the open world', async () => {
    const { user, onSessionChange } = renderCampaignPage(rustSetup());

    await user.click(
      screen.getByRole('button', { name: 'Mundo 3: Archivo de rutas, bloqueado; ver requisitos' }),
    );

    const locked = screen.getByRole('region', { name: 'Archivo de rutas' });
    expect(within(locked).getByText('Avanzado / PRÓXIMA FRONTERA')).toBeInTheDocument();
    expect(
      within(locked).getByRole('heading', { level: 3, name: 'Esta región tiene un requisito.' }),
    ).toBeInTheDocument();
    const requirements = within(locked).getAllByRole('listitem');
    expect(requirements).toHaveLength(2);
    expect(requirements[0]).toHaveTextContent(/^Completá «Estación del robot»: /);
    expect(requirements[1]).toHaveTextContent(/^Completá «Puerto de señales»: /);
    expect(within(locked).queryByRole('group', { name: 'Tipo de misión' })).not.toBeInTheDocument();

    await user.click(within(locked).getByRole('button', { name: 'Volver a Estación del robot →' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Estación del robot' })).toHaveFocus();
    expect(onSessionChange).toHaveBeenLastCalledWith({ selected: 'rust-world-1', filter: 'all' });
  });

  it('opening, choosing a world and filtering write nothing', async () => {
    const { user, storage } = renderCampaignPage(rustSetup());
    expect(storage.writes).toEqual([]);

    await user.click(screen.getByRole('button', { name: /^Mundo 2: / }));
    await user.click(screen.getByRole('button', { name: /^Mundo 1: / }));
    await user.click(screen.getByRole('button', { name: 'Kata' }));

    expect(storage.writes).toEqual([]);
  });

  it('redraws when the engine accepts a checkpoint without the page asking', () => {
    renderCampaignPage(rustSetup({ labState: masterLabState }));

    act(() => {
      campaignEngine.answerCheckpoint('rust-world-1', 1);
    });

    expect(screen.getByText('Bien razonado.').closest('[role="status"]')).not.toBeNull();
  });

  it('a blocked storage shows the notice', () => {
    renderCampaignPage(rustSetup({ blockedStorage: true }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.',
    );
  });

  it('a storage that fails after opening shows the notice on the next draw', async () => {
    const { user, storage } = renderCampaignPage(rustSetup({ labState: masterLabState }));
    storage.failWrites = true;

    await user.click(within(checkpointRegion()).getAllByRole('button')[1]);

    expect(screen.getByText('Bien razonado.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.',
      ),
    ).toBeInTheDocument();
  });

  it('a copy saved by another tab is merged when answering', async () => {
    const { user, storage } = renderCampaignPage(rustSetup({ labState: masterLabState }));
    storage.items.set(
      CAMPAIGN_KEY,
      '{"version":1,"seals":{"rust-18":{"code":true,"prediction":false,"assisted":false}},"checkpoints":{}}',
    );

    await user.click(within(checkpointRegion()).getAllByRole('button')[1]);
    await user.click(screen.getByRole('button', { name: /^Mundo 2: / }));

    const card = screen
      .getByRole('heading', { level: 4, name: 'Prefijo seguro en bytes' })
      .closest('article')!;
    expect(within(card).getByText('✓ Pruebas · 20')).toBeInTheDocument();
  });

  it('a rejected answer only announces the reasons', async () => {
    vi.spyOn(campaignEngine, 'answerCheckpoint').mockReturnValueOnce({
      accepted: false,
      correct: false,
      passed: false,
      explanation: '',
      reasons: ['Primero A.', 'Después B.'],
    });
    const { user, notify } = renderCampaignPage(rustSetup({ labState: masterLabState }));
    const optionA = within(checkpointRegion()).getAllByRole('button')[0];

    await user.click(optionA);

    expect(notify).toHaveBeenCalledWith('Primero A. Después B.');
    expect(optionA).toHaveAttribute('aria-pressed', 'false');
    expect(within(checkpointRegion()).getByRole('status')).toHaveTextContent(
      'Elegí la explicación que mejor sostenga tu decisión.',
    );
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('a language without worlds shows the empty message', () => {
    const { container } = renderCampaignPage({
      config: {
        exercises: realCampaign().exercises,
        worlds: { rust: [], go: curriculum.campaign.go },
      } as ReturnType<typeof realCampaign>,
      missions: realMissions('rust'),
    });

    expect(container.children).toHaveLength(1);
    expect(screen.getByText('La campaña todavía no tiene mundos disponibles.')).toBeInstanceOf(
      HTMLParagraphElement,
    );
  });
});
