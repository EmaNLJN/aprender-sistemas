import { describe, expect, it } from 'vitest';
import type { Operation } from './operations';
import { enqueue, nextBatch, settle } from './queue';

function stamps(): () => { id: string; at: string } {
  let next = 0;
  return () => {
    next += 1;
    return { id: `op-${next}`, at: `2026-10-05T12:00:0${next}.000Z` };
  };
}

describe('enqueue', () => {
  it('folds successive writes of a field into one operation with the last value and a new id', () => {
    const stamp = stamps();
    const queue = enqueue(
      [],
      [
        { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'P' },
        { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'Pr' },
        { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'Pri' },
      ],
      new Set(),
      stamp,
    );
    expect(queue).toEqual([
      {
        type: 'exercise.reflection',
        exerciseId: 'rust-01',
        text: 'Pri',
        id: 'op-3',
        at: '2026-10-05T12:00:03.000Z',
      },
    ]);
  });

  it('never replaces an operation that is on its way', () => {
    const stamp = stamps();
    const first = enqueue(
      [],
      [{ type: 'route.note', language: 'rust', field: 'next', body: 'a' }],
      new Set(),
      stamp,
    );
    const queue = enqueue(
      first,
      [{ type: 'route.note', language: 'rust', field: 'next', body: 'ab' }],
      new Set(['op-1']),
      stamp,
    );
    expect(queue.map((operation) => operation.id)).toEqual(['op-1', 'op-2']);
  });

  it('joins the flags of exercise.assist and keeps the highest revealed hint count', () => {
    const queue = enqueue(
      [],
      [
        { type: 'exercise.assist', exerciseId: 'rust-01', assisted: true },
        { type: 'exercise.assist', exerciseId: 'rust-01', solutionSeen: true },
        { type: 'exercise.hints', exerciseId: 'rust-01', revealed: 3 },
        { type: 'exercise.hints', exerciseId: 'rust-01', revealed: 2 },
      ],
      new Set(),
      stamps(),
    );
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({
      type: 'exercise.assist',
      exerciseId: 'rust-01',
      assisted: true,
      solutionSeen: true,
    });
    expect(queue[1]).toMatchObject({ type: 'exercise.hints', exerciseId: 'rust-01', revealed: 3 });
  });
});

describe('nextBatch', () => {
  const queue: Operation[] = Array.from({ length: 205 }, (_, index) => ({
    id: `op-${index}`,
    at: '2026-10-05T12:00:00.000Z',
    type: 'route.mark',
    kind: 'step',
    itemKey: `rust-1-${index}`,
    marked: true,
  }));

  it('takes at most 200 operations (http.md §3.7)', () => {
    expect(nextBatch(queue, new Set(), { maxOperations: 200, maxBytes: 1_572_864 })).toHaveLength(
      200,
    );
  });

  it('stops before the byte budget and skips what is on its way', () => {
    const batch = nextBatch(queue, new Set(['op-0']), {
      maxOperations: 200,
      maxBytes: 512 + 3 * 120,
    });
    expect(batch.map((operation) => operation.id)).toEqual(['op-1', 'op-2', 'op-3']);
  });
});

describe('settle', () => {
  it('drops applied, duplicate and rejected operations, counts rejections and returns stale ones', () => {
    const operations = enqueue(
      [],
      [
        { type: 'route.mark', kind: 'step', itemKey: 'a', marked: true },
        { type: 'route.mark', kind: 'step', itemKey: 'b', marked: true },
        { type: 'route.mark', kind: 'step', itemKey: 'c', marked: true },
        { type: 'route.quiz', stepId: 'd', answer: 1, contentVersion: 'x' },
        { type: 'route.mark', kind: 'step', itemKey: 'e', marked: true },
      ],
      new Set(),
      stamps(),
    );
    const settlement = settle(operations, operations.slice(0, 4), [
      { id: 'op-1', status: 'applied' },
      { id: 'op-2', status: 'duplicate', reason: 'invalid' },
      { id: 'op-3', status: 'rejected', reason: 'unknown_reference' },
      { id: 'op-4', status: 'stale_content' },
    ]);
    expect(settlement.remaining.map((operation) => operation.id)).toEqual(['op-5']);
    expect(settlement.rejected).toBe(2);
    expect(settlement.stale.map((operation) => operation.id)).toEqual(['op-4']);
  });
});
