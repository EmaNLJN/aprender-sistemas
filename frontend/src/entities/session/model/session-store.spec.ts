import { describe, expect, it } from 'vitest';
import { createSessionStore, selectReadyAccount } from './session-store';
import type { PublishedUser } from './types';

const ANA: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};
const BRUNO: PublishedUser = {
  id: 77,
  name: 'Bruno Díaz',
  email: 'bruno@x.com',
  role: 'student',
  privacyAccepted: true,
};
const FEATURES = { passwordReset: true, registration: false };

describe('the session store', () => {
  it('starts unknown, without an account, without features and without a content version', () => {
    const { status, user, features, contentVersion } = createSessionStore().getState();
    expect({ status, user, features, contentVersion }).toEqual({
      status: 'unknown',
      user: null,
      features: { passwordReset: false, registration: false },
      contentVersion: null,
    });
  });

  it('is signed in after a snapshot with an account and signed out after one without', () => {
    const store = createSessionStore();
    store.getState().applySnapshot({ user: ANA, features: FEATURES, contentVersion: 'v1' });
    expect(store.getState().status).toBe('signed-in');
    store.getState().applySnapshot({ user: null, features: FEATURES, contentVersion: 'v1' });
    expect(store.getState().status).toBe('signed-out');
    expect(store.getState().user).toBeNull();
  });

  it('replaces the account with the one of each new snapshot', () => {
    const store = createSessionStore();
    store.getState().applySnapshot({ user: ANA, features: FEATURES, contentVersion: 'v1' });
    store.getState().applySnapshot({ user: BRUNO, features: FEATURES, contentVersion: 'v1' });
    expect(store.getState().user).toEqual(BRUNO);
  });

  it('keeps the features and the content version when a sign-in changes the account', () => {
    const store = createSessionStore();
    store.getState().applySnapshot({ user: null, features: FEATURES, contentVersion: 'v1' });
    store.getState().applyUser(BRUNO);
    const { status, user, features, contentVersion } = store.getState();
    expect({ status, user, features, contentVersion }).toEqual({
      status: 'signed-in',
      user: BRUNO,
      features: FEATURES,
      contentVersion: 'v1',
    });
  });

  it('offers the account to «Tu cuenta» only with the current notice accepted', () => {
    const store = createSessionStore();
    store.getState().applyUser({ ...ANA, privacyAccepted: false });
    expect(selectReadyAccount(store.getState())).toBeNull();
    store.getState().applyUser(ANA);
    expect(selectReadyAccount(store.getState())).toEqual(ANA);
  });
});
