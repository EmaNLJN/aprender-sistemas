import { isPlainObject } from '../../lib/is-plain-object';

export const SYSTEMS_DOMAINS = ['lowlevel', 'infra', 'play', 'pc'] as const;
export type SystemsDomain = (typeof SYSTEMS_DOMAINS)[number];

export const PORTION_NAMES = [
  'lab.rust',
  'lab.go',
  'quests.rust',
  'quests.go',
  'cores.lowlevel',
  'cores.infra',
  'cores.play',
  'cores.pc',
  'campaign.rust',
  'campaign.go',
  'workshops.lowlevel',
  'workshops.infra',
  'workshops.play',
  'workshops.pc',
  'atlas.rust',
  'atlas.go',
  'guide',
] as const;
export type PortionName = (typeof PORTION_NAMES)[number];

export type PortionProblem = 'missing' | 'shape';

function isEntry(value: unknown): boolean {
  return isPlainObject(value) && typeof value.id === 'string' && value.id !== '';
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function isGuide(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const { resources, sources, tracks } = value;
  if (!isNonEmptyArray(resources) || !Array.isArray(sources) || !isPlainObject(tracks))
    return false;
  return (['rust', 'go'] as const).every((language) => {
    const track = tracks[language];
    return isPlainObject(track) && isNonEmptyArray(track.modules);
  });
}

export function findPortionProblem(name: PortionName, data: unknown): PortionProblem | null {
  if (data === undefined) return 'missing';
  if (name === 'guide') return isGuide(data) ? null : 'shape';
  return Array.isArray(data) && data.length > 0 && data.every(isEntry) ? null : 'shape';
}
