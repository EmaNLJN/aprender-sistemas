import type { ApiFailure, FieldErrors } from '../../api/http';
import { formatWait } from '../../lib/format-wait';

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

type ResponseFailure = Extract<ApiFailure, { kind: 'response' }>;

const UNAUTHENTICATED = 401;
const TOO_MANY_REQUESTS = 429;
const NOTHING: FailureDescription = {
  fieldMessages: {},
  generalMessages: [],
  retryAfterSeconds: null,
  offerReload: false,
  signedOut: false,
};

function describeRateLimit(failure: ResponseFailure): FailureDescription {
  const seconds = failure.retryAfterSeconds;
  if (seconds === null) return { ...NOTHING, generalMessages: [failure.message] };
  return {
    ...NOTHING,
    generalMessages: [failure.message, `Podés volver a intentar en ${formatWait(seconds)}.`],
    retryAfterSeconds: seconds,
  };
}

function describeResponse(
  failure: ResponseFailure,
  visibleFields: readonly string[],
): FailureDescription {
  if (failure.status === UNAUTHENTICATED) return { ...NOTHING, signedOut: true };
  if (failure.status === TOO_MANY_REQUESTS) return describeRateLimit(failure);
  const fieldMessages: Record<string, readonly string[]> = {};
  const generalMessages: string[] = [];
  for (const [field, messages] of Object.entries(failure.fieldErrors)) {
    if (visibleFields.includes(field)) fieldMessages[field] = messages;
    else generalMessages.push(...messages);
  }
  if (generalMessages.length === 0 && Object.keys(fieldMessages).length === 0) {
    generalMessages.push(failure.message);
  }
  return {
    ...NOTHING,
    fieldMessages,
    generalMessages,
    offerReload: failure.code === 'account_mismatch',
  };
}

export function describeFailure(
  failure: ApiFailure,
  visibleFields: readonly string[],
): FailureDescription {
  switch (failure.kind) {
    case 'network':
      return { ...NOTHING, generalMessages: [NETWORK_MESSAGE] };
    case 'unexpected':
      return { ...NOTHING, generalMessages: [UNEXPECTED_MESSAGE] };
    case 'signed-out':
      return { ...NOTHING, signedOut: true };
    case 'account-changed':
      return { ...NOTHING, generalMessages: [failure.message], offerReload: true };
    case 'response':
      return describeResponse(failure, visibleFields);
  }
}
