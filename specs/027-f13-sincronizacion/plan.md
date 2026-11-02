# Implementation Plan: F13 · La sincronización en la interfaz

> **Estado (2026-11-02): plan completo, para revisión del usuario.** T001–T030, compuertas, cobertura, quickstart y tasks redactados. Las tres decisiones recomendadas se enumeran al final; ninguna tarea de implementación se ejecutó durante esta redacción.

**Branch**: `027-f13-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F13, con su clarify del 2026-10-28 (Q1 a Q5, todas A) y las lecturas L1 a L8. Decisiones y consultas: [research.md](./research.md). Lo que se dibuja de cada estado: [data-model.md](./data-model.md). Interfaces públicas: [contracts/sync-surfaces.md](./contracts/sync-surfaces.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). La interfaz que F13 consume es la de D1c: [contrato del cliente v2](../007-d1-progreso-sincronizacion/contracts/sync-client-d1c.md) y T020 de su plan (PR #93, `plan/d1c-cliente-v2` en `2e743c00`).

**Objetivo.** Que el alumno vea en todo momento si lo que hizo llegó a su cuenta, se entere de cada problema una sola vez y no pierda nada sin que se lo digan antes, sobre la mecánica de D1c.

**Arquitectura.** La capa `ui` de `features/progress-sync` traduce el estado de D1c a textos, avisos y toasts con funciones puras, y dibuja la franja y los dos diálogos que no se cierran. `app/shell` compone esas piezas con «pedir el ingreso» de F11a y con el shell de F10b (la línea en el pie, la franja entre la barra superior y `#main`, los vigías de los toasts y de `beforeunload`), y `pages/account` dibuja «Salir» con el puerto de D1c (la espera, la pregunta y la nota). Nada lee la red ni el almacenamiento: todo sale de `ProgressSync`.

**Stack.** TypeScript como ES modules; React 19.2.8 con `<dialog>` nativo; Zustand 5.0.15 (`useStore` y `zustand/vanilla`); Vitest 5.0.3 en los proyectos `node` y `dom`, con Testing Library 16.3.3, user-event 14.6.7 y fishery 2.4.0; Playwright 1.63.0 con el doble de la API de F11a. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», la sección 0 y la sección de tu unidad. `tasks.md` tiene una línea por tarea (T001 a T030) y remite acá.
> - **La base.** F13 se implementa sobre `master` con D1c (U2 a U5), F10b y F11a, más A3 y F8, que D1c ya exige. Cada firma que usa sale del contrato de D1c (PR #93), de los planes de F10b, F11a, A3 y F8 en `master` y del código de `impl-f11a` (`a7b3c71d`). **Nada de F13 corrió al planificar.** T001 contrasta cada firma con la base, y la «regla de adaptación» dice qué hacer si una difiere.
> - **La regla de adaptación.** Si un archivo de la base que F13 modifica (`Sidebar.tsx`, `Shell.tsx`, `AppRoot.tsx`, `start-taller.tsx`, `SignOutSection.tsx`, `api-double.ts`, los Page Objects) difiere del que cita este plan, se conserva el de la base y se le suman sólo las líneas de F13, con el mismo resultado. Cambia la forma, nunca el comportamiento.

## Summary

F13 dibuja lo que pasa en la mecánica de D1c. El enfoque, con sus razones en research.md:

- **Cada pieza en la capa que le toca (R1).** Lo que sólo usa el estado de D1c vive en `features/progress-sync/ui`. Lo que además necesita «pedir el ingreso» o el armado de `app/` vive en `app/shell`. «Salir» vive en `pages/account`, junto a lo que F11a dejó.
- **Funciones puras para todo lo que se decide (R2, R3 y R10).** La línea de cada estado, el orden de la franja, los formatos, la memoria de los toasts y la condición de la confirmación al cerrar son funciones con su spec de Vitest, con los esperados copiados a mano de la spec. Los componentes leen el estado con selectores chicos y derivan al dibujar.
- **Los toasts y `beforeunload` fuera de React (R3 y R4).** Dos vigías se suscriben al almacén de D1c desde `startTaller`: uno llama a `notify` una vez por transición, el otro pone y saca el oyente de `beforeunload` con `lostOnUnload`. Las recargas que el alumno eligió pasan por `reloadDocument()`, que las marca, y la guarda las deja pasar.
- **Diálogos nativos (R5 y R6).** El de cuenta distinta y «Cambiaste de cuenta» son `<dialog>` modales, con `role="alertdialog"`, que no se cierran con Esc y se reabren si algo los cierra. La pregunta al salir es un `<dialog>` dentro de «Tu cuenta» que corta el burbujeo simulado de React para no cerrarla.
- **La franja (R7).** Un contenedor `aria-live="polite"` sin rol, montado siempre y vacío sin ocupar lugar. Los avisos nunca mueven el foco; la confirmación del descarte, que pide el alumno, sí.
- **«Salir» (R9).** El puerto de D1c (`onPhase` y `choose`) da la espera y la pregunta. La nota depende del estado y del modo.
- **E2E con el doble de F11a (R12).** «Sin conexión» es un pedido abortado, el tiempo corre con `page.clock`, el desfase sale del `serverTime` y una fixture nueva comprueba SC-002 sobre toda la red sin editar un escenario.

## Technical Context

**Language/Version**: TypeScript 6.0.2 como ES modules en `frontend/src/` y `qa/`. Node 24, Vite 8.3.2, Vitest 5.0.3 y `@playwright/test` 1.63.0.

**Primary Dependencies**: ninguna nueva. Usa React 19.2.8, Zustand 5.0.15, el cliente y «pedir el ingreso» de F11a, el motor de D1c y el shell de F10b.

**Storage**: ninguno propio. F13 lee el estado de D1c y no escribe `localStorage` (FR-001).

**Testing**: Vitest en el proyecto `node` para las funciones puras (`*.spec.ts`) y en `dom` para los componentes (`*.spec.tsx`), con fishery para el estado de D1c; los E2E de Playwright contra el build servido, con el doble de la API de F11a y las respuestas de D1c. Los valores esperados se copian de las tablas de la spec, nunca del módulo que se prueba.

**Target Platform**: navegador moderno (ES2022), servido por Nginx; Linux y macOS.

**Project Type**: aplicación web, el front del taller. Cambio de comportamiento: superficies nuevas.

**Performance Goals**: ninguna nueva. `dist/index.html` bajo 1 500 000 caracteres, con su tamaño antes y después en el PR.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: 30 tareas en 7 unidades; unos 30 archivos nuevos (la mitad, specs) y unos 12 modificados.

## Restricciones globales

Valores exactos; ninguna tarea los cambia.

| Qué | Valor | Fuente |
| --- | --- | --- |
| Umbral del aviso del reloj | más de 120 000 ms en valor absoluto; 120 000 justos no avisan | FR-028; D1, FR-078 |
| Minutos del reloj | `Math.round(Math.abs(clockSkewMs) / 60000)`; positivo es «adelantado» | spec, «Los formatos»; contrato de D1c, §2 |
| Orden de la franja | pestaña vieja, sesión vencida, época, rechazos, reloj | spec, «Las superficies» |
| Textos | Los de la spec («Textos que lee el alumno»), con las formas singulares y `{cuándo}` de data-model.md §4 | spec; research, R10 |
| Mensaje de la pestaña vieja | `Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.` | `backend/api/lang/es/api.php:25` |
| La franja | `<div id="sync-notices" class="sync-notices" aria-live="polite">`, sin `role`, entre `#session-status` y `<main>` | FR-012 y FR-013 |
| Diálogos que no se cierran | `<dialog role="alertdialog" class="sync-dialog">` con `showModal()`, `cancel` cancelado y `close` que reabre | FR-019; Q4 |
| Confirmación al cerrar | oyente de `beforeunload` sólo con `lostOnUnload > 0`; nunca ante `reloadWasChosen()` | FR-035 a FR-037; Q3 |
| Estilos | Clases en la hoja del shell (`frontend/src/app/shell/shell.css`) o en `pages/account/ui/account.css`; ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` | FR-042; contrato de F10c |
| Tope de `dist/index.html` | `BOOT_SIZE_LIMIT` de `qa/build-check.ts`: 1 500 000 caracteres | FR-047; PR #76 |
| Red de E2E | La de T001, sin editar ningún escenario salvo el de la decisión 1 (`account.spec.ts`, la nota de F11a) | FR-046; SC-009 |
| Errores esperados en E2E | `pageIssues.expectIssue(/status of NNN/, …)` con el código exacto; un pedido abortado, `/net::ERR_FAILED/`; nunca `/Failed to load resource/` | TR-11; decisión del 2026-10-28 (noche) |
| El doble de la API | El de F11a con lo que suman A3 (`abort`, `contentVersion`) y D1c (`POST /api/sync` y `GET /api/progress` por omisión); F13 no trae `query` ni otro `replyTo` | decisión del 2026-10-28 (noche) |
| Stubs del rojo | `const` tipados; un componente, `FunctionComponent<Props>` que devuelve `null` | TR-2 |
| Comentarios | Ninguno por defecto; sólo una referencia puntual a un bug, una RFC o un ADR | `AGENTS.md` |
| Movimiento | Ninguna transición ni animación nueva; ningún indicador que gire | FR-041 |

## Constitution Check

| Principio | Cómo se cumple |
| --- | --- |
| I. `AGENTS.md` es la fuente | El plan sigue `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md`, el ADR 0008 y el contrato de F10c; las guías que cambian van en T029 |
| II. TDD y pruebas útiles | Cada tarea empieza con la spec que falla por el comportamiento; los esperados son literales de la spec; ningún mock confirma cómo está escrito el código (sólo se reemplazan `showModal`, `close`, la descarga y el `fetch`, que jsdom no tiene) |
| III. Código entendible | Funciones chicas con nombres del dominio; ningún componente reúne reglas, efectos y varias regiones: las reglas son puras y los dos vigías viven fuera de React |
| IV. IDs estables | F13 no toca contenido, IDs ni progreso |
| V. Capas y contratos | `ui` del slice de D1c, composición en `app/shell` y en `pages/account`; ningún slice importa otro de su capa; ninguna capa nueva (research, R1) |
| VI. Español y accesibilidad | Textos en español rioplatense; teclado, foco, 320 px y movimiento reducido con su prueba (FR-038 a FR-041) |
| VII. Secretos y salidas | Nada nuevo en Git |
| VIII. Flow-forward | La spec 027 sigue en curso: el plan no la edita; lo que la precisa va en research.md (R10 y R14) y en el informe |

## Decisiones ya tomadas que el plan aplica

| Decisión | Dónde |
| --- | --- |
| Q1-A: la línea en el pie y en «Tu cuenta», el toast y la franja; la barra superior no cambia | T014, T020, T012 |
| Q2-A: `#save-label` conserva sus dos textos; la línea de la cuenta va debajo | T014 |
| Q3-A: `beforeunload` sólo con la cola en memoria y cambios sin enviar | T007, T016 |
| Q4-A: sólo la cuenta distinta es modal; lo demás va en la franja, sin mover el foco | T010, T012 |
| Q5-A: la sesión vencida ofrece «Ingresar» en la franja; el acceso no se abre solo | T012, T015 |
| FR-068 de D1, reparto vigente (2026-10-29): D1c envía y limpia sin pasar `choose` ni `onPhase`; F13 dibuja todo y los pasa | T019, T020 |
| La red E2E con D1c (R19 de D1c): `StorageControl` traduce al espacio de la cuenta | T021, T024 a T027 (usan `seedRaw` y `rawSnapshot`) |
| Una regla nueva del shell va a la hoja del shell (contrato de F10c) | T017 |
| Sin Tailwind; si F13 entra después de F15a, sus briefs pasan a Tailwind | T017, T020 |
| El tope de 1 500 000 | T018, T030 |

## Project Structure

### Documentation (this feature)

```text
specs/027-f13-sincronizacion/
├── spec.md              # con su clarify (no se edita)
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── sync-surfaces.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

**Se crean:**

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `frontend/src/shared/lib/reload-document.spec.ts` | La marca de la recarga elegida | T002 |
| `frontend/src/features/progress-sync/ui/when-text.ts` (+ spec) | `{cuándo}` de la época | T003 |
| `frontend/src/features/progress-sync/ui/sync-copy.ts` (+ spec) | Todos los textos de F13, con sus plurales y sus modos | T003 |
| `frontend/src/features/progress-sync/ui/account-line.ts` (+ spec) | El texto y la familia de cada estado | T004 |
| `frontend/src/features/progress-sync/ui/sync-state.factory.ts` | El estado de D1c armado con fishery, para las specs | T005 |
| `frontend/src/features/progress-sync/ui/sync-notices.ts` (+ spec) | Los avisos activos, en orden | T005 |
| `frontend/src/features/progress-sync/ui/sync-toasts.ts` (+ spec) | La memoria de los toasts y su vigía | T006 |
| `frontend/src/features/progress-sync/ui/unload-guard.ts` (+ spec) | La guarda de `beforeunload` | T007 |
| `frontend/src/features/progress-sync/ui/unsent-download.ts` (+ spec `.tsx`) | Bajar el archivo de D1c | T008 |
| `frontend/src/features/progress-sync/ui/useSyncSnapshot.ts` (+ spec `.tsx`) | Leer un dato del estado con o sin motor | T008 |
| `frontend/src/features/progress-sync/ui/sync-surfaces.fixture.ts` | El motor falso, los diálogos y la descarga de las specs | T008 |
| `frontend/src/features/progress-sync/ui/BlockingDialog.tsx` | El diálogo modal que no se cierra | T010 |
| `frontend/src/features/progress-sync/ui/AccountMismatchDialog.tsx` (+ spec) | El diálogo de cuenta distinta | T010 |
| `frontend/src/features/progress-sync/ui/AccountChangedDialog.tsx` (+ spec) | «Cambiaste de cuenta» | T010 |
| `frontend/src/features/progress-sync/ui/SyncNoticeItem.tsx` | Un aviso: su texto y sus botones | T011 |
| `frontend/src/features/progress-sync/ui/EpochNotice.tsx` (+ spec) | El aviso de la época, con su confirmación | T011 |
| `frontend/src/features/progress-sync/ui/SyncNoticeStrip.tsx` (+ spec) | La franja | T012 |
| `frontend/src/app/shell/Sidebar.sync.spec.tsx` | La línea de la cuenta en el pie | T014 |
| `frontend/src/app/shell/SyncNotices.tsx` (+ spec) | La franja con «Ingresar» y «Cambiaste de cuenta» | T015 |
| `frontend/src/app/shell/sync-watchers.ts` (+ spec `.tsx`) | Los dos vigías | T016 |
| `frontend/src/pages/account/ui/useSignOutQuestion.ts` (+ spec `.tsx`) | La pregunta como promesa | T019 |
| `frontend/src/pages/account/ui/SignOutQuestion.tsx` (+ spec) | La pregunta al salir | T019 |
| `frontend/src/pages/account/ui/sign-out-section.sync.spec.tsx` | «Salir» con D1c | T020 |
| `qa/e2e/lib/sync-replies.ts` | Las respuestas de la sincronización para los E2E | T021 |
| `qa/e2e/specs/sync-sign-out.spec.ts` | E2E de US2 y de «Tu progreso» | T021 |
| `qa/e2e/lib/quiet-sync.ts` y `qa/e2e/specs/sync-fixture.spec.ts` | Observación continua de silencio y sus pruebas | T023 |
| `qa/e2e/lib/unload-dialogs.ts` | Contar los diálogos `beforeunload` | T023 |
| `qa/e2e/specs/sync-status.spec.ts` | E2E de US1, US7 y SC-008 | T024 |
| `qa/e2e/specs/sync-account-mismatch.spec.ts` | E2E de US3 | T025 |
| `qa/e2e/specs/sync-notices.spec.ts` | E2E de US4 y US6 | T026 |
| `qa/e2e/specs/sync-unload.spec.ts` | E2E de US5 | T027 |

**Se modifican:**

| Archivo | Qué cambia | Tarea |
| --- | --- | --- |
| `frontend/src/shared/lib/reload-document.ts` (F11a) | `reloadWasChosen()` y la marca | T002 |
| `frontend/src/features/progress-sync/index.ts` (D1c) | La API de la capa `ui` (contrato, §1) | T008, T010, T012 |
| `frontend/src/app/shell/Sidebar.tsx` (F10b) | La prop `accountLine` y la línea | T014 |
| `frontend/src/app/shell/Shell.tsx` (F10b) | La línea desde el motor y `<SyncNotices>` | T017 |
| `frontend/src/app/root/AppRoot.tsx` (F10b) | Los proveedores, si faltan, y `<AccountMismatchDialog>` | T017 |
| `frontend/src/app/boot/start-taller.tsx` (F10b) | `startSyncWatchers` | T017 |
| `frontend/src/app/shell/shell.css` (F10c) | La línea, la franja y los diálogos de cuenta | T017 |
| `frontend/src/pages/account/ui/SignOutSection.tsx` (F11a, A3 y D1c) | La espera, la pregunta, la nota y «Tu progreso» | T020 |
| `frontend/src/pages/account/ui/account.css` (F11a) | «Tu progreso» y las opciones de la pregunta | T020 |
| `qa/e2e/pages/account.ts` (F11a) | La pregunta y «Tu progreso» | T021 |
| `qa/e2e/specs/account.spec.ts` (F11a) | La constante `NOTE`, con la decisión 1 | T021 |
| `qa/e2e/fixtures/api-double.ts` (F11a, A3 y D1c) | `upToDateSync` delega en `syncReply` | T023 |
| `qa/e2e/pages/shell.ts` y `qa/e2e/pages/access.ts` | La línea, la franja, los diálogos y el ingreso dentro del diálogo | T023 |
| `qa/e2e/fixtures/index.ts` | La opción `syncNotices` y la fixture `quietSync` | T023 |
| `docs/architecture.md` y `qa/AGENTS.md` | La capa `ui` del slice, las superficies, sus specs y la fixture | T029 |

## Review Focus

Cinco entradas o fallas que la spec implica y que ninguna prueba de una tarea ejercitaría sin esta lista. Cada una tiene su prueba, ya agregada a la tarea dueña.

1. **Cerrar la pregunta al salir cierra «Tu cuenta»** (US2, escenario 5: «el diálogo se cierra, el foco vuelve a "Salir"… y la sesión sigue»). La pregunta es un `<dialog>` dentro del de «Tu cuenta», y React junta los `onClose` de los ancestros aunque el evento nativo no burbujee. **Prueba:** «closing the question does not close the dialog around it», en `SignOutQuestion.spec.tsx` (T019).
2. **Esc cierra igual el diálogo de cuenta distinta** cuando Chrome no deja cancelar `cancel` sin una activación del usuario (FR-019). **Pruebas:** «a close from outside opens it again», en `AccountMismatchDialog.spec.tsx` (T010), y el E2E con dos Esc seguidos (T025).
3. **Una recarga elegida pide la confirmación del navegador** con la cola en memoria: «Salir sin enviarlos», «Recargar» del diálogo y «Seguir» de «Cambiaste de cuenta» (FR-037, SC-005). **Pruebas:** «lets a reload the student chose go without asking», en `unload-guard.spec.ts` (T007); los E2E con el almacenamiento bloqueado de T021, T025 y T026, que cuentan 0 diálogos.
4. **El toast de la vuelta se pierde** si el episodio pasa por `pending` (una cola de más de 200 operaciones) o si el cambio se hizo con el estado ya en `offline` desde una cola vacía (FR-010). **Prueba:** «owes the announcement across pending, and for a change made while offline», en `sync-toasts.spec.ts` (T006).
5. **«Hoy» y «ayer» se calculan en UTC** y una época borrada a las 23:30 de Buenos Aires dice «hoy» al día siguiente (spec, «Los formatos»). **Prueba:** «counts days by the local calendar, not by UTC», en `when-text.spec.ts` (T003).

Además, **SC-002 sobre toda la red** (0 avisos y 0 diálogos de F13 en los E2E existentes) no se puede afirmar sin editar escenarios: lo afirma la fixture automática `quietSync` (T023), que observa cada documento durante toda la prueba y conserva los eventos al recargar, no sólo el DOM del final.

## Unidades, dueños y orden

| Unidad | Tareas | Dueño | Qué entrega | Compuerta |
| --- | --- | --- | --- | --- |
| U0 | T001 | K (coordinador) | La línea base y las detecciones | — |
| U1 | T002 a T009 | M (modelo) | Las funciones puras, la marca de la recarga, el hook y el fixture | T009 |
| U2 | T010 a T013 | C (componentes) | Los dos diálogos, el aviso de la época y la franja | T013 |
| U3 | T014 a T018 | S (shell) y K | La línea en el pie, la franja en el shell, los vigías, el diálogo en la raíz y los estilos | T018 |
| U4 | T019 a T022 | A («Tu cuenta») | «Salir»: la espera, la pregunta, la nota, «Tu progreso» y sus E2E | T022 |
| U5 | T023 a T028 | Q (red) | El doble, los Page Objects, la fixture de SC-002 y los E2E | T028 |
| U6 | T029 y T030 | K | La documentación y el cierre | — |

**El orden.** U1 primero. U2 y U4 pueden correr a la vez después de U1 (archivos disjuntos). U3 espera a U2 y a F10b. U5 espera a U3 y a U4. Un PR por unidad, contra la rama base de F13.

**La entrada en servicio y la nota de FR-052 (research, R13; decisión 2 de este plan).**
- **U1 y U4** no dependen de F10b. Van apiladas en este orden: D1c U3 → U4 → U5 → F13 U1 → U4 → F11d U9 → U10, sin publicar estados intermedios. Conserva el orden relativo de los planes mergeados #93 y #97; ninguna versión publicada conserva la nota falsa de F11a.
- **U2, U3 y U5** esperan a F10b. Si F10b ya está en `master` cuando sale el tren de D1c, F13 entra entera en ese tren.

**Paralelismo.** T003, T004 y T005 pueden avanzar en paralelo; T006 espera T003/T005 y T007 espera T005. T010 y T011 pueden correr en paralelo después de U1; T019 puede hacerlo en el carril de U4. Las ampliaciones de index.ts las integra K de a una. `main.tsx`, `package.json`, las configuraciones y la documentación los integra K; T017, que toca la raíz y el arranque, también es de K.

## Reglas para todos los agentes

- **TDD.** Cada tarea empieza por la spec que falla. Escribí los stubs del rojo como `const` tipados (TR-2): `export const accountLine: (status: SyncStatus | null) => AccountLine | null = () => { throw new Error('not implemented'); };`; un componente, como `const X: FunctionComponent<Props> = () => null;`. Corré la spec, mirá que falle por el comportamiento y no por un import, implementá, corré en verde.
- **Los esperados** son literales copiados de la spec y de data-model.md. Nunca se importa una constante de `sync-copy.ts` en una spec para compararla consigo misma.
- **Comentarios:** ninguno por defecto. Las etiquetas de ruta de los contratos no se copian al código; sólo se admite una referencia puntual a un bug, una RFC o un ADR. Las excepciones locales de lint justificadas por foco se revisan en su línea.
- **Specs:** las funciones puras en `*.spec.ts` (proyecto `node`); los componentes y lo que toca `window`, en `*.spec.tsx` (proyecto `dom`). Importá `describe`, `it`, `expect` y `vi` de `vitest`.
- **Checks por tarea:** `npx --no-install vitest run --config frontend/vitest.config.ts` con los archivos de la tarea, `npm run typecheck`, `npx --no-install eslint` y `npx --no-install prettier --check` con esos mismos archivos. Antes de cada commit, `git diff --check`.
- **Commits:** en español con prefijo Angular (`feat(progress-sync): …`, `test(e2e): …`), sin trailers de coautoría. Los títulos y descripciones de PR van en inglés.
- **E2E:** Page Objects con nombres accesibles; cada error de consola esperado con `expectIssue`. Para detectar recargas, `observeReload` de `qa/e2e/lib/document-marker.ts` (TR-7).
- **No toques** los E2E existentes, salvo la constante de la decisión 1 en su propio commit, ni archivos de D1c fuera de `index.ts` del slice y del método `upToDateSync` del doble.

## 0. Línea base y compuerta de cada unidad (K)

### Tarea T001 · La línea base y las detecciones

**Archivos:** ninguno se modifica. El resultado va a la descripción del PR de U0.

**Pasos:**

1. **La base.** La rama de F13 sale de `master` con D1c (U2 a U5), F10b y F11a; o de la cadena de PR apilados del tren de D1c para U1 y U4 (research, R13).
2. **Las detecciones** (cada una con su comando; si una falla, se detiene la unidad que la necesita y se informa):

| # | Qué | Comando | Si no está |
| --- | --- | --- | --- |
| D1 | D1c U2: el estado y las acciones | `git grep -n "export interface ProgressSyncState\|export interface ProgressSync " -- frontend/src/features/progress-sync/model/types.ts` | F13 espera |
| D2 | D1c U2: el contexto y el índice | `git grep -n "useProgressSync\|ProgressSyncContext" -- frontend/src/features/progress-sync/index.ts` | F13 espera |
| D3 | D1c U3: el motor único | `git grep -n "export function appProgressSync" -- frontend/src/app/progress-sync/app-progress-sync.ts` | U3 y U5 esperan |
| D4 | D1c U4: el puerto de «Salir» | `git grep -n "SignOutPhase\|useSignOutProgress\|ChooseAfterLeftover" -- frontend/src/features/sign-in/index.ts` y `git grep -n "useSignOutProgress" -- frontend/src/pages/account/ui/SignOutSection.tsx` | U4 espera |
| D5 | D1c U5: el doble y la traducción | `git grep -n "upToDateSync\|EMPTY_AREAS" -- qa/e2e/fixtures/api-double.ts qa/e2e/lib/api-contract.ts` y `git grep -n "rawSnapshot\|seedRaw" -- qa/e2e/fixtures/storage-control.ts` | Los E2E de U4 y U5 esperan |
| D6 | Los mensajes de la sincronización en los E2E | `git grep -n "client_outdated\|epoch_mismatch" -- qa/e2e/lib/api-contract.ts` | T021 los suma a `MESSAGES`, copiados de `backend/api/lang/es/api.php:24-25` |
| D7 | F10b: la raíz, el shell, la barra lateral y el arranque | `git grep -n "const AppRoot\|const Shell \|const Sidebar\|export function startTaller" -- frontend/src/app` | U3 espera |
| D8 | El proveedor del motor en la raíz | `git grep -n "ProgressSyncContext\|SignOutProgressContext" -- frontend/src/app/root/AppRoot.tsx` | T017 los suma |
| D9 | F10c: la hoja del shell y los tokens | `ls frontend/src/app/shell/shell.css` y `git grep -n -e "--color-recommended" -e "--spacing-gutter" -- frontend/styles.css` | T017 y T020 usan la tabla de equivalencias |
| D10 | A3: `abort` en el doble | `git grep -n "abort?: boolean" -- qa/e2e/fixtures/api-double.ts` | T021 lo suma con la forma del plan de A3 (`specs/016-a3-contenido-api/plan.md:4505` y `:4540`) |
| D11 | F11a: `reauthenticate`, `requestSignIn` y `reloadDocument` | `git grep -n "reauthenticate\|requestSignIn" -- frontend/src/features/sign-in/index.ts` y `git grep -n "export function reloadDocument" -- frontend/src/shared/lib/reload-document.ts` | F13 espera |
| D12 | F8: «Borrar todo» en el Page Object | `git grep -n "resetEverything" -- qa/e2e/pages/method.ts` | El E2E del borrado propio sale de T026 y lo cubre Vitest (`ownReset`, T005); se anota en el PR |
| D13 | La descarga de `shared/lib` | `git grep -n "export function downloadBlob" -- frontend/src/shared/lib/download-file.ts` | T008 usa el nombre de la base |
| D14 | Nadie en `qa/` ni `tools/` importa el índice del slice | `git grep -n -e "features/progress-sync'" -e "features/progress-sync/index" -- qa tools` | Se detiene: el índice pasa a reexportar componentes `.tsx`, que Node no carga |
| D15 | El E2E de F11a que fija la nota de FR-052 | `git grep -n "queda acá aunque salgas" -- qa/e2e/specs` | Lista para la decisión 1 |
| D16 | El E2E de F11a «the progress of the browser stays» | `git grep -n "the progress of the browser stays" -- qa/e2e/specs/account.spec.ts` | Si sigue y falla con D1c, es del inventario de D1c (su T001 y T024): se informa, F13 no lo edita |
| D18 | Escenarios previos con fallos deliberados de sincronización | `git grep -n "account_mismatch\|epoch_mismatch\|POST /api/sync" -- qa/e2e/specs` | T023 registra títulos completos y motivos de excepciones a quietSync; no excluye archivos enteros |
| D17 | F11d | `git grep -n "enterSharedMode" -- frontend/src/pages` | Sin efecto: el modo compartido se prueba con el almacenamiento bloqueado |

3. **Las cuentas:** `npm test` (checks y pruebas de Vitest), `npm run lint` (0 errores; revisar avisos), `npm run build`, el tamaño de `dist/index.html` contra `BOOT_SIZE_LIMIT` (1 500 000) y `npm run test:e2e` (la cantidad de escenarios). Son los esperados de las compuertas.
4. **El commit:** ninguno. U0 deja un informe local con las cuentas y detecciones, que se incorpora a la descripción del primer PR de implementación; no se abre un PR vacío.

### La compuerta de cada unidad (T009, T013, T018, T022 y T028)

Cada compuerta corre, en este orden, y anota el resultado en la descripción del PR de la unidad:

```sh
npm run test:unit
npm test
npm run lint
npm run format:check
node qa/seams-guard-check.ts
git diff --check
```

U3, U4, U5 y U6 suman `npm run build` y el tamaño de `dist/index.html` (bajo 1 500 000); U4, U5 y U6 suman `npm run test:e2e`. U4 puede preceder U3; las compuertas se aplican por unidad, no por orden numérico. La compuerta falla si una cuenta de T001 baja sin una razón escrita en este plan, si aparece un aviso de complejidad nuevo o si un E2E existente cambió fuera de NOTE en T021. Los E2E usan el puerto y semáforo del coordinador si la implementación comparte máquina; este carril documental no ejecuta E2E ni Docker.

## 1. U1 · Textos, transiciones y puertos de lectura

Esta unidad consume D1c U2 y F11a. No monta superficies ni depende de F10b. Los bloques de prueba de cada tarea se agregan al archivo indicado; importá las funciones del archivo de producción vecino, los tipos del contrato D1c y las utilidades de Vitest. Los fixtures compartidos se definen en T005 y T008; no son módulos de producción ni se reexportan desde el índice.

### Tarea T002 · Marcar la recarga elegida

**Archivos:** modificar `frontend/src/shared/lib/reload-document.ts`; crear `frontend/src/shared/lib/reload-document.spec.ts`.

**Interfaces:** consume `window.location.reload(): void`; conserva `reloadDocument(): void` y produce `reloadWasChosen(): boolean`. La marca dura un documento; no se guarda en almacenamiento.

1. **Rojo:** agregá esta prueba en el proyecto `node`:

   ```ts
   it('marks the choice before navigation starts', async () => {
     vi.resetModules();
     const module = await import('./reload-document');
     const choices: boolean[] = [];
     vi.stubGlobal('window', {location: {reload: () => choices.push(module.reloadWasChosen())}});
     try {
       expect(module.reloadWasChosen()).toBe(false);
       module.reloadDocument();
       expect(choices).toEqual([true]);
       expect(module.reloadWasChosen()).toBe(true);
     } finally {
       vi.unstubAllGlobals();
     }
   });
   ```

2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts reload-document.spec.ts`. Con un stub tipado de `reloadWasChosen` que devuelve `false`, falla `[false]` frente a `[true]`, no por importar.
3. **Verde:** guardá `let chosen = false` en el módulo; `reloadWasChosen` lo devuelve; `reloadDocument` asigna `true` antes de `window.location.reload()`. No marques enlaces ni una recarga manual.
4. Repetí la prueba; corré los checks por tarea. Revisá que todos los llamadores existentes conservan la firma.
5. Commit: `feat(progress-sync): marcar las recargas elegidas`.

### Tarea T003 · Copia y fechas locales

**Archivos:** crear `frontend/src/features/progress-sync/ui/when-text.ts`, `when-text.spec.ts`, `sync-copy.ts` y `sync-copy.spec.ts`.

**Interfaces:** consume `StorageMode` y `EpochChange`; produce `whenText(resetAt: string | null, now?: Date, timeZone?: string): string`, `inMemory(mode: StorageMode): boolean`, `signOutNote(mode: StorageMode | null): string`, `questionText(count: number, reason: string): string`, `offlineText(mode: StorageMode): string`, `errorText(mode: StorageMode): string`, `sessionExpiredText(mode: StorageMode): string`, `reloadLossText(count: number): string`, `epochText(change: EpochChange, now?: Date): string`, `discardCopyText(count: number): string`, `rejectedText(count: number): string`, `clockText(skew: number): string`, `mismatchLossText(count: number): string`, `changedAccountText(count: number): string` y `SIGN_OUT_TEXTS` del contrato. Constantes internas `OUTDATED_TEXT`, `MISMATCH_TITLE`, `MISMATCH_TEXT`, `MISMATCH_BROWSER_TEXT` y `CHANGED_TITLE`: los textos literales de la spec, «Textos que lee el alumno».

1. **Rojo, fechas:** probá el calendario local, sin cambiar el huso de la máquina:

   ```ts
   it('counts days by the local calendar, not by UTC', () => {
     const now = new Date('2026-10-29T03:15:00Z');
     expect(whenText('2026-10-29T02:30:00Z', now, 'America/Argentina/Buenos_Aires'))
       .toBe('ayer a las 23:30');
     expect(whenText('2026-10-29T03:05:00Z', now, 'America/Argentina/Buenos_Aires'))
       .toBe('hoy a las 0:05');
     expect(whenText('2026-10-28T04:05:00Z', now, 'America/Argentina/Buenos_Aires'))
       .toBe('ayer a la 1:05');
     expect(whenText('2026-10-03T17:32:00Z', now, 'America/Argentina/Buenos_Aires'))
       .toBe('el 3 de octubre a las 14:32');
     expect(whenText('2026-01-01T02:59:00Z', now, 'America/Argentina/Buenos_Aires'))
       .toBe('el 31 de diciembre de 2025 a las 23:59');
     expect(whenText(null, now)).toBe('');
   });
   ```

2. **Rojo, copia:** fijá los valores, sin importar constantes esperadas:

   ```ts
   it('writes the singular and the memory warning explicitly', () => {
     expect(reloadLossText(1)).toBe('Al recargar se pierde 1 cambio que no se envió.');
     expect(reloadLossText(2)).toBe('Al recargar se pierden 2 cambios que no se enviaron.');
     expect(discardCopyText(1)).toBe('¿Descartar la copia? Ese cambio no se puede recuperar.');
     expect(questionText(2, 'offline')).toBe('2 cambios no se pudieron enviar: no hay conexión con el taller.');
     expect(questionText(1, 'signed-out')).toBe('1 cambio no se pudo enviar: tu sesión venció.');
     expect(questionText(2, 'outdated')).toBe('2 cambios no se pudieron enviar: el taller no responde.');
     expect(signOutNote('blocked')).toBe('Al salir, enviamos tus cambios a tu cuenta. En este navegador no queda nada guardado.');
     expect(clockText(-150000)).toBe('El reloj de este dispositivo está 3 minutos atrasado. Tus cambios se guardan igual, pero pueden perder contra los de otro dispositivo. Corregí la fecha y la hora del dispositivo.');
   });
   ```

   Agregá una fila literal por cada texto de la spec: `browser`, `shared` y `blocked` para los toasts, la sesión y la nota; 1 y 2 para las cinco frases con cantidad; `null` para la nota anterior a D1c; `±150000` para el reloj. `epochText` sin fecha no agrega «el» ni dos espacios. Para `reason` desconocido, `error` y `account-changed`, el motivo es «el taller no responde».
3. Corré `npx --no-install vitest run --config frontend/vitest.config.ts when-text.spec.ts sync-copy.spec.ts`; los stubs vacíos fallan por texto.
4. **Verde:** para la fecha usá `Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'}).formatToParts`. Compará días con `Date.UTC(year, month - 1, day)`, calculados desde las partes locales; no restes 24 horas a la fecha real (cambio de horario). Los meses son `enero` a `diciembre`. Uní `hoy`, `ayer` o `el D de MES [de AAAA]` y la hora sin cero inicial, con minutos de dos cifras. `timeZone` omitido usa la zona local. Copiá las frases completas de la spec y los singulares de data-model.md §4; no compongas plurales con sustituciones sobre frases.
5. Repetí ambos archivos y checks; commit `feat(progress-sync): fijar los textos y las fechas de los avisos`.

### Tarea T004 · Las seis líneas y sus familias

**Archivos:** crear `frontend/src/features/progress-sync/ui/account-line.ts` y `account-line.spec.ts`.

**Interfaces:** consume `SyncStatus`; produce `AccountFamily`, `AccountLine` y `accountLine(status: SyncStatus | null): AccountLine | null` del contrato §1.

1. **Rojo:**

   ```ts
   it.each([
     ['synced', 'Sincronizado con tu cuenta', 'synced'],
     ['pending', 'Enviando a tu cuenta…', 'pending'],
     ['offline', 'Sin conexión con el taller', 'problem'],
     ['error', 'No pudimos sincronizar', 'problem'],
     ['signed-out', 'Sesión vencida', 'problem'],
     ['outdated', 'Pestaña vieja', 'problem'],
   ] as const)('draws %s literally', (status, text, family) => {
     expect(accountLine(status)).toEqual({text, family});
   });
   it('draws nothing before the first report', () => {
     expect(accountLine(null)).toBeNull();
   });
   ```

2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts account-line.spec.ts`; el stub `null` falla en seis filas.
3. **Verde:** tabla `Record<SyncStatus, AccountLine>` con esas seis filas y retorno `null` explícito antes del primer estado. Sin efectos, red ni almacenamiento.
4. Repetí y checks; commit `feat(progress-sync): traducir el estado de la cuenta`.

### Tarea T005 · Avisos activos y fixture del estado

**Archivos:** crear `frontend/src/features/progress-sync/ui/sync-state.factory.ts`, `sync-notices.ts` y `sync-notices.spec.ts`.

**Interfaces:** `syncStateFactory: Factory<ProgressSyncState>`; `NoticeKind = 'outdated' | 'signed-out' | 'epoch' | 'rejected' | 'clock'`; `NoticeInput` con `status`, `epochChange`, `rejectedCount`, `clockSkewMs` y `clockDismissed: boolean`; `activeNotices(input: NoticeInput): readonly NoticeKind[]`. El tipo de cada campo viene de `ProgressSyncState`.

1. Creá la factory de pruebas, sin estado compartido entre casos:

   ```ts
   export const syncStateFactory = Factory.define<ProgressSyncState>(() => ({
     status: null, mode: 'browser', unsentCount: 0, lostOnUnload: 0,
     clockSkewMs: null, rejectedCount: 0, accountMismatch: null,
     epochChange: null, importQuestion: null, lastImport: null,
     importNotice: null, busy: null,
   }));
   ```

2. **Rojo:**

   ```ts
   it('orders independent notices and ignores an own reset', () => {
     const state = syncStateFactory.build({status: 'outdated', rejectedCount: 2,
       clockSkewMs: 150000, epochChange: {resetAt: null, ownReset: false, copy: null}});
     expect(activeNotices({...state, clockDismissed: false}))
       .toEqual(['outdated', 'epoch', 'rejected', 'clock']);
     expect(activeNotices({...state, status: 'signed-out', clockDismissed: false}))
       .toEqual(['signed-out', 'epoch', 'rejected', 'clock']);
     expect(activeNotices({...state, status: 'synced', rejectedCount: 0,
       epochChange: {...state.epochChange!, ownReset: true}, clockDismissed: true}))
       .toEqual([]);
   });
   it.each([null, 0, 120000, -120000, 60000])('does not warn at %s', clockSkewMs => {
     expect(activeNotices({...syncStateFactory.build({clockSkewMs}), clockDismissed: false})).toEqual([]);
   });
   it.each([150000, -150000])('warns above the limit at %s', clockSkewMs => {
     expect(activeNotices({...syncStateFactory.build({clockSkewMs}), clockDismissed: false})).toEqual(['clock']);
   });
   ```

3. Corré `npx --no-install vitest run --config frontend/vitest.config.ts sync-notices.spec.ts`; el stub `[]` falla.
4. **Verde:** acumulá los tipos en el orden escrito, con condiciones explícitas; el reloj usa `Math.abs(...) > 120000`. No toma `mode`, no modifica la época y no admite dos estados mutuamente excluyentes. SC-007 se contrasta por ambos máximos realizables; no se inventa un estado imposible de cinco avisos.
5. Repetí y checks; commit `feat(progress-sync): ordenar los avisos activos`.

### Tarea T006 · Toasts por episodio, fuera de React

**Archivos:** crear `frontend/src/features/progress-sync/ui/sync-toasts.ts` y `sync-toasts.spec.ts`.

**Interfaces:** consume `StoreApi<ProgressSyncState>`, `offlineText` y `errorText`; produce `watchSyncToasts(store, notify): () => void`. La función procesa el estado inicial como observado, sin toast inicial, y devuelve la desuscripción.

1. **Rojo:** usá `createStore<ProgressSyncState>(() => syncStateFactory.build())` de Zustand vanilla:

   ```ts
   it('owes the announcement across pending, and for a change made while offline', () => {
     const state = createStore<ProgressSyncState>(() => syncStateFactory.build());
     const notify = vi.fn();
     const stop = watchSyncToasts(state, notify);
     state.setState({status: 'offline'});
     expect(notify).not.toHaveBeenCalled();
     state.setState({unsentCount: 2});
     state.setState({status: 'pending'});
     state.setState({unsentCount: 0});
     state.setState({status: 'synced'});
     expect(notify.mock.calls).toEqual([['Listo: tus cambios llegaron a tu cuenta.']]);
     stop();
     state.setState({status: 'error'});
     expect(notify).toHaveBeenCalledTimes(1);
   });
   it('announces a failure only on entry from a healthy state', () => {
     const state = createStore<ProgressSyncState>(() => syncStateFactory.build({status: 'synced'}));
     const notify = vi.fn();
     const stop = watchSyncToasts(state, notify);
     state.setState({status: 'offline'});
     state.setState({status: 'offline'});
     state.setState({rejectedCount: 1});
     expect(notify.mock.calls).toEqual([['Sin conexión con el taller. Tus cambios quedan en este navegador y se envían cuando vuelva.']]);
     state.setState({status: 'synced'});
     expect(notify).toHaveBeenCalledTimes(1);
     stop();
   });
   ```

   Sumá `pending → error → error → pending → synced` con `unsentCount: 201`, luego 1, luego 0: exactamente un error y una vuelta. `signed-out` con cola también debe la vuelta, sin toast de entrada. Repetí ambos fallos con `shared` y `blocked`: los esperados son las frases de memoria, completas. Un cambio de modo solo no anuncia.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts sync-toasts.spec.ts`; el vigía sin suscripción falla.
3. **Verde:** mantené `{status, owed}` en el closure. Primero acumulá deuda si el estado es problemático y tiene cola; aun si `status` no cambia. Conservá deuda al pasar por `pending`, y consumila una sola vez al llegar a `synced`. Actualizá memoria antes de llamar a `notify`, para tolerar una notificación que cause otro cambio. Los estados iniciales no notifican. Usá las condiciones de data-model.md §3.
4. Repetí y checks; commit `feat(progress-sync): anunciar una vez cada episodio de sincronización`.

### Tarea T007 · Guarda condicional del documento

**Archivos:** crear `frontend/src/features/progress-sync/ui/unload-guard.ts` y `unload-guard.spec.ts`.

**Interfaces:** `watchUnloadGuard(store: StoreApi<ProgressSyncState>, target: EventTarget, reloadWasChosen: () => boolean): () => void`. Consume `lostOnUnload`, que D1c ya calcula incluyendo la copia de época.

1. **Rojo:**

   ```ts
   it('attaches only while something can be lost and cleans up', () => {
     const state = createStore<ProgressSyncState>(() => syncStateFactory.build());
     const target = new EventTarget();
     const add = vi.spyOn(target, 'addEventListener');
     const remove = vi.spyOn(target, 'removeEventListener');
     const stop = watchUnloadGuard(state, target, () => false);
     expect(add).not.toHaveBeenCalled();
     state.setState({mode: 'blocked', lostOnUnload: 2});
     state.setState({lostOnUnload: 1});
     expect(add).toHaveBeenCalledTimes(1);
     const event = new Event('beforeunload', {cancelable: true});
     target.dispatchEvent(event);
     expect(event.defaultPrevented).toBe(true);
     state.setState({lostOnUnload: 0});
     expect(remove).toHaveBeenCalledTimes(1);
     stop();
     state.setState({lostOnUnload: 3});
     expect(add).toHaveBeenCalledTimes(1);
   });
   it('lets a reload the student chose go without asking', () => {
     const state = createStore<ProgressSyncState>(() => syncStateFactory.build({mode: 'shared', lostOnUnload: 2}));
     const target = new EventTarget();
     const stop = watchUnloadGuard(state, target, () => true);
     const event = new Event('beforeunload', {cancelable: true});
     target.dispatchEvent(event);
     expect(event.defaultPrevented).toBe(false);
     stop();
   });
   ```

2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts unload-guard.spec.ts`. El stub sin listener falla por `defaultPrevented` y cantidad de listeners.
3. **Verde:** sincronizá una vez con `getState()`, y luego con `subscribe`. Un solo listener llama a `preventDefault()` si la recarga no fue elegida. Registrá sólo los cruces entre cero y positivo; el cleanup desuscribe y retira el listener si estaba. No escribas `returnValue`, ni uses `mode` para recalcular la pérdida.
4. Sumá el caso de cola 0 y copia de época en memoria (`lostOnUnload: 1`): pregunta. Repetí y checks; commit `feat(progress-sync): preguntar al cerrar sólo si se pierden cambios`.

### Tarea T008 · Leer el motor y descargar su archivo

**Archivos:** crear `frontend/src/features/progress-sync/ui/useSyncSnapshot.ts`, `useSyncSnapshot.spec.tsx`, `unsent-download.ts`, `unsent-download.spec.tsx` y `sync-surfaces.fixture.ts`; ampliar `features/progress-sync/index.ts` con la API de U1.

**Interfaces:** las firmas del contrato §1. Fixture de pruebas `fakeSync(overrides?: Partial<ProgressSyncState>): ProgressSync`, con store real y acciones `vi.fn`; `stubDialogs(): () => void`, que devuelve la restauración. Importá `downloadBlob(blob: Blob, filename: string): void` de `shared/lib/download-file`.

1. **Rojo:**

   ```tsx
   it('follows the selected value and supports a missing engine', () => {
     const sync = fakeSync({status: 'synced'});
     const view = renderHook(({engine}: {engine: ProgressSync | null}) =>
       useSyncSnapshot(engine, state => state.status, null),
       {initialProps: {engine: sync as ProgressSync | null}});
     expect(view.result.current).toBe('synced');
     act(() => sync.state.setState({status: 'offline'}));
     expect(view.result.current).toBe('offline');
     view.rerender({engine: null});
     expect(view.result.current).toBeNull();
     act(() => sync.state.setState({status: 'error'}));
     expect(view.result.current).toBeNull();
     view.unmount();
   });
   ```

   Para descargar, mockeá únicamente `downloadBlob` y verificá un `Blob` de tipo `application/json`, el nombre exacto `taller-cambios-sin-enviar-2026-10-29.json` y contenido `{"operations":[]}` con `FileReader`; `null` no llama al downloader. El contenido lo entrega D1c; F13 no lo vuelve a serializar.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts useSyncSnapshot.spec.tsx unsent-download.spec.tsx`; el hook constante y el downloader vacío fallan.
3. **Verde:**

   ```ts
   const emptySubscribe = () => () => undefined;
   const useSyncSnapshot = <T,>(sync: ProgressSync | null, select: (state: ProgressSyncState) => T, fallback: T): T =>
     useSyncExternalStore(sync?.state.subscribe ?? emptySubscribe,
       () => sync ? select(sync.state.getState()) : fallback);
   export default useSyncSnapshot;
   ```

   `downloadUnsentFile` retorna con `null`; en otro caso llama a `downloadBlob(new Blob([file.text], {type: 'application/json'}), file.fileName)`. La fixture implementa todos los miembros de `ProgressSync`: flush resuelve `sent`, descargas devuelven `null`, acciones sin resultado usan mocks, `exerciseSummary` devuelve `null`, promesas de importación y modo resuelven `undefined`. Usá la factory de T005. Para `discardEpochCopy` el doble conserva `epochChange` con `copy: null`; `dismissEpochChange` lo vuelve `null`. Así la prueba no atribuye al motor una limpieza que no hace.
4. `stubDialogs` guarda descriptores originales y sólo simula `showModal` (pone `open`) y `close` (quita `open` y dispara `close`). Restauralos al terminar; no simula foco atrapado ni `inert`. Esas garantías las prueba Chromium. Si la base tiene el stub compartido de F11a, reutilizá su módulo de pruebas mediante una entrada de pruebas permitida por la arquitectura; nunca importes internals de un slice de producción desde otro.
5. Repetí y checks; commit `feat(progress-sync): conectar la lectura y las descargas de las superficies`.

### Tarea T009 · Compuerta de U1

**Archivos:** sin producción; informe de la unidad. **Interfaces:** la API de U1 queda congelada para U2/U4.

1. Corré la compuerta de §0; esperamos 0 errores y los casos de T002–T008 en verde.
2. Revisá mutantes: marcar después de recargar (T002), comparar UTC (T003), `>=120000` (T005), borrar deuda en `pending` (T006), listener permanente (T007), descarga que vacía cola (T008). Cada uno debe fallar en su prueba; revertí sólo el mutante propio antes de seguir.
3. Verificá con `git diff --name-only` que U1 no cambia el motor, la red ni almacenamiento. Registrá los números; no cierres la unidad con una importación ausente.
4. Commit sólo si cambia documentación: `docs(specs): registrar la compuerta de F13 U1`.

## 2. U2 · Los diálogos y la franja

### Tarea T010 · Dos diálogos que sólo terminan recargando

**Archivos:** crear `frontend/src/features/progress-sync/ui/BlockingDialog.tsx`, `AccountMismatchDialog.tsx`, `AccountChangedDialog.tsx` y las specs de los dos últimos; ampliar el índice del slice.

**Interfaces:** props públicas del contrato §1. `BlockingDialogProps` interno tiene `title: string`, `children: ReactNode` y `initialFocusRef: RefObject<HTMLButtonElement | null>`. No recibe `onDismiss`. `AccountMismatchDialog` lee sólo `accountMismatch` y `mode`; `AccountChangedDialog` recibe `lost`, `onDownload` y `onContinue`.

1. **Rojo, cierre externo y privacidad:**

   ```tsx
   it('a close from outside opens it again', () => {
     const sync = fakeSync({accountMismatch: {lostOnReload: 0}});
     render(<AccountMismatchDialog sync={sync} reloadDocument={vi.fn()} />);
     const dialog = screen.getByRole('alertdialog', {name: 'Esta pestaña quedó con otra cuenta'}) as HTMLDialogElement;
     const cancel = new Event('cancel', {cancelable: true});
     fireEvent(dialog, cancel);
     expect(cancel.defaultPrevented).toBe(true);
     act(() => dialog.close());
     expect(dialog.open).toBe(true);
     expect(within(dialog).getByRole('button', {name: 'Recargar'})).toHaveFocus();
     expect(dialog.textContent).not.toMatch(/alumna@example\.test|Alumno de prueba|\b41\b|\b52\b/);
   });
   it('downloads without reloading or discarding in memory', async () => {
     const sync = fakeSync({mode: 'blocked', accountMismatch: {lostOnReload: 2}});
     const reload = vi.fn();
     render(<AccountMismatchDialog sync={sync} reloadDocument={reload} />);
     const button = screen.getByRole('button', {name: 'Descargar lo que no se envió'});
     expect(button).toHaveFocus();
     expect(screen.getByText('Esta pestaña tiene 2 cambios que no llegaron a enviarse, y se pierden al recargar. Si los querés, descargá una copia antes.')).toBeVisible();
     await userEvent.setup().click(button);
     expect(sync.downloadUnsent).toHaveBeenCalledTimes(1);
     expect(sync.afterSignOut).not.toHaveBeenCalled();
     expect(reload).not.toHaveBeenCalled();
   });
   ```

   Agregá `accountMismatch: null` sin diálogo; `browser` con texto de 30 días y sin descarga; memoria con pérdida 0 sin descarga; memoria con 1, singular. En `AccountChangedDialog.spec.tsx`, `lost: 2` muestra sólo su título y dos botones; descargar no llama a `onContinue`; «Seguir» lo llama una vez; Esc y `close` no terminan el diálogo.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts AccountMismatchDialog.spec.tsx AccountChangedDialog.spec.tsx`; los componentes `null` fallan por roles ausentes. Instalá/restaurá `stubDialogs` de T008 por caso.
3. **Verde:** `BlockingDialog` usa `useId` para el título, un ref al `<dialog>` y un efecto de montaje para `showModal()` y foco. En cleanup cerralo sin reabrir (ref `active` en `false` antes de `close`). `onCancel` previene y corta propagación; `onClose` corta propagación y, si sigue activo/conectado, reabre y devuelve foco al botón seguro. Nunca `open` como sustituto de `showModal`.
4. `AccountMismatchDialog` no renderiza el modal si el aviso es `null`; con aviso compone el texto de T003 según el modo. Usa `accountMismatch.lostOnReload` y no `unsentCount`. Descargar llama a `downloadUnsentFile(sync.downloadUnsent())`; recargar sólo al callback. Ambos componentes mantienen los nombres de sus archivos y export default.
5. Repetí, checks y commit `feat(progress-sync): proteger la pestaña que cambió de cuenta`.

### Tarea T011 · Época, copia y confirmación dentro del aviso

**Archivos:** crear `frontend/src/features/progress-sync/ui/SyncNoticeItem.tsx`, `EpochNotice.tsx` y `EpochNotice.spec.tsx`.

**Interfaces:** `SyncNoticeItemProps {text: string; children: ReactNode}` produce un `div.sync-notice` con un solo `<p>` y un contenedor de acciones. `EpochNoticeProps {sync: ProgressSync; change: EpochChange}`; el padre lo monta sólo si la época es visible. Consume las tres acciones de época y el downloader.

1. **Rojo:**

   ```tsx
   it('keeps the copy after download and confirms before removing the notice', async () => {
     const user = userEvent.setup();
     const change = {resetAt: null, ownReset: false, copy: {count: 2, persisted: true}};
     const sync = fakeSync({epochChange: change});
     render(<EpochNotice sync={sync} change={change} />);
     await user.click(screen.getByRole('button', {name: 'Descargar la copia'}));
     expect(sync.downloadEpochCopy).toHaveBeenCalledTimes(1);
     expect(sync.discardEpochCopy).not.toHaveBeenCalled();
     await user.click(screen.getByRole('button', {name: 'Descartar la copia'}));
     expect(screen.getByText('¿Descartar la copia? Esos 2 cambios no se pueden recuperar.')).toBeVisible();
     expect(screen.getByRole('button', {name: 'Cancelar'})).toHaveFocus();
     await user.click(screen.getByRole('button', {name: 'Cancelar'}));
     expect(screen.getByRole('button', {name: 'Descartar la copia'})).toHaveFocus();
     expect(sync.discardEpochCopy).not.toHaveBeenCalled();
     await user.click(screen.getByRole('button', {name: 'Descartar la copia'}));
     await user.click(screen.getByRole('button', {name: 'Descartar', exact: true}));
     expect(sync.state.getState().epochChange).toBeNull();
   });
   ```

   Probá sin copia: sólo «Entendido», llama a `dismissEpochChange` y no al descarte. Con `resetAt: null`, el texto es «Tu progreso se borró desde otra pestaña o dispositivo. Te mostramos tu cuenta como quedó.». Con copia no existe «Entendido» ni una promesa de importación.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts EpochNotice.spec.tsx`; primero falla por no dibujar; luego el mutante que sólo descarta conserva `epochChange` y falla por `null`.
3. **Verde:** confirmación local inicialmente cerrada. Descargar no cambia ese estado. Confirmar llama primero `discardEpochCopy()` y después `dismissEpochChange()`: D1c sólo quita `copy` con la primera acción; FR-026/SC-006 exigen quitar también el aviso. Cancelar no llama acciones. Foco sólo en la transición solicitada por el alumno; la llegada del aviso no lo cambia.
4. Guardá `confirmationFor: EpochChange | null`; la confirmación sólo está abierta si `confirmationFor === change`. Al confirmar, comprobá además que `sync.state.getState().epochChange === confirmationFor`; si cambió, no descartes nada. Una prueba `rerender` con otra época y el mismo `resetAt: null` exige otra confirmación. No uses la fecha ni la cantidad como identidad de una época.
5. Repetí, checks y commit `feat(progress-sync): ofrecer la copia de la época antes de descartarla`.

### Tarea T012 · Franja estable, acciones y anuncios

**Archivos:** crear `frontend/src/features/progress-sync/ui/SyncNoticeStrip.tsx` y `SyncNoticeStrip.spec.tsx`; exportar el componente desde el índice.

**Interfaces:** contrato §1; consume selectores pequeños, `activeNotices`, los textos, `EpochNotice` y las acciones públicas. Produce exactamente un `#sync-notices` montado, con `aria-live="polite"`, sin rol.

1. **Rojo:**

   ```tsx
   it('keeps the live container and focus across repeated reports', () => {
     const sync = fakeSync({status: 'synced'});
     render(<><button>Continuar estudiando</button><SyncNoticeStrip sync={sync} onSignIn={vi.fn()} reloadDocument={vi.fn()} /></>);
     const strip = document.getElementById('sync-notices')!;
     screen.getByRole('button', {name: 'Continuar estudiando'}).focus();
     act(() => sync.state.setState({status: 'signed-out'}));
     const text = strip.querySelector('p');
     expect(strip).toHaveAttribute('aria-live', 'polite');
     expect(strip).not.toHaveAttribute('role');
     expect(text).toHaveTextContent('Tu sesión venció. Tus cambios quedan en este navegador y llegan a tu cuenta cuando vuelvas a ingresar.');
     act(() => sync.state.setState({status: 'signed-out'}));
     expect(document.getElementById('sync-notices')).toBe(strip);
     expect(strip.querySelector('p')).toBe(text);
     expect(screen.getByRole('button', {name: 'Continuar estudiando'})).toHaveFocus();
     expect(screen.queryAllByRole('alert')).toHaveLength(0);
     expect(screen.queryAllByRole('status')).toHaveLength(0);
   });
   it('dismisses clock warnings for the document, not just the current reading', async () => {
     const sync = fakeSync({clockSkewMs: 150000});
     render(<SyncNoticeStrip sync={sync} onSignIn={vi.fn()} reloadDocument={vi.fn()} />);
     await userEvent.setup().click(screen.getByRole('button', {name: 'Entendido'}));
     act(() => sync.state.setState({clockSkewMs: 60000}));
     act(() => sync.state.setState({clockSkewMs: -300000}));
     expect(document.getElementById('sync-notices')).toBeEmptyDOMElement();
   });
   ```

   Agregá la tabla de acciones: «Ingresar» llama sólo a `onSignIn`; «Recargar» sólo a `reloadDocument`; en memoria la descarga aparece antes de recargar y no lo llama; rechazos de 1 a 3 actualizan un solo aviso y «Entendido» llama a `acknowledgeRejected`. Probá Tab/Enter/Espacio con user-event v14 y foco que permanece fuera cuando llegan avisos. Compará el orden con los literales de T005, no con su función.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts SyncNoticeStrip.spec.tsx`; falla por franja ausente.
3. **Verde:** un selector por `status`, `mode`, `lostOnUnload`, `epochChange`, `rejectedCount` y `clockSkewMs`; `clockDismissed` local, inicial `false`. Derivá la lista en render. Claves por tipo de aviso, no por texto o cantidad. Cada texto es una cadena en un solo nodo; callbacks sólo por interacción. Si hay `accountMismatch`, el modal tiene prioridad: la franja queda montada y sin acciones accesibles por la inercia nativa del documento.
4. Conservá la instancia de EpochNotice con key por tipo; T011 invalida su confirmación por referencia cuando cambia el objeto de época. No uses un efecto para derivar la lista de avisos.
5. Repetí, checks y commit `feat(progress-sync): mostrar los avisos en una franja persistente`.

### Tarea T013 · Compuerta de U2

**Archivos:** informe de unidad; sin producción. **Interfaces:** componentes exportados según el contrato.

1. Corré la compuerta de §0 y las cuatro specs de U2. Los stubs de diálogo no prueban inercia ni foco atrapado: ambos quedan obligatorios en T025, no como evidencia verde de jsdom.
2. Mutantes: permitir Esc, no reabrir `close`, descargar y descartar juntos, descarte que deja aviso, usar la cantidad como key, restablecer `clockDismissed` al cambiar la lectura. Cada uno tiene un caso que falla.
3. Revisá que no hay imports de `features/sign-in` en `features/progress-sync`, ni llamadas HTTP. Registrá resultados; commit documental sólo si corresponde: `docs(specs): registrar la compuerta de F13 U2`.

## 3. U3 · Integración en el shell de F10b

### Tarea T014 · La segunda línea del pie

**Archivos:** modificar `frontend/src/app/shell/Sidebar.tsx`; crear `Sidebar.sync.spec.tsx`.

**Interfaces:** agrega sólo `accountLine?: AccountLine | null` a las props reales de F10b; importa el tipo por el índice público. El resto de props y DOM de Sidebar se conserva.

1. **Rojo:** reutilizá el render de Sidebar de su spec, pasando las props de F10b. Para cada fila de T004 verificá:

   ```tsx
   expect(container.querySelector('.account-status')).toHaveTextContent('Sincronizado con tu cuenta');
   expect(container.querySelector('.account-status')).not.toHaveAttribute('role');
   expect(container.querySelector('.account-status')).not.toHaveAttribute('aria-live');
   expect(container.querySelector('.account-status .status-dot')).toHaveAttribute('aria-hidden', 'true');
   expect(container.querySelector('#save-label')).toHaveTextContent('Guardado en este navegador');
   expect(container.querySelector('#save-label')!.compareDocumentPosition(container.querySelector('.account-status')!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
   ```

   Con prop omitida o `null`, cero `.account-status`. Con almacenamiento no disponible, el label sigue «Exportá para conservar tu avance» aunque la cuenta esté sincronizada.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts Sidebar.sync.spec.tsx`; falla sólo la segunda línea.
3. **Verde:** después del bloque de guardado agregá, si hay línea, `div.save-status.account-status`, punto `span.status-dot.account-status-dot--${family}` con `aria-hidden="true"`, y un `span` con `text`. No agregues regiones vivas ni una nueva prop por cada estado.
4. Repetí con las specs previas de Sidebar, checks y commit `feat(shell): mostrar el estado de la cuenta debajo del guardado local`.

### Tarea T015 · Ingresar y cambiar de cuenta a propósito

**Archivos:** crear `frontend/src/app/shell/SyncNotices.tsx` y `SyncNotices.spec.tsx`.

**Interfaces:** props del contrato §3. Consume `reauthenticate(expectedUserId, {requestSignIn, reloadDocument}): Promise<'same-account' | 'reloading'>`, `sessionStore` de F11a y la API pública de F13. Conserva como datos de UI `changed: {lost: number; file: UnsentFile | null} | null`; no guarda progreso propio.

1. **Rojo:** con `sessionStore` en la cuenta 41, motor en `signed-out`, 2 cambios en memoria y `requestSignIn` resolviendo cuenta 52:

   ```tsx
   await user.click(screen.getByRole('button', {name: 'Ingresar', exact: true}));
   expect(await screen.findByRole('alertdialog', {name: 'Cambiaste de cuenta'})).toBeVisible();
   expect(screen.queryByRole('alertdialog', {name: 'Esta pestaña quedó con otra cuenta'})).toBeNull();
   expect(reload).not.toHaveBeenCalled();
   await user.click(screen.getByRole('button', {name: 'Descargar lo que no se envió'}));
   expect(reload).not.toHaveBeenCalled();
   await user.click(screen.getByRole('button', {name: 'Seguir'}));
   expect(reload).toHaveBeenCalledTimes(1);
   ```

   El setup renderiza `<SyncNotices sync={sync} requestSignIn={request} reloadDocument={reload}/>` y mockea sólo la descarga. Misma cuenta: cero diálogos; al actualizar el motor a `synced` se va el aviso. Otra cuenta en browser o memoria vacía: una recarga, cero diálogos. Sin clic, `requestSignIn` no se llama. Un rechazo del pedido de ingreso se maneja por el contrato de F11a, sin promesa rechazada sin observar.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts SyncNotices.spec.tsx`; el stub falla por botón ausente.
3. **Verde:** captura el ID original antes de abrir acceso; llama a `reauthenticate` con un callback de recarga que, antes de navegar, lee `lostOnUnload` y toma `downloadUnsent()` del motor anterior. Guarda la copia en el estado de UI sólo cuando ese callback necesita esperar «Seguir»; no la vuelvas a leer del motor de la cuenta nueva. El callback no debe ejecutarse en el camino de la misma cuenta. D1c sigue siendo quien reanuda sus envíos.
4. Evitá aperturas dobles con una guarda de pedido en curso; al resolver siempre liberala. El diálogo de cuenta distinta tiene prioridad: si aparece mientras se pide ingreso, no abras otro modal de F13. Cubrí ese intercalado en la spec con una promesa controlada. Los formularios F11a conservan su manejo de `account_mismatch`; T017 detecta si existe un aviso competidor y detiene el cableado para resolverlo antes de publicar.
5. Repetí, checks y commit `feat(shell): ofrecer el ingreso desde los avisos de sincronización`.

### Tarea T016 · Ciclo de vida de los dos vigías

**Archivos:** crear `frontend/src/app/shell/sync-watchers.ts` y `sync-watchers.spec.tsx`.

**Interfaces:** `startSyncWatchers(sync: ProgressSync, notify: (message: string) => void): () => void`, consume `watchSyncToasts`, `watchUnloadGuard`, `reloadWasChosen` y `window`.

1. **Rojo:** con motor `synced`, al iniciar y cambiarlo a `offline` se notifica una vez; después de cleanup no se notifica ni se cancela `beforeunload`:

   ```ts
   const sync = fakeSync({status: 'synced'});
   const notify = vi.fn();
   const stop = startSyncWatchers(sync, notify);
   sync.state.setState({status: 'offline', mode: 'blocked', lostOnUnload: 2});
   expect(notify).toHaveBeenCalledTimes(1);
   stop();
   const event = new Event('beforeunload', {cancelable: true});
   window.dispatchEvent(event);
   expect(event.defaultPrevented).toBe(false);
   sync.state.setState({status: 'error'});
   expect(notify).toHaveBeenCalledTimes(1);
   ```

2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts sync-watchers.spec.tsx`; falla el toast del stub.
3. **Verde:** inicia ambos vigías y devuelve una función que llama a ambos cleanups. `startTaller` es su único dueño; no se montan en efectos de vistas. Agregá start→stop→start, luego `pending→offline`: una notificación, no dos.
4. Repetí, checks y commit `feat(shell): administrar los vigías de sincronización`.

### Tarea T017 · Componer la raíz, el shell y los estilos

**Archivos:** modificar `frontend/src/app/shell/Shell.tsx`, `frontend/src/app/root/AppRoot.tsx`, `frontend/src/app/boot/start-taller.tsx`, `frontend/src/app/shell/shell.css` y las specs de esas tres piezas de F10b. Si F10c aún no creó shell.css, crearla e importarla desde Shell sin mudar reglas existentes.

**Interfaces:** `appProgressSync(): ProgressSync` único de D1c; `ProgressSyncContext` y `SignOutProgressContext` usan esa misma instancia; `Shell` compone `SyncNotices`, `Sidebar` y el canal `notify` de F10b. El cleanup de `startTaller` suma el de T016.

1. **Rojo de composición:** en las specs existentes del shell y arranque, afirmá:

   ```tsx
   const strip = document.getElementById('sync-notices')!;
   expect(strip).toBeEmptyDOMElement();
   expect(document.querySelector('.account-status')).toBeNull();
   expect(document.getElementById('session-status')!.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
   expect(strip.compareDocumentPosition(document.querySelector('main')!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
   act(() => sync.state.setState({status: 'signed-out'}));
   expect(screen.getByRole('button', {name: 'Ingresar', exact: true})).toBeVisible();
   expect(document.getElementById('sync-notices')).toBe(strip);
   ```

   Probá que cambiar vistas conserva la franja y no reinstala los vigías; con `accountMismatch` existe un solo alertdialog, incluso si un formulario F11a recibió el mismo fallo. En el arranque fallido la franja sigue montada vacía. Usá el motor inyectado por las fixtures de F10b, no otro singleton para el test.
2. Corré las specs afectadas con `npx --no-install vitest run --config frontend/vitest.config.ts Shell AppRoot start-taller`; el rojo debe ser la falta de franja/conexión, no la inexistencia de F10b (T001 la bloquea antes).
3. **Verde:** en Shell leé sólo `status` para derivar la línea. Montá `SyncNotices` entre `#session-status` y `main`; el contenedor existe aun sin contenido. En AppRoot montá `AccountMismatchDialog` fuera del diálogo de «Tu cuenta». Si D1c ya provee contextos, reutilizalos; si no, provéelos ambos desde la raíz con el mismo motor. Iniciá vigías antes de `runBoot` y agregá cleanup al teardown vigente. No crees otra raíz ni un portal nuevo fuera de la raíz.
4. **Estilos:** usa las clases del diálogo y botón de F11a, con el mismo ancho/alto móvil; suma:

   ```css
   .sync-notices:empty { display: none; }
   .sync-notice { min-width: 0; overflow-wrap: anywhere; }
   .sync-notice-actions { display: flex; flex-wrap: wrap; gap: 8px; }
   .account-status-dot--synced { background: var(--color-green, #38614a); }
   .account-status-dot--pending { background: var(--color-muted, #656b60); }
   .account-status-dot--problem { background: var(--color-recommended, #e69a70); }
   .sync-dialog { box-sizing: border-box; max-width: calc(100vw - 32px); overflow-wrap: anywhere; }
   @media (max-width: 590px) {
     .sync-dialog { width: 100%; max-width: 100%; max-height: 100dvh; margin: 0; }
   }
   @media print { .sync-notices { display: none; } }
   ```

   Para borde/espacio usa `--color-line` = `#dddcd2`, gutter `52px`, compacto `32px`, teléfono `20px`. Los fallbacks exactos resuelven la base anterior a F10c; con F10c usá sus tokens. No transiciones ni estilos en línea. Si F15a está presente, el brief transpone estas mismas reglas a sus utilidades, sin cambiar los criterios ni instalar paquetes.
5. Repetí, `npm run build`, `node qa/boot-check.ts`, `node qa/seams-guard-check.ts`, checks y commit `feat(shell): integrar los avisos y la protección de sincronización`.

### Tarea T018 · Compuerta de U3

**Archivos:** informe de unidad. **Interfaces:** el primer cuadro del shell y sus superficies quedan integrados.

1. Corré §0, build y tamaño con el comando del quickstart. No aceptes un HTML de 1 500 000 caracteres o más.
2. Revisá en navegador la franja vacía, los seis estados, todos los botones y el modal en 320/390 px; con movimiento reducido no hay animaciones, con impresión no hay franja. Los tests que lo fijan se ejecutan en U5.
3. Mutantes: proveedor con otro motor, franja dentro de `main`, dos vigías y modal dentro del diálogo de cuenta; deben caer en las specs de composición. Mantené los textos de `#save-label` y los escenarios existentes.
4. Registrá los números y la deuda manual de lector de pantalla (T030); commit documental si corresponde: `docs(specs): registrar la compuerta de F13 U3`.

## 4. U4 · «Salir» y «Tu progreso», sin esperar al shell

Se puede ejecutar después de U1 y D1c U5. No consume U2 ni U3; por eso no usa `BlockingDialog`, los Page Objects nuevos del shell ni el vigía integrado de T016. Sus specs de memoria prueban la marca de T002; T027 completa la combinación con el listener en el shell. El tren de publicación está fijado en «Unidades, dueños y orden».

### Tarea T019 · Pregunta como decisión, no como cierre de sesión

**Archivos:** crear `frontend/src/pages/account/ui/useSignOutQuestion.ts`, `useSignOutQuestion.spec.tsx`, `SignOutQuestion.tsx` y `SignOutQuestion.spec.tsx`.

**Interfaces:** consume `SignOutLeftover`, `ChooseAfterLeftover` de `features/sign-in`, `StorageMode` y textos de `features/progress-sync`. Produce:

```ts
interface SignOutQuestionState {
  readonly left: SignOutLeftover;
  readonly mode: StorageMode;
}
interface SignOutQuestionController {
  readonly question: SignOutQuestionState | null;
  ask(left: SignOutLeftover, mode: StorageMode): Promise<'keep' | 'discard' | 'stay'>;
  answer(choice: 'keep' | 'discard' | 'stay'): void;
}
interface SignOutQuestionProps {
  readonly question: SignOutQuestionState;
  onAnswer(choice: 'keep' | 'discard' | 'stay'): void;
  onDownload(): void;
}
```

`useSignOutQuestion(): SignOutQuestionController` y `SignOutQuestion` son default exports con nombre coincidente. No son API pública de la página.

1. **Rojo, opciones y cierre anidado:**

   ```tsx
   it('closing the question does not close the dialog around it', () => {
     const outerClose = vi.fn();
     const answer = vi.fn();
     render(<dialog open onClose={outerClose}>
       <SignOutQuestion question={{left: {count: 2, reason: 'offline'}, mode: 'browser'}} onAnswer={answer} onDownload={vi.fn()} />
     </dialog>);
     const question = screen.getByRole('dialog', {name: 'Hay cambios que no llegaron a tu cuenta'}) as HTMLDialogElement;
     expect(screen.getByRole('button', {name: 'Volver al taller'})).toHaveFocus();
     act(() => question.close());
     expect(answer).toHaveBeenCalledExactlyOnceWith('stay');
     expect(outerClose).not.toHaveBeenCalled();
   });
   it('downloads without choosing to leave in memory', async () => {
     const answer = vi.fn();
     const download = vi.fn();
     render(<SignOutQuestion question={{left: {count: 1, reason: 'signed-out'}, mode: 'blocked'}} onAnswer={answer} onDownload={download} />);
     expect(screen.queryByRole('button', {name: 'Conservarlos y salir'})).toBeNull();
     await userEvent.setup().click(screen.getByRole('button', {name: 'Descargar una copia'}));
     expect(download).toHaveBeenCalledTimes(1);
     expect(answer).not.toHaveBeenCalled();
     expect(screen.getByRole('dialog', {name: 'Hay cambios que no llegaron a tu cuenta'})).toBeVisible();
   });
   ```

   Tabla adicional: browser `Conservarlos y salir → keep`, `Descartarlos y salir → discard`, `Volver al taller → stay`; shared/blocked `Salir sin enviarlos → discard`, `Volver al taller → stay`; Esc en los tres modos → `stay`, una sola vez. Las ayudas visibles son las de la spec, incluida la caducidad de 30 días. El hook debe resolver `stay` al desmontar y evitar sobrescribir un resolver pendiente: un segundo `ask` devuelve `stay` sin reemplazar la pregunta anterior.
2. Corré `npx --no-install vitest run --config frontend/vitest.config.ts SignOutQuestion.spec.tsx useSignOutQuestion.spec.tsx`; fallan los roles y resoluciones del stub.
3. **Verde:** hook con estado para la pregunta y ref para el resolver. `answer` toma y borra el resolver antes de invocarlo, cierra el estado, y es idempotente. Cleanup responde `stay`. `SignOutQuestion` usa `<dialog>` nativo con `showModal`, título por `useId`, y foco inicial en «Volver al taller». Cancela el evento `cancel`, corta su propagación y responde `stay`; `close` también corta propagación y responde sólo si no se resolvió ya. En cleanup no responde por segunda vez.
4. La descarga llama a `onDownload`, sin resolver. Esta es la recomendación 3 aprobable al mergear el plan; reemplaza para F13 la última frase de §5 del contrato de D1c que sugería descargar y responder `discard`. No cambia el tipo del puerto ni el motor.
5. Repetí, checks y commit `feat(account): preguntar qué hacer con los cambios sin enviar`.

### Tarea T020 · Cablear «Salir», espera, nota y foco

**Archivos:** modificar `frontend/src/pages/account/ui/SignOutSection.tsx` y `account.css`; crear `sign-out-section.sync.spec.tsx`. Si la base de F10c movió las reglas de la cuenta, agregalas donde está `.account-sign-out`, sin duplicarlas.

**Interfaces:** conserva `userId: number` y `reloadDocument(): void`. Consume `useSignOutProgress(): SignOutProgress | null`, `useProgressSync(): ProgressSync | null`, `signOut(deps): Promise<SignOutOutcome>`, el hook de T019 y la API U1. `choose` es un callback con la firma de D1c, no importa internals del otro slice.

1. **Rojo de comportamiento:** montá los proveedores con `fakeSync`, cliente HTTP real de F11a con fetch falso, y `SignOutSection`. El mock de `flushNow` devuelve una promesa controlable:

   ```tsx
   await user.click(screen.getByRole('button', {name: 'Salir', exact: true}));
   expect(screen.getByRole('button', {name: 'Enviando tus cambios…'})).toBeDisabled();
   expect(logoutCalls()).toHaveLength(0);
   await act(async () => finishFlush({kind: 'left', count: 2, reason: 'offline'}));
   await user.click(screen.getByRole('button', {name: 'Volver al taller'}));
   expect(logoutCalls()).toHaveLength(0);
   expect(sync.afterSignOut).not.toHaveBeenCalled();
   expect(screen.getByRole('button', {name: 'Salir', exact: true})).toBeEnabled();
   expect(screen.getByRole('button', {name: 'Salir', exact: true})).toHaveFocus();
   ```

   `logoutCalls` es el filtro local de `fake.calls` por `/api/auth/logout`; `finishFlush` es el resolver tipado de `Promise<FlushOutcome>`, creado antes del render, sin timers. Afirmá también `flushNow` llamado una vez ante doble clic. No mockees `signOut`: el orden de limpieza se prueba contra su puerto real.
2. Sumá casos con resultado `sent` (pasa a «Saliendo…», sólo limpia tras 204), `left` + cada elección, 401 de cierre (limpia) y 500 de cierre (cero limpieza, «No pudimos cerrar la sesión», «Reintentar»). Con motor ausente o `status: null`, nota de F11a y sin «Tu progreso»; con los seis estados y los tres modos, línea y nota exactas de data-model.md. `status` y `mode` cambian bajo `act` sin volver a montar el componente.
3. **Intercalado crítico:** con pregunta abierta, cambiá `accountMismatch` a `{lostOnReload: 2}`. La pregunta resuelve `stay`, desaparece y no hace POST ni descarte. No devuelvas foco detrás del modal de cuenta distinta. Si `choose` recibe `account-changed` con mismatch ya presente, devuelve `stay` sin montar la pregunta; sin mismatch, usa «el taller no responde».
4. Corré `npx --no-install vitest run --config frontend/vitest.config.ts sign-out-section.sync.spec.tsx`; el código previo falla por etiqueta y pregunta. En verde, pasá `progress`, `onPhase` y `choose` al `signOut` existente. La guarda de pendiente cubre desde el primer clic hasta el resultado. El único efecto nuevo sincroniza la pregunta con `accountMismatch` externo y la resuelve `stay`. No cierres sesión ni descartes desde ese efecto.
5. Para devolver foco en `stayed` o fracaso, habilitá primero el botón y luego enfocá su ref. Preferí el mecanismo ya usado por F11a; si requiere `flushSync`, permiso local de ESLint con razón de foco en esa línea. El cleanup no reenfoca un nodo desmontado. En éxito, sólo `reloadDocument`, que marca la elección. La nota no tiene rol vivo; «Tu progreso» es un `<dt>` con `<dd>`. Botones con wrap, foco visible y sin transiciones/estilos inline.
6. Repetí las specs previas de cuenta y las nuevas; checks y commit `feat(account): mostrar el envío y las decisiones antes de salir`.

### Tarea T021 · E2E de salida y respuestas de sincronización

**Archivos:** crear `qa/e2e/lib/sync-replies.ts` y `qa/e2e/specs/sync-sign-out.spec.ts`; ampliar `qa/e2e/pages/account.ts`. Modificar sólo `NOTE` en `qa/e2e/specs/account.spec.ts` en el commit separado de la recomendación 1; no cambiar el escenario ni sus aserciones restantes. Si falta un mensaje de D6, agregarlo a `qa/e2e/lib/api-contract.ts` desde el catálogo PHP.

**Interfaces:** `OFFLINE`, `ANOTHER_STUDENT`, `SyncReplyOptions`, `syncReply` y `progressPhoto` del contrato §6; tipos `ApiCall` y `ApiReply` del doble vigente. `account.question`, `account.progressLabel`, `account.progress` y `questionButton(name)` tienen localizadores del contrato. No depende de T023.

1. **Respuestas compartidas:** implementá este contrato de pruebas, sin HTTP real:

   ```ts
   export const OFFLINE: ApiReply = {status: 0, abort: true};
   export const ANOTHER_STUDENT: PublishedAccount = {...STUDENT, id: 52};
   export interface SyncReplyOptions {
     readonly serverTimeShiftMs?: number;
     readonly rejected?: number;
   }
   export function syncReply(call: ApiCall, contentVersion: string, options: SyncReplyOptions = {}): ApiReply {
     const envelope = call.body as {epoch: number; sentAt: string; knownRevision?: number; operations?: {id: string}[]};
     const operations = envelope.operations ?? [];
     return {status: 200, json: {
       epoch: envelope.epoch,
       revision: (envelope.knownRevision ?? 0) + (operations.length ? 1 : 0),
       serverTime: new Date(Date.parse(envelope.sentAt) + (options.serverTimeShiftMs ?? 0)).toISOString(),
       contentVersion,
       results: operations.map((operation, index) => index < (options.rejected ?? 0)
         ? {id: operation.id, status: 'rejected', reason: 'out_of_range'}
         : {id: operation.id, status: 'applied'}),
       changes: {full: false, ...EMPTY_AREAS},
     }};
   }
   export function progressPhoto(contentVersion: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
     return {userId: 41, epoch: 1, revision: 0, resetAt: null, contentVersion,
       serverTime: '2026-10-29T12:00:00.000Z', full: true, ...EMPTY_AREAS, ...overrides};
   }
   ```

   Un `serverTimeShiftMs` positivo representa un servidor adelantado: D1c expone skew negativo. No cambies ese signo en los E2E. Importá `EMPTY_AREAS`, `STUDENT` y `PublishedAccount` desde `api-contract.ts`; nunca copies una segunda definición del contrato HTTP.
2. **Rojo:** con `test`, `expect` de `../fixtures`, `urls` de `../lib/urls`, `OFFLINE` y `project` existente:

   ```ts
   test('keeps the session and returns focus when the student stays', async ({api, shell, project, account, pageIssues}) => {
     pageIssues.expectIssue(/net::ERR_FAILED/, 'The sync transport is intentionally unavailable.');
     await shell.goto(urls.view('proyecto'));
     api.on('POST /api/sync', () => OFFLINE);
     await project.milestoneChecks().first().check();
     await account.open();
     await account.button('Salir').click();
     await expect(account.question).toBeVisible();
     await account.questionButton('Volver al taller').click();
     await expect(account.question).not.toBeVisible();
     await expect(account.dialog).toBeVisible();
     await expect(account.button('Salir')).toBeFocused();
     expect(api.callsTo('POST /api/auth/logout')).toHaveLength(0);
   });
   ```

   `urls.view(view: View): string` recibe una sola vista; para Proyecto usá `urls.view('proyecto')`. El idioma inicial de este caso es Rust. No inventes otro constructor de URL. Para la respuesta sin operaciones que puede llegar al arrancar, esperá el estado de cuenta desde `account.progress` antes de instalar el fallo; no presupongas que `shell.goto` esperó la sincronización.
3. La matriz de pruebas es obligatoria, un test por fila:

   | Caso | Preparación y acción | Aserciones independientes |
   | --- | --- | --- |
   | Enviado | Dos hitos; respuesta demorada mediante promesa controlada; abrir cuenta y salir | Botón deshabilitado, cero logout mientras espera; al liberar, un logout; espacio propio sin cola tras recarga |
   | Conservar | Fallo de red; «Conservarlos y salir» | Cola propia sobrevive en `rawSnapshot`; espacio de otra cuenta, v1 y archivo de importación intactos |
   | Descartar | Fallo de red; «Descartarlos y salir» | Sin claves del espacio propio salvo copia de época persistida; otras cuentas intactas |
   | Memoria | `storage.block()` antes de navegar; fallo de red; descargar, luego salir sin enviar | Evento download y archivo válido antes de elegir salida; pregunta sigue abierta; cero logout hasta elegir; recarga sin `beforeunload`; sin claves de progreso |
   | Volver y Esc | Fallo de red; cada salida segura | Cero logout, cero limpieza, cuenta abierta, foco en Salir |
   | Cierre falla | Flush exitoso o `discard` elegido, logout 500 | Mensaje/reintentar y cola conservada; un reintento exitoso aplica la elección después del cierre |
   | Sesión vencida | Flush 401 y logout 401 | Motivo «tu sesión venció»; cierre único y limpieza tras el 401 |
   | Ancho móvil | 320 y 390 px, los seis estados por respuestas del doble | «Tu progreso» visible dentro de cuenta; nota corresponde al modo, sin depender de Sidebar |

   Para cola/espacios usá `seedRaw` y `rawSnapshot` de D1c; las claves y el envelope se toman del contrato del espacio de D1c, nunca se inventan. Cerrá la cuenta antes de esperar el envío demorado si el test lo requiere; no dejes una promesa del doble colgada en teardown.
4. Corré `npm run build` y los E2E nuevos contra la base sin T020 para registrar el rojo de etiquetas/pregunta; después con T020, verde. Durante la implementación podés escribir el test antes de aplicar ese commit, o revertir temporalmente sólo el cambio propio de T020: nunca alteres historia ajena. Usá el semáforo/puerto asignados por el coordinador.
5. **Excepción E2E existente:** primero registrá el fallo de `account.spec.ts` con la nota anterior y T020 integrado. Cambiá sólo `NOTE` a «Al salir, enviamos tus cambios a tu cuenta y borramos de este navegador lo que guardó.»; repetí el archivo completo. Commit separado `test(account): actualizar la nota de salida con sincronización`, citando FR-034/FR-046 y la aprobación del plan. Si hay otros fallos, no los normalices cambiando escenarios.
6. Checks, `npm run test:e2e -- qa/e2e/specs/sync-sign-out.spec.ts`, y commit del resto `test(account): cubrir la salida con cambios pendientes`.

### Tarea T022 · Compuerta de U4 y tren de entrada en servicio

**Archivos:** informe de U4. **Interfaces:** pantalla de Salir sobre D1c; ninguna dependencia del shell nuevo.

1. Corré §0, build y E2E completos. Sólo cambia `NOTE` entre los escenarios previos; documentá ese diff y la decisión 1. Compará con T001: no se pierden pruebas ni cambian los dos labels del pie.
2. Mutantes: POST antes de flush, limpieza antes de 204, descarga que responde `discard`, Esc que cierra la cuenta y mismatch que deja activa la pregunta. Los tests de T019–T021 deben rechazarlos.
3. No publiques D1c U3 si U4 de F13 y F11d U9/U10 no están listas para el tren. La base de F11d debe incluir esta U4 aunque su plan anterior diga «sin nada en el medio» después de D1c U5: la decisión 2 de este plan precisa el orden sin publicar un estado intermedio.
4. Registrá la medición y el pendiente manual; commit documental si corresponde: `docs(specs): registrar la compuerta de F13 U4`.

## 5. U5 · Red de seguridad de todas las superficies

Todos los archivos nuevos importan `test` y `expect` de `qa/e2e/fixtures`, usan `test.use({syncNotices: 'allowed'})` si inducen un problema y mantienen `strictNetwork` y `pageIssues`. Ninguno llama servicios públicos ni necesita Docker. La red anterior conserva sus escenarios; los errores simulados declaran códigos exactos. Los tests nuevos se escriben primero y se corren contra el stub o se verifica un mutante deliberado del comportamiento ya integrado, se registra el fallo esperado y se restaura la implementación antes del verde.

### Tarea T023 · Page Objects, respuesta por omisión y observación durante toda la prueba

**Archivos:** modificar `qa/e2e/fixtures/api-double.ts`, `fixtures/index.ts`, `pages/shell.ts`, `pages/access.ts`; crear `qa/e2e/lib/unload-dialogs.ts`, `lib/quiet-sync.ts` y `specs/sync-fixture.spec.ts`.

**Interfaces:** contrato §6; se agrega `observeQuietSync(page: Page): Promise<{events: readonly string[]; stop(): Promise<void>}>` para la fixture, que observa sólo DOM y no el store. `countUnloadDialogs(page: Page): () => number` instala un manejador de `dialog` hasta el cierre de esa página; cualquier diálogo inesperado falla por tipo, y acepta los `beforeunload` para no congelar la navegación.

1. **Page Objects:** `accountStatus = page.locator('.sidebar .account-status')`; `syncNotices = page.locator('#sync-notices')`; diálogos con `getByRole('alertdialog', {name: …, exact: true})`. Cada método `*Button` busca el botón dentro de su superficie. `accessDialog()` usa el diálogo del acceso de F11a, y `signInFromDialog` llena Email y Contraseña dentro de él; así no confunde el botón de la franja con el del formulario.
2. **Doble:** `upToDateSync(call)` pasa a `return syncReply(call, this.contentVersion)`. Preservá el orden ruta→CSRF y `ApiCall.search`, las secuencias de `reply` y la respuesta GET de D1c. No alteres los defaults del progreso para que una prueba de F13 pase.
3. **Rojo de la observación:** la fixture automática no alcanza si mira sólo el DOM al terminar. Escribí una prueba propia con la opción `allowed` que instale `observeQuietSync`, cree un aviso y lo retire antes de terminar:

   ```ts
   test('records a transient notice instead of checking only the final DOM', async ({page}) => {
     const observation = await observeQuietSync(page);
     await page.goto('/');
     await page.evaluate(() => {
       const strip = document.createElement('div');
       strip.id = 'sync-notices';
       const notice = document.createElement('div');
       notice.className = 'sync-notice';
       notice.textContent = 'Tu sesión venció.';
       strip.append(notice);
       document.body.append(strip);
       strip.remove();
     });
     await expect.poll(() => observation.events.length).toBeGreaterThan(0);
     await observation.stop();
   });
   ```

   Para no duplicar IDs del producto en este test de infraestructura, ejecutá el cuerpo en una página vacía servida por `page.route` del mismo origen, antes de su `goto`; el doble del documento responde un HTML mínimo sin app. Agregá casos para toast de F13 que se borra, modal que abre/cierra y recarga que borra el DOM. Un toast de otro ítem no se cuenta. Corré el test y confirmá que el observador vacío o la lectura final no detectan el aviso.
4. **Verde:** instalá `MutationObserver` mediante `addInitScript` antes de navegar y un binding a Node para acumular eventos entre documentos. Revisá tanto nodos agregados/retirados como `characterData` con `oldValue` y cambios de `open`; no sólo el DOM final de cada callback. Detectá `.sync-notice`, los dos títulos de alertdialog de F13, la pregunta al salir y las cinco frases completas de sus toasts. Deduplicá nodos/textos idénticos de un mismo evento; el objetivo de `quietSync` es cero, no contar anuncios del lector. Al cerrar o navegar, los eventos ya enviados quedan en Node. `stop` desconecta donde exista documento y drena callbacks, tolerando una página ya cerrada. No guardes datos de cuentas ni contenido de ejercicios.
5. **Auto fixture:** con `syncNotices: 'none'` (default), instala el observador antes del `use` y exige `events` vacío después, aunque la página se cierre o recargue. Con `allowed` no exige silencio. Para escenarios anteriores que deliberadamente inducen errores de D1c/F11a, T001 inventaría sus títulos exactos y los declara en una lista acotada de la fixture (título completo + motivo), sin editar el escenario. Esa lista no admite regex globales ni todo un archivo: sólo los que no cumplen la precondición «con el doble al día» de SC-002. Todo escenario normal sigue protegido; un fallo nuevo no autoriza ampliar la lista.
6. Corré `npm run build` y `npm run test:e2e -- qa/e2e/specs/sync-fixture.spec.ts`; después la red completa. Mutante: insertar un aviso que se elimina antes del teardown debe hacer fallar un caso normal. En T024 se verifica por separado la no repetición de anuncios problemáticos, que `quietSync` no pretende medir.
7. Checks y commit `test(sync): observar las superficies durante toda la red`.

### Tarea T024 · Estados, toasts, reloj y regiones vivas

**Archivos:** crear `qa/e2e/specs/sync-status.spec.ts`. **Interfaces:** Page Objects T023, `syncReply` T021, `api.on`, `api.reply`, `api.callsTo`, `pageIssues.expectIssue` y el reloj de Playwright.

1. **Rojo:** tabla obligatoria contra los seis estados de la spec (el texto y familia ya tienen Vitest; acá se prueba red→pantalla). Primer caso:

   ```ts
   test('shows one offline toast and one recovery toast', async ({api, shell, project, page, pageIssues}) => {
     pageIssues.expectIssue(/net::ERR_FAILED/, 'The sync request is aborted to simulate transport failure.');
     await page.clock.install();
     await shell.goto(urls.view('proyecto'));
     await expect(shell.accountStatus).toHaveText('Sincronizado con tu cuenta');
     api.on('POST /api/sync', () => OFFLINE);
     await project.milestoneChecks().first().check();
     await page.clock.runFor(2000);
     await expect(shell.accountStatus).toHaveText('Sin conexión con el taller');
     await expect(shell.toast).toHaveText('Sin conexión con el taller. Tus cambios quedan en este navegador y se envían cuando vuelva.');
     await page.clock.runFor(5000);
     await expect(shell.toast).not.toHaveClass(/visible/);
     api.on('POST /api/sync', call => syncReply(call, api.contentVersion));
     await page.clock.runFor(15000);
     await expect(shell.accountStatus).toHaveText('Sincronizado con tu cuenta');
     await expect(shell.toast).toHaveText('Listo: tus cambios llegaron a tu cuenta.');
   });
   ```

   F10b usa la clase `visible` para mostrar `#toast`; el texto puede seguir en el nodo cuando el toast está oculto, por eso el reintento se verifica por clase y por el registro de mutaciones. Para contar anuncios registrá mutaciones del texto de `#toast` desde antes del fallo: el esperado es `[offlineTextLiteral, recoveryTextLiteral]`. No cuentes ticks ni copies las constantes del producto como oráculo.
2. Agregá estos casos con valores exactos:

   | Respuesta / secuencia | Esperado |
   | --- | --- |
   | 200 demorado hasta resolver la promesa del handler | «Enviando a tu cuenta…», cero toast/franja; luego «Sincronizado con tu cuenta» |
   | 500, 503, 429 con `Retry-After: 15`, 422 de sobre y cuerpo no JSON | «No pudimos sincronizar» y el toast literal de error; repetir mismo fallo no agrega anuncio |
   | Error en `blocked` y `shared` | Frase «no cierres la pestaña todavía»; sin cambiar `#save-label` |
   | Arranque A3 sin servidor con copia | Línea offline, aviso de A3 y cero toast offline de F13 |
   | `serverTimeShiftMs`: +120000 y -120000 | Cero aviso del reloj |
   | +150000 / -150000 | «3 minutos atrasado» / «3 minutos adelantado» |
   | +300000 seguido de +60000 | Aviso de 5 minutos, luego desaparece solo |
   | Entendido, nueva lectura ±300000 | No reaparece durante ese documento |
   | Estado inicial sin problemas | Cero alert, sólo el status `#toast`, cero F13 en `quietSync` |

   Para el reloj, usá `syncReply(call, api.contentVersion, {serverTimeShiftMs})`; no muevas `page.clock`. Para los reintentos, `runFor` avanza el scheduler, y `expect.poll`/aserciones de UI esperan la respuesta de red antes del siguiente avance.
3. Corré build y `npm run test:e2e -- qa/e2e/specs/sync-status.spec.ts`; un mutante `>=120000`, o que limpia deuda en `pending`, debe fallar. Restaurá, corré verde, checks y commit `test(sync): cubrir los estados y los anuncios sin repetición`.

### Tarea T025 · Cuenta distinta, inercia y copia antes de recargar

**Archivos:** crear `qa/e2e/specs/sync-account-mismatch.spec.ts`. **Interfaces:** `mismatchDialog`, `mismatchButton`, `progressPhoto`, `countUnloadDialogs`, `storage.rawSnapshot/rawWrites` y `observeReload` existentes.

1. **Rojo:** armá un caso por causa real de D1c: 409 `account_mismatch`; 401 seguido de sesión de cuenta 52; 419 seguido de sesión de cuenta 52; GET de progreso con `userId: 52`; delta de sincronización con otra cuenta según el contrato que D1c valida. En las respuestas de error usá `errorBody` de F11a, con código y mensaje del catálogo. No omitas el GET de sesión del 401/419.
2. Con modal visible, medí antes y después de teclado/mouse:

   ```ts
   await expect(shell.mismatchDialog).toBeVisible();
   const before = await storage.rawSnapshot();
   const modifyingBefore = api.calls.filter(call => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(call.method)).length;
   await page.keyboard.press('Escape');
   await page.keyboard.press('Escape');
   await expect(shell.mismatchDialog).toBeVisible();
   await page.keyboard.press('Tab');
   expect(await shell.mismatchDialog.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
   await page.mouse.click(2, 2);
   await page.keyboard.type('un cambio que no debe escribirse');
   expect(await storage.rawSnapshot()).toEqual(before);
   expect(api.calls.filter(call => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(call.method))).toHaveLength(modifyingBefore);
   await expect(shell.mismatchDialog).not.toContainText('alumna@example.test');
   await expect(shell.mismatchDialog).not.toContainText('Alumno de prueba');
   await expect(shell.mismatchDialog).not.toContainText(/\b(?:41|52)\b/);
   ```

   El contador de escrituras reales (`rawWrites`) tampoco crece, aunque una escritura dejara el mismo valor. Esperá un intervalo de reintento de D1c con `page.clock.runFor(15000)` después de abrir el modal para comprobar que el motor no sigue enviando. No hagas `click({force:true})` a un control detrás: no representa al alumno.
3. En browser el texto dice que lo no enviado vence en 30 días; no existe descarga. En blocked/shared con dos operaciones, foco en descargar; esperar `page.waitForEvent('download')` antes del clic, leer el archivo y afirmar `format: 'taller-cambios-sin-enviar'`, `version: 1` y dos operaciones. Después sigue abierto; recargar sólo con su botón, `observeReload` confirma documento nuevo y `countUnloadDialogs` queda en 0. Con memoria sin operaciones no hay botón de descarga.
4. Simulá también un formulario F11a que informa mismatch a la vez: exactamente un alertdialog de cuenta distinta. Si el motor ya garantiza detener escrituras pero la superficie F11a duplica el aviso, no elimines su escenario: bloqueá la unidad y reportá el contrato pendiente al coordinador, como en T017.
5. Corré build, `npm run test:e2e -- qa/e2e/specs/sync-account-mismatch.spec.ts`; mutantes permitir Esc y auto-recarga sin descarga deben caer. Restaurá, checks y commit `test(sync): fijar la protección de la pestaña con otra cuenta`.

### Tarea T026 · Época, sesión, pestaña vieja y rechazos

**Archivos:** crear `qa/e2e/specs/sync-notices.spec.ts`. **Interfaces:** `syncNotices`, `syncButton`, `accountChangedDialog`, `access.signInFromDialog`, `syncReply`, `progressPhoto`, las respuestas de error del doble y `countUnloadDialogs`.

1. **Rojo de época:** usá `test.use({timezoneId: 'America/Argentina/Buenos_Aires', syncNotices: 'allowed'})`. Encolá dos hitos antes de liberar el envío; responde 409 `epoch_mismatch` con `{epoch: 2, revision: 4}` en el campo de detalle que fija el contrato HTTP. GET siguiente devuelve `progressPhoto(..., {epoch: 2, revision: 4, resetAt: '2026-10-29T12:00:00Z'})`. Con reloj del documento fijo al 29 a las 13:00 UTC, esperá:

   ```ts
   await expect(shell.syncNotices).toContainText('Tu progreso se borró desde otra pestaña o dispositivo hoy a las 9:00. Te mostramos tu cuenta como quedó.');
   const download = page.waitForEvent('download');
   await shell.syncButton('Descargar la copia').click();
   expect((await download).suggestedFilename()).toMatch(/^taller-cambios-sin-enviar-\d{4}-\d{2}-\d{2}\.json$/);
   await expect(shell.syncButton('Descartar la copia')).toBeVisible();
   await shell.syncButton('Descartar la copia').click();
   await expect(shell.syncButton('Cancelar')).toBeFocused();
   await shell.syncButton('Cancelar').click();
   await expect(shell.syncButton('Descartar la copia')).toBeFocused();
   await shell.syncButton('Descartar la copia').click();
   await shell.syncButton('Descartar').click();
   await expect(shell.syncNotices).toBeEmpty();
   ```

   No alcanza verificar el nombre del archivo: parseá el archivo y verificá dos operaciones de época 1, sin promesa de que se importe. Recargá antes del descarte en browser: el aviso vuelve; en memoria no se recarga sin elección. El caso sin copia se prueba en T011 y también con una foto de época nueva sin cola si el espacio de D1c permite sembrarla mediante su fixture pública. El borrado propio de F8 produce cero avisos de época; no cambies su mensaje de L5.
2. **Sesión:** 401 en sync deja acceso cerrado y permite marcar otro hito. Clic «Ingresar», reautenticación misma cuenta: aviso desaparece, cola llega y un toast de vuelta. Otra cuenta browser: recarga, ningún mismatch ni beforeunload; otra cuenta blocked con dos cambios: «Cambiaste de cuenta», copia descargable antes de «Seguir», cero mismatch y cero beforeunload al seguir.
3. **Pestaña vieja y rechazos:** 409 `client_outdated` muestra literalmente el catálogo y «Recargar». En memoria dice «Al recargar se pierden 2 cambios que no se enviaron.» y ofrece descarga antes. Un resultado rejected muestra singular; siguiente lote suma hasta tres en el mismo aviso, sin motivo `out_of_range`; «Entendido» quita sólo ese aviso. No se borran los hitos locales rechazados.
4. **Ancho, foco e impresión:** para 320 y 390 px, armá época+rechazos+reloj con las respuestas, y probá ambos estados exclusivos (`outdated`, `signed-out`) por separado. Verificá orden de párrafos, cero overflow horizontal, acciones por Tab/Enter/Espacio y que un aviso nuevo no roba foco al checkbox de Proyecto. Con `reducedMotion: 'reduce'`, estilos computados de las piezas nuevas tienen `transitionDuration: 0s` y `animationName: none`; con `page.emulateMedia({media: 'print'})`, la franja no se muestra. «Ir al contenido» salta la franja y enfoca `main` como F10b.
5. Corré build y `npm run test:e2e -- qa/e2e/specs/sync-notices.spec.ts`. Mutantes `ownReset` visible, copia descartada al descargar y reloj entendido que reaparece deben fallar; restaurá, checks y commit `test(sync): cubrir las decisiones de la franja`.

### Tarea T027 · Beforeunload y recargas elegidas

**Archivos:** crear `qa/e2e/specs/sync-unload.spec.ts`. **Interfaces:** `countUnloadDialogs`, `storage.block()`, `syncReply`, los Page Objects y `page.close({runBeforeUnload: true})`.

1. **Rojo, pérdida real:** `blocked`, envío abortado y dos hitos sin enviar; el clic en el hito proporciona activación. Con el motor ya offline, instalá el listener antes de cerrar:

   ```ts
   const dialogEvent = page.waitForEvent('dialog');
   await page.close({runBeforeUnload: true});
   const dialog = await dialogEvent;
   expect(dialog.type()).toBe('beforeunload');
   await dialog.dismiss();
   expect(page.isClosed()).toBe(false);
   ```

   En este caso no instales `countUnloadDialogs`, que aceptaría automáticamente. Repetí con `shared` una vez disponible F11d; antes del tren, el mismo comportamiento está cubierto por Vitest con `mode: 'shared'`, y se registra explícitamente el E2E pendiente hasta F11d U10.
2. **Sin pérdida:** después de permitir el envío y esperar «Sincronizado», o en browser con cola pendiente, instalá el contador y esperá el evento `close`:

   ```ts
   const count = countUnloadDialogs(page);
   const closed = page.waitForEvent('close');
   await page.close({runBeforeUnload: true});
   await closed;
   expect(count()).toBe(0);
   ```

   No uses `waitForTimeout` para demostrar ausencia. Probá memoria vacía desde el inicio; luego pérdida positiva→cero→positiva debe volver a preguntar. Cola vacía con copia de época en memoria también pregunta.
3. **Recargas elegidas:** registrá cero diálogos en «Salir sin enviarlos», «Recargar» del mismatch, «Recargar» del outdated, «Seguir» del cambio deliberado y la recarga tras borrar la cuenta de F11b cuando esa feature esté integrada. A diferencia de ellas, un enlace interno que navega a un documento nuevo y `page.reload()` con memoria pendiente preguntan. Confirmá que cada ruta elegida usa la marca, no que el listener fue retirado permanentemente.
4. Corré build y `npm run test:e2e -- qa/e2e/specs/sync-unload.spec.ts`. Mutantes listener siempre puesto, condición sólo `unsentCount` y recarga sin marca deben fallar. Restaurá, checks y commit `test(sync): comprobar la confirmación al perder cambios`.

### Tarea T028 · Compuerta de U5 y de la red congelada

**Archivos:** informe de U5. **Interfaces:** la red pasa por el doble único de API.

1. Corré §0 y todos los E2E con `--repeat-each=3 --retries=0`, usando semáforo y puerto asignados. Registrá cantidad de escenarios, ejecuciones y resultados por repetición; no combines reintentos con la evidencia de estabilidad.
2. Compará `git diff BASE -- qa/e2e/specs`: de los archivos anteriores sólo puede cambiar `account.spec.ts` en `NOTE`, con la decisión 1. Los Page Objects y fixtures pueden ampliarse, pero sin borrar aserciones de red ni listas de error estrechas.
3. Revisá que la exclusión de `quietSync` documenta únicamente casos deliberadamente problemáticos, por título exacto. Probá el mutante de aviso transitorio en un caso normal y el de toast repetido en T024; ambos fallan, y el árbol vuelve a verde al retirarlos.
4. Registrá archivos de prueba nuevos, la ejecución real de shared y F11b o sus dependencias pendientes. Sin esas dependencias puede cerrarse el tramo, no afirmarse cubierta la integración final de todos los caminos. Commit documental si corresponde: `docs(specs): registrar la compuerta de F13 U5`.

## 6. U6 · Documentación y cierre

### Tarea T029 · Documentar los dueños y cómo probarlos

**Archivos:** modificar `docs/architecture.md` y `qa/AGENTS.md`; actualizar la evidencia de `quickstart.md` de esta feature, sin alterar requisitos de la spec.

**Interfaces:** documentación, sin cambios de producción. Consume resultados de U1–U5.

1. En arquitectura agregá `features/progress-sync/ui`, los vigías, composición del shell y la salida en `pages/account`; nombrá los dos contextos y el único motor. Documentá que F13 no lee almacenamiento ni hace pedidos de sincronización.
2. En QA agregá la matriz node/dom/E2E, los stubs de diálogo limitados a jsdom, la lista exacta de casos no silenciosos de `quietSync`, las recargas elegidas y el archivo descargable no importable. La comprobación manual de lector de pantalla queda como paso reproducible, sin atribuirla a Playwright.
3. Comprobá rutas/enlaces y scripts de npm; `git diff --check` limpio. No inventes una prueba de producto para Markdown. Commit `docs(sync): documentar las superficies y su verificación`.

### Tarea T030 · Compuerta final y entrega verificable

**Archivos:** informe de cierre y descripción del PR de implementación; ninguna modificación de código si los checks pasan. **Interfaces:** aceptación FR-047 y SC-001–SC-010.

1. Corré `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `node qa/boot-check.ts`, `node qa/seams-guard-check.ts`, `npm run test:e2e` y `git diff --check`. Corré React Doctor sobre lo cambiado con los comandos de `tools/quality/AGENTS.md`, sin telemetry/supply-chain, 0 errores nuevos. Las instalaciones, si faltan herramientas, sólo offline o con permiso; F13 agrega cero dependencias.
2. Medí `dist/index.html` antes/después en caracteres con quickstart.md; ambos valores y diferencia van al PR, bajo 1 500 000. Contá cero estilos en línea nuevos y compará package/lockfile con T001: sin dependencias nuevas. Revisá el diff entero y el inventario de E2E editados.
3. **Manual, por el usuario:** antes y después de F13, lector de pantalla sobre franja, toast y ambos tipos de diálogo; anotar navegador/lector, aviso recibido una vez por episodio, sin anuncio por cada tecla, foco inicial y devolución a «Salir». Abrí las superficies a 320/390 px y usalas sólo con teclado. Un check automatizado no reemplaza esta evidencia; si falta, el PR lo dice y no se declara cumplido X2.
4. Comprobá las dependencias finales: F11d shared y F11b borrar cuenta tienen sus caminos de T027 ejecutados. El tren no se publica con la nota vieja; si F10b llegó después, se distingue la entrega de U1/U4 de la entrega completa de F13.
5. PR de implementación con título Angular en inglés, contexto/problema, comportamiento final, checks y limitaciones. No se abre ni publica durante la redacción de este plan. Commit documental final si corresponde: `docs(specs): registrar el cierre de F13`.

## Cobertura de requisitos y criterios

Cada fila nombra la tarea que implementa y las que verifican; la spec conserva su historia sin editarse.

| Requisitos | Tareas | Evidencia prevista |
| --- | --- | --- |
| FR-001, FR-002 | T008, T013, T017 | Selectores, APIs públicas, cero transporte/almacenamiento en UI |
| FR-003, FR-004, FR-005, FR-006, FR-008 | T004, T014, T017, T024 | Seis filas literales, pie intacto, punto oculto, cero rol vivo |
| FR-007 | T020, T021 | Tu progreso en la cuenta en todos los anchos |
| FR-009, FR-010, FR-011 | T006, T016, T024 | Fallo una vez, deuda a través de pending, silencio inicial con A3 |
| FR-012, FR-013, FR-014 | T005, T012, T017, T023, T026 | Contenedor estable, orden, sin foco, impresión y silencio |
| FR-015, FR-016 | T012, T015, T026 | Ingreso sólo por clic, misma/otra cuenta y copia |
| FR-017, FR-018 | T003, T012, T026 | Texto de outdated y pérdida en memoria |
| FR-019, FR-020, FR-021, FR-022 | T010, T017, T025 | Causas, inercia, dos Esc, un modal, cero identidad |
| FR-023, FR-024, FR-025, FR-026 | T003, T005, T011, T026 | Época ajena/propia, fecha local, descarga y confirmación |
| FR-027 | T003, T012, T026 | Rechazos acumulados sin motivo técnico |
| FR-028, FR-029 | T003, T005, T012, T024 | ±120000/±150000/60000, entendido por documento |
| FR-030, FR-031, FR-032, FR-033, FR-034 | T019, T020, T021, T022 | Espera, cinco caminos, fracaso sin descarte y nota |
| FR-035, FR-036, FR-037 | T002, T007, T016, T027 | Listener condicional, copia en memoria y recargas elegidas |
| FR-038, FR-039, FR-040, FR-041, FR-042 | T010, T011, T017, T019, T020, T025, T026, T030 | Teclado, foco, 320/390 px, impresión, movimiento y estilos |
| FR-043 | T006, T012, T023, T024, T030 | No repetición, nodos estables, lector de pantalla |
| FR-044, FR-045 | T001–T028 | TDD por tarea, fishery y red cerrada con respuestas del contrato |
| FR-046 | T001, T021, T023, T028 | Red anterior inalterada salvo NOTE aprobada, fixture de silencio |
| FR-047 | T018, T022, T028, T029, T030 | Build, pruebas, lint, formato, tamaño y guías |

| Criterio | Tareas | Límite explícito |
| --- | --- | --- |
| SC-001 | T004, T006, T012, T024 | 6/6 estados, esperados literales |
| SC-002 | T006, T012, T023–T026 | Observación durante toda la prueba; sólo doble al día exige silencio |
| SC-003 | T010, T015, T025, T026 | Snapshot y conteo real de escrituras; no basta leer el valor final |
| SC-004 | T019–T022 | Descargar mantiene pregunta; limpiar sólo tras cierre aceptado |
| SC-005 | T002, T007, T016, T027 | Chromium; no promete soporte de beforeunload en iOS |
| SC-006 | T011, T026 | Descartar copia y cerrar aviso son dos acciones de D1c |
| SC-007 | T003, T005, T012, T024, T026 | Cinco tipos, máximo cuatro coexistentes por estados exclusivos |
| SC-008 | T010–T012, T017, T019–T021, T023, T025, T026, T030 | Automatización más comprobación manual X2 |
| SC-009 | T001, T021, T028 | Excepción NOTE de FR-034, en commit propio aprobado con el plan |
| SC-010 | T018, T022, T028–T030 | 0 dependencias/estilos inline nuevos; HTML menor a 1 500 000 |

## Decisiones recomendadas para aprobar con este plan

1. **La nota del E2E:** reemplazar únicamente `NOTE` de `account.spec.ts`, en su commit TDD propio (T021), porque FR-034 exige una nota que FR-046 congela indirectamente. No cambiar escenarios de F1/F10 ni otras aserciones.
2. **El tren:** D1c U3 → U4 → U5 → F13 U1 → U4 → F11d U9 → U10, apilados y sin publicar estados intermedios. U2/U3/U5 de F13 esperan F10b. Esta inserción precisa la secuencia de los planes mergeados #93/#97, sin invertirla.
3. **Descargar al salir:** mantiene la pregunta abierta; sólo «Salir sin enviarlos» responde `discard`. Protege de un cierre/descarte implícito tras una descarga y conserva los cinco caminos de SC-004.

El coordinador confirmó estas recomendaciones el 2026-11-02 para la revisión del usuario en el PR del plan; mergearlo acepta las recomendadas. No es autorización para publicar implementación desde este carril.

## Lo que sigue sin verificarse al planificar

- No se ejecutaron build, Vitest, E2E, React Doctor, Docker ni el producto: esto es redacción sobre contratos de implementaciones que todavía no están en esta base. T001 mide sus cifras reales y detecta APIs faltantes; no se inventa un conteo base.
- Ningún paso de implementación de T001–T030 se marca hecho en tasks.md por haber escrito el plan.
- La compatibilidad efectiva con F10b/F11a/D1c y la lectura de archivos descargados se verifican al ejecutar cada tarea. El helper de fechas se consulta con huso explícito en tests, no depende de la máquina.
- La prueba manual con lector de pantalla requiere al usuario, antes y después de la franja. El comportamiento nativo de diálogos/beforeunload requiere Chromium; jsdom no lo acredita.
- Los otros llamadores de `reauthenticate` (F8, F11b y F12a) no reciben automáticamente «Cambiaste de cuenta» por este plan: R8 lo limita al ingreso desde la franja. Se registra como hallazgo de coordinación, y no se modifica código ajeno silenciosamente.
- El alcance de F13 no cambia intentos, fusión, cola, caducidad ni formato del archivo: pertenecen a D1c. La copia descargada no se puede importar.

## Análisis de consistencia

Resultado del contraste final del 2026-11-02: 47/47 FR y 10/10 SC tienen tarea y evidencia prevista; 30 tareas, 7 unidades contando U0. No quedan tareas huérfanas ni marcadores de implementación indefinida. Las tres decisiones anteriores son recomendaciones visibles para aprobación del usuario; las discrepancias de contratos y límites de las pruebas se explican en research.md y no se disfrazan de comportamiento verificado. El informe de esta redacción distingue esas verificaciones documentales de las compuertas futuras de implementación.
