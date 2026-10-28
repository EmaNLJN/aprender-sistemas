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

export function readAccessToken(_hash: string): AccessToken | null {
  throw new Error('not implemented');
}

export function createTokenStage(_environment: {
  readonly location: LocationLike;
  readonly history: HistoryLike;
}): TokenStage {
  throw new Error('not implemented');
}
