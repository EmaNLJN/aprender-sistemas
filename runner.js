/* Real Rust/Go execution through their official, CORS-enabled playgrounds.
 * No source is sent until run() is explicitly called by the learner.
 * API sources:
 * https://github.com/rust-lang/rust-playground/blob/main/ui/src/server_axum.rs
 * https://go.googlesource.com/playground/+/HEAD/sandbox.go
 */
(function (global) {
  'use strict';

  const ENDPOINTS = Object.freeze({
    rust: 'https://play.rust-lang.org/execute',
    go: 'https://play.golang.org/compile',
  });
  const TIMEOUT_MS = 60000;
  const MAX_CODE_BYTES = 200000;

  function failure(message, kind, details) {
    return Object.assign(
      { success: false, stdout: '', stderr: '', error: message, errorType: kind },
      details || {},
    );
  }

  function parseRust(data) {
    if (!data || typeof data.success !== 'boolean') {
      return failure(
        'Rust Playground devolvió una respuesta inesperada. Volvé a intentar.',
        'response',
      );
    }
    return {
      success: data.success,
      stdout: typeof data.stdout === 'string' ? data.stdout : '',
      stderr: typeof data.stderr === 'string' ? data.stderr : '',
      exitDetail: typeof data.exitDetail === 'string' ? data.exitDetail : '',
      service: 'Rust Playground',
    };
  }

  function parseGo(data) {
    if (
      !data ||
      typeof data.Errors !== 'string' ||
      typeof data.Status !== 'number' ||
      (data.Events != null && !Array.isArray(data.Events))
    ) {
      return failure(
        'Go Playground devolvió una respuesta inesperada. Volvé a intentar.',
        'response',
      );
    }
    let stdout = '';
    let stderr = data.Errors;
    for (const event of data.Events || []) {
      if (!event || typeof event.Message !== 'string') continue;
      if (event.Kind === 'stderr') stderr += event.Message;
      else if (event.Kind === 'stdout') stdout += event.Message;
    }
    if (typeof data.VetErrors === 'string' && data.VetErrors) {
      stderr += (stderr ? '\n' : '') + data.VetErrors;
    }
    const success = !data.Errors && data.Status === 0 && !(data.TestsFailed > 0);
    if (!success && !stderr && data.Status !== 0)
      stderr = 'El programa terminó con código ' + data.Status + '.';
    return { success, stdout, stderr, exitCode: data.Status, service: 'Go Playground' };
  }

  async function run(options) {
    const { language, code, signal } = options || {};
    if (!Object.prototype.hasOwnProperty.call(ENDPOINTS, language)) {
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
    if (signal && signal.aborted) return failure('Ejecución cancelada.', 'aborted');

    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal) signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    try {
      let body;
      let contentType;
      if (language === 'rust') {
        contentType = 'application/json';
        body = JSON.stringify({
          channel: 'stable',
          mode: 'debug',
          edition: '2024',
          crateType: 'bin',
          tests: false,
          backtrace: false,
          code,
        });
      } else {
        contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
        body = new URLSearchParams({ body: code, version: '2', withVet: 'true' }).toString();
      }

      const response = await fetch(ENDPOINTS[language], {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': contentType },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        const message =
          response.status === 429
            ? 'El Playground recibió demasiadas solicitudes. Esperá un momento antes de volver a ejecutar.'
            : response.status >= 500
              ? 'El Playground no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.'
              : 'El Playground rechazó la solicitud (HTTP ' +
                response.status +
                '). Revisá el código y volvé a intentar.';
        return failure(message, 'http', { httpStatus: response.status });
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        return failure(
          'El Playground devolvió una respuesta que no se pudo leer. Volvé a intentar.',
          'response',
        );
      }
      return language === 'rust' ? parseRust(data) : parseGo(data);
    } catch {
      if (timedOut)
        return failure(
          'La ejecución superó los 60 segundos. Revisá bucles y bloqueos; también puede haber demoras del servicio.',
          'timeout',
        );
      if (controller.signal.aborted) return failure('Ejecución cancelada.', 'aborted');
      return failure(
        'No se pudo conectar al Playground. Revisá tu conexión o un posible bloqueo del navegador. Podés seguir leyendo y resolviendo las preguntas sin conexión.',
        'network',
      );
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', abort);
    }
  }

  global.TallerRunner = Object.freeze({ run, endpoints: ENDPOINTS, timeoutMs: TIMEOUT_MS });
})(window);
