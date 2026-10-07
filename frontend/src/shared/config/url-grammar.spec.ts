import { describe, expect, it } from 'vitest';
import {
  FREE_LAB_HREF,
  VIEWS,
  campaignMissionHref,
  exerciseHref,
  exercisePhaseOr,
  isLinkLanguage,
  readLinkQuery,
  viewFromHash,
  withLabQuery,
  withLanguageQuery,
  withWorkshopQuery,
  withWorldQuery,
  workshopExerciseHref,
  workshopPartOr,
  workshopReturnHref,
  worldHref,
} from './url-grammar';

const ORIGIN = 'http://taller.test/';
const at = (suffix: string) => new URL(`${ORIGIN}${suffix}`);

describe('views', () => {
  it('lists the eight views in navigation order', () => {
    expect([...VIEWS]).toEqual([
      'recorrido',
      'campana',
      'sistemas',
      'atlas',
      'laboratorio',
      'biblioteca',
      'proyecto',
      'metodo',
    ]);
  });

  it('reads a known view from the hash', () => {
    expect(viewFromHash('#atlas')).toBe('atlas');
  });

  it.each(['', '#', '#Laboratorio', '#invitacion=abc', '#laboratorio?x'])(
    'falls back to recorrido for the hash %j',
    (hash) => {
      expect(viewFromHash(hash)).toBe('recorrido');
    },
  );
});

describe('fresh links', () => {
  it('builds the exercise link with its phase', () => {
    expect(exerciseHref('rust-02', 'code')).toBe('?ejercicio=rust-02&paso=code#laboratorio');
  });

  it('builds the campaign mission link', () => {
    expect(campaignMissionHref('rust-world-1', 'rust-02')).toBe(
      '?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio',
    );
  });

  it('builds the workshop exercise link', () => {
    expect(workshopExerciseHref('cache', 'rust-113')).toBe(
      '?sistema=cache&ejercicio=rust-113&paso=code#laboratorio',
    );
  });

  it('builds the world link', () => {
    expect(worldHref('rust-world-1')).toBe('?mundo=rust-world-1#campana');
  });

  it('builds the workshop return link in its fixed parameter order', () => {
    expect(workshopReturnHref({ workshopId: 'cache', part: 'build', language: 'go' })).toBe(
      '?taller=cache&parte=build&lenguaje=go#sistemas',
    );
  });

  it('keeps the free laboratory link', () => {
    expect(FREE_LAB_HREF).toBe('?#laboratorio');
  });
});

describe('rewrites of the current URL', () => {
  it('writes the language, workshop and part, dropping unknown parameters', () => {
    const url = withWorkshopQuery(at('?basura=1#sistemas'), 'go', 'cache', 'ship');

    expect(url.href).toBe(`${ORIGIN}?lenguaje=go&taller=cache&parte=ship#sistemas`);
  });

  it('writes only the language when no workshop is selected', () => {
    const url = withWorkshopQuery(at('?basura=1#sistemas'), 'go', null, 'explore');

    expect(url.href).toBe(`${ORIGIN}?lenguaje=go#sistemas`);
  });

  it('keeps unknown parameters when the language changes in Sistemas', () => {
    expect(withLanguageQuery(at('?basura=1#sistemas'), 'sistemas', 'go').href).toBe(
      `${ORIGIN}?basura=1&lenguaje=go#sistemas`,
    );
  });

  it('clears the query when the language changes in another view', () => {
    expect(withLanguageQuery(at('?basura=1#proyecto'), 'proyecto', 'go').href).toBe(
      `${ORIGIN}#proyecto`,
    );
  });

  it('replaces the exercise and phase in place and keeps the campaign', () => {
    const current = at('?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio');

    expect(withLabQuery(current, 'exercise', 'rust-06', 'code').href).toBe(
      `${ORIGIN}?campana=rust-world-1&ejercicio=rust-06&paso=code#laboratorio`,
    );
  });

  it('drops the exercise link when the laboratory goes back to the map', () => {
    const current = at('?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio');

    expect(withLabQuery(current, 'map', 'rust-02', 'learn').href).toBe(`${ORIGIN}#laboratorio`);
    expect(withLabQuery(at('?#laboratorio'), 'map', 'rust-02', 'learn').href).toBe(
      `${ORIGIN}#laboratorio`,
    );
  });

  it('replaces the whole query with the selected world', () => {
    const current = at('?campana=x&ejercicio=y#campana');

    expect(withWorldQuery(current, 'rust-world-2').href).toBe(
      `${ORIGIN}?mundo=rust-world-2#campana`,
    );
  });

  it('never modifies the URL it receives', () => {
    const current = at('?campana=x&ejercicio=y&basura=1#sistemas');
    const before = current.href;

    withLabQuery(current, 'exercise', 'rust-06', 'code');
    withWorldQuery(current, 'rust-world-2');
    withWorkshopQuery(current, 'go', 'cache', 'ship');
    withLanguageQuery(current, 'sistemas', 'go');

    expect(current.href).toBe(before);
  });
});

describe('encoding of each family', () => {
  it('percent-encodes fresh links with encodeURIComponent', () => {
    expect(worldHref('mundo raro/1')).toBe('?mundo=mundo%20raro%2F1#campana');
  });

  it('encodes rewrites of the current URL as a form', () => {
    expect(withWorldQuery(at('#campana'), 'mundo raro/1').search).toBe('?mundo=mundo+raro%2F1');
  });

  it('leaves the characters encodeURIComponent keeps in a fresh link', () => {
    expect(workshopReturnHref({ workshopId: "!'()*~", part: 'build', language: 'go' })).toBe(
      "?taller=!'()*~&parte=build&lenguaje=go#sistemas",
    );
  });

  it('encodes those characters in a rewrite', () => {
    const url = withWorkshopQuery(at('#sistemas'), 'go', "!'()*~", 'ship');

    expect(url.search).toContain('taller=%21%27%28%29*%7E');
  });
});

describe('readers', () => {
  it('reads the three mission parameters and leaves the others null', () => {
    expect(readLinkQuery('?campana=rust-world-1&ejercicio=rust-02&paso=learn')).toEqual({
      exercise: 'rust-02',
      phase: 'learn',
      missionWorld: 'rust-world-1',
      missionWorkshop: null,
      world: null,
      language: null,
      workshop: null,
      part: null,
    });
  });

  it('reads the workshop, world, language and part parameters', () => {
    expect(
      readLinkQuery('?sistema=cache&mundo=rust-world-2&lenguaje=go&taller=heap&parte=ship'),
    ).toMatchObject({
      missionWorkshop: 'cache',
      world: 'rust-world-2',
      language: 'go',
      workshop: 'heap',
      part: 'ship',
    });
  });

  it('keeps an empty parameter as present and empty', () => {
    expect(readLinkQuery('?sistema=').missionWorkshop).toBe('');
  });

  it('defaults an invalid or missing phase', () => {
    expect(exercisePhaseOr('CODE', 'learn')).toBe('learn');
    expect(exercisePhaseOr('', 'learn')).toBe('learn');
    expect(exercisePhaseOr(null, 'learn')).toBe('learn');
  });

  it('keeps a valid phase', () => {
    expect(exercisePhaseOr('reflect', 'learn')).toBe('reflect');
  });

  it('defaults an invalid part and keeps a valid one', () => {
    expect(workshopPartOr('x', 'explore')).toBe('explore');
    expect(workshopPartOr('ship', 'explore')).toBe('ship');
  });

  it('accepts only rust and go as link languages', () => {
    expect(isLinkLanguage('rust')).toBe(true);
    expect(isLinkLanguage('go')).toBe(true);
    expect(isLinkLanguage('Go')).toBe(false);
    expect(isLinkLanguage('')).toBe(false);
    expect(isLinkLanguage(null)).toBe(false);
  });
});
