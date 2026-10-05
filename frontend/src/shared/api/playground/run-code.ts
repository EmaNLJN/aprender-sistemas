import {
  MAX_CODE_BYTES,
  TIMEOUT_MS,
  buildRequest,
  failure,
  httpFailureMessage,
  isPlaygroundLanguage,
  parseResponse,
  type PlaygroundLanguage,
  type RunFailure,
  type RunInput,
  type RunResult,
} from './protocol';

interface ValidRun {
  language: PlaygroundLanguage;
  code: string;
  signal?: AbortSignal;
}

function validateInput(input: RunInput): ValidRun | RunFailure {
  const { language, code, signal } = input ?? {};
  if (!isPlaygroundLanguage(language)) {
    return failure('Elegí Rust o Go para ejecutar el código.', 'input');
  }
  if (typeof code !== 'string' || !code.trim()) {
    return failure('Escribí un programa antes de ejecutarlo.', 'input');
  }
  if (new TextEncoder().encode(code).length > MAX_CODE_BYTES) {
    return failure(
      'Este editor admite programas de hasta 200 KB. Reducí el código antes de volver a ejecutar.',
      'input',
    );
  }
  if (signal?.aborted) return failure('Ejecución cancelada.', 'aborted');
  return { language, code, signal };
}

function interruptionFailure(timedOut: boolean, aborted: boolean): RunFailure {
  if (timedOut) {
    return failure(
      'La ejecución superó los 60 segundos. Revisá bucles y bloqueos; también puede haber demoras del servicio.',
      'timeout',
    );
  }
  if (aborted) return failure('Ejecución cancelada.', 'aborted');
  return failure(
    'No se pudo conectar al Playground. Revisá tu conexión o un posible bloqueo del navegador. Podés seguir leyendo y resolviendo las preguntas sin conexión.',
    'network',
  );
}

async function parseBody(
  response: Response,
  controller: AbortController,
  language: PlaygroundLanguage,
): Promise<RunResult> {
  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw error;
    return failure(
      'El Playground devolvió una respuesta que no se pudo leer. Volvé a intentar.',
      'response',
    );
  }
  return parseResponse(language, data);
}

// Nunca rechaza: todo fallo vuelve como RunFailure con su errorType.
export async function runCode(input: RunInput): Promise<RunResult> {
  const valid = validateInput(input);
  if ('errorType' in valid) return valid;
  const { language, code, signal } = valid;

  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  // setTimeout y no AbortSignal.timeout: el check inyecta un temporizador falso.
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const request = buildRequest(language, code);
    const response = await fetch(request.url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': request.contentType },
      body: request.body,
      signal: controller.signal,
    });
    if (!response.ok) {
      return failure(httpFailureMessage(response.status), 'http', {
        httpStatus: response.status,
      });
    }
    return await parseBody(response, controller, language);
  } catch {
    return interruptionFailure(timedOut, controller.signal.aborted);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
