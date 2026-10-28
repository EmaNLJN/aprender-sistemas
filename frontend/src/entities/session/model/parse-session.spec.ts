import { describe, expect, it } from 'vitest';
import { parsePublishedUser, parseSessionBody } from './parse-session';
import { publishedUserFactory, sessionBodyFactory } from './session.factory';

const ANA = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};

describe('parseSessionBody', () => {
  it('keeps the account, the features and the content version and drops the catalogs', () => {
    const body = sessionBodyFactory.build({ user: publishedUserFactory.build({ id: 41 }) });
    expect(parseSessionBody(body)).toEqual({
      user: ANA,
      features: { passwordReset: false, registration: false },
      contentVersion: '0123456789abcdef0123456789abcdef',
    });
  });

  it('accepts a session without an account and without content', () => {
    const body = sessionBodyFactory.build({ user: null, contentVersion: null });
    expect(parseSessionBody(body)).toEqual({
      user: null,
      features: { passwordReset: false, registration: false },
      contentVersion: null,
    });
  });

  it.each([
    ['a body that is not an object', 'texto'],
    ['an account whose id is text', { ...sessionBodyFactory.build(), user: { ...ANA, id: '41' } }],
    [
      'an account with an unknown role',
      { ...sessionBodyFactory.build(), user: { ...ANA, role: 'teacher' } },
    ],
    [
      'an account without privacyAccepted',
      {
        ...sessionBodyFactory.build(),
        user: { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student' },
      },
    ],
    ['a session without features', { user: null, contentVersion: null }],
    ['a content version that is a number', { ...sessionBodyFactory.build(), contentVersion: 7 }],
  ])('rejects %s', (_name, body) => {
    expect(parseSessionBody(body)).toBeNull();
  });
});

describe('parsePublishedUser', () => {
  it('keeps the five published fields of an admin', () => {
    expect(parsePublishedUser({ ...ANA, id: 1, role: 'admin', extra: 'x' })).toEqual({
      ...ANA,
      id: 1,
      role: 'admin',
    });
  });

  it('rejects null', () => {
    expect(parsePublishedUser(null)).toBeNull();
  });
});
