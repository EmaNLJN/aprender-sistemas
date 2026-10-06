# Implementation Plan: F1 · Red de seguridad del port del front

**Branch**: `003-f1-red-de-seguridad` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-f1-red-de-seguridad/spec.md`. Decisiones y mediciones: [research.md](./research.md). Contratos y valores esperados: [data-model.md](./data-model.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño, las «Reglas para todos los agentes» y los contratos de [data-model.md](./data-model.md). `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Código verificado.** Se planificó sin tocar el repositorio ni bajar nada:
>
> - **Cómo:** en una copia aparte de `spec/front-react` (sobre `ec4d829`), fuera del repositorio. La copia usó los paquetes que el coordinador instaló en el worktree de F1, por un enlace a su `node_modules`, y el Chrome Headless Shell que ya estaba en la caché de Playwright.
> - **Qué corrió de verdad:** la red completa (106 pruebas en 8 specs), en verde y cinco veces seguidas con `--retries=0` (530 de 530); las dos specs de Vitest (3 pruebas); `tsc`, `eslint` y `prettier` sobre los archivos nuevos y sobre el repositorio; `npm test` con los scripts nuevos; 31 roturas deliberadas del código de producción, cada una detectada por la spec que dice el plan (ver [quickstart.md](./quickstart.md)); y el mensaje de «falta `dist/index.html`».
> - **Qué no corrió:** el job de la CI (sólo se comprobó que el YAML se lee), la descarga y el tiempo de instalación del navegador, la imagen web de Docker, macOS y los otros navegadores. Los tiempos que cita el plan son los de la máquina local.

## Summary

F1 deja, antes de portar la primera vista, una red que describe lo que el front hace hoy. No cambia ningún archivo de producción. El enfoque:

- **Una red de punta a punta contra el build servido.** Playwright Test corre en el Chrome Headless Shell contra el `dist/` que sirve `vite preview`, sin Nginx ni API. Son 106 pruebas: las ocho vistas por hash, las seis formas de URL con query, los 11 enlaces que cambian la query (los 11 recargan el documento), el arranque con el progreso real de master y con el almacenamiento bloqueado, los puentes del laboratorio con campaña y Sistemas, el ciclo con el compilador simulado y el aspecto que F2 mueve entre hojas y el que dejaría de verse al borrar una.
- **Dos guardas en todas las pruebas.** Una excepción de la página, un `console.error` o un pedido fuera del servidor de pruebas hacen fallar el test, salvo lo que esté en una lista blanca o que el propio test espere con su motivo. Las guardas tienen su propia prueba, que falla si dejan de actuar.
- **Los valores esperados salen de afuera del código que se prueba:** las fixtures congeladas de `qa/fixtures/`, el README y el mapa para las URL, el formato del marcador del arnés (ADR 0003) y las hojas de estilo para el CSS.
- **Dos specs de Vitest** caracterizan los dos riesgos altos del mapa. Están en verde y marcadas como defecto conocido; F2 las cambia a propósito.
- **Cada prueba nace en verde y se prueba con una rotura.** La red describe lo que hay, así que ninguna prueba puede fallar antes de existir. La prueba de que detecta algo es una mutación del código de producción en una copia de trabajo, que no se commitea. Cada tarea trae las suyas.

## Technical Context

**Language/Version**: TypeScript como ES modules sobre Node 24.21.0, igual que `qa/` y las configuraciones.

**Primary Dependencies**: `vitest` 5.0.3 y `@playwright/test` 1.63.0, con el Chrome Headless Shell 153.0.8010.12 (19 paquetes de npm y 122,2 MB de navegador, autorizados por el usuario el 2026-10-05). Nada más: ni `jsdom`, ni Testing Library, ni `fishery`.

**Storage**: no aplica. La red siembra y lee el `localStorage` del navegador que prueba, y lee las fixtures congeladas de `qa/fixtures/` sin escribirlas.

**Testing**: `npm run test:e2e` (106 pruebas en 8 specs, contra un build existente), `npm run test:unit` (2 specs, 3 pruebas) y los 30 checks de `qa/`, que `npm test` sigue corriendo junto con Vitest.

**Target Platform**: Linux, local y en `ubuntu-24.04` de la CI. Se escribió portable a macOS (`ControlOrMeta`, sin comandos de shell específicos y con valores de CSS que no dependen de las fuentes); no se corrió ahí.

**Project Type**: aplicación web (el front, con vistas legacy y React). Es infraestructura de pruebas.

**Performance Goals**: ninguna. SC-007 pide medir sin fijar un tope. En la máquina local la suite tardó unos 12 s con 8 workers y unos 35 s con uno (106 pruebas).

**Constraints**:

- ningún archivo de producción cambia (FR-022);
- ninguna prueba toca un servicio público (FR-009);
- cinco corridas seguidas sin reintentos (SC-007);
- `npm test` sigue sin navegador, porque la imagen web lo corre y no lo tiene.

**Scale/Scope**: 106 pruebas de punta a punta en 8 specs y 2 specs de Vitest. Se crean 29 archivos (26 en `qa/e2e/` y 3 de Vitest) y cambian 9 de configuración y documentación.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `AGENTS.md` y `qa/AGENTS.md`. T013 reemplaza el aviso «no existen» por los comandos reales y no copia reglas a otro lado. |
| II. TDD y pruebas útiles | Sí, con una adaptación | Una prueba que describe lo que hay nace en verde: su prueba de sensibilidad es una rotura deliberada del código de producción (31 verificadas al planificar). Las guardas sí empiezan por una prueba que falla («Expected to fail, but passed»). Los valores esperados salen del contrato, de las fixtures congeladas, del formato del marcador y de las hojas, nunca del código que se prueba. |
| III. Código entendible | Sí | Page Objects chicos con intención de alumno. Las tablas (los enlaces, el CSS) son datos y no ramas. `css-contract.spec.ts` es el archivo más largo (unas 380 líneas) y tiene una sola responsabilidad. `npm run lint` no da avisos de complejidad en los archivos nuevos. |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | Los IDs y los títulos salen de `qa/fixtures/curriculum-ids.json`, y las fixtures de progreso se leen sin escribirlas. No cambia el contenido. |
| V. Capas y contratos explícitos | Sí | La red es una caja negra: no importa código de producción (tsconfig aparte) y entra por la URL, el DOM accesible, `localStorage` y la red. Las dos specs de Vitest importan sólo APIs de capas inferiores o de su propio slice. No hay frameworks ni dependencias fuera del ADR 0008, que ya aceptó el usuario. |
| VI. Español, accesibilidad y portabilidad | Sí | Documentación en español; código y pruebas en inglés, con la copia de la interfaz en español. F1 pone bajo prueba el movimiento reducido y los anchos de 981 a 590 px. `ControlOrMeta` y los puertos por variable de entorno sostienen Linux y macOS. |
| VII. Secretos y salidas generadas fuera de Git | Sí | `test-results/` y `playwright-report/` ya están en `.gitignore`, `.dockerignore` y `.prettierignore`, y el caché de Vitest va a `node_modules/.vite`. El lockfile se sincroniza en T001. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. Lo que falte lo agrega `/speckit-converge` al final; al entregar, el directorio queda inmutable. |

## Project Structure

### Documentation (this feature)

```text
specs/003-f1-red-de-seguridad/
├── spec.md              # qué y por qué, con el clarify del 2026-10-05
├── research.md          # decisiones, mediciones y cómo se verificó
├── data-model.md        # contratos: fixtures, Page Objects, URL, enlaces, CSS y defectos conocidos
├── quickstart.md        # escenarios de validación con sus comandos
├── plan.md              # este archivo: cómo, repartido en dueños
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

No hay `contracts/`: F1 no expone ninguna interfaz externa. Los contratos que la red fija (las URL, los enlaces, el CSS) son datos de prueba y están en `data-model.md`.

### Source Code (repository root)

```text
qa/e2e/                                    (nuevo)
├── playwright.config.ts
├── tsconfig.json
├── lib/        curriculum, urls, compiler-results, console-allowlist, document-marker, computed-style
├── fixtures/   index, page-issues, strict-network, compiler-double, storage-control
├── pages/      shell, lab, campaign, systems, atlas
└── specs/      guards, views, url-contract, reload, bridges, cycle, startup-storage, css-contract
frontend/
├── vitest.config.ts                                          (nuevo)
└── src/
    ├── app/engine-init-order.spec.ts                         (nuevo)
    └── entities/guide/model/route-store-instances.spec.ts    (nuevo)
package.json  package-lock.json  tsconfig.node.json  tsconfig.qa.json    (cambian)
.github/workflows/ci.yml                                                 (cambia)
AGENTS.md  qa/AGENTS.md  docs/agent-skills.md                            (cambian: dejan de decir «no existen»)
docs/adr/0008-pruebas-del-front.md                                       (cambia: suma su «Enmienda»)
test-results/  playwright-report/                                        (salidas, ignoradas)
```

**Structure Decision:** la red vive en `qa/e2e/`, como fija el ADR 0008 (`qa/` es transversal e incluye los checks de punta a punta), con su propio `tsconfig.json`. Las specs de Vitest viven junto al módulo que prueban. No se crea ninguna capa ni carpeta vacía.

## Seams under test

La skill `tdd` pide acordar con el usuario los seams antes de escribir una prueba. Son estos, y el usuario los fijó en el clarify (Q1 a Q5):

- **El navegador, por fuera:** la URL (qué lee y qué escribe), el DOM accesible (roles, etiquetas y texto), `localStorage` (qué escribe y cuándo) y la red (qué pide y a qué host). La red no mira dentro de ningún módulo.
- **`openVersionedStore` con `mergeRouteProgress`:** lo que pasa cuando dos instancias comparten un almacenamiento.
- **`createCampaignEngine` y `createSystemsEngine`:** lo que devuelven sus métodos públicos antes de `init`.
- **Las hojas de estilo, por su valor computado:** las diez reglas que cruzan hojas.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **Producción intacta.** `git diff --name-only <base>..HEAD` no lista `frontend/*.js`, `frontend/*.css`, nada de `frontend/src/` que no sea una de las dos specs, ni `content/`, `docker/`, `backend/` o `frontend/Dockerfile` (el comando está en T016).
- **Valores esperados de afuera.** Las URL están escritas a mano en `lib/urls.ts`, a partir del README y del mapa. Los IDs y los títulos salen de las fixtures congeladas, que sólo se leen. Los resultados del compilador están armados a mano y no pasan por `buildProgram`. Los valores de CSS son los de las hojas: cada prueba nombra la regla y la hoja.
- **Las guardas.** `page-issues.ts` y `strict-network.ts` fallan al terminar el test, no al ocurrir el error, y `guards.spec.ts` usa `test.fail()` para probar que siguen actuando. Un `expectIssue` que no ocurre es un error.
- **Detección de la recarga.** Un cambio de URL no prueba una recarga: `observeReload` pone un marcador en `window`, espera `load` y mira si desapareció. Ninguna prueba espera por tiempo: no hay `waitForTimeout`.
- **Siembra del progreso.** `storage.seed` escribe una vez por pestaña (con una marca en `sessionStorage`) antes de que corra el primer script de la página. `watchWrites` se instala después, para no contar la siembra. Con el almacenamiento bloqueado, el acceso mismo lanza.
- **Aislamiento.** Cada prueba usa un contexto nuevo, así que nada del progreso pasa de una a otra. Las pruebas que cambian de idioma no comparten navegador.
- **Configuración.** `vite preview` escucha en `127.0.0.1`, el puerto sale de `E2E_PORT` y no se reutiliza un servidor ajeno. Hay un solo worker en la CI. El informe y los resultados van a la raíz, ignorados.
- **Defectos conocidos.** Cinco pruebas llevan `KNOWN DEFECT` y su referencia: tres de Vitest (los dos riesgos) y dos de la red. Una de las diez reglas de CSS es código muerto (R8): su prueba sólo ve un cambio de valor de la copia que gana. La décima (R10, `.quest-direct-lock`) no está en el mapa: la suma el plan.
- **La CI.** El orden de los pasos, el `id: e2e`, la condición del paso que sube el informe y los SHA fijados.

## Dónde el plan se aparta del ADR 0008

El ADR 0008 es decisión del usuario y se acepta como está. Al probarlo contra el build aparecieron nueve detalles que el ADR no fija o que no se sostienen tal cual; cada uno tiene su evidencia y su efecto, y los enmienda esta implementación (T002, T003, T004 y T012). T013 los anota en el ADR con una sección «Enmienda», como el ADR 0005 con el plan B1: no cambia ninguna decisión, sólo precisa nueve detalles.

| Qué | El ADR dice | El plan hace | Evidencia |
| --- | --- | --- | --- |
| Host del servidor | `webServer` levanta `npm run preview -- --port 4173 --strictPort` | Suma `--host 127.0.0.1` | Sin él, `vite preview` escucha sólo en `[::1]:4173` (`ss -ltn`) y `curl http://127.0.0.1:4173` no conecta. Playwright sondea `127.0.0.1` y termina con «Timed out waiting 60000ms from config.webServer». |
| Puerto y servidor ajeno | Puerto fijo 4173 | `E2E_PORT` (4173 por omisión) y `reuseExistingServer: false` | Dos worktrees en paralelo chocarían en el puerto, y reutilizar un servidor ajeno probaría el `dist/` de otro worktree. |
| Workers | No dice | `workers: 1` en la CI y los de Playwright por omisión en local | La guía de CI de Playwright recomienda uno en la CI, por estabilidad (consultada el 2026-10-05). Con uno, la suite tardó unos 32 s. |
| Import de la config de Vitest | `mergeConfig` con la config de Vite | `import viteConfig from './vite.config.ts'`, con extensión, y `allowImportingTsExtensions` en `tsconfig.node.json` | Sin la extensión, Vite avisa que su cargador nativo dejará de aceptarla. Con la extensión y sin el flag, `tsc` da TS5097. |
| Caché de Vitest | No dice | `cacheDir: ../node_modules/.vite` | La raíz de Vite es `frontend/src`: por omisión el caché caía en `frontend/src/node_modules/.vite`, que Git ignora pero `.dockerignore` no. |
| Proyectos y setup de Vitest | Dos proyectos (`node` y `jsdom`) y un setup dentro de `frontend/src/` | Un solo proyecto `node`, sin setup | `jsdom` y Testing Library llegan con la primera spec de componente (ADR, «Instalación por primer uso»): F3 pasa la config a `projects`. |
| Imports de `qa/e2e` | Los checks de `qa/` usan `.ts` explícito | Imports sin extensión, con su propio `tsconfig.json` (`Bundler`), y `tsconfig.qa.json` excluye `qa/e2e` | Bajo `tsconfig.qa.json` los archivos dan TS2835 y TS1294 (propiedades de parámetro). El ADR ya preveía un `tsconfig.json` propio. |
| Paso que sube el informe | `if: failure()` | `id: e2e` y `if: failure() && steps.e2e.outcome == 'failure'` | Con `failure()` solo, el paso también corre cuando falla `npm test` o `lint`, no encuentra informe y avisa en vano. |
| Pruebas de las guardas | No dice | `guards.spec.ts`, con `test.fail()` | Al apagar cada guarda, sus pruebas informan «Expected to fail, but passed» (verificado). |

Lo demás sigue el ADR: `forbidOnly` en la CI, un reintento en la CI y ninguno en local, traza en el primer reintento, informe y resultados sólo si el job falla, `pretest:unit`, el proyecto `chromium` con «Desktop Chrome» y el `upload-artifact` fijado por SHA (`043fb46d…`, la release v7.0.1, que se volvió a consultar con `gh api`).

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K, el coordinador | T001 (las dependencias y el navegador) y T002 (el esqueleto de la red) |
| 1 | B y V, a la vez | **B**: T003, las librerías, las fixtures, los Page Objects y las guardas. **V**: T004, la configuración de Vitest y las dos specs de riesgo |
| 2 | U, C, P y S, a la vez | **U**: T005 a T007. **C**: T008 y T009. **P**: T010. **S**: T011 |
| 3 | K | T012 a T016: los scripts y la CI, la documentación, las roturas deliberadas, las corridas y la compuerta |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| K · Coordinador | `package.json`, `package-lock.json`, `tsconfig.qa.json`, `qa/e2e/playwright.config.ts`, `qa/e2e/tsconfig.json`, `.github/workflows/ci.yml`, `AGENTS.md`, `qa/AGENTS.md`, `docs/agent-skills.md`, `docs/adr/0008-pruebas-del-front.md`; integra todo | todo | el esqueleto, los scripts, la CI, la documentación y la evidencia de cierre |
| B · Red base | `qa/e2e/lib/*`, `qa/e2e/fixtures/*`, `qa/e2e/pages/*` y `qa/e2e/specs/guards.spec.ts` | el esqueleto de K | las fixtures y los Page Objects de [data-model.md](./data-model.md), §1 y §2 (S1) |
| V · Vitest | `frontend/vitest.config.ts`, `tsconfig.node.json` y las dos specs de `frontend/src/` | — | las dos specs de riesgo, en verde |
| U · Enlaces | `views.spec.ts`, `url-contract.spec.ts` y `reload.spec.ts` | de B: `shell`, `lab`, `campaign`, `systems`, `atlas`, `urls`, `curriculum`, `observeReload` y `storage` | US1 (vistas, URL y recargas) |
| C · Puentes y ciclo | `bridges.spec.ts` y `cycle.spec.ts` | de B: `shell`, `lab`, `campaign`, `systems`, `compiler`, `compiler-results` y `storage` | US1 (puentes) y US3 |
| P · Progreso | `startup-storage.spec.ts` | de B: `storage`, `curriculum`, `shell`, `lab`, `campaign` y `systems` | US2 |
| S · Aspecto | `css-contract.spec.ts` | de B: `computed-style`, `compiler.hold`, `shell` y `systems` | US6 |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 y T002 integrados. B y V parten de ahí.
- **S1:** T003 integrado. U, C, P y S parten de ahí. V puede integrarse en cualquier momento antes de S2.
- **S2:** T004 a T011 integrados. K cierra.

**Puertos.** Cada dueño corre la red con su propio puerto, porque `vite preview` usa `--strictPort`: B `E2E_PORT=4174`, U `4175`, C `4176`, P `4177` y S `4178`. K usa el 4173.

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **El worktree de F1** ya tiene el commit de las dependencias (`feat/f1-red-de-seguridad`). T001 se integra desde ahí y no se rehace.
- **`package.json` y `.github/workflows/ci.yml`** los comparten otros frentes (C6 toca el job `api`). Los cambios de F1 son líneas aparte; K integra.
- **F2 depende de F1.** F2 cambia a propósito las dos specs de Vitest en su commit TDD, y los E2E tienen que pasar sin editarse (criterio de la hoja de ruta). Si un cambio de F2 rompe una prueba de la red, es un cambio de comportamiento y va aparte.
- **A3 y C3a (el ingreso).** Las pruebas arrancan siempre por `shell.goto` y `storage.seed`. Cuando el contenido quede detrás de la sesión, esos dos son los únicos lugares que cambian (spec, riesgo 9).

**Lo que otras specs toman de F1** (A2 lo verifica en su T001):

- **Vitest corre dentro de `npm test` y solo,** con `npm run test:unit` (T012).
- **Playwright sirve el `dist/` entero con `vite preview`,** no sólo `index.html`. Un archivo aparte como `dist/content/curriculum.<versión>.json` se sirve con su tipo y con `Cache-Control: no-cache` (verificado con un archivo de prueba). La guarda de red deja pasar cualquier pedido al mismo origen.
- **Los Page Objects viven en `qa/e2e/pages/`.**
- **Cuidado con los 404.** Un camino que no existe en `dist/` no da 404 con `vite preview`: responde `index.html` con 200 y `text/html`, a diferencia de Nginx (`try_files … =404`). Una prueba de «el contenido no responde» tiene que simularlo con `page.route`, no esperar un 404.
- **Errores de consola.** La guarda sólo mira `pageerror` y `console.error`; una advertencia (`console.warn`) o un aviso en pantalla no la activan. Si la compuerta de A2 emite un `console.error`, va a la lista blanca de `lib/console-allowlist.ts` (con su motivo) o a un `expectIssue` de la prueba.
- **El CSS que F2 mueve y la hoja que borra F6.** `css-contract.spec.ts` mide diez reglas y sus valores no pueden cambiar cuando F2 mueve nueve de ellas entre hojas (T011). La décima, `.quest-direct-lock` (R10), no está en el mapa y F2 la deja en `campaign.css`: F6 tiene que conservarla (por ejemplo, moviéndola a `lab.css`) hasta que F7 retire el bloque de bloqueo del laboratorio, y la prueba R10 falla si la regla desaparece.
- **El viewport.** El único proyecto es «Desktop Chrome». Cada prueba que necesita otro ancho lo pide con `page.setViewportSize` (así lo hace `css-contract.spec.ts`) o con `test.use({ viewport })`. No hay un proyecto móvil.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, [data-model.md](./data-model.md), [research.md](./research.md) y tu sección;
  - las skills `tdd`, `playwright-best-practices` y, quien toque Vitest, `vitest` y `react-testing` (de ésta, el límite entre Vitest y los E2E).
- **TDD de una red que describe lo que hay.** La spec nace en verde y su prueba es una rotura:
  1. Escribí la spec de tu tarea.
  2. Corrida contra el build actual, tiene que pasar. Si falla, el build o el contrato difieren de lo que dice el plan: pará e informá. No ajustes el valor esperado a lo que midió la prueba.
  3. Aplicá cada rotura de tu tarea en tu copia de trabajo, reconstruí (`npm run build`) y comprobá que falla por la razón que dice el plan.
  4. Deshacela con `git checkout -- <archivo>` y reconstruí. Una rotura no se commitea nunca.
  5. Corré `npx tsc --noEmit -p qa/e2e/tsconfig.json`, `npx eslint <archivos>` y `npx prettier --check <archivos>`.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita un método nuevo en un Page Object o algo de otro dueño, pedíselo al coordinador. Los contratos de [data-model.md](./data-model.md) alcanzan para todas las specs de este plan.
- **Producción intacta.** Ningún archivo de `frontend/*.js`, de las hojas, de `frontend/src/` (fuera de las dos specs), de `content/`, `docker/` o `backend/` cambia, ni siquiera para agregar un atributo de prueba.
- **Comandos.** Desde la raíz de tu worktree: `npm ci --offline` (usa la caché de npm del coordinador; si falla por falta de caché, pará y pedí permiso), `npm run build`, y `E2E_PORT=<tu puerto> npx playwright test --config qa/e2e/playwright.config.ts <spec>` hasta que K sume el script (T002 deja `npm run test:e2e`). El navegador está en la caché de Playwright de la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo de las pruebas.**
  - Código, nombres de test y comentarios, en inglés. Sólo los textos de la interfaz que se comprueban van en español.
  - Localizadores por rol, etiqueta o texto. Una clase o un id sólo entra dentro de un Page Object, para un elemento sin nombre accesible y con su comentario, salvo en `css-contract.spec.ts`, donde el selector de CSS es lo que se prueba.
  - Aserciones de Playwright que esperan (`expect(locator)…`), nunca `waitForTimeout` ni `networkidle`. El reloj se controla con `page.clock`.
  - Una prueba, un escenario, y ninguna depende de otra. Nada de snapshots.
  - Una prueba que fija un defecto conocido lleva `KNOWN DEFECT` y su referencia en el nombre.
- **Commits.** Chicos, en español, con prefijo Angular (`test(front): …`) y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la spec con lo que verifica. La evidencia de una tarea es su commit, y lo que midas (las roturas y su resultado) va en el mensaje.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, las roturas con lo que detectaron, lo que no pudiste verificar y cualquier desvío del plan.

## 1. Base (coordinador K, onda 0)

**Cubre:**

- las descargas autorizadas: FR-024;
- el esqueleto de la red: FR-001 y FR-019.

**Entrega:** las dependencias instaladas, un `npm run test:e2e` que falla con un mensaje claro si falta `dist/`, y un `typecheck` que ya compila `qa/e2e/` (S0).

### Tarea 1.1 · Dependencias y navegador (T001)

- **Cambia:** `package.json` (dos `devDependencies`, con versión exacta) y `package-lock.json`.
- **Entrega:** `vitest` 5.0.3 y `@playwright/test` 1.63.0 instalados (19 paquetes) y el Chrome Headless Shell en la caché de Playwright.

**Pasos:**

1. El usuario autorizó las descargas el 2026-10-05, con su nombre, su origen y su tamaño: `vitest` y `@playwright/test` del registro de npm (19 paquetes, unos 22,4 MB desempaquetados y 5,0 MB comprimidos, estimación) y el Chrome Headless Shell 153.0.8010.12 con ffmpeg del CDN de Playwright (122,2 MB). Las hace K y nadie más.
2. El commit de las dependencias ya existe en el worktree de F1 (`build(front): suma vitest 5.0.3 y @playwright/test 1.63.0 (F1, ADR 0008)`): suma `"@playwright/test": "1.63.0"` y `"vitest": "5.0.3"` a `devDependencies` y 297 líneas al lockfile. Se integra ese commit y no se rehace. Si hiciera falta: `npm install --save-exact --save-dev vitest@5.0.3 @playwright/test@1.63.0`.
3. El navegador: `npx playwright install --only-shell chromium`. Sin nombrar `chromium`, `--only-shell` instalaría también Firefox y WebKit (ADR 0008).

**Compuerta:** `npm ls vitest @playwright/test` muestra 5.0.3 y 1.63.0; `npm run build` y `npm test` siguen en verde; el lockfile sólo suma esos 19 paquetes.

**Vuelta atrás:** revertí el commit; nada depende todavía de él.

### Tarea 1.2 · El esqueleto de la red (T002)

- **Crea:** `qa/e2e/playwright.config.ts` y `qa/e2e/tsconfig.json`.
- **Cambia:** `tsconfig.qa.json` (excluye `qa/e2e`) y `package.json` (los scripts `test:e2e` y `test:e2e:install`, y `typecheck`).
- **Entrega:** `npm run test:e2e`, que corre contra el `dist/` construido y falla con un mensaje claro si falta; `npm run test:e2e:install`; y un `typecheck` que compila `qa/e2e/`.

**Pasos:**

1. Escribí la config y el `tsconfig.json` (código abajo) y los cambios de `tsconfig.qa.json` y de `package.json`.
2. Sin `dist/`, `npm run test:e2e` falla con «Falta dist/index.html: corré npm run build antes de npm run test:e2e.», que es la razón esperada (FR-019). Es la prueba de esta tarea.
3. `npm run build` y otra vez `npm run test:e2e`: Playwright informa «No tests found» (las trae T003). Esa salida es la esperada hasta entonces.
4. `npm run test:e2e:install -- --dry-run` imprime el Chrome Headless Shell 153.0.8010.12 y no baja nada. `npm run typecheck` pasa.
5. Un commit: `test(front): esqueleto de la red de punta a punta con Playwright`.

**Compuerta:** los pasos 2 a 4, más `npm test`, `npm run lint` y `npm run format:check` en verde.

**Vuelta atrás:** revertí el commit; nada depende todavía de él.

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const root = resolve(import.meta.dirname, '../..');
const port = Number(process.env.E2E_PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;

if (!existsSync(resolve(root, 'dist/index.html'))) {
  throw new Error('Falta dist/index.html: corré npm run build antes de npm run test:e2e.');
}

export default defineConfig({
  testDir: resolve(import.meta.dirname, 'specs'),
  outputDir: resolve(root, 'test-results'),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: resolve(root, 'playwright-report') }]]
    : 'list',
  use: {
    baseURL: origin,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: root,
    url: origin,
    reuseExistingServer: false,
  },
});
```

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

Los cambios de `package.json` y de `tsconfig.qa.json`:

```diff
   "scripts": {
-    "typecheck": "tsc --noEmit -p frontend/tsconfig.app.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.qa.json",
+    "typecheck": "tsc --noEmit -p frontend/tsconfig.app.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.qa.json && tsc --noEmit -p qa/e2e/tsconfig.json",
+    "test:e2e": "playwright test --config qa/e2e/playwright.config.ts",
+    "test:e2e:install": "playwright install --only-shell chromium",
```

```diff
-  "include": ["qa/**/*.ts", "tools/content/**/*.ts"]
+  "include": ["qa/**/*.ts", "tools/content/**/*.ts"],
+  "exclude": ["qa/e2e"]
```

El `webServer` corre `npm run preview`, que ejecuta `vite preview --config frontend/vite.config.ts` y sirve el `dist/` entero. La config lee `E2E_PORT` para que dos worktrees puedan correr la red a la vez.

## 2. Red base (dueño B, onda 1)

**Cubre:**

- las guardas de la red y los dobles: FR-009, FR-011 y FR-015;
- los Page Objects y las fixtures: FR-010.

**Entrega:** las fixtures y los Page Objects de [data-model.md](./data-model.md), §1 y §2, con `guards.spec.ts` en verde (S1). U, C, P y S escriben sus specs contra esos contratos.

### Tarea 2.1 · Librerías, fixtures, Page Objects y las guardas (T003)

- **Crea:**
  - en `qa/e2e/lib/`: `curriculum.ts`, `urls.ts`, `compiler-results.ts`, `console-allowlist.ts`, `document-marker.ts` y `computed-style.ts`;
  - en `qa/e2e/fixtures/`: `index.ts`, `page-issues.ts`, `strict-network.ts`, `compiler-double.ts` y `storage-control.ts`;
  - en `qa/e2e/pages/`: `shell.ts`, `lab.ts`, `campaign.ts`, `systems.ts` y `atlas.ts`;
  - `qa/e2e/specs/guards.spec.ts`.
- **Entrega:** las fixtures `pageIssues`, `strictNetwork`, `compiler`, `storage`, `shell`, `lab`, `campaign`, `systems` y `atlas`, con los métodos de [data-model.md](./data-model.md), y `test` y `expect` exportados desde `qa/e2e/fixtures/index.ts`.

**Pasos:**

1. Escribí `lib/curriculum.ts`, `lib/urls.ts`, `lib/compiler-results.ts`, `lib/console-allowlist.ts`, los cinco Page Objects y `fixtures/compiler-double.ts`, `fixtures/storage-control.ts` y `fixtures/index.ts`. Escribí `fixtures/page-issues.ts` y `fixtures/strict-network.ts` con `assertClean()` y `assertNothingBlocked()` vacíos. Escribí `guards.spec.ts`.
2. `npx playwright test --config qa/e2e/playwright.config.ts guards` falla en las cuatro pruebas con «Expected to fail, but passed.», que es la razón esperada: las guardas todavía no hacen fallar nada.
3. Implementá `assertClean()` y `assertNothingBlocked()` (código abajo). Las cuatro pasan.
4. Escribí `lib/document-marker.ts` y `lib/computed-style.ts`: los usan las specs de la onda 2.
5. Roturas, en `qa/e2e/fixtures/index.ts` (verificadas al planificar):

   | Rotura | Falla |
   | --- | --- |
   | Quitá `issues.assertClean();` | 3 de las 4 pruebas de `guards.spec.ts`, con «Expected to fail, but passed.» |
   | Quitá `network.assertNothingBlocked();` | la prueba «a request to a public host without a double fails the test» |

6. `npx tsc --noEmit -p qa/e2e/tsconfig.json`, `npx eslint qa/e2e` y `npx prettier --check qa/e2e` pasan.
7. Un commit: `test(front): guardas, dobles y Page Objects de la red de punta a punta`.

**Compuerta:** los pasos 3, 5 y 6. Los Page Objects no tienen prueba propia: los ejercen las specs de la onda 2, que se escribieron contra este código y pasaron al planificar.

**Vuelta atrás:** revertí el commit; las specs de la onda 2 todavía no existen.

**Verificado al planificar:** las cuatro pruebas de guardas pasan; con las dos aserciones quitadas, fallan las cuatro con «Expected to fail, but passed.».

`qa/e2e/lib/curriculum.ts`. Lee las fixtures congeladas; no las edita ni las regenera:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Language = 'rust' | 'go';
export type StorageKey =
  'taller-learning-v1' | 'taller-laboratorio-v1' | 'taller-campaign-v1' | 'taller-systems-v1';

interface CurriculumIds {
  exercises: Record<string, { language: Language; title: string }>;
  worlds: Record<
    string,
    { language: Language; trainingIds: string[]; challengeIds: string[]; bossId: string }
  >;
  workshops: Record<
    string,
    { model: string; cores: Record<Language, string>; objectives: string[] }
  >;
  atlas: Record<string, { language: Language; labId: string }>;
}

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), 'utf8')) as T;
}

// Frozen contracts (qa/AGENTS.md): never regenerated and never edited to make a test pass.
export const curriculumIds = readFixture<CurriculumIds>('qa/fixtures/curriculum-ids.json');
export const frozenProgress = readFixture<Record<StorageKey, string>>(
  'qa/fixtures/progress-master-2a278ad-storage.json',
);
```

`qa/e2e/lib/urls.ts`. Las URL del contrato, escritas a mano a partir del README y del mapa:

```ts
import type { Language } from './curriculum';

export type View =
  | 'recorrido'
  | 'campana'
  | 'sistemas'
  | 'atlas'
  | 'laboratorio'
  | 'biblioteca'
  | 'proyecto'
  | 'metodo';
export type Phase = 'learn' | 'code' | 'reflect';
export type SystemsPart = 'explore' | 'build' | 'ship';

// The six shapes of URL with a query plus the view hashes, written by hand from README.md and
// legacy-map.md §4. They are the contract: they never come from the code under test.
export const urls = {
  view: (view: View) => `/#${view}`,
  exercise: (id: string, phase: Phase) => `/?ejercicio=${id}&paso=${phase}#laboratorio`,
  campaignMission: (world: string, id: string, phase: Phase = 'learn') =>
    `/?campana=${world}&ejercicio=${id}&paso=${phase}#laboratorio`,
  systemsCode: (workshop: string, id: string) =>
    `/?sistema=${workshop}&ejercicio=${id}&paso=code#laboratorio`,
  world: (world: string) => `/?mundo=${world}#campana`,
  workshop: (language: Language, workshop?: string, part?: SystemsPart) =>
    workshop
      ? `/?lenguaje=${language}&taller=${workshop}&parte=${part ?? 'explore'}#sistemas`
      : `/?lenguaje=${language}#sistemas`,
  freeLab: '/?#laboratorio',
};
```

`qa/e2e/lib/compiler-results.ts`. Los resultados armados a mano; el marcador es el del ADR 0003 y de `qa/exercise-evidence-check.ts`:

```ts
import type { Language } from './curriculum';

export interface ExerciseUnderTest {
  id: string;
  language: Language;
  // The ids of the exercise's tests, as content/<language>/exercises/<id>/exercise.yaml lists them.
  testIds: readonly string[];
}

export const RUST_02: ExerciseUnderTest = {
  id: 'rust-02',
  language: 'rust',
  testIds: ['t1', 't2', 't3'],
};
export const GO_113: ExerciseUnderTest = {
  id: 'go-113',
  language: 'go',
  testIds: ['t1', 't2', 't3'],
};

export type CompilerKind = 'passed' | 'failedTest' | 'compileError' | 'transportError';

export type CompilerReply = { kind: 'json'; body: unknown } | { kind: 'abort' };

// One line per test: __TALLER_TEST__<id>:PASS|FAIL (ADR 0003, point 7; the same hand-written
// example as qa/exercise-evidence-check.ts). It never comes from buildProgram.
function markers(exercise: ExerciseUnderTest, failing: readonly string[]): string {
  return exercise.testIds
    .map((id) => `__TALLER_TEST__${id}:${failing.includes(id) ? 'FAIL' : 'PASS'}\n`)
    .join('');
}

// Rust Playground, POST /execute: { success, exitDetail, stdout, stderr }.
function rustReply(success: boolean, stdout: string, stderr: string): CompilerReply {
  return {
    kind: 'json',
    body: { success, exitDetail: success ? '' : 'exit status: 101', stdout, stderr },
  };
}

// Go Playground, POST /compile with version=2: { Errors, Events, Status, IsTest, TestsFailed }.
function goReply(errors: string, stdout: string, status: number): CompilerReply {
  return {
    kind: 'json',
    body: {
      Errors: errors,
      Events: stdout ? [{ Message: stdout, Kind: 'stdout', Delay: 0 }] : null,
      Status: status,
      IsTest: false,
      TestsFailed: 0,
    },
  };
}

const COMPILE_ERROR = {
  rust: 'error[E0384]: cannot assign twice to immutable variable `nivel`\n',
  go: 'prog.go:12:2: declared and not used: x\n',
};

export function compilerReply(exercise: ExerciseUnderTest, kind: CompilerKind): CompilerReply {
  if (kind === 'transportError') return { kind: 'abort' };
  const failing = kind === 'failedTest' ? ['t2'] : [];
  if (exercise.language === 'rust') {
    if (kind === 'compileError') return rustReply(false, '', COMPILE_ERROR.rust);
    return rustReply(true, markers(exercise, failing), '');
  }
  if (kind === 'compileError') return goReply(COMPILE_ERROR.go, '', 2);
  return goReply('', markers(exercise, failing), 0);
}

export const PLAYGROUND_ENDPOINT: Record<Language, string> = {
  rust: 'https://play.rust-lang.org/execute',
  go: 'https://play.golang.org/compile',
};
```

`qa/e2e/lib/console-allowlist.ts`. Vacía a propósito: las ocho vistas arrancan sin errores:

```ts
// Page errors and console errors fail every test (spec FR-011) unless an entry here, or an
// `expectIssue` in the test, names them with a reason. An entry is visible debt: remove it as soon
// as the cause is fixed. Empty on purpose: the eight views boot without any error today.
export interface AllowedIssue {
  pattern: RegExp;
  reason: string;
}

export const CONSOLE_ALLOWLIST: readonly AllowedIssue[] = [];
```

`qa/e2e/lib/document-marker.ts`:

```ts
import type { Page } from '@playwright/test';

interface MarkedWindow {
  __e2eMarker?: true;
}

// A URL change does not prove a reload (legacy-map.md §4): a marker set on `window` disappears
// only when the browser builds a new document.
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as MarkedWindow).__e2eMarker = true;
  });
}

export async function documentWasReloaded(page: Page): Promise<boolean> {
  return page.evaluate(() => !(window as MarkedWindow).__e2eMarker);
}

// Runs the action and reports whether it replaced the document. Playwright waits for a navigation
// that the action starts to commit, and `load` settles the new document before the marker is read.
export async function observeReload(page: Page, action: () => Promise<void>): Promise<boolean> {
  await markDocument(page);
  await action();
  await page.waitForLoadState('load');
  return documentWasReloaded(page);
}
```

`qa/e2e/lib/computed-style.ts`:

```ts
import type { Locator } from '@playwright/test';

// The computed value of each property of the first element that matches, as the browser reports it.
export async function computedStyle(
  locator: Locator,
  properties: readonly string[],
): Promise<Record<string, string>> {
  return locator.first().evaluate((element, names) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]));
  }, properties);
}
```

`qa/e2e/fixtures/page-issues.ts`:

```ts
import { expect, type Page } from '@playwright/test';
import { CONSOLE_ALLOWLIST, type AllowedIssue } from '../lib/console-allowlist';

export interface RecordedIssue {
  kind: 'pageerror' | 'console.error';
  text: string;
}

// Collects the uncaught exceptions and the console errors of the page. At the end of the test
// every one must match the global allowlist or an `expectIssue` of the test itself, and every
// `expectIssue` must have matched something, so an allowance cannot outlive its cause.
export class PageIssues {
  private readonly recorded: RecordedIssue[] = [];
  private readonly expected: (AllowedIssue & { seen: boolean })[] = [];

  constructor(page: Page) {
    page.on('pageerror', (error) => this.recorded.push({ kind: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error')
        this.recorded.push({ kind: 'console.error', text: message.text() });
    });
  }

  expectIssue(pattern: RegExp, reason: string): void {
    this.expected.push({ pattern, reason, seen: false });
  }

  private isAllowed(issue: RecordedIssue): boolean {
    const global = CONSOLE_ALLOWLIST.some((entry) => entry.pattern.test(issue.text));
    const local = this.expected.filter((entry) => entry.pattern.test(issue.text));
    local.forEach((entry) => (entry.seen = true));
    return global || local.length > 0;
  }

  assertClean(): void {
    const unexpected = this.recorded.filter((issue) => !this.isAllowed(issue));
    expect(unexpected, 'La página registró errores que no están en la lista blanca').toEqual([]);
    const unseen = this.expected.filter((entry) => !entry.seen).map((entry) => entry.reason);
    expect(unseen, 'Se esperaba un error de la página que no ocurrió').toEqual([]);
  }
}
```

`qa/e2e/fixtures/strict-network.ts`:

```ts
import { expect, type BrowserContext } from '@playwright/test';

// Aborts every request that leaves the test server and keeps its address. A Playground request
// without a simulated reply therefore fails the test instead of reaching the public service.
export class StrictNetwork {
  readonly blocked: string[] = [];

  private constructor(private readonly origin: string) {}

  static async install(context: BrowserContext, baseURL: string): Promise<StrictNetwork> {
    const network = new StrictNetwork(new URL(baseURL).origin);
    await context.route(
      (url) => url.origin !== network.origin,
      async (route) => {
        network.blocked.push(`${route.request().method()} ${route.request().url()}`);
        await route.abort('blockedbyclient');
      },
    );
    return network;
  }

  assertNothingBlocked(): void {
    expect(this.blocked, 'Pedidos fuera del servidor de pruebas sin respuesta simulada').toEqual(
      [],
    );
  }
}
```

`qa/e2e/fixtures/compiler-double.ts`:

```ts
import type { Page } from '@playwright/test';
import {
  PLAYGROUND_ENDPOINT,
  compilerReply,
  type CompilerKind,
  type ExerciseUnderTest,
} from '../lib/compiler-results';

// Answers the Playground of the exercise's language with one of the four hand-written results.
// Playwright adds the CORS headers when it fulfills a cross-origin request, so none is set here.
export class CompilerDouble {
  readonly requests: string[] = [];

  constructor(private readonly page: Page) {}

  async answer(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<void> {
    const reply = compilerReply(exercise, kind);
    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], async (route) => {
      this.requests.push(`${route.request().method()} ${route.request().url()}`);
      if (reply.kind === 'abort') await route.abort('failed');
      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
    });
  }

  // Leaves the request unanswered, so the lab keeps showing its run indicator until the test ends.
  async hold(exercise: ExerciseUnderTest): Promise<void> {
    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], () => {
      this.requests.push(`held ${exercise.language}`);
    });
  }
}
```

`qa/e2e/fixtures/storage-control.ts`:

```ts
import type { BrowserContext, Page } from '@playwright/test';
import type { StorageKey } from '../lib/curriculum';

interface WatchedWindow {
  __e2eStorageWrites?: string[];
}

// Everything that touches localStorage goes through here: seeding before the first load, blocking
// it, watching the writes of the app and reading what it stored.
export class StorageControl {
  constructor(
    private readonly context: BrowserContext,
    private readonly page: Page,
  ) {}

  // Seeds once per tab: sessionStorage survives a reload and a new context starts empty, so the
  // state the app saved before a reload is never overwritten by the seed.
  async seed(entries: Partial<Record<StorageKey, string>>): Promise<void> {
    await this.context.addInitScript((seeded) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      for (const [key, text] of Object.entries(seeded)) localStorage.setItem(key, text as string);
      sessionStorage.setItem('e2e-seeded', 'true');
    }, entries);
  }

  // The access itself throws, as in a browser with storage disabled (ADR 0003, `unavailable`).
  async block(): Promise<void> {
    await this.context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Storage is blocked', 'SecurityError');
        },
      });
    });
  }

  // Call it after `seed`: init scripts run in registration order, so the seed is not counted.
  async watchWrites(): Promise<void> {
    await this.context.addInitScript(() => {
      const writes: string[] = [];
      (window as WatchedWindow).__e2eStorageWrites = writes;
      const setItem = Storage.prototype.setItem;
      const removeItem = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (this === window.localStorage) writes.push(`set ${key}`);
        return setItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key: string) {
        if (this === window.localStorage) writes.push(`remove ${key}`);
        return removeItem.call(this, key);
      };
    });
  }

  async writes(): Promise<string[]> {
    return this.page.evaluate(() => (window as WatchedWindow).__e2eStorageWrites ?? []);
  }

  async snapshot(): Promise<Record<string, string>> {
    return this.page.evaluate(() =>
      Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)!])),
    );
  }
}
```

`qa/e2e/fixtures/index.ts`:

```ts
import { test as base, expect } from '@playwright/test';
import { AtlasPage } from '../pages/atlas';
import { CampaignPage } from '../pages/campaign';
import { LabPage } from '../pages/lab';
import { ShellPage } from '../pages/shell';
import { SystemsPage } from '../pages/systems';
import { CompilerDouble } from './compiler-double';
import { PageIssues } from './page-issues';
import { StorageControl } from './storage-control';
import { StrictNetwork } from './strict-network';

interface Fixtures {
  pageIssues: PageIssues;
  strictNetwork: StrictNetwork;
  compiler: CompilerDouble;
  storage: StorageControl;
  shell: ShellPage;
  lab: LabPage;
  campaign: CampaignPage;
  systems: SystemsPage;
  atlas: AtlasPage;
}

export const test = base.extend<Fixtures>({
  // Automatic guards: they watch every test, and fail it at the end if they saw something.
  pageIssues: [
    async ({ page }, use) => {
      const issues = new PageIssues(page);
      await use(issues);
      issues.assertClean();
    },
    { auto: true },
  ],
  strictNetwork: [
    async ({ context, baseURL }, use) => {
      const network = await StrictNetwork.install(context, baseURL!);
      await use(network);
      network.assertNothingBlocked();
    },
    { auto: true },
  ],
  compiler: async ({ page }, use) => use(new CompilerDouble(page)),
  storage: async ({ context, page }, use) => use(new StorageControl(context, page)),
  shell: async ({ page }, use) => use(new ShellPage(page)),
  lab: async ({ page }, use) => use(new LabPage(page)),
  campaign: async ({ page }, use) => use(new CampaignPage(page)),
  systems: async ({ page }, use) => use(new SystemsPage(page)),
  atlas: async ({ page }, use) => use(new AtlasPage(page)),
});

export { expect };
```

`qa/e2e/pages/shell.ts`:

```ts
import type { Locator, Page } from '@playwright/test';
import type { Language } from '../lib/curriculum';
import type { View } from '../lib/urls';

const MENU_NAME: Record<View, RegExp> = {
  recorrido: /^Mi recorrido/,
  campana: /^Campaña/,
  sistemas: /^Sistemas/,
  atlas: /^Atlas del lenguaje/,
  laboratorio: /^Laboratorio/,
  biblioteca: /^Biblioteca/,
  proyecto: /^Mi proyecto/,
  metodo: /^Método y notas/,
};

// The h1 of each view. A <br> inside the title can leave or drop the space, hence `\s*`.
const HEADING: Record<View, RegExp> = {
  recorrido: /Entendé lo que\s*pasa por dentro\./,
  campana: /El próximo nivel\s*lo construís vos\./,
  sistemas: /Abrí la caja\.\s*Construí lo que hay adentro\./,
  atlas: /Entender el porqué\./,
  laboratorio: /Aprendé tocando\.\s*Entendé probando\./,
  biblioteca: /Una biblioteca\.\s*Tu propia ruta\./,
  proyecto: /De una función\s*a tu propio sistema\./,
  metodo: /Menos inercia\.\s*Más curiosidad\./,
};

const LANGUAGE_NAME: Record<Language, string> = { rust: 'Rust', go: 'Go' };

// The shell: the menu, the language switch, the toast and the footer of the sidebar.
export class ShellPage {
  readonly menu: Locator;
  readonly languages: Locator;
  // The toast is the single `notify` of the lab, the campaign and Systems (legacy-map.md §3.1).
  // It has no accessible name, and the page has other role=status regions, so the id is its contract.
  readonly toast: Locator;
  // The document body: language buttons and the page share a `data-language` attribute.
  readonly body: Locator;

  constructor(readonly page: Page) {
    this.menu = page.getByRole('navigation', { name: 'Navegación principal' });
    this.languages = page.getByRole('group', { name: 'Lenguaje del recorrido' });
    this.toast = page.locator('#toast');
    this.body = page.locator('body');
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  menuLink(view: View): Locator {
    return this.menu.getByRole('link', { name: MENU_NAME[view] });
  }

  async openFromMenu(view: View): Promise<void> {
    await this.menuLink(view).click();
  }

  heading(view: View): Locator {
    return this.page.getByRole('heading', { level: 1, name: HEADING[view] });
  }

  languageButton(language: Language): Locator {
    return this.languages.getByRole('button', { name: LANGUAGE_NAME[language], exact: true });
  }

  async switchLanguage(language: Language): Promise<void> {
    await this.languageButton(language).click();
  }

  saveStatus(text: 'Guardado en este navegador' | 'Exportá para conservar tu avance'): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
```

`qa/e2e/pages/lab.ts`:

```ts
import type { Locator, Page } from '@playwright/test';
import type { Language } from '../lib/curriculum';
import type { Phase } from '../lib/urls';

const TAB_NAME: Record<Phase, RegExp> = {
  learn: /Descubrí/,
  code: /Experimentá/,
  reflect: /Explicá/,
};
const LANGUAGE_NAME: Record<Language, string> = { rust: 'Rust', go: 'Go' };

export class LabPage {
  constructor(readonly page: Page) {}

  tab(phase: Phase): Locator {
    return this.page.getByRole('tab', { name: TAB_NAME[phase] });
  }

  exerciseTitle(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  startButton(): Locator {
    return this.page.getByRole('button', { name: /Entrar al laboratorio|Seguir aprendiendo/ });
  }

  editor(language: Language): Locator {
    return this.page.getByRole('textbox', { name: `Editor de código ${LANGUAGE_NAME[language]}` });
  }

  async writeDraft(language: Language, text: string): Promise<void> {
    await this.editor(language).click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.insertText(text);
  }

  runButton(): Locator {
    return this.page.getByRole('button', { name: /Ejecutar y revisar/ });
  }

  async runCode(): Promise<void> {
    await this.runButton().click();
  }

  review(): Locator {
    return this.page.getByRole('complementary', { name: 'Revisión del ejercicio' });
  }

  reviewHeading(): Locator {
    return this.review().getByRole('heading', { level: 3 }).first();
  }

  // The block that campaign and Systems insert above the exercise (legacy-map.md §3.2). It has no
  // role or name, so the class that the bridge contract names is the locator.
  contextBlock(): Locator {
    return this.page.locator('.quest-lab-context');
  }

  contextBackLink(): Locator {
    return this.contextBlock().getByRole('link', { name: /^←/ });
  }

  campaignLockHeading(): Locator {
    return this.page.getByRole('heading', { name: /Primero, las piezas/ });
  }

  campaignLockMapLink(): Locator {
    return this.page.getByRole('link', { name: /Ver mi mapa/ });
  }

  position(): Locator {
    return this.page.getByText(/^\d+ \/ \d+$/);
  }

  nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Ejercicio siguiente' });
  }

  previousButton(): Locator {
    return this.page.getByRole('button', { name: 'Ejercicio anterior' });
  }

  backButton(): Locator {
    return this.page.getByRole('button', { name: /^← Volver al/ });
  }
}
```

`qa/e2e/pages/campaign.ts`:

```ts
import type { Locator, Page } from '@playwright/test';

export class CampaignPage {
  constructor(readonly page: Page) {}

  freeLabLink(): Locator {
    return this.page.getByRole('link', { name: 'laboratorio libre' });
  }

  world(title: string): Locator {
    return this.page.getByRole('region', { name: title });
  }

  missionCard(title: string): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('heading', { level: 4, name: title }) });
  }

  missionLink(title: string): Locator {
    return this.missionCard(title).getByRole('link');
  }

  checkpoint(): Locator {
    return this.page.getByRole('region', {
      name: /El código funciona\. ¿Sabés por qué\?|Una idea que ya podés explicar\./,
    });
  }

  checkpointOption(letter: 'A' | 'B' | 'C'): Locator {
    return this.checkpoint().getByRole('button', { name: new RegExp(`^${letter}`) });
  }
}
```

`qa/e2e/pages/systems.ts`:

```ts
import type { Locator, Page } from '@playwright/test';
import type { SystemsPart } from '../lib/urls';

const PART_NAME: Record<SystemsPart, RegExp> = {
  explore: /Manipulá el sistema/,
  build: /Programá su núcleo/,
  ship: /Llevátelo a un proyecto/,
};

export class SystemsPage {
  constructor(readonly page: Page) {}

  search(): Locator {
    return this.page.getByRole('searchbox', { name: 'Buscar talleres de sistemas' });
  }

  emptyCatalog(): Locator {
    return this.page.getByRole('heading', { name: 'No aparece ese taller.' });
  }

  workshopCard(title: string): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: title }) });
  }

  async openWorkshop(title: string): Promise<void> {
    await this.workshopCard(title)
      .getByRole('button', { name: /^Explorar/ })
      .click();
  }

  workshopHeading(title: string): Locator {
    return this.page.getByRole('heading', { level: 1, name: title });
  }

  part(part: SystemsPart): Locator {
    return this.page.getByRole('button', { name: PART_NAME[part] });
  }

  seals(): Locator {
    return this.page.getByLabel('Progreso del taller');
  }

  enterIde(): Locator {
    return this.page.getByRole('link', { name: /Entrar al IDE/ });
  }

  modelButton(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  // The list of steps that the model prints under its status. It has no name: the class is the locator.
  traceEntries(): Locator {
    return this.page.locator('.sys-trace li');
  }

  note(): Locator {
    return this.page.getByRole('textbox', { name: 'Dejá tu próximo experimento por escrito' });
  }
}
```

`qa/e2e/pages/atlas.ts`:

```ts
import type { Locator, Page } from '@playwright/test';

export class AtlasPage {
  constructor(readonly page: Page) {}

  // The index lists the concepts by their number: "01Qué lenguaje estás aprendiendo…".
  concept(number: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${number}`) });
  }

  labLink(): Locator {
    return this.page.getByRole('link', { name: 'Ir al laboratorio' });
  }
}
```

`qa/e2e/specs/guards.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { RUST_02 } from '../lib/compiler-results';
import { urls } from '../lib/urls';

// The guards must keep failing the test they should fail: `test.fail()` turns each of these into
// a check that the guard works. If a guard stops firing, its test passes and Playwright reports it.
test.describe('the guards of the net', () => {
  test.fail('a console error fails the test', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    await page.evaluate(() => console.error('boom'));
  });

  test.fail('an uncaught exception of the page fails the test', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    const thrown = page.waitForEvent('pageerror');
    await page.evaluate(() =>
      setTimeout(() => {
        throw new Error('boom');
      }, 0),
    );
    await thrown;
  });

  test.fail(
    'a request to a public host without a double fails the test',
    async ({ shell, lab, pageIssues }) => {
      // The browser also logs the aborted request: expected here so that only the network guard fails.
      pageIssues.expectIssue(/ERR_BLOCKED_BY_CLIENT/, 'la red estricta aborta el pedido');
      await shell.goto(urls.exercise(RUST_02.id, 'code'));
      await lab.runCode();
      await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    },
  );

  test('an expected issue that never happens fails the test', async ({ shell, pageIssues }) => {
    test.fail();
    await shell.goto(urls.view('recorrido'));
    pageIssues.expectIssue(/never happens/, 'se espera un error que no ocurre');
  });
});
```

## 3. Vitest (dueño V, onda 1)

**Cubre:** los dos riesgos altos del mapa: FR-016, FR-017 y FR-018.

**Entrega:** `frontend/vitest.config.ts` y las dos specs, en verde con el código de producción sin cambios. K suma después los scripts (T012).

### Tarea 3.1 · La configuración y las dos specs de riesgo (T004)

- **Crea:** `frontend/vitest.config.ts`, `frontend/src/entities/guide/model/route-store-instances.spec.ts` y `frontend/src/app/engine-init-order.spec.ts`.
- **Cambia:** `tsconfig.node.json` (incluye la config de Vitest y habilita `allowImportingTsExtensions`).
- **Entrega:** `npx vitest run --config frontend/vitest.config.ts` pasa con 2 archivos y 3 pruebas.

**Dónde viven las specs.** La primera prueba `shared/lib` y `entities/guide`, así que va dentro del slice `entities/guide`, que puede importar la capa de abajo. La segunda usa dos entidades que no se importan entre sí (`entities/campaign` y `entities/systems-workshop`) y es un problema de arranque, así que va en `app/`, que puede importar las dos.

**Pasos:**

1. Escribí la config, el cambio de `tsconfig.node.json` y la primera spec.
2. `npx vitest run --config frontend/vitest.config.ts` pasa: la spec describe lo que hay y nace en verde. Si falla, pará e informá: el contrato del mapa (§5 y §12) cambió.
3. Rotura: en `frontend/src/shared/lib/versioned-storage.ts`, dentro de `write`, cambiá `if (current !== lastText) {` por `if (false as boolean) {`. La spec falla con «expected [] to deeply equal [ 'rust-ownership' ]», porque sin fusión la segunda escritura pisa lo que hizo la primera. Deshacela.
4. Escribí la segunda spec y corré: pasa.
5. Rotura: en `frontend/src/entities/campaign/model/create-campaign-engine.ts`, cambiá `if (!catalog) throw new Error('Inicializá la campaña antes de usarla.');` por `if (!catalog) return {} as never;`. La spec falla: el error ya no es el de «Inicializá la campaña antes de usarla.». Deshacela.
6. `npx tsc --noEmit -p tsconfig.node.json`, `npx tsc --noEmit -p frontend/tsconfig.app.json`, `npx eslint` y `npx prettier --check` sobre los archivos nuevos pasan.
7. Un commit: `test(front): caracteriza los dos riesgos altos del mapa con Vitest`.

**Compuerta:** los pasos 2 a 6. Las dos specs están marcadas `KNOWN DEFECT` con su referencia al mapa: F2 las cambia a propósito en su commit TDD (la primera, cuando haya un solo almacén por clave; la segunda, cuando el arranque sea explícito).

**Vuelta atrás:** revertí el commit; ninguna otra tarea depende de él.

**Verificado al planificar:** las tres pruebas pasan con el código de producción sin cambios, y las dos roturas las hacen fallar por la razón dicha. La config corre con la raíz en `frontend/src` (es la de Vite) y no deja ningún caché en el árbol.

`frontend/vitest.config.ts`. Reusa la config de Vite con `mergeConfig`; un solo proyecto `node` y sin `setup`, porque la pila de DOM llega con la primera spec de componente (F3):

```ts
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Vite's root is frontend/src: without this the cache would land in frontend/src/node_modules.
    cacheDir: resolve(import.meta.dirname, '../node_modules/.vite'),
    test: {
      name: 'node',
      environment: 'node',
      include: ['**/*.spec.ts'],
    },
  }),
);
```

El cambio de `tsconfig.node.json`:

```diff
     "moduleResolution": "Bundler",
-    "types": ["node"]
+    "types": ["node"],
+    "allowImportingTsExtensions": true
   },
   "include": [
     "frontend/vite.config.ts",
+    "frontend/vitest.config.ts",
```

`frontend/src/entities/guide/model/route-store-instances.spec.ts`. Dos instancias sobre un mismo almacenamiento se comportan como dos pestañas. El valor esperado es el caso que el mapa verificó (§5 y §12): el favorito vuelve y lo que hizo la primera instancia sobrevive:

```ts
import { describe, expect, it } from 'vitest';
import { openVersionedStore, type StorageLike } from '../../../shared/lib/versioned-storage';
import { mergeRouteProgress, type RouteProgressV1 } from './route-progress';

const KEY = 'taller-learning-v1';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function route(overrides: Partial<RouteProgressV1> = {}): RouteProgressV1 {
  return {
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
    ...overrides,
  };
}

// The options app.js passes to openVersionedStore. `parseProgress` and `mergeStoredRoute` live inside
// app.js and cannot be imported without changing production: the parse is the spec's own and the
// merge is a copy of `mergeStoredRoute`, over the real `mergeRouteProgress`.
function openRouteStore(storage: StorageLike) {
  return openVersionedStore<RouteProgressV1>(KEY, {
    storage,
    blank: () => route(),
    parse: (raw) => ({ state: raw as RouteProgressV1, dropped: 0 }),
    merge: (stored, local) => ({
      ...mergeRouteProgress(stored, local),
      language: local.language,
      minutes: local.minutes,
    }),
  });
}

describe('two open instances of the route store (legacy-map §5 and §12)', () => {
  it('KNOWN DEFECT: a favorite removed through one instance comes back when the other saves', () => {
    const saved = route({ favorites: ['rust-100', 'go-tour'] });
    const storage = memoryStorage({ [KEY]: JSON.stringify(saved) });
    const page = openRouteStore(storage);
    const shell = openRouteStore(storage);
    const pageState = page.load().state;
    const shellState = shell.load().state;

    // The page removes a favorite and completes a step; the shell, which does not know it, saves a note.
    page.write({ ...pageState, favorites: ['go-tour'], completed: ['rust-ownership'] });
    const note = { ...shellState.notes, rust: { learned: 'una nota', next: '' } };
    const result = shell.write({ ...shellState, notes: note });

    expect(result.saved).toBe(true);
    const stored = JSON.parse(storage.getItem(KEY)!) as RouteProgressV1;
    expect(stored.completed).toEqual(['rust-ownership']);
    expect(stored.notes.rust.learned).toBe('una nota');
    expect([...stored.favorites].sort()).toEqual(['go-tour', 'rust-100']);
  });
});
```

`frontend/src/app/engine-init-order.spec.ts`. El motor de campaña lanza antes de `init` y el de Sistemas se queda vacío sin avisar:

```ts
import { describe, expect, it } from 'vitest';
import { createCampaignEngine } from '../entities/campaign';
import { createSystemsEngine } from '../entities/systems-workshop';

describe('engines used before init (legacy-map §2.3 and §12)', () => {
  it('KNOWN DEFECT: the campaign engine throws', () => {
    const engine = createCampaignEngine();
    const message = 'Inicializá la campaña antes de usarla.';

    expect(() => engine.getWorlds('rust')).toThrow(message);
    expect(() => engine.refreshFromLab(null)).toThrow(message);
    expect(() => engine.canAttempt('rust-02', 'rust')).toThrow(message);
  });

  it('KNOWN DEFECT: the Systems engine answers with an empty list and no error', () => {
    const engine = createSystemsEngine();

    expect(engine.list('rust')).toEqual([]);
  });
});
```

## 4. Specs de la red (dueños U, C, P y S, onda 2)

**Cubre:** las historias US1, US2, US3 y US6 y los requisitos FR-002 a FR-008, FR-012 y FR-014.

**Entrega:** ocho specs de punta a punta en verde sobre el build actual. Cada tarea es una spec: la escribe su dueño contra los contratos de [data-model.md](./data-model.md), la corre en verde y le aplica sus roturas. Las tablas de roturas son las verificadas al planificar: el archivo que se cambia y qué prueba falla. Todas se hacen en una copia de trabajo y se deshacen con `git checkout -- <archivo>`.

### Tarea 4.1 · Las ocho vistas por hash y el historial (T005, U)

- **Crea:** `qa/e2e/specs/views.spec.ts` (12 pruebas).
- **Cubre:** FR-002, US1 escenario 1 y el borde «Historial».
- **Escenarios:** cada una de las ocho vistas se abre desde un navegador vacío y deja su entrada del menú con `aria-current`; los siete enlaces de hash del menú no reemplazan el documento (el de «Laboratorio» cambia la query y es L1 de T007); cada navegación por hash suma una entrada al historial y «Atrás» vuelve a la vista anterior; abrir un ejercicio reescribe la query sin sumar una entrada; `<body>` lleva `aria-pressed` (defecto conocido).

| Rotura | Archivo y cambio | Falla |
| --- | --- | --- |
| La vista `atlas` deja de existir | `frontend/app.js`: quitá `'atlas',` del arreglo `views` | 2: «#atlas opens from an empty browser» y «the menu moves through the seven hash links without replacing the document» |

**Compuerta:** la spec en verde, la rotura detectada y `tsc`, `eslint` y `prettier` sin errores. Commit: `test(front): las ocho vistas por hash y el historial`.

**Vuelta atrás:** revertí el commit.

```ts
import { expect, test } from '../fixtures';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { urls, type View } from '../lib/urls';

const VIEWS: View[] = [
  'recorrido',
  'biblioteca',
  'proyecto',
  'metodo',
  'atlas',
  'campana',
  'sistemas',
  'laboratorio',
];
// The menu entries whose link is a hash. "Laboratorio" links to `?#laboratorio`, which changes the
// query: it is covered with the other links that do (reload.spec.ts, L1).
const HASH_LINKS: View[] = [
  'recorrido',
  'campana',
  'sistemas',
  'atlas',
  'biblioteca',
  'proyecto',
  'metodo',
];

test.describe('the eight views by hash', () => {
  for (const view of VIEWS) {
    test(`#${view} opens from an empty browser`, async ({ shell }) => {
      await shell.goto(urls.view(view));

      await expect(shell.heading(view)).toBeVisible();
      await expect(shell.menuLink(view)).toHaveAttribute('aria-current', 'page');
      for (const other of VIEWS.filter((candidate) => candidate !== view))
        await expect(shell.menuLink(other)).not.toHaveAttribute('aria-current', 'page');
    });
  }

  test('the menu moves through the seven hash links without replacing the document', async ({
    shell,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await markDocument(page);

    for (const view of HASH_LINKS.slice(1)) {
      await shell.openFromMenu(view);
      await expect(shell.heading(view)).toBeVisible();
      await expect(shell.menuLink(view)).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveURL(urls.view(view));
    }

    expect(await documentWasReloaded(page)).toBe(false);
  });
});

test.describe('history', () => {
  test('each hash navigation adds one entry and Back returns to the previous view', async ({
    shell,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));
    const entries = await page.evaluate(() => history.length);

    await shell.openFromMenu('biblioteca');
    await shell.openFromMenu('proyecto');
    expect(await page.evaluate(() => history.length)).toBe(entries + 2);

    await page.goBack();
    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(shell.menuLink('biblioteca')).toHaveAttribute('aria-current', 'page');
    await page.goBack();
    await expect(shell.heading('recorrido')).toBeVisible();
  });

  test('opening an exercise rewrites the query and adds no entry', async ({ shell, lab, page }) => {
    await shell.goto(urls.view('laboratorio'));
    const entries = await page.evaluate(() => history.length);

    await lab.startButton().click();

    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=learn#laboratorio$/);
    expect(await page.evaluate(() => history.length)).toBe(entries);
  });
});

test.describe('the language switch', () => {
  test('KNOWN DEFECT (new, found by F1): <body> carries aria-pressed because [data-language] matches it', async ({
    shell,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(shell.body).toHaveAttribute('aria-pressed', 'true');
  });
});
```

### Tarea 4.2 · Las formas de URL con query (T006, U)

- **Crea:** `qa/e2e/specs/url-contract.spec.ts` (30 pruebas).
- **Cubre:** FR-003, SC-001 y US1 escenarios 2, 3, 4, 5, 7 y 8, y los bordes de ID inexistente, fase inválida, query sin ejercicio e idioma que manda la URL.
- **Escenarios:** `?ejercicio=&paso=#laboratorio` en las tres fases y en los dos lenguajes; el idioma del enlace gana sobre el guardado (con el progreso de master, que guardó Go); un ID o una fase inexistentes; `?campana=` y `?sistema=` con y sin ejercicio; `?#laboratorio`; `?mundo=#campana` en tres mundos y uno desconocido; `?lenguaje=&taller=&parte=#sistemas`; los enlaces del Atlas al laboratorio, con el `labId` de la fixture congelada; y el cambio de idioma en cada una de las ocho vistas.

| Rotura | Archivo y cambio | Falla |
| --- | --- | --- |
| `?ejercicio=` deja de leerse (SC-006, contrato 2) | `frontend/lab.js`, en `mount`: `byId.get(params.get('ejercicio'))` por `byId.get(params.get('ejercicio_'))` | las pruebas de `?ejercicio=`, de `?campana=` y de `?sistema=` de esta spec; en la red entera, 40 |
| `?mundo=` deja de leerse | `frontend/campaign.js`, en `mount`: `.get('mundo')` por `.get('mundo_')` | 1: «opens rust-world-2 in rust» (con el progreso vacío el mundo abierto por omisión es el 1, así que sólo el 2 lo distingue) |
| El idioma deja de seguir al ejercicio | `frontend/app.js`, en `syncLinkedLanguage`: `if (location.hash === '#laboratorio' && linked)` por `if (false && linked)` | 3: «a Go exercise switches the language to Go», «the language of the link wins over the saved one» y «a Systems core opens at the code phase, in its language» |
| El cambio de idioma deja la query | `frontend/app.js`, en el manejador del idioma: `else url.search = '';` por `else url.search = url.search;` | 7: el cambio de idioma desde todas las vistas menos `#sistemas` |

**Compuerta y vuelta atrás:** como en 4.1. Commit: `test(front): contrato de las URL con query`.

```ts
import { expect, test } from '../fixtures';
import { curriculumIds, frozenProgress, type Language } from '../lib/curriculum';
import { urls, type Phase, type View } from '../lib/urls';
import type { ShellPage } from '../pages/shell';

const title = (exerciseId: string) => curriculumIds.exercises[exerciseId].title;
const ALL_VIEWS: View[] = [
  'recorrido',
  'biblioteca',
  'proyecto',
  'metodo',
  'atlas',
  'campana',
  'sistemas',
  'laboratorio',
];

async function expectLanguage(shell: ShellPage, language: Language) {
  const other: Language = language === 'rust' ? 'go' : 'rust';
  await expect(shell.languageButton(language)).toHaveAttribute('aria-pressed', 'true');
  await expect(shell.languageButton(other)).toHaveAttribute('aria-pressed', 'false');
}

test.describe('?ejercicio=&paso=#laboratorio', () => {
  const phases: Phase[] = ['learn', 'code', 'reflect'];
  for (const phase of phases) {
    test(`opens a Rust exercise at the ${phase} phase`, async ({ shell, lab, page }) => {
      await shell.goto(urls.exercise('rust-02', phase));

      await expect(shell.menuLink('laboratorio')).toHaveAttribute('aria-current', 'page');
      await expect(lab.exerciseTitle()).toHaveText(title('rust-02'));
      await expect(lab.tab(phase)).toHaveAttribute('aria-selected', 'true');
      await expectLanguage(shell, 'rust');
      await expect(page).toHaveURL(urls.exercise('rust-02', phase));
    });
  }

  test('a Go exercise switches the language to Go', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('go-113', 'code'));

    await expect(lab.exerciseTitle()).toHaveText(title('go-113'));
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expectLanguage(shell, 'go');
  });

  test('the language of the link wins over the saved one', async ({ shell, lab, storage }) => {
    // The frozen progress of master was saved with the Go language.
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });

    await shell.goto(urls.exercise('rust-02', 'learn'));

    await expect(lab.exerciseTitle()).toHaveText(title('rust-02'));
    await expectLanguage(shell, 'rust');
  });

  test('an unknown exercise opens the map and drops the query', async ({ shell, page }) => {
    await shell.goto('/?ejercicio=no-existe&paso=learn#laboratorio');

    await expect(shell.heading('laboratorio')).toBeVisible();
    await expect(page).toHaveURL(urls.view('laboratorio'));
  });

  test('an unknown phase opens the exercise at learn', async ({ shell, lab, page }) => {
    await shell.goto('/?ejercicio=rust-02&paso=inventada#laboratorio');

    await expect(lab.tab('learn')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(urls.exercise('rust-02', 'learn'));
  });

  for (const parameter of ['campana=rust-world-1', 'sistema=cache']) {
    test(`?${parameter} without an exercise opens the map and drops it`, async ({
      shell,
      page,
    }) => {
      await shell.goto(`/?${parameter}#laboratorio`);

      await expect(shell.heading('laboratorio')).toBeVisible();
      await expect(page).toHaveURL(urls.view('laboratorio'));
    });
  }

  test('?#laboratorio opens the map', async ({ shell, page }) => {
    await shell.goto(urls.freeLab);

    await expect(shell.heading('laboratorio')).toBeVisible();
    await expect(page).toHaveURL(urls.view('laboratorio'));
  });
});

test.describe('?campana= and ?sistema= select the exercise like ?ejercicio=', () => {
  test('a campaign mission opens at its phase', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-02', 'learn'));

    await expect(lab.exerciseTitle()).toHaveText(title('rust-02'));
    await expect(lab.tab('learn')).toHaveAttribute('aria-selected', 'true');
  });

  test('a Systems core opens at the code phase, in its language', async ({ shell, lab }) => {
    await shell.goto(urls.systemsCode('cache', 'go-113'));

    await expect(lab.exerciseTitle()).toHaveText(title('go-113'));
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expectLanguage(shell, 'go');
  });
});

test.describe('?mundo=#campana', () => {
  const cases: [string, Language, string][] = [
    ['rust-world-1', 'rust', 'Estación del robot'],
    ['rust-world-2', 'rust', 'Puerto de señales'],
    ['go-world-1', 'go', 'La estación del rover'],
  ];
  for (const [world, language, worldTitle] of cases) {
    test(`opens ${world} in ${language}`, async ({ shell, campaign }) => {
      await shell.goto(urls.world(world));

      await expect(shell.menuLink('campana')).toHaveAttribute('aria-current', 'page');
      await expect(campaign.world(worldTitle)).toBeVisible();
      await expectLanguage(shell, language);
    });
  }

  test('an unknown world keeps the first open world', async ({ shell, campaign, page }) => {
    await shell.goto(urls.world('nada'));

    await expect(campaign.world('Estación del robot')).toBeVisible();
    await expect(page).toHaveURL(urls.world('nada'));
  });
});

test.describe('?lenguaje=&taller=&parte=#sistemas', () => {
  test('opens that workshop at that part in that language', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('go', 'cache', 'ship'));

    await expectLanguage(shell, 'go');
    await expect(systems.workshopHeading('Una caché que aprende tus visitas')).toBeVisible();
    await expect(systems.part('ship')).toHaveAttribute('aria-pressed', 'true');
  });

  test('?lenguaje= alone opens the catalog in that language', async ({ shell }) => {
    await shell.goto(urls.workshop('go'));

    await expectLanguage(shell, 'go');
    await expect(shell.heading('sistemas')).toBeVisible();
  });

  test('an unknown workshop opens the catalog', async ({ shell }) => {
    await shell.goto('/?taller=inexistente#sistemas');

    await expect(shell.heading('sistemas')).toBeVisible();
  });
});

test.describe('the Atlas links to the lab', () => {
  const concepts: [Language, string, string][] = [
    ['rust', 'rust-identity', '01'],
    ['rust', 'rust-syntax', '02'],
    ['go', 'go-identity', '01'],
  ];
  for (const [language, concept, number] of concepts) {
    test(`${concept} goes to its exercise at learn`, async ({ shell, atlas, lab, page }) => {
      const { labId } = curriculumIds.atlas[concept];
      await shell.goto(urls.view('atlas'));
      if (language === 'go') await shell.switchLanguage('go');
      await atlas.concept(number).click();

      await expect(atlas.labLink()).toHaveAttribute('href', urls.exercise(labId, 'learn').slice(1));
      await atlas.labLink().click();

      await expect(page).toHaveURL(urls.exercise(labId, 'learn'));
      await expect(lab.exerciseTitle()).toHaveText(title(labId));
    });
  }
});

test.describe('the language switch writes the query', () => {
  for (const view of ALL_VIEWS) {
    test(`from #${view}`, async ({ shell, page }) => {
      await shell.goto(`/?basura=1#${view}`);

      await shell.switchLanguage('go');

      await expectLanguage(shell, 'go');
      // Systems adds `lenguaje` to the query; every other view empties it.
      const expected = view === 'sistemas' ? '/?basura=1&lenguaje=go#sistemas' : urls.view(view);
      await expect(page).toHaveURL(expected);
    });
  }
});
```

### Tarea 4.3 · Los enlaces que cambian la query recargan el documento (T007, U)

- **Crea:** `qa/e2e/specs/reload.spec.ts` (17 pruebas).
- **Cubre:** FR-004, SC-002 y US1 escenario 6.
- **Escenarios:** los 11 enlaces que cambian la query reemplazan el documento (L1 a L11, tabla en [data-model.md](./data-model.md), §4); tres cambios que sólo tocan el hash o reescriben la query en el lugar lo conservan (C1 a C3); y el estado en memoria (el temporizador, la sesión del Atlas y la simulación de Sistemas) sobrevive a una navegación de hash y se pierde con una recarga.
- **El reloj.** El temporizador usa `Date.now()` y un `setInterval` de 500 ms: la prueba instala `page.clock` en una hora fija y lo pausa un segundo después, así que `runFor(60_000)` deja `24:00` exacto.

| Rotura | Archivo y cambio | Falla |
| --- | --- | --- |
| El menú «Laboratorio» ya no cambia la query | `frontend/src/index.html`: `href="?#laboratorio"` por `href="#laboratorio"` | 5: L1, L2 y las tres de «what stays in memory» |
| El enlace de regreso al mundo es de hash | `frontend/campaign.js`, en `worldURL`: devolvé `` `#campana` `` | 3: L5, L6 y L10 |

**Compuerta y vuelta atrás:** como en 4.1. Commit: `test(front): los enlaces que cambian la query y qué estado se pierde`.

```ts
import { expect, test } from '../fixtures';
import { curriculumIds } from '../lib/curriculum';
import { observeReload } from '../lib/document-marker';
import { urls } from '../lib/urls';
import type { AtlasPage } from '../pages/atlas';
import type { CampaignPage } from '../pages/campaign';
import type { LabPage } from '../pages/lab';
import type { ShellPage } from '../pages/shell';
import type { SystemsPage } from '../pages/systems';

interface Pages {
  shell: ShellPage;
  lab: LabPage;
  campaign: CampaignPage;
  systems: SystemsPage;
  atlas: AtlasPage;
}

// Every link that changes the query (legacy-map.md §4). The roadmap assumed that such a link
// replaces the document; this table is the measurement. A link that only changes the hash does not.
const atlasLabId = curriculumIds.atlas['rust-identity'].labId;

test.describe('the links that change the query replace the document', () => {
  const MISSION = urls.campaignMission('rust-world-1', 'rust-02');
  const BOSS = urls.campaignMission('rust-world-1', 'rust-103');
  const SYSTEMS_CORE = urls.systemsCode('cache', 'rust-113');
  const WORLD = urls.world('rust-world-1');
  const WORKSHOP_BUILD = '/?taller=cache&parte=build&lenguaje=rust#sistemas';

  const links: {
    id: string;
    start: string;
    follow: (pages: Pages) => Promise<void>;
    lands: string;
  }[] = [
    {
      id: 'L1 menu «Laboratorio»',
      start: urls.view('recorrido'),
      follow: ({ shell }) => shell.openFromMenu('laboratorio'),
      lands: urls.view('laboratorio'),
    },
    {
      id: 'L2 menu «Laboratorio» inside a campaign mission',
      start: MISSION,
      follow: ({ shell }) => shell.openFromMenu('laboratorio'),
      lands: urls.view('laboratorio'),
    },
    {
      id: 'L3 «laboratorio libre» of the campaign',
      start: urls.view('campana'),
      follow: ({ campaign }) => campaign.freeLabLink().click(),
      lands: urls.view('laboratorio'),
    },
    {
      id: 'L4 «Abrir misión» of the campaign',
      start: urls.view('campana'),
      follow: ({ campaign }) =>
        campaign.missionLink(curriculumIds.exercises['rust-02'].title).click(),
      lands: MISSION,
    },
    {
      id: 'L5 way back to the world, from the context block',
      start: MISSION,
      follow: ({ lab }) => lab.contextBackLink().click(),
      lands: WORLD,
    },
    {
      id: 'L6 «Ver mi mapa» of the lock',
      start: BOSS,
      follow: ({ lab }) => lab.campaignLockMapLink().click(),
      lands: WORLD,
    },
    {
      id: 'L7 «Entrar al IDE» of Systems',
      start: urls.workshop('rust', 'cache', 'build'),
      follow: ({ systems }) => systems.enterIde().click(),
      lands: SYSTEMS_CORE,
    },
    {
      id: 'L8 way back to the workshop, from the context block',
      start: SYSTEMS_CORE,
      follow: ({ lab }) => lab.contextBackLink().click(),
      lands: WORKSHOP_BUILD,
    },
    {
      id: 'L9 «Ir al laboratorio» of the Atlas',
      start: urls.view('atlas'),
      follow: ({ atlas }) => atlas.labLink().click(),
      lands: urls.exercise(atlasLabId, 'learn'),
    },
    {
      id: 'L10 «Volver al mapa» inside a campaign mission',
      start: MISSION,
      follow: ({ lab }) => lab.backButton().click(),
      lands: WORLD,
    },
    {
      id: 'L11 «Volver al taller» inside a Systems core',
      start: SYSTEMS_CORE,
      follow: ({ lab }) => lab.backButton().click(),
      lands: WORKSHOP_BUILD,
    },
  ];

  for (const link of links) {
    test(`${link.id} replaces the document`, async ({
      shell,
      lab,
      campaign,
      systems,
      atlas,
      page,
    }) => {
      await shell.goto(link.start);

      const pages: Pages = { shell, lab, campaign, systems, atlas };
      const reloaded = await observeReload(page, () => link.follow(pages));

      expect(reloaded).toBe(true);
      await expect(page).toHaveURL(link.lands);
    });
  }
});

test.describe('the links that only change the hash keep the document', () => {
  test('C1 menu «Biblioteca»', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));

    const reloaded = await observeReload(page, () => shell.openFromMenu('biblioteca'));

    expect(reloaded).toBe(false);
    await expect(shell.heading('biblioteca')).toBeVisible();
  });

  test('C2 the language switch rewrites the query in place', async ({ shell, page }) => {
    await shell.goto('/?basura=1#biblioteca');

    const reloaded = await observeReload(page, () => shell.switchLanguage('go'));

    expect(reloaded).toBe(false);
    await expect(page).toHaveURL(urls.view('biblioteca'));
  });

  test('C3 opening an exercise from the map rewrites the query in place', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.view('laboratorio'));

    const reloaded = await observeReload(page, () => lab.startButton().click());

    expect(reloaded).toBe(false);
    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=learn#laboratorio$/);
  });
});

// What the student loses when a link replaces the document: the state that lives only in memory
// (legacy-map.md §5). The same state survives a hash navigation.
test.describe('what stays in memory', () => {
  test('the focus timer survives a hash navigation and is lost on a reload', async ({
    shell,
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
    await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
    await shell.goto(urls.view('recorrido'));
    await page.getByRole('button', { name: 'Iniciar foco' }).click();
    await page.clock.runFor(60_000);
    await expect(page.getByRole('timer')).toHaveText('24:00');

    await shell.openFromMenu('biblioteca');
    await shell.openFromMenu('recorrido');
    await expect(page.getByRole('timer')).toHaveText('24:00');
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('recorrido');
    await expect(page.getByRole('timer')).toHaveText('25:00');
    await expect(page.getByRole('button', { name: 'Iniciar foco' })).toBeVisible();
  });

  test('the Atlas session survives a hash navigation and is lost on a reload', async ({
    shell,
    atlas,
  }) => {
    await shell.goto(urls.view('atlas'));
    await atlas.concept('03').click();
    await expect(atlas.concept('03')).toHaveAttribute('aria-current', 'true');

    await shell.openFromMenu('proyecto');
    await shell.openFromMenu('atlas');
    await expect(atlas.concept('03')).toHaveAttribute('aria-current', 'true');

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('atlas');
    await expect(atlas.concept('01')).toHaveAttribute('aria-current', 'true');
    await expect(atlas.concept('03')).not.toHaveAttribute('aria-current', 'true');
  });

  test('the Systems simulation survives a hash navigation and is lost on a reload', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).not.toHaveCount(0);

    await shell.openFromMenu('proyecto');
    await shell.openFromMenu('sistemas');
    await expect(systems.traceEntries()).not.toHaveCount(0);

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('sistemas');
    await systems.openWorkshop('Una caché que aprende tus visitas');
    await expect(systems.workshopHeading('Una caché que aprende tus visitas')).toBeVisible();
    await expect(systems.traceEntries()).toHaveCount(0);
  });
});
```

### Tarea 4.4 · Los puentes del laboratorio con campaña y Sistemas (T008, C)

- **Crea:** `qa/e2e/specs/bridges.spec.ts` (9 pruebas).
- **Cubre:** FR-005, US1 escenarios 3 y 4, y el defecto conocido del bloqueo.
- **Escenarios:** el bloque de contexto de una misión (XP, tipo y enlace de regreso), la lista navegable de las seis misiones, el bloqueo de una misión sin habilitar y de un mundo bloqueado, una misión del mundo 2 abierta con el progreso de master, el contexto de Sistemas (núcleo y herramientas, con su lista de tres), Sistemas gana cuando el ejercicio es de los dos, y el bloqueo de campaña primero cuando no lo es (defecto conocido).

| Rotura | Archivo y cambio | Falla |
| --- | --- | --- |
| Un adaptador sin `exerciseContextHTML` (SC-006, contrato 1) | `frontend/campaign.js`: quitá `exerciseContextHTML,` del objeto `window.TallerCampaign` | 3 de esta spec («shows the context block…», «walks the six missions…» y «with the real progress of master…») y 28 en la red entera |
| El laboratorio prefiere el contexto de campaña | `frontend/lab.js`, en `exerciseHTML`: invertí el orden de `window.TallerSystems?.exerciseContextHTML(item.id, language) \|\| window.TallerCampaign?.exerciseContextHTML(item.id, language)` | 1: «Systems wins when the exercise belongs to both» |

**Compuerta y vuelta atrás:** como en 4.1. Commit: `test(front): los puentes del laboratorio con campaña y Sistemas`.

```ts
import { expect, test } from '../fixtures';
import { curriculumIds, frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

const title = (exerciseId: string) => curriculumIds.exercises[exerciseId].title;

test.describe('the lab inside a campaign mission', () => {
  test('shows the context block with the way back to the world', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-02'));

    await expect(lab.contextBlock()).toContainText('0/30 XP · Entrenamiento');
    await expect(lab.contextBlock()).toContainText('○ Pruebas ○ Predicción');
    await expect(lab.contextBackLink()).toHaveText('← Estación del robot');
    await expect(lab.contextBackLink()).toHaveAttribute(
      'href',
      urls.world('rust-world-1').slice(1),
    );
    await expect(lab.backButton()).toHaveText('← Volver al mapa');
  });

  test('walks the six missions of the world, not the 137 exercises', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-02'));
    await expect(lab.position()).toHaveText('1 / 6');
    await expect(lab.previousButton()).toBeDisabled();

    await lab.nextButton().click();

    await expect(lab.position()).toHaveText('2 / 6');
    await expect(lab.exerciseTitle()).toHaveText(title('rust-06'));
    await expect(lab.contextBlock()).toBeVisible();
  });

  test('a mission that is not open yet is replaced by the lock', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-103'));

    await expect(lab.campaignLockHeading()).toBeVisible();
    await expect(lab.campaignLockMapLink()).toHaveAttribute(
      'href',
      urls.world('rust-world-1').slice(1),
    );
    await expect(lab.runButton()).toHaveCount(0);
    await expect(lab.contextBlock()).toHaveCount(0);
  });

  test('a mission of a locked world is replaced by the lock', async ({ shell, lab, page }) => {
    await shell.goto(urls.campaignMission('rust-world-2', 'rust-18'));

    await expect(lab.campaignLockHeading()).toBeVisible();
    await expect(page.getByText('Completá «Estación del robot»', { exact: false })).toBeVisible();
  });

  test('with the real progress of master, a mission of world 2 is open', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.seed(frozenProgress);

    await shell.goto(urls.campaignMission('rust-world-2', 'rust-18'));

    await expect(lab.exerciseTitle()).toHaveText(title('rust-18'));
    await expect(lab.contextBackLink()).toHaveText('← Puerto de señales');
    await expect(lab.campaignLockHeading()).toHaveCount(0);
  });
});

test.describe('the lab inside a Systems workshop', () => {
  test('shows the context block of the core with the way back to the workshop', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.systemsCode('cache', 'rust-113'));

    await expect(lab.contextBlock()).toContainText('Núcleo del taller');
    await expect(lab.contextBlock()).toContainText('Tres pruebas para verificar el núcleo');
    await expect(lab.contextBackLink()).toHaveText('← Una caché que aprende tus visitas');
    await expect(lab.contextBackLink()).toHaveAttribute(
      'href',
      '?taller=cache&parte=build&lenguaje=rust#sistemas',
    );
    await expect(lab.backButton()).toHaveText('← Volver al taller');
  });

  test('walks the tools of the workshop and its core', async ({ shell, lab }) => {
    await shell.goto(urls.systemsCode('cache', 'rust-31'));

    await expect(lab.contextBlock()).toContainText('Herramienta previa');
    await expect(lab.position()).toHaveText('1 / 3');
    await lab.nextButton().click();
    await lab.nextButton().click();
    await expect(lab.position()).toHaveText('3 / 3');
    await expect(lab.exerciseTitle()).toHaveText(title('rust-113'));
    await expect(lab.nextButton()).toBeDisabled();
  });
});

test.describe('campaign and Systems together', () => {
  test('Systems wins when the exercise belongs to both', async ({ shell, lab }) => {
    // rust-22 is a mission of rust-world-1 and a tool of the "transforms" workshop.
    await shell.goto(
      '/?campana=rust-world-1&sistema=transforms&ejercicio=rust-22&paso=code#laboratorio',
    );

    await expect(lab.contextBlock()).toContainText('Herramienta previa');
    await expect(lab.contextBackLink()).toHaveText('← Coreografía de matrices');
    await expect(lab.position()).toHaveText('2 / 4');
    await expect(lab.backButton()).toHaveText('← Volver al taller');
  });

  test('KNOWN DEFECT (legacy-map §3.2): the campaign lock comes first when the exercise is not a mission of that world', async ({
    shell,
    lab,
  }) => {
    await shell.goto(
      '/?campana=rust-world-1&sistema=cache&ejercicio=rust-113&paso=code#laboratorio',
    );

    await expect(lab.campaignLockHeading()).toBeVisible();
    await expect(lab.contextBlock()).toHaveCount(0);
  });
});
```

### Tarea 4.5 · El ciclo con el compilador simulado (T009, C)

- **Crea:** `qa/e2e/specs/cycle.spec.ts` (8 pruebas).
- **Cubre:** FR-006, FR-009, US3 escenarios 1 a 3 y SC-004.
- **Escenarios:** una misión de campaña (`rust-02`, Rust) y un núcleo de Sistemas (`go-113`, Go), cada uno con los cuatro resultados: aprobado (la campaña cuenta 20 XP o aparece el sello de código al volver), prueba fallida, error de compilación y error de transporte (nada se marca y la pantalla dice qué pasó). Cada prueba comprueba que llegó un solo pedido al Playground doble. El error de transporte aborta el pedido: el navegador lo registra como `console.error` y la prueba lo espera con `expectIssue`.

| Rotura | Archivo y cambio | Falla |
| --- | --- | --- |
| Un marcador aprobado deja de reconocerse | `frontend/src/entities/exercise/model/run-outcome.ts`: `(PASS\|FAIL)` por `(PASSED\|FAIL)` en `MARKER_PATTERN` | 4: «passed» y «failedTest», en la misión y en el núcleo |
| Ejecutar ya no sincroniza campaña ni Sistemas | `frontend/lab.js`, en `runExercise`: quitá la llamada a `syncAfterRun({…})` que está antes de `} finally {` | 1: «passed: the campaign counts it» (falta el aviso «+20 XP…») |

**Compuerta y vuelta atrás:** como en 4.1. Commit: `test(front): el ciclo entre vistas con el compilador simulado`.

```ts
import { expect, test } from '../fixtures';
import {
  GO_113,
  RUST_02,
  type CompilerKind,
  type ExerciseUnderTest,
} from '../lib/compiler-results';
import { urls } from '../lib/urls';

const KINDS: CompilerKind[] = ['passed', 'failedTest', 'compileError', 'transportError'];

interface Review {
  heading: string;
  detail: string;
}

// What the student reads for each result. The texts are the Spanish copy of the lab (lab.js:
// reviewHTML and diagnose) and of the exercise (content/<language>/exercises/<id>/exercise.yaml).
const TRANSPORT: Review = {
  heading: 'No pude ejecutar esta vez.',
  detail: 'No se pudo conectar al Playground.',
};
const REVIEW: Record<string, Record<CompilerKind, Review>> = {
  [RUST_02.id]: {
    passed: {
      heading: 'La idea funciona en estos casos.',
      detail: 'Ahora la declaración anticipa las modificaciones.',
    },
    failedTest: {
      heading: '2 de 3: encontramos algo para explorar.',
      detail: 'Inicializá nivel con inicial.',
    },
    compileError: {
      heading: 'El programa nos dejó una pista.',
      detail: 'Estás intentando modificar un binding o acceder con mutabilidad',
    },
    transportError: TRANSPORT,
  },
  [GO_113.id]: {
    passed: {
      heading: 'La idea funciona en estos casos.',
      detail: 'La traza distingue actualización de recencia, expulsión y capacidad cero.',
    },
    failedTest: {
      heading: '2 de 3: encontramos algo para explorar.',
      detail: 'Contá los misses incluso si no insertás.',
    },
    compileError: {
      heading: 'El programa nos dejó una pista.',
      detail: 'Go detectó una variable local o un import que no se usa.',
    },
    transportError: TRANSPORT,
  },
};

function expectedReview(exercise: ExerciseUnderTest, kind: CompilerKind): Review {
  return REVIEW[exercise.id][kind];
}

test.describe('a campaign mission with the Rust Playground simulated', () => {
  for (const kind of KINDS) {
    test(`${kind}: ${kind === 'passed' ? 'the campaign counts it' : 'nothing is marked'}`, async ({
      shell,
      lab,
      campaign,
      compiler,
      pageIssues,
    }) => {
      if (kind === 'transportError')
        pageIssues.expectIssue(
          /Failed to load resource: net::ERR_FAILED/,
          'el doble aborta el pedido a propósito',
        );
      await compiler.answer(RUST_02, kind);
      await shell.goto(urls.campaignMission('rust-world-1', RUST_02.id, 'code'));

      await lab.runCode();

      const review = expectedReview(RUST_02, kind);
      await expect(lab.reviewHeading()).toHaveText(review.heading);
      await expect(lab.review()).toContainText(review.detail);
      expect(compiler.requests).toHaveLength(1);
      if (kind === 'passed')
        await expect(shell.toast).toHaveText('+20 XP. Tu progreso de campaña está actualizado.');

      await lab.contextBackLink().click();
      const mission = campaign.missionCard('Repará el contador inmutable');
      if (kind === 'passed') {
        await expect(mission).toContainText('20/30 XP');
        await expect(mission).toContainText('✓ Pruebas · 20');
      } else {
        await expect(mission).toContainText('0/30 XP');
        await expect(mission).toContainText('○ Pruebas · 20');
      }
    });
  }
});

test.describe('a Systems core with the Go Playground simulated', () => {
  for (const kind of KINDS) {
    test(`${kind}: ${kind === 'passed' ? 'the code seal appears' : 'no seal'}`, async ({
      shell,
      lab,
      systems,
      compiler,
      pageIssues,
    }) => {
      if (kind === 'transportError')
        pageIssues.expectIssue(
          /Failed to load resource: net::ERR_FAILED/,
          'el doble aborta el pedido a propósito',
        );
      await compiler.answer(GO_113, kind);
      await shell.goto(urls.systemsCode('cache', GO_113.id));

      await lab.runCode();

      const review = expectedReview(GO_113, kind);
      await expect(lab.reviewHeading()).toHaveText(review.heading);
      await expect(lab.review()).toContainText(review.detail);
      expect(compiler.requests).toHaveLength(1);

      await lab.contextBackLink().click();
      const codeSeal = systems.seals().locator('span', { hasText: 'Código verificado' });
      if (kind === 'passed') await expect(codeSeal).toContainText('✓');
      else await expect(codeSeal).not.toContainText('✓');
    });
  }
});
```

### Tarea 4.6 · El arranque con progreso y la persistencia (T010, P)

- **Crea:** `qa/e2e/specs/startup-storage.spec.ts` (4 pruebas).
- **Cubre:** FR-007, FR-008, SC-003 y US2.
- **Escenarios:** con las cuatro claves de master sembradas, las ocho vistas no escriben (ni una llamada a `setItem` o `removeItem`), el texto de las cuatro claves no cambia, no hay claves `:respaldo` y el aviso queda vacío; con el almacenamiento bloqueado, el taller arranca sin errores y muestra el aviso y el pie de hoy; un paso del recorrido, el borrador del laboratorio y una observación y una nota de Sistemas sobreviven a una recarga desde un navegador vacío; y la respuesta a un checkpoint de campaña sobrevive a una recarga con sólo el almacén del laboratorio sembrado.

| Rotura | Archivo y cambio | Falla |
| --- | --- | --- |
| El arranque escribe en `localStorage` (SC-006, contrato 3) | `frontend/app.js`: agregá `save();` antes del `render();` que cierra el arranque | 1: «writes nothing, makes no backup and shows no notice in the eight views» |
| El motor de campaña persiste al iniciar | `frontend/src/entities/campaign/model/create-campaign-engine.ts`, en `init`: agregá `persist();` antes del `return` | 1: la misma |
| El aviso de almacenamiento bloqueado cambia | `frontend/app.js`, en `loadNoticeFor`: cambiá el texto «No se pudo leer o guardar el avance. Podés exportarlo al terminar.» | 1: «starts and shows the notice and the footer of today» |

**Compuerta y vuelta atrás:** como en 4.1. Commit: `test(front): arranque con el progreso de master y persistencia de los cuatro almacenes`.

```ts
import { expect, test } from '../fixtures';
import { frozenProgress, type StorageKey } from '../lib/curriculum';
import { urls, type View } from '../lib/urls';

const VIEWS: View[] = [
  'recorrido',
  'biblioteca',
  'proyecto',
  'metodo',
  'atlas',
  'campana',
  'sistemas',
  'laboratorio',
];
const STORAGE_KEYS = Object.keys(frozenProgress) as StorageKey[];

test.describe('the start with the real progress of master', () => {
  test('writes nothing, makes no backup and shows no notice in the eight views', async ({
    shell,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    // Hash navigations only: a reload would lose the record of the writes.
    for (const view of VIEWS) {
      await shell.goto(urls.view(view));
      await expect(shell.heading(view)).toBeVisible();
    }

    expect(await storage.writes()).toEqual([]);
    const stored = await storage.snapshot();
    for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
    expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
    await expect(shell.toast).toHaveText('');
    await expect(shell.saveStatus('Guardado en este navegador')).toBeVisible();
  });
});

test.describe('the start with the storage blocked', () => {
  test('starts and shows the notice and the footer of today', async ({ shell, storage }) => {
    await storage.block();

    await shell.goto(urls.view('recorrido'));

    await expect(shell.heading('recorrido')).toBeVisible();
    await expect(shell.toast).toHaveText(
      'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
    );
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
    for (const view of VIEWS) {
      await shell.goto(urls.view(view));
      await expect(shell.heading(view)).toBeVisible();
    }
  });
});

test.describe('an action in each store survives a reload', () => {
  test('route, lab and Systems, from an empty browser', async ({ shell, lab, systems, page }) => {
    await shell.goto(urls.view('recorrido'));
    const step = page.getByRole('checkbox', { name: /^Marcar como completado/ }).first();
    await step.check();

    await shell.goto(urls.exercise('rust-04', 'code'));
    await lab.writeDraft('rust', '// borrador de la prueba');

    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await systems.part('ship').click();
    await systems.note().fill('mi nota de la prueba');

    await page.reload();
    await expect(systems.note()).toHaveValue('mi nota de la prueba');
    await shell.goto(urls.exercise('rust-04', 'code'));
    await expect(lab.editor('rust')).toContainText('// borrador de la prueba');
    await shell.goto(urls.view('recorrido'));
    await expect(
      page.getByRole('checkbox', { name: /^Marcar como completado/ }).first(),
    ).toBeChecked();
  });

  test('campaign: the answer to a checkpoint, with the missions of world 1 resolved', async ({
    shell,
    campaign,
    page,
    storage,
  }) => {
    // Only the lab store is seeded: its solved missions are what opens the checkpoint.
    await storage.seed({ 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] });
    await shell.goto(urls.world('rust-world-1'));
    await campaign.checkpointOption('B').click();
    await expect(campaign.checkpointOption('B')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();

    await expect(campaign.checkpointOption('B')).toHaveAttribute('aria-pressed', 'true');
  });
});
```

### Tarea 4.7 · El contrato de CSS (T011, S)

- **Crea:** `qa/e2e/specs/css-contract.spec.ts` (22 pruebas).
- **Cubre:** FR-012, SC-008 y US6.
- **Escenarios:** pruebas para cada una de las nueve reglas que el mapa (§7) lista como cruzadas entre hojas y para una décima que el mapa omite (R10), con los valores de [data-model.md](./data-model.md), §7, en los anchos donde cambia una media query (981, 850, 650 y 590 px); más el movimiento reducido encendido y apagado, y la animación del indicador de ejecución (`compiler.hold` deja el pedido sin responder para que el indicador siga a la vista).
- **La décima regla (R10).** `.quest-direct-lock` está en `campaign.css` y la dibuja el laboratorio: `lockedExerciseHTML` reemplaza el host cuando la misión no está abierta. El mapa no la lista, pero F6 borra `campaign.css` antes de que F7 retire ese bloque, y sin esta prueba la regla desaparecería sin aviso. Se mide con `?campana=rust-world-1&ejercicio=rust-103#laboratorio` y el progreso vacío (el mundo está abierto y la misión no), a un solo ancho: sus reglas no tienen media query y los valores no cambiaron en 1 280, 981, 850, 650 y 590 px. Un recorrido de las clases que dibuja cada vista contra las hojas, hecho al planificar, no encontró otra regla que la hoja de una vista defina para otra ([research.md](./research.md), R9, con lo que se dejó afuera y por qué).
- **Regla muerta.** La del último enlace de la navegación (R8) repite el valor inicial: su prueba sólo falla si la copia que gana (la de `campaign.css`) cambia de valor. Borrar cualquiera de las dos copias, o cambiar sólo la de `lab.css`, no se detecta, y es lo esperado: no cambia nada que el alumno vea.

| Regla | Archivo y cambio | Falla |
| --- | --- | --- |
| R1 `.lab-nav-count` | `lab.css`: `background: var(--accent);` por `var(--ink)` en `.lab-nav-count` | 1: «the counter of the menu entry» |
| R2 `.navigation` | `lab.css`, en `@media (max-width: 850px)`: `.navigation { gap: 3px; }` por `4px` | 3: R2 a 850, 650 y 590 px |
| R2 `.navigation .nav-symbol` | `lab.css`, en `@media (max-width: 590px)`: `.navigation .nav-symbol { font-size: 14px; }` por `15px` | 1: R2 a 590 px |
| R3 `.sidebar` y `.sidebar-bottom` | `lab.css`, en `@media (min-width: 981px)`: `.sidebar-bottom { padding-top: 30px; }` por `31px` | 1: R3 a 981 px |
| R4 `touch-action` | `lab.css`: `touch-action: manipulation;` por `auto` | 1: R4 |
| R5 `.sr-only` | `lab.css`: `.sr-only { width: 1px; }` por `2px` | 1: R5 |
| R6 `.quest-banner` | `campaign.css`: `padding: 20px 24px;` por `21px 24px` en `.quest-banner` | 2: R6 a 981 y 650 px |
| R7 `.quest-lab-context` | `campaign.css`: `gap: 13px;` por `14px` en `.quest-lab-context` | 1: R7 a 981 px (a 650 px otra regla fija el `gap`) |
| R8 `.navigation a:last-child` | `campaign.css`, en `@media (max-width: 650px)`: `grid-column: auto;` por `grid-column: 1 / -1;` | 2: R8 a 650 y 590 px |
| R9 `.lab-empty` | `lab.css`: `.lab-empty { padding: 40px; }` por `41px` | 1: R9 |
| R10 `.quest-direct-lock` | `campaign.css`: `.quest-direct-lock h1 { font-size: 40px; … }` por `41px` | 1: «the lock of a mission that is not open yet» |
| Movimiento reducido | `styles.css`, en `@media (prefers-reduced-motion: reduce)`: quitá `transition: none !important;` | 1: «transitions and smooth scrolling are off» |
| Indicador de ejecución | `lab.css`, en `@media (prefers-reduced-motion: reduce)`: `.lab-spinner { animation: none; }` por `animation: lab-spin 0.8s linear infinite;` | 1: «the spinner animation is none» |

La misma prueba de R10 también falla con el color de `.quest-direct-lock h1 em` (`var(--accent)` por `var(--muted)`), con el tamaño de `p` y `li` (de 13 a 14 px), con el margen de `ul` (`25px 0` por `26px 0`) y con el borrado del bloque entero: las cinco variantes se verificaron.

**Compuerta y vuelta atrás:** como en 4.1. Commit: `test(front): contrato de CSS de las diez reglas que cruzan hojas`.

```ts
import { expect, test } from '../fixtures';
import { RUST_02 } from '../lib/compiler-results';
import { computedStyle } from '../lib/computed-style';
import { urls } from '../lib/urls';

// The nine rules that legacy-map.md §7 lists as crossing sheets, and a tenth (R10) that the map leaves
// out. The values are what the CSS says today (the file and rule are named on each test); F2 moves
// the rules and the values must not change. The widths are the ones where a media query starts or
// stops matching.
const HEIGHT = 900;

test.describe('R1 · .lab-nav-count (lab.css)', () => {
  test('the counter of the menu entry', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    expect(
      await computedStyle(page.locator('.lab-nav-count'), [
        'background-color',
        'color',
        'border-radius',
        'padding',
        'opacity',
      ]),
    ).toEqual({
      'background-color': 'rgb(172, 72, 41)',
      color: 'rgb(255, 249, 239)',
      'border-radius': '9px',
      padding: '1px 6px',
      opacity: '1',
    });
  });

  test('the counter of the current entry', async ({ shell, page }) => {
    await shell.goto(urls.view('laboratorio'));
    expect(
      await computedStyle(page.locator('.lab-nav-count'), ['background-color', 'color']),
    ).toEqual({
      'background-color': 'rgb(212, 162, 128)',
      color: 'rgb(34, 43, 35)',
    });
  });
});

test.describe('R2 · .navigation (lab.css, at 850 px and at 590 px)', () => {
  const rows: {
    width: number;
    navigation: Record<string, string>;
    link: Record<string, string>;
    count: string;
    symbol: string;
  }[] = [
    {
      width: 981,
      navigation: { display: 'flex', 'flex-direction': 'column', gap: '8px' },
      link: { 'font-size': '13px', padding: '11px 10px', gap: '12px', 'min-height': 'auto' },
      count: 'block',
      symbol: '20px',
    },
    {
      width: 850,
      navigation: { display: 'flex', 'flex-direction': 'row', gap: '3px' },
      link: { 'font-size': '10px', padding: '8px', gap: '6px', 'min-height': 'auto' },
      count: 'none',
      symbol: '16px',
    },
    {
      width: 650,
      navigation: { display: 'flex', 'flex-direction': 'row', gap: '3px' },
      link: { 'font-size': '10px', padding: '8px', gap: '6px', 'min-height': 'auto' },
      count: 'none',
      symbol: '16px',
    },
    {
      width: 590,
      navigation: { display: 'grid', 'flex-direction': 'row', gap: '3px' },
      link: { 'font-size': '10px', padding: '8px 5px', gap: '5px', 'min-height': '40px' },
      count: 'none',
      symbol: '14px',
    },
  ];
  for (const row of rows) {
    test(`at ${row.width} px`, async ({ shell, page }) => {
      await page.setViewportSize({ width: row.width, height: HEIGHT });
      await shell.goto(urls.view('laboratorio'));

      expect(await computedStyle(page.locator('.navigation'), Object.keys(row.navigation))).toEqual(
        row.navigation,
      );
      expect(await computedStyle(page.locator('.navigation a'), Object.keys(row.link))).toEqual(
        row.link,
      );
      expect(await computedStyle(page.locator('.navigation .nav-count'), ['display'])).toEqual({
        display: row.count,
      });
      expect(await computedStyle(page.locator('.navigation .nav-symbol'), ['font-size'])).toEqual({
        'font-size': row.symbol,
      });
      if (row.width === 590) {
        const columns = await computedStyle(page.locator('.navigation'), ['grid-template-columns']);
        expect(columns['grid-template-columns'].split(' ')).toHaveLength(3);
      }
    });
  }
});

test.describe('R3 · .sidebar and .sidebar-bottom (lab.css, from 981 px)', () => {
  test('at 981 px', async ({ shell, page }) => {
    await page.setViewportSize({ width: 981, height: HEIGHT });
    await shell.goto(urls.view('recorrido'));

    expect(await computedStyle(page.locator('.sidebar'), ['overflow-y', 'min-height'])).toEqual({
      'overflow-y': 'auto',
      'min-height': '0px',
    });
    expect(await computedStyle(page.locator('.navigation'), ['flex-shrink'])).toEqual({
      'flex-shrink': '0',
    });
    expect(
      await computedStyle(page.locator('.sidebar-bottom'), ['padding-top', 'display']),
    ).toEqual({ 'padding-top': '30px', display: 'block' });
  });

  test('at 850 px the rules no longer apply', async ({ shell, page }) => {
    await page.setViewportSize({ width: 850, height: HEIGHT });
    await shell.goto(urls.view('recorrido'));

    expect(await computedStyle(page.locator('.sidebar'), ['overflow-y'])).toEqual({
      'overflow-y': 'visible',
    });
    expect(
      await computedStyle(page.locator('.sidebar-bottom'), ['padding-top', 'display']),
    ).toEqual({ 'padding-top': '42px', display: 'none' });
  });
});

test.describe('R4 · touch-action (lab.css, global)', () => {
  test('buttons, links, inputs, selects and summaries', async ({ shell, page }) => {
    await shell.goto(urls.view('biblioteca'));
    const touch = ['touch-action'];
    const manipulation = { 'touch-action': 'manipulation' };

    expect(await computedStyle(page.getByRole('button').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.getByRole('link').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.getByRole('searchbox'), touch)).toEqual(manipulation);
    expect(await computedStyle(page.getByRole('combobox').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.locator('summary').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.locator('main div').first(), touch)).toEqual({
      'touch-action': 'auto',
    });
  });
});

test.describe('R5 · .sr-only (lab.css)', () => {
  test('hides its text from the eye and keeps it for the reader', async ({ shell, page }) => {
    await shell.goto(urls.view('biblioteca'));

    expect(
      await computedStyle(page.locator('.sr-only'), [
        'position',
        'width',
        'height',
        'padding',
        'margin',
        'overflow',
        'clip',
        'white-space',
        'border-top-width',
      ]),
    ).toEqual({
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0px',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0px, 0px, 0px, 0px)',
      'white-space': 'nowrap',
      'border-top-width': '0px',
    });
  });
});

test.describe('R6 · .quest-banner (campaign.css)', () => {
  const rows: [number, string, string][] = [
    [981, 'flex', '0px'],
    [650, 'block', '14px'],
  ];
  for (const [width, display, buttonMargin] of rows) {
    test(`in the lab map at ${width} px`, async ({ shell, page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await shell.goto(urls.view('laboratorio'));

      expect(
        await computedStyle(page.locator('.quest-banner'), [
          'display',
          'justify-content',
          'align-items',
          'gap',
          'padding',
          'border-radius',
          'margin',
        ]),
      ).toEqual({
        display,
        'justify-content': 'space-between',
        'align-items': 'center',
        gap: '20px',
        padding: '20px 24px',
        'border-radius': '6px',
        margin: '25px 0px',
      });
      expect(
        await computedStyle(page.locator('.quest-banner .button'), ['flex-shrink', 'margin-top']),
      ).toEqual({ 'flex-shrink': '0', 'margin-top': buttonMargin });
    });
  }
});

test.describe('R7 · .quest-lab-context (campaign.css)', () => {
  const rows: [number, string, string, string][] = [
    [981, '13px', '10px', '18px'],
    [650, '8px', '9px', '16.2px'],
  ];
  for (const [width, gap, fontSize, lineHeight] of rows) {
    test(`in a campaign mission at ${width} px`, async ({ shell, page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await shell.goto(urls.campaignMission('rust-world-1', 'rust-02'));

      expect(
        await computedStyle(page.locator('.quest-lab-context'), [
          'display',
          'flex-wrap',
          'gap',
          'justify-content',
          'padding',
          'border-radius',
          'margin',
          'font-size',
          'line-height',
          'background-color',
        ]),
      ).toEqual({
        display: 'flex',
        'flex-wrap': 'wrap',
        gap,
        'justify-content': 'space-between',
        padding: '14px 17px',
        'border-radius': '5px',
        margin: '0px 0px 20px',
        'font-size': fontSize,
        'line-height': lineHeight,
        'background-color': 'rgb(232, 236, 223)',
      });
      expect(
        await computedStyle(page.locator('.quest-lab-context a'), ['color', 'font-weight']),
      ).toEqual({ color: 'rgb(172, 72, 41)', 'font-weight': '600' });
    });
  }
});

test.describe('R8 · .navigation a:last-child (campaign.css, at 650 px; lab.css, at 590 px)', () => {
  // Dead CSS, found by F1: both copies of the rule say `grid-column: auto`, the initial value, and no
  // rule gives the menu links another column. Deleting them changes nothing the student sees, and
  // this test cannot notice it. It fails only if the winning copy (campaign.css, which loads after
  // lab.css) gets another value.
  for (const width of [650, 590]) {
    test(`at ${width} px the last link keeps its automatic column`, async ({ shell, page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await shell.goto(urls.view('recorrido'));

      expect(
        await computedStyle(page.locator('.navigation a:last-child'), [
          'grid-column-start',
          'grid-column-end',
        ]),
      ).toEqual({
        'grid-column-start': 'auto',
        'grid-column-end': 'auto',
      });
    });
  }
});

test.describe('R9 · .lab-empty (lab.css, used by Systems)', () => {
  test('the empty state of the catalog', async ({ shell, systems, page }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.search().fill('zzzz');
    await expect(systems.emptyCatalog()).toBeVisible();

    expect(
      await computedStyle(page.locator('.lab-empty'), [
        'grid-column-start',
        'grid-column-end',
        'text-align',
        'padding',
        'border-top-style',
        'border-top-width',
        'border-top-left-radius',
      ]),
    ).toEqual({
      'grid-column-start': '1',
      'grid-column-end': '-1',
      'text-align': 'center',
      padding: '40px',
      'border-top-style': 'dashed',
      'border-top-width': '1px',
      'border-top-left-radius': '5px',
    });
    expect(await computedStyle(page.locator('.lab-empty h2'), ['font-size'])).toEqual({
      'font-size': '23px',
    });
    expect(await computedStyle(page.locator('.lab-empty p'), ['font-size'])).toEqual({
      'font-size': '12px',
    });
  });
});

test.describe('R10 · .quest-direct-lock (campaign.css, drawn inside the lab)', () => {
  // legacy-map.md §7 leaves this rule out: campaign.css styles it and the lab draws it. Deleting
  // campaign.css (F6) before the lab drops the lock bridge (F7) would unstyle it without any notice.
  test('the lock of a mission that is not open yet', async ({ shell, lab, page }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-103'));
    await expect(lab.campaignLockHeading()).toBeVisible();

    expect(
      await computedStyle(page.locator('.quest-direct-lock h1'), [
        'font-size',
        'letter-spacing',
        'line-height',
      ]),
    ).toEqual({ 'font-size': '40px', 'letter-spacing': '-1.4px', 'line-height': '44px' });
    expect(
      await computedStyle(page.locator('.quest-direct-lock h1 em'), [
        'font-family',
        'font-weight',
        'color',
      ]),
    ).toEqual({
      'font-family': 'Georgia, "Times New Roman", serif',
      'font-weight': '400',
      color: 'rgb(172, 72, 41)',
    });
    for (const text of ['p', 'li']) {
      expect(
        await computedStyle(page.locator(`.quest-direct-lock ${text}`), [
          'font-size',
          'line-height',
        ]),
      ).toEqual({ 'font-size': '13px', 'line-height': '24.7px' });
    }
    expect(await computedStyle(page.locator('.quest-direct-lock ul'), ['margin'])).toEqual({
      margin: '25px 0px',
    });
  });
});

test.describe('reduced motion (styles.css)', () => {
  test.describe('when the student asks for it', () => {
    test.use({ reducedMotion: 'reduce' });

    test('transitions and smooth scrolling are off', async ({ shell, page }) => {
      await shell.goto(urls.view('campana'));

      expect(await computedStyle(page.locator('html'), ['scroll-behavior'])).toEqual({
        'scroll-behavior': 'auto',
      });
      expect(
        await computedStyle(page.locator('.button').first(), [
          'transition-property',
          'transition-duration',
        ]),
      ).toEqual({ 'transition-property': 'none', 'transition-duration': '0s' });
      expect(await computedStyle(page.locator('.world-node'), ['transition-property'])).toEqual({
        'transition-property': 'none',
      });
    });
  });

  test.describe('when the student does not', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the page scrolls smoothly and the buttons and world nodes have their transitions', async ({
      shell,
      page,
    }) => {
      await shell.goto(urls.view('campana'));

      expect(await computedStyle(page.locator('html'), ['scroll-behavior'])).toEqual({
        'scroll-behavior': 'smooth',
      });
      expect(await computedStyle(page.locator('.button').first(), ['transition-property'])).toEqual(
        { 'transition-property': 'background' },
      );
      expect(
        await computedStyle(page.locator('.world-node').first(), ['transition-property']),
      ).toEqual({ 'transition-property': 'transform, box-shadow' });
    });
  });
});

test.describe('reduced motion and the run indicator (lab.css)', () => {
  const rows: ['reduce' | 'no-preference', string][] = [
    ['reduce', 'none'],
    ['no-preference', 'lab-spin'],
  ];
  for (const [motion, animation] of rows) {
    test.describe(`with ${motion}`, () => {
      test.use({ reducedMotion: motion });

      test(`the spinner animation is ${animation}`, async ({ shell, lab, compiler, page }) => {
        await compiler.hold(RUST_02);
        await shell.goto(urls.exercise(RUST_02.id, 'code'));

        await lab.runCode();

        await expect(page.locator('.lab-spinner').first()).toBeVisible();
        expect(
          await computedStyle(page.locator('.lab-spinner').first(), ['animation-name']),
        ).toEqual({
          'animation-name': animation,
        });
      });
    });
  }
});
```

## 5. Cierre (coordinador K, onda 3)

**Cubre:** FR-020 a FR-023, SC-005 a SC-007 y SC-009; US5.

**Entrega:** los scripts y el job de la CI, la documentación al día, la evidencia de las roturas y de las cinco corridas, y la compuerta final con el PR.

### Tarea 5.1 · Los scripts de Vitest y el paso de la CI (T012)

- **Cambia:** `package.json` (`test`, `test:unit` y `pretest:unit`) y `.github/workflows/ci.yml`.
- **Entrega:** `npm run test:unit` y un `npm test` que corre los 30 checks y Vitest; y el job `front` que instala el navegador, corre la red y sube el informe si falla.

**Pasos:**

1. `npm run test:unit` falla con «Missing script: "test:unit"». Es la prueba de este paso.
2. Agregá los tres scripts (abajo). `npm run test:unit` corre `npm run curriculum` y después Vitest: 2 archivos y 3 pruebas. `npm test` corre los 30 checks y después Vitest.
3. Agregá los pasos al job `front`, al final y en este orden (abajo). Comprobá que el YAML se lee: `node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"`.
4. Dos commits: `build(front): npm test corre las specs de Vitest y suma npm run test:unit` y `ci(front): el job front corre la red de punta a punta y sube el informe si falla`.

**Compuerta:** `npm run test:unit`, `npm test`, `npm run lint` y `npm run format:check` en verde. El job real se comprueba en T016, con el PR.

**Vuelta atrás:** revertí cada commit por separado; el de la CI no afecta a los otros dos jobs.

**Sin caché del navegador.** El ADR 0008 y la spec lo dejan afuera hasta medir: la documentación de Playwright lo desaconseja: restaurar la caché tarda lo mismo que bajar los binarios, y las dependencias del sistema no se pueden cachear (consultada el 2026-10-05). El diseño ya está listo para aplicarlo si T015 mide que la instalación domina el job: [research.md](./research.md), R13.

```diff
-    "test": "node qa/run-checks.ts",
+    "test": "node qa/run-checks.ts && vitest run --config frontend/vitest.config.ts",
+    "test:unit": "vitest run --config frontend/vitest.config.ts",
+    "pretest:unit": "npm run curriculum",
```

`pretest:unit` existe porque el catálogo del Atlas importa `build/curriculum.json` y una corrida suelta de Vitest lo necesita generado (ADR 0008). Las dos specs de F1 no lo importan, pero las que siguen sí.

El paso de la CI, al final del job `front`:

```diff
       - run: npm run lint
       - run: npm run format:check
+      - run: npm run test:e2e:install -- --with-deps
+      - id: e2e
+        run: npm run test:e2e
+      - if: failure() && steps.e2e.outcome == 'failure'
+        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
+        with:
+          name: playwright-report
+          path: |
+            playwright-report/
+            test-results/
+          retention-days: 7
```

El orden importa: `npm run build` ya corrió antes (la red necesita `dist/`), y `npm test`, `lint` y `format:check` van antes porque fallan más rápido. El paso `--with-deps` instala los paquetes de sistema con `apt` en el runner.

### Tarea 5.2 · La documentación al día (T013)

- **Cambia:** `AGENTS.md`, `qa/AGENTS.md`, `docs/agent-skills.md` y `docs/adr/0008-pruebas-del-front.md`.

**Pasos:**

1. `AGENTS.md`: en el párrafo de las pruebas del front, sacá la frase «Esos tres comandos los trae F1 (…): hasta que se integre, no existen.»
2. `qa/AGENTS.md`, sección «Pruebas del front (ADR 0008)»:
   - reemplazá «Las trae F1 (…): hasta que se integre, `qa/e2e/` y estos comandos no existen.» por cómo se corre: `npm run build && npm run test:e2e`, una spec con `npm run test:e2e -- specs/<archivo>`, `E2E_PORT=<puerto>` para dos worktrees a la vez y `npm run test:e2e:install` una vez por máquina;
   - sumá a la regla de los localizadores la excepción de `css-contract.spec.ts`, donde el selector de CSS es lo que se prueba;
   - en «Red de seguridad para refactors», cambiá «marcados como `DEFECTO CONOCIDO`» por «`KNOWN DEFECT` en el nombre de la prueba», que es el marcador en inglés que usan las pruebas nuevas.
3. `docs/agent-skills.md`, el «Alcance»: reemplazá «Hasta que F1 se integre, las specs nuevas no tienen dónde correr.» por lo que quedó instalado y cómo se corre.
4. `docs/adr/0008-pruebas-del-front.md`: el estado pasa a «aceptada por el usuario el 2026-10-05, sin enmiendas; precisada con lo que midió la implementación de F1 (ver «Enmienda»)» y se agrega, al final, la sección «Enmienda (2026-10-05, plan de F1)». Lleva una viñeta por cada fila de la tabla «Dónde el plan se aparta del ADR 0008» de este plan: lo que decía el ADR, lo que hace la implementación y su motivo (la columna «Evidencia»). No cambia ninguna decisión: es el mismo formato que la «Enmienda» del ADR 0005.
5. Comprobá rutas, comandos y enlaces locales de los cuatro archivos, y `git diff --check`.
6. Un commit: `docs(front): los comandos de las pruebas del front ya existen y el ADR 0008 anota lo que midió F1`.

**Compuerta:** los comandos que citan los archivos corren tal cual; la «Enmienda» tiene nueve viñetas, una por fila de la tabla; `npm run format:check` no toca Markdown (`.prettierignore` lo excluye).

**Vuelta atrás:** revertí el commit; los comandos vuelven a figurar como futuros y el ADR, como estaba.

### Tarea 5.3 · Las roturas deliberadas sobre el árbol integrado (T014)

- **No crea ni cambia archivos de producción:** cada rotura se hace en una copia de trabajo y se deshace.

**Pasos:**

1. Corré, sobre el árbol con todo integrado, las roturas de las tareas anteriores con el asistente descartable de [quickstart.md](./quickstart.md): las tres de SC-006 (T008, T006 y T010, la primera de cada una), las diez reglas de SC-008 (T011), las dos de las guardas (T003) y las dos de Vitest (T004).
2. Cada rotura tiene que fallar en la spec que dice su tarea. Una que no falle (salvo la regla muerta R8, ya explicada) es un hueco de la red: informalo, no lo ajustes.
3. El resultado (rotura y pruebas que fallan) va en la descripción del PR. Es la evidencia de SC-006 (3 de 3) y de SC-008 (10 de 10, con R8 detectada sólo por un cambio de valor).

**Compuerta:** 3 de 3 y 10 de 10, más las cuatro de las guardas y de Vitest.

**Verificado al planificar:** las 31 roturas se detectaron en la spec esperada, y también las cuatro variantes de más de R10 (el color, el tamaño de `p` y `li`, el margen de `ul` y el borrado del bloque); las dos variantes de R8 que no se detectan (borrar la regla y cambiar sólo la copia de `lab.css`) son las previstas.

### Tarea 5.4 · Cinco corridas seguidas y medición (T015)

**Pasos:**

1. `npm run build && npm run test:e2e -- --repeat-each=5 --retries=0` pasa: 530 de 530 (106 pruebas, cinco veces, sin reintentos). Es SC-007.
2. Medí y anotá, en «Estado y evidencia» de la hoja de ruta del front: el tiempo de la suite en local, el de `CI=1 npm run test:e2e` (un worker) y, con el primer PR, el tiempo del paso `test:e2e:install`, el del paso `test:e2e` y el del job `front` entero.
3. Si el paso de instalación del navegador pasa de la mitad del tiempo del job, aplicá el diseño de caché de [research.md](./research.md) (R13) en un commit aparte. Si no, la caché queda afuera, como dice el ADR.

**Compuerta:** las cinco corridas en verde y las medidas anotadas. Una prueba que falle en alguna de las cinco es una prueba inestable: se arregla con una espera por aserción, no con un reintento.

### Tarea 5.5 · Compuerta final y PR (T016)

**Pasos:**

1. Desde la raíz, con todo integrado: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check`.
2. Producción intacta (SC-005, FR-022): el comando siguiente no imprime nada, sea cual sea la base de la rama.

   ```sh
   git diff --name-only <base>..HEAD \
     | grep -E '^(frontend/[^/]+\.(js|css)|frontend/src/|content/|docker/|backend/|frontend/Dockerfile)' \
     | grep -v -E '^frontend/src/(app/engine-init-order|entities/guide/model/route-store-instances)\.spec\.ts$'
   ```

3. La imagen web sigue construyendo (`frontend/Dockerfile` corre `npm run build && npm test && npm run lint && npm run format:check`): `docker compose build taller`. Sin verificar al planificar.
4. PR, con título y descripción en inglés. Título sugerido: `test(front): add the end-to-end safety net for the React port`. La descripción cuenta el problema completo: nada probaba los enlaces, las recargas ni los puentes del front legacy; qué suma F1 (la red, las guardas, las dos specs de Vitest y los scripts) y que no toca producción; cómo se verificó (los comandos de arriba, las roturas y las cinco corridas); y qué queda pendiente (F2, el ingreso, la caché del navegador si la medición lo pide).
5. Con el PR en la CI: el job `front` pasa con los pasos nuevos. Anotá su tiempo (T015).
6. Al entregar, la hoja de ruta pasa F1 a «Entregado» con el PR, el commit y lo que se ejecutó.

**Compuerta:** los tres jobs de la CI en verde (`front`, `api` y `executor`).

**Vuelta atrás:** el PR se revierte entero; F1 no cambia producción y su salida son archivos nuevos y líneas de configuración.

## Cobertura de requisitos

| Requisito | Tareas | Notas |
| --- | --- | --- |
| FR-001 | T002 | `vite preview` sirve el `dist/` entero, en el Chrome Headless Shell |
| FR-002 | T005 | las ocho vistas y los siete enlaces de hash |
| FR-003 | T006 | las seis formas de URL con query |
| FR-004 | T007 | los 11 enlaces, con el marcador en `window`, y el estado que se pierde |
| FR-005 | T008 | contexto, bloqueo, regreso, lista y prioridad |
| FR-006 | T009 | misión de campaña y núcleo de Sistemas, con los cuatro resultados |
| FR-007 | T010 | arranque con el progreso de master y con el almacenamiento bloqueado |
| FR-008 | T010 | recorrido, laboratorio, Sistemas y campaña (con el laboratorio sembrado) |
| FR-009 | T003, T009 | los dobles de `compiler` y la guarda de `strictNetwork` |
| FR-010 | T003 | Page Objects del shell, el laboratorio, campaña, Sistemas y el Atlas |
| FR-011 | T003 | `pageIssues`, la lista blanca y `expectIssue`; `guards.spec.ts` los prueba |
| FR-012 | T011 | las diez reglas (nueve del mapa y `.quest-direct-lock`), el movimiento reducido y el indicador de ejecución |
| FR-013 | — | es un límite de alcance: cada port abre con los E2E de su vista |
| FR-014 | T004, T005, T008, T011 | cinco pruebas `KNOWN DEFECT`, y la regla muerta de CSS anotada en su spec |
| FR-015 | T003, T006, T007 | valores de afuera; `page.clock` en el temporizador |
| FR-016 | T004 | `route-store-instances.spec.ts` |
| FR-017 | T004 | `engine-init-order.spec.ts` |
| FR-018 | T004, T016 | las dos specs pasan sin tocar producción |
| FR-019 | T002 | el mensaje «Falta dist/index.html…» |
| FR-020 | T012 | `npm test` corre Vitest; la red queda afuera |
| FR-021 | T012 | el paso de la CI, con el informe si falla |
| FR-022 | T016 | el comando de producción intacta |
| FR-023 | T013 | los comandos reales en `AGENTS.md` y `qa/AGENTS.md`; además, la «Enmienda» del ADR 0008 |
| FR-024 | T001 | las descargas autorizadas |
| SC-001 | T005, T006 | 8 vistas y 6 formas de URL: 14 de 14 |
| SC-002 | T007 | 11 de 11 enlaces con el resultado determinado |
| SC-003 | T010 | cuatro claves idénticas, sin `:respaldo` y sin aviso |
| SC-004 | T003, T009 | cero pedidos a los Playgrounds públicos |
| SC-005 | T004, T016 | dos specs en verde y cero archivos de producción |
| SC-006 | T014 | tres roturas, una por contrato: 3 de 3 |
| SC-007 | T015 | cinco corridas sin reintentos; tiempos medidos |
| SC-008 | T011, T014 | diez reglas: 10 de 10 (R8 sólo por cambio de valor) |
| SC-009 | T016 | build, test, lint, format, test:e2e y diff-check, en local y en la CI |

Historias: US1 en T005 a T008, US2 en T010, US3 en T003 y T009, US4 en T004, US5 en T001, T002 y T012 a T016, y US6 en T011.

## Descargas y permisos

| Qué | Origen y tamaño | Cuándo | Quién |
| --- | --- | --- | --- |
| `vitest` 5.0.3 y `@playwright/test` 1.63.0 | registro de npm; 19 paquetes, unos 22,4 MB desempaquetados y 5,0 MB comprimidos (estimación del ADR 0008) | T001. Autorizado por el usuario el 2026-10-05 | K |
| Chrome Headless Shell 153.0.8010.12 y ffmpeg | CDN de Playwright; 122,2 MB (`--only-shell chromium`) | T001. Autorizado por el usuario el 2026-10-05 | K |
| El navegador y los paquetes de sistema de cada corrida de la CI | CDN de Playwright y `apt`; los paquetes no se midieron | cada PR, desde T012 | la CI |
| `actions/upload-artifact` v7.0.1 | GitHub, fijada por SHA (`043fb46d…`) | T012. Es la acción que el ADR 0008 ya enumera | la CI |

Los dueños B, V, U, C, P y S no descargan nada: instalan con `npm ci --offline` y el navegador ya está en la máquina. Si un comando intenta bajar algo, paran y piden permiso.

## Riesgos y lo que quedó sin verificar

1. **Un solo navegador y una sola plataforma.** Nada corrió en macOS ni en Firefox o WebKit. El Chrome Headless Shell de macOS existe (ADR 0008), pero la red no se probó ahí.
2. **La CI sin medir.** El tiempo de la instalación del navegador y del job `front` se conocen recién con el primer PR (T015). Sin caché, cada corrida baja 122,2 MB. Los 11 s y 32 s de la suite son de la máquina local.
3. **La imagen web.** La etapa de build corre `npm test`, que ahora incluye Vitest, dentro de `node:24-alpine`. No se corrió (no se usó Docker al planificar); T016 lo comprueba.
4. **Una prueba `test.fail()` puede pasar por otra razón.** Las pruebas de `guards.spec.ts` son tan cortas que no hay otra razón posible, y apagar cada guarda las hace fallar (verificado).
5. **Acople al texto en español.** Los localizadores usan nombres accesibles en español: si un port cambia un texto, la red falla, y eso es lo que se busca. Un cambio deliberado de copy se corrige en el Page Object.
6. **El aspecto sólo se mide donde se enumera.** Una regla que mueva F2, o que una hoja borrada deje sin estilo, y no esté entre las diez, o un cambio que conserve los valores medidos pero altere el diseño, no se ve. La regla muerta (R8) sólo se detecta por un cambio de valor de la copia que gana.
7. **El ingreso.** Las pruebas arrancan sin sesión. Cuando A3 y C3a pidan ingresar, `shell.goto` y `storage.seed` son los únicos lugares que cambian (spec, riesgo 9).
8. **Lo que la red no ve.** Los flujos de la Biblioteca, el Proyecto, el Método y el Recorrido, y los diálogos nativos, quedan para los ports que los tocan (Q1).
9. **Cinco pruebas `KNOWN DEFECT` van a cambiar.** Tres de Vitest y dos de la red. Quien las corrige las cambia en su commit TDD.
10. **El servidor de `vite preview` no es Nginx.** No aplica la CSP ni pasa `/api/`, y un camino que no existe responde `index.html` con 200 en lugar de 404. Un humo contra el stack de Docker espera a A3 y a C4 (ADR 0008).

## Complexity Tracking

Sin violaciones de la constitución. Los apartamientos del ADR 0008 están en su propia sección y cada uno tiene su evidencia.
