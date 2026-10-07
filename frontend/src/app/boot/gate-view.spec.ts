import { describe, expect, it } from 'vitest';
import type { ContentFailureKind } from '../../shared/api/content';
import { failureMarkup } from './gate-view';

const KINDS: ContentFailureKind[] = [
  'network',
  'status',
  'timeout',
  'body',
  'missing',
  'shape',
  'version',
];

describe('failureMarkup', () => {
  it('tells the learner there may be a new version and to reload for a version failure', () => {
    const markup = failureMarkup('version');
    expect(markup).toContain('puede que haya una versión nueva');
    expect(markup).toContain('Recargá la página');
  });

  it.each(KINDS.filter((kind) => kind !== 'version'))(
    'gives the general message for a %s failure',
    (kind) => {
      const markup = failureMarkup(kind);
      expect(markup).toContain('Revisá tu conexión');
      expect(markup).not.toContain('versión nueva');
    },
  );

  it.each(KINDS)('reassures about saved progress and offers a retry for %s', (kind) => {
    const markup = failureMarkup(kind);
    expect(markup).toContain('Tu progreso sigue guardado en este navegador');
    expect(markup).toContain(`data-failure="${kind}"`);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('id="content-retry"');
    expect(markup).not.toContain('style=');
  });
});
