import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { campaignEngine } from '../../../entities/campaign';
import { handMadeCampaign } from '../../../entities/campaign/model/campaign-config.factory';
import { missionContentFor } from '../model/mission-content.factory';
import { renderCampaignPage } from './campaign-page-harness';

vi.mock('../../../entities/campaign', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../entities/campaign')>()),
  CODE_XP: 7,
  PREDICTION_XP: 4,
  PASS_SCORE: 77,
  WORLD_MAX_SCORE: 99,
}));
vi.mock(import('../../../shared/lib/celebration'), () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const HARD_CODED_NUMBER = /(?<!\d)(?:20|10|30|150|180|720)(?!\d)/;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const getWorlds = campaignEngine.getWorlds.bind(campaignEngine);
  vi.spyOn(campaignEngine, 'getWorlds').mockImplementation((language) =>
    getWorlds(language).map((world) => ({ ...world, maxScore: 99 })),
  );
  const getSummary = campaignEngine.getSummary.bind(campaignEngine);
  vi.spyOn(campaignEngine, 'getSummary').mockImplementation((language) => ({
    ...getSummary(language),
    maxScore: 396,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CampaignPage constants', () => {
  it('shows every XP number from the constants and the derived worlds', () => {
    const config = handMadeCampaign({ rust: 4, go: 1 });
    const { container } = renderCampaignPage({
      config,
      missions: missionContentFor(config, 'rust'),
    });

    expect(screen.getAllByText('0/11 XP')).toHaveLength(6);
    expect(screen.getAllByText('○ Pruebas · 7')).toHaveLength(6);
    expect(screen.getAllByText('○ Predicción · 4')).toHaveLength(6);
    expect(screen.getByText('0/99 XP · explorar →')).toBeInTheDocument();
    expect(container.querySelector('.world-score')).toHaveTextContent('0/ 99 XP');
    for (const bar of screen.getAllByRole('progressbar', { name: /^Experiencia en / }))
      expect(bar).toHaveAttribute('max', '99');
    expect(screen.getByRole('progressbar', { name: 'Experiencia de campaña' })).toHaveAttribute(
      'max',
      '396',
    );
    expect(screen.getByText('0 / 396 XP de campaña')).toBeInTheDocument();
    expect(screen.getAllByText(/al reunir 77 XP/)).toHaveLength(1);
    expect(screen.getAllByText(/reunir 77 XP/)).toHaveLength(2);
    expect(
      screen.getByText(/7 XP por las pruebas del ejercicio y 4 por su predicción correcta\./),
    ).toBeInTheDocument();

    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('li').forEach((item) => item.remove());
    expect(clone.textContent).not.toMatch(HARD_CODED_NUMBER);
    for (const element of clone.querySelectorAll('*'))
      for (const attribute of element.attributes)
        expect(attribute.value).not.toMatch(HARD_CODED_NUMBER);
  });
});
