import type { AccessToken } from '../../features/sign-in';
import type { BootStage } from './run-boot';

export interface LocationLike {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

export interface HistoryLike {
  readonly state: unknown;
  replaceState(data: unknown, unused: string, url: string): void;
}

export interface TokenStage extends BootStage {
  take(): AccessToken | null;
  readonly hadToken: boolean;
}

const INVITATION = /^#invitacion(?:=|$)/;
const RESET = /^#restablecer(?:[=&]|$)/;
const INVITATION_PREFIX = '#invitacion=';

function decodeEmail(value: string | undefined): string | null {
  if (value === undefined || value === '') return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function fragmentParameters(hash: string): Map<string, string> {
  const parameters = new Map<string, string>();
  for (const part of hash.slice(1).split('&')) {
    const separator = part.indexOf('=');
    if (separator < 0) parameters.set(part, '');
    else parameters.set(part.slice(0, separator), part.slice(separator + 1));
  }
  return parameters;
}

export function readAccessToken(hash: string): AccessToken | null {
  if (INVITATION.test(hash))
    return { kind: 'invitation', token: hash.slice(INVITATION_PREFIX.length) };
  if (!RESET.test(hash)) return null;
  const parameters = fragmentParameters(hash);
  return {
    kind: 'reset',
    token: parameters.get('restablecer') ?? '',
    email: decodeEmail(parameters.get('email')),
  };
}

export function createTokenStage(environment: {
  readonly location: LocationLike;
  readonly history: HistoryLike;
}): TokenStage {
  let token: AccessToken | null = null;
  let hadToken = false;
  return {
    name: 'tokenStage',
    get hadToken() {
      return hadToken;
    },
    async run() {
      const { location, history } = environment;
      const found = readAccessToken(location.hash);
      if (found === null) return;
      token = found;
      hadToken = true;
      history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    },
    take() {
      const taken = token;
      token = null;
      return taken;
    },
  };
}
