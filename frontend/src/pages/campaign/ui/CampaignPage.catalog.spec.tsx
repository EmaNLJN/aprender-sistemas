import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handMadeCampaign } from '../../../entities/campaign/model/campaign-config.factory';
import { missionContentFactory, missionContentFor } from '../model/mission-content.factory';
import { renderCampaignPage } from './campaign-page-harness';

vi.mock(import('../../../shared/lib/celebration'), () => ({ celebrate: vi.fn(), stop: vi.fn() }));

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

describe('CampaignPage with a hand-made catalog', () => {
  it('five worlds show their own counts', () => {
    const config = handMadeCampaign({ rust: 5, go: 1 });

    renderCampaignPage({ config, missions: missionContentFor(config, 'rust') });

    expect(screen.getByText('5 mundos')).toBeInTheDocument();
    expect(screen.getByText('30 misiones')).toBeInTheDocument();
    expect(screen.getByText('15 desafíos nuevos')).toBeInTheDocument();
    expect(screen.getByText('0 de 5 insignias')).toBeInTheDocument();
    expect(screen.getByText('0 / 900 XP de campaña')).toBeInTheDocument();
  });

  it('a title with HTML characters is shown as text', () => {
    const config = handMadeCampaign({ rust: 1, go: 1 });
    const title = 'Mundo <raro> & "citado"';
    if (Array.isArray(config.worlds)) throw new Error('expected worlds per language');
    config.worlds.rust[0].title = title;

    renderCampaignPage({ config, missions: missionContentFor(config, 'rust') });

    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Mundo 1: ${title}, disponible` }),
    ).toBeInTheDocument();
  });

  it('a filter without missions leaves the grid empty', async () => {
    const config = handMadeCampaign({ rust: 1, go: 1 });
    const missions = missionContentFor(config, 'rust');
    if (Array.isArray(config.worlds)) throw new Error('expected worlds per language');
    missions.set(
      config.worlds.rust[0].challengeIds[1],
      missionContentFactory.build({ challengeType: 'repair' }),
    );
    const { user, container } = renderCampaignPage({ config, missions });

    await user.click(screen.getByRole('button', { name: 'Kata' }));

    const grid = container.querySelector<HTMLElement>('.quest-missions')!;
    expect(within(grid).queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Kata' })).toHaveAttribute('aria-pressed', 'true');
  });
});
