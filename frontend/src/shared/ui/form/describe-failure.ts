import type { ApiFailure, FieldErrors } from '../../api/http';

export const NETWORK_MESSAGE =
  'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';
export const UNEXPECTED_MESSAGE =
  'El taller no respondió como esperábamos. Probá de nuevo en un rato.';

export interface FailureDescription {
  readonly fieldMessages: FieldErrors;
  readonly generalMessages: readonly string[];
  readonly retryAfterSeconds: number | null;
  readonly offerReload: boolean;
  readonly signedOut: boolean;
}

export const describeFailure: (
  failure: ApiFailure,
  visibleFields: readonly string[],
) => FailureDescription = () => {
  throw new Error('not implemented');
};
