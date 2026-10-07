import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import esbuild from 'esbuild';

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
const moduleCache = new Map<string, string>();

const MODULE_GLOBAL_NAME = '__sourceModule';
const START_CALL_STATEMENT = /^[ \t]*startApp\(\);?[ \t]*$/gm;

export interface AppBundleOptions {
  withoutStartCall?: boolean;
}

function build(relativePath: string, options: esbuild.BuildOptions): string {
  const absolute = path.join(repoRoot, relativePath);
  try {
    const result = esbuild.buildSync({
      ...(options.stdin ? {} : { entryPoints: [absolute] }),
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
    throw new Error(`Could not bundle ${relativePath}:\n${details}`, { cause: error });
  }
}

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

function startCallEntry(relativePath: string): esbuild.StdinOptions {
  const absolute = path.join(repoRoot, relativePath);
  return {
    contents: fs.readFileSync(absolute, 'utf8').replace(START_CALL_STATEMENT, ''),
    resolveDir: path.dirname(absolute),
    sourcefile: absolute,
    loader: path.extname(absolute) === '.tsx' ? 'tsx' : 'ts',
  };
}

export function bundleApp(relativePath: string, options: AppBundleOptions = {}): string {
  const withoutStartCall = options.withoutStartCall ?? false;
  const key = `${relativePath}|withoutStartCall=${withoutStartCall}`;
  const cached = appCache.get(key);
  if (cached !== undefined) return cached;
  const text = build(relativePath, {
    ...(withoutStartCall
      ? { stdin: startCallEntry(relativePath), tsconfig: path.join(repoRoot, 'tsconfig.json') }
      : {}),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  appCache.set(key, text);
  return text;
}

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

export function runModule<T>(
  context: vm.Context,
  relativePath: string,
  options: RunOptions = {},
): T {
  const minify = options.minify ?? false;
  const key = `${relativePath}|minify=${minify}`;
  let wrapped = moduleCache.get(key);
  if (wrapped === undefined) {
    const bundle = build(relativePath, {
      format: 'iife',
      globalName: MODULE_GLOBAL_NAME,
      platform: 'browser',
      target: 'es2020',
      legalComments: 'inline',
      minify,
    });
    wrapped = `(function () {\n${bundle}\nreturn ${MODULE_GLOBAL_NAME};\n})()`;
    moduleCache.set(key, wrapped);
  }
  return vm.runInContext(wrapped, context, {
    filename: relativePath,
    timeout: options.timeout,
  }) as T;
}

// Node does not resolve extensionless relative imports, so the module is bundled as ESM and loaded from a data: URL.
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
