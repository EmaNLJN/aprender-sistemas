import { describe, expect, it, vi } from 'vitest';
import type { PublishedUser } from '../../../entities/session';
import { createAccessRequests } from './access-request';

const ANA: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};

describe('the access requests', () => {
  it('has no request until someone asks', () => {
    expect(createAccessRequests().current()).toBeNull();
  });

  it('publishes the request with its presentation, its reason and its token', () => {
    const requests = createAccessRequests();
    const listener = vi.fn();
    requests.subscribe(listener);
    void requests.request({
      presentation: 'page',
      reason: 'boot',
      token: { kind: 'invitation', token: 'k3J8' },
    });
    expect(requests.current()).toEqual({
      id: 1,
      presentation: 'page',
      reason: 'boot',
      token: { kind: 'invitation', token: 'k3J8' },
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('defaults to a dialog for an expired session, without a token', () => {
    const requests = createAccessRequests();
    void requests.request();
    expect(requests.current()).toEqual({
      id: 1,
      presentation: 'dialog',
      reason: 'expired',
      token: null,
    });
  });

  it('answers two callers with one request and resolves both with the account', async () => {
    const requests = createAccessRequests();
    const first = requests.request();
    const second = requests.request({ presentation: 'page' });
    expect(second).toBe(first);
    expect(requests.current()?.presentation).toBe('dialog');
    requests.finish(ANA);
    await expect(first).resolves.toEqual(ANA);
    await expect(second).resolves.toEqual(ANA);
    expect(requests.current()).toBeNull();
  });

  it('opens a new request with a new id after the previous one finished', () => {
    const requests = createAccessRequests();
    void requests.request();
    requests.finish(ANA);
    void requests.request();
    expect(requests.current()?.id).toBe(2);
  });

  it('ignores a finish without a request', () => {
    const requests = createAccessRequests();
    const listener = vi.fn();
    requests.subscribe(listener);
    requests.finish(ANA);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a listener that unsubscribed', () => {
    const requests = createAccessRequests();
    const listener = vi.fn();
    const unsubscribe = requests.subscribe(listener);
    unsubscribe();
    void requests.request();
    expect(listener).not.toHaveBeenCalled();
  });
});
