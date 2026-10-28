import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { realCampaign, realMissions, renderCampaignPage } from './campaign-page-harness';

vi.mock(import('../../../shared/lib/celebration'), () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const EDITORIAL_NUMBERS = { seis: 6, cuatro: 4 } as const;

interface EditorialPhrase {
  phrase: string;
  pattern: RegExp;
  word: keyof typeof EDITORIAL_NUMBERS;
  file: string;
}

const EDITORIAL_PHRASES: EditorialPhrase[] = [
  {
    phrase: 'Seis misiones para conectar las piezas.',
    pattern: /Seis misiones para conectar las piezas\./,
    word: 'seis',
    file: 'ui/OpenWorld.tsx',
  },
  {
    phrase: 'verificar sus seis misiones',
    pattern: /verificar sus seis misiones/,
    word: 'seis',
    file: 'ui/CampaignPage.tsx',
  },
  {
    phrase: 'Se abre al verificar las seis misiones',
    pattern: /Se abre al verificar las seis misiones/,
    word: 'seis',
    file: 'ui/WorldCheckpoint.tsx',
  },
];

const FINAL_NOTICE = {
  phrase: 'Completaste los cuatro mundos.',
  word: 'cuatro',
  file: 'ui/CampaignPage.tsx',
} as const;

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

function fullRustProgress(): string {
  const seals = Object.fromEntries(
    curriculum.campaign.rust
      .flatMap((world) => [...world.trainingIds, ...world.challengeIds])
      .map((id) => [id, { code: true, prediction: true, assisted: false }]),
  );
  const checkpoints = Object.fromEntries(
    curriculum.campaign.rust
      .slice(0, -1)
      .map((world) => [world.id, { passed: true, lastAnswer: world.checkpoint.answer }]),
  );
  return JSON.stringify({ version: 1, seals, checkpoints });
}

describe('CampaignPage editorial numbers', () => {
  it('keeps the spelled-out numbers in step with the catalog', async () => {
    const empty = renderCampaignPage({ config: realCampaign(), missions: realMissions('rust') });
    for (const { phrase, pattern } of EDITORIAL_PHRASES)
      expect(
        screen.queryAllByText(pattern).length,
        `La frase «${phrase}» ya no está en la página`,
      ).toBeGreaterThan(0);
    empty.unmount();

    const finale = renderCampaignPage({
      config: realCampaign(),
      missions: realMissions('rust'),
      stored: { 'taller-campaign-v1': fullRustProgress() },
    });
    const lastWorld = curriculum.campaign.rust.at(-1)!;
    const checkpoint = screen.getByRole('region', { name: 'El código funciona. ¿Sabés por qué?' });
    await finale.user.click(within(checkpoint).getAllByRole('button')[lastWorld.checkpoint.answer]);
    const announced = finale.notify.mock.calls.some(([message]) =>
      message.includes(FINAL_NOTICE.phrase),
    );
    expect(announced, `La frase «${FINAL_NOTICE.phrase}» ya no está en la página`).toBe(true);

    for (const { phrase, word, file } of EDITORIAL_PHRASES)
      for (const language of ['rust', 'go'] as const)
        for (const world of curriculum.campaign[language])
          expect(
            world.trainingIds.length + world.challengeIds.length,
            `La frase «${phrase}» dice «${word}» y ${world.id} tiene ${world.trainingIds.length + world.challengeIds.length}: editala en ${file}`,
          ).toBe(EDITORIAL_NUMBERS[word]);
    for (const language of ['rust', 'go'] as const)
      expect(
        curriculum.campaign[language].length,
        `La frase «${FINAL_NOTICE.phrase}» dice «${FINAL_NOTICE.word}» y ${language} tiene ${curriculum.campaign[language].length}: editala en ${FINAL_NOTICE.file}`,
      ).toBe(EDITORIAL_NUMBERS[FINAL_NOTICE.word]);
  });
});
