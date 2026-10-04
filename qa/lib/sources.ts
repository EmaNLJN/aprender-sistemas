import path from 'node:path';
import vm from 'node:vm';
import esbuild from 'esbuild';

// Raíz absoluta del repo: los checks viven en qa/ y cargan fuentes de la raíz.
export const repoRoot: string = path.resolve(import.meta.dirname, '..', '..');

export interface BundleOptions {
  minify?: boolean;
}

export interface RunOptions extends BundleOptions {
  timeout?: number;
}

const iifeCache = new Map<string, string>();
const esmCache = new Map<string, string>();
const appCache = new Map<string, string>();

function build(relativePath: string, options: esbuild.BuildOptions): string {
  const absolute = path.join(repoRoot, relativePath);
  try {
    const result = esbuild.buildSync({
      entryPoints: [absolute],
      bundle: true,
      write: false,
      logLevel: 'silent',
      ...options,
    });
    const output = result.outputFiles?.[0];
    if (!output) throw new Error('esbuild no produjo salida');
    return output.text;
  } catch (error) {
    const failure = error as { errors?: esbuild.Message[]; message?: string };
    const details = failure.errors?.length
      ? failure.errors.map((message) => message.text).join('\n')
      : (failure.message ?? String(error));
    throw new Error(`No se pudo empaquetar ${relativePath}:\n${details}`, { cause: error });
  }
}

// Empaqueta en memoria una fuente JS/TS con sus imports como IIFE de navegador,
// igual que Vite/esbuild en producción, sin dejar archivos *.bundle.js en disco.
export function bundleSource(relativePath: string, options: BundleOptions = {}): string {
  const minify = options.minify ?? false;
  const key = `${relativePath}|minify=${minify}`;
  const cached = iifeCache.get(key);
  if (cached !== undefined) return cached;
  const text = build(relativePath, {
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    legalComments: 'inline',
    minify,
  });
  iifeCache.set(key, text);
  return text;
}

// Empaqueta una entrada de aplicación completa (como src/app/main.tsx) para ejecutarla
// sin navegador: las hojas de estilo se ignoran (loader `empty`), el JSX usa el runtime
// automático de React y `process.env.NODE_ENV` queda fijo en producción. Es una función
// aparte de `bundleSource` para no alterar su formato ni su caché.
export function bundleApp(relativePath: string): string {
  const cached = appCache.get(relativePath);
  if (cached !== undefined) return cached;
  const text = build(relativePath, {
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  appCache.set(relativePath, text);
  return text;
}

// Ejecuta una fuente de navegador (script legacy o módulo empaquetado) en un
// contexto vm con window falso, para que publique sus globales Taller*.
export function runSource(
  context: vm.Context,
  relativePath: string,
  options: RunOptions = {},
): void {
  vm.runInContext(bundleSource(relativePath, { minify: options.minify }), context, {
    filename: relativePath,
    timeout: options.timeout,
  });
}

// Importa un módulo TS/TSX del repo desde un check de Node. Node no resuelve
// imports relativos sin extensión, así que se empaqueta como ESM y se carga
// desde una URL data:.
export async function importModule<T>(relativePath: string): Promise<T> {
  let text = esmCache.get(relativePath);
  if (text === undefined) {
    text = build(relativePath, {
      format: 'esm',
      platform: 'node',
      target: 'es2022',
      jsx: 'automatic',
    });
    esmCache.set(relativePath, text);
  }
  const url = `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
  return (await import(url)) as T;
}
