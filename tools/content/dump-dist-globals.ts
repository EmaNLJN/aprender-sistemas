// Vuelca los catálogos que publica un dist/index.html ya construido: evalúa su script en una
// VM con un DOM permisivo hasta donde llegue (los adaptadores de catálogos corren primero) y
// escribe los globals de datos con la forma de la sección `globals` de dump-globals.ts.
// Compara el artefacto real de Vite, que no puede quedar idéntico byte a byte (plan A1).
// Uso: node tools/content/dump-dist-globals.ts dist/index.html > globals.json
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2];
if (!file) throw new Error('Uso: node tools/content/dump-dist-globals.ts <dist/index.html>');
const html = readFileSync(file, 'utf8');
const script = /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
if (script === undefined) throw new Error(`${file} no tiene un script en línea`);

// Cualquier propiedad, llamada o construcción devuelve otro proxy: el DOM falso nunca lanza, y
// la evaluación sólo se corta cuando falta una API global (se informa por stderr).
function permissive(): unknown {
  const target = function () {};
  return new Proxy(target, {
    get: (_target, key) => (key === 'then' || typeof key === 'symbol' ? undefined : permissive()),
    apply: () => permissive(),
    construct: () => permissive() as object,
  });
}
const storage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
const window: Record<string, unknown> = {
  localStorage: storage,
  location: { hash: '' },
  addEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
};
const context = vm.createContext({
  window,
  document: permissive(),
  navigator: { userAgent: '' },
  console: { log() {}, warn() {}, error() {} },
  localStorage: storage,
  location: window.location,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame: () => 0,
  performance: { now: () => 0 },
});
try {
  vm.runInContext(script, context, { filename: file, timeout: 10000 });
} catch (error) {
  console.error(`La evaluación se detuvo en: ${String((error as Error | undefined)?.message)}`);
}

const DATA_GLOBAL = /^(GUIDE_DATA|RUST_|GO_|SYSTEMS_)/;
const globals: Record<string, unknown> = {};
for (const name of Object.keys(window)
  .filter((key) => DATA_GLOBAL.test(key))
  .sort()) {
  globals[name] = JSON.parse(
    JSON.stringify(window[name], (_key, v: unknown) =>
      typeof v === 'function' ? '[function]' : v,
    ),
  );
}
process.stdout.write(JSON.stringify(globals));
