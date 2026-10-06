# Verificación e investigación

Estas reglas complementan el `AGENTS.md` raíz. Ejecutá los comandos desde la raíz
del repositorio. Los checks son TypeScript (`qa/*-check.ts`) que Node 24 ejecuta
directamente; usan `node:assert`, contextos VM y `qa/lib/`, sin framework de pruebas. Las pruebas
nuevas del front (Vitest y Playwright, ADR 0008) viven aparte: ver «Pruebas del front».

- `qa/lib/sources.ts` empaqueta en memoria con esbuild cualquier fuente del navegador
  (JS o TS, con imports) y la ejecuta en un contexto VM con globals falsos
  (`runSource`), o la importa como módulo (`importModule`). Cargá siempre las fuentes
  por ahí: así los checks no dependen del formato ni de la ubicación del archivo.
- Los checks importan archivos de `qa/` con extensión `.ts` explícita y sólo usan
  sintaxis TypeScript borrable; `tsconfig.qa.json` los tipa en `npm run typecheck`.
- `qa/run-checks.ts` es la lista única de la suite que ejecuta `npm test`. Separa los checks web de
  los de operación (`compose-runs-check` e `init-env-check`), que leen `backend/` o necesitan la CLI de
  `openssl`. `npm test` corre los dos grupos; la imagen web (`frontend/Dockerfile`) construye sin
  `backend/` en su contexto, así que corre sólo los web, con `QA_CHECKS=web`. Un check nuevo que lea
  algo fuera del contexto de esa imagen va al grupo de operación.
- `qa/lib/legacy-sources.ts` concentra las rutas y el orden de carga de las fuentes
  del navegador; al mover o portar un archivo, cambiá su ruta ahí y no en cada check.
- Los catálogos se publican desde `build/curriculum.json`, que `tools/content/` genera a partir
  de `content/`. `npm test` lo regenera por `pretypecheck`; antes de un check suelto, después
  de editar `content/`, corré `npm run curriculum`.
- `tools/content/dump-globals.ts` es el oráculo de equivalencia. Vuelca en JSON canónico lo que
  publican los adaptadores, los modelos de Sistemas y el Atlas. `tools/content/dump-dist-globals.ts`
  vuelca sólo los catálogos `window.*` de un `dist/index.html` construido. Un refactor puro
  deja el oráculo idéntico y los catálogos del dist iguales a los suyos.

## TDD para cambios de comportamiento

Leé `.agents/skills/tdd/SKILL.md` y sus referencias al trabajar test-first.
Elegí la interfaz pública afectada y el comportamiento observable antes de
escribir la prueba; la skill requiere acordar ese alcance con el usuario.
Para los contratos existentes, usá los checks del mapa siguiente como referencia.

1. Escribí una prueba pequeña para un comportamiento o regresión concreta.
2. Ejecutala y verificá que falle por el comportamiento pendiente, no por un
   error de sintaxis, fixture o entorno.
3. Implementá lo mínimo para que pase y ejecutá el check afectado.
4. Repetí por comportamiento; hacé la revisión y la refactorización con los checks
   en verde, preservando las pruebas de los contratos.

Mantené pruebas rápidas, independientes y deterministas. Los valores esperados
deben surgir de la consigna o de ejemplos resueltos de forma independiente.
Simulá la red y el almacenamiento en sus interfaces; conservá los modelos puros
como implementaciones reales. Los flujos de navegador complementan las pruebas
de módulos. Para documentación e instalación de skills, verificá archivos y
comandos: no hace falta inventar tests de producto.

## Elegir comprobaciones

Para React Doctor y Desloppify, consultá `tools/quality/AGENTS.md`. Son controles
complementarios; una puntuación no reemplaza las pruebas de comportamiento.

`npm run build` regenera la aplicación mediante Vite y deja el documento autónomo
en `dist/index.html`. `npm test` ejecuta todos los checks locales de
`qa/run-checks.ts`; al agregar un check, sumalo a esa lista. `npm run lint` y
`npm run format:check` se ejecutan antes de cerrar cambios de código; el segundo es
no mutante. Formateá los archivos propios que
cambies y evitá reformatear las skills importadas o las salidas generadas.

| Cambio | Comprobaciones locales |
| --- | --- |
| Empaquetado, assets u orden de carga | `npm run build`; `node qa/build-check.ts`, `node qa/load-order-check.ts` |
| Arranque, adaptadores `window.Taller*` o navegación por vistas | `node qa/boot-check.ts` |
| IDs de ejercicios, mundos, talleres o conceptos | `node qa/curriculum-ids-check.ts` |
| Contenido en `content/` | `npm run curriculum` y, entre los checks que leen el currículo real, `content-check`, `campaign-content-check`, `guide-content-check`, `atlas-check`, `curriculum-meta-check`, `curriculum-ids-check`, `systems-check` y el `systems-<dominio>-check` que corresponda (`node qa/<nombre>.ts`); `npm test` los corre todos; si ningún catálogo debe cambiar, `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después |
| Generador en `tools/content/` | El `node qa/content-*-check.ts` del módulo tocado (usan fixtures temporales y no leen `content/`), `node qa/curriculum-meta-check.ts` si toca el meta (`build/curriculum.meta.json`) y el oráculo de la fila anterior |
| Ejercicios o contratos de revisión | `node qa/content-check.ts`, `node qa/runner-check.ts` |
| Recorrido, biblioteca o respaldo global | `node qa/guide-content-check.ts`, `node qa/app-shell-check.ts` |
| Lectura, respaldo o avisos de carga del progreso | `node qa/versioned-storage-check.ts` y el check del almacén afectado |
| Evidencia de aprobación o interpretación de ejecuciones | `node qa/exercise-evidence-check.ts` |
| Atlas | `node qa/atlas-check.ts` |
| Mundos, desbloqueos, XP o progreso de campaña | `node qa/campaign-check.ts`, `node qa/campaign-content-check.ts` |
| Importación, validación o exportación del laboratorio | `node qa/lab-state-check.ts`, campaña y Sistemas |
| Contexto de campaña o Sistemas dentro del laboratorio | `node qa/lab-bridge-check.ts` |
| Exploradores de robot y paquetes | `node qa/quest-explorers-check.ts` |
| Catálogo, sellos o progreso de Sistemas | `node qa/systems-check.ts` |
| Modelo lowlevel, infra, play o pc | El correspondiente `node qa/systems-<dominio>-check.ts` |
| Generación de proyectos o ZIP | `node qa/project-kit-check.ts` |
| Ejecutor Go (`backend/executor/`) | `npm run test:executor`; con Docker real, `npm run test:executor:integration` (no forman parte de `npm test`) |
| API Laravel (`backend/api/`) | `npm run api:test`, `npm run api:format:check` y `npm run api:analyse`; con el stack levantado, `npm run api:smoke`, `npm run api:content:check` (las 18 porciones a través de Nginx) y `npm run api:runs:check` (ejecuciones reales en el sandbox, cuotas, cola y log); no forman parte de `npm test` |
| Plantilla del harness (`content/harness/`) | `node qa/content-harness-check.ts` (sus casos en `qa/fixtures/shared/harness-cases.json`, que también corre Pest) |
| Compose, Nginx o `init-env.sh` de las ejecuciones | `node qa/compose-runs-check.ts`, `node qa/nginx-api-blocks-check.ts` (la ubicación de `/api/runs` repite las directivas de `/api/`) y `node qa/init-env-check.ts`; los tres corren en `npm test` |
| Lógica, almacenes y componentes del front nuevo o movido | `npm run test:unit` (Vitest; también corre dentro de `npm test`) |
| Enlaces, recargas, arranque con progreso, puentes entre vistas y aspecto del front | `npm run build && npm run test:e2e` (Playwright contra `dist/index.html`; no forma parte de `npm test`) |
| Sólo documentación | Verificar rutas, comandos y enlaces locales; `git diff --check` |

Para una reorganización de archivos o un cambio transversal, regenerá la página
y ejecutá la suite local completa que también usa `frontend/Dockerfile`:

```sh
npm run build
npm test
```

## Pruebas del front (ADR 0008)

Se corren así: `npm run build && npm run test:e2e` para toda la red, y una sola spec con
`npm run test:e2e -- specs/<archivo>`. Con `E2E_PORT=<puerto>` dos worktrees corren la red a la vez
sin chocar en el puerto, y `npm run test:e2e:install` baja el navegador una vez por máquina. Los
checks de dominio de arriba siguen como están; no se migran en bloque.

- **Vitest** corre las specs junto al módulo (`frontend/src/**/*.spec.ts`), en `node`. La pila de DOM
  (`jsdom` y Testing Library) llega con la primera spec de componente. Sin `globals`: cada spec
  importa `describe`, `it` y `expect` de `vitest`.
- **Playwright** corre en `qa/e2e/` contra el `dist/index.html` que sirve `vite preview`, sin Nginx y
  sin API, en el Chrome Headless Shell. `npm run test:e2e` no construye: antes, `npm run build`.
- **Page Objects por fixtures,** con localizadores por nombre accesible (rol, etiqueta y texto). Una
  clase o un id sólo entra dentro de un Page Object, para un elemento sin nombre accesible. Las
  aserciones van en la spec, no en el Page Object. La excepción es `css-contract.spec.ts`, donde el
  selector de CSS es justamente lo que se prueba.
- **Ninguna prueba toca un servicio público.** Los Playgrounds se simulan con `page.route`, y un pedido
  fuera del servidor de pruebas sin respuesta simulada hace fallar el test. Una excepción de la
  página o un `console.error` también lo hacen fallar, salvo lo que figure en la lista blanca de
  `qa/e2e/lib/console-allowlist.ts` o en un `expectIssue` de la prueba, siempre con su motivo.
- **Los valores esperados salen del contrato:** el README, el mapa del front y las fixtures
  congeladas de `qa/fixtures/`, nunca el código que se prueba. El reloj se controla con `page.clock`.
- **Una prueba que fija un defecto conocido lleva `KNOWN DEFECT` en el nombre** y cita su referencia
  (el mapa o un hallazgo de F1). Quien lo corrige cambia esa prueba en su commit TDD.

## Red de seguridad para refactors

- `qa/fixtures/curriculum-ids.json` es contrato: fija IDs, títulos, composición de
  mundos, núcleos y objetivos de cada taller y enlaces del Atlas. Cambiar un ID exige migrar el
  progreso guardado y actualizar el fixture a mano; nunca lo regeneres para que un
  check pase.
- `qa/fixtures/progress-master-2a278ad-storage.json`, `progress-master-2a278ad-export.json`
  y `progress-d0e1b49-export.json` son progreso real generado por esas versiones (las
  cuatro claves de `localStorage` y dos exportaciones). Fijan la compatibilidad del
  formato v1: arrancar con ellas no escribe, no respalda ni avisa, y sus secciones se
  importan sin pérdida. Están congeladas: nunca las regeneres ni las edites.
- `app-shell-check` y `lab-bridge-check` caracterizan el comportamiento actual,
  incluidos defectos conocidos con `KNOWN DEFECT` en el nombre de la prueba. Al corregir uno,
  cambiá su escenario en el mismo commit TDD: primero la prueba nueva que falla,
  después la corrección.
- `qa/lib/app-adapters.ts` lista los métodos de cada `window.Taller*` que consume
  `frontend/app.js`: los fakes de `app-shell-check` salen de esa lista y `boot-check`, que
  empaqueta `frontend/src/app/main.tsx` sobre el DOM falso de `qa/lib/fake-dom.ts`, exige que los
  adaptadores reales los publiquen y que todas las vistas y «Borrar todo» funcionen.
- `load-order-check` declara qué fuente legacy debe evaluarse antes que otra y por
  qué. Al mover o portar un archivo, actualizá su ruta en la tabla sin relajar la
  restricción.

Los checks locales prueban estructura y comportamiento JavaScript. No prueban
por sí solos que las soluciones Rust/Go compilen ni que la interfaz funcione
en un navegador. Los cambios de UI requieren revisar el flujo afectado, teclado,
editor, guardado, importación/exportación, respuesta del revisor y viewport móvil.
Usá respuestas simuladas para comprobar transporte sin llamadas públicas masivas.

## Compiladores y evidencia

- `node qa/project-kit-check.ts --docker` ejecuta Cargo/Go en contenedores
  descartables. Necesita las imágenes locales `rust:1.90-alpine` y
  `golang:1.25-alpine`; el script no las descarga.
- `node qa/runtime-check.ts rust --audit-record` y su variante `go` comparan
  hashes con registros locales previos, sin red. Sólo tienen sentido si existen
  manifiestos actuales; en un clon limpio no hay evidencia previa garantizada.
- `node qa/runtime-check.ts rust --ids=rust-113` y su variante
  `go --ids=go-113` envían código a los Playgrounds oficiales. Elegí los IDs
  afectados y evitá repetir verificaciones masivas contra servicios públicos.
- Usá `--write-report` en el check de kits sólo después de una ejecución real
  con compiladores. Una ejecución estructural no debe reemplazar esa evidencia.
- Los manifiestos `*-validation.json`, previews, logs y resultados de pruebas
  son estado generado e ignorado. No los agregues a Git ni presentes un registro
  viejo como comprobación del código actual.
- Para nuevas pruebas, comprobá contratos observables y regresiones concretas;
  evitá asserts que sólo repitan detalles internos de implementación.

## Investigación

Guardá las fuentes educativas en `research-*.md`, con fecha de consulta, enlaces
primarios y límites de la evidencia. La investigación de herramientas del agente
va en `docs/agent-skills.md`. Conservá atribuciones sin copiar cursos o ejercicios
externos como si fueran contenido original del taller.
