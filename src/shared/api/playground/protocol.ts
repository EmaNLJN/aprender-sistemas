/* Transporte a los Playgrounds oficiales de Rust y Go (CORS habilitado).
 * No se envía código hasta que la persona ejecuta explícitamente.
 * Fuentes de las APIs:
 * https://github.com/rust-lang/rust-playground/blob/main/ui/src/server_axum.rs
 * https://go.googlesource.com/playground/+/HEAD/sandbox.go
 */
export type PlaygroundLanguage = 'rust' | 'go';
export type RunErrorType = 'input' | 'aborted' | 'http' | 'response' | 'timeout' | 'network';

export interface RunInput {
  language: string;
  code: string;
  signal?: AbortSignal;
}

export interface RunFailure {
  success: false;
  stdout: '';
  stderr: '';
  error: string;
  errorType: RunErrorType;
  httpStatus?: number;
}

export interface RustRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitDetail: string;
  service: 'Rust Playground';
}

export interface GoRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  service: 'Go Playground';
}

export type RunResult = RustRunResult | GoRunResult | RunFailure;

export interface PlaygroundRequest {
  url: string;
  contentType: string;
  body: string;
}

export const ENDPOINTS: Readonly<Record<PlaygroundLanguage, string>> = Object.freeze({
  rust: 'https://play.rust-lang.org/execute',
  go: 'https://play.golang.org/compile',
});
export const TIMEOUT_MS = 60000;
export const MAX_CODE_BYTES = 200000;

export function isPlaygroundLanguage(language: unknown): language is PlaygroundLanguage {
  return typeof language === 'string' && Object.hasOwn(ENDPOINTS, language);
}

export function failure(
  error: string,
  errorType: RunErrorType,
  details: { httpStatus?: number } = {},
): RunFailure {
  return { success: false, stdout: '', stderr: '', error, errorType, ...details };
}

export function buildRequest(language: PlaygroundLanguage, code: string): PlaygroundRequest {
  if (language === 'rust') {
    return {
      url: ENDPOINTS.rust,
      contentType: 'application/json',
      body: JSON.stringify({
        channel: 'stable',
        mode: 'debug',
        edition: '2024',
        crateType: 'bin',
        tests: false,
        backtrace: false,
        code,
      }),
    };
  }
  return {
    url: ENDPOINTS.go,
    contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
    body: new URLSearchParams({ body: code, version: '2', withVet: 'true' }).toString(),
  };
}

export function httpFailureMessage(status: number): string {
  if (status === 429) {
    return 'El Playground recibió demasiadas solicitudes. Esperá un momento antes de volver a ejecutar.';
  }
  if (status >= 500) {
    return 'El Playground no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.';
  }
  return `El Playground rechazó la solicitud (HTTP ${status}). Revisá el código y volvé a intentar.`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

export function parseRustResponse(data: unknown): RustRunResult | RunFailure {
  const record = asRecord(data);
  if (!record || typeof record.success !== 'boolean') {
    return failure(
      'Rust Playground devolvió una respuesta inesperada. Volvé a intentar.',
      'response',
    );
  }
  return {
    success: record.success,
    stdout: typeof record.stdout === 'string' ? record.stdout : '',
    stderr: typeof record.stderr === 'string' ? record.stderr : '',
    exitDetail: typeof record.exitDetail === 'string' ? record.exitDetail : '',
    service: 'Rust Playground',
  };
}

interface GoPayload {
  Errors: string;
  Status: number;
  Events?: unknown[] | null;
  VetErrors?: unknown;
  TestsFailed?: unknown;
}

function isGoPayload(
  record: Record<string, unknown> | null,
): record is Record<string, unknown> & GoPayload {
  return (
    record !== null &&
    typeof record.Errors === 'string' &&
    typeof record.Status === 'number' &&
    (record.Events == null || Array.isArray(record.Events))
  );
}

function collectGoOutput(payload: GoPayload): { stdout: string; stderr: string } {
  let stdout = '';
  let stderr = payload.Errors;
  for (const event of payload.Events ?? []) {
    const entry = asRecord(event);
    if (!entry || typeof entry.Message !== 'string') continue;
    if (entry.Kind === 'stderr') stderr += entry.Message;
    else if (entry.Kind === 'stdout') stdout += entry.Message;
  }
  if (typeof payload.VetErrors === 'string' && payload.VetErrors) {
    stderr += (stderr ? '\n' : '') + payload.VetErrors;
  }
  return { stdout, stderr };
}

export function parseGoResponse(data: unknown): GoRunResult | RunFailure {
  const record = asRecord(data);
  if (!isGoPayload(record)) {
    return failure(
      'Go Playground devolvió una respuesta inesperada. Volvé a intentar.',
      'response',
    );
  }
  const { stdout, stderr: collected } = collectGoOutput(record);
  // Number() conserva la coerción de `TestsFailed > 0` del código original.
  const success = !record.Errors && record.Status === 0 && !(Number(record.TestsFailed) > 0);
  const stderr =
    !success && !collected && record.Status !== 0
      ? `El programa terminó con código ${record.Status}.`
      : collected;
  return { success, stdout, stderr, exitCode: record.Status, service: 'Go Playground' };
}

export function parseResponse(
  language: PlaygroundLanguage,
  data: unknown,
): RustRunResult | GoRunResult | RunFailure {
  return language === 'rust' ? parseRustResponse(data) : parseGoResponse(data);
}
