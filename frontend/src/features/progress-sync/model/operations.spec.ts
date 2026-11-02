import { describe, expect, it } from 'vitest';
import { fieldKeyOf, type OperationBody } from './operations';

const CV = '0123456789abcdef0123456789abcdef';

describe('fieldKeyOf', () => {
  it.each<[OperationBody, string]>([
    [
      { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'x' },
      'exercise.reflection|rust-01',
    ],
    [{ type: 'exercise.assist', exerciseId: 'rust-01', assisted: true }, 'exercise.assist|rust-01'],
    [
      {
        type: 'checkpoint.answer',
        worldId: 'w',
        answer: 0,
        passed: false,
        contentVersion: CV,
      },
      'checkpoint.answer|w',
    ],
    [{ type: 'workshop.note', workshopId: 'ws', language: 'go', text: '' }, 'workshop.note|go|ws'],
    [
      {
        type: 'workshop.objective',
        workshopId: 'ws',
        language: 'rust',
        objectiveKey: 'hit',
      },
      'workshop.objective|rust|ws|hit',
    ],
    [
      {
        type: 'workshop.step',
        workshopId: 'ws',
        language: 'rust',
        stepKey: 'e2',
        marked: true,
      },
      'workshop.step|rust|ws|e2',
    ],
    [
      { type: 'route.mark', kind: 'favorite', itemKey: 'book', marked: false },
      'route.mark|favorite|book',
    ],
    [
      { type: 'route.quiz', stepId: 'rust-1-1', answer: 1, contentVersion: CV },
      'route.quiz|rust-1-1',
    ],
    [{ type: 'route.note', language: 'rust', field: 'next', body: 'b' }, 'route.note|rust|next'],
    [
      { type: 'preference.set', name: 'labSelectedGo', value: 'go-01' },
      'preference.set|labSelectedGo',
    ],
  ])('keys %o as %s (data-model-d1c.md §3.2)', (body, key) => {
    expect(fieldKeyOf(body)).toBe(key);
  });
});
