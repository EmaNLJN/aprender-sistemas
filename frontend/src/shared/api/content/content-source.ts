import type { PortionName } from './portions';

export interface SourcePortion {
  readonly name: PortionName;
  readonly version: string;
  readonly data: unknown;
}

export interface ContentRequest {
  readonly signal: AbortSignal;
}

export interface ContentSource {
  read(names: readonly PortionName[], request: ContentRequest): Promise<readonly SourcePortion[]>;
}

export type ContentFailureKind =
  'network' | 'status' | 'timeout' | 'body' | 'missing' | 'shape' | 'version';

export class ContentLoadError extends Error {
  readonly kind: ContentFailureKind;
  readonly detail: string;

  constructor(kind: ContentFailureKind, detail = '') {
    super(`No se pudo cargar el contenido (${kind}${detail ? `: ${detail}` : ''}).`);
    this.name = 'ContentLoadError';
    this.kind = kind;
    this.detail = detail;
  }
}
