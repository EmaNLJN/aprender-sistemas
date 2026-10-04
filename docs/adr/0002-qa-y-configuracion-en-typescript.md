# ADR 0002 — Checks de QA y configuración en TypeScript

- Estado: aceptada
- Fecha: 2026-10-03
- Reemplaza el punto 2 del ADR 0001 en lo referido a los checks `.cjs`.

## Contexto

Los checks de `qa/` eran scripts CommonJS que leían cada fuente legacy como texto y la
ejecutaban en `node:vm` con un `window` falso. Ese mecanismo obligaba a que cada
fuente fuera un script autónomo: no podía importar módulos compartidos, por eso
helpers como el escape HTML, la normalización de búsqueda o el clon JSON estaban
copiados en varios archivos. El generador de kits, que sí importa `fflate`, necesitaba
un segundo empaquetado con esbuild (`build:kits`) sólo para QA.

Node 24 ejecuta TypeScript borrable de forma nativa (type stripping) y esbuild ya era
dependencia del proyecto.

## Decisión

1. Los checks y las configuraciones (`eslint.config.ts`, `prettier.config.ts`,
   `doctor.config.ts`, `vite.config.ts`) se escriben en TypeScript. Los checks usan
   sólo sintaxis borrable e imports con extensión `.ts`, y se tipan con
   `tsconfig.qa.json`. ESLint carga su configuración TS mediante `jiti`.
2. `qa/lib/sources.ts` empaqueta en memoria con esbuild cualquier fuente del
   navegador, JS o TS y con imports, y la ejecuta en un contexto VM con globals
   falsos; también puede importarla como módulo ESM. Todos los checks cargan las
   fuentes por esa vía, así que una fuente legacy puede convertirse en módulo ES o
   en TypeScript sin reescribir sus escenarios.
3. `qa/run-checks.ts` es la lista única de la suite que ejecuta `npm test`.
4. Se retiran `build:kits` y `project-kit.bundle.js`: el check de kits empaqueta la
   fuente en memoria con las mismas opciones y obtiene un bundle byte-idéntico.
5. Antes de mover o portar fuentes, la red de seguridad fija los contratos: fixture
   de IDs del currículo, restricciones de orden de `src/main.tsx` y caracterización
   del respaldo de `app.js` y del puente de campaña y Sistemas con el laboratorio.

## Consecuencias

- Las fuentes legacy pueden importar helpers compartidos de `src/shared/`; la
  duplicación se elimina sin agregar globals `window.Taller*`.
- Los checks no dependen del formato ni de la ubicación de las fuentes: al mover un
  archivo sólo cambia la ruta que reciben.
- La equivalencia del empaquetado se verificó por check: mismas salidas, mismo
  bundle de kits y `runtime-check --audit-record` en 137/137 por lenguaje.
- El contexto VM sigue sin `structuredClone`; los helpers compartidos que deban
  ejecutarse en QA conservan la semántica JSON para clonar.
- El bundle se evalúa en modo estricto y con alcance de módulo, igual que en
  producción con Vite: una escritura sobre un estado congelado o una global
  implícita ahora fallan también en QA. Al extraer reglas comunes del contrato de
  vista de Sistemas se adoptó la variante más estricta (`rowsMatchColumns`,
  `hasViewCollections`, `isControlContract`).
