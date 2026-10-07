import { describe, expect, it } from 'vitest';
import curriculum from '../../../../build/curriculum.json';
import { PORTION_NAMES, type PortionName, type SourcePortion } from '../../shared/api/content';
import { assembleContent } from './assemble-content';

function realPortion(name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = (curriculum as Record<string, unknown>)[group];
  return slice === undefined ? value : (value as Record<string, unknown>)[slice];
}

const portions: SourcePortion[] = PORTION_NAMES.map((name) => ({
  name,
  version: 'v1',
  data: realPortion(name),
}));

describe('assembleContent', () => {
  const content = assembleContent(portions);

  it('keeps the lists of each language as the very same arrays', () => {
    expect(content.lab.rust).toBe(realPortion('lab.rust'));
    expect(content.lab.go).toBe(realPortion('lab.go'));
    expect(content.quests.go).toBe(realPortion('quests.go'));
    expect(content.campaign.rust).toBe(realPortion('campaign.rust'));
    expect(content.atlas.go).toBe(realPortion('atlas.go'));
  });

  it('keeps the lists of each systems domain as the very same arrays', () => {
    expect(content.cores.lowlevel).toBe(realPortion('cores.lowlevel'));
    expect(content.cores.pc).toBe(realPortion('cores.pc'));
    expect(content.workshops.infra).toBe(realPortion('workshops.infra'));
    expect(content.workshops.play).toBe(realPortion('workshops.play'));
  });

  it('keeps the guide as the very same object', () => {
    expect(content.guide).toBe(realPortion('guide'));
  });

  it('groups the portions under the keys of the document', () => {
    expect(Object.keys(content)).toEqual([
      'lab',
      'quests',
      'cores',
      'campaign',
      'workshops',
      'atlas',
      'guide',
    ]);
  });
});
