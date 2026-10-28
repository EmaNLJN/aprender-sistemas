# Implementation Plan: A2 · Compuerta de arranque

**Branch**: `006-a2-compuerta-arranque` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-a2-compuerta-arranque/spec.md`. Decisiones: [research.md](./research.md). Formas y estados: [data-model.md](./data-model.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completas «Lo que A2 supone de F1 y F2», las «Reglas para todos los agentes» y la sección de tu dueño. `tasks.md` tiene una línea por tarea (T001…) y remite acá. **T001 es una compuerta:** si el spike no da «sigue», el plan se detiene y el usuario decide; no se empieza nada más. Las rutas marcadas «(PR #16)» existen en la rama del PR #16 y no en ésta: se citan sin enlace hasta que se integre.
>
> **Código verificado.** Se planificó sin correr `npm run build`, Docker ni descargas, y sin tocar el repositorio fuera de `specs/` ([research.md](./research.md), «Cómo se verificó»). Corrió de verdad, en un directorio temporal con Node 24.21.0: el código de referencia de `portions.ts`, `content-source.ts`, `static-content-source.ts`, `content-holder.ts`, `assemble-content.ts`, `run-boot.ts`, `content-gate.ts` y `gate-view.ts`, con 16 casos (12 del transporte y la compuerta, 4 de la vista) y con el verificador de tipos de TypeScript en modo estricto; el relanzamiento con `--experimental-vm-modules`; las dos expresiones regulares de `load-order-check`; y `curriculumMarkers()` contra un `curriculum.json` del 2026-10-04 (las siete familias dan al menos dos marcadores y todos están en el documento).
>
> **Código sin ejecutar.** El plugin de `vite.config.ts`, el cableado (`content-stage.ts`, `legacy-views.ts`, `main.tsx`), los cambios de `qa/` y de `dump-globals`, el check del bundle construido y los E2E se dan como referencia. Las pruebas son el contrato.

## Summary

A2 saca el currículo de `dist/index.html` y hace que el arranque lo pida antes de evaluar las vistas legacy (spec, «Intención y alcance»). El enfoque:

- **El contenido llega como un archivo.** El build copia `build/curriculum.json`, sin tocar un byte, a `dist/content/curriculum.<versión>.json`. El nombre lleva la versión: una página de otro build recibe un 404 y no contenido ajeno (research.md, R3). `dist/` queda como la raíz web completa (también los avisos de licencia) y se copia y se monta entero (R4).
- **Una compuerta dentro de una secuencia de etapas.** `main.tsx` importa las hojas de estilo y recorre `runBoot([contentGate, legacyViews])`. La compuerta pide las 17 porciones a una fuente intercambiable, las valida todas, las guarda, avisa con un evento y recién entonces la etapa `legacyViews` evalúa la cadena de hoy, en el mismo orden, con `import()`, y llama `startApp()`, el arranque explícito de `app.js` (R1, R2, R6, R7).
- **Todo o nada.** Si algo falla no se publica ni se evalúa nada, el almacenamiento y la URL quedan intactos y el alumno ve un mensaje con «Reintentar» (R6).
- **Un acceso tipado.** `getContent()` reemplaza a los seis importadores estáticos del JSON (R5).
- **Cuatro oráculos que no salen de la compuerta:** `dump-globals` con su línea base de T002; el `documentHash` y las huellas de `portions` del meta; el oráculo de ausencia y el tope medido de `build-check`; y los E2E de F1 en un navegador real.
- **La técnica depende de P1.** `import()` encadenados con `vite-plugin-singlefile`: T001 la mide sobre la base con F1 y F2, y si falla el plan se detiene.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21; Vite 8.3.2 (Rolldown 1.2.12) con `vite-plugin-singlefile` 2.3.3, esbuild 0.28.2 y `target: 'es2020'`.

**Primary Dependencies**: ninguna nueva (FR-022). Usa lo que instala F1 (ADR 0008, PR #16): Vitest y Playwright. F2a suma Zustand para la suscripción de los almacenes (decisión del usuario del 2026-10-06): A2 no lo importa, y FR-022 y SC-006 se miden contra la base de implementación, que ya lo trae.

**Storage**: ninguno. La compuerta no abre, lee ni escribe `localStorage` (FR-008). El artefacto es un estático: `dist/content/curriculum.<versión>.json`.

**Testing**: Vitest (proyecto `node`, specs junto al módulo) para la lógica; `qa/*-check.ts` para la integración (`boot-check` y el check del bundle construido); los E2E de F1 en Chromium. Los valores esperados salen del generador (el documento y su meta), de la línea base de T002 y de los textos de [data-model.md](./data-model.md), nunca de la compuerta.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: web (front React/TypeScript con vistas legacy).

**Performance Goals**: sin metas. Se informa el tiempo hasta la primera vista, antes y después, con y sin caché del navegador (FR-024).

**Constraints**:
- los mismos globals, con los mismos valores y el mismo orden de claves, y el mismo orden de evaluación;
- cero lecturas y escrituras de almacenamiento y de la URL mientras el contenido no está;
- el HTML sin el currículo, con un solo `<script>` y un solo `<style>`;
- el archivo servido con los bytes del generador;
- sin dependencias ni descargas, y sin editar las seis vistas legacy (FR-023);
- sin scripts ni `style=` en línea nuevos: la CSP de C4 no admite `'unsafe-inline'`, y la compuerta vive dentro del módulo que Vite ya emite;
- los checks leen la página construida por un solo módulo (`qa/lib/built-page.ts`): C4 retira `vite-plugin-singlefile` y el `dist/` pasa a varios archivos.

**Scale/Scope**: 17 porciones; un documento de unos 1,3 MB (391.166 bytes con el gzip de Nginx, medidos sobre uno del 2026-10-04); una cadena de 18 módulos legacy hoy, que fija la base. Se crean 19 archivos en `frontend/src/` (12 de código y 7 specs) y 7 en `qa/` (6 de soporte y checks, más el de los E2E); cambian 6 adaptadores, `main.tsx`, `pages/atlas/index.ts`, 3 configuraciones, 11 archivos de `qa/` y `tools/` y el Page Object del shell de F1; y se borran `atlas-catalog.ts` y `dump-dist-globals.ts`.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md). La constitución ratificada es la 1.4.0, que está en la rama del PR #16; esta rama todavía tiene la 1.3.1. Los principios I a VIII son idénticos en las dos, y la 1.4.0 suma «Épicos y hojas de ruta» (un ítem que toca los dos épicos se especifica una vez, donde está su dueño: A2 vive en la hoja de ruta del backend). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | Módulos ES, FSD incremental, Vite como único build y sin dependencias. T012 actualiza en el mismo cambio la documentación que llamaba «autónomo» al HTML (`AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md`). |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con su prueba, que falla por la razón que dice el paso. Donde la prueba es un oráculo de `qa/`, la falla se muestra con una mutación a propósito. Los esperados salen de afuera del código probado (ver Testing). |
| III. Código entendible | Sí, con revisión | Cada módulo tiene una responsabilidad y ninguna función se acerca a 10 de complejidad. Para revisar por cohesión: `content-gate.ts` (`attemptOnce` y el cierre de `createContentGate`) y `dump-globals.ts`, que suma un segundo camino. |
| IV. Contenido en Git, IDs estables | Sí | `content/`, el generador y los IDs no cambian. El archivo servido es el que escribe el generador. |
| V. Capas y contratos explícitos | Sí | El almacén sin imports en `shared/api/content`, el tipo `Content` en `app/content` y ninguna página que importe de `app` (R5). Sin stores, routers ni dependencias. No hace falta un ADR: el HTML deja de ser autónomo por el ADR 0004 («Consecuencias», sobre el ADR 0001). |
| VI. Español, accesibilidad y portabilidad | Sí | Mensajes en español rioplatense con voseo; región viva, foco en el botón, sin movimiento y sin `style=`; código y pruebas en inglés. Los comandos son portables (`node --check`, `process.execPath`, sin rutas de la máquina). |
| VII. Secretos y salidas generadas fuera de Git | Sí | `dist/content/` cae bajo `/dist/`, que ya ignoran `.gitignore` y `.dockerignore`. No hay secretos ni paquetes nuevos. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. El spike deja sus cifras en el mensaje de su commit y en `research.md`. Al entregar, el directorio queda inmutable. |

## Project Structure

### Documentation (this feature)

```text
specs/006-a2-compuerta-arranque/
├── spec.md              # qué y por qué, con el clarify del 2026-10-05
├── research.md          # decisiones de diseño y cómo se verificaron
├── data-model.md        # porciones, fuente, fallos, estados, contenido tipado y artefacto
├── quickstart.md        # escenarios de validación con sus comandos
├── plan.md              # este archivo: cómo, repartido en dueños
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

No hay `contracts/`: ninguna interfaz sale del proceso salvo el archivo servido, que describe `data-model.md`.

### Source Code (repository root)

```text
frontend/
├── vite.config.ts                              (T006) plugin del contenido
├── Dockerfile                                  (T006) un COPY de dist/ entero
└── src/
    ├── shared/api/content/                     (nuevo, T003) portions, content-source,
    │                                           static-content-source, content-holder, index y sus specs
    ├── app/
    │   ├── main.tsx                            (T008) hojas de estilo y runBoot
    │   ├── content/                            (nuevo, T004) content, assemble-content y sus specs
    │   ├── boot/                               (nuevo) run-boot, content-gate, gate-view, content-stage (T004);
    │   │                                       legacy-views (T008); y sus specs
    │   └── legacy/register-{catalogs,systems-*,atlas}.ts(x)   (T008) leen getContent()
    └── pages/atlas/                            (T004 reexporta un tipo; T008 quita atlas-catalog.ts)
docker/compose.preview.yaml                     (T006) monta dist/ entero
qa/
├── lib/{sources,legacy-sources}.ts             (T005) withContent y el fixture
├── lib/{content-document,publish-content-fixture,built-page}.ts   (nuevos, T005; T009 suma evaluateBuiltPage)
├── lib/{boot-harness,content-server}.ts        (nuevos, T007)
├── {boot-check,load-order-check}.ts            (T007)
├── {atlas-check,curriculum-ids-check,runtime-check}.ts, fixtures/atlas-page-render.tsx   (T005)
├── build-check.ts                              (T006 y T010)
├── dist-content-check.ts                       (nuevo, T009) y su alta en run-checks.ts
└── e2e/                                        (T008) la espera de ShellPage.goto; (T011) los escenarios
                                                de A2 en la red de F1
tools/content/{dump-globals.ts (T005), dump-dist-globals.ts (se borra, T009)}
README.md  AGENTS.md  docs/architecture.md  docs/refactor-roadmap.md  qa/AGENTS.md   (T012)
```

**Structure Decision:** lo nuevo vive en tres carpetas por responsabilidad: el transporte en `shared/api/content/` (como `shared/api/playground/`), el contenido tipado en `app/content/` y el arranque en `app/boot/`. Sin barrels más que la API del segmento.

## Decisiones del usuario del 2026-10-06

El usuario aceptó las tres decisiones de diseño que este plan dejaba abiertas, con la opción que el plan traía. Las respuestas están en la spec ([spec.md](./spec.md), «Clarifications», sesión del 2026-10-06) y no cambian ninguna tarea ni ningún código de referencia.

| Decisión | Spec | [research.md](./research.md) | Tareas |
| --- | --- | --- | --- |
| El archivo servido es `dist/content/curriculum.<versión>.json`, con los bytes del generador, y la versión viaja en el nombre | Q6; FR-004, FR-011 | R3 | T004, T005, T006 |
| El build emite los dos avisos de licencia, y `frontend/Dockerfile` copia `dist/` entero con una sola línea | Q7; FR-016 | R4 | T006, T012, T013 |
| Los marcadores del oráculo de ausencia son los de `curriculumMarkers()`: dos textos largos de una entrada y, si no es una palabra común del código, su ID | Q8; FR-015, SC-003 | R11 | T005, T010 |

**Quedaba abierta, a propósito:** qué hacer si P1 fallaba en T001. No hubo nada que decidir: P1 pasó (research.md, «Resultados del spike»).

## Lo que A2 supone de F1 y F2

F1 y F2 no están entregadas (ver «Estado al 2026-10-06», abajo). Esta tabla es lo que A2 consume de ellas: lo escribe el plan y lo contrasta T001 con la base.

| De | Supuesto | Si es distinto |
| --- | --- | --- |
| F1 | `npm test` corre las specs de Vitest (`frontend/src/**/*.spec.ts`, proyecto `node`) además de los checks; existe `npm run test:unit`; el Playwright corre contra `vite preview`, que sirve `dist/` entero, con Page Objects en `qa/e2e/pages/` y sólo Chromium | T003, T004 y T011 siguen la estructura que F1 dejó, y T001 la anota. Si Vitest no llegó, A2 no empieza. Si el servidor de F1 sirve sólo el HTML, T011 pide que sirva `dist/content/` |
| F1 | Qué hace con un `console.error` (Q3 de su spec, decidida el 2026-10-05: lo hace fallar el test, salvo una lista blanca) | Como lo hace fallar, cada escenario de falla de T011 declara su entrada en la lista blanca: Chromium escribe «Failed to load resource» ante un 404, un 500 o un pedido abortado (no verificado) |
| F1 | Su configuración es de escritorio (Desktop Chrome) | T011 pide el viewport móvil con `test.use` |
| F1 | `ShellPage.goto(url)` (`qa/e2e/pages/shell.ts`) deja la página lista para actuar: espera el evento `load`, y en la base la app ya arrancó en ese momento | Difiere (T001): con la compuerta, la app arranca cuando llega el contenido y tres pruebas de F1 fallan por una carrera. T008 hace que `goto` espere la primera vista o el error de `#main`, no el estado de carga |
| F2.1 | Los almacenes y los motores son singletons importables y los `register-*` quedan como adaptadores finos | No cambia la cadena |
| F2.2 | El catálogo `exercises`/`byId` es un módulo de `entities/exercise` que se evalúa dentro de la cadena diferida y lee los globals que publican los adaptadores, o recibe las porciones desde `app` | Si importa `build/curriculum.json` en estático, T008 lo reemplaza (FR-005); T001 anota el archivo. T001: `entities/exercise/model/exercise-catalog.ts` no lo importa y lo inicializa `TallerLab.init()`, dentro de `startApp()` |
| F2.3 | El arranque de `app.js` es una función que se llama en orden | `legacyViews` la llama después del último `import()`; T001 anota su nombre. T001: es `startApp()`, exportada por `frontend/app.js`, y cambia T007 y T008 |
| F2.4 | El registro de modelos de Sistemas está en `entities/systems-simulation` | Los `register-systems-*` siguen publicando `SYSTEMS_*`: no cambia |
| Épico | Los ports editan `legacy-views.ts` y las restricciones de `load-order-check`, no `main.tsx` | — |

**Regla.** T001 contrasta cada fila con la base. Si una difiere en algo que cambia un contrato de A2 (la lista de la cadena, el nombre del arranque explícito, la fuente del catálogo o la estructura de F1), se corrige este plan antes de T002, en un commit propio. Si F1 o las unidades 1 a 4 de F2 no están integradas, A2 no empieza.

**Estado al 2026-10-06.** Lo que cambió desde que se escribió este plan. Son hechos: ninguna tarea cambia, y T001 sigue contrastando la tabla con la base de implementación.

- **F1 está implementada** en el PR #23 (abierto, apilado sobre el PR #16). En su rama se comprobó lo que la tabla supone: `npm test` corre `vitest run --config frontend/vitest.config.ts` además de los checks, y existen `npm run test:unit` y `npm run test:e2e`; Playwright corre un solo proyecto, Chromium con la configuración de escritorio, contra `npm run preview`; los Page Objects están en `qa/e2e/pages/` y los specs, en `qa/e2e/specs/`. Un `console.error` o una excepción de la página hace fallar el test salvo lo que declare `CONSOLE_ALLOWLIST` (hoy vacía) o `expectIssue(patrón, motivo)` en el propio test, y la guarda también falla si un error esperado no ocurre. El viewport móvil sigue siendo de T011 (`test.use`).
- **F2 tiene spec y plan de F2a** en el PR #25 (borrador, apilado sobre el PR #16). El plan de F2a se está rehaciendo en `spec/f2-seams`, y ahí se fijan los nombres que A2 toma de F2a (F2-I1 a F2-I6, más abajo). T001 los contrasta con la base cuando la tenga.
- **El usuario eligió Zustand** para la suscripción de los almacenes de F2, en lugar de una señal propia. La dependencia la suma la unidad 1 de F2a. A2 no se suscribe a ningún almacén: su código de referencia no cambia.
- **De F2a, las unidades 2 (catálogo) y 4 (registro de modelos) están implementadas**, en las ramas `f2a/u2-c-catalogo` y `f2a/u4-m-modelos`. En la de la unidad 2, `exerciseCatalog` (`entities/exercise`) no importa `build/curriculum.json` (sólo lo hace su spec) y lo inicializaba `lab.js`, al evaluarse, con los globals `window.*` que publican los adaptadores: es la primera forma de F2-I2. Los seis importadores de FR-005 siguen siendo los mismos. Faltan la 1 (almacenes y motores, con Zustand) y la 3 (arranque explícito), que son las que fijan F2-I3 y F2-I1. A2 sigue sin empezar: T001 corre sobre la base con las cuatro. En esa base (`c5d497d`), con la unidad 3, el catálogo ya no lo inicializa `lab.js` al evaluarse: lo inicializa `TallerLab.init()` (el `init()` de `lab.js`), al que llama `startApp()`, con los mismos globals. Sigue después de la compuerta y no cambia ninguna tarea.

**Contraste de T001 (2026-10-06).** Sobre la base `c5d497d`, la regla se disparó y este plan ya está corregido (research.md, «Resultados del spike»):
- `legacyViews` llama `startApp()` después del último `import()`: el código de referencia de T008 la incluye;
- `boot-check` tiene 14 casos, no 10, y tres de la unidad 3 de F2a dependen de dónde se llama `startApp()`; la regla de `startApp()` de `load-order-check` pasa a `legacy-views.ts` (T007);
- `ShellPage.goto` espera la primera vista o el error, y el cambio entra con el corte (T008), no con T011;
- el arnés de T007 y T009 suma `Event` y un stub de `MutationObserver`;
- el quickstart cuenta los `<script>` con la expresión de `build-check`.

### Interfaces y contratos que A2 fija para F2 y el épico

Lo que A2 fija y F2 (unidades 1 a 4) tiene que dejar. F2-I1 a F2-I5 son interfaces de las unidades; F2-I6 es un contrato de capas para F3 a F10, que la spec de F2 tiene que recoger. T001 verifica cada una sobre la base; si falta alguna, se replanifica antes de T002.

| ID | Unidad | Interfaz | Cómo la usa A2 |
| --- | --- | --- | --- |
| F2-I1 | 3, arranque explícito | Evaluar `app.js` (y cada módulo de la cadena) no arranca la app: ni los `init` de campaña y Sistemas, ni `loadWarning`, ni el primer render, ni lecturas de almacenamiento o de la URL. Lo que hacía al evaluarse pasa a una función exportada que se llama una sola vez y en el mismo orden (campaña, Sistemas, aviso de carga, render). Si vive en `frontend/src/app/boot/`, no pisa los nombres de A2 (`run-boot`, `content-gate`, `content-stage`, `gate-view`, `legacy-views`) ni define `runBoot` ni `BootStage` | `legacyViews` la llama después del último `import()` de la cadena; T001 anota su nombre y su archivo. T001: `startApp()`, de `frontend/app.js` |
| F2-I2 | 2, catálogo | El módulo del catálogo (`exercises`, `byId`) no importa `build/curriculum.json` ni otro contenido en estático, y se construye después de la compuerta: se evalúa dentro de la cadena diferida y lee los globals que publican los adaptadores, o expone una función de las porciones de ejercicio (`lab`, `quests` y `cores`) que `app` llama después de la compuerta | Una entidad no puede importar `getContent` (las capas lo impiden): A2 sólo cambia su fuente en T008 si hace falta |
| F2-I3 | 1, almacenes y motores | Ningún módulo alcanzable por imports estáticos desde `main.tsx` abre un almacén ni crea un motor al evaluarse: los singletons se crean cuando la cadena importa los `register-*`, o cuando se llama el arranque | La compuerta no lee ni escribe almacenamiento (FR-008) |
| F2-I4 | 1 a 4 | Los `register-*` siguen siendo módulos con efectos que publican `window.*`, y cada cambio de la lista de imports y de la tabla de `qa/load-order-check.ts` se hace sobre la forma vigente: la lista de `main.tsx` antes del corte de A2 y `legacy-views.ts` después | La cadena de A2 es esa lista |
| F2-I5 | todas | `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después de cada unidad | Es la línea base de T002 |
| F2-I6 | contrato del épico, F3 a F10 | Nada por debajo de `app` importa `getContent()`: una página portada recibe su porción del contenido por props desde su adaptador de `frontend/src/app/legacy/` (el patrón del Atlas con `entries`), y lo que una entidad necesita del contenido, como el catálogo de F2-I2, le llega por una función que `app` llama después de la compuerta o por los globals que publican los adaptadores. La raíz única de F10 es de `app` y reparte la porción a cada página | Precisa el «acceso tipado» que el épico espera de A2: no es un import que cada vista haga, porque las capas lo impiden (`app → pages → … → shared`). Las specs de F2 y de F3 a F9 tienen que decir lo mismo |

Las unidades 5 a 8 de F2 que lleguen después del corte de A2 siguen las formas de [research.md](./research.md) (R10).

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **Todo o nada.**
  - Nada se guarda ni se publica hasta que están las 17 porciones, con la versión esperada y con su forma: `storeContent` y el evento van después de `checkPortions`.
  - Ningún módulo alcanzable por imports estáticos desde `main.tsx` lee contenido ni abre `localStorage` al evaluarse: sólo las hojas de estilo, `boot/`, `content/` y `shared/api/content/`.
- **Los temporizadores.** El del umbral y el del tope no hacen nada una vez que el intento terminó, porque `boot-check` los corre todos y no cancela ninguno. El spec lo prueba con un `clearTimeout` sin efecto.
- **El orden.** La cadena de `legacy-views.ts` es la lista de imports de la base, sin las hojas de estilo y en el mismo orden, y `startApp()` se llama una vez, después del último `import()`. `load-order-check` mantiene todas sus restricciones y sus tres reglas.
- **Los mismos valores.** Los globals se arman con las porciones por referencia: sin copias, sin congelar y con el mismo orden de claves. `dump-globals` da los mismos bytes que en T002.
- **Los bytes y la versión.** `dist/content/curriculum.<versión>.json` tiene el sha256 del `documentHash`. El HTML no tiene el currículo (tope y marcadores) y sí la versión. `dist/` es la raíz web completa (también los dos avisos de licencia): la imagen lo copia y la vista previa lo monta entero.
- **Capas.** Los imports siguen `app → pages → … → shared`: el almacén sin imports en `shared`, el tipo `Content` en `app` y ninguna página que importe de `app`.
- **El dist se lee por un solo módulo.** `build-check` y `dist-content-check` no parsean `dist/index.html` por su cuenta: usan `qa/lib/built-page.ts`, que es lo único que cambia cuando C4 retire `vite-plugin-singlefile`.
- **Ningún script ni estilo en línea nuevo.** La compuerta vive en el módulo que Vite ya emite; el botón usa `addEventListener` y el marcado no lleva `style=` ni manejadores en línea. `frontend/src/index.html` no cambia.
- **El corte es atómico.** T008 es el único commit que mezcla `main.tsx`, `legacy-views.ts`, los adaptadores, el Atlas y la espera de `ShellPage.goto`. Revertirlo devuelve el import estático.
- **Los textos.** Español rioplatense con voseo, sin estilos en línea y con el foco en «Reintentar».
- **Lo que no se ejecutó al planificar:** el plugin de Vite, Docker y los E2E (ver «Riesgos»).

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | C | T001 (el spike, que es una compuerta) y T002 (la línea base) |
| 1 | G, Q y C a la vez | **G:** T003 y después T004. **Q:** T005. **C:** T006 |
| 2 | Q y después C | T007 (las pruebas del corte, que fallan) y T008 (el corte) |
| 3 | Q, C y E a la vez | T009 (el check del bundle construido), T010 (`build-check`) y T011 (los E2E) |
| 4 | C | T012 (la documentación) y T013 (la compuerta final) |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| G · Compuerta | `frontend/src/shared/api/content/**`, `frontend/src/app/content/**`, `frontend/src/app/boot/{run-boot,content-gate,gate-view,content-stage}.ts` y sus specs; en T004, la línea que reexporta `AtlasByLanguage` en `frontend/src/pages/atlas/index.ts` | Los tipos de las entidades | El transporte, el almacén, el tipo `Content` y la compuerta, sin cablear |
| Q · QA | `qa/lib/{sources,legacy-sources,content-document,publish-content-fixture,built-page,boot-harness,content-server}.ts`, `qa/{boot-check,load-order-check,atlas-check,curriculum-ids-check,runtime-check,dist-content-check}.ts`, `qa/fixtures/atlas-page-render.tsx`, `tools/content/{dump-globals,dump-dist-globals}.ts` | De G: el almacén (`content-holder.ts`), `__CONTENT_VERSION__` y la señal; de C: el plugin (T009) | Los arneses, los oráculos y las pruebas que fallan del corte |
| E · E2E | El archivo de specs de A2 en `qa/e2e/` y lo que suma al Page Object del shell (la región del error y el botón) | El build de C (T008), con la espera de `ShellPage.goto` | Los escenarios de A2 en la red de F1 |
| C · Coordinador | `frontend/src/app/main.tsx`, `frontend/src/app/boot/legacy-views.ts`, la espera de `ShellPage.goto` en `qa/e2e/pages/shell.ts` (T008), `frontend/src/app/legacy/register-{catalogs,systems-lowlevel,systems-infra,systems-play,systems-pc,atlas}.ts(x)`, `frontend/src/pages/atlas/{index.ts (en T008),model/atlas-catalog.ts}`, el módulo de catálogo de F2.2 si hay que cambiarle la fuente (T001: no hace falta), `frontend/vite.config.ts`, `frontend/Dockerfile`, `docker/compose.preview.yaml`, `qa/build-check.ts`, `qa/run-checks.ts`, `package.json` (sin cambios), la documentación de T012 y `tasks.md` | Todo | El build, el corte y el cierre |

G, Q y E son slices delegables en el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se le dan sus archivos, sus interfaces y sus checks, y se le dice que no deje comentarios. C lo hace el agente principal, que además revisa cada diff y corre los checks de cada integración.

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 con «sigue» y T002 hechos. G, Q y C parten de ahí.
- **S1:** T004, T005 y T006 integrados.
- **S2:** T007 integrado: las pruebas del corte fallan por lo que dice la tarea.
- **S3:** T008 integrado. Q, C y E parten de ahí.
- **S4:** T009 a T011 integrados. C cierra.

**Puntos de integración con otros frentes** (los resuelve el coordinador):

| Archivo | Quién más lo toca | Regla |
| --- | --- | --- |
| `frontend/src/app/main.tsx` | F2.1 a F2.4 y, después, F10 y F11 | A2 parte de la base con F2.4 integrada. Después de A2, los ports editan `legacy-views.ts`; F11 suma una etapa previa en la llamada a `runBoot`; F10, una posterior |
| `qa/load-order-check.ts`, `qa/boot-check.ts`, `qa/lib/legacy-sources.ts` | Los ports de F2 y de F3 a F10 | A2 los cambia en T005 y T007; después cada port edita sus tablas |
| `qa/e2e/**`, `package.json` y `.github/workflows/ci.yml` | F1 | A2 suma archivos, cambia la espera de `ShellPage.goto` en el corte (T008) y suma al Page Object del shell la parte que usa (T011). No cambia `package.json` ni el workflow |
| `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/refactor-roadmap.md`, `qa/AGENTS.md` | El PR #16, F1 (adopción del ADR 0008) y los demás ítems | T012 los edita al final, sobre lo que ya esté integrado |
| `specs/backend-multiusuario/roadmap.md` | El PR #16 (la fila de A2 y «Orden y paralelismo») | Esta rama sólo cambia la fila de A2 y una línea de «Estado y evidencia»; el conflicto es de una línea y se resuelve con el texto del PR #16 y el estado «Planificado» |
| `docker/compose.yaml`, `backend/api/**` | C3, C6 y los demás ítems del backend | A2 no los toca |

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, [research.md](./research.md), [data-model.md](./data-model.md) y tu sección;
  - las skills `tdd`, `clean-code` y `codebase-design`, y además `vitest` (G y Q) o `playwright-best-practices` (E).
- **TDD, siempre.**
  - Escribí la prueba de tu paso y comprobá que falla por la razón que dice el plan. Recién entonces implementá.
  - Un módulo nuevo empieza con su firma lanzando `not implemented`, para que la prueba falle por comportamiento y no por un import.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos**, desde la raíz: `npm run test:unit -- <ruta>`, `node qa/<check>.ts`, `npm run typecheck`, `npm run lint` y `npm run format:check`. Antes de un check suelto, `npm run curriculum`. `npm run build` lo corre quien lo necesita en su tarea (T001, T006, T008 a T011 y T013), cada uno en su worktree. Docker sólo lo corre el coordinador, con permiso.
- **Sin dependencias ni descargas.** Si `node_modules` falta, pedí permiso para `npm ci`: no suma paquetes.
- **Hashes portables.** Donde el plan escribe `sha256` (un archivo o una salida por tubería), usá el `node -e` de [quickstart.md](./quickstart.md): funciona igual en Linux y en macOS.
- **Estilo.**
  - Código y pruebas en inglés, mensajes para el alumno en español con voseo.
  - Sin comentarios por defecto. El código de referencia del plan trae algunos para quien lo lee, y al implementar se borran, salvo los que explican una restricción que el código no muestra (como el de los temporizadores de `attemptOnce`) o dejan una referencia puntual (un bug, una RFC o una decisión de un ADR).
  - `interface` para formas de objetos y exports nombrados.
  - Sin `style=`.
  - Una función de más de 10 de complejidad se revisa y se justifica.
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva su prueba. La evidencia de una tarea es su commit, y lo que midas va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 1. Spike y línea base (coordinador, onda 0)

**Cubre:** SC-008 y FR-017; deja dicho si la técnica se compromete.

### Tarea 1.1 · El spike (T001)

- **Quién y dónde:** el coordinador (o un agente de investigación con su permiso), en una rama descartable de la base. No deja código de producción y no suma paquetes. Antes de empezar, F1 y F2.1 a F2.4 tienen que estar integradas.
- **Entrega:** un commit de documentación que agrega «Resultados del spike» a [research.md](./research.md), y cuyo mensaje trae las respuestas de P1 a P4 con versiones, comandos y cifras. `tasks.md` marca T001 con ese commit.
- **Pasos:**
  1. Anotar la base: `git rev-parse HEAD`, `node --version` y las versiones del lockfile (`vite`, `vite-plugin-singlefile`, `esbuild`).
  2. Contrastar con la base cada fila de «Lo que A2 supone de F1 y F2» y anotar lo que difiere: el archivo y el nombre del catálogo de F2.2, el nombre del arranque de F2.3, la estructura de `qa/e2e/`.
  3. Volver a contar, sobre la base: los checks de `qa/run-checks.ts`, las specs de Vitest, las restricciones de `qa/load-order-check.ts` y los casos de `qa/boot-check.ts` (30, 16 y 10 al 2026-10-05, más lo que sumen F1 y F2). Esos números reemplazan a los de la spec en las comprobaciones de T013.
  4. Armar un prototipo descartable: la lista de imports de `main.tsx` detrás de `import()`, con una marca por módulo (`window.__marks.push(nombre)`); el contenido en un archivo que un plugin mínimo copia a `dist/content/`; los adaptadores leyendo de un objeto de prueba; y un evento «contenido publicado» despachado a mano antes de la cadena.
  5. **P1.** `npm run build`. Contar los `<script>` de `dist/index.html` (esperado: 1) y los archivos o enlaces externos del documento (esperado: ninguno; el único archivo extra es el del contenido). Ejecutar el bundle en el vm con el mecanismo de P2 y en Chromium con el Playwright de F1: las marcas empiezan después del evento y cumplen las restricciones de orden de la base. Con `grep`, listar qué módulos leen contenido de `window.*` al evaluarse.
  6. **P2.** `node --check` sobre el script del dist copiado a un `.mjs`; `vm.SourceTextModule` con el relanzamiento de [research.md](./research.md) (R9): ¿evalúa la salida? Si no, probar el desvío del IIFE con esbuild. Anotar el cambio mínimo de `build-check` y del check del bundle.
  7. **P3.** `html.length` y bytes de `dist/index.html` antes (la base) y después (el prototipo), y los bytes del contenido sin comprimir y con `gzip -1`. Calcular el tope de `build-check`: `piso(medido × 1,10)`, redondeado hacia abajo a la decena de miles, para no pasar del 10 % que fija la spec.
  8. **P4.** Empaquetar el prototipo con el patrón de `bundleApp` y correr `boot-check` con un `fetch` simulado que sirve el documento: los casos pasan sin cambiar sus valores esperados. Con un `fetch` que no responde, anotar qué temporizadores corren en `flush()`. Con el `fetch` que sirve el documento, anotar si el camino feliz se asienta antes de la primera ronda de `flush()`: un `Response` de Node puede tardar más, y el servidor simulado de T007 responde con microtareas.
  9. **Tiempo hasta la primera vista, antes:** con el Playwright de F1, sobre la base, con y sin caché del navegador (R13).
  10. Decidir y registrar.
- **Regla de decisión.**
  - **Si P1 pasa**, la respuesta es «sigue» y T002 en adelante usan `import()` encadenados con `vite-plugin-singlefile`. Si P2 mostró que `SourceTextModule` no sirve, T009 usa el desvío del IIFE.
  - **Si P1 falla** (más de un script, archivos o enlaces externos, o evaluación anticipada), el plan se detiene. El coordinador le lleva al usuario las alternativas de [research.md](./research.md) (R1) con su costo: la salida estándar de Vite en chunks, importar todo en estático con el arranque explícito de F2, o una función de arranque por vista legacy. No se empieza T002.

### Tarea 1.2 · La línea base del oráculo (T002)

- **Quién:** coordinador, sobre la base y antes de cualquier cambio de código.
- **Entrega:** un commit de documentación que agrega a [research.md](./research.md) la sección «Línea base», con el hash del volcado y el `documentHash` del documento para el que se calculó, y la fecha. El mensaje del commit lleva lo mismo.
- **Pasos:**
  1. `npm run curriculum && node tools/content/dump-globals.ts . | sha256` en la base.
  2. Leer el `documentHash` de `build/curriculum.meta.json` (`node -e` o `jq`).
  3. Registrar los dos juntos: el volcado depende del contenido, así que sin el hash del documento la línea base no dice contra qué se tomó. El 2026-10-05, sobre `master`, el volcado empezaba con `cd1f9e62…` para un documento que empezaba con `ef8f5715…`.
  4. Si el `documentHash` sigue empezando con `ef8f5715…`, el volcado tiene que empezar con `cd1f9e62…`: F1 y F2 prometen no cambiar lo que se publica, y si no coincide se avisa al coordinador antes de seguir.
  5. Si el contenido de `content/` cambia mientras dura la feature, la línea base se vuelve a tomar con el código de la base de la rama, nunca con el de A2.
- **Se usa en:** T005 (el volcado no cambia con el cambio de `dump-globals`), T008 (ni con el corte) y T013 (en la raíz de un commit anterior también, FR-017).

## 2. Transporte y compuerta (dueño G, onda 1)

**Cubre:** FR-001, FR-006 a FR-013 y FR-025, y de FR-020 la parte de la lógica; US4, con FR-012.

**Entrega:** el transporte, el almacén, el tipo `Content`, la compuerta y su vista, sin cablear: nada de esto se importa desde `main.tsx` hasta T008, así que el taller sigue como estaba.

### Tarea 2.1 · El transporte y el almacén (T003)

- **Crea** en `frontend/src/shared/api/content/`: `portions.ts`, `content-source.ts`, `static-content-source.ts`, `content-holder.ts`, `index.ts`, y los specs `portions.spec.ts`, `static-content-source.spec.ts` y `content-holder.spec.ts`.
- **Entrega:** `PORTION_NAMES`, `PortionName`, `SYSTEMS_DOMAINS`, `findPortionProblem`, `ContentSource`, `SourcePortion`, `ContentLoadError`, `createStaticContentSource`, `storeContent` y `readStoredContent`, todos por `index.ts`.
- **Pasos:**
  1. Los specs y las firmas con `not implemented`. Casos, con los esperados de afuera del código:
     - `portions.spec.ts`: los nombres son los de `Object.keys(portions)` de `build/curriculum.meta.json`, en el mismo orden; las 17 porciones de `build/curriculum.json` no dan problema; falta una; una lista vacía; una entrada sin `id`; un objeto donde va una lista; una guía sin el recorrido de un lenguaje.
     - `static-content-source.spec.ts`: parte el documento en las 17 porciones por referencia y todas con la versión; un 404 es `version`; un 500 es `status`; un `fetch` que rechaza es `network`; un cuerpo que no es JSON y un JSON que no es un objeto son `body`; un aborto pasa sin cambiar.
     - `content-holder.spec.ts` (con `vi.resetModules()` entre casos): leer antes de guardar lanza; devuelve lo guardado; guardar dos veces lanza.
  2. Implementar. Con `npm run test:unit -- shared/api/content` en verde.
- **Código de referencia** (verificado con tipos reducidos y 12 casos):

```ts
// frontend/src/shared/api/content/portions.ts
import { isPlainObject } from '../../lib/is-plain-object';

export const SYSTEMS_DOMAINS = ['lowlevel', 'infra', 'play', 'pc'] as const;
export type SystemsDomain = (typeof SYSTEMS_DOMAINS)[number];

// The 17 portions, in the order of `portions` in build/curriculum.meta.json.
export const PORTION_NAMES = [
  'lab.rust', 'lab.go', 'quests.rust', 'quests.go',
  'cores.lowlevel', 'cores.infra', 'cores.play', 'cores.pc',
  'campaign.rust', 'campaign.go',
  'workshops.lowlevel', 'workshops.infra', 'workshops.play', 'workshops.pc',
  'atlas.rust', 'atlas.go', 'guide',
] as const;
export type PortionName = (typeof PORTION_NAMES)[number];

export type PortionProblem = 'missing' | 'shape';

function isEntry(value: unknown): boolean {
  return isPlainObject(value) && typeof value.id === 'string' && value.id !== '';
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function isGuide(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const { resources, sources, tracks } = value;
  if (!isNonEmptyArray(resources) || !Array.isArray(sources) || !isPlainObject(tracks)) return false;
  return (['rust', 'go'] as const).every((language) => {
    const track = tracks[language];
    return isPlainObject(track) && isNonEmptyArray(track.modules);
  });
}

// An empty list is as dangerous as an absent one: the lab would discard the saved progress of the
// missing exercises.
export function findPortionProblem(name: PortionName, data: unknown): PortionProblem | null {
  if (data === undefined) return 'missing';
  if (name === 'guide') return isGuide(data) ? null : 'shape';
  return Array.isArray(data) && data.length > 0 && data.every(isEntry) ? null : 'shape';
}
```

```ts
// frontend/src/shared/api/content/content-source.ts
import type { PortionName } from './portions';

export interface SourcePortion {
  readonly name: PortionName;
  readonly version: string; // the first 32 hex digits of the document hash
  readonly data: unknown; // undefined when the source does not have the portion
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
```

```ts
// frontend/src/shared/api/content/static-content-source.ts
import { isPlainObject } from '../../lib/is-plain-object';
import { ContentLoadError, type ContentSource } from './content-source';
import type { PortionName } from './portions';

export interface StaticContentSourceOptions {
  // The file name carries the version, so a page only ever asks for the bytes of its own build:
  // another build's page gets a 404, never another build's content.
  readonly url: string;
  readonly version: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchDocument(url: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ContentLoadError('network', messageOf(error));
  }
  if (response.status === 404) throw new ContentLoadError('version', '404');
  if (!response.ok) throw new ContentLoadError('status', String(response.status));
  let document: unknown;
  try {
    document = await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ContentLoadError('body', messageOf(error));
  }
  if (!isPlainObject(document)) throw new ContentLoadError('body', 'el documento no es un objeto');
  return document;
}

function portionOf(document: Record<string, unknown>, name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = document[group];
  if (slice === undefined) return value;
  return isPlainObject(value) ? value[slice] : undefined;
}

// The bridge between A2 and A3: one request for the whole document, split into the 17 portions.
export function createStaticContentSource({
  url,
  version,
}: StaticContentSourceOptions): ContentSource {
  return {
    async read(names, { signal }) {
      const document = await fetchDocument(url, signal);
      return names.map((name) => ({ name, version, data: portionOf(document, name) }));
    },
  };
}
```

```ts
// frontend/src/shared/api/content/content-holder.ts (no imports: qa/lib imports it too)
let stored: unknown;
let hasContent = false;

export function storeContent(content: unknown): void {
  if (hasContent) throw new Error('El contenido ya se publicó.');
  stored = content;
  hasContent = true;
}

export function readStoredContent(): unknown {
  if (!hasContent) {
    throw new Error('El contenido todavía no se publicó: se lee después de la compuerta de arranque.');
  }
  return stored;
}
```

```ts
// frontend/src/shared/api/content/index.ts
export { storeContent, readStoredContent } from './content-holder';
export { ContentLoadError } from './content-source';
export type { ContentFailureKind, ContentRequest, ContentSource, SourcePortion } from './content-source';
export { PORTION_NAMES, SYSTEMS_DOMAINS, findPortionProblem } from './portions';
export type { PortionName, PortionProblem, SystemsDomain } from './portions';
export { createStaticContentSource } from './static-content-source';
export type { StaticContentSourceOptions } from './static-content-source';
```

### Tarea 2.2 · El contenido tipado y la compuerta (T004)

- **Crea** `frontend/src/app/content/{content,assemble-content}.ts` y `frontend/src/app/boot/{run-boot,content-gate,gate-view,content-stage}.ts`, con los specs `assemble-content.spec.ts`, `run-boot.spec.ts`, `content-gate.spec.ts` y `gate-view.spec.ts`. **Cambia** `frontend/src/pages/atlas/index.ts` con una línea: `export type { AtlasByLanguage } from './model/types';`.
- **Entrega:** `createContentGate(options): BootStage`, `Content`, `getContent()`, `CONTENT_PUBLISHED_EVENT`, `assembleContent`, `runBoot`, `BootStage`, `GateView`, `createGateView`, `failureMarkup` y `contentGate` (el cableado de A2, con el tope de 20 s y el umbral de 400 ms que explica [research.md](./research.md), R6).
- **Pasos:**
  1. Los specs y las firmas con `not implemented`. Casos:
     - `content-gate.spec.ts`, con `vi.useFakeTimers()`, una vista falsa, `vi.stubGlobal('window', new EventTarget())` y fuentes de prueba:
       - con las 17 porciones del documento real publica todo junto, vacía la vista, guarda el contenido (`getContent()` lo devuelve), despacha el evento una vez con ese mismo objeto en `detail`, y nunca muestra la carga si es rápido;
       - muestra la carga recién a los 400 ms (a los 399, no);
       - se cuelga: a los 20.000 ms aborta la señal, falla con `timeout` y no publica nada;
       - falla, «Reintentar» muestra la carga al instante, un segundo clic no abre otro pedido y el éxito sigue el arranque (una sola lectura de más);
       - una fuente que devuelve otra versión falla con `version` y no publica (es lo que hará la API de A3);
       - una porción ausente (`missing`) o con otra forma (`shape`) no publica nada;
       - con un `clearTimeout` sin efecto, los temporizadores que corren después del éxito no muestran la carga ni abortan.
     - `gate-view.spec.ts`, sin DOM: `failureMarkup('version')` dice que puede haber una versión nueva y que hay que recargar; los demás tipos, el mensaje general; todos incluyen el progreso guardado, `data-failure`, `role="alert"` y `id="content-retry"`, y ninguno lleva `style=`.
     - `assemble-content.spec.ts`: las listas y los objetos del `Content` son los mismos que los de las porciones (`toBe`, sin copias).
     - `run-boot.spec.ts`: corre las etapas en orden y una etapa pendiente retiene a las siguientes.
  2. Implementar. `npm run test:unit -- app/` en verde, y `npm run typecheck`.
- **Código de referencia** (verificado: `assemble-content`, `run-boot`, `content-gate` y `gate-view` con tipos reducidos; `content.ts` y `content-stage.ts` sin ejecutar):

```ts
// frontend/src/app/content/content.ts
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import type { GuideData } from '../../entities/guide';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import type { AtlasByLanguage } from '../../pages/atlas';
import { readStoredContent, type SystemsDomain } from '../../shared/api/content';

type Language = 'rust' | 'go';

export interface Content {
  lab: Record<Language, Exercise[]>;
  quests: Record<Language, Exercise[]>;
  cores: Record<SystemsDomain, Exercise[]>;
  campaign: Record<Language, CampaignWorldDefinition[]>;
  workshops: Record<SystemsDomain, SystemsWorkshop[]>;
  atlas: AtlasByLanguage;
  guide: GuideData;
}

export const CONTENT_PUBLISHED_EVENT = 'taller:content-published';

export function getContent(): Content {
  return readStoredContent() as Content;
}
```

```ts
// frontend/src/app/content/assemble-content.ts
import type { PortionName, SourcePortion } from '../../shared/api/content';
import type { Content } from './content';

// The portions are already validated: every name is present and has its shape. The casts live here,
// once, and the values are the parsed objects themselves (no copies, same key order).
export function assembleContent(portions: readonly SourcePortion[]): Content {
  const byName = new Map(portions.map((portion) => [portion.name, portion.data]));
  const get = <T>(name: PortionName): T => byName.get(name) as T;
  return {
    lab: { rust: get('lab.rust'), go: get('lab.go') },
    quests: { rust: get('quests.rust'), go: get('quests.go') },
    cores: {
      lowlevel: get('cores.lowlevel'),
      infra: get('cores.infra'),
      play: get('cores.play'),
      pc: get('cores.pc'),
    },
    campaign: { rust: get('campaign.rust'), go: get('campaign.go') },
    workshops: {
      lowlevel: get('workshops.lowlevel'),
      infra: get('workshops.infra'),
      play: get('workshops.play'),
      pc: get('workshops.pc'),
    },
    atlas: { rust: get('atlas.rust'), go: get('atlas.go') },
    guide: get('guide'),
  };
}
```

```ts
// frontend/src/app/boot/run-boot.ts
export interface BootStage {
  readonly name: string;
  // Resolves when the stage is done; a stage that waits for the learner stays pending.
  run(): Promise<void>;
}

export async function runBoot(stages: readonly BootStage[]): Promise<void> {
  for (const stage of stages) await stage.run();
}
```

```ts
// frontend/src/app/boot/content-gate.ts
import {
  ContentLoadError,
  PORTION_NAMES,
  findPortionProblem,
  storeContent,
  type ContentSource,
  type SourcePortion,
} from '../../shared/api/content';
import { assembleContent } from '../content/assemble-content';
import { CONTENT_PUBLISHED_EVENT, type Content } from '../content/content';
import type { BootStage } from './run-boot';

export interface GateView {
  showLoading(): void;
  showFailure(failure: ContentLoadError, retry: () => void): void;
  clear(): void;
}

export interface ContentGateOptions {
  readonly source: ContentSource;
  readonly expectedVersion: string;
  readonly view: GateView;
  readonly timeoutMs: number;
  readonly loadingDelayMs: number;
}

type Outcome = { content: Content } | { failure: ContentLoadError };

// All or nothing: every portion present, of the expected version and with its shape.
function checkPortions(portions: readonly SourcePortion[], expectedVersion: string): void {
  const byName = new Map(portions.map((portion) => [portion.name, portion]));
  for (const name of PORTION_NAMES) {
    const portion = byName.get(name);
    if (!portion) throw new ContentLoadError('missing', name);
    if (portion.version !== expectedVersion) throw new ContentLoadError('version', name);
  }
  for (const name of PORTION_NAMES) {
    const problem = findPortionProblem(name, byName.get(name)?.data);
    if (problem) throw new ContentLoadError(problem, name);
  }
}

function toFailure(error: unknown, timedOut: boolean): ContentLoadError {
  if (timedOut) return new ContentLoadError('timeout');
  if (error instanceof ContentLoadError) return error;
  return new ContentLoadError('network', error instanceof Error ? error.message : String(error));
}

// One attempt. Its timers do nothing once it has settled: the harness of boot-check runs every
// queued timer on flush() and never cancels one.
async function attemptOnce(
  options: ContentGateOptions,
  showLoadingAfterDelay: boolean,
): Promise<Outcome> {
  const controller = new AbortController();
  let settled = false;
  let timedOut = false;
  const loadingTimer = showLoadingAfterDelay
    ? setTimeout(() => {
        if (!settled) options.view.showLoading();
      }, options.loadingDelayMs)
    : undefined;
  const capTimer = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);
  try {
    const portions = await options.source.read(PORTION_NAMES, { signal: controller.signal });
    checkPortions(portions, options.expectedVersion);
    return { content: assembleContent(portions) };
  } catch (error) {
    return { failure: toFailure(error, timedOut) };
  } finally {
    settled = true;
    clearTimeout(loadingTimer);
    clearTimeout(capTimer);
  }
}

export function createContentGate(options: ContentGateOptions): BootStage {
  return {
    name: 'contentGate',
    run: () =>
      new Promise<void>((resolve) => {
        let inFlight = false;

        async function attempt(isRetry: boolean): Promise<void> {
          if (inFlight) return;
          inFlight = true;
          if (isRetry) options.view.showLoading();
          const outcome = await attemptOnce(options, !isRetry);
          inFlight = false;
          if ('failure' in outcome) {
            options.view.showFailure(outcome.failure, () => void attempt(true));
            return;
          }
          options.view.clear();
          storeContent(outcome.content);
          window.dispatchEvent(new CustomEvent(CONTENT_PUBLISHED_EVENT, { detail: outcome.content }));
          resolve();
        }

        void attempt(false);
      }),
  };
}
```

```ts
// frontend/src/app/boot/gate-view.ts
import type { ContentLoadError } from '../../shared/api/content';
import type { GateView } from './content-gate';

const GENERAL_DETAIL =
  'El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.';
const VERSION_DETAIL =
  'El contenido del taller no se pudo cargar: puede que haya una versión nueva. Tu progreso sigue guardado en este navegador. Recargá la página y, si sigue igual, probá de nuevo.';

export const LOADING_MARKUP =
  '<section class="empty-state" data-content-gate="loading"><p role="status">Cargando el contenido del taller…</p></section>';

// `kind` comes from a closed list, so it is safe inside an attribute.
export function failureMarkup(kind: ContentLoadError['kind']): string {
  const detail = kind === 'version' ? VERSION_DETAIL : GENERAL_DETAIL;
  return (
    `<section class="empty-state" data-content-gate="failed" data-failure="${kind}">` +
    '<h2>No se pudo cargar el contenido</h2>' +
    `<p role="alert">${detail}</p>` +
    '<button class="button" id="content-retry" type="button">Reintentar</button>' +
    '</section>'
  );
}

export function createGateView(): GateView {
  const render = (markup: string): HTMLElement | null => {
    const main = document.getElementById('main');
    if (main) main.innerHTML = markup;
    return main;
  };
  return {
    showLoading() {
      const hadFocus = document.activeElement?.id === 'content-retry';
      const main = render(LOADING_MARKUP);
      if (hadFocus) main?.focus();
    },
    showFailure(failure, retry) {
      render(failureMarkup(failure.kind));
      const button = document.getElementById('content-retry');
      button?.addEventListener('click', retry);
      button?.focus();
    },
    clear() {
      render('');
    },
  };
}
```

```ts
// frontend/src/app/boot/content-stage.ts: the A2 wiring, which A3 replaces with the API source
import { createStaticContentSource } from '../../shared/api/content';
import { createContentGate } from './content-gate';
import { createGateView } from './gate-view';

declare const __CONTENT_VERSION__: string;

const CONTENT_TIMEOUT_MS = 20_000;
const LOADING_DELAY_MS = 400;

export const contentGate = createContentGate({
  source: createStaticContentSource({
    url: `/content/curriculum.${__CONTENT_VERSION__}.json`,
    version: __CONTENT_VERSION__,
  }),
  expectedVersion: __CONTENT_VERSION__,
  view: createGateView(),
  timeoutMs: CONTENT_TIMEOUT_MS,
  loadingDelayMs: LOADING_DELAY_MS,
});
```

## 3. Soporte de QA (dueño Q, onda 1)

**Cubre:** FR-017 y FR-019, sin cambiar el comportamiento de ningún check.

### Tarea 3.1 · Que los checks sigan cargando los catálogos (T005)

- **Cambia** `qa/lib/sources.ts`, `qa/lib/legacy-sources.ts`, `qa/runtime-check.ts`, `qa/atlas-check.ts`, `qa/curriculum-ids-check.ts`, `qa/fixtures/atlas-page-render.tsx` y `tools/content/dump-globals.ts`. **Crea** `qa/lib/content-document.ts`, `qa/lib/publish-content-fixture.ts` y `qa/lib/built-page.ts`.
- **Entrega:** `runSource(context, ruta, { withContent: true })`, `bundleApp` con `__CONTENT_VERSION__`, `curriculumDocumentText()`, `curriculumDocument<T>()`, `curriculumMeta()`, `contentVersion()` y `curriculumMarkers()`; `readBuiltPage()` y `readBuiltContent()`, el único módulo que sabe cómo arranca la página construida; y un `dump-globals` que da los mismos bytes en las dos disposiciones.
- **La prueba que falla.** Este paso no cambia el comportamiento de ningún check: la red es la suite entera y el volcado de T002. Lo que falla primero es un check existente con un adaptador que ya lee el contenido publicado mientras el arnés todavía no lo publica (paso 2).
- **Pasos:**
  1. Línea de base: `npm run curriculum && npm test` en verde, y el volcado de `dump-globals` con el hash de T002.
  2. **Rojo.** A mano y sin commitear, cambiar `register-catalogs.ts` para que lea `getContent()` en lugar del JSON y correr `node qa/content-check.ts`: falla con «El contenido todavía no se publicó», que es la razón esperada.
  3. **Verde.** Implementar los cambios de abajo. El mismo check, con el adaptador cambiado, pasa. Después, descartar el cambio del adaptador.
  4. Otra vez la línea de base: `npm test` en verde y el volcado con el mismo hash. Ninguna prueba cambia un valor esperado.
  5. **Humo de `built-page.ts`**, con un `dist/` construido: `node -e "import('./qa/lib/built-page.ts').then((m) => { const page = m.readBuiltPage(); console.log(page.scripts.length, page.bootSize === page.html.length); })"` imprime `1 true`. Hasta T008 el HTML todavía lleva el currículo: lo que se mira es la forma.
- **Código de referencia** (sin ejecutar):

```ts
// qa/lib/content-document.ts (it computes its own root: importing sources.ts would be circular)
import { readFileSync } from 'node:fs';
import path from 'node:path';

const buildDirectory = path.resolve(import.meta.dirname, '..', '..', 'build');

export function curriculumDocumentText(): string {
  return readFileSync(path.join(buildDirectory, 'curriculum.json'), 'utf8');
}
export function curriculumDocument<T>(): T {
  return JSON.parse(curriculumDocumentText()) as T;
}
export interface CurriculumMeta {
  documentHash: string;
  portions: Record<string, string>;
}
export function curriculumMeta(): CurriculumMeta {
  return JSON.parse(readFileSync(path.join(buildDirectory, 'curriculum.meta.json'), 'utf8')) as CurriculumMeta;
}
export function contentVersion(): string {
  return curriculumMeta().documentHash.slice(0, 32);
}
```

```ts
// qa/lib/publish-content-fixture.ts
import { storeContent } from '../../frontend/src/shared/api/content/content-holder.ts';

// It is evaluated before the adapter inside one bundle (sources.ts, `withContent`): static imports
// run in order, and both share this one module.
const text = (globalThis as { __TALLER_QA_CONTENT__?: string }).__TALLER_QA_CONTENT__;
storeContent(JSON.parse(text ?? 'null'));
```

```ts
// qa/lib/sources.ts (los cambios)
export interface BundleOptions {
  minify?: boolean;
  withContent?: boolean;
}

// With `withContent`, `build()` omits `entryPoints` and bundles this entry instead.
function entryWithContent(adapter: string): esbuild.BuildOptions {
  const fixture = path.join(repoRoot, 'qa', 'lib', 'publish-content-fixture.ts');
  return {
    stdin: {
      contents: `import ${JSON.stringify(fixture)};\nimport ${JSON.stringify(path.join(repoRoot, adapter))};`,
      resolveDir: repoRoot,
      loader: 'js',
      sourcefile: `with-content:${adapter}`,
    },
  };
}
// bundleSource caches by path, minify and withContent.
// runSource with withContent sets context.__TALLER_QA_CONTENT__ = curriculumDocumentText() before evaluating.
// bundleApp adds __CONTENT_VERSION__: JSON.stringify(contentVersion()) to its define.
```

```ts
// qa/lib/legacy-sources.ts: loadGuideContent, loadLabExercises, loadCampaignWorlds and
// loadSystemsDomain evaluate the adapters with runAdapter; the other loadX do not change.
function runAdapter(context: vm.Context, source: string, options?: RunOptions): void {
  runSource(context, source, { ...options, withContent: true });
}
```

```ts
// qa/lib/built-page.ts: the only place that knows how the built page boots. C4 retires
// vite-plugin-singlefile and dist becomes several files: this file changes, not every check.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from './sources.ts';

export interface BuiltScript {
  readonly name: string;
  readonly source: string;
}

export interface BuiltPage {
  readonly html: string;
  // The module scripts that boot the page, in load order. With vite-plugin-singlefile, the one
  // inline script.
  readonly scripts: readonly BuiltScript[];
  // The HTML and every script: where the curriculum and the licenses are looked for.
  readonly bootText: string;
  // What the size cap measures: today the characters of the HTML, which carries code and styles.
  readonly bootSize: number;
}

const SCRIPT = /<script\b[^>]*>([\s\S]*?)<\/script>/g;

export function readBuiltPage(root: string = repoRoot): BuiltPage {
  const html = readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
  const scripts = [...html.matchAll(SCRIPT)].map((match, index) => ({
    name: `dist/index.html:inline-script-${index + 1}`,
    source: match[1] ?? '',
  }));
  return { html, scripts, bootText: html, bootSize: html.length };
}

// The A2 bridge: A3 retires it together with the static document.
export function readBuiltContent(root: string = repoRoot): { fileName: string; bytes: Buffer } {
  const directory = path.join(root, 'dist', 'content');
  const names = readdirSync(directory).filter((name) =>
    /^curriculum\.[0-9a-f]{32}\.json$/.test(name),
  );
  assert.equal(names.length, 1, `dist/content tiene ${names.length} curriculum.<versión>.json y debe tener uno`);
  const [fileName = ''] = names;
  return { fileName, bytes: readFileSync(path.join(directory, fileName)) };
}
```

```ts
// qa/lib/content-document.ts (continued): the markers of the absence oracle. C4 reuses them to scan
// the web image. Checked against a curriculum.json of 2026-10-04, with the text and the folder as
// parameters.
import { readdirSync } from 'node:fs'; // joins the existing import of node:fs

export const FAMILIES = ['lab', 'quests', 'cores', 'campaign', 'workshops', 'atlas', 'guide'] as const;
export type Family = (typeof FAMILIES)[number];

export interface FamilyMarkers {
  readonly family: Family;
  readonly markers: readonly string[];
}

interface Entry {
  id?: unknown;
  [field: string]: unknown;
}

const MIN_LENGTH = 24;
// The bundle escapes quotes, backslashes and non-ASCII text, so only plain printable ASCII is a
// reliable marker.
const PLAIN_ASCII = /^[\x20-\x7e]+$/;
const ESCAPED_IN_A_BUNDLE = /["'`\\]/;
const frontendDirectory = path.resolve(import.meta.dirname, '..', '..', 'frontend');

function isMarkerSafe(text: string): boolean {
  return PLAIN_ASCII.test(text) && !ESCAPED_IN_A_BUNDLE.test(text);
}

function entriesOf(document: Record<string, unknown>, family: Family): Entry[] {
  if (family === 'guide') {
    const guide = document.guide as {
      resources: Entry[];
      tracks: Record<string, { modules: (Entry & { steps: Entry[] })[] }>;
    };
    const modules = Object.values(guide.tracks).flatMap((track) => track.modules);
    return [...guide.resources, ...modules.flatMap((module) => [module, ...module.steps])];
  }
  return Object.values(document[family] as Record<string, Entry[]>).flat();
}

function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsOf);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringsOf);
  return [];
}

function readSources(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .map((item) => {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) return readSources(file);
      return /\.(ts|tsx|js|css|html)$/.test(item.name) ? readFileSync(file, 'utf8') : '';
    })
    .join('\n');
}

// Per family: the two longest plain texts of the first entry that has them and does not share them
// with the front sources (a marker that the code also contains proves nothing), plus its id when the
// id is just as plain and absent from the sources (an id like «cache» is common in code).
export function curriculumMarkers(): FamilyMarkers[] {
  const document = curriculumDocument<Record<string, unknown>>();
  const sources = readSources(frontendDirectory);
  const isUsable = (text: string): boolean => isMarkerSafe(text) && !sources.includes(text);
  return FAMILIES.map((family) => {
    for (const entry of entriesOf(document, family)) {
      const texts = stringsOf(entry)
        .filter((text) => text.length >= MIN_LENGTH && !/^https?:\/\//.test(text) && isUsable(text))
        .sort((a, b) => b.length - a.length)
        .slice(0, 2);
      if (texts.length < 2) continue;
      const id = typeof entry.id === 'string' && isUsable(entry.id) ? [entry.id] : [];
      return { family, markers: [...id, ...texts] };
    }
    throw new Error(`La familia «${family}» no tiene una entrada con marcadores seguros`);
  });
}
```

- **Los checks que leían `atlasByLanguage`:** `atlas-check` y `curriculum-ids-check` toman el Atlas de `curriculumDocument<{ atlas: Record<string, AtlasConcept[]> }>().atlas`; `qa/fixtures/atlas-page-render.tsx` exporta `renderAtlasPage(language, entries)` y `atlas-check` le pasa `atlas[language]`. `runtime-check`, que evaluaba `register-catalogs.ts` y los `register-systems-*` con `runSource`, usa `loadLabExercises` y `loadSystemsCatalogs`; sus hashes de fuente cambian con los adaptadores, como en A1.
- **`dump-globals.ts`.** Detecta la disposición de la raíz que recibe: si `register-catalogs.ts` todavía importa `curriculum.json`, corre el código de hoy sin cambios (también sobre la raíz de un commit anterior a A2). Si no, empaqueta una entrada temporal (en `os.tmpdir()`, que borra al salir) y la evalúa en el mismo contexto:

```ts
// entry of the new layout (generated with the absolute paths of the root it receives)
//   import '<tmp>/publish.ts';                      // storeContent(JSON.parse(globalThis.__DUMP_CONTENT__))
//   import '<root>/frontend/src/app/legacy/register-catalogs.ts';
//   import '<root>/frontend/src/app/legacy/register-systems-lowlevel.ts';   // and infra, play, pc
//   import { getContent } from '<root>/frontend/src/app/content/content.ts';
//   globalThis.__dumpedAtlas = getContent().atlas;  // on the context, not on `window`: it stays out of `globals`
```

  El volcado conserva su forma (`errors`, `globals`, `models`, `atlas`) y, como `window` sólo recibe los ocho globals de siempre, los mismos bytes.

## 4. Build y servidor (coordinador, onda 1)

**Cubre:** FR-004, FR-014 (la mitad que no depende del corte), FR-015 (el artefacto) y FR-016.

### Tarea 4.1 · `dist/` como raíz web completa (T006)

- **Cambia** `frontend/vite.config.ts`, `frontend/Dockerfile`, `docker/compose.preview.yaml` y `qa/build-check.ts`.
- **Entrega:** `dist/` completo: `index.html`, `content/curriculum.<versión>.json` con los bytes del generador y los dos avisos de licencia, que Vite emite en lugar de que los copie el `Dockerfile`. Lo sirven `vite preview`, la imagen y la vista previa, y `npm run dev` sirve el contenido. `__CONTENT_VERSION__` queda definido en el build.
- **Pasos:**
  1. En `qa/build-check.ts`, la comprobación del artefacto (lee `dist/content/` directamente: T010 la pasa por `qa/lib/built-page.ts`): existe `dist/content/curriculum.<versión>.json` con `versión = documentHash.slice(0, 32)` del meta, y su sha256 es el `documentHash`; y `dist/` trae `EDITOR-LICENSES.txt` y `THIRD-PARTY-NOTICES.txt` con los bytes de los de `frontend/`. `npm run build && node qa/build-check.ts` falla porque esos archivos no existen.
  2. El plugin de `vite.config.ts`, el `COPY` único del `Dockerfile` y el montaje entero de la vista previa. Con `npm run build && node qa/build-check.ts` en verde, y los demás checks igual que antes.
  3. `npm run dev` sirve `/content/curriculum.<versión>.json` (comprobarlo con `curl -s localhost:5173/content/curriculum.<versión>.json | sha256`, que da el `documentHash`).
  4. **Docker, sin verificar hasta T013.** Docker no corre acá: el `COPY` de `dist/` y el montaje entero se prueban con el stack levantado, con permiso.
- **Código de referencia** (sin ejecutar; `Plugin` es el tipo de `vite`):

```ts
// frontend/vite.config.ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const buildDirectory = resolve(import.meta.dirname, '../build');
const NOTICES = ['EDITOR-LICENSES.txt', 'THIRD-PARTY-NOTICES.txt'];

function readCurriculum(): { bytes: Buffer; fileName: string; version: string } {
  const bytes = readFileSync(resolve(buildDirectory, 'curriculum.json'));
  const { documentHash } = JSON.parse(
    readFileSync(resolve(buildDirectory, 'curriculum.meta.json'), 'utf8'),
  ) as { documentHash: string };
  if (createHash('sha256').update(bytes).digest('hex') !== documentHash) {
    throw new Error(
      'build/curriculum.meta.json no describe a build/curriculum.json: corré npm run curriculum.',
    );
  }
  const version = documentHash.slice(0, 32);
  return { bytes, fileName: `content/curriculum.${version}.json`, version };
}

// Vite builds the whole web root: the page, the curriculum next to it with the generator's bytes
// (its version in the file name, so a page only ever receives the content of its own build; spec A2,
// FR-004 and FR-011) and the license notices that the Dockerfile used to copy from frontend/.
function webRootFiles(): Plugin {
  return {
    name: 'taller-web-root-files',
    config: () => ({ define: { __CONTENT_VERSION__: JSON.stringify(readCurriculum().version) } }),
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const { bytes, fileName } = readCurriculum();
        if (request.url?.split('?')[0] !== `/${fileName}`) return next();
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(bytes);
      });
    },
    generateBundle() {
      const { bytes, fileName } = readCurriculum();
      this.emitFile({ type: 'asset', fileName, source: bytes });
      for (const notice of NOTICES) {
        const source = readFileSync(resolve(import.meta.dirname, notice));
        this.emitFile({ type: 'asset', fileName: notice, source });
      }
    },
  };
}

// plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), webRootFiles()],
```

```dockerfile
# frontend/Dockerfile, final stage: one line instead of today's three COPY (index.html and the
# two license notices). dist/ is the whole web root.
COPY --from=build /app/dist/ /usr/share/nginx/html/
```

```yaml
# docker/compose.preview.yaml: mount the whole dist/, as FR-016 asks (it was only index.html).
# Run npm run build first: if dist/ does not exist, Docker creates it empty and owned by root.
    volumes:
      - ../dist:/usr/share/nginx/html:ro
```

## 5. El corte (onda 2)

**Cubre:** FR-001 a FR-003, FR-005, FR-006, FR-008, FR-013 y FR-020, con US1, US2 y US4.

### Tarea 5.1 · Las pruebas del corte, que fallan (T007, dueño Q)

- **Crea** `qa/lib/boot-harness.ts` y `qa/lib/content-server.ts`. **Cambia** `qa/boot-check.ts`, `qa/load-order-check.ts` y, si `withoutStartCall` lo pide, `qa/lib/sources.ts` (paso 2).
- **Entrega:**
  - `createBootHarness({ fetch })`: el arnés de hoy (movido de `boot-check.ts`), más `fetch`, `AbortController`, `Event`, `CustomEvent`, `dispatchEvent` y un stub de `MutationObserver` en el contexto (`Event` y el stub los pide la salida de Vite que evalúa T009, no el IIFE de `boot-check`: [research.md](./research.md), R12). Sin `fetch`, la compuerta no lanza: muestra el error `network`, así que un caso sin el servidor simulado falla por el contenido y no por el arnés. También suma espías de `getItem`, `setItem` y `removeItem` (`storageCalls`); `published`, con el contenido de cada evento de publicación y los globals que existían en ese instante; y `mainWrites`, con cada valor que se asignó a `#main.innerHTML`. `bootError` sigue para lo síncrono (la evaluación del grafo estático); una excepción de la cadena es asíncrona y queda en `errors`, porque `main.tsx` la registra con `console.error`.
  - `createContentServer(behaviors)`: un `fetch` simulado que sirve los bytes de `build/curriculum.json` en `/content/curriculum.<contentVersion()>.json`, da 404 a cualquier otra ruta y registra cada pedido. Responde con objetos mínimos (`ok`, `status` y un `json()` que se resuelve con microtareas), no con un `Response` de Node.
- **Pasos:**
  1. En `load-order-check.ts`: la lectura de las dos formas textuales de [research.md](./research.md) (R10), con la tabla de 16 restricciones intacta sobre la lista de `legacy-views.ts`, una restricción de etapas (`contentGate` antes de `legacyViews`) y las tres reglas de la base. «`app.js` último» y «`styles.css` primera» no cambian. «`startApp()` exactamente una vez, después del último import», que hoy lee `main.tsx`, pasa a leer `legacy-views.ts` y se ancla al último `() => import(…)` de la cadena: el `import type` del principio del archivo no cuenta. Con `main.tsx` de hoy falla: no encuentra `runBoot`. El spike no corrió la regla de `startApp()` sobre `legacy-views.ts`: la prueba es una mutación de T008 (sacar o duplicar la llamada).
  2. En `boot-check.ts`: cada `boot()` usa el arnés con `createContentServer()` y `bundleApp`. Los 14 casos de la base (los 10 del 2026-10-05 y 4 de la unidad 3 de F2a) conservan sus valores esperados y siguen en verde con `main.tsx` de hoy (el `fetch` simplemente no se usa). Tres de los de F2a, «main.tsx without its call…», «startApp initializes in order…» y «a second startApp call fails», evalúan `bundleApp(ENTRY, { withoutStartCall: true })`, que hoy saca la llamada sólo de la entrada, por el `stdin` de esbuild. Después del corte la llamada está en `legacy-views.ts` y esa opción no la saca: el primero pasa en vacío y los otros dos fallan con un `TypeError`, porque `window.TallerLab` todavía no existe. Cambian dos cosas del procedimiento y ningún valor esperado:
     - `withoutStartCall` saca la llamada donde esté: de `main.tsx` hasta T008 y de `legacy-views.ts` desde T008. Cómo lo hace lo decide esta tarea, porque la API síncrona de esbuild (`buildSync`) no tiene plugins.
     - Los tres casos evalúan con el servidor simulado y hacen `flush()` antes de llamar a `startApp()` (el primero, antes de sus aserciones), para que la compuerta publique y la cadena se evalúe.

     El spike lo comprobó después del corte, con la llamada quitada a mano de `legacy-views.ts`: los tres pasan con sus mismos valores esperados. Con `main.tsx` de hoy no se corrió: lo comprueba este paso.
  3. Los escenarios nuevos, que fallan con `main.tsx` de hoy porque no hay compuerta:
     - **Antes de publicar:** en el instante del evento, ningún global de las vistas ni de los catálogos existe (`published[0].globals` vacío).
     - **El camino feliz no muestra la carga:** `mainWrites` no contiene «Cargando el contenido del taller»: el pedido se asienta antes de la primera ronda de `flush()`, que corre un temporizador encolado por ronda y empezaría por el del umbral y el del tope. Si no pasara, el arreglo está en `createContentServer` (responde con un objeto mínimo cuyo `json()` se resuelve con microtareas) y no en la compuerta.
     - **Los siete modos del transporte** (red, 404, 500, tope de espera, cuerpo que no es JSON, porción ausente y porción con otra forma), uno por caso: después de `flush()` no existe ningún global `Taller*` ni de catálogo, `storageCalls` está vacío, no hay claves `:respaldo`, el aviso (`toast`) está vacío, `#main` muestra «No se pudo cargar el contenido» y «Reintentar» con `data-failure` del tipo que corresponde (el 404 es `version` y suma «recargá la página»), el foco está en `content-retry` (`focused === 1`) y `errors` está vacío. El tope usa un `fetch` que se cuelga hasta que la señal aborta: `flush()` corre el temporizador del tope.
     - **El reintento que arranca:** el primer pedido falla y el segundo sirve; el clic en `content-retry` hace que arranquen las vistas, `#main` ya no muestra el error y hubo exactamente dos pedidos.
     - **Un pedido por vez:** dos clics seguidos suman un solo pedido más.
  4. `node qa/load-order-check.ts` y `node qa/boot-check.ts`: los nuevos fallan por esas razones y los 14 casos pasan.
- **Código de referencia** (sin ejecutar):

```ts
// qa/lib/content-server.ts
import { contentVersion, curriculumDocumentText } from './content-document.ts';

export type ContentBehavior =
  | { kind: 'serve' }
  | { kind: 'reject' }
  | { kind: 'status'; status: number }
  | { kind: 'text'; body: string }
  | { kind: 'document'; document: unknown }
  | { kind: 'hang' }; // never answers; rejects with the abort reason when the signal aborts

export interface FakeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface ContentServer {
  fetch: (url: string, init?: { signal?: AbortSignal }) => Promise<FakeResponse>;
  requests: string[];
}

// Not a Node `Response`: its json() settles in microtasks. The gate queues its timers before the
// request settles, and flush() runs one queued timer per round.
function respond(status: number, body: string): FakeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body) as unknown };
}

// Each attempt takes the next behavior; the last one repeats.
export function createContentServer(behaviors: ContentBehavior[] = [{ kind: 'serve' }]): ContentServer {
  const url = `/content/curriculum.${contentVersion()}.json`;
  const requests: string[] = [];
  let attempt = 0;
  return {
    requests,
    async fetch(requested, init) {
      requests.push(requested);
      if (requested !== url) return respond(404, 'not found');
      const behavior = behaviors[Math.min(attempt++, behaviors.length - 1)] ?? { kind: 'serve' };
      switch (behavior.kind) {
        case 'serve':
          return respond(200, curriculumDocumentText());
        case 'reject':
          throw new TypeError('fetch failed');
        case 'status':
          return respond(behavior.status, 'error');
        case 'text':
          return respond(200, behavior.body);
        case 'document':
          return respond(200, JSON.stringify(behavior.document));
        case 'hang':
          return new Promise<FakeResponse>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
          );
      }
    },
  };
}
```

### Tarea 5.2 · El corte (T008, dueño C)

- **Cambia** `frontend/src/app/main.tsx`, los adaptadores `register-{catalogs,systems-lowlevel,systems-infra,systems-play,systems-pc,atlas}`, `frontend/src/pages/atlas/index.ts`, la espera de `ShellPage.goto` en `qa/e2e/pages/shell.ts` (de F1) y, si F2.2 dejó un import estático del JSON, su módulo de catálogo (T001: no lo dejó). **Crea** `frontend/src/app/boot/legacy-views.ts`. **Borra** `frontend/src/pages/atlas/model/atlas-catalog.ts`.
- **Entrega:** el arranque en etapas, sin ningún importador estático del JSON (FR-005).
- **Pasos:**
  1. Partir de S2: las pruebas de T007 fallan.
  2. Escribir `legacy-views.ts` con la lista de imports de la base (hoy, 18 módulos), sin las hojas de estilo y en el mismo orden, y, después del último `import()`, la llamada a `startApp()` que hoy hace `main.tsx`; `main.tsx` con las hojas y la llamada a `runBoot`. La línea que trae `startApp` no tiene la forma `() => import('…'),`: si la tuviera, `load-order-check` contaría `app.js` dos veces.
  3. Los adaptadores: `const content = getContent();` en lugar de `import curriculum from '…/curriculum.json'`, y sin los `as` que ya no hacen falta. `register-atlas.tsx` lee `getContent().atlas[language]` al montar, y `pages/atlas/index.ts` deja de exportar `atlasByLanguage`.
  4. `ShellPage.goto(url)` espera, después de `page.goto`, la primera vista o el error de `#main`, no el estado de carga (código abajo). En la base la app ya arrancó en `load`, porque arranca al evaluarse el módulo; con la compuerta arranca cuando llega el contenido. Sin esta espera, tres pruebas de F1 fallan por una carrera (`css-contract`, «the counter of the current entry», y dos de `url-contract`, «the language switch writes the query»). Esperar cualquier hijo de `#main` (`#main > *`) no alcanza: resuelve sobre el estado de carga, y con el contenido demorado 1,2 s la prueba falla (research.md, «Resultados del spike»). Va con el corte y no con T011: sin él, la red de F1 se vuelve intermitente desde este commit.
  5. `npm run build && npm test`: los casos de T007 pasan, el resto no cambia sus valores esperados. `npm run test:e2e`: la red de F1 da 106 de 106. Como la falla era una carrera, una corrida verde no alcanza: también `npm run test:e2e -- --repeat-each 5 css-contract url-contract`, sin fallas.
  6. `node tools/content/dump-globals.ts . | sha256`: es el hash de T002.
  7. **Mutaciones**, descartadas: intercambiar dos módulos de `legacy-views.ts` hace fallar `load-order-check`; sacar o duplicar `startApp()` en `legacy-views.ts` hace fallar `load-order-check` (la regla de `startApp()`); sacar `contentGate` de `runBoot` hace fallar `boot-check`; hacer que un adaptador lea `getContent()` fuera de la cadena (un import estático desde `main.tsx`) hace fallar `boot-check` con «El contenido todavía no se publicó».
- **Revisión:** `git diff --stat` no incluye `frontend/app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js` ni `quest-explorers.js` (FR-023).
- **Código de referencia** (sin ejecutar):

```ts
// frontend/src/app/main.tsx
import '../../styles.css';
import '../../lab.css';
import '../pages/atlas/ui/atlas.css';
import '../../campaign.css';
import '../../quest-explorers.css';
import '../../systems.css';

import { contentGate } from './boot/content-stage';
import { legacyViews } from './boot/legacy-views';
import { runBoot } from './boot/run-boot';

// The boot sequence. qa/load-order-check.ts reads this call: a new stage goes here and in its table.
runBoot([contentGate, legacyViews]).catch((error: unknown) => {
  console.error('No se pudo iniciar el taller.', error);
});
```

```ts
// frontend/src/app/boot/legacy-views.ts
import type { BootStage } from './run-boot';

// The legacy chain, in the order of the old list of imports of main.tsx. qa/load-order-check.ts
// reads it: one `() => import('…'),` per line. Each module is evaluated when its turn comes, after
// the content was published; then startApp(), the explicit start of app.js, runs once.
const LEGACY_MODULES: readonly (() => Promise<unknown>)[] = [
  () => import('../legacy/register-catalogs'),
  () => import('../legacy/register-runner'),
  () => import('../legacy/register-editor'),
  () => import('../../../lab-explorers.js'),
  () => import('../../../quest-explorers.js'),
  () => import('../legacy/register-systems-lowlevel'),
  () => import('../legacy/register-systems-infra'),
  () => import('../legacy/register-systems-play'),
  () => import('../legacy/register-systems-pc'),
  () => import('../../../lab.js'),
  () => import('../legacy/register-atlas'),
  () => import('../legacy/register-campaign-engine'),
  () => import('../legacy/register-effects'),
  () => import('../../../campaign.js'),
  () => import('../legacy/register-systems-engine'),
  () => import('../legacy/register-project-kit'),
  () => import('../../../systems.js'),
  () => import('../../../app.js'),
];

export const legacyViews: BootStage = {
  name: 'legacyViews',
  async run() {
    for (const load of LEGACY_MODULES) await load();
    const { startApp } = await import('../../../app.js');
    startApp();
  },
};
```

```ts
// qa/e2e/pages/shell.ts (F1): goto waits for the first view or the gate's error, not its loading state
async goto(url: string): Promise<void> {
  await this.page.goto(url);
  await this.page.locator('#main > :not([data-content-gate="loading"])').first().waitFor();
}
```

```ts
// frontend/src/app/legacy/register-catalogs.ts (el resto del archivo, igual)
import { getContent } from '../content/content';
// ...
const content = getContent();
window.GUIDE_DATA = content.guide;
window.RUST_LAB = content.lab.rust;
window.GO_LAB = content.lab.go;
window.RUST_QUESTS = content.quests.rust;
window.GO_QUESTS = content.quests.go;
window.RUST_CAMPAIGN = content.campaign.rust;
window.GO_CAMPAIGN = content.campaign.go;
```

## 6. Oráculos, tamaño y E2E (onda 3)

**Cubre:** FR-014, FR-015, FR-018, FR-024; SC-001 a SC-004 y SC-007; US1 a US3.

### Tarea 6.1 · El check del bundle construido (T009, dueño Q)

- **Crea** `qa/dist-content-check.ts`. **Cambia** `qa/lib/built-page.ts` (suma `evaluateBuiltPage`). **Borra** `tools/content/dump-dist-globals.ts`. El coordinador agrega el check a `qa/run-checks.ts` al integrar.
- **Entrega:** el oráculo de Q3: las tres igualdades de FR-018 sobre `dist/`.
- **Pasos:**
  1. Escribir el check (abajo) con sus aserciones y correrlo sobre el build de T008: tiene que pasar. Una prueba de un oráculo se muestra con mutaciones, hechas a mano y descartadas:
     - la compuerta descarta una porción (`quests.go`) antes de publicar: falla la igualdad de las 17 huellas;
     - un byte cambiado en `dist/content/curriculum.<versión>.json`: falla el sha256;
     - un adaptador que publica un global distinto: falla la igualdad con `dump-globals`;
     - la compuerta no despacha el evento: el check falla porque no hay publicación observable.
  2. Retirar `dump-dist-globals.ts` en el mismo commit, y sus menciones.
- **Resumen del check** (sin ejecutar; con el mecanismo y el desvío de [research.md](./research.md), R9):
  - se relanza con `--experimental-vm-modules --disable-warning=ExperimentalWarning` si `vm.SourceTextModule` no existe;
  - los esperados salen del generador: `build/curriculum.meta.json` (`documentHash`, `portions`) y `portionsOf` y `sha256Hex` de `tools/content/meta.ts` para proyectar el contenido publicado en sus 17 porciones;
  - lee la página con `readBuiltPage()`, exige un solo script de arranque (hoy) y lo evalúa con `evaluateBuiltPage(page, harness.context)` en el contexto de `createBootHarness({ fetch: createContentServer([...]) })`; después, `await harness.flush()`. El contexto necesita el stub de `MutationObserver` que suma T007: el polyfill de precarga de Vite corre al principio del script y, sin él, el módulo lanza `ReferenceError`. `Event` y `dispatchEvent` los usa el ayudante de precarga, que despacha `vite:preloadError` si un módulo de la cadena lanza (research.md, «Resultados del spike», P2);
  - exige: `harness.errors` vacío; un solo evento de publicación; un solo pedido de contenido, a `/content/curriculum.<versión>.json`;
  - **(2) bytes servidos:** el sha256 de los bytes que sirvió el simulador, leídos con `readBuiltContent()`, es el `documentHash` del meta;
  - **(3) las 17 porciones:** con `portionsOf(published)`, `sha256Hex(JSON.stringify(parte))` de cada una es su huella de `portions`;
  - **(1) los globals:** los `window.*` que coinciden con `/^(GUIDE_DATA|RUST_|GO_|SYSTEMS_)/`, con las funciones como `'[function]'`, ordenados por nombre, son iguales a `globals` del volcado de `node tools/content/dump-globals.ts <raíz>` (se corre con `execFileSync`).

- **`evaluateBuiltPage`**, que suma `qa/lib/built-page.ts` (probado con un módulo de prueba en Node 24.21 y el relanzamiento):

```ts
import vm from 'node:vm';

// Needs `node --experimental-vm-modules`: dist-content-check relaunches itself with it.
export async function evaluateBuiltPage(page: BuiltPage, context: vm.Context): Promise<void> {
  for (const script of page.scripts) {
    const module = new vm.SourceTextModule(script.source, {
      context,
      identifier: script.name,
      initializeImportMeta(meta) {
        meta.url = 'http://taller.test/';
      },
      importModuleDynamically() {
        throw new Error('la salida usa import() dinámico real: la compuerta no lo espera');
      },
    });
    await module.link(() => {
      throw new Error(`${script.name} importa otro archivo: lo resuelve evaluateBuiltPage`);
    });
    await module.evaluate();
  }
}
```

### Tarea 6.2 · `build-check`: el HTML sin currículo y el tope medido (T010, dueño C)

- **Cambia** `qa/build-check.ts`.
- **Entrega:** FR-015 completo.
- **Pasos:**
  1. `build-check` lee la página con `readBuiltPage()` y `readBuiltContent()`, no con su propio `matchAll`, y agrupa lo que sólo vale con `vite-plugin-singlefile` (un `<script>`, un `<style>`, ningún enlace ni script externo y ningún `modulepreload`) en una función, `assertSinglefileDocument(page)`, que C4 reemplaza. Las aserciones nuevas: cada script de `page.scripts` parsea como módulo (`node --check` sobre un `.mjs` temporal en lugar de `new vm.Script`); `page.bootSize < tope`, con el tope de T001, 1.250.000; las licencias se buscan en `page.bootText`; ningún marcador del currículo está en `page.bootText` y todos están en el archivo servido; `page.bootText` contiene la versión; el artefacto de T006 sigue exigido.
  2. Con el build de T008 pasan. El tope baja de 2.500.000 a 1.250.000: es `piso(1.136.706 × 1,10)` redondeado hacia abajo a la decena de miles, con el `html.length` que midió T001 sobre el prototipo, sin las marcas del spike (P3). T010 vuelve a medir el `html.length` sobre el build de T008 con la misma fórmula, y el commit escribe el valor y la medida que lo respalda.
  3. **Mutación**, descartada, que es la prueba de que el oráculo detecta algo: un import estático del JSON desde una página (`import c from '../../../build/curriculum.json'` en un módulo alcanzado) hace fallar el check por el tope y por los marcadores (US3, escenario 3).
- **Marcadores** (research.md, R11): salen de `curriculumMarkers()` (T005), que fija la regla y que C4 reutiliza: por cada familia, los dos textos más largos de la primera entrada que los tenga (al menos 24 caracteres, ASCII imprimible sin comillas ni barras, y no enlaces) y su `id` si es igual de plano, descartando los que aparecen en las fuentes de `frontend/`. El helper falla si una familia no tiene una entrada así.

### Tarea 6.3 · Los E2E de A2 (T011, dueño E)

- **Crea** el archivo de specs de A2 en `qa/e2e/` (`content-gate.spec.ts`, o el nombre que siga la convención de F1) y suma al Page Object del shell la región del error y el botón, en `qa/e2e/pages/shell.ts`. La espera de `goto` ya la cambió el corte (T008).
- **Entrega:** los escenarios de [research.md](./research.md) (R13) sobre el build servido por `vite preview`.
- **Pasos:**
  1. Escribir los escenarios. Con el build de T008 pasan; la prueba de que detectan algo es una mutación, descartada: un build con el nombre del archivo mal construido (por ejemplo, otra versión en la constante) tiene que hacerlos fallar.
  2. Los casos:
     - los cinco enlaces profundos de la User Story 1 y la recarga completa, con un solo pedido de contenido por carga;
     - las fallas (red, 404, 500, cuerpo roto, porción ausente y porción con otra forma, y el tope con `page.clock.fastForward(20000)`; como `shell.goto` espera la primera vista o el error, y en el tope el error recién aparece al adelantar el reloj, ese escenario navega con `page.goto`) con el progreso de `qa/fixtures/progress-master-2a278ad-storage.json` sembrado: las cuatro claves no cambian, no hay `:respaldo` y un espía de `Storage.prototype` cuenta 0 lecturas y 0 escrituras;
     - el reintento: el primer pedido falla y el segundo pasa, el arranque sigue sin recargar;
     - el teclado: el foco queda en «Reintentar» y Enter lo opera;
     - el móvil: `test.use({ viewport: { width: 390, height: 844 } })`.
  3. Si F1 hace fallar el test con un `console.error`, cada escenario de falla declara la entrada «Failed to load resource» de su pedido y nada más.
  4. `npm run build && npm run test:e2e` en verde, cinco veces seguidas sin reintentos (el criterio de F1).
- **Ejemplo** (sin ejecutar; `shell` es el fixture de F1 con el `ShellPage` de `qa/e2e/pages/shell.ts`, y `goto` recibe la URL):

```ts
test('shows the error with «Reintentar» focused when the content request is aborted', async ({ page, shell }) => {
  await page.route('**/content/curriculum.*.json', (route) => route.abort());
  await shell.goto('/');
  await expect(page.getByRole('alert')).toContainText('Tu progreso sigue guardado');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeFocused();
});
```

## 7. Cierre (coordinador, onda 4)

### Tarea 7.1 · La documentación (T012)

- **Cambia** los cinco documentos de «Documentación del FR-021», en un solo commit.
- **Pasos:** corregir cada pasaje; comprobar rutas, comandos y enlaces locales; `git diff --check`; `npm run format:check`.

### Tarea 7.2 · La compuerta final (T013)

- **Pasos:**
  1. `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check`, todos en verde (FR-024). Los recuentos son los de la base que midió T001 más lo que suma A2, y reemplazan a los de la spec (FR-003, FR-020, FR-024 y SC-005):
     - `qa/run-checks.ts`: los 31 checks de la base más `dist-content-check`;
     - Vitest: las 12 specs de la base, con sus 186 pruebas, más las 7 de A2;
     - `load-order-check`: las 16 restricciones de la base, sin relajar ninguna, más la de etapas, y las tres reglas: «`app.js` último», «`styles.css` primera» y «`startApp()` exactamente una vez, después del último `import()`»;
     - `boot-check`: los 14 casos de la base, con sus valores esperados, más los de FR-020;
     - `build-check`: el HTML por debajo del tope de 1.250.000 caracteres;
     - `npm run test:e2e`: las 106 pruebas de F1 más las de A2.
  2. **Los oráculos:** `node tools/content/dump-globals.ts . | sha256` da el hash de T002 (SC-001), y lo mismo sobre la raíz de un commit anterior a A2 (`git worktree add <dir> <commit>`, con `ln -s "$PWD/node_modules" <dir>/node_modules` y `npm run curriculum` adentro: el volcado resuelve esbuild desde esa raíz; FR-017).
  3. **Dependencias:** `git diff <base> -- package.json package-lock.json` vacío (FR-022, SC-006). **Vistas legacy:** `git diff --stat <base>` sin ningún `frontend/*.js` (FR-023). **Scripts en línea:** `frontend/src/index.html` sin cambios.
  4. **Docker, con permiso** (el único paso que lo usa; las imágenes ya están en la máquina, `--pull never`):
     - `docker compose up --build -d --wait`, y `curl -s http://localhost:8080/content/curriculum.<versión>.json | sha256` da el `documentHash` (SC-002, también con `--compressed`);
     - el HTML de un build anterior contra el contenido de otro: Nginx responde 404 y la página muestra el mensaje de versión (R3);
     - `curl -sI http://localhost:8080/THIRD-PARTY-NOTICES.txt` y `curl -sI http://localhost:8080/EDITOR-LICENSES.txt` dan 200: los avisos se sirven en las mismas URL que antes;
     - `docker compose -f docker/compose.preview.yaml up --build -d --wait` sirve el HTML, el contenido y los avisos de licencia en el puerto 8765 (cuidado: ese nombre de proyecto y ese puerto son del checkout principal; no correrlo desde otro worktree sin cambiarlos).
  5. **Tiempo hasta la primera vista, antes y después**, con y sin caché del navegador (R13). T013 mide el build de A2 intercalado con uno de la base (`c5d497d`), en series alternadas, con el método de T001 ([quickstart.md](./quickstart.md), §9). No se compara con las cifras de T001: se tomaron mientras corrían las pruebas de otro agente y sirven de orden de magnitud.
  6. Registrar la evidencia en la hoja de ruta (el coordinador): PR, commit y lo que se ejecutó; lo que no se pudo verificar, escrito.

## Contrato de salida hacia A3 y C4

A2 es un puente. Esta sección fija cómo se retira y qué cambia C4, para que ninguno de los dos reescriba la compuerta ni los checks.

**Lo que A3 retira del puente, también de la imagen web:**

| Dónde | Qué se retira | Cómo se comprueba |
| --- | --- | --- |
| La imagen web | Nada que borrar en `frontend/Dockerfile`: copia `dist/` entero, así que cuando el build deja de emitir `content/` la imagen deja de llevarlo | `/usr/share/nginx/html/content/` no existe en la imagen y el pedido de `/content/curriculum.<versión>.json` da 404. Las rutas conocidas del puente son `/content/` y ese nombre; `build/curriculum.json` y su meta nunca están en la imagen, porque sólo se copia `dist/`. C4 lo vigila (FR-022 de su spec, en la rama `spec/c4-exposicion`) |
| El build | Del plugin de `frontend/vite.config.ts`, el archivo de contenido emitido, el middleware de `npm run dev` y `__CONTENT_VERSION__` (los avisos de licencia se quedan) | `dist/` no tiene `content/` |
| La vista previa | Nada: monta `dist/` entero | `dist/` ya no trae `content/` |
| El front | `createStaticContentSource` y su spec, y el cableado de `content-stage.ts`, que pasa a la fuente de la API | Ningún archivo de `frontend/src/` nombra `static-content-source` |
| `qa/` | `readBuiltContent` de `qa/lib/built-page.ts`, la exigencia del artefacto de `build-check` y la parte de los bytes servidos de `dist-content-check` | `build-check` exige que `dist/content/` no exista. Se quedan el oráculo de ausencia, el tope y las 17 huellas |

**Lo que A2 deja listo para A3:** `ContentSource` (A3 escribe su `apiContentSource` en `shared/api/content/`), `content-stage.ts` (un solo lugar para cambiar la fuente), la compuerta y su vista (no cambian), el evento y la secuencia de etapas (la sesión de A3 y el acceso de F11 entran antes de `contentGate`).

**Lo que C4 cambia, y sólo eso:**
- `qa/lib/built-page.ts`: `readBuiltPage` (los scripts de arranque pasan a ser los archivos que enlaza el HTML) y `evaluateBuiltPage` (resuelve los `import` entre archivos del `dist/`);
- `assertSinglefileDocument` de `qa/build-check.ts`, que C4 reemplaza por la comprobación de sus archivos;
- `frontend/vite.config.ts` (el plugin de singlefile) y `docker/nginx/nginx.conf`, para servir los archivos con la CSP nueva. El `Dockerfile` y la vista previa ya copian y montan `dist/` entero.

**Lo que C4 reutiliza de A2:**
- `curriculumMarkers()` de `qa/lib/content-document.ts`: los marcadores del currículo que A2 fija. C4 los busca en `/usr/share/nginx/html` de la imagen (su FR-022). Su FR-022 los describe como «un ID, un título y una pista por familia»; con esta regla pasa a ser «los de `curriculumMarkers()`: dos textos largos de una entrada y, si no es una palabra común del código, su ID».
- Las rutas del puente que el Nginx público tiene que responder con 404 cuando A3 lo retire: `/content/` y `/content/curriculum.<versión>.json` (la versión sale de `contentVersion()`, del mismo módulo).

**La CSP de C4 (sin `'unsafe-inline'`).** A2 no suma scripts ni estilos en línea. La compuerta vive en el módulo que Vite ya emite, hoy en línea por singlefile y, con C4, en un archivo; el botón usa `addEventListener`; el marcado no lleva manejadores ni `style=`; y el pedido del contenido es del mismo origen (`connect-src 'self'`, que no cambia). C4 no tiene que reemplazar nada de la compuerta: lo único en línea es el script que genera Vite, que sale de la página cuando se retira singlefile.

## Documentación del FR-021

La edita T012. Hoy llaman «autónomo» al HTML o describen cómo se carga el contenido:

| Archivo | Pasaje | Qué dice después |
| --- | --- | --- |
| `README.md` | «También podés abrir `dist/index.html`, que es autónomo; algunos navegadores restringen…» (cerca de la línea 145) | Que `dist/index.html` ya no es autónomo: pide el contenido a `dist/content/` del mismo origen y, abierto desde un archivo, muestra el aviso de que no pudo cargarlo; que se sirve con Docker o `npm run preview` |
| `README.md` | «Vite … empaqueta estilos, datos, editor y aplicación en el documento autónomo `dist/index.html`» (cerca de la 185) | Que empaqueta estilos, editor y aplicación en `dist/index.html` y deja el currículo junto a él, en `dist/content/` |
| `README.md` | «Comprueban paquete autónomo y orden de carga» (cerca de la 229) | Que comprueban el documento y su contenido, y el orden de arranque |
| `README.md` | «`frontend/src/app/` (entrada y adaptadores legacy, que publican los catálogos de `build/curriculum.json`)» (cerca de la línea 187) | Que los adaptadores publican los catálogos del contenido que carga la compuerta de arranque |
| `README.md` | La vista previa «con el archivo montado en modo lectura» (cerca de la 280) | Que monta `dist/` entero, con el HTML, el contenido y los avisos de licencia |
| `AGENTS.md` | «Vite construye un HTML autónomo y Nginx lo sirve» (línea 7) | Que Vite construye un HTML y su contenido, y Nginx los sirve |
| `AGENTS.md` | `build/curriculum.json` «que importan los adaptadores … y el Atlas (`…/atlas-catalog.ts`)» (líneas 36 a 41) | Que lo copia el build a `dist/content/` y lo lee la compuerta de arranque (`frontend/src/app/boot/`) |
| `AGENTS.md` | «Vite empaqueta … `build/curriculum.json` en `dist/index.html`» y «`vite-plugin-singlefile` conserva el contrato de un documento autónomo» (líneas 63 a 67) | Que el currículo ya no va en el HTML y que singlefile conserva un solo documento de código y estilos hasta C4 |
| `AGENTS.md` | «Para servir `dist/index.html` generado en el host como preview» (línea 76) | Que la vista previa monta `dist/` entero, con el HTML, el contenido y los avisos de licencia |
| `docs/architecture.md` | Filas «Documento, entrada ESM y adaptadores legacy», «Catálogos de contenido», «Atlas migrado», «Catálogos de Sistemas», «Construcción y dependencias» y «Servicio web, API y preview» (líneas 12, 18, 25, 34, 39 y 40) | Suma `frontend/src/app/boot/` y `content/`, `getContent()`, el plugin de `vite.config.ts` y el contenido junto al HTML |
| `docs/architecture.md` | «`frontend/src/app/main.tsx` define temporalmente el orden de los imports legacy» (línea 58) | Que la secuencia de etapas está en `main.tsx` y el orden de la cadena legacy, en `legacy-views.ts` |
| `docs/architecture.md` | «La salida autónoma `dist/index.html` es un contrato actual…» (línea 73) | El contrato nuevo: el HTML y `dist/content/curriculum.<versión>.json`, que A3 retira; el cambio de entrega ya está hecho en Docker, Nginx, QA y README |
| `qa/AGENTS.md` | `dump-dist-globals.ts` (líneas 19 a 22); «deja el documento autónomo» (línea 50); las filas «Empaquetado, assets u orden de carga» y «Arranque, adaptadores…» de la tabla; los pasajes de `boot-check` y `load-order-check` (líneas 104 a 109); y los de `qa/lib/sources.ts` y de cómo se publican los catálogos (líneas 5 a 19) | `qa/dist-content-check.ts` en lugar del oráculo retirado; `withContent` y el fixture; que `load-order-check` lee la secuencia de etapas y `legacy-views.ts` |
| `docs/refactor-roadmap.md` | «Tamaño del documento autónomo» (en «Riesgos») | Las cifras medidas por T001 y que el contenido ya no va en el HTML |

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T004, T007, T008, T011 |
| FR-002 | T005, T008, T009 |
| FR-003 | T007, T008 |
| FR-004 | T006, T008 |
| FR-005 | T008, T010 |
| FR-006 | T004, T008 |
| FR-007 | T003, T004, T007, T011 |
| FR-008 | T004, T007, T011 |
| FR-009 | T004, T007, T011 |
| FR-010 | T004, T011 |
| FR-011 | T003, T004, T006 |
| FR-012 | T003, T004 |
| FR-013 | T004, T007, T008 |
| FR-014 | T006, T010 |
| FR-015 | T006, T010 |
| FR-016 | T006, T013 |
| FR-017 | T002, T005, T013 |
| FR-018 | T009 |
| FR-019 | T005 |
| FR-020 | T007 |
| FR-021 | T012 |
| FR-022 | T013 |
| FR-023 | T008, T013 |
| FR-024 | T011, T013 |
| FR-025 | T004, T007, T009 |
| SC-001 | T008, T009, T013 |
| SC-002 | T009, T013 |
| SC-003 | T010 |
| SC-004 | T003, T004, T007, T011 |
| SC-005 | T013 |
| SC-006 | T013 |
| SC-007 | T001, T011, T013 |
| SC-008 | T001 |

## Descargas y permisos

- **Ninguna dependencia nueva** (FR-022): `package.json` y `package-lock.json` no cambian. Si falta `node_modules`, `npm ci` instala el lockfile y pide permiso.
- **Vitest y Playwright** los instala F1, con sus propios permisos. El navegador de Playwright lo baja F1.
- **Docker** (T006 y T013) usa las imágenes que ya están (`--pull never`) y se corre con permiso.

## Riesgos y lo que quedó sin verificar

- **P1 pasó en T001**, con la cadena real (research.md, «Resultados del spike»): la técnica ya no es una hipótesis.
- **F1 y F2 no están entregadas.** F1 y las unidades 1 a 4 de F2a están en la base de T001, `c5d497d`, que todavía no está en `master`. Lo que A2 supone de ellas es el cuadro de arriba: T001 lo contrastó con esa base, y lo que difirió (dónde se llama `startApp()`, la espera de `goto` y el arnés) ya está corregido en este plan.
- **El plugin de Vite corrió en el prototipo de T001:** `npm run build` emitió el contenido y los dos avisos de licencia, y `vite-plugin-singlefile` dejó los activos emitidos como archivos (research.md, «Resultados del spike», P1). T006 lo prueba en la rama.
- **`SourceTextModule` sobre la salida de Vite.** T001 lo probó sobre la salida real y no hace falta el desvío de R9 (research.md, «Resultados del spike», P2). Sigue siendo una API experimental.
- **Lo que el spike no corrió:** la regla de `startApp()` de `load-order-check` sobre `legacy-views.ts` (la prueba es una mutación de T008) y los tres casos de `boot-check` que sacan la llamada, con su procedimiento nuevo y `main.tsx` de hoy (T007, paso 2).
- **Docker, la vista previa y Nginx sin correr:** el `COPY` de `dist/`, el montaje entero y el 404 ante un nombre ajeno se prueban en T013. `vite preview` responde con `index.html` ante un archivo que no existe, así que ahí un nombre equivocado da `body` y no `version`.
- **Los E2E dependen de dos decisiones de F1** (los errores de consola y el viewport). La de la consola está decidida e implementada: un `console.error` hace fallar el test salvo la lista blanca. El viewport sigue siendo de escritorio, y T011 pide el móvil con `test.use`.
- **Los marcadores del oráculo de ausencia** pueden coincidir con texto del código (IDs). La regla los descarta, y la mutación de T010 muestra que el oráculo detecta el contenido de verdad.
- **Los avisos de licencia salen del build.** Cambia cómo se entregan (antes, el `Dockerfile` los copiaba de `frontend/`), no sus nombres ni sus URL. `build-check` (T006) y Docker (T013) lo comprueban; sin eso, la vista previa los perdería.
- **C4 cambia el dist.** Con varios archivos, lo que cambia son las aserciones de singlefile de `build-check` y `evaluateBuiltPage` (los `import` entre archivos en el vm). Está aislado en `qa/lib/built-page.ts` y en `assertSinglefileDocument` (ver «Contrato de salida hacia A3 y C4»). No se probó con chunks.
- **El tope medido** de `build-check` es 1.250.000: T001 midió 1.136.706 caracteres de HTML sin el currículo (P3), y T010 lo vuelve a medir sobre el build de T008.
- **El contenido sin sesión** mientras exista el documento estático (riesgo 11 de la spec): lo cierra A3, que retira el documento. La hoja de ruta todavía no lo anota en el alcance de A3.
- **El trabajo descartable** es el de «Lo que A3 retira» ([research.md](./research.md), R14): la fuente estática, el plugin y los montajes. La compuerta, los estados, el almacén y los oráculos se quedan.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
