import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Rule } from '../../frontend/src/features/progress-sync/model/field-kinds.ts';

export interface MergeCase {
  id: string;
  kind: string;
  situation: string;
  order?: 'ab' | 'ba';
  only?: 'ts' | 'php';
  stored: unknown;
  incoming: unknown[];
  expect: { state: unknown; changed: boolean[] };
}

export interface ServerCase {
  id: string;
  family: 'clock-correction' | 'stale-content' | 'rejection';
  batches: { serverNow: string; sentAt: string; operations: Record<string, unknown>[] }[];
  expect: { results: { status: string; reason?: string }[]; stored: unknown[] };
}

export interface MergeFixture {
  format: number;
  contract: string;
  world: Record<string, unknown>;
  kinds: Record<
    string,
    { rule: Rule; target: string; op: string; samples?: Record<string, unknown> }
  >;
  cases: MergeCase[];
  serverCases: ServerCase[];
}

const SHARED = join(import.meta.dirname, '..', 'fixtures', 'shared');

export function readMergeFixture(directory: string = SHARED): MergeFixture {
  const bytes = readFileSync(join(directory, 'merge-cases.json'));
  const pinned = readFileSync(join(directory, 'merge-cases.sha256'), 'utf8').trim().split(/\s+/)[0];
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pinned) {
    throw new Error(
      `merge-cases.json cambió (${actual}) y merge-cases.sha256 dice ${pinned}: es un fixture congelado`,
    );
  }
  return JSON.parse(bytes.toString('utf8')) as MergeFixture;
}

const TIME_FAMILY = ['absent', 'identical'];
const PAIRED = ['newer', 'older', 'equal', 'empty-stored', 'empty-incoming'];
const GROW_ONLY: Partial<Record<Rule, string[]>> = {
  'flag-or': ['absent', 'false-then-true', 'true-then-true', 'true-then-false'],
  max: ['absent', 'raise', 'lower-ignored', 'equal'],
  'dated-flag': [
    'absent',
    'earlier-date-wins',
    'later-date-ignored',
    'legacy-date-filled',
    'incoming-without-date-ignored',
    'row-with-false-flag',
    'not-correct-ignored',
    'same-date',
  ],
  observed: [
    'absent',
    'earlier-date-wins',
    'later-date-ignored',
    'legacy-date-filled',
    'other-objective-added.ab',
    'other-objective-added.ba',
    'same-objective-same-date',
  ],
};

export function requiredCaseIds(kind: string, rule: Rule): string[] {
  if (rule === 'lww' || rule === 'lww-group' || rule === 'tombstone') {
    const impossible =
      rule === 'tombstone' || kind === 'exercise.draft'
        ? ['empty-stored.ba', 'empty-incoming.ab']
        : [];
    const ids = [
      ...TIME_FAMILY,
      ...PAIRED.flatMap((situation) => [`${situation}.ab`, `${situation}.ba`]),
    ];
    return ids.filter((id) => !impossible.includes(id)).map((id) => `${kind}/${id}`);
  }
  return (GROW_ONLY[rule] ?? []).map((id) => `${kind}/${id}`);
}

const REJECTIONS = [
  'unknown-type',
  'server-owned-field',
  'importer-only-field',
  'wrong-type',
  'assist-with-false',
  'assist-without-flags',
  'draft-null-code-with-hash',
  'review-unknown-confidence',
  'lab-selected-of-other-language',
  'answer-outside-options',
  'hints-beyond-the-exercise',
  'hints-zero',
  'focus-minutes-not-allowed',
  'reflection-too-long',
  'custom-test-too-long',
  'draft-too-long',
  'workshop-note-too-long',
  'route-note-too-long',
  'unknown-exercise',
  'unknown-world',
  'unknown-workshop',
  'unknown-objective',
  'unknown-step-key',
  'unknown-guide-step',
  'unknown-resource',
  'unknown-milestone',
  'unknown-lab-selected',
  'mixed-batch-applies-the-valid-one',
];
const CLOCKS = [
  'in-sync',
  'device-ahead-one-hour',
  'device-behind-one-hour',
  'operation-after-send-is-capped',
  'old-offline-operation-keeps-its-age',
  'before-floor-is-out-of-range',
  'ahead-device-does-not-win-forever',
];
const ANSWERS = ['exercise.prediction', 'checkpoint.answer', 'workshop.prediction', 'route.quiz'];

export const REQUIRED_SERVER_CASE_IDS: string[] = [
  ...CLOCKS.map((name) => `clock/${name}`),
  ...ANSWERS.flatMap((type) => [`stale/${type}/current`, `stale/${type}/stale`]),
  ...REJECTIONS.map((name) => `reject/${name}`),
];
