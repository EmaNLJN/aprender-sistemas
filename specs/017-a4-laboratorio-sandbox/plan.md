# Implementation Plan: A4 · Laboratorio con el sandbox propio

**Branch**: `017-a4-laboratorio-sandbox` (nombre de la feature; la rama del plan es `plan/a4-laboratorio-sandbox`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-a4-laboratorio-sandbox/spec.md`, con su clarify del 2026-10-28, los hallazgos «A4» y «Transversal» de `.coordinador/hallazgos-para-planes.md` y las decisiones del 2026-10-28 (noche) de `.coordinador/clarify-decisiones.md`.

**Objetivo:** que «Ejecutar y revisar» corra en el sandbox propio (`/api/runs`) en lugar de los Playgrounds públicos, con la espera visible, las cuotas con aviso, la vista previa con la plantilla del servidor y el id del intento en el progreso.

**Arquitectura:**

- **El puerto de F7a no cambia.** A4 escribe un adaptador nuevo de `features/run-exercise`, `createApiRunsTransport`, sobre el cliente de la API de F11a, y lo cablea en la raíz de composición con dos líneas, como prevé el contrato de F7a.
- **En el servidor,** la ejecución suma `attemptId`.
- **En el navegador:**
  - la plantilla del servidor arma la vista previa y se guarda como porción opcional en la copia del contenido de A3;
  - la revisión de `lab.js` dibuja los estados de la espera sin perder el foco;
  - el cliente de los Playgrounds y lo que sólo él usaba se retiran.

**Stack:** TypeScript 6.0.2, Vitest 5.0.3, fishery 2.4.0, Playwright 1.63.0 y Zustand 5.0.15 en el front; Laravel 13.34.0, Pest 5.3.0 y PHPStan 2.2.17 (nivel 9) con MySQL 9.7 en el backend. Ninguna dependencia nueva.

**Lo que dejan otros:** este plan parte de una base que todavía no está entera en `master`. Lo de F7a, F11a, B3 y A3 se cita con su worktree y su commit, o con las líneas del plan de A3 (research.md, R0). La unidad 0 la verifica antes de empezar.

**Note**: los encabezados de la plantilla de Spec Kit quedan en inglés (constitución, principio VI).

## Summary

**Qué pide la spec:**

- el laboratorio pide la ejecución a `POST /api/runs` y consulta `GET /api/runs/{id}` con una espera que crece de 0,3 a 2 s;
- cancela con `POST /api/runs/{id}/cancel`;
- espera turno ante `active` y `queue_full`, y muestra las otras cuotas con su mensaje;
- arma el `result` v1 desde los veredictos del servidor, con `attemptId`;
- la vista previa usa la plantilla del servidor con un nonce de 32 ceros;
- los Playgrounds desaparecen del código, de la CSP y de los textos.

**El enfoque** (research.md):

- **R2:** un adaptador sobre el puerto de F7a, con el reloj inyectado;
- **R4:** dos funciones puras que deciden qué hacer con cada respuesta;
- **R8:** la explicación de los motivos del servidor dentro de `stderr`, que `diagnose` lee primero;
- **R9:** un renderizador que porta línea por línea el de PHP;
- **R10:** la plantilla como porción opcional de la copia, escrita en una transacción;
- **R11:** una raíz de composición en `app/lab/` que `lab.js` usa en dos líneas;
- **R13:** el doble del compilador de las E2E montado sobre el `ApiDouble` de F11a.

El backend suma un campo con Pest (R16).

**El tamaño:** 29 tareas en 7 unidades. Cada tarea alcanza para un implementador solo.

## Technical Context

**Language/Version**: TypeScript 6.0.2 (ES modules, Node 24 para `qa/`); PHP 8.4 con Laravel 13.34.0.

**Primary Dependencies**: las de `master`, más las que dejan F7a (`zustand/vanilla` en la feature), F11a (`createApiClient`, `sessionStore`, `requestSignIn`) y A3 (`wait`, `contentCopies`). Sin dependencias nuevas (FR-048).

**Storage**:

- `localStorage` v1 sin cambios de forma, salvo el campo opcional `result.attemptId`;
- la copia del contenido de A3 en IndexedDB (`taller-contenido`, almacén `copia`, clave `ultima`), con la porción opcional `portions.harness`;
- MySQL: sin migraciones, porque `runs.attempt_id` ya existe (B2).

**Testing**:

- Vitest (proyecto `node`) para la lógica de `entities`, `features` y `shared`;
- Playwright contra `dist/index.html`, con el `ApiDouble`;
- los checks de `qa/`;
- Pest contra MySQL real;
- una verificación manual contra el stack con gVisor (FR-047, research R15).

**Target Platform**: navegador moderno servido por Nginx en `localhost` (y HTTPS con C4); API Laravel en Docker.

**Project Type**: aplicación web (front Vite + API Laravel).

**Performance Goals**: entre dos consultas, de 0,3 a 2 s (SC-007); una sola consulta en vuelo por ejecución; como mucho 6 envíos por minuto en la espera de turno, por debajo del límite de 30 de B2 (research R3).

**Constraints**: el HTML bajo `BOOT_SIZE_LIMIT = 1500000` (`qa/build-check.ts:11`, #76); sin `style=` nuevos (FR-048); sin pedidos a hosts públicos (SC-003); la red E2E de F1 y A2 sin editar salvo lo que mide research R14.

**Scale/Scope**: 4 lugares del sandbox y aulas de 30 cuentas (mediciones de B2: 1,1 s de mediana en reposo y 9,5 s para el último de 30).

### Restricciones globales

Valores exactos, copiados de la spec, de la constitución y de los hallazgos. Toda tarea los respeta sin repetirlos.

| Tema | Valor |
| --- | --- |
| El tope del código | 65 536 bytes en UTF-8 (`SERVER_CODE_LIMIT_BYTES`); el aviso «El taller admite programas de hasta 64 KB. Reducí el código antes de volver a ejecutar.» (FR-002) |
| La prueba propia | La normaliza la feature de F7a (`normalizeCustomTest`, `trim()` de JavaScript) antes del puerto; el editor la acota a 3 000 caracteres; `''` no viaja |
| Los recortes del resultado | 12 000 caracteres de `stdout` y 18 000 de `stderr`, una sola vez, en `buildRunResult` (F7a) |
| El calendario | Consultas cada `min(2000, round(300 × 1,5ⁿ))` ms; 2 reintentos del envío, a los 500 y 1000 ms; 30 s de fallas de consulta; aviso de demora a los 15 s; red de seguridad a los 12 min; espera de turno de `round(RetryAfter × 1000 × 1,5ᵏ + azar × 1000)` ms, hasta 2 min (research R3) |
| Los `Retry-After` por omisión | 3 s para `active` y 10 s para `queue_full` (contrato de B2) |
| El nonce de la vista previa | `PREVIEW_NONCE = '00000000000000000000000000000000'` (32 ceros) |
| El fixture de la plantilla | `qa/fixtures/shared/harness-cases.json`, 11 casos, nonce `0123456789abcdef0123456789abcdef`; no se regenera ni se edita (FR-027) |
| La CSP | `connect-src 'self'` en `docker/nginx/nginx.conf:16` (o en `headers.conf` si C4 ya la movió) (FR-032) |
| El tope del HTML | `BOOT_SIZE_LIMIT = 1500000` (TR-8 y la decisión del 2026-10-28, noche) |
| Las E2E de F1 y A2 | Sólo cambian 9 de F1 en su código: 8 de `cycle.spec.ts` y 1 de `guards.spec.ts` (más los 2 de `css-contract.spec.ts`, que usan el doble nuevo sin editarse). Las de A2 no se tocan (FR-042, research R14) |
| Las E2E de F7a | Cambian 10 de las 14 de `lab-run.spec.ts` y 1 de `lab-exercise.spec.ts` (research R14). La aserción de `lab-run.spec.ts:280` pasa al cuerpo del envío (A4-1) |
| La aprobación | Las 20 E2E editadas van en **un** commit propio, con TDD y con la aprobación del usuario (FR-042; la regla de los ports de la hoja de ruta del front) |
| El doble de la API | El de F11a, con la ruta antes del CSRF y `ApiCall.search`; A4 lo extiende sin otro `replyTo` ni otra búsqueda (TR-11, decisión del 2026-10-28, noche) |
| La lista blanca de las E2E de error | `pageIssues.expectIssue(/status of NNN/, '…')` con el código exacto; una red caída a propósito, `/Failed to load resource: net::ERR_FAILED/` |
| Los stubs del rojo | `const f: (a: A) => R = () => { throw new Error('not implemented'); };` (TR-2) |
| El nombre del proyecto de Vitest | `node` para `*.spec.ts` y `dom` para `*.spec.tsx`, con `frontend/src/vitest.setup.ts` (TR-6) |
| `import.meta` en el bundle | A4 no suma entradas a `LEGACY_MODULES`: el conteo de la base no cambia (TR-4) |
| Los casos de `ExerciseKind` de B3 | `ExerciseKind::Complete` y `ExerciseKind::Repair` (A4-5). A4 no los nombra en código; el quickstart §6 los nombra así |
| Los comentarios | Ninguno, salvo una referencia puntual (un FR, un ADR o una regla de un navegador). Los comentarios se borran por omisión (`AGENTS.md`) |
| Los commits | En español, con `tipo(ámbito): …` y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
| --- | --- | --- |
| I. `AGENTS.md` es la fuente | La documentación que nombra los Playgrounds cambia en T027, la integra el coordinador y remite a `AGENTS.md`, `README.md` y `qa/AGENTS.md` | Pasa |
| II. TDD y pruebas útiles | Cada comportamiento empieza con su prueba en rojo, y los valores esperados salen de los contratos de B2 y C3a, de la spec y del fixture compartido. Las E2E editadas van en su commit, en rojo antes de `lab.js`. Pest corre contra MySQL. Sin pruebas tautológicas: la batería de SC-002 usa `hasPassingEvidence` real sobre resultados armados por `buildRunResult` | Pasa |
| III. Código entendible | Funciones de decisión puras y chicas (`decideSubmit`, `decidePoll`, `verdictOfRun`), un adaptador con métodos de una responsabilidad, complejidad de 10 o menos por función | Pasa |
| IV. IDs estables y nada se borra | Ningún ID cambia; el progreso v1 conserva su forma y suma un campo opcional; las fixtures congeladas arrancan sin escribir (SC-004). Se conserva la distinción entre compilación real, simulaciones y pasos manuales (FR-035) | Pasa |
| V. Capas y contratos | La feature no importa otra feature; la composición vive en `app/lab/`; `features/sign-in/requests.ts` es una entrada sin vista; sin stores nuevos | Pasa |
| VI. Español, accesibilidad y portabilidad | Los textos van en español con voseo; el foco se conserva, la región viva anuncia una vez y no hay animaciones nuevas (FR-039); los avisos caben a 590 px | Pasa |
| VII. Secretos y salidas fuera de Git | Nada nuevo se versiona: `build/harness.json` es salida del generador | Pasa |
| VIII. Flow-forward | La spec 005 no se edita: el contrato ampliado está en `contracts/runs-api-attempt-id.md` | Pasa |

**Re-check después del diseño:** sin violaciones; «Complexity Tracking» queda vacío.

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Dónde la aplica el plan | Tareas |
| --- | --- | --- |
| **Q1, A:** `attemptId` en la ejecución, aditivo y con Pest | `RunPresenter` y `RunAttemptIdTest`; el contrato ampliado | T002, T003 |
| **Q2, A:** los Playgrounds se retiran del todo | El retiro, la CSP y los textos | T021, T024, T025 |
| **Q3, A:** la fila visible, la demora a los 15 s y la espera de turno automática | `ApiRunProgress`, `describeRunProgress` y el adaptador | T010, T012, T013, T022 |
| **Q4, A:** sin el número de intentos hasta D1c | La línea de intentos | T021 |
| **Q5, A:** B3 antes que A4 | La compuerta de T001 y la verificación de T028 | T001, T028 |
| **Q2 de F7:** un canal de progreso con una unión ampliable | `createExerciseRunner` recibe el adaptador con `ApiRunProgress`; la feature no cambia | T013, T020 |
| **P2 y C4:** A4 espera a F7a y a B3, no a F7b; dibuja la vista vigente | `lab.js`; el delta para F7b en research R18 | T020 a T022 |
| **Las tres formas del resultado** (2026-10-28, noche): las unifica A4 | `LabResultV1` en un refactor tipado; el retiro de `RunOutcome` con `interpretRun` | T004, T024 |
| **El doble de la API canónico** (2026-10-28, noche) | `CompilerDouble` sobre el `ApiDouble`, sin otro `replyTo` | T018 |
| **`ExerciseKind::Complete` y `Repair`** (A4-5) | Sólo en el quickstart §6 | T028 |

## Project Structure

### Documentation (this feature)

```text
specs/017-a4-laboratorio-sandbox/
├── spec.md              # la spec, con su clarify
├── plan.md              # este archivo
├── research.md          # R0 a R18, Context7 y las mediciones
├── data-model.md        # la ejecución, el result v1, las decisiones, el progreso y los textos
├── quickstart.md        # cómo se verifica la entrega
├── contracts/
│   ├── runs-api-attempt-id.md   # el contrato de B2 con attemptId
│   └── lab-execution.md         # las interfaces del front que deja A4
└── tasks.md             # una línea por tarea
```

### Source Code (repository root)

Las letras son los dueños de «Reparto en paralelo». (N) es nuevo, (M) se modifica y (B) se borra.

```text
backend/api/
├── app/Runs/RunPresenter.php                                   (B·M) suma attemptId
└── tests/
    ├── Unit/Runs/RunPresenterTest.php                          (B·M) 19 claves
    └── Feature/Runs/RunAttemptIdTest.php                       (B·N) FR-025

frontend/
├── lab.js                                                      (W·M) la raíz: adaptador, vista previa, guarda, textos y espera
└── src/
    ├── app/
    │   ├── boot/content-stage.ts                               (F·M) afterPublish arrastra la plantilla (A3)
    │   └── lab/server-execution.ts                             (F·N) labTransport, labHarness y labProgramBuilder
    ├── entities/exercise/
    │   ├── index.ts                                            (R·M, F·M) suma renderHarness y las explicaciones; T024 retira lo viejo
    │   └── model/
    │       ├── run-outcome.ts                                  (R·M) RunOutcome.result: LabResultV1; (F·B) en T024
    │       ├── run-outcome.spec.ts                             (F·B) en T024
    │       ├── selectors.ts                                    (R·M) sin StoredResult
    │       ├── lab-state.ts                                    (R·M) sanitizeResult: LabResultV1 con attemptId
    │       ├── sanitize-result.spec.ts                         (R·N)
    │       ├── render-harness.ts / .spec.ts                    (R·N) el renderizador del navegador
    │       ├── server-explanations.ts                          (R·N) los seis motivos y la falla del taller
    │       ├── diagnose.ts / diagnose.spec.ts                  (R·M) las explicaciones primero
    │       └── build-program.ts / .spec.ts                     (F·B) en T024
    ├── features/
    │   ├── run-exercise/
    │   │   ├── index.ts                                        (F·M) lo nuevo; T024 retira los Playgrounds
    │   │   ├── model/
    │   │   │   ├── transport.ts                                (F·M) ProgramBuilder devuelve string | null
    │   │   │   ├── code-limit.ts / .spec.ts                    (F·N) 64 KiB
    │   │   │   └── build-run-result.spec.ts                    (R·M) en T023, sin interpretRun
    │   │   ├── api/
    │   │   │   ├── server-run.ts / .spec.ts                    (F·N) parseServerRun
    │   │   │   ├── server-run.factory.ts                       (F·N) ayuda de specs (fishery)
    │   │   │   ├── run-verdict.ts / .spec.ts                   (F·N) verdictOfRun y withoutEvidence
    │   │   │   ├── run-schedule.ts / .spec.ts                  (F·N) el calendario
    │   │   │   ├── retry-hint.ts / .spec.ts                    (F·N) cuándo volver a ejecutar
    │   │   │   ├── run-progress.ts                             (F·N) ApiRunPhase y ApiRunProgress
    │   │   │   ├── run-decisions.ts / .spec.ts                 (F·N) decideSubmit, decidePoll y los textos
    │   │   │   ├── fake-runs-api.ts                            (F·N) ayuda de specs: el cliente y el reloj dobles
    │   │   │   ├── api-runs-transport.ts / .spec.ts            (F·N) el adaptador
    │   │   │   ├── server-program.ts / .spec.ts                (F·N) la vista previa
    │   │   │   └── playground-transport.ts / .spec.ts          (F·B) en T024
    │   │   └── ui/describe-run-progress.ts / .spec.ts          (F·N) la línea, el anuncio y la demora
    │   └── sign-in/requests.ts                                 (F·N) la entrada sin vista
    └── shared/api/
        ├── http/api-failure.ts, api-client.ts                  (F·M) quota
        ├── http/api-client-quota.spec.ts                       (F·N)
        ├── content/harness-copy.ts / .spec.ts                  (F·N) la porción opcional
        ├── content/indexeddb-copy-store.ts                     (F·M) update en una transacción (A3)
        ├── content/indexeddb-copy-update.spec.ts               (F·N)
        ├── content/fake-indexed-db.ts                          (F·M) pedidos con onsuccess (ayuda de specs de A3)
        ├── content/content-copies.ts, index.ts                 (F·M) el tipo y los exports
        ├── content/harness-holder.ts / .spec.ts                (F·N) la plantilla con If-None-Match
        └── playground/                                         (F·B) en T024

qa/
├── e2e/fixtures/api-double.ts                                  (E·M) GET /api/harness por omisión
├── e2e/fixtures/compiler-double.ts                             (E·M) sobre el ApiDouble
├── e2e/fixtures/index.ts                                       (E·M) el doble recibe api
├── e2e/lib/compiler-results.ts                                 (E·M) ejecuciones del contrato de B2
├── e2e/lib/lab-copy.ts                                         (E·M) la línea sin número
├── e2e/pages/lab.ts                                            (E·M) la línea, el anuncio, la demora y las notas
├── e2e/specs/cycle.spec.ts, guards.spec.ts                     (E·M) F1, en el commit aprobado
├── e2e/specs/lab-run.spec.ts, lab-exercise.spec.ts             (E·M) F7a, en el commit aprobado
├── e2e/specs/lab-sandbox.spec.ts                               (E·N) las E2E de A4
├── lab-state-check.ts                                          (W·M) dos escenarios y el contexto
├── exercise-evidence-check.ts                                  (F·M) sin interpretRun
├── runner-check.ts, runtime-check.ts                           (F·B)
├── run-checks.ts                                               (F·M) sin runner-check
├── nginx-api-blocks-check.ts, build-check.ts                   (K·M) la CSP y los hosts
└── api-runs-check.ts                                           (K·M) la medición de SC-007

docker/nginx/nginx.conf                                         (K·M) connect-src 'self'
package.json                                                    (F·M) sin check:runner
```

**Structure Decision:** la web de `frontend/` por capas FSD y la API de `backend/api/`, las dos que ya existen. A4 no crea slices: suma archivos al slice `features/run-exercise` de F7a y a `shared/api/content` de A3, y la carpeta `app/lab/` para la composición.

## Review Focus

Cinco entradas o fallas que la spec implica y que ninguna prueba de una tarea ejercita por sí sola. Cada una suma su prueba a la tarea dueña.

1. **Abortar con el envío en vuelo** (R2). El `POST` no lleva la señal; si el alumno cancela mientras viaja, el servidor igual acepta. Sin la cancelación posterior, la ejecución ocupa la cuota de una activa y la próxima espera turno sin motivo.
   - **La prueba:** «an abort while the submission is in flight cancels the accepted run and throws AbortError», en `api-runs-transport.spec.ts` (T012).
2. **El invariante de aprobación** (FR-015, SC-002). Un `failed` con `evidence_invalid` trae las tres pruebas en `pass`.
   - **La prueba:** una batería de 16 combinaciones de estado y motivo, más el `passed`, que pasa por `verdictOfRun`, `buildRunResult` y `hasPassingEvidence` reales: «the approval battery: only passed approves» (T009).
3. **Las marcas de evidencia pegadas al texto del alumno** (FR-017, R7).
   - **Las pruebas:** «keeps the text the student printed on the same line as a marker» y «keeps a marker that imitates the workshop with another length» (T009).
4. **La cuota de 30 envíos por minuto** durante dos minutos de `active` con el azar al máximo (FR-010, R3).
   - **La prueba:** «waiting its turn for two minutes stays under 30 submissions in any minute and gives up at two minutes» (T012).
5. **La región viva y el foco** (FR-039, US4-7, A4-10).
   - **La prueba:** el lugar en la fila baja de 3 a 1, el anuncio no cambia, la línea sí, y «Cancelar ejecución» conserva su nodo y el foco: «the queue place changes without a new announcement and the cancel button keeps its focus», en `lab-sandbox.spec.ts` (T019).

## Reparto en paralelo

| Dueño | Unidad | Tareas | Archivos (disjuntos) |
| --- | --- | --- | --- |
| K (coordinador) | 0 y 6 | T001, T025 a T029 | `specs/`, `docker/nginx/`, `qa/nginx-api-blocks-check.ts`, `qa/build-check.ts`, `qa/api-runs-check.ts`, la documentación |
| B (backend) | 1 | T002, T003 | `backend/api/` |
| R (reglas) | 2 | T004 a T007, T023 | `frontend/src/entities/exercise/`, `features/run-exercise/model/build-run-result.spec.ts` |
| F (feature) | 3 y 6 | T008 a T017, T024 | `frontend/src/features/`, `frontend/src/shared/api/`, `frontend/src/app/lab/`, `frontend/src/app/boot/content-stage.ts`, los checks que se retiran |
| E (red) | 4 | T018, T019 | `qa/e2e/` |
| W (raíz) | 5 | T020 a T022 | `frontend/lab.js`, `qa/lab-state-check.ts` |

**Las ondas:**

- **Onda 1:** T001 y, en paralelo, U1 (B), U2 (R) y T018 (E).
- **Onda 2:** U3 (F, depende de U2) y T019 (E, depende de T018; espera la aprobación del usuario para el commit).
- **Onda 3:** U5 (W, depende de U3 y de T019).
- **Onda 4:** U6.

`package.json`, las configuraciones y la documentación las integra el coordinador (`AGENTS.md`, «Trabajo con subagentes»). La única excepción es el retiro de `check:runner` en T024, que va con el retiro del check.

## Reglas para todos los agentes

- **Antes de empezar,** leé `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md`, el contrato [contracts/lab-execution.md](./contracts/lab-execution.md) y, del worktree de F7a, `specs/021-f7-laboratorio/contracts/run-exercise.md`.
- **TDD:** la prueba que falla, la corrida que muestra el fallo esperado, la implementación mínima y la corrida en verde. Si una prueba pasa antes de implementar, pará y avisá: no protege nada.
- **Sin comentarios** en el código, salvo una referencia puntual (un FR, un ADR o una regla de un navegador). Los comentarios de los bloques del plan son parte del código sólo si están escritos en el bloque.
- **Código y pruebas en inglés;** los textos que ve el alumno, en español, copiados tal cual de [data-model.md §7](./data-model.md#7-los-textos).
- **Los stubs del rojo** van como `const` tipados (TR-2).
- **Ningún archivo fuera de tu tarea.** Si hace falta, pará y avisá al coordinador.
- **Las pruebas no se debilitan** para pasar. Una E2E existente se edita sólo en T019.
- **Los checks de cada tarea** son los que la tarea nombra, más `npm run lint` y `npm run format:check` sobre lo tocado y `git diff --check`.
- **Un commit por tarea,** salvo que la tarea diga otra cosa, en español y con el trailer.
- **Si una firma de la base** (F7a, F11a o A3) difiere de la citada, usá la de la base sin cambiar la conducta pedida, y anotalo en el informe de la tarea.

## 0. Unidad 0 · La base y la compuerta (coordinador K)

### Tarea 0.1 · La base de integración (T001, K)

- **Qué hace:** confirma que la base tiene lo que A4 consume, mide los números que el plan no fija y crea el registro de la implementación.
- **Archivos:** `specs/017-a4-laboratorio-sandbox/research.md`, sección «Línea base de la implementación», al final.
- **Pasos:**
  1. **Las dependencias integradas** en la rama de trabajo, que sale de `master`:
     - F7a entera, de T001 a T017 (`grep -c "createPlaygroundTransport\|buildPlaygroundProgram" frontend/lab.js` da 2; `test ! -e frontend/src/app/legacy/register-runner.ts`);
     - F11a (`test -e frontend/src/shared/api/http/api-client.ts && test -e qa/e2e/fixtures/api-double.ts`);
     - A3 (`test -e frontend/src/shared/lib/wait.ts && test -e frontend/src/shared/api/content/indexeddb-copy-store.ts && test -e frontend/src/shared/api/content/fake-indexed-db.ts`);
     - B3, con su corrida de registro en verde: el resumen pegado en su PR, o el informe en `qa/curriculum-audit/` con veredicto en verde, sobre el último `master`.

     Si falta algo, pará: A4 espera (spec, Assumptions; Q5).
  2. **Las firmas de R0** (research.md), con `grep -n`:
     - `export function wait(` en `shared/lib/wait.ts`;
     - `function run<T>(` y `export const COPY_KEY` en `indexeddb-copy-store.ts`;
     - `void contentCopies.write(copyOf(reading))` en `app/boot/content-stage.ts`;
     - `ifNoneMatch` y `abort?: boolean` en `qa/e2e/fixtures/api-double.ts`;
     - `export const requestSignIn` en `features/sign-in/model/access-request.ts`;
     - `export async function reauthenticate` en `features/sign-in/model/reauthenticate.ts`;
     - `retryAfterSeconds` en `shared/api/http/api-failure.ts`.

     Anotá cada diferencia: la tarea que usa esa firma toma la de la base.
  3. **La línea base de los checks:** `npm ci && npm run build && npm test`; anotá la cantidad de checks y de specs de Vitest.
  4. **La red:** `E2E_PORT=4300 npm run test:e2e`; anotá el total por archivo. Son los esperados de TR-15: los de este plan se cuentan contra estos, no contra un número escrito.
  5. **El tamaño:** `node -e "const s=require('fs').readFileSync('dist/index.html','utf8');console.log(s.length)"`; anotá `bootSize` contra 1 500 000.
  6. **Las aserciones que cambian** (research R14), otra vez sobre la base:

     ```sh
     git grep -n "attempts\|attemptsLine\|compiler\.\|PLAYGROUND\|__TALLER_TEST__" -- qa/e2e/specs qa/lab-state-check.ts
     ```

     Si aparece una prueba que no figura en R14, sumala a la lista de T019 o de T020 antes de empezar, y avisá.
  7. **`boot-check` y la plantilla:** `grep -n "order\b" qa/boot-check.ts | head`. Anotá si algún escenario compara la lista completa de pedidos después de montar el laboratorio. T020 lo usa.
  8. **El backend:** `npm run api:test`, `npm run api:analyse` y `npm run api:format:check` en verde; anotá el total de Pest.
- **Commit:** `docs(specs): línea base de la implementación de A4`.

### 0.2 · La compuerta de cada unidad

Al cerrar cada unidad, el coordinador corre lo de la tabla, revisa el diff del implementador y anota el resultado en el ledger de la implementación.

| Unidad | Compuerta |
| --- | --- |
| 1 | `npm run api:test -- --filter='RunPresenter|RunAttemptId|RunShow|RunCancelEndpoint|RunEndpoint'`, `npm run api:test`, `npm run api:analyse` y `npm run api:format:check` |
| 2 | `npm run test:unit -- src/entities/exercise`, `npm test` y `npm run lint` |
| 3 | `npm run test:unit -- src/features src/shared`, `npm test`, `npm run lint` y `node qa/seams-guard-check.ts` |
| 4 | `npm run typecheck`; `npm run build && E2E_PORT=4300 npm run test:e2e -- specs/lab-sandbox.spec.ts specs/cycle.spec.ts`, que **fallan** porque `lab.js` todavía usa los Playgrounds (la red estricta los bloquea) |
| 5 | `npm run build && npm test && E2E_PORT=4300 npm run test:e2e`: toda la red en verde |
| 6 | La compuerta final de T029 |

## 1. Unidad 1 · `attemptId` en la ejecución (dueño B, onda 1)

Cubre FR-024 y FR-025. Es aditiva y se puede adelantar (spec, «Qué se puede planificar antes de F7a», punto 1).

### Tarea 1.1 · Las pruebas de Pest, en rojo (T002, B)

- **Consume:** `RunPresenter::present(RunView): array<string, mixed>` (`backend/api/app/Runs/RunPresenter.php`); `RunWorld::exercise()`, `RunWorld::user()` y `RunWorld::run(User, array)` (`tests/Support/RunWorld.php`); `Browser::for($this)->useDatabaseDrivers()->signIn($user)`; `RunCloser::close(string, Verdict): bool`; `Verdict` y `Verdict::infraError(RunReason)`.
- **Produce:** las pruebas del contrato ampliado ([contracts/runs-api-attempt-id.md](./contracts/runs-api-attempt-id.md)).
- **Archivos:**
  - `backend/api/tests/Unit/Runs/RunPresenterTest.php` (modifica);
  - `backend/api/tests/Feature/Runs/RunAttemptIdTest.php` (nuevo).

**Paso 1.** En `RunPresenterTest.php`:

- `CONTRACT_KEYS` suma `'attemptId'` al final:

  ```php
  const CONTRACT_KEYS = [
      'id', 'status', 'reason', 'queuePosition', 'exerciseId', 'language', 'createdAt', 'startedAt', 'finishedAt', 'phase', 'exitCode',
      'compileMs', 'runMs', 'truncated', 'stdout', 'stderr', 'tests', 'customTest', 'attemptId',
  ];
  ```

- En «presents a queued run with its position and nothing else that does not exist yet», el arreglo esperado suma, después de `'customTest' => null,`, la línea `'attemptId' => null,`.
- El nombre «has exactly the eighteen keys of the contract and never the program, the code, the nonce or the test text» pasa a «has exactly the nineteen keys of the contract …». El cuerpo no cambia.
- Al final del archivo:

  ```php
  it('presents the attempt that closed the run, last, and null while the run waits', function () {
      $queued = (new RunPresenter)->present(new RunView(presenterRun(), 2, [], null));
      $finished = (new RunPresenter)->present(new RunView(presenterRun([
          'status' => 'failed', 'attempt_id' => '1873', 'finished_at' => '2026-10-05 16:21:08.511', 'program' => null, 'expires_at' => null,
      ]), null, [], null));

      expect($queued)->toHaveKey('attemptId')
          ->and($queued['attemptId'])->toBeNull()
          ->and($finished['attemptId'])->toBe(1873)
          ->and(array_key_last($finished))->toBe('attemptId');
  });
  ```

**Paso 2.** `RunAttemptIdTest.php`, entero. Los nombres de las funciones y constantes globales llevan el prefijo `attemptId` para no chocar con las de otros archivos de Pest:

```php
<?php

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunLimiters;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

const ATTEMPT_ID_CLIENT_RUN_ID = '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f99';

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));
    RunLimiters::register();
    RunWorld::exercise();
    $this->user = RunWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

function attemptIdOfRow(string $runId): ?int
{
    $value = DB::table('runs')->where('id', $runId)->value('attempt_id');

    return $value === null ? null : (int) $value;
}

/** @return list<TestVerdict> */
function attemptIdVerdicts(TestOutcome $second): array
{
    return [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', $second), new TestVerdict('t3', TestOutcome::Pass)];
}

it('publishes null while the run waits in the queue and while it runs', function () {
    $queued = RunWorld::run($this->user);
    $running = RunWorld::run($this->user, ['status' => 'running', 'started_at' => Instant::now()]);

    $waiting = $this->browser->get("/api/runs/{$queued->id}")->assertOk()->json('data');
    $working = $this->browser->get("/api/runs/{$running->id}")->assertOk()->json('data');

    expect($waiting)->toHaveKey('attemptId')
        ->and($waiting['attemptId'])->toBeNull()
        ->and($working)->toHaveKey('attemptId')
        ->and($working['attemptId'])->toBeNull();
});

it('publishes the attempt that closed the run, of the same account and exercise', function (Verdict $verdict) {
    $run = RunWorld::run($this->user, ['status' => 'running', 'started_at' => Instant::now()]);
    expect(app(RunCloser::class)->close($run->id, $verdict))->toBeTrue();
    $attemptId = attemptIdOfRow($run->id);

    $response = $this->browser->get("/api/runs/{$run->id}");

    $response->assertOk()->assertJsonPath('data.attemptId', $attemptId);
    $attempt = DB::table('attempts')->where('id', $attemptId)->first(['user_id', 'exercise_id']);
    expect($attemptId)->toBeInt()
        ->and($attempt?->user_id)->toBe($this->user->id)
        ->and($attempt?->exercise_id)->toBe('rust-01');
})->with([
    'passed' => [new Verdict(RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 412, 31, '', '', attemptIdVerdicts(TestOutcome::Pass), null)],
    'failed' => [new Verdict(RunStatus::Failed, null, ExecutorPhase::Run, 0, false, 412, 31, '', '', attemptIdVerdicts(TestOutcome::Fail), null)],
    'compile_error' => [new Verdict(RunStatus::CompileError, null, ExecutorPhase::Compile, 1, false, 412, null, '', 'error[E0308]: mismatched types', [], null)],
    'runtime_error' => [new Verdict(RunStatus::RuntimeError, RunReason::Signal, ExecutorPhase::Run, 134, false, 412, 31, '', 'thread main panicked', [], null)],
    'timeout' => [new Verdict(RunStatus::Timeout, null, ExecutorPhase::Run, null, false, 412, 15000, '', '', [], null)],
    'infra_error' => [Verdict::infraError(RunReason::ExecutorError)],
]);

it('publishes the attempt of a run canceled in the queue in the answer to the cancellation', function () {
    $run = RunWorld::run($this->user);

    $response = $this->browser->post("/api/runs/{$run->id}/cancel");

    $attemptId = attemptIdOfRow($run->id);
    $response->assertOk()->assertJsonPath('data.status', 'canceled')->assertJsonPath('data.attemptId', $attemptId);
    expect($attemptId)->toBeInt();
});

it('publishes null on acceptance and the attempt to a retry that arrives after the close', function () {
    $body = ['clientRunId' => ATTEMPT_ID_CLIENT_RUN_ID, 'exerciseId' => 'rust-01', 'code' => 'fn main() {}'];
    $accepted = $this->browser->post('/api/runs', $body);
    $accepted->assertStatus(202);
    expect($accepted->json('data'))->toHaveKey('attemptId')
        ->and($accepted->json('data.attemptId'))->toBeNull();
    $runId = $accepted->json('data.id');
    expect(app(RunCloser::class)->close($runId, Verdict::infraError(RunReason::ExecutorError)))->toBeTrue();

    $retry = $this->browser->post('/api/runs', $body);

    $retry->assertOk()->assertJsonPath('data.attemptId', attemptIdOfRow($runId));
    expect(attemptIdOfRow($runId))->toBeInt();
});

it('keeps answering 404 to a finished run of another account', function () {
    $other = RunWorld::run(RunWorld::user(), ['status' => 'running', 'started_at' => Instant::now()]);
    app(RunCloser::class)->close($other->id, Verdict::infraError(RunReason::ExecutorError));

    $this->browser->get("/api/runs/{$other->id}")->assertNotFound()->assertJsonPath('code', 'not_found');
});
```

**Paso 3.** `npm run api:test -- --filter='RunPresenterTest|RunAttemptIdTest'`.

- **Fallan por la razón esperada:**
  - los de las claves, porque falta `attemptId`;
  - los de `toHaveKey('attemptId')`;
  - los de `assertJsonPath('data.attemptId', <entero>)`, que leen `null`.
- **Pasa ya,** y es correcto: «keeps answering 404…», que fija la conducta de antes.
- Si otro falla por otra razón (un nombre de función repetido, una columna), corregí la prueba, no el código.

**Paso 4.** Commit: `test(api): la ejecución publica el id de su intento (rojas, A4 FR-025)`.

### Tarea 1.2 · `attemptId` en el presentador y el contrato ampliado (T003, B)

- **Consume:** las pruebas de T002.
- **Produce:** `RunPresenter::present` con `'attemptId' => $run->attemptId` al final.
- **Archivos:** `backend/api/app/Runs/RunPresenter.php`.

**Paso 1.** En `present`, después de `'customTest' => $view->custom?->value,`:

```php
            'attemptId' => $run->attemptId,
```

**Paso 2.** `npm run api:test -- --filter='RunPresenterTest|RunAttemptIdTest|RunShowTest|RunCancelEndpointTest|RunEndpointTest'`: todo en verde.

**Paso 3.** `npm run api:test`, `npm run api:analyse` y `npm run api:format:check` en verde. `RunPresenter.php` está fuera de `AUDITED_SURFACE` (research R16): el PR no lleva el resumen de la auditoría.

**Paso 4.** Commit: `feat(api): la ejecución publica el id de su intento (A4 FR-024)`.

## 2. Unidad 2 · Las reglas de `entities/exercise` (dueño R, onda 1)

Cubre FR-018, FR-026 a FR-028 y FR-040, y la unificación de las tres formas del resultado (A4-3).

### Tarea 2.1 · Las tres formas del resultado en `LabResultV1` (T004, R)

- **Qué es:** un refactor tipado, sin cambio de conducta (research R1). La red queda en verde antes y después.
- **Consume:** `LabResultV1` (`frontend/src/entities/exercise/model/lab-result.ts`, de F7a).
- **Produce:**
  - `RunOutcome.result: LabResultV1`;
  - `sanitizeResult(result: RawObject, exercise: Exercise): LabResultV1`;
  - `selectors.ts` sin `StoredResult`.
- **Archivos:** `frontend/src/entities/exercise/model/run-outcome.ts`, `selectors.ts` y `lab-state.ts`.

**Paso 1.** En `run-outcome.ts`, `RunOutcome` queda así, con el import arriba:

```ts
import type { LabResultV1 } from './lab-result';
```

```ts
export interface RunOutcome {
  result: LabResultV1;
  solved: boolean;
}
```

**Paso 2.** En `selectors.ts`:
- borrá la interfaz `StoredResult`;
- suma `LabResultV1` al import de `./lab-result`: `import type { LabResultV1, LabTestOutcome } from './lab-result';`;
- en `isResultCurrent` y en `isReflectionSolved`, `record.result as StoredResult | undefined` pasa a `record.result as LabResultV1 | undefined`.

  El resto de las dos funciones no cambia, tampoco `result.tests ?? []`.

**Paso 3.** En `lab-state.ts`, suma `import type { LabResultV1 } from './lab-result';` y la firma queda `export function sanitizeResult(result: RawObject, exercise: Exercise): LabResultV1 {`. El cuerpo no cambia.

**Paso 4.** `npm run typecheck`, `npm run test:unit -- src/entities/exercise src/features/run-exercise`, `node qa/exercise-evidence-check.ts` y `node qa/lab-state-check.ts`: todo en verde, con los totales de T001.

**Paso 5.** Commit: `refactor(front): el resultado del laboratorio tiene una sola forma, LabResultV1 (A4-3)`.

### Tarea 2.2 · `sanitizeResult` conserva `attemptId` (T005, R)

- **Consume:** `sanitizeResult`, `parseSavedLab`, `sanitizeImport` (`lab-state.ts`) y `mergeRecord` (`merge-record.ts`).
- **Produce:** `attemptId` conservado si es un entero seguro mayor que 0, como última clave (FR-040; data-model.md §2).
- **Archivos:** `frontend/src/entities/exercise/model/sanitize-result.spec.ts` (nuevo) y `lab-state.ts`.

**Paso 1.** `sanitize-result.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSavedLab, sanitizeImport, sanitizeResult } from './lab-state';
import { mergeRecord } from './merge-record';
import type { Exercise } from './types';

const EXERCISE = {
  id: 'rust-01',
  language: 'rust',
  tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
  prediction: { options: [] },
} as unknown as Exercise;

const STORED = {
  code: 'fn energia(celdas: i32) -> i32 { celdas * 7 }',
  success: true,
  stdout: '',
  stderr: '',
  transportError: false,
  tests: [
    { id: 't1', passed: true },
    { id: 't2', passed: true },
    { id: 't3', passed: true },
  ],
  time: 1_759_752_000_000,
  customTest: '',
  customPassed: false,
};

const NINE_KEYS = [
  'code',
  'success',
  'stdout',
  'stderr',
  'transportError',
  'tests',
  'time',
  'customTest',
  'customPassed',
];

describe('sanitizeResult and the attempt of the server (A4 FR-040)', () => {
  it('keeps a positive integer attemptId as the last key', () => {
    const result = sanitizeResult({ ...STORED, attemptId: 1873 }, EXERCISE);

    expect(result.attemptId).toBe(1873);
    expect(Object.keys(result)).toEqual([...NINE_KEYS, 'attemptId']);
  });

  it.for([
    ['zero', 0],
    ['negative', -4],
    ['a fraction', 1.5],
    ['text', '1873'],
    ['null', null],
    ['not a number', Number.NaN],
    ['beyond the safe integers', 2 ** 53],
  ] as const)('drops an attemptId that is %s', ([, attemptId]) => {
    expect(sanitizeResult({ ...STORED, attemptId }, EXERCISE)).not.toHaveProperty('attemptId');
  });

  it('leaves a result of before A4 with its nine keys and its evidence', () => {
    const result = sanitizeResult(STORED, EXERCISE);

    expect(result).toEqual(STORED);
    expect(Object.keys(result)).toEqual(NINE_KEYS);
  });

  it('keeps the attemptId through a reload, an import and a merge between tabs', () => {
    const byId = new Map([[EXERCISE.id, EXERCISE]]);
    const saved: unknown = JSON.parse(
      JSON.stringify({
        version: 1,
        records: { 'rust-01': { result: { ...STORED, attemptId: 1873 } } },
        selected: {},
      }),
    );

    const reloaded = parseSavedLab(saved, byId).state.records['rust-01'];
    const imported = sanitizeImport(saved, byId).records['rust-01'];
    const merged = mergeRecord({}, reloaded, EXERCISE.tests);

    expect((reloaded.result as { attemptId?: number }).attemptId).toBe(1873);
    expect((imported.result as { attemptId?: number }).attemptId).toBe(1873);
    expect((merged.result as { attemptId?: number }).attemptId).toBe(1873);
  });
});
```

**Paso 2.** `npm run test:unit -- src/entities/exercise/model/sanitize-result.spec.ts`. Fallan «keeps a positive integer attemptId…» y «keeps the attemptId through…», porque la clave no está. Las otras dos pasan: fijan la conducta de antes.

**Paso 3.** En `lab-state.ts`, junto a `isFiniteNumber`:

```ts
function isAttemptId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}
```

`sanitizeResult` queda así:

```ts
export function sanitizeResult(result: RawObject, exercise: Exercise): LabResultV1 {
  const tests = exercise.tests.map((test) => ({
    id: test.id,
    passed: testPassed(result, test.id),
  }));
  const clean: LabResultV1 = {
    code: typeof result.code === 'string' ? result.code.slice(0, 30000) : '',
    success: result.success === true,
    stdout: String(result.stdout || '').slice(0, 12000),
    stderr: String(result.stderr || '').slice(0, 18000),
    transportError: result.transportError === true,
    tests,
    time: isFiniteNumber(result.time) ? result.time : 0,
    customTest: typeof result.customTest === 'string' ? result.customTest.slice(0, 3000) : '',
    customPassed: result.customPassed === true,
  };
  if (isAttemptId(result.attemptId)) clean.attemptId = result.attemptId;
  return clean;
}
```

**Paso 4.** `npm run test:unit -- src/entities/exercise`, `node qa/lab-state-check.ts`, `node qa/import-cases-check.ts` y `node qa/versioned-storage-check.ts`, en verde. Las fixtures congeladas no llevan `attemptId`, así que siguen sin escribir ni respaldar.

**Paso 5.** Commit: `feat(front): el progreso conserva el id del intento del servidor (A4 FR-040)`.

### Tarea 2.3 · El renderizador de la plantilla (T006, R)

- **Consume:** el fixture `qa/fixtures/shared/harness-cases.json` y las plantillas reales `content/harness/rust.tpl` y `go.tpl`.
- **Produce:** `renderHarness(template: string, input: HarnessInput): string`, `HarnessInput` y `HarnessTemplates` (contrato `lab-execution.md`), exportados del índice.
- **Archivos:**
  - `frontend/src/entities/exercise/model/render-harness.ts` (nuevo);
  - `render-harness.spec.ts` (nuevo);
  - `frontend/src/entities/exercise/index.ts`.

**Paso 1.** `render-harness.ts`, con el stub del rojo:

```ts
import type { ExerciseLanguage } from './types';

export type HarnessTemplates = Readonly<Record<ExerciseLanguage, string>>;

export interface HarnessInput {
  readonly language: ExerciseLanguage;
  readonly code: string;
  readonly nonce: string;
  readonly tests: readonly { readonly id: string; readonly expression: string }[];
  readonly customTest?: string;
  readonly imports?: readonly string[];
}

export const renderHarness: (template: string, input: HarnessInput) => string = () => {
  throw new Error('not implemented');
};
```

En `index.ts`, después de la línea de `buildProgram`:

```ts
export { renderHarness } from './model/render-harness';
export type { HarnessInput, HarnessTemplates } from './model/render-harness';
```

**Paso 2.** `render-harness.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderHarness } from './render-harness';
import type { ExerciseLanguage } from './types';

interface HarnessCase {
  name: string;
  language: ExerciseLanguage;
  code: string;
  tests: { id: string; expression: string }[];
  customTest?: string;
  imports?: string[];
  program: string[];
}

const ROOT = new URL('../../../../../', import.meta.url);
const FIXTURE = JSON.parse(
  readFileSync(new URL('qa/fixtures/shared/harness-cases.json', ROOT), 'utf8'),
) as { nonce: string; cases: HarnessCase[] };
const TEMPLATES: Record<ExerciseLanguage, string> = {
  rust: readFileSync(new URL('content/harness/rust.tpl', ROOT), 'utf8'),
  go: readFileSync(new URL('content/harness/go.tpl', ROOT), 'utf8'),
};

describe('renderHarness, the program of the server in the browser (B2 FR-036, A4 FR-027)', () => {
  it('has the eleven cases of the shared fixture', () => {
    expect(FIXTURE.cases).toHaveLength(11);
  });

  it.for(FIXTURE.cases)('$name', (testCase) => {
    const program = renderHarness(TEMPLATES[testCase.language], {
      language: testCase.language,
      code: testCase.code,
      nonce: FIXTURE.nonce,
      tests: testCase.tests,
      customTest: testCase.customTest,
      imports: testCase.imports,
    });

    expect(program.split('\n')).toEqual([...testCase.program, '']);
  });

  it('copies $& and $1 of the student code as they are', () => {
    const program = renderHarness('{{code}}\n', {
      language: 'rust',
      code: 'let s = "$&$1$$";',
      nonce: FIXTURE.nonce,
      tests: [],
    });

    expect(program).toBe('let s = "$&$1$$";\n');
  });
});
```

**Paso 3.** `npm run test:unit -- src/entities/exercise/model/render-harness.spec.ts`: falla el caso de las once (`not implemented`) y pasa «has the eleven cases».

**Paso 4.** `render-harness.ts`, la implementación (reemplaza el stub; el comentario es la referencia puntual al renderizador del servidor):

```ts
import type { ExerciseLanguage } from './types';

export type HarnessTemplates = Readonly<Record<ExerciseLanguage, string>>;

export interface HarnessInput {
  readonly language: ExerciseLanguage;
  readonly code: string;
  readonly nonce: string;
  readonly tests: readonly { readonly id: string; readonly expression: string }[];
  readonly customTest?: string;
  readonly imports?: readonly string[];
}

type Section = 'tests' | 'imports';
type Values = Readonly<Record<string, string>>;

const PLACEHOLDER = /\{\{(code|nonce|count|id|expression|name)\}\}/g;
const SECTION_OPEN = /^\{\{#(tests|imports)\}\}$/;
const SECTION_CLOSE = /^\{\{\/(tests|imports)\}\}$/;

function trimAsciiWhitespace(text: string): string {
  return text.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, '');
}

function testRows(input: HarnessInput): Values[] {
  const rows: Values[] = input.tests.map((test) => ({ id: test.id, expression: test.expression }));
  const custom = trimAsciiWhitespace(input.customTest ?? '');
  if (custom !== '') rows.push({ id: 'custom', expression: custom });
  return rows;
}

function importRows(input: HarnessInput): Values[] {
  if (input.language !== 'go') return [];
  const seen = new Set(['fmt']);
  const rows: Values[] = [];
  for (const name of input.imports ?? []) {
    if (seen.has(name)) continue;
    seen.add(name);
    rows.push({ name });
  }
  return rows;
}

function fill(line: string, values: Values): string {
  return line.replace(PLACEHOLDER, (match: string, name: string) => values[name] ?? match);
}

// Same grammar and single pass as backend/api/app/Runs/Program/ProgramRenderer.php (B2 FR-036).
export function renderHarness(template: string, input: HarnessInput): string {
  const tests = testRows(input);
  const rows: Record<Section, Values[]> = { tests, imports: importRows(input) };
  const common: Values = { code: input.code, nonce: input.nonce, count: String(tests.length) };
  const out: string[] = [];
  let section: Section | null = null;
  let body: string[] = [];
  for (const line of template.split('\n')) {
    const opening = SECTION_OPEN.exec(line);
    if (opening !== null) {
      section = opening[1] as Section;
      body = [];
    } else if (section !== null && SECTION_CLOSE.test(line)) {
      for (const row of rows[section]) for (const bodyLine of body) out.push(fill(bodyLine, { ...row, ...common }));
      section = null;
    } else if (section === null) {
      out.push(fill(line, common));
    } else {
      body.push(line);
    }
  }
  return out.join('\n');
}
```

**Paso 5.** `npm run test:unit -- src/entities/exercise/model/render-harness.spec.ts`: los 13 en verde (SC-005). `npm run lint` sin avisos nuevos de complejidad.

**Paso 6.** Commit: `feat(front): el navegador arma el programa con la plantilla del servidor (A4 FR-026 a FR-028)`.

### Tarea 2.4 · Las explicaciones del servidor ganan al diagnóstico (T007, R)

- **Consume:** `diagnose(stderr, language): Diagnosis` (`model/diagnose.ts`, de F7a).
- **Produce:** `SERVER_EXPLANATIONS`, `WORKSHOP_FAILURE` y `ServerExplanation` (contrato `lab-execution.md`), exportados del índice; `diagnose` las mira primero (FR-018, research R8).
- **Archivos:**
  - `frontend/src/entities/exercise/model/server-explanations.ts` (nuevo);
  - `diagnose.ts`;
  - `diagnose.spec.ts`;
  - `index.ts`.

**Paso 1.** `server-explanations.ts`, con los textos de la spec (data-model.md §7):

```ts
export interface ServerExplanation {
  readonly explanation: string;
  readonly action: string;
}

export const SERVER_EXPLANATIONS = {
  timeout: {
    explanation: 'La ejecución superó el tiempo límite del taller y se cortó.',
    action:
      'Revisá bucles que no terminan y esperas entre hilos o goroutines que nunca se destraban.',
  },
  runMemory: {
    explanation: 'El programa usó más memoria de la que el taller permite.',
    action: 'Buscá estructuras que crecen sin límite o copias grandes que no hacen falta.',
  },
  compileMemory: {
    explanation: 'La compilación usó más memoria de la que el taller permite.',
    action: 'Simplificá tipos o macros muy anidados y volvé a ejecutar.',
  },
  threads: {
    explanation: 'El programa lanzó más hilos de los que el taller permite.',
    action: 'Reducí la cantidad de hilos o goroutines que corren a la vez.',
  },
  outputLimit: {
    explanation:
      'El programa imprimió más de lo que el taller puede leer, y la salida se cortó antes de las pruebas.',
    action: 'Quitá impresiones de más (por ejemplo, dentro de un bucle) y volvé a ejecutar.',
  },
  evidenceInvalid: {
    explanation:
      'El programa terminó sin dejar correr todas las pruebas, o imprimió marcas que imitan las del taller.',
    action:
      'Revisá que tu código no termine el programa antes de tiempo (por ejemplo, con `exit`) ni imprima líneas que empiecen como las marcas de las pruebas.',
  },
} as const satisfies Record<string, ServerExplanation>;

export const WORKSHOP_FAILURE =
  'El taller no pudo ejecutar tu código por una falla propia, no de tu programa. Tu código sigue guardado; volvé a intentar en un momento.';
```

En `index.ts`, después de la línea de `diagnose`:

```ts
export { SERVER_EXPLANATIONS, WORKSHOP_FAILURE } from './model/server-explanations';
export type { ServerExplanation } from './model/server-explanations';
```

**Paso 2.** Al final de `diagnose.spec.ts` (los valores esperados se escriben acá, copiados de la spec; no se importan del módulo):

```ts
describe('diagnose with an explanation of the server first (A4 FR-018)', () => {
  const COMPILER = "\n\nerror[E0308]: mismatched types\nerror: expected one of `;`";

  it.for([
    {
      reason: 'timeout',
      explanation: 'La ejecución superó el tiempo límite del taller y se cortó.',
      action:
        'Revisá bucles que no terminan y esperas entre hilos o goroutines que nunca se destraban.',
    },
    {
      reason: 'memory while running',
      explanation: 'El programa usó más memoria de la que el taller permite.',
      action: 'Buscá estructuras que crecen sin límite o copias grandes que no hacen falta.',
    },
    {
      reason: 'memory while compiling',
      explanation: 'La compilación usó más memoria de la que el taller permite.',
      action: 'Simplificá tipos o macros muy anidados y volvé a ejecutar.',
    },
    {
      reason: 'threads',
      explanation: 'El programa lanzó más hilos de los que el taller permite.',
      action: 'Reducí la cantidad de hilos o goroutines que corren a la vez.',
    },
    {
      reason: 'cut output',
      explanation:
        'El programa imprimió más de lo que el taller puede leer, y la salida se cortó antes de las pruebas.',
      action: 'Quitá impresiones de más (por ejemplo, dentro de un bucle) y volvé a ejecutar.',
    },
    {
      reason: 'invalid evidence',
      explanation:
        'El programa terminó sin dejar correr todas las pruebas, o imprimió marcas que imitan las del taller.',
      action:
        'Revisá que tu código no termine el programa antes de tiempo (por ejemplo, con `exit`) ni imprima líneas que empiecen como las marcas de las pruebas.',
    },
  ])('the $reason explanation wins over the rules of the compiler', ({ explanation, action }) => {
    expect(diagnose(explanation + COMPILER, 'rust')).toEqual({ explanation, action });
    expect(diagnose(explanation, 'go')).toEqual({ explanation, action });
  });

  it('only counts an explanation at the start of the output', () => {
    const late = 'warning: unused\nLa ejecución superó el tiempo límite del taller y se cortó.';

    expect(diagnose(late, 'rust').explanation).toBe(
      'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
    );
  });
});
```

Si `diagnose.spec.ts` no importa `describe`, `expect`, `it` o `diagnose`, sumá lo que falte arriba.

**Paso 3.** `npm run test:unit -- src/entities/exercise/model/diagnose.spec.ts`:
- **fallan los seis casos:** con el compilador detrás, Rust da la regla de E0308 o la de sintaxis; sin compilador, Go da el texto por omisión;
- **pasa «only counts…»:** ninguna regla de Rust coincide y da el texto por omisión, como después del cambio.

**Paso 4.** En `diagnose.ts`, el import y el comienzo de `diagnose`:

```ts
import { SERVER_EXPLANATIONS } from './server-explanations';
```

```ts
export function diagnose(stderr: string, language: ExerciseLanguage): Diagnosis {
  for (const { explanation, action } of Object.values(SERVER_EXPLANATIONS))
    if (stderr.startsWith(explanation)) return { explanation, action };
  const rules = language === 'rust' ? RUST_RULES : GO_RULES;
  for (const [pattern, explanation, action] of rules)
    if (pattern.test(stderr)) return { explanation, action };
  return { ...FALLBACK };
}
```

**Paso 5.** `npm run test:unit -- src/entities/exercise` en verde (las specs de `reviewStateOf` de F7a no cambian). `npm test`.

**Paso 6.** Commit: `feat(front): la explicación del servidor gana al diagnóstico del compilador (A4 FR-018)`.

## 3. Unidad 3 · El adaptador de `/api/runs` y la plantilla (dueño F, onda 2)

Cubre FR-001 a FR-020, FR-026 a FR-031 y FR-036 y FR-037 del lado de la lógica; FR-046 y SC-002, SC-005, SC-007 y SC-008. Parte de la unidad 2 integrada.

### Tarea 3.1 · `quota` en el error de la API (T008, F)

- **Consume:** `createApiClient` y `createFakeFetch` (`frontend/src/shared/api/http/`, de F11a).
- **Produce:** `ApiFailure` de tipo `response` con `quota?: string` (research R4).
- **Archivos:**
  - `frontend/src/shared/api/http/api-client-quota.spec.ts` (nuevo);
  - `api-failure.ts`;
  - `api-client.ts`.

**Paso 1.** `api-client-quota.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createApiClient } from './api-client';
import { createFakeFetch } from './fake-fetch';

const ACTIVE = {
  message: 'Ya tenés una ejecución en curso: esperá a que termine.',
  code: 'quota_exceeded',
  quota: 'active',
};

describe('the quota of a rejected run (A4)', () => {
  it('keeps the quota that a quota_exceeded error names', async () => {
    const { fetch } = createFakeFetch([
      { status: 429, json: ACTIVE, headers: { 'Retry-After': '3' } },
    ]);
    const client = createApiClient({ fetch, readCookies: () => 'XSRF-TOKEN=abc' });

    const result = await client.send('POST', '/api/runs', {}, { asUser: 41 });

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: 'response',
        status: 429,
        code: 'quota_exceeded',
        message: ACTIVE.message,
        fieldErrors: {},
        retryAfterSeconds: 3,
        quota: 'active',
      },
    });
  });

  it('leaves the quota out when the body does not name one', async () => {
    const { fetch } = createFakeFetch([
      {
        status: 503,
        json: {
          message: 'El taller está ocupado ahora mismo: reintentá en unos segundos.',
          code: 'queue_full',
        },
        headers: { 'Retry-After': '10' },
      },
    ]);
    const client = createApiClient({ fetch, readCookies: () => '' });

    const result = await client.send('POST', '/api/runs', {});

    expect(result.ok ? null : result.failure).not.toHaveProperty('quota');
  });
});
```

**Paso 2.** `npm run test:unit -- src/shared/api/http/api-client-quota.spec.ts`: falla el primero (falta `quota`); el segundo pasa.

**Paso 3.** En `api-failure.ts`, la variante `response` suma `readonly quota?: string;` después de `retryAfterSeconds`. En `api-client.ts`, `failureOf` devuelve:

```ts
  return {
    kind: 'response',
    status: response.status,
    code: body.code,
    message: body.message,
    fieldErrors: fieldErrorsOf(body.errors),
    retryAfterSeconds: retryAfterOf(response.headers),
    ...(typeof body.quota === 'string' ? { quota: body.quota } : {}),
  };
```

**Paso 4.** `npm run test:unit -- src/shared/api/http` en verde: las specs de F11a no cambian, porque el campo es opcional. Commit: `feat(front): el cliente de la API conserva la cuota de un rechazo (A4)`.

### Tarea 3.2 · La ejecución del servidor y su veredicto (T009, F)

- **Consume:**
  - `RunVerdict` (`features/run-exercise/model/transport.ts`) y `buildRunResult` (`model/build-run-result.ts`), de F7a;
  - `hasPassingEvidence`, `SERVER_EXPLANATIONS` y `WORKSHOP_FAILURE` de `entities/exercise` (T007);
  - `Factory` de fishery.
- **Produce:**
  - `ServerRun`, `RunStatus`, `TestOutcome`, `FINAL_STATUSES` y `parseServerRun(body: unknown): ServerRun | null`;
  - `verdictOfRun(run: ServerRun, exercise: { readonly tests: readonly { readonly id: string }[] }): RunVerdict`;
  - `withoutEvidence(output: string): string`;
  - `ACCOUNT_DISABLED` y `RUN_CANCELED`.

  Todo según data-model.md §1 y §3.
- **Archivos (nuevos, en `frontend/src/features/run-exercise/api/`):**
  - `server-run.ts` y `server-run.spec.ts`;
  - `server-run.factory.ts`;
  - `run-verdict.ts` y `run-verdict.spec.ts`.

**Paso 1.** `server-run.factory.ts`, la ayuda de las specs. Los arreglos de `build` reemplazan a los del generador (Context7, fishery):

```ts
import { Factory } from 'fishery';

export const RUN_ID = '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21';
export const RUN_NONCE = '2f0c4d1e9a8b7c6d5e4f3a2b1c0d9e8f';

export interface ServerRunBody {
  id: string;
  status: string;
  reason: string | null;
  queuePosition: number | null;
  exerciseId: string;
  language: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  phase: string | null;
  exitCode: number | null;
  compileMs: number | null;
  runMs: number | null;
  truncated: boolean | null;
  stdout: string | null;
  stderr: string | null;
  tests: { key: string; outcome: string }[];
  customTest: string | null;
  attemptId: number | null;
}

function marker(key: string, outcome: 'PASS' | 'FAIL'): string {
  return `__TALLER_TEST__${RUN_NONCE}:${key}:${outcome}\n`;
}

export const runBodyFactory = Factory.define<ServerRunBody>(() => ({
  id: RUN_ID,
  status: 'passed',
  reason: null,
  queuePosition: null,
  exerciseId: 'rust-01',
  language: 'rust',
  createdAt: '2026-10-05T16:21:07.412Z',
  startedAt: '2026-10-05T16:21:07.903Z',
  finishedAt: '2026-10-05T16:21:08.511Z',
  phase: 'run',
  exitCode: 0,
  compileMs: 412,
  runMs: 31,
  truncated: false,
  stdout: `${marker('t1', 'PASS')}${marker('t2', 'PASS')}${marker('t3', 'PASS')}__TALLER_END__${RUN_NONCE}:3\n`,
  stderr: '',
  tests: [
    { key: 't1', outcome: 'pass' },
    { key: 't2', outcome: 'pass' },
    { key: 't3', outcome: 'pass' },
  ],
  customTest: null,
  attemptId: 1873,
}));

export function waitingRunBody(
  status: 'queued' | 'running',
  queuePosition: number | null = null,
): ServerRunBody {
  return runBodyFactory.build({
    status,
    queuePosition,
    startedAt: null,
    finishedAt: null,
    phase: null,
    exitCode: null,
    compileMs: null,
    runMs: null,
    truncated: null,
    stdout: null,
    stderr: null,
    tests: [],
    attemptId: null,
  });
}

export function withData(run: ServerRunBody): { data: ServerRunBody } {
  return { data: run };
}
```

**Paso 2.** Los stubs del rojo (TR-2). `server-run.ts`, con sus tipos completos y la función en stub:

```ts
export const RUN_STATUSES = [
  'queued',
  'running',
  'passed',
  'failed',
  'compile_error',
  'runtime_error',
  'timeout',
  'infra_error',
  'canceled',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const TEST_OUTCOMES = ['pass', 'fail', 'missing'] as const;
export type TestOutcome = (typeof TEST_OUTCOMES)[number];

export interface ServerTest {
  readonly key: string;
  readonly outcome: TestOutcome;
}

export interface ServerRun {
  readonly id: string;
  readonly status: RunStatus;
  readonly reason: string | null;
  readonly queuePosition: number | null;
  readonly stdout: string | null;
  readonly stderr: string | null;
  readonly tests: readonly ServerTest[];
  readonly customTest: TestOutcome | null;
  readonly attemptId: number | null;
}

export const FINAL_STATUSES: ReadonlySet<RunStatus> = new Set<RunStatus>([
  'passed',
  'failed',
  'compile_error',
  'runtime_error',
  'timeout',
  'infra_error',
  'canceled',
]);

export const parseServerRun: (body: unknown) => ServerRun | null = () => {
  throw new Error('not implemented');
};
```

`run-verdict.ts`:

```ts
import type { RunVerdict } from '../model/transport';
import type { ServerRun } from './server-run';

export const ACCOUNT_DISABLED =
  'Tu cuenta está deshabilitada. Consultá con quien administra el taller.';
export const RUN_CANCELED = 'La ejecución se canceló antes de terminar. Tu código sigue guardado.';

export const withoutEvidence: (output: string) => string = () => {
  throw new Error('not implemented');
};

export const verdictOfRun: (
  run: ServerRun,
  exercise: { readonly tests: readonly { readonly id: string }[] },
) => RunVerdict = () => {
  throw new Error('not implemented');
};
```

**Paso 3.** `server-run.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseServerRun } from './server-run';
import { RUN_ID, RUN_NONCE, runBodyFactory, waitingRunBody, withData } from './server-run.factory';

describe('parseServerRun (contract of B2 with attemptId)', () => {
  it('reads the fields the lab uses from the example of the contract', () => {
    expect(parseServerRun(withData(runBodyFactory.build()))).toEqual({
      id: RUN_ID,
      status: 'passed',
      reason: null,
      queuePosition: null,
      stdout: `__TALLER_TEST__${RUN_NONCE}:t1:PASS\n__TALLER_TEST__${RUN_NONCE}:t2:PASS\n__TALLER_TEST__${RUN_NONCE}:t3:PASS\n__TALLER_END__${RUN_NONCE}:3\n`,
      stderr: '',
      tests: [
        { key: 't1', outcome: 'pass' },
        { key: 't2', outcome: 'pass' },
        { key: 't3', outcome: 'pass' },
      ],
      customTest: null,
      attemptId: 1873,
    });
  });

  it('reads a run that waits in the queue', () => {
    expect(parseServerRun(withData(waitingRunBody('queued', 3)))).toMatchObject({
      status: 'queued',
      queuePosition: 3,
      stdout: null,
      tests: [],
      attemptId: null,
    });
  });

  it('keeps a reason that the lab does not know yet', () => {
    expect(
      parseServerRun(withData(runBodyFactory.build({ status: 'infra_error', reason: 'brand_new' })))
        ?.reason,
    ).toBe('brand_new');
  });

  it.for([
    ['the run without its envelope', runBodyFactory.build()],
    ['an unknown status', withData(runBodyFactory.build({ status: 'finished' }))],
    ['a test that is not a list', { data: { ...runBodyFactory.build(), tests: 'pass' } }],
    ['an unknown outcome', withData(runBodyFactory.build({ tests: [{ key: 't1', outcome: 'ok' }] }))],
    ['an attempt of zero', withData(runBodyFactory.build({ attemptId: 0 }))],
    ['an attempt as text', { data: { ...runBodyFactory.build(), attemptId: '1873' } }],
    ['a queue place as text', { data: { ...waitingRunBody('queued'), queuePosition: '3' } }],
    ['an unknown custom outcome', withData(runBodyFactory.build({ customTest: 'ok' }))],
  ] as const)('reads %s as unreadable', ([, body]) => {
    expect(parseServerRun(body)).toBeNull();
  });
});
```

**Paso 4.** `run-verdict.spec.ts`. Los textos esperados se escriben acá, copiados de la spec:

```ts
import { describe, expect, it } from 'vitest';
import { hasPassingEvidence } from '../../../entities/exercise';
import { buildRunResult } from '../model/build-run-result';
import { verdictOfRun, withoutEvidence } from './run-verdict';
import { parseServerRun, type ServerRun } from './server-run';
import { RUN_NONCE, runBodyFactory, withData, type ServerRunBody } from './server-run.factory';

const EXERCISE = { tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] };
const ALL_PASSED = new Map([
  ['t1', true],
  ['t2', true],
  ['t3', true],
]);
const NONE_PASSED = new Map([
  ['t1', false],
  ['t2', false],
  ['t3', false],
]);
const COMPILER = 'error[E0308]: mismatched types\n --> src/main.rs:4:5\n';

function runOf(overrides: Partial<ServerRunBody>): ServerRun {
  const run = parseServerRun(withData(runBodyFactory.build(overrides)));
  if (run === null) throw new Error('the factory built an unreadable run');
  return run;
}

describe('verdictOfRun (A4, «Del resultado del servidor a lo que ve el alumno»)', () => {
  it('passed: executed, every test, the output without evidence and the attempt', () => {
    expect(verdictOfRun(runOf({}), EXERCISE)).toEqual({
      kind: 'executed',
      success: true,
      stdout: '',
      stderr: '',
      tests: ALL_PASSED,
      customPassed: false,
      attemptId: 1873,
    });
  });

  it('failed without a reason: it ran, and the test that failed does not pass', () => {
    const verdict = verdictOfRun(
      runOf({
        status: 'failed',
        tests: [
          { key: 't1', outcome: 'pass' },
          { key: 't2', outcome: 'fail' },
          { key: 't3', outcome: 'pass' },
        ],
      }),
      EXERCISE,
    );

    expect(verdict).toMatchObject({
      kind: 'executed',
      success: true,
      tests: new Map([
        ['t1', true],
        ['t2', false],
        ['t3', true],
      ]),
    });
  });

  it.for([
    {
      case: 'failed for the cut output',
      status: 'failed',
      reason: 'output_limit',
      explanation:
        'El programa imprimió más de lo que el taller puede leer, y la salida se cortó antes de las pruebas.',
    },
    {
      case: 'failed for invalid evidence',
      status: 'failed',
      reason: 'evidence_invalid',
      explanation:
        'El programa terminó sin dejar correr todas las pruebas, o imprimió marcas que imitan las del taller.',
    },
    {
      case: 'compile_error for memory',
      status: 'compile_error',
      reason: 'oom',
      explanation: 'La compilación usó más memoria de la que el taller permite.',
    },
    {
      case: 'runtime_error for memory',
      status: 'runtime_error',
      reason: 'oom',
      explanation: 'El programa usó más memoria de la que el taller permite.',
    },
    {
      case: 'runtime_error for threads',
      status: 'runtime_error',
      reason: 'pids_limit',
      explanation: 'El programa lanzó más hilos de los que el taller permite.',
    },
    {
      case: 'timeout',
      status: 'timeout',
      reason: null,
      explanation: 'La ejecución superó el tiempo límite del taller y se cortó.',
    },
  ])('$case: not a success, and the explanation goes first in the error output', ({ status, reason, explanation }) => {
    const verdict = verdictOfRun(runOf({ status, reason, stderr: 'thread main panicked' }), EXERCISE);

    expect(verdict).toMatchObject({
      kind: 'executed',
      success: false,
      stderr: `${explanation}\n\nthread main panicked`,
    });
  });

  it('a timeout without output keeps only the explanation', () => {
    const verdict = verdictOfRun(runOf({ status: 'timeout', stderr: null, tests: [] }), EXERCISE);

    expect(verdict).toMatchObject({
      stderr: 'La ejecución superó el tiempo límite del taller y se cortó.',
      tests: NONE_PASSED,
    });
  });

  it('a compile_error without a reason keeps the diagnostics of the compiler as they are', () => {
    const verdict = verdictOfRun(
      runOf({ status: 'compile_error', phase: 'compile', exitCode: 1, stdout: '', stderr: COMPILER, tests: [] }),
      EXERCISE,
    );

    expect(verdict).toEqual({
      kind: 'executed',
      success: false,
      stdout: '',
      stderr: COMPILER,
      tests: NONE_PASSED,
      customPassed: false,
      attemptId: 1873,
    });
  });

  it('a runtime_error with a signal keeps the panic for the diagnosis', () => {
    const panic = "thread 'main' panicked at src/main.rs:2:5:\nattempt to subtract with overflow\n";

    expect(
      verdictOfRun(runOf({ status: 'runtime_error', reason: 'signal', stderr: panic, tests: [] }), EXERCISE),
    ).toMatchObject({ success: false, stderr: panic });
  });

  it('infra_error is a failure of the workshop, with its attempt', () => {
    expect(verdictOfRun(runOf({ status: 'infra_error', reason: 'executor_busy' }), EXERCISE)).toEqual({
      kind: 'transport-failure',
      message:
        'El taller no pudo ejecutar tu código por una falla propia, no de tu programa. Tu código sigue guardado; volvé a intentar en un momento.',
      attemptId: 1873,
    });
  });

  it('a run canceled for a disabled account shows the message of C3a, with its attempt', () => {
    expect(verdictOfRun(runOf({ status: 'canceled', reason: 'account_disabled' }), EXERCISE)).toEqual({
      kind: 'transport-failure',
      message: 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
      attemptId: 1873,
    });
  });

  it('a run canceled for another reason says it was canceled', () => {
    expect(verdictOfRun(runOf({ status: 'canceled', reason: null }), EXERCISE)).toMatchObject({
      kind: 'transport-failure',
      message: 'La ejecución se canceló antes de terminar. Tu código sigue guardado.',
    });
  });

  it('the custom test passes only with pass', () => {
    expect(verdictOfRun(runOf({ customTest: 'pass' }), EXERCISE)).toMatchObject({ customPassed: true });
    expect(verdictOfRun(runOf({ customTest: 'missing' }), EXERCISE)).toMatchObject({ customPassed: false });
  });

  it('a run without an attempt gives no attemptId', () => {
    expect(verdictOfRun(runOf({ status: 'failed', attemptId: null }), EXERCISE)).not.toHaveProperty('attemptId');
  });

  describe('the approval battery: only passed approves (FR-015, SC-002)', () => {
    const CONTEXT = { code: 'fn energia(c: i32) -> i32 { c * 7 }', customTest: '', now: 1 };
    const approves = (overrides: Partial<ServerRunBody>): boolean =>
      hasPassingEvidence(
        buildRunResult(EXERCISE, verdictOfRun(runOf(overrides), EXERCISE), CONTEXT),
        EXERCISE.tests,
      );

    it('passed with its three tests approves', () => {
      expect(approves({})).toBe(true);
    });

    it.for([
      ['failed', null],
      ['failed', 'output_limit'],
      ['failed', 'evidence_invalid'],
      ['compile_error', null],
      ['compile_error', 'oom'],
      ['runtime_error', null],
      ['runtime_error', 'signal'],
      ['runtime_error', 'oom'],
      ['runtime_error', 'pids_limit'],
      ['timeout', null],
      ['infra_error', 'executor_busy'],
      ['infra_error', 'executor_error'],
      ['infra_error', 'job_failed'],
      ['infra_error', 'expired'],
      ['canceled', null],
      ['canceled', 'account_disabled'],
    ] as const)('%s with reason %s never approves, even with the three tests in pass', ([status, reason]) => {
      expect(approves({ status, reason })).toBe(false);
    });
  });
});

describe('withoutEvidence (FR-017)', () => {
  const TEST = `__TALLER_TEST__${RUN_NONCE}:t1:PASS`;
  const END = `__TALLER_END__${RUN_NONCE}:1`;

  it('drops the lines that only hold a marker or the sentinel', () => {
    expect(withoutEvidence(`hola\n${TEST}\n${END}\n`)).toBe('hola\n');
  });

  it('keeps the text the student printed on the same line as a marker', () => {
    expect(withoutEvidence(`sin salto${TEST}\n${END}\n`)).toBe('sin salto\n');
  });

  it('keeps a marker that imitates the workshop with another length', () => {
    expect(withoutEvidence('__TALLER_TEST__abc:t1:PASS\n')).toBe('__TALLER_TEST__abc:t1:PASS\n');
  });

  it('keeps the blank lines the program printed', () => {
    expect(withoutEvidence(`uno\n\ndos\n${TEST}\n`)).toBe('uno\n\ndos\n');
  });
});
```

**Paso 5.** `npm run test:unit -- src/features/run-exercise/api`: todo falla por `not implemented`.

**Paso 6.** `server-run.ts`, la implementación (reemplaza el stub; los tipos no cambian):

```ts
import { isPlainObject } from '../../../shared/lib/is-plain-object';

// … RUN_STATUSES, RunStatus, TEST_OUTCOMES, TestOutcome, ServerTest, ServerRun y FINAL_STATUSES como en el paso 2 …

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function isTextOrNull(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isCountOrNull(value: unknown): boolean {
  return value === null || (Number.isSafeInteger(value) && (value as number) > 0);
}

const FIELD_CHECKS: readonly (readonly [string, (value: unknown) => boolean])[] = [
  ['id', (value) => typeof value === 'string'],
  ['status', (value) => isOneOf(RUN_STATUSES, value)],
  ['reason', isTextOrNull],
  ['queuePosition', isCountOrNull],
  ['stdout', isTextOrNull],
  ['stderr', isTextOrNull],
  ['customTest', (value) => value === null || isOneOf(TEST_OUTCOMES, value)],
  ['attemptId', isCountOrNull],
];

function testsOf(value: unknown): ServerTest[] | null {
  if (!Array.isArray(value)) return null;
  const tests: ServerTest[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry) || typeof entry.key !== 'string') return null;
    if (!isOneOf(TEST_OUTCOMES, entry.outcome)) return null;
    tests.push({ key: entry.key, outcome: entry.outcome });
  }
  return tests;
}

export function parseServerRun(body: unknown): ServerRun | null {
  if (!isPlainObject(body) || !isPlainObject(body.data)) return null;
  const data = body.data;
  const tests = testsOf(data.tests);
  if (tests === null || !FIELD_CHECKS.every(([field, check]) => check(data[field]))) return null;
  return {
    id: data.id as string,
    status: data.status as RunStatus,
    reason: data.reason as string | null,
    queuePosition: data.queuePosition as number | null,
    stdout: data.stdout as string | null,
    stderr: data.stderr as string | null,
    tests,
    customTest: data.customTest as TestOutcome | null,
    attemptId: data.attemptId as number | null,
  };
}
```

El bloque de los tipos del paso 2 se conserva tal cual arriba de estas funciones; el comentario «… como en el paso 2 …» no va en el archivo.

**Paso 7.** `run-verdict.ts`, la implementación (el comentario del patrón es la referencia puntual al protocolo de B2):

```ts
import {
  SERVER_EXPLANATIONS,
  WORKSHOP_FAILURE,
  type ServerExplanation,
} from '../../../entities/exercise';
import type { RunVerdict } from '../model/transport';
import type { ServerRun } from './server-run';

export const ACCOUNT_DISABLED =
  'Tu cuenta está deshabilitada. Consultá con quien administra el taller.';
export const RUN_CANCELED = 'La ejecución se canceló antes de terminar. Tu código sigue guardado.';

interface ExpectedTests {
  readonly tests: readonly { readonly id: string }[];
}

// The markers of specs/005-b2-api-ejecuciones/contracts/harness-template.md, with any 32-hex nonce.
const EVIDENCE =
  /__TALLER_(?:TEST__[0-9a-f]{32}:[A-Za-z0-9_]{1,64}:(?:PASS|FAIL)|END__[0-9a-f]{32}:[0-9]+)/g;

const EXPLANATIONS: Readonly<Record<string, ServerExplanation>> = {
  'failed:output_limit': SERVER_EXPLANATIONS.outputLimit,
  'failed:evidence_invalid': SERVER_EXPLANATIONS.evidenceInvalid,
  'compile_error:oom': SERVER_EXPLANATIONS.compileMemory,
  'runtime_error:oom': SERVER_EXPLANATIONS.runMemory,
  'runtime_error:pids_limit': SERVER_EXPLANATIONS.threads,
};

export function withoutEvidence(output: string): string {
  return output
    .split('\n')
    .flatMap((line) => {
      const rest = line.replace(EVIDENCE, '');
      return rest === line || rest.trim() !== '' ? [rest] : [];
    })
    .join('\n');
}

function explanationOf(run: ServerRun): ServerExplanation | undefined {
  if (run.status === 'timeout') return SERVER_EXPLANATIONS.timeout;
  return EXPLANATIONS[`${run.status}:${run.reason ?? ''}`];
}

function withExplanation(explanation: ServerExplanation | undefined, stderr: string): string {
  if (explanation === undefined) return stderr;
  return stderr === '' ? explanation.explanation : `${explanation.explanation}\n\n${stderr}`;
}

function succeeded(run: ServerRun, tests: ReadonlyMap<string, boolean>): boolean {
  if (run.status === 'passed') return true;
  if (run.status !== 'failed' || run.reason !== null) return false;
  return [...tests.values()].includes(false);
}

function failureMessage(run: ServerRun): string {
  if (run.status === 'infra_error') return WORKSHOP_FAILURE;
  return run.reason === 'account_disabled' ? ACCOUNT_DISABLED : RUN_CANCELED;
}

export function verdictOfRun(run: ServerRun, exercise: ExpectedTests): RunVerdict {
  const attempt = run.attemptId === null ? {} : { attemptId: run.attemptId };
  if (run.status === 'infra_error' || run.status === 'canceled')
    return { kind: 'transport-failure', message: failureMessage(run), ...attempt };
  const outcomes = new Map(run.tests.map((test) => [test.key, test.outcome === 'pass']));
  const tests = new Map(exercise.tests.map((test) => [test.id, outcomes.get(test.id) === true]));
  return {
    kind: 'executed',
    success: succeeded(run, tests),
    stdout: withoutEvidence(run.stdout ?? ''),
    stderr: withExplanation(explanationOf(run), withoutEvidence(run.stderr ?? '')),
    tests,
    customPassed: run.customTest === 'pass',
    ...attempt,
  };
}
```

**Paso 8.** `npm run test:unit -- src/features/run-exercise/api` en verde (Review Focus 2 y 3). `npm run lint`. Commit: `feat(front): el veredicto sale de la ejecución del servidor y nunca aprueba sin passed (A4 FR-014 a FR-019)`.

### Tarea 3.3 · El calendario, cuándo volver y el texto de la espera (T010, F)

- **Consume:** nada nuevo.
- **Produce:**
  - `run-schedule.ts`: las constantes de las Restricciones globales, `pollDelayMs(poll: number): number` y `turnDelayMs(retryAfterSeconds: number, turn: number, random: () => number): number`;
  - `retryHint(retryAfterSeconds: number, now: Date): string`;
  - `ApiRunPhase` y `ApiRunProgress` (`run-progress.ts`);
  - `describeRunProgress` y `DELAY_NOTICE` (`ui/describe-run-progress.ts`).
- **Archivos (nuevos):**
  - `features/run-exercise/api/run-schedule.ts` y `.spec.ts`;
  - `api/retry-hint.ts` y `.spec.ts`;
  - `api/run-progress.ts`;
  - `ui/describe-run-progress.ts` y `.spec.ts`.

**Paso 1.** `run-progress.ts` (sólo tipos, no lleva prueba propia):

```ts
export type ApiRunPhase =
  | { readonly kind: 'queued'; readonly position: number }
  | { readonly kind: 'running' }
  | { readonly kind: 'waiting-turn'; readonly retryInSeconds: number };

export interface ApiRunProgress {
  readonly phase: ApiRunPhase;
  readonly delayed: boolean;
}
```

Los stubs del rojo, en los otros tres archivos:

```ts
// run-schedule.ts
export const POLL_FIRST_MS = 300;
export const POLL_MAX_MS = 2000;
export const GROWTH = 1.5;
export const SUBMIT_RETRY_DELAYS_MS: readonly number[] = [500, 1000];
export const POLL_FAILURE_LIMIT_MS = 30_000;
export const DELAY_NOTICE_MS = 15_000;
export const SAFETY_NET_MS = 12 * 60_000;
export const TURN_LIMIT_MS = 120_000;
export const TURN_JITTER_MS = 1000;

export const pollDelayMs: (poll: number) => number = () => {
  throw new Error('not implemented');
};
export const turnDelayMs: (
  retryAfterSeconds: number,
  turn: number,
  random: () => number,
) => number = () => {
  throw new Error('not implemented');
};

// retry-hint.ts
export const retryHint: (retryAfterSeconds: number, now: Date) => string = () => {
  throw new Error('not implemented');
};

// ui/describe-run-progress.ts
import type { ApiRunProgress } from '../api/run-progress';

export const DELAY_NOTICE =
  'Está tardando más de lo habitual. Podés seguir esperando o cancelar; tu código sigue guardado.';

export interface RunProgressCopy {
  readonly line: string;
  readonly announcement: string;
  readonly delayNotice: string | null;
}

export const describeRunProgress: (progress: ApiRunProgress | null) => RunProgressCopy = () => {
  throw new Error('not implemented');
};
```

**Paso 2.** Las specs:

```ts
// run-schedule.spec.ts
import { describe, expect, it } from 'vitest';
import { pollDelayMs, turnDelayMs } from './run-schedule';

describe('the schedule of the lab (ADR 0005 §3, A4 FR-004 and FR-010)', () => {
  it('waits from 0.3 s to 2 s between polls and stays at 2 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(pollDelayMs)).toEqual([
      300, 450, 675, 1013, 1519, 2000, 2000, 2000,
    ]);
  });

  it('waits its turn at least the Retry-After, growing, plus up to one second of chance', () => {
    expect(turnDelayMs(3, 0, () => 0)).toBe(3000);
    expect(turnDelayMs(3, 1, () => 0)).toBe(4500);
    expect(turnDelayMs(3, 2, () => 0)).toBe(6750);
    expect(turnDelayMs(3, 0, () => 0.5)).toBe(3500);
    expect(turnDelayMs(10, 0, () => 0.999)).toBe(10999);
  });
});

// retry-hint.spec.ts
import { describe, expect, it } from 'vitest';
import { retryHint } from './retry-hint';

describe('retryHint, when the student may run again (FR-011)', () => {
  const NOW = new Date(2026, 9, 28, 10, 15, 0);

  it.for([
    [40, 'Podés volver a ejecutar en 40 s.'],
    [0, 'Podés volver a ejecutar en 1 s.'],
    [119, 'Podés volver a ejecutar en 119 s.'],
    [120, 'Podés volver a ejecutar en 2 min.'],
    [7199, 'Podés volver a ejecutar en 120 min.'],
    [7200, 'Podés volver a ejecutar a las 12:15.'],
    [7230, 'Podés volver a ejecutar a las 12:16.'],
    [90_000, 'Podés volver a ejecutar a las 11:15.'],
  ] as const)('after %i s says «%s»', ([seconds, text]) => {
    expect(retryHint(seconds, NOW)).toBe(text);
  });
});

// ui/describe-run-progress.spec.ts
import { describe, expect, it } from 'vitest';
import { describeRunProgress } from './describe-run-progress';

describe('describeRunProgress, the copy of the wait (Q3, FR-036 and FR-039)', () => {
  it('reads no progress as the run of today', () => {
    expect(describeRunProgress(null)).toEqual({
      line: 'Ejecutando código real…',
      announcement: 'Ejecutando código real…',
      delayNotice: null,
    });
  });

  it('shows the queue place in the line and not in the announcement', () => {
    const first = describeRunProgress({ phase: { kind: 'queued', position: 3 }, delayed: false });
    const later = describeRunProgress({ phase: { kind: 'queued', position: 1 }, delayed: false });

    expect(first.line).toBe('En la fila del taller: sos el número 3.');
    expect(later.line).toBe('En la fila del taller: sos el número 1.');
    expect(first.announcement).toBe('En la fila del taller.');
    expect(later.announcement).toBe(first.announcement);
  });

  it('says when it tries again while it waits its turn', () => {
    expect(
      describeRunProgress({ phase: { kind: 'waiting-turn', retryInSeconds: 4 }, delayed: false }),
    ).toEqual({
      line: 'Esperando turno para ejecutar: vuelvo a intentar en 4 s.',
      announcement: 'Esperando turno para ejecutar.',
      delayNotice: null,
    });
  });

  it('adds the delay notice to the state that shows', () => {
    expect(describeRunProgress({ phase: { kind: 'running' }, delayed: true })).toEqual({
      line: 'Ejecutando código real…',
      announcement: 'Ejecutando código real…',
      delayNotice:
        'Está tardando más de lo habitual. Podés seguir esperando o cancelar; tu código sigue guardado.',
    });
  });
});
```

**Paso 3.** `npm run test:unit -- src/features/run-exercise`: las tres specs nuevas fallan por `not implemented`.

**Paso 4.** Las implementaciones (reemplazan los stubs; las constantes de `run-schedule.ts` y los tipos de `describe-run-progress.ts` quedan como en el paso 1):

```ts
// run-schedule.ts
export function pollDelayMs(poll: number): number {
  return Math.min(POLL_MAX_MS, Math.round(POLL_FIRST_MS * GROWTH ** poll));
}

export function turnDelayMs(retryAfterSeconds: number, turn: number, random: () => number): number {
  return Math.round(retryAfterSeconds * 1000 * GROWTH ** turn + random() * TURN_JITTER_MS);
}

// retry-hint.ts
const SECONDS_LIMIT = 120;
const MINUTES_LIMIT = 7200;
const MINUTE_MS = 60_000;

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function retryHint(retryAfterSeconds: number, now: Date): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  if (seconds < SECONDS_LIMIT) return `Podés volver a ejecutar en ${seconds} s.`;
  if (seconds < MINUTES_LIMIT) return `Podés volver a ejecutar en ${Math.ceil(seconds / 60)} min.`;
  const at = new Date(Math.ceil((now.getTime() + seconds * 1000) / MINUTE_MS) * MINUTE_MS);
  return `Podés volver a ejecutar a las ${twoDigits(at.getHours())}:${twoDigits(at.getMinutes())}.`;
}

// ui/describe-run-progress.ts
const RUNNING = 'Ejecutando código real…';

function phaseCopy(progress: ApiRunProgress | null): Omit<RunProgressCopy, 'delayNotice'> {
  const phase = progress?.phase;
  if (phase?.kind === 'queued')
    return {
      line: `En la fila del taller: sos el número ${phase.position}.`,
      announcement: 'En la fila del taller.',
    };
  if (phase?.kind === 'waiting-turn')
    return {
      line: `Esperando turno para ejecutar: vuelvo a intentar en ${phase.retryInSeconds} s.`,
      announcement: 'Esperando turno para ejecutar.',
    };
  return { line: RUNNING, announcement: RUNNING };
}

export function describeRunProgress(progress: ApiRunProgress | null): RunProgressCopy {
  return { ...phaseCopy(progress), delayNotice: progress?.delayed === true ? DELAY_NOTICE : null };
}
```

La spec de `retryHint` construye la fecha en la hora local, igual que la función, así que da lo mismo con cualquier zona horaria. El 28 de octubre de 2026 no hay cambio de hora entre las 10:15 y el día siguiente en Argentina ni en UTC.

**Paso 5.** `npm run test:unit -- src/features/run-exercise` en verde. Commit: `feat(front): el calendario de la espera y sus textos (A4 FR-004, FR-010, FR-011 y FR-036)`.

### Tarea 3.4 · Qué hacer con cada respuesta (T011, F)

- **Consume:** `ApiResult` y `ApiFailure` (con `quota`, de T008); `parseServerRun` (T009); `retryHint` (T010).
- **Produce:** `decideSubmit(result: ApiResult, now: Date): SubmitDecision`, `decidePoll(result: ApiResult): PollDecision` y los textos `NETWORK`, `UNAVAILABLE`, `UNREADABLE`, `SESSION_EXPIRED`, `RELOAD_CONTENT` y `rejected(status: number): string` (data-model.md §4 y §7).
- **Archivos:** `features/run-exercise/api/run-decisions.ts` y `run-decisions.spec.ts` (nuevos).

**Paso 1.** `run-decisions.ts`, con los tipos y los textos completos, y las dos funciones en stub:

```ts
import type { ApiResult } from '../../../shared/api/http';
import type { ServerRun } from './server-run';

export const NETWORK =
  'No se pudo conectar con el taller. Revisá tu conexión. Podés seguir leyendo y resolviendo las preguntas sin conexión.';
export const UNAVAILABLE =
  'El taller no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.';
export const UNREADABLE = 'El taller devolvió una respuesta que no se pudo leer. Volvé a intentar.';
export const SESSION_EXPIRED =
  'Tu sesión venció: volvé a ingresar para ejecutar. Tu código sigue guardado.';
export const RELOAD_CONTENT = 'Recargá la página para traer el contenido al día.';

export function rejected(status: number): string {
  return `El taller rechazó la solicitud (HTTP ${status}). Volvé a intentar; si se repite, recargá la página.`;
}

export type SubmitDecision =
  | { readonly kind: 'accepted'; readonly run: ServerRun }
  | { readonly kind: 'retry'; readonly message: string }
  | { readonly kind: 'wait-turn'; readonly retryAfterSeconds: number; readonly message: string }
  | { readonly kind: 'stop'; readonly message: string; readonly signIn: boolean };

export type PollDecision =
  | { readonly kind: 'run'; readonly run: ServerRun }
  | { readonly kind: 'retry'; readonly retryAfterSeconds: number | null }
  | { readonly kind: 'stop'; readonly message: string; readonly signIn: boolean };

export const decideSubmit: (result: ApiResult, now: Date) => SubmitDecision = () => {
  throw new Error('not implemented');
};

export const decidePoll: (result: ApiResult) => PollDecision = () => {
  throw new Error('not implemented');
};
```

**Paso 2.** `run-decisions.spec.ts`. Los mensajes de la API son los de `lang/es` de B2 y C3a:

```ts
import { describe, expect, it } from 'vitest';
import type { ApiFailure, ApiResult } from '../../../shared/api/http';
import { decidePoll, decideSubmit } from './run-decisions';
import { parseServerRun } from './server-run';
import { runBodyFactory, waitingRunBody, withData } from './server-run.factory';

type ResponseFailure = Extract<ApiFailure, { kind: 'response' }>;

const NOW = new Date(2026, 9, 28, 10, 15, 0);
const NETWORK_TEXT =
  'No se pudo conectar con el taller. Revisá tu conexión. Podés seguir leyendo y resolviendo las preguntas sin conexión.';
const SESSION_TEXT = 'Tu sesión venció: volvé a ingresar para ejecutar. Tu código sigue guardado.';
const UNREADABLE_TEXT = 'El taller devolvió una respuesta que no se pudo leer. Volvé a intentar.';

function apiError(
  status: number,
  code: string,
  message: string,
  extra: Partial<ResponseFailure> = {},
): ApiResult {
  return {
    ok: false,
    failure: { kind: 'response', status, code, message, fieldErrors: {}, retryAfterSeconds: null, ...extra },
  };
}

const QUEUED = withData(waitingRunBody('queued', 1));

describe('decideSubmit (A4 FR-003, FR-010 to FR-012 and FR-037)', () => {
  it('accepts a readable run, and stops on an unreadable one', () => {
    expect(decideSubmit({ ok: true, status: 202, body: QUEUED }, NOW)).toEqual({
      kind: 'accepted',
      run: parseServerRun(QUEUED),
    });
    expect(decideSubmit({ ok: true, status: 202, body: { data: {} } }, NOW)).toEqual({
      kind: 'stop',
      message: UNREADABLE_TEXT,
      signIn: false,
    });
  });

  it('retries a lost network and a 5xx without the error of the API', () => {
    expect(decideSubmit({ ok: false, failure: { kind: 'network' } }, NOW)).toEqual({
      kind: 'retry',
      message: NETWORK_TEXT,
    });
    expect(decideSubmit({ ok: false, failure: { kind: 'unexpected', status: 502 } }, NOW)).toEqual({
      kind: 'retry',
      message: 'El taller no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.',
    });
  });

  it('retries a server_error with its message', () => {
    const message = 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.';

    expect(decideSubmit(apiError(500, 'server_error', message), NOW)).toEqual({ kind: 'retry', message });
  });

  it('waits its turn for the active quota and for a full queue, with their default waits', () => {
    const active = 'Ya tenés una ejecución en curso: esperá a que termine.';
    const full = 'El taller está ocupado ahora mismo: reintentá en unos segundos.';

    expect(
      decideSubmit(apiError(429, 'quota_exceeded', active, { quota: 'active', retryAfterSeconds: 3 }), NOW),
    ).toEqual({ kind: 'wait-turn', retryAfterSeconds: 3, message: active });
    expect(decideSubmit(apiError(429, 'quota_exceeded', active, { quota: 'active' }), NOW)).toEqual({
      kind: 'wait-turn',
      retryAfterSeconds: 3,
      message: active,
    });
    expect(decideSubmit(apiError(503, 'queue_full', full), NOW)).toEqual({
      kind: 'wait-turn',
      retryAfterSeconds: 10,
      message: full,
    });
  });

  it.for([
    [
      'per_minute',
      'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.',
      40,
      'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento. Podés volver a ejecutar en 40 s.',
    ],
    [
      'per_day',
      'Llegaste al máximo de ejecuciones de las últimas 24 horas.',
      7200,
      'Llegaste al máximo de ejecuciones de las últimas 24 horas. Podés volver a ejecutar a las 12:15.',
    ],
    [
      'sandbox_time',
      'Llegaste al máximo de tiempo de ejecución de las últimas 24 horas.',
      600,
      'Llegaste al máximo de tiempo de ejecución de las últimas 24 horas. Podés volver a ejecutar en 10 min.',
    ],
  ] as const)('stops on the %s quota with the message and when to run again', ([quota, message, seconds, text]) => {
    expect(
      decideSubmit(apiError(429, 'quota_exceeded', message, { quota, retryAfterSeconds: seconds }), NOW),
    ).toEqual({ kind: 'stop', message: text, signIn: false });
  });

  it('stops on too_many_requests without retrying', () => {
    const message = 'Demasiados intentos. Esperá un momento antes de volver a probar.';

    expect(
      decideSubmit(apiError(429, 'too_many_requests', message, { retryAfterSeconds: 50 }), NOW),
    ).toEqual({ kind: 'stop', message: `${message} Podés volver a ejecutar en 50 s.`, signIn: false });
  });

  it('asks to sign in on a 401 and on a session that is gone', () => {
    const expected = { kind: 'stop', message: SESSION_TEXT, signIn: true };

    expect(decideSubmit(apiError(401, 'unauthenticated', 'Iniciá sesión para continuar.'), NOW)).toEqual(expected);
    expect(decideSubmit({ ok: false, failure: { kind: 'signed-out' } }, NOW)).toEqual(expected);
  });

  it.for([
    [409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.'],
    [403, 'account_disabled', 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.'],
    [403, 'email_unverified', 'Verificá tu email para continuar.'],
    [
      422,
      'client_run_id_reused',
      'Ese identificador de ejecución ya se usó con otro código, otro ejercicio u otra prueba propia.',
    ],
  ] as const)('stops on %i %s with the message of the API', ([status, code, message]) => {
    expect(decideSubmit(apiError(status, code, message), NOW)).toEqual({ kind: 'stop', message, signIn: false });
  });

  it('stops on a changed account with the message the client brought', () => {
    const message = 'La página venció: recargala e intentá de nuevo.';

    expect(decideSubmit({ ok: false, failure: { kind: 'account-changed', message } }, NOW)).toEqual({
      kind: 'stop',
      message,
      signIn: false,
    });
  });

  it('suggests reloading when the server retired the exercise', () => {
    const result = apiError(422, 'validation_failed', 'Hay datos que corregir.', {
      fieldErrors: { exerciseId: ['El ejercicio no existe o está retirado.'] },
    });

    expect(decideSubmit(result, NOW)).toEqual({
      kind: 'stop',
      message: 'El ejercicio no existe o está retirado. Recargá la página para traer el contenido al día.',
      signIn: false,
    });
  });

  it('adds the first message of a field to another validation error', () => {
    const result = apiError(422, 'validation_failed', 'Hay datos que corregir.', {
      fieldErrors: { customTest: ['La prueba propia no puede pasar de 3000 caracteres.'] },
    });

    expect(decideSubmit(result, NOW)).toMatchObject({
      message: 'Hay datos que corregir. La prueba propia no puede pasar de 3000 caracteres.',
    });
  });

  it('stops on a 4xx without the error of the API with its HTTP status', () => {
    expect(decideSubmit({ ok: false, failure: { kind: 'unexpected', status: 413 } }, NOW)).toEqual({
      kind: 'stop',
      message: 'El taller rechazó la solicitud (HTTP 413). Volvé a intentar; si se repite, recargá la página.',
      signIn: false,
    });
    expect(decideSubmit({ ok: false, failure: { kind: 'unexpected', status: 200 } }, NOW)).toMatchObject({
      message: UNREADABLE_TEXT,
    });
  });
});

describe('decidePoll (A4 FR-005 and FR-013)', () => {
  const FINISHED = withData(runBodyFactory.build());

  it('reads a run, and stops on an unreadable one', () => {
    expect(decidePoll({ ok: true, status: 200, body: FINISHED })).toEqual({
      kind: 'run',
      run: parseServerRun(FINISHED),
    });
    expect(decidePoll({ ok: true, status: 200, body: {} })).toEqual({
      kind: 'stop',
      message: UNREADABLE_TEXT,
      signIn: false,
    });
  });

  it('keeps polling after a lost network, a 5xx and a 429, with the Retry-After when it came', () => {
    expect(decidePoll({ ok: false, failure: { kind: 'network' } })).toEqual({ kind: 'retry', retryAfterSeconds: null });
    expect(decidePoll({ ok: false, failure: { kind: 'unexpected', status: 429 } })).toEqual({
      kind: 'retry',
      retryAfterSeconds: null,
    });
    expect(decidePoll({ ok: false, failure: { kind: 'unexpected', status: 504 } })).toEqual({
      kind: 'retry',
      retryAfterSeconds: null,
    });
    expect(
      decidePoll(apiError(429, 'too_many_requests', 'Demasiados intentos.', { retryAfterSeconds: 5 })),
    ).toEqual({ kind: 'retry', retryAfterSeconds: 5 });
    expect(decidePoll(apiError(500, 'server_error', 'Algo salió mal de nuestro lado.'))).toEqual({
      kind: 'retry',
      retryAfterSeconds: null,
    });
  });

  it('stops and asks to sign in on a 401', () => {
    expect(decidePoll(apiError(401, 'unauthenticated', 'Iniciá sesión para continuar.'))).toEqual({
      kind: 'stop',
      message: SESSION_TEXT,
      signIn: true,
    });
  });

  it('stops on a 403 and a 404 with the message of the API', () => {
    expect(decidePoll(apiError(404, 'not_found', 'No existe lo que pedís.'))).toEqual({
      kind: 'stop',
      message: 'No existe lo que pedís.',
      signIn: false,
    });
    expect(
      decidePoll(apiError(403, 'account_disabled', 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.')),
    ).toMatchObject({ kind: 'stop', signIn: false });
  });

  it('stops on a 4xx without the error of the API with its HTTP status', () => {
    expect(decidePoll({ ok: false, failure: { kind: 'unexpected', status: 404 } })).toEqual({
      kind: 'stop',
      message: 'El taller rechazó la solicitud (HTTP 404). Volvé a intentar; si se repite, recargá la página.',
      signIn: false,
    });
  });
});
```

**Paso 3.** `npm run test:unit -- src/features/run-exercise/api/run-decisions.spec.ts`: todo falla por `not implemented`.

**Paso 4.** `run-decisions.ts`, las dos funciones (reemplazan los stubs; los tipos y los textos quedan como en el paso 1, y el import suma `ApiFailure`, `parseServerRun` y `retryHint`):

```ts
import type { ApiFailure, ApiResult } from '../../../shared/api/http';
import { retryHint } from './retry-hint';
import { parseServerRun, type ServerRun } from './server-run';

type ResponseFailure = Extract<ApiFailure, { kind: 'response' }>;

const ACTIVE_RETRY_AFTER = 3;
const QUEUE_FULL_RETRY_AFTER = 10;

function stop(message: string, signIn = false) {
  return { kind: 'stop', message, signIn } as const;
}

function isServerFailure(status: number): boolean {
  return status >= 500;
}

function withRetryHint(failure: ResponseFailure, now: Date): string {
  if (failure.retryAfterSeconds === null) return failure.message;
  return `${failure.message} ${retryHint(failure.retryAfterSeconds, now)}`;
}

function validationMessage(failure: ResponseFailure): string {
  const retired = failure.fieldErrors.exerciseId?.[0];
  if (retired !== undefined) return `${retired} ${RELOAD_CONTENT}`;
  const first = Object.values(failure.fieldErrors).flat()[0];
  return first === undefined ? failure.message : `${failure.message} ${first}`;
}

function turnOf(failure: ResponseFailure): SubmitDecision | null {
  if (failure.code === 'queue_full')
    return {
      kind: 'wait-turn',
      retryAfterSeconds: failure.retryAfterSeconds ?? QUEUE_FULL_RETRY_AFTER,
      message: failure.message,
    };
  if (failure.code === 'quota_exceeded' && failure.quota === 'active')
    return {
      kind: 'wait-turn',
      retryAfterSeconds: failure.retryAfterSeconds ?? ACTIVE_RETRY_AFTER,
      message: failure.message,
    };
  return null;
}

function submitResponse(failure: ResponseFailure, now: Date): SubmitDecision {
  if (failure.status === 401) return stop(SESSION_EXPIRED, true);
  const turn = turnOf(failure);
  if (turn !== null) return turn;
  if (failure.status === 429) return stop(withRetryHint(failure, now));
  if (isServerFailure(failure.status)) return { kind: 'retry', message: failure.message };
  if (failure.status === 422) return stop(validationMessage(failure));
  return stop(failure.message);
}

function submitUnexpected(status: number): SubmitDecision {
  if (status >= 200 && status < 300) return stop(UNREADABLE);
  if (isServerFailure(status)) return { kind: 'retry', message: UNAVAILABLE };
  return stop(rejected(status));
}

function readRun(body: unknown): ServerRun | null {
  return parseServerRun(body);
}

export function decideSubmit(result: ApiResult, now: Date): SubmitDecision {
  if (result.ok) {
    const run = readRun(result.body);
    return run === null ? stop(UNREADABLE) : { kind: 'accepted', run };
  }
  const { failure } = result;
  switch (failure.kind) {
    case 'network':
      return { kind: 'retry', message: NETWORK };
    case 'signed-out':
      return stop(SESSION_EXPIRED, true);
    case 'account-changed':
      return stop(failure.message);
    case 'unexpected':
      return submitUnexpected(failure.status);
    case 'response':
      return submitResponse(failure, now);
  }
}

function pollResponse(failure: ResponseFailure): PollDecision {
  if (failure.status === 401) return stop(SESSION_EXPIRED, true);
  if (failure.status === 429 || isServerFailure(failure.status))
    return { kind: 'retry', retryAfterSeconds: failure.retryAfterSeconds };
  return stop(failure.message);
}

function pollUnexpected(status: number): PollDecision {
  if (status >= 200 && status < 300) return stop(UNREADABLE);
  if (status === 429 || isServerFailure(status)) return { kind: 'retry', retryAfterSeconds: null };
  return stop(rejected(status));
}

export function decidePoll(result: ApiResult): PollDecision {
  if (result.ok) {
    const run = readRun(result.body);
    return run === null ? stop(UNREADABLE) : { kind: 'run', run };
  }
  const { failure } = result;
  switch (failure.kind) {
    case 'network':
      return { kind: 'retry', retryAfterSeconds: null };
    case 'signed-out':
      return stop(SESSION_EXPIRED, true);
    case 'account-changed':
      return stop(failure.message);
    case 'unexpected':
      return pollUnexpected(failure.status);
    case 'response':
      return pollResponse(failure);
  }
}
```

Si `tsc` marca la falta de un `return` al final de los `switch` (no debería: la unión es exhaustiva), no sumes un `default`: revisá que `ApiFailure` tenga las cinco variantes de F11a y avisá.

**Paso 5.** `npm run test:unit -- src/features/run-exercise/api` en verde; `npm run lint` sin avisos de complejidad nuevos. Commit: `feat(front): el laboratorio decide qué hacer con cada respuesta de /api/runs (A4 FR-003, FR-005 y FR-010 a FR-013)`.

### Tarea 3.5 · El adaptador, sus dobles y sus specs en rojo (T012, F)

- **Consume:**
  - `ExerciseTransport`, `RunRequest`, `RunVerdict` y `ReportProgress` (`model/transport.ts`, F7a);
  - `ApiClient`, `ApiRequestOptions` y `ApiResult` (`shared/api/http`);
  - lo de T009 a T011.
- **Produce:**
  - `createApiRunsTransport`, `ApiRunsTransportOptions` y `RunClock` (contrato `lab-execution.md`), en stub;
  - los dobles de las specs `createFakeRunsApi(now)` y `createFakeRunClock(random)`;
  - la spec del adaptador, en rojo.
- **Archivos (nuevos):** `features/run-exercise/api/api-runs-transport.ts`, `fake-runs-api.ts` y `api-runs-transport.spec.ts`.

**Paso 1.** `api-runs-transport.ts`, el contrato con el stub:

```ts
import type { ApiClient } from '../../../shared/api/http';
import type { ExerciseTransport } from '../model/transport';
import type { ApiRunProgress } from './run-progress';

export interface RunClock {
  now(): number;
  wait(ms: number, signal: AbortSignal): Promise<void>;
  random(): number;
}

export interface ApiRunsTransportOptions {
  readonly client: Pick<ApiClient, 'get' | 'send'>;
  readonly currentAccount: () => number | null;
  readonly askToSignIn: (accountId: number | null) => void;
  readonly newRunId: () => string;
  readonly clock: RunClock;
}

export const createApiRunsTransport: (
  options: ApiRunsTransportOptions,
) => ExerciseTransport<ApiRunProgress> = () => {
  throw new Error('not implemented');
};
```

**Paso 2.** `fake-runs-api.ts`, los dobles. Cada ruta responde su lista en orden y repite la última; una respuesta puede ser una función que se llama en el momento:

```ts
import type { ApiClient, ApiRequestOptions, ApiResult } from '../../../shared/api/http';
import type { RunClock } from './api-runs-transport';

export type FakeReply = ApiResult | (() => ApiResult | Promise<ApiResult>);

export interface RecordedRunsCall {
  readonly route: string;
  readonly body: unknown;
  readonly asUser: number | undefined;
  readonly signal: AbortSignal | undefined;
  readonly at: number;
}

export interface FakeRunsApi {
  readonly client: Pick<ApiClient, 'get' | 'send'>;
  readonly calls: RecordedRunsCall[];
  reply(route: string, ...replies: FakeReply[]): void;
  callsTo(route: string): RecordedRunsCall[];
  inFlightPeak(): number;
}

export interface FakeRunClock extends RunClock {
  readonly waits: number[];
  time: number;
}

export function createFakeRunsApi(now: () => number): FakeRunsApi {
  const calls: RecordedRunsCall[] = [];
  const queues = new Map<string, FakeReply[]>();
  let inFlight = 0;
  let peak = 0;

  async function answer(route: string, body: unknown, options: ApiRequestOptions = {}): Promise<ApiResult> {
    calls.push({ route, body, asUser: options.asUser, signal: options.signal, at: now() });
    const queue = queues.get(route) ?? [];
    const [reply] = queue;
    if (reply === undefined) throw new Error(`the fake runs API has no reply for ${route}`);
    if (queue.length > 1) queue.shift();
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    try {
      return typeof reply === 'function' ? await reply() : reply;
    } finally {
      inFlight -= 1;
    }
  }

  return {
    client: {
      get: (path, options) => answer(`GET ${path}`, undefined, options),
      send: (method, path, body, options) => answer(`${method} ${path}`, body, options),
    },
    calls,
    reply(route, ...replies) {
      queues.set(route, replies);
    },
    callsTo: (route) => calls.filter((call) => call.route === route),
    inFlightPeak: () => peak,
  };
}

export function createFakeRunClock(random = 0): FakeRunClock {
  const clock: FakeRunClock = {
    time: 0,
    waits: [],
    now: () => clock.time,
    async wait(ms) {
      clock.waits.push(ms);
      clock.time += ms;
    },
    random: () => random,
  };
  return clock;
}
```

**Paso 3.** `api-runs-transport.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ApiFailure, ApiResult } from '../../../shared/api/http';
import type { RunRequest, RunVerdict } from '../model/transport';
import { createApiRunsTransport } from './api-runs-transport';
import { createFakeRunClock, createFakeRunsApi, type FakeRunClock, type FakeRunsApi } from './fake-runs-api';
import type { ApiRunProgress } from './run-progress';
import { RUN_ID, runBodyFactory, waitingRunBody, withData, type ServerRunBody } from './server-run.factory';

type ResponseFailure = Extract<ApiFailure, { kind: 'response' }>;

const RUNS = 'POST /api/runs';
const POLL = `GET /api/runs/${RUN_ID}`;
const CANCEL = `POST /api/runs/${RUN_ID}/cancel`;
const EXERCISE = {
  id: 'rust-01',
  language: 'rust' as const,
  tests: [
    { id: 't1', expression: 'a()' },
    { id: 't2', expression: 'b()' },
    { id: 't3', expression: 'c()' },
  ],
};
const DRAFT = '  fn a() -> bool { true }\n';
const NETWORK_DOWN: ApiResult = { ok: false, failure: { kind: 'network' } };
const NETWORK_TEXT =
  'No se pudo conectar con el taller. Revisá tu conexión. Podés seguir leyendo y resolviendo las preguntas sin conexión.';
const SESSION_TEXT = 'Tu sesión venció: volvé a ingresar para ejecutar. Tu código sigue guardado.';
const WORKSHOP_TEXT =
  'El taller no pudo ejecutar tu código por una falla propia, no de tu programa. Tu código sigue guardado; volvé a intentar en un momento.';
const ACTIVE_TEXT = 'Ya tenés una ejecución en curso: esperá a que termine.';
const FULL_TEXT = 'El taller está ocupado ahora mismo: reintentá en unos segundos.';

function ok(run: ServerRunBody, status = 200): ApiResult {
  return { ok: true, status, body: withData(run) };
}
const queued = (position: number): ApiResult => ok(waitingRunBody('queued', position), 202);
const running = (): ApiResult => ok(waitingRunBody('running'));
const finished = (overrides: Partial<ServerRunBody> = {}): ApiResult => ok(runBodyFactory.build(overrides));

function apiError(status: number, code: string, message: string, extra: Partial<ResponseFailure> = {}): ApiResult {
  return {
    ok: false,
    failure: { kind: 'response', status, code, message, fieldErrors: {}, retryAfterSeconds: null, ...extra },
  };
}

interface Harness {
  readonly api: FakeRunsApi;
  readonly clock: FakeRunClock;
  readonly reports: { at: number; progress: ApiRunProgress }[];
  readonly signIns: (number | null)[];
  readonly controller: AbortController;
  readonly countsLocalAttempts: boolean;
  run(request?: Partial<RunRequest>): Promise<RunVerdict>;
}

function setUp({ account = 41 as number | null, random = 0 } = {}): Harness {
  const clock = createFakeRunClock(random);
  const api = createFakeRunsApi(clock.now);
  const reports: Harness['reports'] = [];
  const signIns: (number | null)[] = [];
  const controller = new AbortController();
  let ids = 0;
  const transport = createApiRunsTransport({
    client: api.client,
    currentAccount: () => account,
    askToSignIn: (accountId) => {
      signIns.push(accountId);
    },
    newRunId: () => {
      ids += 1;
      return `client-run-${ids}`;
    },
    clock,
  });
  return {
    api,
    clock,
    reports,
    signIns,
    controller,
    countsLocalAttempts: transport.countsLocalAttempts,
    run: (request = {}) =>
      transport.run(
        { exercise: EXERCISE, draft: DRAFT, customTest: '', signal: controller.signal, ...request },
        (progress) => {
          reports.push({ at: clock.time, progress });
        },
      ),
  };
}

describe('the adapter of /api/runs (A4)', () => {
  it('counts no local attempt: the server counts them (FR-021)', () => {
    expect(setUp().countsLocalAttempts).toBe(false);
  });

  it('sends only clientRunId, exerciseId, the draft as it is and the custom test, as the account and without the signal (FR-001)', async () => {
    const t = setUp();
    t.api.reply(RUNS, finished());

    await t.run({ customTest: 'a() == true' });

    expect(t.api.calls).toEqual([
      {
        route: RUNS,
        body: { clientRunId: 'client-run-1', exerciseId: 'rust-01', code: DRAFT, customTest: 'a() == true' },
        asUser: 41,
        signal: undefined,
        at: 0,
      },
    ]);
  });

  it('leaves out an empty custom test, and the account when there is none', async () => {
    const t = setUp({ account: null });
    t.api.reply(RUNS, finished());

    await t.run();

    expect(t.api.calls[0]).toMatchObject({
      body: { clientRunId: 'client-run-1', exerciseId: 'rust-01', code: DRAFT },
      asUser: undefined,
    });
    expect(t.api.calls[0].body).not.toHaveProperty('customTest');
  });

  it('follows the queue and the run, reports each state once and returns the verdict with the attempt', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(3));
    t.api.reply(POLL, queued(3), queued(1), running(), finished());

    const verdict = await t.run();

    expect(t.reports.map((report) => report.progress)).toEqual([
      { phase: { kind: 'queued', position: 3 }, delayed: false },
      { phase: { kind: 'queued', position: 1 }, delayed: false },
      { phase: { kind: 'running' }, delayed: false },
    ]);
    expect(verdict).toMatchObject({ kind: 'executed', success: true, attemptId: 1873 });
  });

  it('waits from 0.3 s to 2 s between polls, with one request at a time (SC-007)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(1));
    t.api.reply(POLL, ...Array.from({ length: 9 }, () => queued(1)), finished());

    await t.run();

    expect(t.clock.waits).toEqual([300, 450, 675, 1013, 1519, 2000, 2000, 2000, 2000, 2000]);
    expect(t.api.inFlightPeak()).toBe(1);
  });

  it('adds the delay notice at 15 s, once, to the state that shows, without breaking the schedule (Q3)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(2));
    t.api.reply(POLL, () => (t.api.callsTo(POLL).length > 12 ? finished() : queued(2)));

    await t.run();

    expect(t.reports.filter((report) => report.progress.delayed)).toEqual([
      { at: 15_000, progress: { phase: { kind: 'queued', position: 2 }, delayed: true } },
    ]);
    const times = t.api.callsTo(POLL).map((call) => call.at);
    const gaps = times.slice(1).map((at, index) => at - times[index]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(300);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(2000);
  });

  it('sends a lost submission again with the same clientRunId and gets the same run (FR-003, SC-008)', async () => {
    const t = setUp();
    t.api.reply(RUNS, NETWORK_DOWN, finished());

    await t.run();

    const bodies = t.api.callsTo(RUNS).map((call) => call.body);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(t.clock.waits).toEqual([500]);
  });

  it('ends in the connection failure after three lost submissions', async () => {
    const t = setUp();
    t.api.reply(RUNS, NETWORK_DOWN);

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: NETWORK_TEXT });
    expect(t.api.callsTo(RUNS)).toHaveLength(3);
    expect(t.clock.waits).toEqual([500, 1000]);
  });

  it('ends in «not available» after three 5xx without the error of the API', async () => {
    const t = setUp();
    t.api.reply(RUNS, { ok: false, failure: { kind: 'unexpected', status: 502 } });

    expect(await t.run()).toEqual({
      kind: 'transport-failure',
      message: 'El taller no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.',
    });
    expect(t.api.callsTo(RUNS)).toHaveLength(3);
  });

  it('waits its turn on the active quota, at least the Retry-After and growing, says when, and sends the same request (Q3, US4-5)', async () => {
    const t = setUp();
    const active = apiError(429, 'quota_exceeded', ACTIVE_TEXT, { quota: 'active', retryAfterSeconds: 3 });
    t.api.reply(RUNS, active, active, finished());

    await t.run();

    expect(t.clock.waits).toEqual([3000, 4500]);
    expect(t.reports.map((report) => report.progress.phase)).toEqual([
      { kind: 'waiting-turn', retryInSeconds: 3 },
      { kind: 'waiting-turn', retryInSeconds: 5 },
    ]);
    const bodies = t.api.callsTo(RUNS).map((call) => JSON.stringify(call.body));
    expect(new Set(bodies).size).toBe(1);
  });

  it('gives up a full queue after two minutes with the message of the server (FR-010)', async () => {
    const t = setUp();
    t.api.reply(RUNS, apiError(503, 'queue_full', FULL_TEXT, { retryAfterSeconds: 10 }));

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: FULL_TEXT });
    expect(t.api.callsTo(RUNS).map((call) => call.at)).toEqual([0, 10_000, 25_000, 47_500, 81_250]);
  });

  it('waiting its turn for two minutes stays under 30 submissions in any minute and gives up at two minutes (FR-010)', async () => {
    const t = setUp({ random: 0.999 });
    t.api.reply(RUNS, apiError(429, 'quota_exceeded', ACTIVE_TEXT, { quota: 'active', retryAfterSeconds: 3 }));

    const verdict = await t.run();

    const times = t.api.callsTo(RUNS).map((call) => call.at);
    const busiestMinute = Math.max(
      ...times.map((start) => times.filter((at) => at >= start && at < start + 60_000).length),
    );
    expect(busiestMinute).toBeLessThan(30);
    expect(Math.max(...times)).toBeLessThan(120_000);
    expect(verdict).toEqual({ kind: 'transport-failure', message: ACTIVE_TEXT });
  });

  it('shows a quota with a window and when to run again, without sending it again (FR-011)', async () => {
    const t = setUp();
    const message = 'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.';
    t.api.reply(RUNS, apiError(429, 'quota_exceeded', message, { quota: 'per_minute', retryAfterSeconds: 40 }));

    expect(await t.run()).toEqual({
      kind: 'transport-failure',
      message: `${message} Podés volver a ejecutar en 40 s.`,
    });
    expect(t.api.callsTo(RUNS)).toHaveLength(1);
  });

  it('asks to sign in again with the account when the submission gets 401 (FR-012)', async () => {
    const t = setUp();
    t.api.reply(RUNS, apiError(401, 'unauthenticated', 'Iniciá sesión para continuar.'));

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: SESSION_TEXT });
    expect(t.signIns).toEqual([41]);
  });

  it('stops polling and asks to sign in when a poll gets 401 (FR-013)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(1));
    t.api.reply(POLL, apiError(401, 'unauthenticated', 'Iniciá sesión para continuar.'));

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: SESSION_TEXT });
    expect(t.api.callsTo(POLL)).toHaveLength(1);
    expect(t.signIns).toEqual([41]);
  });

  it('shows a 404 of a poll as not run, with the message of the API (FR-013)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(1));
    t.api.reply(POLL, apiError(404, 'not_found', 'No existe lo que pedís.'));

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: 'No existe lo que pedís.' });
  });

  it('keeps polling through 30 s of failures, then shows the connection failure without cancelling (FR-005)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(1));
    t.api.reply(POLL, NETWORK_DOWN);

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: NETWORK_TEXT });
    const times = t.api.callsTo(POLL).map((call) => call.at);
    expect(times[times.length - 1] - times[0]).toBeGreaterThanOrEqual(30_000);
    expect(t.api.callsTo(CANCEL)).toHaveLength(0);
  });

  it('waits the Retry-After of a 429 before the next poll (FR-005)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(1));
    t.api.reply(POLL, apiError(429, 'too_many_requests', 'Demasiados intentos.', { retryAfterSeconds: 5 }), finished());

    await t.run();

    expect(t.clock.waits).toEqual([300, 5000]);
  });

  it('an abort while the submission is in flight cancels the accepted run and throws AbortError (Review Focus 1)', async () => {
    const t = setUp();
    let accept: (result: ApiResult) => void = () => undefined;
    t.api.reply(
      RUNS,
      () =>
        new Promise<ApiResult>((resolve) => {
          accept = resolve;
        }),
    );
    t.api.reply(CANCEL, ok(waitingRunBody('queued', 1)));

    const pending = t.run();
    t.controller.abort();
    accept(queued(1));

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(t.api.callsTo(CANCEL)).toHaveLength(1);
    expect(t.api.callsTo(CANCEL)[0].signal).toBeUndefined();
    expect(t.api.callsTo(POLL)).toHaveLength(0);
  });

  it('an abort while the run waits in the queue cancels it and throws AbortError (FR-007, FR-008)', async () => {
    const t = setUp();
    t.api.reply(RUNS, queued(2));
    t.api.reply(POLL, () => {
      t.controller.abort();
      return queued(2);
    });
    t.api.reply(CANCEL, ok(waitingRunBody('queued', 2)));

    await expect(t.run()).rejects.toMatchObject({ name: 'AbortError' });
    expect(t.api.callsTo(POLL)).toHaveLength(1);
    expect(t.api.callsTo(CANCEL)).toHaveLength(1);
  });

  it('sends nothing with a signal aborted before it starts', async () => {
    const t = setUp();
    t.controller.abort();

    await expect(t.run()).rejects.toMatchObject({ name: 'AbortError' });
    expect(t.api.calls).toEqual([]);
  });

  it('cancels and shows the failure of the workshop after 12 minutes without an end (FR-006)', async () => {
    const t = setUp();
    t.api.reply(RUNS, ok(waitingRunBody('running'), 202));
    t.api.reply(POLL, running());
    t.api.reply(CANCEL, running());

    expect(await t.run()).toEqual({ kind: 'transport-failure', message: WORKSHOP_TEXT });
    expect(t.api.callsTo(CANCEL)).toHaveLength(1);
    expect(t.clock.time).toBeGreaterThanOrEqual(12 * 60_000);
  });
});
```

**Paso 4.** `npm run test:unit -- src/features/run-exercise/api/api-runs-transport.spec.ts`: los 20 fallan por `not implemented` (el primero, al crear el adaptador).

**Paso 5.** Commit: `test(front): el adaptador de /api/runs, con su cliente y su reloj dobles (rojas, A4)`.

### Tarea 3.6 · El adaptador (T013, F)

- **Consume:** la spec de T012.
- **Produce:** `createApiRunsTransport` según el contrato `lab-execution.md`.
- **Archivos:** `features/run-exercise/api/api-runs-transport.ts`.

**Paso 1.** La implementación (reemplaza el stub; las interfaces del paso 1 de T012 quedan igual):

```ts
import { WORKSHOP_FAILURE } from '../../../entities/exercise';
import type { ApiClient, ApiRequestOptions } from '../../../shared/api/http';
import type { ExerciseTransport, ReportProgress, RunRequest, RunVerdict } from '../model/transport';
import { decidePoll, decideSubmit, NETWORK, type PollDecision, type SubmitDecision } from './run-decisions';
import type { ApiRunPhase, ApiRunProgress } from './run-progress';
import {
  DELAY_NOTICE_MS,
  POLL_FAILURE_LIMIT_MS,
  SAFETY_NET_MS,
  SUBMIT_RETRY_DELAYS_MS,
  TURN_LIMIT_MS,
  pollDelayMs,
  turnDelayMs,
} from './run-schedule';
import { verdictOfRun } from './run-verdict';
import { FINAL_STATUSES, type ServerRun } from './server-run';

// … RunClock y ApiRunsTransportOptions como en T012 …

const RUNS_PATH = '/api/runs';

interface SubmitBody {
  readonly clientRunId: string;
  readonly exerciseId: string;
  readonly code: string;
  readonly customTest?: string;
}

type Submitted = { readonly run: ServerRun } | { readonly verdict: RunVerdict };

interface SubmitState {
  retries: number;
  turns: number;
  firstTurnAt: number | null;
}

interface PollState {
  polls: number;
  failingSince: number | null;
  nextDelay: number;
}

function abortError(): DOMException {
  return new DOMException('La ejecución se canceló.', 'AbortError');
}

function phaseOf(run: ServerRun): ApiRunPhase {
  return run.status === 'queued'
    ? { kind: 'queued', position: run.queuePosition ?? 1 }
    : { kind: 'running' };
}

function samePhase(left: ApiRunPhase, right: ApiRunPhase): boolean {
  if (left.kind === 'queued' && right.kind === 'queued') return left.position === right.position;
  if (left.kind === 'waiting-turn' && right.kind === 'waiting-turn')
    return left.retryInSeconds === right.retryInSeconds;
  return left.kind === right.kind;
}

class ServerRunSession {
  private phase: ApiRunPhase = { kind: 'running' };
  private delayed = false;
  private reported = false;
  private readonly startedAt: number;

  constructor(
    private readonly options: ApiRunsTransportOptions,
    private readonly request: RunRequest,
    private readonly report: ReportProgress<ApiRunProgress>,
  ) {
    this.startedAt = options.clock.now();
  }

  async execute(): Promise<RunVerdict> {
    this.throwIfAborted();
    const submitted = await this.submit(this.body());
    if ('verdict' in submitted) return submitted.verdict;
    try {
      return await this.follow(submitted.run);
    } catch (error) {
      if (this.request.signal.aborted) this.cancelQuietly(submitted.run.id);
      throw error;
    }
  }

  private body(): SubmitBody {
    const { exercise, draft, customTest } = this.request;
    const body = { clientRunId: this.options.newRunId(), exerciseId: exercise.id, code: draft };
    return customTest === '' ? body : { ...body, customTest };
  }

  private async submit(body: SubmitBody): Promise<Submitted> {
    const state: SubmitState = { retries: 0, turns: 0, firstTurnAt: null };
    for (;;) {
      const decision = await this.send(body);
      if (decision.kind === 'accepted') return { run: decision.run };
      if (decision.kind === 'stop') return { verdict: this.stop(decision.message, decision.signIn) };
      const delay =
        decision.kind === 'retry'
          ? this.retryDelay(state)
          : this.turnDelay(state, decision.retryAfterSeconds);
      if (delay === null) return { verdict: this.failure(decision.message) };
      await this.pause(delay);
    }
  }

  private async send(body: SubmitBody): Promise<SubmitDecision> {
    const result = await this.options.client.send('POST', RUNS_PATH, body, this.asUser());
    const decision = decideSubmit(result, new Date(this.options.clock.now()));
    if (!this.request.signal.aborted) return decision;
    if (decision.kind === 'accepted') this.cancelQuietly(decision.run.id);
    throw abortError();
  }

  private retryDelay(state: SubmitState): number | null {
    const delay = SUBMIT_RETRY_DELAYS_MS[state.retries];
    if (delay === undefined) return null;
    state.retries += 1;
    return delay;
  }

  private turnDelay(state: SubmitState, retryAfterSeconds: number): number | null {
    const now = this.options.clock.now();
    state.firstTurnAt ??= now;
    const delay = turnDelayMs(retryAfterSeconds, state.turns, () => this.options.clock.random());
    if (now + delay - state.firstTurnAt > TURN_LIMIT_MS) return null;
    state.turns += 1;
    this.show({ kind: 'waiting-turn', retryInSeconds: Math.ceil(delay / 1000) });
    return delay;
  }

  private async follow(accepted: ServerRun): Promise<RunVerdict> {
    let run = accepted;
    const state: PollState = { polls: 0, failingSince: null, nextDelay: pollDelayMs(0) };
    for (;;) {
      if (FINAL_STATUSES.has(run.status)) return verdictOfRun(run, this.request.exercise);
      this.show(phaseOf(run));
      if (this.options.clock.now() - this.startedAt >= SAFETY_NET_MS) {
        this.cancelQuietly(run.id);
        return this.failure(WORKSHOP_FAILURE);
      }
      await this.pause(state.nextDelay);
      const decision = await this.poll(run.id, state);
      if (decision.kind === 'stop') return this.stop(decision.message, decision.signIn);
      if (decision.kind === 'run') {
        run = decision.run;
        state.failingSince = null;
        state.nextDelay = pollDelayMs(state.polls);
      } else {
        if (this.failingTooLong(state)) return this.failure(NETWORK);
        state.nextDelay =
          decision.retryAfterSeconds === null
            ? pollDelayMs(state.polls)
            : decision.retryAfterSeconds * 1000;
      }
    }
  }

  private async poll(runId: string, state: PollState): Promise<PollDecision> {
    const result = await this.options.client.get(`${RUNS_PATH}/${runId}`, {
      signal: this.request.signal,
    });
    this.throwIfAborted();
    state.polls += 1;
    return decidePoll(result);
  }

  private failingTooLong(state: PollState): boolean {
    const now = this.options.clock.now();
    state.failingSince ??= now;
    return now - state.failingSince >= POLL_FAILURE_LIMIT_MS;
  }

  private async pause(ms: number): Promise<void> {
    const { clock } = this.options;
    const untilNotice = Math.max(0, this.startedAt + DELAY_NOTICE_MS - clock.now());
    if (!this.delayed && untilNotice < ms) {
      await clock.wait(untilNotice, this.request.signal);
      this.throwIfAborted();
      this.delayed = true;
      this.publish();
      await clock.wait(ms - untilNotice, this.request.signal);
    } else {
      await clock.wait(ms, this.request.signal);
    }
    this.throwIfAborted();
  }

  private show(next: ApiRunPhase): void {
    if (this.reported && samePhase(this.phase, next)) return;
    this.phase = next;
    this.publish();
  }

  private publish(): void {
    this.reported = true;
    this.report({ phase: this.phase, delayed: this.delayed });
  }

  private stop(message: string, signIn: boolean): RunVerdict {
    if (signIn) this.options.askToSignIn(this.options.currentAccount());
    return this.failure(message);
  }

  private failure(message: string): RunVerdict {
    return { kind: 'transport-failure', message };
  }

  private cancelQuietly(runId: string): void {
    void this.options.client
      .send('POST', `${RUNS_PATH}/${runId}/cancel`, undefined, this.asUser())
      .catch(() => undefined);
  }

  private asUser(): ApiRequestOptions {
    const account = this.options.currentAccount();
    return account === null ? {} : { asUser: account };
  }

  private throwIfAborted(): void {
    if (this.request.signal.aborted) throw abortError();
  }
}

export function createApiRunsTransport(
  options: ApiRunsTransportOptions,
): ExerciseTransport<ApiRunProgress> {
  return {
    countsLocalAttempts: false,
    run: (request, report) => new ServerRunSession(options, request, report).execute(),
  };
}
```

El bloque de `RunClock` y `ApiRunsTransportOptions` de T012 se conserva tal cual arriba de `RUNS_PATH`; el comentario «… como en T012 …» no va en el archivo. `ApiClient` se usa en `ApiRunsTransportOptions`.

**Paso 2.** `npm run test:unit -- src/features/run-exercise` en verde: los 20 de T012 y lo de F7a (la feature no cambió).

**Paso 3.** `npm run lint`: ninguna función del archivo pasa de 10 de complejidad. Si `follow` llega a 11, extraé el bloque del `else` a un método `afterFailure(state, decision): RunVerdict | null` sin cambiar la conducta.

**Paso 4.** Commit: `feat(front): el adaptador de /api/runs espera, reintenta y cancela (A4 FR-001 a FR-013)`.

### Tarea 3.7 · La vista previa, el tope de 64 KiB y el índice de la feature (T014, F)

- **Consume:**
  - `renderHarness` y `HarnessTemplates` (T006);
  - `ProgramBuilder` y `RunnableExercise` (`model/transport.ts`);
  - las plantillas reales `content/harness/*.tpl`.
- **Produce:**
  - `ProgramBuilder` con retorno `string | null`;
  - `createServerProgramBuilder` y `PREVIEW_NONCE`;
  - `SERVER_CODE_LIMIT_BYTES`, `CODE_TOO_LONG_NOTICE` y `exceedsCodeLimit`;
  - el índice con todo lo nuevo del contrato.
- **Archivos:**
  - `features/run-exercise/model/transport.ts`;
  - `features/run-exercise/api/server-program.ts` y `.spec.ts` (nuevos);
  - `model/code-limit.ts` y `.spec.ts` (nuevos);
  - `index.ts`.

**Paso 1.** En `model/transport.ts`, `ProgramBuilder` queda así:

```ts
export type ProgramBuilder = (
  exercise: RunnableExercise,
  draft: string,
  customTest: string,
) => string | null;
```

`buildPlaygroundProgram` sigue cumpliendo el tipo (devuelve `string`) hasta T024.

**Paso 2.** Los stubs:

```ts
// api/server-program.ts
import type { HarnessTemplates } from '../../../entities/exercise';
import type { ProgramBuilder } from '../model/transport';

export const PREVIEW_NONCE = '0'.repeat(32);

export const createServerProgramBuilder: (
  templates: () => HarnessTemplates | null,
) => ProgramBuilder = () => {
  throw new Error('not implemented');
};

// model/code-limit.ts
export const SERVER_CODE_LIMIT_BYTES = 65_536;
export const CODE_TOO_LONG_NOTICE =
  'El taller admite programas de hasta 64 KB. Reducí el código antes de volver a ejecutar.';

export const exceedsCodeLimit: (code: string) => boolean = () => {
  throw new Error('not implemented');
};
```

**Paso 3.** Las specs:

```ts
// api/server-program.spec.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createServerProgramBuilder } from './server-program';

const ROOT = new URL('../../../../../', import.meta.url);
const TEMPLATES = {
  rust: readFileSync(new URL('content/harness/rust.tpl', ROOT), 'utf8'),
  go: readFileSync(new URL('content/harness/go.tpl', ROOT), 'utf8'),
};
const ZEROS = '00000000000000000000000000000000';

describe('the preview with the template of the server (FR-026 and FR-029)', () => {
  it('builds the program of the server with a nonce of 32 zeros', () => {
    const build = createServerProgramBuilder(() => TEMPLATES);
    const exercise = {
      id: 'rust-01',
      language: 'rust' as const,
      tests: [{ id: 't1', expression: 'doble(2) == 4' }],
    };

    expect(build(exercise, 'fn doble(n: i32) -> i32 {\n    n * 2\n}', '')).toBe(
      [
        'fn doble(n: i32) -> i32 {',
        '    n * 2',
        '}',
        '',
        'fn main() {',
        '    std::panic::set_hook(Box::new(|_| {}));',
        '    let passed = std::panic::catch_unwind(|| { doble(2) == 4 }).unwrap_or(false);',
        `    println!("__TALLER_TEST__${ZEROS}:t1:{}", if passed { "PASS" } else { "FAIL" });`,
        `    println!("__TALLER_END__${ZEROS}:1");`,
        '}',
        '',
      ].join('\n'),
    );
  });

  it('adds the custom test and the imports of a Go exercise', () => {
    const build = createServerProgramBuilder(() => TEMPLATES);
    const exercise = {
      id: 'go-01',
      language: 'go' as const,
      tests: [{ id: 't1', expression: 'Doble(2) == 4' }],
      imports: ['strings', 'fmt'],
    };

    const program = build(exercise, 'func Doble(n int) int { return n * 2 }', 'Doble(0) == 0') ?? '';

    expect(program).toContain('import (\n    "fmt"\n    "strings"\n)');
    expect(program).toContain('    __tallerCheck("custom", func() bool { return Doble(0) == 0 })');
    expect(program).toContain(`    fmt.Println("__TALLER_END__${ZEROS}:2")`);
  });

  it('says the program is not available while the template is missing', () => {
    const build = createServerProgramBuilder(() => null);

    expect(build({ id: 'rust-01', language: 'rust', tests: [] }, 'fn x() {}', '')).toBeNull();
  });
});

// model/code-limit.spec.ts
import { describe, expect, it } from 'vitest';
import { exceedsCodeLimit } from './code-limit';

describe('the size the server admits (FR-002)', () => {
  it('counts bytes of UTF-8, not characters', () => {
    expect(exceedsCodeLimit('a'.repeat(65_536))).toBe(false);
    expect(exceedsCodeLimit('a'.repeat(65_537))).toBe(true);
    expect(exceedsCodeLimit('€'.repeat(21_845))).toBe(false);
    expect(exceedsCodeLimit('€'.repeat(21_846))).toBe(true);
  });
});
```

`'€'` ocupa 3 bytes: 21 845 dan 65 535 y 21 846 dan 65 538, por debajo del tope del editor (30 000 caracteres).

**Paso 4.** `npm run test:unit -- src/features/run-exercise`: las dos specs nuevas fallan por `not implemented`.

**Paso 5.** Las implementaciones (reemplazan los stubs):

```ts
// api/server-program.ts
import { renderHarness, type HarnessTemplates } from '../../../entities/exercise';
import type { ProgramBuilder } from '../model/transport';

export const PREVIEW_NONCE = '0'.repeat(32);

export function createServerProgramBuilder(
  templates: () => HarnessTemplates | null,
): ProgramBuilder {
  return (exercise, draft, customTest) => {
    const available = templates();
    if (available === null) return null;
    return renderHarness(available[exercise.language], {
      language: exercise.language,
      code: draft,
      nonce: PREVIEW_NONCE,
      tests: exercise.tests,
      customTest,
      imports: exercise.imports,
    });
  };
}

// model/code-limit.ts (las constantes quedan como en el paso 2)
export function exceedsCodeLimit(code: string): boolean {
  return new TextEncoder().encode(code).byteLength > SERVER_CODE_LIMIT_BYTES;
}
```

**Paso 6.** `index.ts` de la feature suma, después de la línea de `buildRunResult`:

```ts
export { createApiRunsTransport } from './api/api-runs-transport';
export type { ApiRunsTransportOptions, RunClock } from './api/api-runs-transport';
export type { ApiRunPhase, ApiRunProgress } from './api/run-progress';
export { PREVIEW_NONCE, createServerProgramBuilder } from './api/server-program';
export { CODE_TOO_LONG_NOTICE, SERVER_CODE_LIMIT_BYTES, exceedsCodeLimit } from './model/code-limit';
export { DELAY_NOTICE, describeRunProgress } from './ui/describe-run-progress';
export type { RunProgressCopy } from './ui/describe-run-progress';
```

**Paso 7.** `npm run test:unit -- src/features/run-exercise` en verde: también `index.spec.ts`, la feature sigue sin motores. `npm run typecheck`: `lab.js` es JavaScript y sigue usando `buildPlaygroundProgram`. Commit: `feat(front): la vista previa usa la plantilla del servidor y el tope de 64 KiB (A4 FR-002 y FR-026)`.

### Tarea 3.8 · La plantilla en la copia de A3 (T015, F)

- **Consume (de A3; research R0):**
  - `ContentCopy`, `ContentCopyStore`, `usableCopy`, `copyOf` y `COPY_FORMAT` (`shared/api/content/content-copy.ts`);
  - `createIndexedDbCopyStore` con su `run` (`indexeddb-copy-store.ts`);
  - `createFakeIndexedDb` (`fake-indexed-db.ts`);
  - `PORTION_NAMES` y `PortionName` (`portions.ts`);
  - `afterPublish` (`app/boot/content-stage.ts`).
- **Produce:**
  - `HarnessData`, `CopiedHarness`, `harnessOf` y `withHarness` (`harness-copy.ts`);
  - `ContentCopyUpdates` y `update` en el almacén;
  - el arrastre de la plantilla en `afterPublish` (research R10, la opción (a)).
- **Archivos:**
  - `shared/api/content/harness-copy.ts` y `harness-copy.spec.ts` (nuevos);
  - `indexeddb-copy-store.ts`;
  - `indexeddb-copy-update.spec.ts` (nuevo);
  - `fake-indexed-db.ts`;
  - `index.ts` de `shared/api/content`;
  - `app/boot/content-stage.ts`.

**Paso 1.** Los stubs:

```ts
// harness-copy.ts
import type { ContentCopy } from './content-copy';

export interface HarnessData {
  readonly rust: string;
  readonly go: string;
}

export interface CopiedHarness {
  readonly etag: string;
  readonly data: HarnessData;
}

export const harnessOf: (record: unknown) => CopiedHarness | null = () => {
  throw new Error('not implemented');
};

export const withHarness: (copy: ContentCopy, harness: CopiedHarness | null) => ContentCopy = () => {
  throw new Error('not implemented');
};
```

En `indexeddb-copy-store.ts`, junto a `IndexedDbCopyStoreOptions`:

```ts
export interface ContentCopyUpdates {
  update(change: (record: unknown) => ContentCopy | null): Promise<boolean>;
}
```

La firma de la fábrica pasa a `): ContentCopyStore & ContentCopyUpdates {`, y el objeto que devuelve suma `update: () => Promise.resolve(false),` como stub.

**Paso 2.** `harness-copy.spec.ts`. La copia usable se arma como en `content-copy.spec.ts` de A3, con el contenido real:

```ts
import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { COPY_FORMAT, usableCopy } from './content-copy';
import { harnessOf, withHarness, type CopiedHarness } from './harness-copy';
import { PORTION_NAMES, type PortionName } from './portions';

const HARNESS: CopiedHarness = {
  etag: '"0f1e2d3c4b5a69788796a5b4c3d2e1f0"',
  data: { rust: '{{code}}\n', go: 'package main\n\n{{code}}\n' },
};

function realPortion(name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = (curriculum as Record<string, unknown>)[group];
  return slice === undefined ? value : (value as Record<string, unknown>)[slice];
}

function usableRecord(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: COPY_FORMAT,
    version: 'a'.repeat(32),
    confirmedAt: '2026-10-07T18:00:00.000Z',
    portions: {
      ...Object.fromEntries(PORTION_NAMES.map((name) => [name, { etag: `"${name}"`, data: realPortion(name) }])),
      ...extra,
    },
  };
}

describe('the template as an optional portion of the copy (A4 FR-029, A4-13)', () => {
  it('reads the template of a usable copy', () => {
    expect(harnessOf(usableRecord({ harness: HARNESS }))).toEqual(HARNESS);
  });

  it.for([
    ['no copy', null],
    ['a copy of another format', { ...usableRecord({ harness: HARNESS }), format: COPY_FORMAT + 1 }],
    ['a copy without the template', usableRecord()],
    ['a template without its ETag', usableRecord({ harness: { data: HARNESS.data } })],
    ['a template with one language', usableRecord({ harness: { etag: '"x"', data: { rust: 'a' } } })],
  ] as const)('gives null for %s', ([, record]) => {
    expect(harnessOf(record)).toBeNull();
  });

  it('adds the template without touching the 17 portions, and A3 keeps reading the copy', () => {
    const copy = usableCopy(usableRecord());
    if (copy === null) throw new Error('the record of the spec is not a usable copy');

    const withTemplate = withHarness(copy, HARNESS);

    expect(harnessOf(withTemplate)).toEqual(HARNESS);
    expect(usableCopy(withTemplate)).toEqual(copy);
  });

  it('leaves the copy as it was without a template', () => {
    const copy = usableCopy(usableRecord());
    if (copy === null) throw new Error('the record of the spec is not a usable copy');

    expect(withHarness(copy, null)).toBe(copy);
  });
});
```

`indexeddb-copy-update.spec.ts`, con el doble de A3 y los temporizadores falsos como su spec:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentCopy } from './content-copy';
import { createFakeIndexedDb } from './fake-indexed-db';
import { createIndexedDbCopyStore } from './indexeddb-copy-store';

const LIMIT_MS = 3_000;
const COPY = {
  format: 1,
  version: 'a'.repeat(32),
  confirmedAt: '2026-10-07T18:00:00.000Z',
  portions: {},
} as unknown as ContentCopy;
const NEXT = { ...COPY, version: 'b'.repeat(32) } as ContentCopy;

function storeOver() {
  const fake = createFakeIndexedDb();
  const store = createIndexedDbCopyStore({ factory: () => fake.factory, limitMs: LIMIT_MS });
  return { fake, store };
}

describe('update of the copy store, read and write in one transaction (A4 FR-029)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hands the stored record to the change and writes what it returns', async () => {
    const { fake, store } = storeOver();
    await store.write(COPY);
    const seen: unknown[] = [];

    const wrote = await store.update((record) => {
      seen.push(record);
      return NEXT;
    });

    expect(wrote).toBe(true);
    expect(seen).toEqual([COPY]);
    expect(await store.read()).toEqual(NEXT);
    expect(fake.counts.closed).toBe(fake.counts.opened);
  });

  it('hands null when there is no record, and writes nothing when the change returns null', async () => {
    const { store } = storeOver();
    const seen: unknown[] = [];

    const wrote = await store.update((record) => {
      seen.push(record);
      return null;
    });

    expect(wrote).toBe(false);
    expect(seen).toEqual([null]);
    expect(await store.read()).toBeNull();
  });

  it('answers false and keeps the record when the transaction aborts', async () => {
    const { fake, store } = storeOver();
    await store.write(COPY);
    fake.failWrites = true;

    expect(await store.update(() => NEXT)).toBe(false);

    fake.failWrites = false;
    expect(await store.read()).toEqual(COPY);
  });
});
```

**Paso 3.** `npm run test:unit -- src/shared/api/content`:

- **Fallan:**
  - las de `harness-copy` (`not implemented`);
  - la primera de `update`, porque el stub devuelve `false`.
- **Pasan:** la segunda y la tercera de `update` (`false` es lo esperado). Igual fijan la conducta después del cambio.
- **No cambian:** las specs de A3.

**Paso 4.** El doble de A3 aprende pedidos con `onsuccess` y transacciones de más de un pedido. En `fake-indexed-db.ts`, la función `transaction` queda así (el resto del archivo no cambia):

```ts
  function transaction(mode: IDBTransactionMode) {
    const handlers: FakeTransaction = { oncomplete: null, onabort: null };
    let pending = 0;
    let aborted = false;
    const completeWhenIdle = () =>
      queueMicrotask(() => {
        if (pending === 0 && !aborted) handlers.oncomplete?.();
      });
    const request = (run: () => unknown) => {
      const issued: { result: unknown; onsuccess: (() => void) | null } = {
        result: undefined,
        onsuccess: null,
      };
      pending += 1;
      queueMicrotask(() => {
        if (aborted) return;
        if (mode === 'readwrite' && state.failWrites) {
          aborted = true;
          handlers.onabort?.();
          return;
        }
        issued.result = run();
        issued.onsuccess?.();
        pending -= 1;
        completeWhenIdle();
      });
      return issued;
    };
    const objectStore = () => ({
      get: (key: string) => request(() => records.get(key)),
      put: (value: unknown, key: string) =>
        request(() => {
          records.set(key, structuredClone(value));
          return key;
        }),
      delete: (key: string) =>
        request(() => {
          records.delete(key);
          return undefined;
        }),
    });
    return Object.assign(handlers, { objectStore });
  }
```

Corré `npm run test:unit -- src/shared/api/content`: las specs de A3 siguen en verde con el doble nuevo. Si alguna falla, pará y avisá: el doble cambió el orden de un evento que A3 fija.

**Paso 5.** Las implementaciones:

```ts
// harness-copy.ts (los tipos quedan como en el paso 1)
import { isPlainObject } from '../../lib/is-plain-object';
import { usableCopy, type ContentCopy } from './content-copy';

function isHarnessData(value: unknown): value is HarnessData {
  return isPlainObject(value) && typeof value.rust === 'string' && typeof value.go === 'string';
}

export function harnessOf(record: unknown): CopiedHarness | null {
  if (usableCopy(record) === null || !isPlainObject(record) || !isPlainObject(record.portions))
    return null;
  const harness = record.portions.harness;
  if (!isPlainObject(harness) || typeof harness.etag !== 'string' || !isHarnessData(harness.data))
    return null;
  return { etag: harness.etag, data: { rust: harness.data.rust, go: harness.data.go } };
}

export function withHarness(copy: ContentCopy, harness: CopiedHarness | null): ContentCopy {
  if (harness === null) return copy;
  const portions = { ...copy.portions, harness };
  return { ...copy, portions };
}
```

En `indexeddb-copy-store.ts`, `update` reemplaza el stub dentro del objeto que devuelve la fábrica. Usa el `run` de A3: una transacción `readwrite`, el `get` y, en su `onsuccess`, el `put`:

```ts
    update: (change) => {
      let wrote = false;
      return run(
        'readwrite',
        (store) => {
          const reading = store.get(COPY_KEY);
          reading.onsuccess = () => {
            const next = change(reading.result ?? null);
            if (next === null) return;
            store.put(next, COPY_KEY);
            wrote = true;
          };
          return reading;
        },
        () => wrote,
        false,
      );
    },
```

En el `index.ts` de `shared/api/content`:

```ts
export { harnessOf, withHarness } from './harness-copy';
export type { CopiedHarness, HarnessData } from './harness-copy';
export type { ContentCopyUpdates } from './indexeddb-copy-store';
```

En `app/boot/content-stage.ts`:

- el import de `../../shared/api/content` suma `harnessOf` y `withHarness`;
- en `afterPublish`, la línea `void contentCopies.write(copyOf(reading)).then(announceCopySaved);` pasa a:

```ts
  void contentCopies
    .update((previous) => withHarness(copyOf(reading), harnessOf(previous)))
    .then(announceCopySaved);
```

**Paso 6.** `npm run test:unit -- src/shared/api/content` en verde. `npm test`: `boot-check` sigue en verde, porque su IndexedDB no existe y `update` devuelve `false` igual que `write`. Commit: `feat(front): la copia del contenido guarda la plantilla como porción opcional y la conserva (A4 FR-029)`.

### Tarea 3.9 · La plantilla con `If-None-Match` (T016, F)

- **Consume:**
  - `ContentFetch` (A3, `api-content-source.ts`);
  - `harnessOf`, `withHarness`, `usableCopy`, `ContentCopyStore` y `ContentCopyUpdates` (T015).
- **Produce:** `HARNESS_PATH`, `HarnessHolderOptions`, `HarnessHolder` y `createHarnessHolder` (contrato `lab-execution.md`).
- **Archivos:** `shared/api/content/harness-holder.ts` y `harness-holder.spec.ts` (nuevos), e `index.ts`.

**Paso 1.** El stub:

```ts
import type { ContentFetch } from './api-content-source';
import type { ContentCopyStore } from './content-copy';
import type { HarnessData } from './harness-copy';
import type { ContentCopyUpdates } from './indexeddb-copy-store';

export const HARNESS_PATH = '/api/harness';

export interface HarnessHolderOptions {
  readonly fetch: ContentFetch;
  readonly copies: Pick<ContentCopyStore, 'read'> & ContentCopyUpdates;
}

export interface HarnessHolder {
  current(): HarnessData | null;
  refresh(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export const createHarnessHolder: (options: HarnessHolderOptions) => HarnessHolder = () => {
  throw new Error('not implemented');
};
```

**Paso 2.** `harness-holder.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { COPY_FORMAT, type ContentCopy } from './content-copy';
import { harnessOf, type CopiedHarness } from './harness-copy';
import { HARNESS_PATH, createHarnessHolder } from './harness-holder';
import { PORTION_NAMES, type PortionName } from './portions';

const OLD: CopiedHarness = {
  etag: '"11111111111111111111111111111111"',
  data: { rust: 'old rust {{code}}\n', go: 'old go {{code}}\n' },
};
const NEW: CopiedHarness = {
  etag: '"22222222222222222222222222222222"',
  data: { rust: 'new rust {{code}}\n', go: 'new go {{code}}\n' },
};

type Reply = { status: number; body?: string; etag?: string } | 'network-error';

function realPortion(name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = (curriculum as Record<string, unknown>)[group];
  return slice === undefined ? value : (value as Record<string, unknown>)[slice];
}

function usableRecord(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: COPY_FORMAT,
    version: 'a'.repeat(32),
    confirmedAt: '2026-10-07T18:00:00.000Z',
    portions: {
      ...Object.fromEntries(PORTION_NAMES.map((name) => [name, { etag: `"${name}"`, data: realPortion(name) }])),
      ...extra,
    },
  };
}

function fakeFetch(replies: Reply[]) {
  const calls: { input: string; headers: Record<string, string> }[] = [];
  let index = 0;
  const fetch = async (input: string, init: RequestInit) => {
    calls.push({ input, headers: { ...(init.headers as Record<string, string>) } });
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    if (reply === 'network-error') throw new TypeError('Failed to fetch');
    return {
      status: reply.status,
      headers: new Headers(reply.etag === undefined ? {} : { ETag: reply.etag }),
      text: async () => reply.body ?? '',
    };
  };
  return { fetch, calls };
}

function fakeCopies(record: unknown) {
  const written: ContentCopy[] = [];
  let reads = 0;
  return {
    written,
    reads: () => reads,
    read: async () => {
      reads += 1;
      return record;
    },
    update: async (change: (record: unknown) => ContentCopy | null) => {
      const next = change(record);
      if (next !== null) written.push(next);
      return next !== null;
    },
  };
}

describe('the template of the server for the preview (A4 FR-029)', () => {
  it('starts from the copy, asks with If-None-Match and keeps it on a 304', async () => {
    const copies = fakeCopies(usableRecord({ harness: OLD }));
    const { fetch, calls } = fakeFetch([{ status: 304 }]);
    const holder = createHarnessHolder({ fetch, copies });

    await holder.refresh();

    expect(holder.current()).toEqual(OLD.data);
    expect(calls).toEqual([
      { input: HARNESS_PATH, headers: { Accept: 'application/json', 'If-None-Match': OLD.etag } },
    ]);
    expect(copies.written).toEqual([]);
  });

  it('keeps a new template, tells the listeners and adds it to the copy', async () => {
    const copies = fakeCopies(usableRecord());
    const { fetch, calls } = fakeFetch([{ status: 200, body: JSON.stringify(NEW.data), etag: NEW.etag }]);
    const holder = createHarnessHolder({ fetch, copies });
    let notices = 0;
    holder.subscribe(() => {
      notices += 1;
    });

    await holder.refresh();

    expect(holder.current()).toEqual(NEW.data);
    expect(notices).toBe(1);
    expect(calls[0].headers).not.toHaveProperty('If-None-Match');
    expect(copies.written.map(harnessOf)).toEqual([NEW]);
  });

  it('keeps the template only in memory without a usable copy', async () => {
    const copies = fakeCopies(null);
    const { fetch } = fakeFetch([{ status: 200, body: JSON.stringify(NEW.data), etag: NEW.etag }]);
    const holder = createHarnessHolder({ fetch, copies });

    await holder.refresh();

    expect(holder.current()).toEqual(NEW.data);
    expect(copies.written).toEqual([]);
  });

  it('keeps what it had, and never rejects, after a lost network, an error, a broken body or a missing ETag', async () => {
    const copies = fakeCopies(usableRecord({ harness: OLD }));
    const { fetch } = fakeFetch([
      'network-error',
      { status: 503, body: '{"message":"x","code":"server_error"}' },
      { status: 200, body: 'not json', etag: NEW.etag },
      { status: 200, body: JSON.stringify(NEW.data) },
    ]);
    const holder = createHarnessHolder({ fetch, copies });

    for (let attempt = 0; attempt < 4; attempt += 1) await expect(holder.refresh()).resolves.toBeUndefined();

    expect(holder.current()).toEqual(OLD.data);
    expect(copies.written).toEqual([]);
  });

  it('reads the copy only once and stops telling a listener that left', async () => {
    const copies = fakeCopies(usableRecord());
    const { fetch } = fakeFetch([
      { status: 200, body: JSON.stringify(OLD.data), etag: OLD.etag },
      { status: 200, body: JSON.stringify(NEW.data), etag: NEW.etag },
    ]);
    const holder = createHarnessHolder({ fetch, copies });
    let notices = 0;
    const leave = holder.subscribe(() => {
      notices += 1;
    });

    await holder.refresh();
    leave();
    await holder.refresh();

    expect(copies.reads()).toBe(1);
    expect(notices).toBe(1);
    expect(holder.current()).toEqual(NEW.data);
  });
});
```

**Paso 3.** `npm run test:unit -- src/shared/api/content/harness-holder.spec.ts`: todo falla por `not implemented`.

**Paso 4.** La implementación (reemplaza el stub; las interfaces del paso 1 quedan igual y el import suma lo que usa):

```ts
import { isPlainObject } from '../../lib/is-plain-object';
import type { ContentFetch } from './api-content-source';
import { usableCopy, type ContentCopyStore } from './content-copy';
import { harnessOf, withHarness, type CopiedHarness, type HarnessData } from './harness-copy';
import type { ContentCopyUpdates } from './indexeddb-copy-store';

function parseHarness(text: string): HarnessData | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!isPlainObject(value) || typeof value.rust !== 'string' || typeof value.go !== 'string')
      return null;
    return { rust: value.rust, go: value.go };
  } catch {
    return null;
  }
}

export function createHarnessHolder({ fetch, copies }: HarnessHolderOptions): HarnessHolder {
  let known: CopiedHarness | null = null;
  let copyRead = false;
  const listeners = new Set<() => void>();

  function keep(harness: CopiedHarness | null): void {
    if (harness === null || harness.etag === known?.etag) return;
    known = harness;
    for (const listener of listeners) listener();
  }

  async function readCopyOnce(): Promise<void> {
    if (copyRead) return;
    copyRead = true;
    keep(harnessOf(await copies.read()));
  }

  async function download(): Promise<CopiedHarness | null> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (known !== null) headers['If-None-Match'] = known.etag;
    const response = await fetch(HARNESS_PATH, { method: 'GET', credentials: 'same-origin', headers });
    if (response.status !== 200) return null;
    const etag = response.headers.get('ETag');
    const data = parseHarness(await response.text());
    return etag === null || data === null ? null : { etag, data };
  }

  async function save(harness: CopiedHarness): Promise<void> {
    await copies.update((record) => {
      const copy = usableCopy(record);
      return copy === null ? null : withHarness(copy, harness);
    });
  }

  return {
    current: () => known?.data ?? null,
    async refresh() {
      try {
        await readCopyOnce();
        const downloaded = await download();
        if (downloaded === null) return;
        keep(downloaded);
        await save(downloaded);
      } catch {
        return;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
```

El índice de `shared/api/content` suma:

```ts
export { HARNESS_PATH, createHarnessHolder } from './harness-holder';
export type { HarnessHolder, HarnessHolderOptions } from './harness-holder';
```

**Paso 5.** `npm run test:unit -- src/shared/api/content` en verde. Commit: `feat(front): la plantilla se revalida con If-None-Match y vive en la copia (A4 FR-029)`.

### Tarea 3.10 · La composición del laboratorio (T017, F)

- **Consume:**
  - `createApiRunsTransport` y `createServerProgramBuilder` (T013, T014);
  - `createHarnessHolder` y `contentCopies` (T016, A3);
  - `sessionStore` (F11a); `requestSignIn` y `reauthenticate` (F11a);
  - `apiClient` (`app/account/api-client.ts`, F11a);
  - `reloadDocument` (`shared/lib/reload-document.ts`, F11a) y `wait` (`shared/lib/wait.ts`, A3).
- **Produce:** `labTransport`, `labHarness` y `labProgramBuilder` (contrato `lab-execution.md`), y la entrada sin vista `features/sign-in/requests.ts`.
- **Archivos (nuevos):** `frontend/src/features/sign-in/requests.ts` y `frontend/src/app/lab/server-execution.ts`.

**Paso 1.** `features/sign-in/requests.ts`:

```ts
export { requestSignIn } from './model/access-request';
export { reauthenticate } from './model/reauthenticate';
```

**Paso 2.** `app/lab/server-execution.ts`:

```ts
import { sessionStore } from '../../entities/session';
import { createApiRunsTransport, createServerProgramBuilder } from '../../features/run-exercise';
import { reauthenticate, requestSignIn } from '../../features/sign-in/requests';
import { contentCopies, createHarnessHolder } from '../../shared/api/content';
import { reloadDocument } from '../../shared/lib/reload-document';
import { wait } from '../../shared/lib/wait';
import { apiClient } from '../account/api-client';

function askToSignIn(accountId: number | null): void {
  if (accountId === null) {
    void requestSignIn({ presentation: 'dialog', reason: 'expired' });
    return;
  }
  void reauthenticate(accountId, { requestSignIn, reloadDocument });
}

export const labTransport = createApiRunsTransport({
  client: apiClient,
  currentAccount: () => sessionStore.getState().user?.id ?? null,
  askToSignIn,
  newRunId: () => crypto.randomUUID(),
  clock: { now: () => Date.now(), wait, random: () => Math.random() },
});

export const labHarness = createHarnessHolder({
  fetch: (input, init) => window.fetch(input, init),
  copies: contentCopies,
});

export const labProgramBuilder = createServerProgramBuilder(() => labHarness.current());
```

**Paso 3.** Los checks:
- `npm run typecheck`;
- `node qa/seams-guard-check.ts`: sin violaciones. El archivo no importa un índice de `entities/exercise`, `guide`, `campaign` ni `systems-workshop` (R4) ni un archivo interno de esos slices (R6);
- `npm run lint`;
- `npm test`.

**Paso 4.** Commit: `feat(front): la composición del laboratorio con /api/runs, la sesión y la plantilla (A4)`.

## 4. Unidad 4 · La red E2E sobre el doble de la API (dueño E, ondas 1 y 2)

Cubre FR-042, FR-043, FR-046 (la parte E2E), US1 a US8 en el navegador y SC-001, SC-003 y SC-009. T018 sólo toca los dobles; T019 edita las E2E y suma las de A4, en un commit con la aprobación del usuario.

### Tarea 4.1 · Los dobles (T018, E)

- **Consume:**
  - `ApiDouble`, `ApiCall`, `ApiReply` y `ApiRoute` (`qa/e2e/fixtures/api-double.ts`, F11a con lo que suma A3);
  - `ExerciseUnderTest`, `RUST_01`, `RUST_02` y `GO_113` (`qa/e2e/lib/compiler-results.ts`, F7a);
  - `build/harness.json` y `build/curriculum.meta.json`.
- **Produce:**
  - el manejador por omisión de `GET /api/harness`;
  - `CompilerDouble` sobre el `ApiDouble` (contrato `lab-execution.md`);
  - las ejecuciones del contrato de B2 en `compiler-results.ts`;
  - `ATTEMPTS_LINE` y `ATTEMPT_COUNT`;
  - los localizadores nuevos del Page Object.
- **Archivos:** `qa/e2e/fixtures/api-double.ts`, `compiler-double.ts` e `index.ts`; `qa/e2e/lib/compiler-results.ts` y `lab-copy.ts`; `qa/e2e/pages/lab.ts`.

**Paso 1.** `api-double.ts`.

- **Lo que suma A3,** si no está: si T001 no encontró `ifNoneMatch` en `ApiCall` ni `abort?: boolean` en `ApiReply`, sumalos con la forma del plan de A3 (:4399-4411):
  - `ifNoneMatch: headers['if-none-match'],` en `callOf`;
  - `if (reply.abort === true) { await route.abort(); return; }` en `handle`, antes del `fulfill`.
- **Los imports y las constantes, arriba:**

  ```ts
  import { readFileSync } from 'node:fs';
  import { resolve } from 'node:path';
  ```

  (si ya están, no los repitas)

  ```ts
  const BUILD = resolve(import.meta.dirname, '../../../build');
  const HARNESS_BODY = readFileSync(resolve(BUILD, 'harness.json'), 'utf8');
  const HARNESS_ETAG = `"${(
    JSON.parse(readFileSync(resolve(BUILD, 'curriculum.meta.json'), 'utf8')) as {
      portions: { harness: string };
    }
  ).portions.harness.slice(0, 32)}"`;
  ```

- **Al final de `installDefaults`:**

  ```ts
  this.on('GET /api/harness', (call) => this.harnessReply(call));
  ```

- **El método nuevo,** junto a los privados:

  ```ts
  private harnessReply(call: ApiCall): ApiReply {
    const headers = { ETag: HARNESS_ETAG, 'Cache-Control': 'private, no-cache' };
    if (call.ifNoneMatch === HARNESS_ETAG) return { status: 304, headers };
    return { status: 200, headers, body: HARNESS_BODY, contentType: 'application/json' };
  }
  ```

  Es el mismo contrato que las 17 porciones (`contracts/runs-api.md` de B2, «`GET /api/harness`»).

**Paso 2.** `compiler-results.ts`, entero. Los tres ejercicios no cambian y entran las ejecuciones del contrato ampliado (`contracts/runs-api-attempt-id.md`). `PLAYGROUND_ENDPOINT` se queda hasta T019, que borra su único uso, para que `npm run typecheck` siga en verde entre los dos commits:

```ts
import type { Language } from './curriculum';

export interface ExerciseUnderTest {
  id: string;
  language: Language;
  testIds: readonly string[];
}

export const RUST_01: ExerciseUnderTest = { id: 'rust-01', language: 'rust', testIds: ['t1', 't2', 't3'] };
export const RUST_02: ExerciseUnderTest = { id: 'rust-02', language: 'rust', testIds: ['t1', 't2', 't3'] };
export const GO_113: ExerciseUnderTest = { id: 'go-113', language: 'go', testIds: ['t1', 't2', 't3'] };

export type CompilerKind = 'passed' | 'failedTest' | 'compileError' | 'transportError';
export type CustomOutcome = 'PASS' | 'FAIL';
export type WaitingState =
  | { readonly status: 'queued'; readonly position: number }
  | { readonly status: 'running' };

export interface RunIds {
  readonly runId: string;
  readonly attemptId: number;
}

export interface ServerRunBody {
  id: string;
  status: string;
  reason: string | null;
  queuePosition: number | null;
  exerciseId: string;
  language: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  phase: string | null;
  exitCode: number | null;
  compileMs: number | null;
  runMs: number | null;
  truncated: boolean | null;
  stdout: string | null;
  stderr: string | null;
  tests: { key: string; outcome: string }[];
  customTest: string | null;
  attemptId: number | null;
}

export const RUN_NONCE = '5e0c7a1b2d3f4e5a6b7c8d9e0f1a2b3c';
export const PREVIEW_MARKER = `__TALLER_TEST__${'0'.repeat(32)}:`;

const COMPILE_ERROR: Record<Language, string> = {
  rust: 'error[E0384]: cannot assign twice to immutable variable `nivel`\n',
  go: 'prog.go:12:2: declared and not used: x\n',
};

export function runIdOf(submission: number): string {
  return `0199f4a2-0000-7000-8000-${String(submission).padStart(12, '0')}`;
}

function emptyRun(exercise: ExerciseUnderTest, ids: RunIds): ServerRunBody {
  return {
    id: ids.runId,
    status: 'queued',
    reason: null,
    queuePosition: null,
    exerciseId: exercise.id,
    language: exercise.language,
    createdAt: '2026-10-06T12:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    phase: null,
    exitCode: null,
    compileMs: null,
    runMs: null,
    truncated: null,
    stdout: null,
    stderr: null,
    tests: [],
    customTest: null,
    attemptId: null,
  };
}

export function waitingRun(exercise: ExerciseUnderTest, state: WaitingState, ids: RunIds): ServerRunBody {
  const run = emptyRun(exercise, ids);
  if (state.status === 'queued') return { ...run, queuePosition: state.position };
  return { ...run, status: 'running', startedAt: '2026-10-06T12:00:00.500Z' };
}

function finishedBase(exercise: ExerciseUnderTest, ids: RunIds): ServerRunBody {
  return {
    ...emptyRun(exercise, ids),
    startedAt: '2026-10-06T12:00:00.500Z',
    finishedAt: '2026-10-06T12:00:01.200Z',
    truncated: false,
    stdout: '',
    stderr: '',
    attemptId: ids.attemptId,
  };
}

function customOutcomeOf(custom: CustomOutcome | undefined): string | null {
  if (custom === undefined) return null;
  return custom === 'PASS' ? 'pass' : 'fail';
}

function evidence(exercise: ExerciseUnderTest, failing: readonly string[], custom?: CustomOutcome): string {
  const markers = exercise.testIds.map(
    (id) => `__TALLER_TEST__${RUN_NONCE}:${id}:${failing.includes(id) ? 'FAIL' : 'PASS'}\n`,
  );
  if (custom !== undefined) markers.push(`__TALLER_TEST__${RUN_NONCE}:custom:${custom}\n`);
  return `${markers.join('')}__TALLER_END__${RUN_NONCE}:${markers.length}\n`;
}

export function finishedRun(
  exercise: ExerciseUnderTest,
  kind: Exclude<CompilerKind, 'transportError'>,
  ids: RunIds,
  custom?: CustomOutcome,
): ServerRunBody {
  const base = finishedBase(exercise, ids);
  if (kind === 'compileError')
    return { ...base, status: 'compile_error', phase: 'compile', exitCode: 1, compileMs: 300, stderr: COMPILE_ERROR[exercise.language] };
  const failing = kind === 'failedTest' ? ['t2'] : [];
  return {
    ...base,
    status: kind === 'passed' ? 'passed' : 'failed',
    phase: 'run',
    exitCode: 0,
    compileMs: 300,
    runMs: 20,
    stdout: evidence(exercise, failing, custom),
    tests: exercise.testIds.map((key) => ({ key, outcome: failing.includes(key) ? 'fail' : 'pass' })),
    customTest: customOutcomeOf(custom),
  };
}

export function canceledRun(exercise: ExerciseUnderTest, ids: RunIds): ServerRunBody {
  return { ...finishedBase(exercise, ids), status: 'canceled' };
}

export const PLAYGROUND_ENDPOINT: Record<Language, string> = {
  rust: 'https://play.rust-lang.org/execute',
  go: 'https://play.golang.org/compile',
};
```

**Paso 3.** `compiler-double.ts`, entero:

- conserva la interfaz que usan las E2E de F1 y de F7a;
- `requests` cuenta un envío por `clientRunId`;
- la red caída es `abort` (research R13).

```ts
import {
  canceledRun,
  finishedRun,
  runIdOf,
  waitingRun,
  type CompilerKind,
  type CustomOutcome,
  type ExerciseUnderTest,
  type RunIds,
  type ServerRunBody,
  type WaitingState,
} from '../lib/compiler-results';
import type { ApiCall, ApiDouble, ApiReply } from './api-double';

interface RunPlan {
  readonly drops: boolean;
  waiting(poll: number): WaitingState | null;
  finish(ids: RunIds): ServerRunBody;
}

interface Submission {
  readonly ids: RunIds;
  polls: number;
  canceled: boolean;
}

const RUNNING: WaitingState = { status: 'running' };
const FIRST_IN_QUEUE: WaitingState = { status: 'queued', position: 1 };

export class CompilerDouble {
  readonly requests: string[] = [];
  readonly bodies: string[] = [];
  private readonly seen = new Set<string>();
  private readonly submissions = new Map<string, Submission>();
  private readonly rejections: ApiReply[] = [];

  constructor(private readonly api: ApiDouble) {}

  async answer(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<void> {
    this.serve(exercise, this.planFor(exercise, kind));
  }

  async hold(exercise: ExerciseUnderTest): Promise<void> {
    this.serve(exercise, { ...this.planFor(exercise, 'passed'), waiting: () => RUNNING });
  }

  async answerWithCustom(exercise: ExerciseUnderTest, kind: CompilerKind, custom: CustomOutcome): Promise<void> {
    this.serve(exercise, this.planFor(exercise, kind, custom));
  }

  async answerLater(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<() => void> {
    return this.answerThrough(exercise, [RUNNING], kind);
  }

  async answerThrough(
    exercise: ExerciseUnderTest,
    states: readonly WaitingState[],
    kind: CompilerKind,
  ): Promise<() => void> {
    let released = false;
    this.serve(exercise, {
      ...this.planFor(exercise, kind),
      waiting: (poll) => (released ? null : states[Math.min(poll, states.length - 1)]),
    });
    return () => {
      released = true;
    };
  }

  async finishWith(exercise: ExerciseUnderTest, run: Partial<ServerRunBody>): Promise<void> {
    this.serve(exercise, {
      drops: false,
      waiting: () => null,
      finish: (ids) => ({ ...finishedRun(exercise, 'passed', ids), ...run }),
    });
  }

  rejectFirst(...replies: ApiReply[]): void {
    this.rejections.push(...replies);
  }

  cancelCalls(): ApiCall[] {
    return this.api.calls.filter((call) => call.method === 'POST' && call.path.endsWith('/cancel'));
  }

  private planFor(exercise: ExerciseUnderTest, kind: CompilerKind, custom?: CustomOutcome): RunPlan {
    if (kind === 'transportError')
      return { drops: true, waiting: () => null, finish: (ids) => finishedRun(exercise, 'passed', ids) };
    return { drops: false, waiting: () => null, finish: (ids) => finishedRun(exercise, kind, ids, custom) };
  }

  private serve(exercise: ExerciseUnderTest, plan: RunPlan): void {
    this.api.on('POST /api/runs', (call) => this.submit(call, exercise, plan));
  }

  private submit(call: ApiCall, exercise: ExerciseUnderTest, plan: RunPlan): ApiReply {
    const { clientRunId } = call.body as { clientRunId: string };
    if (!this.seen.has(clientRunId)) {
      this.seen.add(clientRunId);
      this.requests.push(`${call.method} ${call.path}`);
      this.bodies.push(JSON.stringify(call.body));
    }
    const rejection = this.rejections.shift();
    if (rejection !== undefined) return rejection;
    if (plan.drops) return { status: 0, abort: true };
    const known = this.submissions.get(clientRunId);
    const submission = known ?? this.open(clientRunId, exercise, plan);
    const first = plan.waiting(0);
    const accepted = first?.status === 'queued' ? first : FIRST_IN_QUEUE;
    return {
      status: known === undefined ? 202 : 200,
      json: { data: waitingRun(exercise, accepted, submission.ids) },
    };
  }

  private open(clientRunId: string, exercise: ExerciseUnderTest, plan: RunPlan): Submission {
    const index = this.submissions.size + 1;
    const ids: RunIds = { runId: runIdOf(index), attemptId: 100 + index };
    const submission: Submission = { ids, polls: 0, canceled: false };
    this.submissions.set(clientRunId, submission);
    this.api.on(`GET /api/runs/${ids.runId}`, () => ({
      status: 200,
      json: { data: this.poll(submission, exercise, plan) },
    }));
    this.api.on(`POST /api/runs/${ids.runId}/cancel`, () => {
      submission.canceled = true;
      return { status: 200, json: { data: canceledRun(exercise, ids) } };
    });
    return submission;
  }

  private poll(submission: Submission, exercise: ExerciseUnderTest, plan: RunPlan): ServerRunBody {
    if (submission.canceled) return canceledRun(exercise, submission.ids);
    const state = plan.waiting(submission.polls);
    submission.polls += 1;
    return state === null ? plan.finish(submission.ids) : waitingRun(exercise, state, submission.ids);
  }
}
```

**Paso 4.** `fixtures/index.ts`: la línea del doble pasa a `compiler: async ({ api }, use) => use(new CompilerDouble(api)),`.

**Paso 5.** `lab-copy.ts` suma, debajo de `attemptsLine` (que se queda hasta T019, por la misma razón):

```ts
export const ATTEMPTS_LINE = 'Revisar es parte de aprender.';
export const ATTEMPT_COUNT = /\d+ intentos?\./;
```

**Paso 6.** `pages/lab.ts` suma, después de `cancelRunButton()`. Son nodos sin nombre accesible propio, así que el id es su contrato:

```ts
  runLine(): Locator {
    return this.page.locator('#lab-run-line');
  }

  runAnnouncement(): Locator {
    return this.page.locator('#lab-run-announcement');
  }

  delayNotice(): Locator {
    return this.page.locator('#lab-run-delay');
  }

  programNote(): Locator {
    return this.page.locator('#lab-program-note');
  }

  executionGuide(): Locator {
    return this.page.locator('.lab-execution-guide');
  }

  runDisclosure(): Locator {
    return this.page.locator('.lab-run-disclosure');
  }
```

**Paso 7.** `npm run typecheck` y `npm test` en verde. Con `npm run build && E2E_PORT=4300 npm run test:e2e -- specs/lab-storage.spec.ts specs/lab-map.spec.ts`, las E2E que no ejecutan siguen en verde (piden la plantilla y el doble la sirve). Las que ejecutan quedan en rojo hasta la unidad 5: el doble ya simula `/api/runs`, y `lab.js` todavía llama a los Playgrounds.

**Paso 8.** Commit: `test(e2e): el doble del compilador simula /api/runs sobre el doble de la API (A4)`.

### Tarea 4.2 · Las E2E editadas y las de A4, en rojo (T019, E)

- **Antes de empezar:** el usuario aprueba este commit (FR-042; Acciones del usuario de la spec). El coordinador le muestra la lista de research R14 y espera el OK. Sin el OK, la tarea se detiene en el paso 5, sin commit.
- **Consume:** los dobles de T018; `errorBody` y `STUDENT` (`qa/e2e/lib/api-contract.ts`, F11a); `AccessPage` (`qa/e2e/pages/access.ts`); `LAB_KEY`, `LAB_WRITE` y `SYNC_WRITES` (`qa/e2e/lib/lab-storage.ts`).
- **Produce:** 20 E2E editadas y las E2E nuevas de A4, todas en rojo contra el `lab.js` de F7a (que todavía llama a los Playgrounds, y la red estricta los bloquea).
- **Archivos:** `qa/e2e/specs/cycle.spec.ts`, `guards.spec.ts`, `lab-run.spec.ts` y `lab-exercise.spec.ts`; `qa/e2e/specs/lab-sandbox.spec.ts` (nuevo).

**Paso 1.** `cycle.spec.ts` (F1). Cambian el detalle del fallo de transporte y los dos títulos de `describe`; los ocho escenarios y el resto de sus aserciones quedan igual (`compiler.requests` cuenta envíos: research R13):

```ts
const TRANSPORT: Review = {
  heading: 'No pude ejecutar esta vez.',
  detail: 'No se pudo conectar con el taller.',
};
```

- `test.describe('a campaign mission with the Rust Playground simulated', …)` pasa a `test.describe('a campaign mission with the sandbox simulated', …)`;
- `test.describe('a Systems core with the Go Playground simulated', …)` pasa a `test.describe('a Systems core with the sandbox simulated', …)`.

**Paso 2.** `guards.spec.ts` (F1). La guarda de los hosts públicos ya no puede dispararse al ejecutar. Reemplazá el `test.fail('a request to a public host without a double fails the test', …)` por estos dos (el segundo es la guarda de FR-043):

```ts
  test.fail(
    'a request to a public host without a double fails the test',
    async ({ shell, page, pageIssues }) => {
      pageIssues.expectIssue(/ERR_BLOCKED_BY_CLIENT/, 'la red estricta aborta el pedido');
      await shell.goto(urls.view('recorrido'));
      await page.evaluate(() => fetch('https://example.com/').then(() => undefined, () => undefined));
    },
  );

  test.fail('a request to /api/ without a double fails the test', async ({ shell, page, pageIssues }) => {
    pageIssues.expectIssue(/status of 404/, 'el doble de la API responde 404 a una ruta que no conoce');
    await shell.goto(urls.view('recorrido'));
    await page.evaluate(() => fetch('/api/nada-por-aca').then(() => undefined));
  });
```

Sale el import de `RUST_02` si no lo usa nada más.

**Paso 3.** `lab-run.spec.ts` (F7a). Diez de las catorce cambian.

- **Arriba:**
  - el import de `../lib/compiler-results` queda `import { RUST_01, RUST_02, type CompilerKind } from '../lib/compiler-results';`;
  - el de `../lib/lab-copy` pasa a `import { ATTEMPT_COUNT, ATTEMPTS_LINE } from '../lib/lab-copy';`;
  - `storedRecord` tolera que el laboratorio no haya escrito nada:

    ```ts
    async function storedRecord(
      storage: { snapshot(): Promise<Record<string, string>> },
      id: string = RUST_01.id,
    ) {
      const saved = (await storage.snapshot())[LAB_KEY];
      return saved === undefined ? undefined : JSON.parse(saved).records[id];
    }
    ```

- **El título del `describe`** pasa a `'a free exercise with the sandbox simulated'`.
- **Lo que T018 dejó para este commit:** borrá `attemptsLine` de `qa/e2e/lib/lab-copy.ts` y `PLAYGROUND_ENDPOINT` de `qa/e2e/lib/compiler-results.ts`; `lab-copy.ts` queda con el comentario de una línea `// The line of attempts of the review: A4 hides the number until D1c brings it from the server (A4 FR-038).` sobre `ATTEMPTS_LINE`.
- **Las diez,** reemplazadas enteras:

```ts
  for (const kind of ['passed', 'failedTest', 'compileError'] as const) {
    test(`${kind}: the review explains it, without the number of attempts`, async ({
      shell,
      lab,
      compiler,
    }) => {
      await compiler.answer(RUST_01, kind);
      await shell.goto(urls.exercise(RUST_01.id, 'code'));

      await lab.runCode();

      await expect(lab.reviewHeading()).toHaveText(REVIEW[kind].heading);
      await expect(lab.review()).toContainText(REVIEW[kind].detail);
      await expect(lab.review()).toContainText(ATTEMPTS_LINE);
      await expect(lab.review()).not.toContainText(ATTEMPT_COUNT);
      expect(compiler.requests).toHaveLength(1);
    });
  }

  test('the first approval saves once, marks the review and is announced, and later runs keep it (F7-Q1)', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
    await storage.watchWrites();
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.writeDraft('rust', SOLUTION);

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(shell.toast).toHaveText(
      '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
    );
    await expect(lab.explainButton()).toBeVisible();
    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE, ...SYNC_WRITES]);
    const record = await storedRecord(storage);
    expect(record).toMatchObject({
      draft: SOLUTION,
      solvedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
      result: {
        code: SOLUTION,
        success: true,
        transportError: false,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: true },
          { id: 't3', passed: true },
        ],
        customTest: '',
        customPassed: false,
        attemptId: 101,
      },
    });
    expect(record.attempts).toBeUndefined();

    await page.clock.setFixedTime(new Date('2026-10-06T13:00:00Z'));
    await lab.runCode();
    await expect(shell.toast).toHaveText('Estos casos siguen funcionando. Probá una variante.');
    await expect(lab.review()).toContainText(ATTEMPTS_LINE);
    await expect(lab.review()).not.toContainText(ATTEMPT_COUNT);
    await compiler.answer(RUST_01, 'failedTest');
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.failedTest.heading);
    expect(await storedRecord(storage)).toMatchObject({
      solvedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
    });
  });

  test('Ctrl/⌘ + Enter in the editor runs, and twice sends one request', async ({
    shell,
    lab,
    compiler,
    page,
  }) => {
    const release = await compiler.answerLater(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.editor('rust').click();

    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('ControlOrMeta+Enter');

    await expect(lab.runningButton()).toBeDisabled();
    await expect(lab.review()).toContainText('Ejecutando código real…');
    release();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(lab.review()).toContainText(ATTEMPTS_LINE);
    await expect(lab.review()).not.toContainText(ATTEMPT_COUNT);
    expect(compiler.requests).toHaveLength(1);
  });

  test('cancelling asks the server to cancel, saves nothing and says so', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await storage.watchWrites();
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.review()).toContainText('Ejecutando código real…');

    await lab.cancelRunButton().click();

    await expect(shell.toast).toHaveText('Ejecución cancelada. Tu código sigue guardado.');
    await expect(lab.runButton()).toBeEnabled();
    await expect(lab.runButton()).toHaveText('▷ Ejecutar y revisar');
    await expect.poll(() => compiler.cancelCalls().length).toBe(1);
    expect(await storage.writes()).toEqual([]);
  });

  test('going back to the map cancels the run on the server and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.review()).toContainText('Ejecutando código real…');

    await lab.backButton().click();

    await expect.poll(() => compiler.cancelCalls().length).toBe(1);
    expect((await storedRecord(storage))?.result).toBeUndefined();
  });

  test('leaving the lab cancels the run and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await shell.openFromMenu('atlas');
    await page.goBack();

    await expect(lab.runButton()).toBeEnabled();
    expect((await storedRecord(storage))?.result).toBeUndefined();
  });

  test('your own case is sent normalized and reviewed apart', async ({ shell, lab, compiler }) => {
    await compiler.answerWithCustom(RUST_01, 'passed', 'FAIL');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.customTestToggle().click();
    await lab.customTestBox('rust').fill('  energia(1) == 8  ');

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(lab.review()).toContainText('Tu caso extra: encontró una diferencia ×');
    expect(JSON.parse(compiler.bodies[0])).toMatchObject({
      exerciseId: 'rust-01',
      customTest: 'energia(1) == 8',
    });
  });

  test('the lab counts no attempt: not a cancelled run, a transport failure or a run (A4 FR-021; spec 021, quirk 8, fixed)', async ({
    shell,
    lab,
    compiler,
    storage,
    pageIssues,
  }) => {
    pageIssues.expectIssue(
      /Failed to load resource: net::ERR_FAILED/,
      'el doble aborta el pedido a propósito',
    );
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await lab.cancelRunButton().click();
    await compiler.answer(RUST_01, 'transportError');
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    await compiler.answer(RUST_01, 'failedTest');

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(REVIEW.failedTest.heading);
    await expect(lab.review()).toContainText(ATTEMPTS_LINE);
    await expect(lab.review()).not.toContainText(ATTEMPT_COUNT);
    expect((await storedRecord(storage))?.attempts).toBeUndefined();
  });
```

- **Las cuatro que no cambian:** «transportError: nothing is approved nor failed», «changing the phase does not cancel…», «the next and the previous exercise each cancel the run…» y «a result goes stale when the code changes».

**Paso 4.** `lab-exercise.spec.ts` (F7a), en la prueba de la línea 103:

- el import de `../lib/compiler-results` suma `PREVIEW_MARKER` (o se agrega `import { PREVIEW_MARKER } from '../lib/compiler-results';`);
- `await expect(lab.programPreview()).toContainText('__TALLER_TEST__t1');` pasa a `await expect(lab.programPreview()).toContainText(`${PREVIEW_MARKER}t1:`);`.

**Paso 5.** `lab-sandbox.spec.ts`, entero:

```ts
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { STUDENT, errorBody } from '../lib/api-contract';
import { PREVIEW_MARKER, RUST_01, runIdOf } from '../lib/compiler-results';
import { ATTEMPTS_LINE } from '../lib/lab-copy';
import { LAB_KEY } from '../lib/lab-storage';
import { urls } from '../lib/urls';

const SOLVED = 'La idea funciona en estos casos.';
const HINT = 'El programa nos dejó una pista.';
const NOT_RUN = 'No pude ejecutar esta vez.';
const RUNNING = 'Ejecutando código real…';
const DELAY =
  'Está tardando más de lo habitual. Podés seguir esperando o cancelar; tu código sigue guardado.';
const TRANSPORT_CALLOUT =
  'Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas y volver a ejecutar en un rato.';

type Snapshot = { snapshot(): Promise<Record<string, string>> };

async function storedRecord(storage: Snapshot, id: string = RUST_01.id) {
  const saved = (await storage.snapshot())[LAB_KEY];
  return saved === undefined ? undefined : JSON.parse(saved).records[id];
}

function seededLab(record: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, records: { [RUST_01.id]: record }, selected: { rust: null, go: null } });
}

async function storedHarnessEtag(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const names = (await indexedDB.databases()).map((database) => database.name);
    if (!names.includes('taller-contenido')) return null;
    return new Promise<string | null>((resolve) => {
      const opening = indexedDB.open('taller-contenido');
      opening.onerror = () => resolve(null);
      opening.onsuccess = () => {
        const database = opening.result;
        if (!database.objectStoreNames.contains('copia')) {
          database.close();
          resolve(null);
          return;
        }
        const reading = database.transaction('copia', 'readonly').objectStore('copia').get('ultima');
        reading.onsuccess = () => {
          database.close();
          resolve(reading.result?.portions?.harness?.etag ?? null);
        };
        reading.onerror = () => {
          database.close();
          resolve(null);
        };
      };
    });
  });
}

test.describe('the wait in the sandbox of the workshop (A4)', () => {
  test('the queue place changes without a new announcement and the cancel button keeps its focus (FR-039, US4-7)', async ({
    shell,
    lab,
    compiler,
  }) => {
    const queued = (position: number) => ({ status: 'queued' as const, position });
    const release = await compiler.answerThrough(
      RUST_01,
      [queued(3), queued(3), queued(3), queued(2), queued(1), { status: 'running' }],
      'passed',
    );
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.runLine()).toHaveText('En la fila del taller: sos el número 3.');
    await expect(lab.runAnnouncement()).toHaveText('En la fila del taller.');
    const announcements = await lab.runAnnouncement().evaluateHandle((node) => {
      const seen: string[] = [];
      new MutationObserver(() => seen.push(node.textContent ?? '')).observe(node, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      return seen;
    });
    await lab.cancelRunButton().evaluate((node) => node.setAttribute('data-e2e-node', 'kept'));
    await lab.cancelRunButton().focus();

    await expect(lab.runLine()).toHaveText('En la fila del taller: sos el número 1.');
    await expect(lab.runLine()).toHaveText(RUNNING);

    expect(await announcements.jsonValue()).toEqual([RUNNING]);
    await expect(lab.cancelRunButton()).toHaveAttribute('data-e2e-node', 'kept');
    await expect(lab.cancelRunButton()).toBeFocused();
    release();
    await expect(lab.reviewHeading()).toHaveText(SOLVED);
  });

  test('after 15 s the review adds the delay notice and keeps «Cancelar ejecución» (Q3, US4-3)', async ({
    shell,
    lab,
    compiler,
    page,
  }) => {
    await page.clock.install();
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.runLine()).toHaveText(RUNNING);
    await expect(lab.delayNotice()).toBeHidden();

    await page.clock.fastForward(15_000);

    await expect(lab.delayNotice()).toHaveText(DELAY);
    await expect(lab.cancelRunButton()).toBeVisible();
  });

  test('cancelling in the queue asks the server to cancel, saves nothing and says so (US4-4)', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await storage.watchWrites();
    await compiler.answerThrough(RUST_01, [{ status: 'queued', position: 2 }], 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.runLine()).toHaveText('En la fila del taller: sos el número 2.');

    await lab.cancelRunButton().click();

    await expect(shell.toast).toHaveText('Ejecución cancelada. Tu código sigue guardado.');
    await expect.poll(() => compiler.cancelCalls().length).toBe(1);
    expect(await storage.writes()).toEqual([]);
  });

  test('runs, cancels and runs again with the keyboard only (SC-009)', async ({
    shell,
    lab,
    compiler,
    page,
  }) => {
    const release = await compiler.answerLater(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runButton().focus();

    await page.keyboard.press('Enter');
    await expect(lab.runLine()).toHaveText(RUNNING);
    await lab.cancelRunButton().focus();
    await page.keyboard.press('Enter');
    await expect(shell.toast).toHaveText('Ejecución cancelada. Tu código sigue guardado.');
    release();
    await lab.editor('rust').click();
    await page.keyboard.press('ControlOrMeta+Enter');

    await expect(lab.reviewHeading()).toHaveText(SOLVED);
  });

  test('with the active quota it waits its turn, says when it tries again and sends the same request (Q3, US4-5)', async ({
    shell,
    lab,
    compiler,
    api,
    pageIssues,
  }) => {
    pageIssues.expectIssue(/status of 429/, 'el doble rechaza el primer envío con la cuota de una activa');
    compiler.rejectFirst({
      status: 429,
      headers: { 'Retry-After': '3' },
      json: {
        message: 'Ya tenés una ejecución en curso: esperá a que termine.',
        code: 'quota_exceeded',
        quota: 'active',
      },
    });
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.runLine()).toHaveText(/^Esperando turno para ejecutar: vuelvo a intentar en [34] s\.$/);
    await expect(lab.reviewHeading()).toHaveText(SOLVED, { timeout: 10_000 });
    const bodies = api.callsTo('POST /api/runs').map((call) => JSON.stringify(call.body));
    expect(bodies).toHaveLength(2);
    expect(new Set(bodies).size).toBe(1);
    expect(compiler.requests).toHaveLength(1);
  });

  test('a quota with a window shows the message of the server and when to run again, without retrying (FR-011, US5-1)', async ({
    shell,
    lab,
    compiler,
    api,
    storage,
    pageIssues,
  }) => {
    pageIssues.expectIssue(/status of 429/, 'el doble rechaza el envío por la cuota de un minuto');
    compiler.rejectFirst({
      status: 429,
      headers: { 'Retry-After': '40' },
      json: {
        message: 'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.',
        code: 'quota_exceeded',
        quota: 'per_minute',
      },
    });
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(NOT_RUN);
    await expect(lab.review()).toContainText(
      'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento. Podés volver a ejecutar en 40 s.',
    );
    await expect(lab.review()).toContainText(TRANSPORT_CALLOUT);
    await expect(lab.runButton()).toBeEnabled();
    expect(api.callsTo('POST /api/runs')).toHaveLength(1);
    expect((await storedRecord(storage))?.attempts).toBeUndefined();
  });

  test('an expired session asks to sign in again, keeps the code, and runs after signing in (FR-012, US2-5)', async ({
    shell,
    lab,
    compiler,
    api,
    access,
    pageIssues,
  }) => {
    pageIssues.expectIssue(/status of 401/, 'la consulta recibe 401 porque la sesión venció');
    const release = await compiler.answerLater(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.runLine()).toHaveText(RUNNING);

    api.reply(`GET /api/runs/${runIdOf(1)}`, { status: 401, json: errorBody('unauthenticated') });

    await expect(lab.review()).toContainText(
      'Tu sesión venció: volvé a ingresar para ejecutar. Tu código sigue guardado.',
    );
    await expect(access.field('Email')).toBeVisible();
    await access.signIn(STUDENT.email, 'una contraseña de prueba bien larga');
    await expect(access.field('Email')).toBeHidden();
    release();
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText(SOLVED);
  });

  test('another account in another tab: the notice of C3a, without retrying (US2-6)', async ({
    shell,
    lab,
    compiler,
    api,
    pageIssues,
  }) => {
    pageIssues.expectIssue(/status of 409/, 'el doble responde que la sesión cambió de cuenta');
    compiler.rejectFirst({ status: 409, json: errorBody('account_mismatch') });
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(NOT_RUN);
    await expect(lab.review()).toContainText('La sesión cambió de cuenta: recargá la página.');
    expect(api.callsTo('POST /api/runs')).toHaveLength(1);
  });
});

test.describe('the results of the sandbox (A4)', () => {
  test('a timeout is a hint with the explanation of the time limit (US2-3)', async ({ shell, lab, compiler }) => {
    await compiler.finishWith(RUST_01, { status: 'timeout', phase: 'run', exitCode: null, stdout: '', tests: [] });
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(HINT);
    await expect(lab.review()).toContainText('La ejecución superó el tiempo límite del taller y se cortó.');
    await expect(lab.review()).toContainText(
      'Probá esto: Revisá bucles que no terminan y esperas entre hilos o goroutines que nunca se destraban.',
    );
  });

  test('evidence_invalid with the three tests in pass does not solve the exercise (US2-4)', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await compiler.finishWith(RUST_01, { status: 'failed', reason: 'evidence_invalid' });
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(HINT);
    await expect(lab.review()).toContainText(
      'El programa terminó sin dejar correr todas las pruebas, o imprimió marcas que imitan las del taller.',
    );
    expect((await storedRecord(storage))?.solvedAt).toBeUndefined();
  });

  test('infra_error says it could not run, with the failure of the workshop and its attempt (US2-2)', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await compiler.finishWith(RUST_01, {
      status: 'infra_error',
      reason: 'executor_busy',
      phase: null,
      exitCode: null,
      stdout: null,
      stderr: null,
      tests: [],
    });
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(NOT_RUN);
    await expect(lab.review()).toContainText(
      'El taller no pudo ejecutar tu código por una falla propia, no de tu programa.',
    );
    expect((await storedRecord(storage))?.result).toMatchObject({ transportError: true, attemptId: 101 });
  });

  test('a result keeps the id of its attempt after reloading, and the attempts of v1 stay as they were (FR-019, FR-021, US3)', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await storage.seed({ [LAB_KEY]: seededLab({ attempts: 4 }) });
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(SOLVED);
    await expect(lab.review()).toContainText(ATTEMPTS_LINE);
    expect(await storedRecord(storage)).toMatchObject({ attempts: 4, result: { attemptId: 101 } });
    await page.reload();
    await expect(lab.reviewHeading()).toHaveText(SOLVED);
    expect((await storedRecord(storage))?.result.attemptId).toBe(101);
  });

  test('a draft over 64 KiB is not sent and the lab says so (FR-002)', async ({
    shell,
    lab,
    compiler,
    storage,
    api,
  }) => {
    await storage.seed({ [LAB_KEY]: seededLab({ draft: '€'.repeat(21_846) }) });
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(shell.toast).toHaveText(
      'El taller admite programas de hasta 64 KB. Reducí el código antes de volver a ejecutar.',
    );
    expect(api.callsTo('POST /api/runs')).toHaveLength(0);
  });
});

test.describe('the preview with the template of the server (A4)', () => {
  test('shows the program of the server with zeros, and the copy copies it (FR-026, FR-030, US6)', async ({
    shell,
    lab,
    page,
  }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      (window as unknown as { __e2eCopied: string[] }).__e2eCopied = copied;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text: string) => void copied.push(text) },
      });
    });
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.programPreviewToggle().click();

    await expect(lab.programPreview()).toContainText(`${PREVIEW_MARKER}t1:{}`);
    await expect(lab.programPreview()).toContainText(`__TALLER_END__${'0'.repeat(32)}:3`);
    await expect(lab.programNote()).toContainText('que acá se muestra con ceros');
    const preview = await lab.programPreview().textContent();
    await lab.copyProgramButton().click();
    await expect(shell.toast).toHaveText('Código copiado. Incluye las pruebas.');
    const copied = await page.evaluate(() => (window as unknown as { __e2eCopied: string[] }).__e2eCopied);
    expect(copied).toEqual([preview]);
  });

  test('without the template the preview and the copy say so, and running still works (FR-029, US6-4)', async ({
    shell,
    lab,
    api,
    compiler,
    pageIssues,
  }) => {
    pageIssues.expectIssue(/status of 503/, 'el doble no tiene la plantilla');
    api.on('GET /api/harness', () => ({ status: 503, json: errorBody('server_error') }));
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.programPreviewToggle().click();

    await expect(lab.programNote()).toHaveText(
      'La vista previa no está disponible ahora: el taller todavía no mandó la plantilla del programa. Ejecutar y revisar sigue funcionando.',
    );
    await expect(lab.programPreview()).toBeHidden();
    await lab.copyProgramButton().click();
    await expect(shell.toast).toHaveText(
      'Todavía no se puede copiar el programa completo: falta la plantilla del taller.',
    );
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText(SOLVED);
  });

  test('the template is revalidated with If-None-Match after reloading (FR-029)', async ({
    shell,
    api,
    page,
  }) => {
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await expect.poll(() => api.callsTo('GET /api/harness').length).toBe(1);
    await expect.poll(() => storedHarnessEtag(page)).not.toBeNull();
    const etag = await storedHarnessEtag(page);

    await page.reload();

    await expect.poll(() => api.callsTo('GET /api/harness').length).toBe(2);
    expect(api.callsTo('GET /api/harness')[1].ifNoneMatch).toBe(etag);
  });
});

test.describe('without the Playground (A4, Q2)', () => {
  test('the guide, the notice under the button and the preview talk about the workshop (FR-033, US7-4)', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await expect(lab.executionGuide()).toContainText(
      'El taller compila tu programa en su propio entorno aislado y ejecuta los tres casos.',
    );
    await expect(lab.runDisclosure()).toHaveText(
      'Al ejecutar, tu código viaja al servidor del taller, que lo compila y lo ejecuta en un entorno aislado. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.',
    );
    await expect(lab.runDisclosure().getByRole('link')).toHaveCount(0);
    await expect(page.getByRole('main')).not.toContainText('Playground');
  });
});

test.describe('at 590 px (SC-009)', () => {
  test.use({ viewport: { width: 590, height: 900 } });

  test('the notices of the wait fit without a horizontal scroll', async ({ shell, lab, compiler, page }) => {
    await page.clock.install();
    await compiler.answerThrough(RUST_01, [{ status: 'queued', position: 12 }], 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.runLine()).toHaveText('En la fila del taller: sos el número 12.');

    await page.clock.fastForward(15_000);

    await expect(lab.delayNotice()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
    const box = await lab.delayNotice().boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(590);
  });
});
```

Si `qa/e2e/lib/urls` no exporta `exercise(id, phase)` con esa firma, usá la que tenga (F7a la usa así en `lab-run.spec.ts`).

**Paso 6.** `npm run typecheck`, `npm run build` y `E2E_PORT=4300 npm run test:e2e -- specs/lab-sandbox.spec.ts specs/lab-run.spec.ts specs/cycle.spec.ts specs/guards.spec.ts specs/lab-exercise.spec.ts`.

- **Lo esperado, en rojo:**
  - las que ejecutan fallan porque `lab.js` todavía pide a los Playgrounds (la red estricta los bloquea, y el texto o el `POST /api/runs` no llegan);
  - las de la vista previa y de los textos fallan por el texto viejo.
- **Lo esperado, en verde:** las dos guardas (`test.fail`).

Anotá el conteo en el informe de la tarea.

**Paso 7.** Commit, con la aprobación del usuario: `test(e2e): el laboratorio contra /api/runs: 20 E2E editadas con su aprobación y las de A4 (rojas, A4 FR-042)`. El cuerpo lista las 20 E2E editadas, archivo por archivo, y el motivo de cada grupo (research R14).
