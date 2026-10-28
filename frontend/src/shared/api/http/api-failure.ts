export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ApiFailure =
  | {
      readonly kind: 'response';
      readonly status: number;
      readonly code: string;
      readonly message: string;
      readonly fieldErrors: FieldErrors;
      readonly retryAfterSeconds: number | null;
    }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'account-changed'; readonly message: string }
  | { readonly kind: 'network' }
  | { readonly kind: 'unexpected'; readonly status: number };

export type ApiResult =
  | { readonly ok: true; readonly status: number; readonly body: unknown }
  | { readonly ok: false; readonly failure: ApiFailure };
