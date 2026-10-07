import { describe, expect, it } from 'vitest';
import { buildGuide } from './guide-fixture';
import { ROUTE_FORMAT_ERROR, blankRouteProgress, parseRouteProgress } from './parse-route-progress';

const guide = buildGuide();

describe('blankRouteProgress', () => {
  it('starts in Rust with 25 minutes and nothing done', () => {
    expect(blankRouteProgress()).toEqual({
      version: 1,
      language: 'rust',
      completed: [],
      milestones: [],
      favorites: [],
      quizAnswers: {},
      notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
      minutes: 25,
    });
  });
});

describe('parseRouteProgress', () => {
  it('keeps known ids and counts the unknown ones as dropped', () => {
    const parsed = parseRouteProgress(
      {
        version: 1,
        completed: ['rust-ownership', 'ghost-step'],
        milestones: ['go-network', 'rust-memory', 'rust-telepathy'],
        favorites: ['rust-100', 'ghost-resource', 7],
      },
      guide,
    );
    expect(parsed.state.completed).toEqual(['rust-ownership']);
    expect(parsed.state.milestones).toEqual(['go-network', 'rust-memory']);
    expect(parsed.state.favorites).toEqual(['rust-100']);
    expect(parsed.dropped).toBe(4);
  });

  it('rejects a version other than 1 and anything that is not an object', () => {
    expect(() => parseRouteProgress({ version: 2 }, guide)).toThrow(ROUTE_FORMAT_ERROR);
    expect(() => parseRouteProgress(null, guide)).toThrow(ROUTE_FORMAT_ERROR);
    expect(() => parseRouteProgress('texto', guide)).toThrow(ROUTE_FORMAT_ERROR);
  });

  it('keeps 15, 25 and 45 minutes and drops any other value', () => {
    expect(parseRouteProgress({ version: 1, minutes: 45 }, guide).state.minutes).toBe(45);
    const invalid = parseRouteProgress({ version: 1, minutes: 30 }, guide);
    expect(invalid.state.minutes).toBe(25);
    expect(invalid.dropped).toBe(1);
  });

  it('truncates notes to 20000 characters', () => {
    const parsed = parseRouteProgress(
      { version: 1, notes: { go: { learned: 'a'.repeat(20001), next: 'b' } } },
      guide,
    );
    expect(parsed.state.notes.go.learned).toBe('a'.repeat(20000));
    expect(parsed.state.notes.go.next).toBe('b');
    expect(parsed.dropped).toBe(0);
  });

  it('keeps in-range quiz answers and drops the rest', () => {
    const parsed = parseRouteProgress(
      {
        version: 1,
        quizAnswers: { 'rust-first-session': 2, 'rust-ownership': 2, 'ghost-step': 0 },
      },
      guide,
    );
    expect(parsed.state.quizAnswers).toEqual({ 'rust-first-session': 2 });
    expect(parsed.dropped).toBe(2);
  });

  it('falls back to Rust and counts an unknown language', () => {
    const parsed = parseRouteProgress({ version: 1, language: 'zig' }, guide);
    expect(parsed.state.language).toBe('rust');
    expect(parsed.dropped).toBe(1);
  });
});
