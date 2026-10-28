import { describe, expect, it, vi } from 'vitest';
import { createTokenStage, readAccessToken } from './access-tokens';

const TOKEN = 'k3J8xQ2mN7pL4vR9tY6wZ1aB5cD0eF3gH8iJ2kL7mN4';

describe('readAccessToken', () => {
  it.each([
    [`#invitacion=${TOKEN}`, { kind: 'invitation', token: TOKEN }],
    ['#invitacion', { kind: 'invitation', token: '' }],
    [
      '#restablecer=9f2c&email=ana%2B1%40x.com',
      { kind: 'reset', token: '9f2c', email: 'ana+1@x.com' },
    ],
    ['#restablecer=9f2c', { kind: 'reset', token: '9f2c', email: null }],
    ['#restablecer=9f2c&email=%E0%A4%A', { kind: 'reset', token: '9f2c', email: null }],
    ['#restablecer=9f2c&email=', { kind: 'reset', token: '9f2c', email: null }],
    ['#restablecer', { kind: 'reset', token: '', email: null }],
    ['#restablecer&email=ana%40x.com', { kind: 'reset', token: '', email: 'ana@x.com' }],
  ])('reads %s', (hash, token) => {
    expect(readAccessToken(hash)).toEqual(token);
  });

  it.each(['', '#', '#laboratorio', '#invitacionx', '#restablecerx', '#recorrido'])(
    'finds no token in «%s»',
    (hash) => {
      expect(readAccessToken(hash)).toBeNull();
    },
  );
});

describe('the token stage', () => {
  function environment(hash: string) {
    const replaceState = vi.fn();
    return {
      replaceState,
      location: { pathname: '/', search: '?ejercicio=rust-02&paso=code', hash },
      history: { state: { kept: true }, replaceState },
    };
  }

  it.each([
    ['#invitacion=abc', { kind: 'invitation', token: 'abc' }],
    ['#invitacion', { kind: 'invitation', token: '' }],
    [
      '#restablecer=9f2c&email=ana%2B1%40x.com',
      { kind: 'reset', token: '9f2c', email: 'ana+1@x.com' },
    ],
  ])(
    'removes «%s» without touching the path or the query, and gives the token once',
    async (hash, token) => {
      const env = environment(hash);
      const stage = createTokenStage(env);
      await stage.run();
      expect(env.replaceState).toHaveBeenCalledWith(
        { kept: true },
        '',
        '/?ejercicio=rust-02&paso=code',
      );
      expect(stage.hadToken).toBe(true);
      expect(stage.take()).toEqual(token);
      expect(stage.take()).toBeNull();
      expect(stage.hadToken).toBe(true);
    },
  );

  it('leaves any other fragment alone', async () => {
    const env = environment('#laboratorio');
    const stage = createTokenStage(env);
    await stage.run();
    expect(env.replaceState).not.toHaveBeenCalled();
    expect(stage.hadToken).toBe(false);
    expect(stage.take()).toBeNull();
  });
});
