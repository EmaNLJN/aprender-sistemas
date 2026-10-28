# Implementation Plan: F8 · El port de Método

**Branch**: `022-f8-metodo` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input:** la spec de F8 con su clarify (Q1 a Q4 y L7) y las lecturas L1 a L12. Decisiones y consultas: [research.md](./research.md). Interfaces: [contracts/method-interfaces.md](./contracts/method-interfaces.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md).

**Objetivo:** que Método sea una página de React que el alumno no distinga de la de hoy, salvo «Borrar todo», que pasa a pedir la contraseña y a borrar también el progreso de la cuenta en el servidor.

**Arquitectura:**

- **La página.** `pages/method` se monta con un adaptador mínimo, `window.TallerMethod`, sobre `#main`, como el Atlas. Lee el recorrido de `routeStore` en cada render y avisa por el `toast` del shell.
- **El armado.** `features/progress-backup` se arma una sola vez en `app/progress-backup/`, después de la compuerta. Lo usan «Exportar mi progreso» de la barra lateral, por el `startApp(progressBackup)` nuevo, y la página.
- **«Borrar todo».** Confirma la contraseña, lee la época y pide el reset con el cliente de F11a, y sólo con el 200 hace el borrado local de hoy.

**Stack:**

- **Ya instalado:** TypeScript y React 19.2.8 con Vite 8.3.2, Zustand 5.0.15, y React Hook Form 7.89.0, `shared/ui/form`, el cliente de la API y «pedir el ingreso», de F11a.
- **Las pruebas:** Vitest 5.0.3 con jsdom y Testing Library (de F11a), y Playwright 1.63.0 con el doble de la API de F11a.
- **Ninguna dependencia nueva.**

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T023) y remite acá.
> - **La base.** Es `master` con F2a, A2, F2b y F11a. F8 se implementa después de F11a.
> - **Lo condicional.** Si F3, F4, F5 o F9 entraron antes, cambian piezas compartidas. T001 lo detecta, y la sección «Ramas» dice qué hacer en cada caso.
> - **El código verificado.** Ninguno: se planificó leyendo `master` (`a24154d4`) y el plan de F11a, sin correr nada. Lo que el plan no pudo medir está en research.md, «Lo que leyó el plan y no pudo correr», y cada tarea lo comprueba en su compuerta.

## Summary

F8 porta Método en seis unidades, dentro de un solo PR (FR-006; research.md, R1):

- **U0:** la línea base y la detección de lo compartido.
- **U1:** los E2E de Método contra el legacy, en verde, y los tres de React (X1 y Q4), en rojo.
- **U2:** las 24 reglas de CSS de Método van a `method.css` sobre el DOM legacy, con el barrido de estilo y el multiconjunto en 0.
- **U3:** el port, con el «Borrar todo» local de hoy:
  - el modelo y la página con sus specs;
  - el armado en `src/app/` con R4 ampliada (L10);
  - los checks de `qa/` con entradas virtuales;
  - el corte de `app.js` y de `index.html`.
- **U4:** «Borrar todo» con el servidor: primero el rojo de los E2E, después la feature con su paso del servidor optativo, el paso en el armado y la confirmación con la contraseña.
- **U5:** las comparaciones únicas, la documentación, el peso y el PR.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; JavaScript en `frontend/app.js` (legacy); Node 24.

**Primary Dependencies**:

- **Nuevas:** ninguna (FR-003).
- **Ya instaladas:**
  - React y `react-dom` 19.2.8, y Zustand 5.0.15;
  - de F11a: React Hook Form 7.89.0, la pila de DOM de Vitest y fishery.

**Storage**: las cuatro claves v1 de hoy. No cambia su forma, su orden ni su versión.

**Testing**:

- Vitest: `*.spec.ts` en el proyecto `node` y `*.spec.tsx` en el de DOM que dejó F11a;
- los checks de `qa/`;
- Playwright con Page Objects contra `vite preview` y el doble de la API.

Los valores esperados salen de `frontend/app.js` de la base, de `content/guide/`, de las fixtures congeladas, de `backend/api/lang/es/api.php` y de los contratos de C3a, D1a y D1b.

**Target Platform**: navegador moderno (ES2020), servido por Nginx; Linux y macOS.

**Project Type**: aplicación web; port de una vista legacy.

**Performance Goals**: ninguna de velocidad. El peso de `dist/index.html` tiene presupuesto (R13).

**Scale/Scope**:

- 17 archivos nuevos de producción en `frontend/src/`;
- 7 specs nuevas de Vitest y 2 ayudas de specs;
- 5 E2E nuevos con su Page Object;
- cambios en `app.js`, `index.html`, `styles.css`, `main.tsx`, `legacy-views.ts`, la feature y 12 archivos de `qa/`.

## Restricciones globales

Valen para toda tarea. Los valores salen de la spec y de la constitución.

- **La red sin editar:**
  - los 106 E2E de F1 y los 17 de A2;
  - los de F11a;
  - los de F3, F4, F5 y F9 que no sean «Borrar todo».

  Los E2E nuevos de U1 pasan sin editarse sobre la página nueva (FR-001), salvo los que cambian a propósito en U4 (lista de T014).
- **Los checks** cambian sólo cómo cargan o qué observan (FR-041). Cada escenario que se retira o se mueve figura en la tabla de §3.9.
- **El marcado:** `index.html` pierde sólo `<dialog id="confirm-dialog">…</dialog>` y `<input id="import-file" …>` (FR-012).
- **El archivo exportado:**
  - el nombre `taller-progreso-AAAA-MM-DD.json` (la fecha UTC de `toISOString`);
  - `application/json`;
  - `JSON.stringify(…, null, 2)`;
  - las claves en este orden: `version`, `language`, `completed`, `milestones`, `favorites`, `quizAnswers`, `notes`, `minutes`, `lab`, `campaign`, `systems` y `exportedAt` (FR-016).
- **Las escrituras** (FR-032):
  - una de `taller-learning-v1` por tecla de la bitácora;
  - ninguna al montar, desmontar, copiar, exportar, descargar un respaldo, abrir o cancelar la confirmación, ni en un «Borrar todo» que el servidor no confirmó.
- **El estilo:**
  - ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` en lo que dibuja la página;
  - la única excepción es el campo temporal de la copia, que conserva `style.position` y `style.top` (FR-036);
  - ninguna regla nueva salvo `.routine-note` (SC-005).
- **La seguridad:**
  - la contraseña no va a `localStorage`, la URL, el store de la sesión ni la consola;
  - el formulario se envía sólo por `handleSubmit`, con `noValidate` y sin `action` (F11 FR-024);
  - las notas y las fuentes se muestran como texto, nunca con `dangerouslySetInnerHTML`.
- **Los textos.** Los de hoy (§4.0) y los nuevos de la spec, tal cual:
  - **L8:**
    - «Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos lenguajes en este navegador y en tu cuenta. Podés exportarlos antes.»;
    - «No se borran el historial de tus ejecuciones ni las copias que importaste: quedan en el servidor el tiempo que dice el aviso de privacidad. Para borrarlos, borrá tu cuenta desde «Tu cuenta».»;
    - el campo «Tu contraseña»;
    - el botón «Borrando…» durante la espera.
  - **L5:** «Tu progreso de la cuenta se acaba de borrar desde otra pestaña o dispositivo. No se borró nada de este navegador: si querés, volvé a confirmar.»
  - **L6:** «No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.»
- **El servidor:**
  - `POST /api/auth/confirm-password` con `{password}` y `X-Taller-User`;
  - `GET /api/progress`;
  - `POST /api/progress/reset` con `{format: 2, epoch}` y `X-Taller-User`;
  - el CSRF lo pone el cliente de F11a.

  Ninguna respuesta que no sea el 200 del reset borra nada local (FR-024).
- **El peso:** `dist/index.html` bajo 1 250 000 caracteres. F8 suma como mucho +9 000 sobre la medida de T001 (R13).
- **La complejidad:**
  - ninguna función nueva pasa de 10;
  - la cuenta de avisos de `npm run lint` no sube respecto de T001: 35 en F2b, y si F11a sumó alguno, manda T001;
  - `render()` de `app.js` sube exactamente 1, por el `if` del montaje, como en F4.
- **La accesibilidad:**
  - el orden de tabulación de hoy;
  - Enter y Espacio en los botones;
  - Tab y Mayús+Tab dentro de la confirmación;
  - ninguna animación nueva;
  - el diseño de 590 px (FR-038).

## Constitution Check

*Compuerta:* cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Pasa antes y después del diseño. Complexity Tracking registra tres decisiones.

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules; un componente por archivo con `export default`; `interface` para las formas; Zustand con selector; sin nuqs, sin stores nuevos y sin barrels |
| II. TDD y pruebas útiles | Sí | E2E contra el legacy antes de portar; cada módulo nuevo empieza con su spec en rojo; los valores esperados salen de la base, de las fixtures y de `lang/es/`, nunca del código que se prueba |
| III. Código entendible | Sí | El modelo, la página, el armado y el paso del servidor separados, cada uno con una responsabilidad; la traducción de las fallas es una tabla con su spec |
| IV. Contenido en Git, IDs estables | Sí | Las claves, las formas, el archivo y las URL no cambian |
| V. Capas y contratos explícitos | Sí | `pages/method` lee de `entities/guide` y usa la feature y `shared/ui/form`; `app/` compone; R4 se amplía para un solo archivo, con su motivo y sus pruebas |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de hoy y los de la spec; el teclado y el foco con E2E; los comandos son portables |
| VII. Secretos y salidas fuera de Git | Sí | Ninguna salida nueva; la contraseña de los E2E es de prueba y vive en `qa/e2e/lib/method-files.ts` |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea; T001 anota la línea base en research.md, como F11a |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica el plan | Dónde |
| --- | --- | --- |
| **Q1:** «Borrar todo» con el reset del servidor y la contraseña | `serverReset` en la feature, armado en `app/progress-backup/server-reset.ts` con el cliente y `reauthenticate` de F11a; la confirmación con React Hook Form | U4 |
| **Q2:** el armado en `src/app/` y `startApp(progressBackup)` | `app/progress-backup/` con `appProgressBackup()`; `legacy-views.ts` lo arma y se lo pasa; regla de orden en «Ramas» | T008, T009, T013 |
| **Q3:** la guarda general es de D1c | F8 sólo muestra la espera de su propio pedido | T017, T018 |
| **Q4:** `#note-state` como haría React | Un `useState` de `JournalPanel` que importar y «Borrar todo» no tocan; E2E en rojo | T004, T011 |
| **L7:** las claves v1 se borran como hoy hasta D1c | El borrado local de hoy, sin cambios, después del 200 | T016 |
| **X1, X2, X3 y F9-Q4** | El foco se queda o vuelve, sin regiones vivas nuevas; el CSS se muda; la confirmación en un portal | T004, T005, T011 |

## Project Structure

### Documentation (this feature)

```text
specs/022-f8-metodo/
├── spec.md                          # la spec, con su clarify
├── research.md                      # decisiones R1 a R14, consultas y lo que no se verificó
├── plan.md                          # este archivo
├── quickstart.md                    # la línea base, las compuertas, el barrido, la comparación única y el peso
├── contracts/method-interfaces.md   # las interfaces de F8
└── tasks.md                         # T001 a T023
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/
├── app.js                                       # cambia (K, T005 y T013): el corte y startApp(progressBackup)
├── styles.css                                   # cambia (K, T005): salen las 23 reglas de Método
└── src/
    ├── index.html                               # cambia (K, T013): salen el diálogo y el campo de archivo
    ├── app/
    │   ├── main.tsx                             # cambia (K, T005): importa method.css
    │   ├── singletons-import.spec.ts            # cambia (A, T008): un caso para el armado
    │   ├── boot/legacy-views.ts                 # cambia (K, T013): el adaptador, el armado y la llamada
    │   ├── legacy/register-method.tsx           # nuevo (K, T013; T018 le suma reloadDocument)
    │   └── progress-backup/                     # nuevo (A)
    │       ├── progress-areas.ts (+ .spec.ts)   # las áreas, puras
    │       ├── server-reset.ts (+ .spec.ts)     # el paso del servidor (U4)
    │       └── app-progress-backup.ts           # la única instancia
    ├── features/progress-backup/
    │   ├── model/types.ts                       # cambia (A, T009): los tipos de Q1
    │   ├── model/create-progress-backup.ts      # cambia (A, T016): resetWithServer
    │   ├── model/progress-backup-edges.spec.ts  # nuevo (Q, T012; A, T015 le suma el paso)
    │   └── index.ts                             # cambia (A, T009): los tipos nuevos
    ├── pages/method/                            # nuevo (M)
    │   ├── index.ts
    │   ├── model/method-texts.ts (+ .spec.ts)   # el pedido, el estado de la nota y el tamaño
    │   ├── model/write-note.ts (+ .spec.ts)     # la escritura de una tecla
    │   ├── lib/copy-with-fallback.ts            # la copia con sus dos respaldos
    │   └── ui/
    │       ├── MethodPage.tsx, MethodIntro.tsx, JournalPanel.tsx, TutorPanel.tsx
    │       ├── SourcesPanel.tsx, BackupsPanel.tsx, ProgressPanel.tsx, ResetDialog.tsx
    │       ├── method.css                       # (K, T005)
    │       ├── progress-backup-double.ts        # ayuda de las specs
    │       ├── render-method.tsx                # ayuda de las specs
    │       ├── method-page.spec.tsx             # (T010)
    │       └── reset-dialog.spec.tsx            # (T017)
    └── shared/
        ├── lib/download-file.ts                 # cambia (K, T013): downloadJsonFile
        └── ui/form/TextField.tsx, PasswordField.tsx   # cambian (M, T018): readOnly
qa/
├── lib/seams-guard.ts                           # cambia (A, T009): R4 ampliada
├── seams-guard-check.ts                         # cambia (A, T008): tres escenarios
├── lib/sources.ts                               # cambia (Q, T012): runEntry, expose y la expresión del arranque
├── lib/legacy-sources.ts                        # cambia (Q, T012): la entrada virtual del shell
├── lib/app-shell-harness.ts                     # cambia (Q, T012 y T013)
├── app-shell-check.ts                           # cambia (Q, T012; K, T013)
├── lib/boot-harness.ts                          # cambia (K, T013; Q, T019)
├── boot-check.ts                                # cambia (Q, T012; K, T013; Q, T019)
├── lib/app-adapters.ts                          # cambia (K, T013): TallerMethod
├── lib/content-server.ts                        # cambia (Q, T019): las tres rutas de la API
├── load-order-check.ts                          # cambia (K, T005 y T013)
└── e2e/
    ├── pages/method.ts                          # nuevo o ampliado (E, T002 y T014)
    ├── fixtures/index.ts                        # cambia (E, T002): la fixture method
    ├── fixtures/api-double.ts                   # cambia (E, T014): las tres rutas por omisión
    ├── lib/api-contract.ts                      # cambia (E, T014): los mensajes
    ├── lib/method-files.ts                      # nuevo (E, T002)
    └── specs/method-journal, method-files, method-reset, method-kept-state y method-reset-server (.spec.ts)
docs/architecture.md, qa/AGENTS.md               # cambian (K, T022)
```

**Structure Decision:** la página es un slice de `pages/`, como el Atlas. El armado vive en `app/`, que es la capa que compone. La feature gana un puerto, `serverReset`, sin importar el cliente ni F11 (FR-015). Ningún slice importa un archivo interno de otro, salvo las ayudas de specs de F11a (`fake-fetch.ts` y `api-error.factory.ts`), que se importan por ruta sólo desde specs, como pide su plan.

## Review Focus

**Lo que el revisor mira primero:**

- **El orden de «Borrar todo».** Los tres pedidos, el borrado local sólo con el 200, el `save()`, el cierre, el estado en blanco y el aviso.
- **Que nada local se borre ante una falla.** Lo cubren el E2E de T014 con las claves antes y después, la spec de `server-reset` y la de `progress-backup-edges`.
- **La única instancia.** `appProgressBackup()` la llaman sólo `legacy-views.ts` y, en `boot-check`, la entrada expuesta. `app-shell-check` arma la suya con áreas falsas, del mismo bundle que `app.js`.
- **R4 ampliada para un solo archivo,** con sus tres escenarios.
- **La red sin editar,** y la lista de E2E que cambian a propósito en U4.
- **El CSS:** 0 diferencias en el barrido y `onlyUnit` 1 en el multiconjunto.
- **El peso** y la cuenta de avisos.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba.** Cada caso suma su prueba en la tarea dueña:

1. **Otra pestaña guarda entre dos teclas.**
   - El caso: `routeStore.save()` fusiona y el estado vivo cambia de objeto. La bitácora tiene que mostrar lo fusionado y escribir una sola vez por tecla (spec, casos borde; FR-031).
   - La prueba: la spec de la página escribe en la memoria del almacenamiento entre dos teclas y exige la nota de la otra pestaña en el otro campo, sin perder lo tecleado (T010, «Review Focus 1»).
2. **Esc dos veces con el pedido retenido.**
   - El caso: el botón que tenía el foco se deshabilita, así que el foco cae al documento y el `keydown` no pasa por el diálogo. El segundo Esc, sin una activación de por medio, puede cerrar un `<dialog>` modal aunque se frene `cancel` (research.md, R7).
   - La prueba: el E2E de T014 aprieta Esc dos veces y exige la confirmación abierta. T018 lo resuelve con un oyente de `keydown` en captura sobre `document` mientras dura la espera.
3. **Un 419 entre la confirmación y el reset.**
   - El caso: el token vence entre dos pedidos. El cliente de F11a renueva y reintenta una vez, y el paso tiene que terminar con un solo reset.
   - La prueba: la spec de `server-reset` encola 201, 200, 419, la sesión y 200, y exige `confirmed: true` con un único reset que funcionó (T015).
4. **Doble clic en «Borrar todo» con la contraseña escrita.**
   - El caso: el botón todavía no se deshabilitó.
   - La prueba: la spec del diálogo hace dos clics seguidos y exige una sola llamada a `resetAll` (T017).
5. **El texto del archivo llega sin tocar.**
   - El caso: FR-017 pide que el texto llegue a `planImport` sin recortar ni recodificar.
   - La prueba: la spec de la página sube un archivo con espacios y un salto de línea alrededor del JSON y exige ese texto exacto en `planImport` (T010).

## Reparto en paralelo

**Los dueños,** con archivos disjuntos:

| Dueño | Qué hace |
| --- | --- |
| K, el coordinador | U0, el CSS y `main.tsx`, el corte, las compuertas, la documentación y el PR |
| E | Los E2E |
| M | El modelo, la página y la confirmación |
| A | El armado, la feature, el paso del servidor y el guard |
| Q | Los checks de `qa/` |

**Las ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 |
| 1 | E | T002, T003 y T004 (U1) |
| 2 | K, M y A a la vez | **K:** T005 (U2). **M:** T006, T007, T010 y T011. **A:** T008 y T009 |
| 3 | Q | T012, desde S1 |
| 4 | K | T013 y la compuerta de U3 |
| 5 | E, A, M y Q a la vez | **E:** T014. **A:** T015 y T016. **M:** T017 y T018. **Q:** T019 |
| 6 | K | T020 (compuerta de U4) |
| 7 | K | T021, T022 y T023 |

**Puntos de sincronización:**

- **S1:** A entregó T009 (`progress-areas.ts` existe), y Q parte de ahí.
- **S2:** M entregó T011 y Q entregó T012, y K corta en T013.
- **S3:** en U4, K integra primero los rojos, T019, T014, T015 y T017, y después T016 y T018. Como T019 entra antes que T016, `boot-check` nunca corre un «Borrar todo» con el paso del servidor y sin las rutas de la API en su servidor de contenido.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173` y E `4194`.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md`, el ADR 0008 y la constitución;
  - la spec, research.md, el contrato y tu tarea;
  - las skills `tdd`, `clean-code` y `vitest`;
  - si escribís componentes, también `react-testing` y las de Vercel;
  - si escribís E2E, también `playwright-best-practices`.
- **TDD, siempre:**
  - Un módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Imports:**
  - un slice se importa por su `index.ts`, y dentro de tu slice, por ruta directa;
  - `app/` importa `app/content/content` y `app/account/*` por ruta.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>` y `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck` y `npm run lint`;
  - `npx prettier --write <tus archivos>` antes de cada commit, y después `npm run format:check`. El código de este plan respeta las reglas, pero no el ancho de línea de Prettier;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- <archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo:**
  - Código, nombres de test y comentarios en inglés. La interfaz, en español rioplatense, con el texto exacto de este plan.
  - **Sin comentarios.** Los únicos permitidos son los que este plan escribe en el código.
  - Un componente por archivo, declarado como `const`, con `export default` al final. Las funciones, con exports nombrados.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(e2e): …`, `test(front): …` o `test(qa): …` para lo que está en rojo;
  - `feat(front): …` para lo que cambia a propósito;
  - `refactor(front): …` o `refactor(qa): …` para lo que no cambia el comportamiento;
  - `style(front): …` para el CSS;
  - `docs: …` para la documentación.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## Ramas: lo que cambia si otro ítem entró antes

T001 corre las detecciones de quickstart.md, §1.2, y anota cada fila como «está» o «falta». Cada tarea condicional sigue esta tabla. Si una pieza está, se usa la de la base con sus nombres, y lo que este plan escribe para ese caso se adapta a ellos sin cambiar el comportamiento.

| Pieza | Detección | Si falta | Si está |
| --- | --- | --- | --- |
| **B1.** La suscripción del shell | `git grep -n "routeStore.changes.subscribe(" -- frontend/app.js` | T013 la crea con `syncShell` | Con `updateSaveLabel`, T013 la cambia por `syncShell`. Con `syncShell`, no se toca, y el escenario rojo de T012 nace verde: se anota |
| **B2.** La entrada virtual de `app-shell-check` (F3) | `git grep -n "routeStore" -- qa/lib/legacy-sources.ts` | T012 la crea | T012 le suma las líneas de `createProgressBackup` y `createProgressAreas` |
| **B3.** `REACT_VIEWS` o la lectura del texto de React en `boot-check` (F3, F9) | `git grep -n "REACT_VIEWS\|renderedText\|drawnText" -- qa` | T013 crea `REACT_VIEWS` y `renderedText` | T013 suma `'metodo'` y usa la ayuda que haya |
| **B4.** `qa/e2e/pages/method.ts` (F5, F9) | `test -f qa/e2e/pages/method.ts` | T002 lo crea | T002 lo reemplaza por el de este plan, que conserva `resetProgress()` y `confirmReset()` con sus mismos localizadores |
| **B5.** `resetSimulations` en la API de `pages/systems` (F5) | `test -f frontend/src/pages/systems/index.ts` | El armado lee `window.TallerSystems?.resetSimulations()` | Ver «Rama F5» |
| **B6.** `focusTimer` en `pages/route` (F9) | `git grep -n "focusTimer" -- frontend/src/pages/route/index.ts` | `startApp()` registra el temporizador con `registerSessionReset` | Ver «Rama F9» |
| **B7.** Los bloques compartidos de CSS ya partidos (F3, F4, F9) | `git log --oneline -- frontend/styles.css` desde `a24154d4` | T005 parte los suyos | T005 rebasa y borra sólo lo suyo, por texto |
| **B8.** E2E de «Borrar todo» de otros ítems (F5, F9) | `git grep -ln "confirmReset()" -- qa/e2e/specs` | — | T014 los cambia a `method.resetEverything()`, como cambio a propósito |
| **B9.** El proyecto de DOM de Vitest | `git grep -n "projects" -- frontend/vitest.config.ts` | No puede faltar: F8 entra después de F11a. Si falta, T001 para | Los `*.spec.tsx` corren ahí |
| **B10.** El contenido por la API (A3) | `git grep -n "api.on('GET /api/" -- qa/e2e` | — | Los E2E de F8 ya filtran los pedidos a las tres rutas de progreso y miran sólo las claves de progreso, así que no cambian. Los scripts de quickstart.md, §3, responden el contenido como el doble de esa base (ver «Rama A3») |

**Rama F5** (B5 está):

- **T009:**
  - si no existe, crea `frontend/src/pages/systems/session.ts` con `export { resetSimulations } from './model/systems-session';`, la entrada sin motor que previó el plan de F5;
  - en `app-progress-backup.ts`, la línea del paso pasa a `const sessionResets: (() => void)[] = [resetSimulations];`, con `import { resetSimulations } from '../../pages/systems/session';`;
  - `LegacyProgressWindow.TallerSystems` queda con `sync` solo.
- **T013:**
  - `resetSimulations` sale del objeto que publica `frontend/src/app/legacy/register-systems.tsx`, de `APP_ADAPTER_METHODS.TallerSystems` en `qa/lib/app-adapters.ts` y de `RESET_METHODS` en `qa/boot-check.ts`;
  - en `app-shell-harness.ts`, el paso de sesión de `progressBackupFor` desaparece, porque el adaptador falso ya no lo tiene.

  La correspondencia: lo cubren `systems-session.spec.ts` de F5 y el E2E de «Borrar todo» de F5. La verificación: `git grep -n "resetSimulations" -- frontend/src/app/legacy qa/lib/app-adapters.ts` no imprime nada (US6-4).

**Rama A3** (B10 está): `vite preview` ya no publica el contenido sin la API. En los dos scripts de quickstart.md, §3.1(b) y §3.2, las dos rutas de la sesión se reemplazan por un `context.route('**/api/**', …)` que responde lo mismo que el doble de los E2E de esa base: `installDefaults` y las porciones que sume A3, copiadas al script.

**Rama F9** (B6 está):

- **T009:** `app-progress-backup.ts` suma `import { focusTimer } from '../../pages/route';`. Los pasos pasan a ser `[() => legacyWindow().TallerSystems?.resetSimulations(), () => focusTimer.reset()]`, o `[resetSimulations, () => focusTimer.reset()]` con la rama F5. `AppProgressBackup` y `registerSessionReset` no se escriben: `appProgressBackup()` devuelve `ProgressBackup`.
- **T012:** `ShellProgressBackup` pierde `registerSessionReset`, y `progressBackupFor` devuelve la instancia de la feature tal cual.
- **T013:**
  - el paso `() => window.TallerRoute?.resetTimer()` se va con el armado de `app.js`, y no se agrega `progressBackup.registerSessionReset(…)`;
  - `resetTimer` sale de `register-route.tsx`, de `APP_ADAPTER_METHODS.TallerRoute` y de `RESET_METHODS`;
  - el escenario de T019 no lista `TallerRoute.resetTimer`.

  La correspondencia: lo cubren la spec del temporizador de F9 (`reset()` vuelve a reposo) y su E2E de «Borrar todo». La verificación: `git grep -n "resetTimer" -- frontend qa` no imprime nada (US6-4).

## 0. U0 · La línea base (K, onda 0)

### Tarea 0.1 · La línea base y la detección (T001, K)

**Cubre:** FR-004 (la medida inicial), FR-005 (los avisos) y FR-043 (qué entró antes).

1. **Crear la rama** `f8/metodo` desde `master`, que tiene que incluir F11a. Si `frontend/src/app/account/api-client.ts`, `frontend/src/shared/ui/form/index.ts` o `qa/e2e/fixtures/api-double.ts` faltan, pará: F8 espera a F11a.
2. **Medir,** con los comandos de quickstart.md, §1.1:
   - el tamaño de `dist/index.html`;
   - la cuenta de avisos de complejidad;
   - el valor de `render()` de `app.js`;
   - los conteos de `npm test` (checks, escenarios de `app-shell-check` y `boot-check`, y pruebas de Vitest);
   - los E2E en verde.
3. **Detectar** las piezas B1 a B10 de «Ramas», con quickstart.md, §1.2.
4. **Anotar** en research.md una sección nueva al final, «Línea base de la implementación», con:
   - el SHA de la base;
   - cada medida;
   - la tabla B1 a B10 con «está» o «falta».
5. **Commit:** `docs(specs): línea base de F8 y lo que trae la base`.

**Compuerta de cada unidad** (K, al cerrar U1 a U5). Son los pasos de quickstart.md, §2:

- `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`;
- `E2E_PORT=4173 npm run test:e2e`, dos veces seguidas con `--repeat-each=2 --retries=0`;
- la cuenta de avisos;
- el tamaño del HTML.

Lo que esté en rojo a propósito figura en la tabla de la unidad.

## 1. U1 · Los E2E de Método contra el legacy (E, onda 1)

**Cubre:** FR-001, FR-040; SC-002 y SC-003 contra el legacy; US1 a US5 (las cuatro rarezas con `KNOWN DEFECT`).

### Tarea 1.1 · El Page Object, su fixture y los archivos (T002, E)

**Archivos:** `qa/e2e/pages/method.ts`, `qa/e2e/lib/method-files.ts` y `qa/e2e/fixtures/index.ts`.

**Produce:** `MethodPage` y `method-files.ts` (contrato, §7), sin `password` ni `resetEverything`, que llegan en T014.

1. **`qa/e2e/pages/method.ts`.** Si existe (B4), se reemplaza entero por este, que conserva `resetProgress()` y `confirmReset()` con sus localizadores:

   ```ts
   import type { Download, Locator, Page } from '@playwright/test';
   import type { FilePayload } from '../lib/method-files';

   export class MethodPage {
     readonly learnedNote: Locator;
     readonly nextNote: Locator;
     readonly noteState: Locator;
     readonly tutorPrompt: Locator;
     readonly confirmation: Locator;

     constructor(readonly page: Page) {
       this.learnedNote = page.getByRole('textbox', { name: 'Lo que entendí / lo que todavía me cuesta' });
       this.nextNote = page.getByRole('textbox', { name: 'La próxima vez voy a…' });
       this.noteState = page.locator('#note-state');
       this.tutorPrompt = page.locator('#tutor-prompt');
       this.confirmation = page.getByRole('dialog', { name: '¿Borrar tu progreso?' });
     }

     journalHeading(language: 'Rust' | 'Go'): Locator {
       return this.page.getByRole('heading', { name: `Tu bitácora de ${language}.`, exact: true });
     }

     button(name: string): Locator {
       return this.page.getByRole('button', { name, exact: true });
     }

     resetProgress(): Locator {
       return this.page.getByRole('button', { name: 'Borrar mi progreso' });
     }

     confirmReset(): Locator {
       return this.confirmation.getByRole('button', { name: 'Borrar todo' });
     }

     keepProgress(): Locator {
       return this.confirmation.getByRole('button', { name: 'Conservar mi avance' });
     }

     backupItem(key: string): Locator {
       return this.page.getByRole('listitem').filter({ hasText: key });
     }

     downloadBackup(area: string, key: string): Locator {
       return this.page.getByRole('button', { name: `Descargar respaldo de ${area}: ${key}`, exact: true });
     }

     async exportFromPage(): Promise<Download> {
       const download = this.page.waitForEvent('download');
       await this.button('Exportar progreso').click();
       return download;
     }

     async exportFromSidebar(): Promise<Download> {
       const download = this.page.waitForEvent('download');
       await this.page.getByRole('button', { name: 'Exportar mi progreso' }).click();
       return download;
     }

     async importFile(file: string | FilePayload): Promise<void> {
       const chooser = this.page.waitForEvent('filechooser');
       await this.button('Importar una copia').click();
       await (await chooser).setFiles(file);
     }
   }
   ```

2. **`qa/e2e/lib/method-files.ts`:**

   ```ts
   import { readFile } from 'node:fs/promises';
   import { resolve } from 'node:path';
   import type { Download } from '@playwright/test';

   const root = resolve(import.meta.dirname, '../../..');
   const TEN_MEGABYTES = 10 * 1024 * 1024;

   export interface FilePayload {
     name: string;
     mimeType: string;
     buffer: Buffer;
   }

   export const FROZEN_EXPORTS = {
     master2a278ad: resolve(root, 'qa/fixtures/progress-master-2a278ad-export.json'),
     d0e1b49: resolve(root, 'qa/fixtures/progress-d0e1b49-export.json'),
   } as const;

   export async function downloadedText(download: Download): Promise<string> {
     return readFile(await download.path(), 'utf8');
   }

   function jsonFile(name: string, text: string | Buffer): FilePayload {
     return { name, mimeType: 'application/json', buffer: Buffer.from(text) };
   }

   export function brokenJsonFile(): FilePayload {
     return jsonFile('roto.json', '{"version": 1, ');
   }

   export function oversizedFile(): FilePayload {
     return jsonFile('enorme.json', Buffer.alloc(TEN_MEGABYTES + 1, 0x20));
   }

   export function version2File(): FilePayload {
     return jsonFile('version-2.json', JSON.stringify({ version: 2 }));
   }

   export function routeFile(route: Record<string, unknown>): FilePayload {
     return jsonFile('copia.json', JSON.stringify(route));
   }
   ```

3. **`qa/e2e/fixtures/index.ts`:**
   - suma `import { MethodPage } from '../pages/method';`;
   - suma `method: MethodPage;` en `interface Fixtures`;
   - después de la fixture `atlas`, suma `method: async ({ page }, use) => use(new MethodPage(page)),`.

   Si la fixture ya existe (B4), no se toca.
4. **Correr** `npm run typecheck` y `npm run lint`.
5. **Commit:** `test(e2e): el Page Object de Método y los archivos de importación`.

### Tarea 1.2 · Los flujos de Método, en verde contra el legacy (T003, E)

**Archivos:** `qa/e2e/specs/method-journal.spec.ts`, `method-files.spec.ts` y `method-reset.spec.ts`.

**Consume:** T002, `StorageControl`, `ShellPage` y `frozenProgress`.

1. **`qa/e2e/specs/method-journal.spec.ts`** (US1, US5-2 y US5-3):

   ```ts
   import { expect, test } from '../fixtures';
   import { frozenProgress } from '../lib/curriculum';
   import { routeFile } from '../lib/method-files';
   import { urls } from '../lib/urls';

   const AUTOMATIC = 'Tus notas se guardan automáticamente en este navegador.';
   const SAVED = 'Guardado. Tu próxima sesión ya tiene un punto de partida.';
   const UNAVAILABLE = 'El guardado no está disponible. Exportá tu avance al terminar.';
   const NOT_SAVED = 'No se pudo guardar. Exportá tu avance al terminar.';
   const DEFAULT_NEXT = 'elegir un desafío pequeño del recorrido.';
   const OWNERSHIP_NOTE = 'Entendí ownership con un ejemplo propio.';

   function tutorPrompt(language: string, minutes: number, next: string): string {
     return `Estoy aprendiendo ${language} y ya sé programar. Me interesan los sistemas y el rendimiento. Tengo ${minutes} minutos. Trabajemos un concepto con un ejercicio pequeño relacionado con archivos, memoria o redes.\n\nPrimero pedime predecir qué va a pasar y justificarlo. Esperá mi intento. Después dame una pista por vez, sin escribir ni modificar mi solución.\n\nCuando aparezca una duda de API, consultá Context7 o documentación oficial y enlazá la fuente. Si no tenés acceso, decímelo. Al terminar, pedime resolver una variante y explicar qué aprendí.\n\nMi próximo paso: ${next}`;
   }

   test.describe('the journal', () => {
     test('starts empty in Rust and says that the notes are saved automatically', async ({ shell, method }) => {
       await shell.goto(urls.view('metodo'));
       await expect(method.journalHeading('Rust')).toBeVisible();
       await expect(method.learnedNote).toHaveValue('');
       await expect(method.nextNote).toHaveValue('');
       await expect(method.noteState).toHaveText(AUTOMATIC);
       await expect(method.tutorPrompt).toHaveText(tutorPrompt('Rust', 25, DEFAULT_NEXT));
     });

     test('writes once per keystroke, updates the status and the prompt, and keeps the note after reloading', async ({
       shell,
       method,
       storage,
       page,
     }) => {
       await storage.watchWrites();
       await shell.goto(urls.view('metodo'));
       await method.nextNote.pressSequentially('test');
       await expect(method.noteState).toHaveText(SAVED);
       expect(await storage.writes()).toEqual(Array(4).fill('set taller-learning-v1'));
       await expect(method.tutorPrompt).toHaveText(tutorPrompt('Rust', 25, 'test'));
       const saved = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? 'null') as {
         notes: { rust: { next: string } };
       };
       expect(saved.notes.rust.next).toBe('test');
       await page.reload();
       await expect(method.nextNote).toHaveValue('test');
     });

     test('shows the Go journal of the frozen master progress without writing, and the Rust note after switching', async ({
       shell,
       method,
       storage,
     }) => {
       await storage.seed(frozenProgress);
       await storage.watchWrites();
       await shell.goto(urls.view('metodo'));
       await expect(method.journalHeading('Go')).toBeVisible();
       await expect(method.learnedNote).toHaveValue('');
       await expect(shell.toast).toHaveText('');
       expect(await storage.writes()).toEqual([]);
       await shell.switchLanguage('rust');
       await expect(method.journalHeading('Rust')).toBeVisible();
       await expect(method.learnedNote).toHaveValue(OWNERSHIP_NOTE);
     });

     test('copies the exact prompt to the clipboard without writing', async ({
       shell,
       method,
       storage,
       context,
       page,
     }) => {
       await context.grantPermissions(['clipboard-read', 'clipboard-write']);
       await storage.watchWrites();
       await shell.goto(urls.view('metodo'));
       await method.button('Copiar pedido para mi tutor').click();
       await expect(shell.toast).toHaveText('Pedido copiado. Pegalo en tu asistente.');
       expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(tutorPrompt('Rust', 25, DEFAULT_NEXT));
       expect(await storage.writes()).toEqual([]);
     });

     test('with the storage blocked says that saving is unavailable, then that it could not save', async ({
       shell,
       method,
       storage,
     }) => {
       await storage.block();
       await shell.goto(urls.view('metodo'));
       await expect(method.noteState).toHaveText(UNAVAILABLE);
       await method.learnedNote.pressSequentially('a');
       await expect(method.noteState).toHaveText(NOT_SAVED);
       await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
     });

     test('shows an imported note with HTML as text in the journal and in the prompt', async ({ shell, method, page }) => {
       const note = '<img src=x onerror=alert(1)>';
       await shell.goto(urls.view('metodo'));
       await method.importFile(routeFile({ version: 1, notes: { rust: { learned: note, next: note } } }));
       await expect(shell.toast).toContainText('Copia importada');
       await expect(method.learnedNote).toHaveValue(note);
       await expect(method.tutorPrompt).toContainText(`Mi próximo paso: ${note}`);
       await expect(page.locator('#main img, body > img')).toHaveCount(0);
     });
   });
   ```

2. **`qa/e2e/specs/method-files.spec.ts`** (US2, US4 y US5-1):

   ```ts
   import { readFileSync } from 'node:fs';
   import { expect, test } from '../fixtures';
   import { frozenProgress } from '../lib/curriculum';
   import {
     FROZEN_EXPORTS,
     brokenJsonFile,
     downloadedText,
     oversizedFile,
     version2File,
   } from '../lib/method-files';
   import { urls } from '../lib/urls';

   const EXPORTED_AT = '2026-03-04T05:06:07.000Z';
   const IMPORTED = 'Copia importada y combinada con tu avance actual.';
   const CAMPAIGN_BACKUP = 'taller-campaign-v1:respaldo';

   function seededExportText(): string {
     const exported = {
       ...(JSON.parse(frozenProgress['taller-learning-v1']) as Record<string, unknown>),
       lab: JSON.parse(frozenProgress['taller-laboratorio-v1']) as unknown,
       campaign: JSON.parse(frozenProgress['taller-campaign-v1']) as unknown,
       systems: JSON.parse(frozenProgress['taller-systems-v1']) as unknown,
       exportedAt: EXPORTED_AT,
     };
     return JSON.stringify(exported, null, 2);
   }

   function frozenLabIds(file: string): string[] {
     const copy = JSON.parse(readFileSync(file, 'utf8')) as { lab: { records: Record<string, unknown> } };
     return Object.keys(copy.lab.records);
   }

   test.describe('exporting', () => {
     test.beforeEach(async ({ page, storage }) => {
       await page.clock.setFixedTime(EXPORTED_AT);
       await storage.seed(frozenProgress);
       await storage.watchWrites();
     });

     test('from the page downloads the seeded progress, with two spaces and the keys in order, without writing', async ({
       shell,
       method,
       storage,
     }) => {
       await shell.goto(urls.view('metodo'));
       const download = await method.exportFromPage();
       expect(download.suggestedFilename()).toBe('taller-progreso-2026-03-04.json');
       expect(await downloadedText(download)).toBe(seededExportText());
       await expect(shell.toast).toHaveText('Copia de progreso exportada.');
       expect(await storage.writes()).toEqual([]);
     });

     test('from the sidebar on the route view downloads the same bytes', async ({ shell, method }) => {
       await shell.goto(urls.view('recorrido'));
       const download = await method.exportFromSidebar();
       expect(download.suggestedFilename()).toBe('taller-progreso-2026-03-04.json');
       expect(await downloadedText(download)).toBe(seededExportText());
       await expect(shell.toast).toHaveText('Copia de progreso exportada.');
     });
   });

   test.describe('importing', () => {
     for (const [name, file] of Object.entries(FROZEN_EXPORTS)) {
       test(`combines the frozen export of ${name} into an empty browser`, async ({ shell, method, storage, page }) => {
         await shell.goto(urls.view('metodo'));
         await method.importFile(file);
         await expect(shell.toast).toHaveText(IMPORTED);
         await expect(method.journalHeading('Rust')).toBeVisible();
         await expect(method.learnedNote).toHaveValue('Entendí ownership con un ejemplo propio.');
         await expect(page.locator('#sidebar-completed')).toHaveText('2 de 12');
         const stored = await storage.snapshot();
         const route = JSON.parse(stored['taller-learning-v1'] ?? 'null') as { completed: string[] };
         expect(route.completed).toEqual(['rust-first-session', 'rust-ownership']);
         const lab = JSON.parse(stored['taller-laboratorio-v1'] ?? 'null') as { records: Record<string, unknown> };
         expect(Object.keys(lab.records)).toEqual(frozenLabIds(file));
       });
     }

     test('empties the picker so that the same file imports again', async ({ shell, method, storage, page }) => {
       await storage.watchWrites();
       await shell.goto(urls.view('metodo'));
       await method.importFile(FROZEN_EXPORTS.d0e1b49);
       await expect(shell.toast).toHaveText(IMPORTED);
       await expect(page.locator('#import-file')).toHaveValue('');
       const firstWrites = (await storage.writes()).length;
       await method.importFile(FROZEN_EXPORTS.d0e1b49);
       await expect.poll(async () => (await storage.writes()).length).toBeGreaterThan(firstWrites);
       await expect(shell.toast).toHaveText(IMPORTED);
     });

     for (const [name, file, notice] of [
       ['a broken JSON', brokenJsonFile(), 'No se pudo importar: el archivo no contiene JSON válido.'],
       ['a file over 10 MB', oversizedFile(), 'No se pudo importar: El archivo supera el tamaño permitido (10 MB).'],
       ['a version 2 copy', version2File(), 'No se pudo importar: Formato de progreso no compatible.'],
     ] as const) {
       test(`rejects ${name} without writing`, async ({ shell, method, storage }) => {
         await storage.watchWrites();
         await shell.goto(urls.view('metodo'));
         await method.importFile(file);
         await expect(shell.toast).toHaveText(notice);
         expect(await storage.writes()).toEqual([]);
       });
     }
   });

   test.describe('the backups', () => {
     test('lists an unreadable campaign before «Tu progreso te pertenece» and downloads its exact text', async ({
       shell,
       method,
       storage,
       page,
     }) => {
       await storage.seed({ 'taller-campaign-v1': '{roto' });
       await storage.watchWrites();
       await shell.goto(urls.view('metodo'));
       await expect(method.backupItem(CAMPAIGN_BACKUP)).toContainText(`campaña · ${CAMPAIGN_BACKUP} · 0.0 KB`);
       const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
       expect(headings.indexOf('Respaldos de seguridad.')).toBeLessThan(headings.indexOf('Tu progreso te pertenece.'));
       const writesBefore = (await storage.writes()).length;
       const download = page.waitForEvent('download');
       await method.downloadBackup('campaña', CAMPAIGN_BACKUP).click();
       expect((await download).suggestedFilename()).toBe('taller-campaign-v1-respaldo.json');
       expect(await downloadedText(await download)).toBe('{roto');
       await expect(shell.toast).toHaveText('Respaldo descargado.');
       expect(await storage.writes()).toHaveLength(writesBefore);
     });

     test('downloads the current text of a slot that changed after drawing', async ({ shell, method, storage, page }) => {
       await storage.seed({ 'taller-campaign-v1': '{roto' });
       await shell.goto(urls.view('metodo'));
       await expect(method.backupItem(CAMPAIGN_BACKUP)).toBeVisible();
       await page.evaluate((key) => localStorage.setItem(key, '{"cambió":true}'), CAMPAIGN_BACKUP);
       const download = page.waitForEvent('download');
       await method.downloadBackup('campaña', CAMPAIGN_BACKUP).click();
       expect(await downloadedText(await download)).toBe('{"cambió":true}');
     });

     test('KNOWN DEFECT: the backup size counts characters, not bytes', async ({ shell, method, storage }) => {
       await storage.seed({ 'taller-campaign-v1': JSON.stringify({ version: 2, nota: 'ñ'.repeat(2000) }) });
       await shell.goto(urls.view('metodo'));
       await expect(method.backupItem(CAMPAIGN_BACKUP)).toContainText(`${CAMPAIGN_BACKUP} · 2.0 KB`);
     });

     test('does not show the panel without slots', async ({ shell, page }) => {
       await shell.goto(urls.view('metodo'));
       await expect(page.getByRole('heading', { name: 'Tu progreso te pertenece.' })).toBeVisible();
       await expect(page.getByRole('heading', { name: 'Respaldos de seguridad.' })).toHaveCount(0);
     });
   });

   test('opening, copying, exporting, opening and cancelling the confirmation and navigating write nothing', async ({
     shell,
     method,
     storage,
     context,
   }) => {
     await context.grantPermissions(['clipboard-read', 'clipboard-write']);
     await storage.seed(frozenProgress);
     await storage.watchWrites();
     await shell.goto(urls.view('metodo'));
     await expect(shell.toast).toHaveText('');
     await method.button('Copiar pedido para mi tutor').click();
     await method.exportFromPage();
     await method.resetProgress().click();
     await method.keepProgress().click();
     await shell.openFromMenu('recorrido');
     await shell.openFromMenu('metodo');
     await expect(method.journalHeading('Go')).toBeVisible();
     expect(await storage.writes()).toEqual([]);
     const keys = Object.keys(await storage.snapshot());
     expect(keys.filter((key) => key.includes(':respaldo'))).toEqual([]);
   });
   ```

   `ñ`, repetida 2 000 veces dentro de `{"version":2,"nota":"…"}`, da 2 023 caracteres (`2.0 KB`) y 4 023 bytes (`3.9 KB`): la prueba falla si el tamaño pasa a bytes.
3. **`qa/e2e/specs/method-reset.spec.ts`** (US3 con el borrado local de hoy; T014 lo cambia a propósito):

   ```ts
   import { expect, test } from '../fixtures';
   import { frozenProgress } from '../lib/curriculum';
   import { urls } from '../lib/urls';
   import type { MethodPage } from '../pages/method';

   const RESET_DONE = 'Progreso reiniciado. Un nuevo comienzo.';
   const BLANK_ROUTE = {
     version: 1,
     language: 'rust',
     completed: [],
     milestones: [],
     favorites: [],
     quizAnswers: {},
     notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
     minutes: 25,
   };

   function focusIsInsideTheConfirmation(method: MethodPage): Promise<boolean> {
     return method.page.evaluate(() => document.getElementById('confirm-dialog')?.contains(document.activeElement) ?? false);
   }

   test.describe('the confirmation', () => {
     test('opens as a modal named «¿Borrar tu progreso?» and focuses its first button', async ({ shell, method }) => {
       await shell.goto(urls.view('metodo'));
       await method.resetProgress().click();
       await expect(method.confirmation).toBeVisible();
       await expect(method.confirmation).toContainText(
         'Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos lenguajes en este navegador. Podés exportarlos antes.',
       );
       await expect(method.keepProgress()).toBeFocused();
     });

     for (const [how, close] of [
       ['«Conservar mi avance»', (method: MethodPage) => method.keepProgress().click()],
       ['Esc', (method: MethodPage) => method.page.keyboard.press('Escape')],
     ] as const) {
       test(`closes with ${how}, writes nothing and gives the focus back to «Borrar mi progreso»`, async ({
         shell,
         method,
         storage,
       }) => {
         await storage.watchWrites();
         await shell.goto(urls.view('metodo'));
         await method.resetProgress().click();
         await close(method);
         await expect(method.confirmation).toBeHidden();
         await expect(method.resetProgress()).toBeFocused();
         expect(await storage.writes()).toEqual([]);
       });
     }

     test('keeps Tab and Shift+Tab inside and does not close on a backdrop click', async ({ shell, method, page }) => {
       await shell.goto(urls.view('metodo'));
       await method.resetProgress().click();
       for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
         await page.keyboard.press(key);
         expect(await focusIsInsideTheConfirmation(method)).toBe(true);
       }
       await page.mouse.click(5, 5);
       await expect(method.confirmation).toBeVisible();
     });
   });

   test.describe('Borrar todo', () => {
     test('KNOWN DEFECT: deletes the four stores and their backups, writes the route back blank and returns to Rust', async ({
       shell,
       method,
       storage,
       page,
     }) => {
       await storage.seed({ ...frozenProgress, 'taller-campaign-v1': '{roto' });
       await shell.goto(urls.view('metodo'));
       await expect(method.backupItem('taller-campaign-v1:respaldo')).toBeVisible();
       await method.resetProgress().click();
       await method.confirmReset().click();
       await expect(shell.toast).toHaveText(RESET_DONE);
       const stored = await storage.snapshot();
       const deleted = ['taller-laboratorio-v1', 'taller-campaign-v1', 'taller-systems-v1'];
       expect(Object.keys(stored).filter((key) => deleted.includes(key) || key.includes(':respaldo'))).toEqual([]);
       expect(JSON.parse(stored['taller-learning-v1'] ?? 'null')).toEqual(BLANK_ROUTE);
       await expect(method.journalHeading('Rust')).toBeVisible();
       await expect(method.learnedNote).toHaveValue('');
       await expect(page.getByRole('heading', { name: 'Respaldos de seguridad.' })).toHaveCount(0);
       await expect(page.locator('#sidebar-language')).toHaveText('RUST');
       await expect(page.locator('#sidebar-completed')).toHaveText('0 de 12');
       await expect(page.locator('body')).toHaveAttribute('data-language', 'rust');
     });

     test('KNOWN DEFECT: with the storage blocked it still announces success', async ({ shell, method, storage }) => {
       await storage.block();
       await shell.goto(urls.view('metodo'));
       await method.resetProgress().click();
       await method.confirmReset().click();
       await expect(shell.toast).toHaveText(RESET_DONE);
     });
   });
   ```

4. **Correr** `npm run build && E2E_PORT=4194 npm run test:e2e -- specs/method-journal.spec.ts specs/method-files.spec.ts specs/method-reset.spec.ts`. Todo tiene que pasar contra el legacy.
   - **Si falla la exportación** (research.md, «Lo que leyó el plan y no pudo correr»): `seededExportText()` pasa a ser el texto de `FROZEN_EXPORTS.master2a278ad` con `exportedAt` reemplazado por `EXPORTED_AT`, si coincide. Si tampoco coincide, pará y avisá al coordinador.
   - **Si falla el foco después de cerrar** o el escenario de Tab: anotá lo que hace el navegador y escribí la prueba con eso. FR-021 lo admite («lo fija el E2E contra el legacy»). Si Tab saca el foco del documento, el escenario pasa a exigir que `document.activeElement` nunca quede fuera del diálogo mientras siga dentro del documento. Anotalo en research.md.

   Ningún otro valor esperado se toca.
5. **Commit:** `test(e2e): los flujos de Método, en verde contra el legacy`.

### Tarea 1.3 · Lo que adopta el comportamiento de React, en rojo (T004, E)

**Archivo:** `qa/e2e/specs/method-kept-state.spec.ts`. Cubre FR-019, FR-023 y FR-028, y US2-6 y US3-5.

1. **El spec:**

   ```ts
   import { expect, test } from '../fixtures';
   import { FROZEN_EXPORTS } from '../lib/method-files';
   import { urls } from '../lib/urls';

   const IMPORTED = 'Copia importada y combinada con tu avance actual.';
   const RESET_DONE = 'Progreso reiniciado. Un nuevo comienzo.';
   const SAVED = 'Guardado. Tu próxima sesión ya tiene un punto de partida.';

   test('after a successful import the focus stays on «Importar una copia»', async ({ shell, method }) => {
     await shell.goto(urls.view('metodo'));
     await method.importFile(FROZEN_EXPORTS.d0e1b49);
     await expect(shell.toast).toHaveText(IMPORTED);
     await expect(method.button('Importar una copia')).toBeFocused();
   });

   test('after Borrar todo the focus goes back to «Borrar mi progreso»', async ({ shell, method }) => {
     await shell.goto(urls.view('metodo'));
     await method.resetProgress().click();
     await method.confirmReset().click();
     await expect(shell.toast).toHaveText(RESET_DONE);
     await expect(method.resetProgress()).toBeFocused();
   });

   test('#note-state keeps its last text after importing and after Borrar todo', async ({ shell, method }) => {
     await shell.goto(urls.view('metodo'));
     await method.nextNote.pressSequentially('x');
     await expect(method.noteState).toHaveText(SAVED);
     await method.importFile(FROZEN_EXPORTS.d0e1b49);
     await expect(shell.toast).toHaveText(IMPORTED);
     await expect(method.noteState).toHaveText(SAVED);
     await method.resetProgress().click();
     await method.confirmReset().click();
     await expect(shell.toast).toHaveText(RESET_DONE);
     await expect(method.noteState).toHaveText(SAVED);
   });
   ```

2. **Correr** `npm run build && E2E_PORT=4194 npm run test:e2e -- specs/method-kept-state.spec.ts`. Las tres fallan, por la razón esperada:
   - el foco queda en `body`;
   - `#note-state` vuelve a «Tus notas se guardan automáticamente en este navegador.».

   Si alguna falla por otra razón (un localizador, un tiempo), se corrige la prueba antes del commit.
3. **Commit:** `test(e2e): el foco y #note-state después de importar y de «Borrar todo» (en rojo)`.

**Compuerta de U1** (K): la de §0.1, con `method-kept-state.spec.ts` en rojo, como única excepción.

## 2. U2 · El CSS de Método, sobre el DOM legacy (K, onda 2)

**Cubre:** FR-036 y FR-037; SC-005. Research.md, R9.

### Tarea 2.1 · La hoja de Método y los bloques compartidos (T005, K)

**Archivos:** `frontend/src/pages/method/ui/method.css` (nuevo), `frontend/styles.css`, `frontend/src/app/main.tsx`, `frontend/app.js` (un atributo) y `qa/load-order-check.ts`.

1. **`frontend/src/pages/method/ui/method.css`,** con las reglas copiadas de `styles.css` de la base, enteras y en este orden:

   ```css
   .button.danger {
     background: #a83928;
     border-color: #a83928;
   }
   .method-grid {
     display: grid;
     grid-template-columns: 1.1fr 1fr;
     gap: 22px;
   }
   .method-panel {
     background: var(--surface);
     border: 1px solid var(--line);
     border-radius: 6px;
     padding: 25px;
     min-width: 0;
   }
   .method-panel h2 {
     font-size: 22px;
     letter-spacing: -0.7px;
     margin-bottom: 17px;
   }
   .method-panel p,
   .method-panel li {
     font-size: 12px;
     color: var(--muted);
     line-height: 1.8;
   }
   .routine {
     list-style: none;
     padding: 0;
     margin: 0;
     display: grid;
     gap: 17px;
   }
   .routine li {
     display: flex;
     align-items: flex-start;
     gap: 15px;
   }
   .routine-time {
     font-family: var(--mono);
     font-size: 12px;
     color: var(--accent);
     flex-shrink: 0;
     min-width: 32px;
   }
   .routine strong {
     color: var(--ink);
     font-weight: 550;
   }
   .routine-note {
     margin: 22px 0 0;
   }
   .notes-panel {
     margin-top: 24px;
   }
   .notes-grid {
     display: grid;
     grid-template-columns: 1fr 1fr;
     gap: 16px;
   }
   .notes-grid textarea {
     display: block;
     width: 100%;
     min-height: 160px;
     resize: vertical;
     padding: 13px;
     border: 1px solid var(--line);
     border-radius: 4px;
     background: var(--paper);
     color: var(--ink);
     font-size: 12px;
     line-height: 1.8;
   }
   .tutor-prompt {
     white-space: pre-wrap;
     font-family: var(--sans);
     font-size: 12px;
     line-height: 1.8;
     color: var(--muted);
     margin: 0 0 20px;
   }
   .source-list {
     padding: 0;
     list-style: none;
   }
   .source-list li {
     border-bottom: 1px solid var(--line);
     padding: 13px 0;
     font-size: 12px;
   }
   .source-list a {
     color: var(--accent);
     font-weight: 550;
   }
   .source-list p {
     font-size: 11px;
     margin: 4px 0 0;
   }
   .data-actions {
     display: flex;
     align-items: center;
     flex-wrap: wrap;
     gap: 12px;
     margin-top: 22px;
   }
   .data-explainer {
     font-size: 11px !important;
     margin-top: 17px !important;
   }
   @media (max-width: 1150px) {
     .method-grid {
       grid-template-columns: 1fr;
     }
   }
   @media (max-width: 590px) {
     .notes-grid {
       grid-template-columns: 1fr;
     }
     .method-panel {
       padding: 21px;
     }
     .method-grid {
       gap: 16px;
     }
   }
   @media print {
     .data-actions {
       display: none;
     }
   }
   ```

2. **`frontend/styles.css`.** Se borran por texto, no por número de línea:
   - las 19 reglas base de la primera fila de research.md, R9;
   - dentro de `@media (max-width: 1150px)`, el bloque `  .method-grid {` / `    grid-template-columns: 1fr;` / `  }`;
   - dentro del primer `@media (max-width: 590px)`, los bloques `  .notes-grid { grid-template-columns: 1fr; }`, `  .method-panel { padding: 21px; }` y `  .method-grid { gap: 16px; }`;
   - dentro de `@media print`, la línea `  .data-actions,`.

   `.field-label` y `.note-state`, que hoy están entre las reglas de Método, se quedan en su lugar. Si F3, F4 o F9 ya tocaron esos bloques (B7), rebasá y borrá lo tuyo de lo que quede.
3. **`frontend/src/app/main.tsx`.** Después de `import '../../styles.css';`, y de las hojas de página que ya estén justo debajo, se suma `import '../pages/method/ui/method.css';`, antes de `import '../../lab.css';`.
4. **`frontend/app.js`,** en `renderMethod`: `<p style="margin:22px 0 0">¿Día complicado?` pasa a `<p class="routine-note">¿Día complicado?`. Es el único cambio de `app.js` en esta tarea.
5. **`qa/load-order-check.ts`.**
   - Junto a `STYLES`, la constante:

     ```ts
     const METHOD_STYLES = 'frontend/src/pages/method/ui/method.css';
     ```

   - Al final de `CONSTRAINTS`, dos restricciones:

     ```ts
     [
       STYLES,
       METHOD_STYLES,
       'las reglas de Método conservan su lugar en la cascada: después de styles.css',
     ],
     [
       METHOD_STYLES,
       'frontend/lab.css',
       'las reglas de Método conservan su lugar en la cascada: antes de lab.css y de las demás hojas',
     ],
     ```

6. **Correr:**
   - `node qa/load-order-check.ts`, `npm run build`, `npm test` y `npm run lint`;
   - las dos comparaciones de quickstart.md, §3.1, contra el `dist/` de T001:
     - el multiconjunto: `onlyBase` 0 y `onlyUnit` 1, que es `.routine-note`;
     - el barrido de estilo computado de Método: `differences` 0.
   - la rotura deliberada de quickstart.md, §3.1(c), en una copia descartable;
   - `E2E_PORT=4173 npm run test:e2e`: la red y U1 en verde, y `method-kept-state.spec.ts` en rojo, como en U1.
7. **Commit:** `style(front): las reglas de Método van a su hoja, con la clase que reemplaza al style=`.

**Compuerta de U2** (K): la de §0.1, más las dos comparaciones en 0. Las medidas van a la descripción del PR.

## 3. U3 · El port, con el «Borrar todo» local de hoy (M, A, Q y K; ondas 2 a 4)

**Cubre:**

- **Requisitos:** FR-007 a FR-020, FR-026 a FR-036, FR-038, FR-039 (el modelo y los componentes), FR-041, FR-045 y FR-046;
- **Criterios:** SC-001, SC-002, SC-004, SC-006, SC-010 y SC-011;
- **Historias:** US1, US2, US4, US5 y US6, y US3 con el borrado local.

### 3.0 Lo que dibuja Método hoy y lo que dibuja la página

La página reproduce el marcado de `renderMethod`, `backupsPanel` y `#confirm-dialog` (`frontend/app.js` y `frontend/src/index.html` de la base). Las únicas diferencias son las que admite FR-035, y la comparación única de T021 las cuenta:

- sin `data-action`, `data-key` ni `data-note`;
- `class="routine-note"`, que ya trajo T005;
- `#confirm-dialog`, como hijo de `body` y sólo mientras está abierta;
- `#import-file`, dentro de la última sección.

Los textos se copian de esos archivos, carácter por carácter, con sus `′`, `…`, `↗` y comillas.

### Tarea 3.1 · Las specs del modelo, en rojo (T006, M)

**Archivos:** `frontend/src/pages/method/model/method-texts.ts` y `write-note.ts` (stubs), `method-texts.spec.ts` y `write-note.spec.ts`.

1. **Los stubs.** Las firmas del contrato (§4) y `languageName`, `writeNote` y el tipo `NoteField`. Cada función lanza `new Error('not implemented')`; `NOTE_STATE` ya tiene sus cuatro textos.

   ```ts
   // write-note.ts
   import type { RouteStore } from '../../../entities/guide';

   export type NoteField = 'learned' | 'next';

   export function writeNote(store: RouteStore, field: NoteField, value: string): boolean {
     throw new Error('not implemented');
   }
   ```

2. **`method-texts.spec.ts`.** Los valores esperados se copian de `renderMethod` y `tutorPrompt` de la base:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { blankRouteProgress, type RouteProgressV1 } from '../../../entities/guide';
   import {
     NOTE_STATE,
     backupSizeLabel,
     languageName,
     noteStateAfterWrite,
     noteStateOnMount,
     tutorPrompt,
   } from './method-texts';

   const BLANK_RUST_PROMPT =
     'Estoy aprendiendo Rust y ya sé programar. Me interesan los sistemas y el rendimiento. Tengo 25 minutos. Trabajemos un concepto con un ejercicio pequeño relacionado con archivos, memoria o redes.\n\nPrimero pedime predecir qué va a pasar y justificarlo. Esperá mi intento. Después dame una pista por vez, sin escribir ni modificar mi solución.\n\nCuando aparezca una duda de API, consultá Context7 o documentación oficial y enlazá la fuente. Si no tenés acceso, decímelo. Al terminar, pedime resolver una variante y explicar qué aprendí.\n\nMi próximo paso: elegir un desafío pequeño del recorrido.';

   function progressWith(overrides: Partial<RouteProgressV1>): RouteProgressV1 {
     return { ...blankRouteProgress(), ...overrides };
   }

   describe('tutorPrompt', () => {
     it('writes today text for a blank Rust route', () => {
       expect(tutorPrompt(blankRouteProgress())).toBe(BLANK_RUST_PROMPT);
     });

     it('uses the active language, the saved minutes and the next step of that language', () => {
       const prompt = tutorPrompt(
         progressWith({
           language: 'go',
           minutes: 45,
           notes: { rust: { learned: '', next: 'paso de Rust' }, go: { learned: '', next: 'escribir un test' } },
         }),
       );
       expect(prompt.startsWith('Estoy aprendiendo Go y ya sé programar.')).toBe(true);
       expect(prompt).toContain('Tengo 45 minutos.');
       expect(prompt.endsWith('\n\nMi próximo paso: escribir un test')).toBe(true);
     });

     it('falls back to the default step only when the note is empty, not when it is blank', () => {
       const empty = progressWith({ notes: { rust: { learned: '', next: '' }, go: { learned: '', next: 'de Go' } } });
       const blank = progressWith({ notes: { rust: { learned: '', next: '  ' }, go: { learned: '', next: '' } } });
       expect(tutorPrompt(empty).endsWith('Mi próximo paso: elegir un desafío pequeño del recorrido.')).toBe(true);
       expect(tutorPrompt(blank).endsWith('Mi próximo paso:   ')).toBe(true);
     });
   });

   describe('the note status', () => {
     it('says on mount whether the notes are saved', () => {
       expect(noteStateOnMount(true)).toBe('Tus notas se guardan automáticamente en este navegador.');
       expect(noteStateOnMount(false)).toBe('El guardado no está disponible. Exportá tu avance al terminar.');
     });

     it('says after a write whether it could be saved', () => {
       expect(noteStateAfterWrite(true)).toBe('Guardado. Tu próxima sesión ya tiene un punto de partida.');
       expect(noteStateAfterWrite(false)).toBe('No se pudo guardar. Exportá tu avance al terminar.');
     });

     it('keeps the four texts together', () => {
       expect(Object.values(NOTE_STATE)).toHaveLength(4);
     });
   });

   describe('languageName', () => {
     it('names Rust and Go', () => {
       expect(languageName('rust')).toBe('Rust');
       expect(languageName('go')).toBe('Go');
     });
   });

   describe('backupSizeLabel', () => {
     it('divides the length by 1024 with one decimal and a dot', () => {
       expect(backupSizeLabel('')).toBe('0.0 KB');
       expect(backupSizeLabel('x'.repeat(2048))).toBe('2.0 KB');
       expect(backupSizeLabel('x'.repeat(1075))).toBe('1.0 KB');
     });

     it('KNOWN DEFECT: counts characters, not bytes', () => {
       expect(backupSizeLabel('ñ'.repeat(1024))).toBe('1.0 KB');
     });
   });
   ```

3. **`write-note.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import curriculum from '../../../../../build/curriculum.json';
   import { createRouteStore, type GuideData, type RouteStore } from '../../../entities/guide';
   import type { StorageLike } from '../../../shared/lib/versioned-storage';
   import { writeNote } from './write-note';

   const guide = curriculum.guide as unknown as GuideData;
   const KEY = 'taller-learning-v1';

   function openStore(stored: unknown, failWrites = false): { store: RouteStore; writes: string[]; items: Map<string, string> } {
     const items = new Map<string, string>([[KEY, JSON.stringify(stored)]]);
     const writes: string[] = [];
     const storage: StorageLike = {
       getItem: (key) => items.get(key) ?? null,
       setItem: (key, value) => {
         if (failWrites) throw new Error('quota exceeded');
         writes.push(key);
         items.set(key, value);
       },
       removeItem: (key) => void items.delete(key),
     };
     const store = createRouteStore();
     store.open(guide, { storage });
     return { store, writes, items };
   }

   const GO_ROUTE = {
     version: 1,
     language: 'go',
     completed: [],
     milestones: [],
     favorites: [],
     quizAnswers: {},
     notes: { rust: { learned: 'de Rust', next: '' }, go: { learned: '', next: '' } },
     minutes: 25,
   };

   describe('writeNote', () => {
     it('writes the field of the active language once and keeps the other notes', () => {
       const { store, writes, items } = openStore(GO_ROUTE);
       expect(writeNote(store, 'next', 'escribir un test')).toBe(true);
       expect(writes).toEqual([KEY]);
       const saved = JSON.parse(items.get(KEY) ?? 'null') as typeof GO_ROUTE;
       expect(saved.notes).toEqual({
         rust: { learned: 'de Rust', next: '' },
         go: { learned: '', next: 'escribir un test' },
       });
     });

     it('answers false when the storage cannot write', () => {
       const { store } = openStore(GO_ROUTE, true);
       expect(writeNote(store, 'learned', 'a')).toBe(false);
       expect(store.getProgress().notes.go.learned).toBe('a');
     });
   });
   ```

4. **Correr** `npm run test:unit -- frontend/src/pages/method/model`: las dos specs fallan con `not implemented`.
5. **Commit:** `test(front): el modelo de Método (en rojo)`.

### Tarea 3.2 · El modelo (T007, M)

**Archivos:** `frontend/src/pages/method/model/method-texts.ts` y `write-note.ts`.

1. **`method-texts.ts`:**

   ```ts
   import type { RouteProgressV1 } from '../../../entities/guide';

   export const NOTE_STATE = {
     automatic: 'Tus notas se guardan automáticamente en este navegador.',
     unavailable: 'El guardado no está disponible. Exportá tu avance al terminar.',
     saved: 'Guardado. Tu próxima sesión ya tiene un punto de partida.',
     notSaved: 'No se pudo guardar. Exportá tu avance al terminar.',
   } as const;

   const DEFAULT_NEXT_STEP = 'elegir un desafío pequeño del recorrido.';
   const KILOBYTE = 1024;

   export function noteStateOnMount(storageAvailable: boolean): string {
     return storageAvailable ? NOTE_STATE.automatic : NOTE_STATE.unavailable;
   }

   export function noteStateAfterWrite(storageAvailable: boolean): string {
     return storageAvailable ? NOTE_STATE.saved : NOTE_STATE.notSaved;
   }

   export function languageName(language: RouteProgressV1['language']): string {
     return language === 'rust' ? 'Rust' : 'Go';
   }

   export function tutorPrompt(progress: RouteProgressV1): string {
     const nextStep = progress.notes[progress.language].next || DEFAULT_NEXT_STEP;
     return `Estoy aprendiendo ${languageName(progress.language)} y ya sé programar. Me interesan los sistemas y el rendimiento. Tengo ${progress.minutes} minutos. Trabajemos un concepto con un ejercicio pequeño relacionado con archivos, memoria o redes.\n\nPrimero pedime predecir qué va a pasar y justificarlo. Esperá mi intento. Después dame una pista por vez, sin escribir ni modificar mi solución.\n\nCuando aparezca una duda de API, consultá Context7 o documentación oficial y enlazá la fuente. Si no tenés acceso, decímelo. Al terminar, pedime resolver una variante y explicar qué aprendí.\n\nMi próximo paso: ${nextStep}`;
   }

   export function backupSizeLabel(text: string): string {
     return `${(text.length / KILOBYTE).toFixed(1)} KB`;
   }
   ```

2. **`write-note.ts`:**

   ```ts
   import type { RouteStore } from '../../../entities/guide';

   export type NoteField = 'learned' | 'next';

   export function writeNote(store: RouteStore, field: NoteField, value: string): boolean {
     const progress = store.getProgress();
     progress.notes[progress.language][field] = value;
     store.save();
     return store.storageAvailable();
   }
   ```

   La asignación sobre el estado vivo es la de hoy, y vive fuera del componente, donde las reglas de `eslint-plugin-react-hooks` no la confunden con una mutación de props.
3. **Correr** `npm run test:unit -- frontend/src/pages/method/model`, en verde, y después `npm run typecheck` y `npm run lint`.
4. **Commit:** `feat(front): el modelo de Método: el pedido, el estado de la nota y la escritura`.

### Tarea 3.3 · Las specs del armado y del guard, en rojo (T008, A)

**Archivos:**

- `frontend/src/app/progress-backup/progress-areas.ts`: el stub, con los tipos del contrato (§2) y `createProgressAreas`, que lanza `not implemented`;
- `progress-areas.spec.ts`;
- `qa/seams-guard-check.ts`;
- `frontend/src/app/singletons-import.spec.ts`.

1. **`progress-areas.spec.ts`.** Los valores esperados salen de las lecturas de hoy en `app.js` (research.md, R3):

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { RouteArea, SectionPlan } from '../../features/progress-backup';
   import { createProgressAreas, type LegacyProgressWindow } from './progress-areas';

   interface Plan extends SectionPlan {
     state: unknown;
   }

   function engine(name: string, events: string[], removed: boolean | Promise<boolean> = true) {
     return {
       exportState: () => ({ marker: name }),
       planImport: (raw: unknown): Plan => ({ state: raw, lossy: false }),
       applyImport: (plan: Plan) => {
         events.push(`${name}:applyImport:${JSON.stringify(plan.state)}`);
         return { changed: true, storageAvailable: true };
       },
       reset: () => (removed instanceof Promise ? removed.then((value) => ({ removed: value })) : { removed }),
       backups: () => [{ key: `${name}:respaldo`, text: name }],
     };
   }

   const route = { name: 'route' } as unknown as RouteArea;

   function areasWith(legacy: LegacyProgressWindow, events: string[] = [], removed: { campaign?: boolean | Promise<boolean> } = {}) {
     let current = legacy;
     const areas = createProgressAreas({
       route,
       campaign: engine('campaign', events, removed.campaign),
       systems: engine('systems', events),
       legacy: () => current,
     });
     return { areas, replace: (next: LegacyProgressWindow) => (current = next) };
   }

   describe('createProgressAreas', () => {
     it('passes the route store through', () => {
       expect(areasWith({}).areas.route).toBe(route);
     });

     it('reads the laboratory on every call, not when assembling', () => {
       const { areas, replace } = areasWith({});
       replace({
         TallerLab: {
           exportState: () => ({ marker: 'lab' }),
           planImport: () => ({ lossy: false }),
           applyImport: () => true,
           reset: () => true,
           backups: () => [{ key: 'taller-laboratorio-v1:respaldo', text: 'x' }],
         },
       });
       expect(areas.lab.exportState()).toEqual({ marker: 'lab' });
       expect(areas.lab.backups()).toEqual([{ key: 'taller-laboratorio-v1:respaldo', text: 'x' }]);
       expect(areas.lab.reset()).toBe(true);
     });

     it('treats an absent laboratory as nothing to export, reset or list', () => {
       const { areas } = areasWith({});
       expect(areas.lab.exportState()).toBeUndefined();
       expect(areas.lab.reset()).toBeUndefined();
       expect(areas.lab.backups()).toEqual([]);
     });

     it('lets planning an import throw the TypeError of today when the laboratory is absent', () => {
       const { areas } = areasWith({});
       expect(() => areas.lab.planImport({})).toThrow(TypeError);
     });

     it('lists the laboratory backups as empty when its adapter has no backups method', () => {
       const { areas } = areasWith({
         TallerLab: { exportState: () => undefined, planImport: () => ({ lossy: false }), applyImport: () => true, reset: () => true },
       });
       expect(areas.lab.backups()).toEqual([]);
     });

     it('resolves the removed flag of each engine reset, also when the engine answers later', async () => {
       const synchronous = areasWith({}, [], { campaign: false });
       expect(await synchronous.areas.campaign.reset()).toBe(false);
       const asynchronous = areasWith({}, [], { campaign: Promise.resolve(true) });
       expect(await asynchronous.areas.campaign.reset()).toBe(true);
       expect(await asynchronous.areas.systems.reset()).toBe(true);
     });

     it('applies to each engine the plan it computed', async () => {
       const events: string[] = [];
       const { areas } = areasWith({}, events);
       await areas.systems.applyImport(areas.systems.planImport({ s: 1 }));
       expect(events).toEqual(['systems:applyImport:{"s":1}']);
     });

     it('exports and lists each engine', () => {
       const { areas } = areasWith({});
       expect(areas.campaign.exportState()).toEqual({ marker: 'campaign' });
       expect(areas.systems.backups()).toEqual([{ key: 'systems:respaldo', text: 'systems' }]);
     });

     it('syncs the derived seals through the legacy views, and does nothing when they are absent', () => {
       const events: string[] = [];
       const { areas, replace } = areasWith({});
       expect(() => areas.campaign.syncDerivedSeals()).not.toThrow();
       replace({
         TallerCampaign: { sync: () => events.push('campaign:sync') },
         TallerSystems: { sync: () => events.push('systems:sync'), resetSimulations: () => undefined },
       });
       areas.systems.syncDerivedSeals();
       areas.campaign.syncDerivedSeals();
       expect(events).toEqual(['systems:sync', 'campaign:sync']);
     });
   });
   ```

2. **`qa/seams-guard-check.ts`.** Después del escenario «R4: a spec and an @x entry are not reported», tres escenarios nuevos:

   ```ts
   const PROGRESS_BACKUP_ASSEMBLY = 'frontend/src/app/progress-backup/app-progress-backup.ts';

   test('R4: the progress backup assembly may import the guide, campaign and systems-workshop indexes', () => {
     assert.deepEqual(
       findViolations({
         [PROGRESS_BACKUP_ASSEMBLY]: `
           import { campaignEngine } from '../../entities/campaign';
           import { routeStore } from '../../entities/guide';
           import { systemsEngine } from '../../entities/systems-workshop';`,
       }),
       [],
     );
   });

   test('R4: the assembly may not import the exercise index', () => {
     const violations = findViolations({
       [PROGRESS_BACKUP_ASSEMBLY]: `import { labStore } from '../../entities/exercise';`,
     });
     assert.deepEqual(rulesOf(violations), ['R4']);
     assert.match(violations[0], /entities\/exercise/);
   });

   test('R4: another app file next to the assembly is still reported for the same import', () => {
     const violations = findViolations({
       'frontend/src/app/progress-backup/progress-areas.ts': `import { routeStore } from '../../entities/guide';`,
     });
     assert.deepEqual(rulesOf(violations), ['R4']);
   });
   ```

3. **`frontend/src/app/singletons-import.spec.ts`.** Un caso más, dentro del mismo `describe`:

   ```ts
   it('importing the progress backup assembly does not touch localStorage', async () => {
     const assembly = await import('./progress-backup/app-progress-backup');
     expect(typeof assembly.appProgressBackup).toBe('function');
     expect(counter.storageAccesses).toBe(0);
   });
   ```

   Sólo cuenta el almacenamiento: `react-dom` y otras dependencias miran `typeof window` al evaluarse, y eso no es un acceso.
4. **Correr:**
   - `npm run test:unit -- frontend/src/app`: `progress-areas.spec.ts` falla con `not implemented`, y el caso nuevo de `singletons-import.spec.ts` falla porque el módulo no existe;
   - `node qa/seams-guard-check.ts`: falla el primero de los escenarios nuevos, porque R4 todavía reserva cada índice a su dueño legacy. Los otros dos pasan.
5. **Commit:** `test(front): las áreas del armado, su importación sin almacenamiento y R4 para el armado (en rojo)`.

### Tarea 3.4 · El armado y R4 (T009, A)

**Archivos:** `frontend/src/app/progress-backup/progress-areas.ts`, `app-progress-backup.ts` (nuevo), `frontend/src/features/progress-backup/model/types.ts`, `frontend/src/features/progress-backup/index.ts` y `qa/lib/seams-guard.ts`. Con la rama F5, también `frontend/src/pages/systems/session.ts` («Ramas»).

1. **`progress-areas.ts`:**

   ```ts
   import type { CampaignImportPlan } from '../../entities/campaign';
   import type { SystemsImportPlan } from '../../entities/systems-workshop';
   import type {
     ProgressAreas,
     RouteArea,
     SealedArea,
     SectionArea,
     SectionPlan,
   } from '../../features/progress-backup';
   import type { BackupEntry } from '../../shared/lib/versioned-storage';

   export interface LegacyLabProgress {
     exportState(): unknown;
     planImport(raw: unknown): SectionPlan;
     applyImport(plan: SectionPlan): unknown;
     reset(): boolean | undefined | Promise<boolean | undefined>;
     backups?(): BackupEntry[];
   }

   export interface LegacyProgressWindow {
     readonly TallerLab?: LegacyLabProgress;
     readonly TallerCampaign?: { sync(): void };
     readonly TallerSystems?: { sync(): void; resetSimulations(): void };
   }

   export interface EngineProgress<Plan extends SectionPlan> {
     exportState(): unknown;
     planImport(raw: unknown): Plan;
     applyImport(plan: Plan): unknown;
     reset(): { removed: boolean } | Promise<{ removed: boolean }>;
     backups(): BackupEntry[];
   }

   export interface ProgressSources {
     readonly route: RouteArea;
     readonly campaign: EngineProgress<CampaignImportPlan>;
     readonly systems: EngineProgress<SystemsImportPlan>;
     legacy(): LegacyProgressWindow;
   }

   function labArea(legacy: () => LegacyProgressWindow): SectionArea {
     return {
       exportState: () => legacy().TallerLab?.exportState(),
       planImport: (raw) => (legacy().TallerLab as LegacyLabProgress).planImport(raw),
       applyImport: (plan) => (legacy().TallerLab as LegacyLabProgress).applyImport(plan),
       reset: () => legacy().TallerLab?.reset(),
       backups: () => legacy().TallerLab?.backups?.() ?? [],
     };
   }

   function engineArea<Plan extends SectionPlan>(
     engine: EngineProgress<Plan>,
     syncDerivedSeals: () => void,
   ): SealedArea {
     return {
       exportState: () => engine.exportState(),
       planImport: (raw) => engine.planImport(raw),
       applyImport: (plan) => engine.applyImport(plan as Plan),
       reset: async () => (await engine.reset()).removed,
       backups: () => engine.backups(),
       syncDerivedSeals,
     };
   }

   export function createProgressAreas({ route, campaign, systems, legacy }: ProgressSources): ProgressAreas {
     return {
       route,
       lab: labArea(legacy),
       campaign: engineArea(campaign, () => legacy().TallerCampaign?.sync()),
       systems: engineArea(systems, () => legacy().TallerSystems?.sync()),
     };
   }
   ```

2. **`app-progress-backup.ts`.** Es la versión sin las ramas. Con la rama F5 o la rama F9, se aplica lo de «Ramas»:

   ```ts
   import { campaignEngine } from '../../entities/campaign';
   import { routeStore } from '../../entities/guide';
   import { systemsEngine } from '../../entities/systems-workshop';
   import { createProgressBackup, type ProgressBackup } from '../../features/progress-backup';
   import { getContent } from '../content/content';
   import { createProgressAreas, type LegacyProgressWindow } from './progress-areas';

   export interface AppProgressBackup extends ProgressBackup {
     registerSessionReset(reset: () => void): void;
   }

   let instance: AppProgressBackup | null = null;

   function legacyWindow(): LegacyProgressWindow {
     return window as unknown as LegacyProgressWindow;
   }

   function createAppProgressBackup(): AppProgressBackup {
     const sessionResets: (() => void)[] = [() => legacyWindow().TallerSystems?.resetSimulations()];
     const backup = createProgressBackup({
       guide: getContent().guide,
       areas: createProgressAreas({
         route: routeStore,
         campaign: campaignEngine,
         systems: systemsEngine,
         legacy: legacyWindow,
       }),
       sessionResets,
     });
     return {
       ...backup,
       registerSessionReset(reset) {
         sessionResets.push(reset);
       },
     };
   }

   export function appProgressBackup(): AppProgressBackup {
     instance ??= createAppProgressBackup();
     return instance;
   }
   ```

3. **`qa/lib/seams-guard.ts`.** `INDEX_OWNERS` pasa a listar quién puede importar cada índice, y `indexViolations` lo lee:

   ```ts
   const PROGRESS_BACKUP_ASSEMBLY = 'frontend/src/app/progress-backup/app-progress-backup.ts';

   // The assembly is evaluated only inside main.tsx's graph, after the gate and next to each owner;
   // no check bundles it alone (F8, L10).
   const INDEX_OWNERS: Readonly<Record<string, readonly string[]>> = {
     guide: ['frontend/app.js', PROGRESS_BACKUP_ASSEMBLY],
     exercise: ['frontend/lab.js'],
     campaign: ['frontend/src/app/legacy/register-campaign-engine.ts', PROGRESS_BACKUP_ASSEMBLY],
     'systems-workshop': ['frontend/src/app/legacy/register-systems-engine.ts', PROGRESS_BACKUP_ASSEMBLY],
   };
   ```

   ```ts
   function indexViolations(file: string, imports: ImportStatement[]): string[] {
     if (!isLegacyOrAppFile(file)) return [];
     return imports
       .filter((statement) => statement.isValueImport)
       .flatMap((statement) => {
         const slice = statement.specifier.match(SLICE_INDEX_SPECIFIER)?.[1];
         if (slice === undefined) return [];
         const owners = INDEX_OWNERS[slice] ?? [];
         if (owners.includes(file)) return [];
         return [
           `R4 ${file}: imports a value from entities/${slice}, whose index only ${owners.join(' or ')} may import`,
         ];
       });
   }
   ```

   El comentario existente sobre `indexViolations` queda como está.
4. **Los tipos de Q1 en la feature, sin comportamiento todavía.**
   - `features/progress-backup/model/types.ts` suma, tal cual el contrato (§1):
     - `ResetRefusal`, `ServerResetResult`, `ServerReset`, `ResetRefused` y `ResetOutcome`;
     - `serverReset?: ServerReset` en `ProgressBackupOptions`.
   - `ProgressBackup.resetAll` pasa a devolver `Promise<ResetOutcome>`.
   - `index.ts` exporta los cinco tipos nuevos.
   - `createProgressBackup` no cambia: devuelve `ProgressNotice`, que ya es un `ResetOutcome`, y todavía no mira `serverReset` (lo hace T016).

   Así la página de U3 ya maneja el resultado con su rechazo, y U4 no cambia ningún tipo que ella use.
5. **Correr:**
   - `npm run test:unit -- frontend/src/app` y `node qa/seams-guard-check.ts`, los dos en verde, incluido «the real tree has no violations»;
   - después, `npm run typecheck` y `npm run lint`.

   - `create-progress-backup.spec.ts` sigue en verde sin editarse.

   Nadie llama todavía a `appProgressBackup()`: lo hace T013.
6. **Commit:** `feat(front): el armado de progress-backup en src/app y R4 para él`.

### Tarea 3.5 · Las specs de la página, en rojo (T010, M)

**Archivos,** en `frontend/src/pages/method/`:

- los stubs, con sus props y `throw new Error('not implemented')`: `ui/MethodPage.tsx`, `ui/MethodIntro.tsx`, `ui/JournalPanel.tsx`, `ui/TutorPanel.tsx`, `ui/SourcesPanel.tsx`, `ui/BackupsPanel.tsx`, `ui/ProgressPanel.tsx`, `ui/ResetDialog.tsx` y `lib/copy-with-fallback.ts`;
- `index.ts`;
- las ayudas `ui/progress-backup-double.ts` y `ui/render-method.tsx`;
- `ui/method-page.spec.tsx`.

**Consume:** T007; F11a, por `cleanup` y jest-dom en el setup del proyecto de DOM.

1. **`index.ts`:**

   ```ts
   export { default as MethodPage } from './ui/MethodPage';
   export type { MethodPageProps } from './ui/MethodPage';
   ```

2. **`ui/progress-backup-double.ts`,** el doble que registra sus llamadas:

   ```ts
   import { blankRouteProgress } from '../../../entities/guide';
   import type {
     BackupListing,
     ProgressBackup,
     ProgressFile,
     ProgressImportPlan,
     ProgressNotice,
     ResetOutcome,
   } from '../../../features/progress-backup';

   const PLAN: ProgressImportPlan = { route: { state: blankRouteProgress(), lossy: false }, sections: [] };

   export class ProgressBackupDouble implements ProgressBackup {
     readonly calls: string[] = [];
     backups: BackupListing[] = [];
     exportedFile: ProgressFile = { fileName: 'taller-progreso-2026-03-04.json', text: '{\n  "version": 1\n}' };
     importNotice = 'Copia importada y combinada con tu avance actual.';
     resetNotice = 'Progreso reiniciado. Un nuevo comienzo.';
     planFailure: Error | null = null;
     onApplyImport: () => void = () => undefined;
     onResetAll: () => void = () => undefined;

     exportProgress(): ProgressFile {
       this.calls.push('exportProgress');
       return this.exportedFile;
     }

     listBackups(): BackupListing[] {
       return this.backups;
     }

     readBackup(key: string): ProgressFile | undefined {
       this.calls.push(`readBackup ${key}`);
       const backup = this.backups.find((item) => item.key === key);
       return backup === undefined ? undefined : { fileName: 'respaldo.json', text: backup.text };
     }

     planImport(text: string): ProgressImportPlan {
       this.calls.push(`planImport ${text}`);
       if (this.planFailure !== null) throw this.planFailure;
       return PLAN;
     }

     async applyImport(): Promise<ProgressNotice> {
       this.calls.push('applyImport');
       this.onApplyImport();
       return { notice: this.importNotice };
     }

     async resetAll(): Promise<ResetOutcome> {
       this.calls.push('resetAll');
       this.onResetAll();
       return { notice: this.resetNotice };
     }
   }
   ```

3. **`ui/render-method.tsx`,** la ayuda de las specs de la página:

   ```tsx
   import { render } from '@testing-library/react';
   import curriculum from '../../../../../build/curriculum.json';
   import type { GuideData, RouteStore } from '../../../entities/guide';
   import type { StorageLike } from '../../../shared/lib/versioned-storage';
   import MethodPage from './MethodPage';
   import { ProgressBackupDouble } from './progress-backup-double';

   export const guide = curriculum.guide as unknown as GuideData;

   export interface RecordingStorage extends StorageLike {
     readonly items: Map<string, string>;
     readonly events: string[];
     failWrites: boolean;
   }

   export function memoryStorage(initial: Record<string, string>): RecordingStorage {
     const items = new Map(Object.entries(initial));
     const events: string[] = [];
     const storage: RecordingStorage = {
       items,
       events,
       failWrites: false,
       getItem: (key) => items.get(key) ?? null,
       setItem: (key, value) => {
         if (storage.failWrites) throw new Error('quota exceeded');
         events.push(`save ${key}`);
         items.set(key, value);
       },
       removeItem: (key) => void items.delete(key),
     };
     return storage;
   }

   export interface MethodRig {
     readonly store: RouteStore;
     readonly storage: RecordingStorage;
     readonly backup: ProgressBackupDouble;
     readonly events: string[];
   }

   export function renderMethod(
     store: RouteStore,
     storage: RecordingStorage,
     configure: (backup: ProgressBackupDouble) => void = () => undefined,
   ): MethodRig & ReturnType<typeof render> {
     const events = storage.events;
     const backup = new ProgressBackupDouble();
     configure(backup);
     const view = render(
       <MethodPage
         sources={guide.sources}
         progressBackup={backup}
         store={store}
         notify={(message) => events.push(`notify ${message}`)}
       />,
     );
     return { ...view, store, storage, backup, events };
   }
   ```

   La ayuda no importa `createRouteStore` ni nombra la clave del recorrido: es un archivo que no es spec, y R3 y R1 de `seams-guard-check` miran todo `frontend/src/`. Cada spec abre su almacén y se lo pasa, como en F9.
4. **`ui/method-page.spec.tsx`.**
   - jsdom no trae `showModal()` ni `close()` (ADR 0008, §1). La spec los define y los restaura.
   - La descarga es una frontera de E/S: se reemplaza con `vi.mock`, y la prueba exige el archivo que recibe.

   ```tsx
   import { screen, within } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { createRouteStore } from '../../../entities/guide';
   import { downloadJsonFile } from '../../../shared/lib/download-file';
   import type { ProgressBackupDouble } from './progress-backup-double';
   import { guide, memoryStorage, renderMethod } from './render-method';

   vi.mock('../../../shared/lib/download-file', () => ({ downloadJsonFile: vi.fn() }));

   const ROUTE_KEY = 'taller-learning-v1';

   function openMethod(stored: Record<string, string> = {}, configure?: (backup: ProgressBackupDouble) => void) {
     const storage = memoryStorage(stored);
     const store = createRouteStore();
     store.open(guide, { storage });
     return renderMethod(store, storage, configure);
   }

   const SAVED = 'Guardado. Tu próxima sesión ya tiene un punto de partida.';
   const AUTOMATIC = 'Tus notas se guardan automáticamente en este navegador.';
   const RESET_DONE = 'Progreso reiniciado. Un nuevo comienzo.';
   const NOTE_WITH_HTML = '<img src=x onerror=alert(1)>';

   function storedRoute(overrides: Record<string, unknown> = {}): Record<string, string> {
     return {
       [ROUTE_KEY]: JSON.stringify({
         version: 1,
         language: 'go',
         completed: [],
         milestones: [],
         favorites: [],
         quizAnswers: {},
         notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
         minutes: 45,
         ...overrides,
       }),
     };
   }

   const realShowModal = HTMLDialogElement.prototype.showModal;
   const realClose = HTMLDialogElement.prototype.close;

   beforeAll(() => {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       if (!this.open) return;
       this.open = false;
       this.dispatchEvent(new Event('close'));
     };
   });

   afterAll(() => {
     HTMLDialogElement.prototype.showModal = realShowModal;
     HTMLDialogElement.prototype.close = realClose;
   });

   beforeEach(() => {
     vi.mocked(downloadJsonFile).mockClear();
   });

   describe('the journal', () => {
     it('shows the notes of the active language and writes once per keystroke', async () => {
       const user = userEvent.setup();
       const rig = openMethod(storedRoute({ notes: { rust: { learned: 'de Rust', next: '' }, go: { learned: '', next: '' } } }));
       expect(screen.getByRole('heading', { name: 'Tu bitácora de Go.' })).toBeInTheDocument();
       expect(screen.getByText(AUTOMATIC)).toBeInTheDocument();
       await user.type(screen.getByRole('textbox', { name: 'La próxima vez voy a…' }), 'abc');
       expect(rig.events).toEqual([`save ${ROUTE_KEY}`, `save ${ROUTE_KEY}`, `save ${ROUTE_KEY}`]);
       expect(rig.store.getProgress().notes).toEqual({
         rust: { learned: 'de Rust', next: '' },
         go: { learned: '', next: 'abc' },
       });
       expect(screen.getByText(SAVED)).toBeInTheDocument();
       expect(document.getElementById('tutor-prompt')).toHaveTextContent(/Tengo 45 minutos\..*Mi próximo paso: abc$/s);
     });

     it('says that it could not save when the storage stops writing', async () => {
       const user = userEvent.setup();
       const rig = openMethod(storedRoute());
       rig.storage.failWrites = true;
       await user.type(screen.getByRole('textbox', { name: 'Lo que entendí / lo que todavía me cuesta' }), 'a');
       expect(screen.getByText('No se pudo guardar. Exportá tu avance al terminar.')).toBeInTheDocument();
     });

     it('Review Focus 1: shows what another tab saved between two keystrokes and keeps what was typed', async () => {
       const user = userEvent.setup();
       const rig = openMethod(storedRoute());
       const learned = screen.getByRole('textbox', { name: 'Lo que entendí / lo que todavía me cuesta' });
       await user.type(learned, 'a');
       const otherTab = JSON.parse(rig.storage.items.get(ROUTE_KEY) ?? 'null') as { notes: { go: { next: string } } };
       otherTab.notes.go.next = 'de otra pestaña';
       rig.storage.items.set(ROUTE_KEY, JSON.stringify(otherTab));
       await user.type(learned, 'b');
       expect(learned).toHaveValue('ab');
       expect(screen.getByRole('textbox', { name: 'La próxima vez voy a…' })).toHaveValue('de otra pestaña');
       expect(rig.events.filter((event) => event.startsWith('save'))).toHaveLength(2);
     });

     it('shows a note with HTML as text', () => {
       openMethod(storedRoute({ notes: { rust: { learned: '', next: '' }, go: { learned: NOTE_WITH_HTML, next: NOTE_WITH_HTML } } }));
       expect(screen.getByRole('textbox', { name: 'Lo que entendí / lo que todavía me cuesta' })).toHaveValue(NOTE_WITH_HTML);
       expect(document.getElementById('tutor-prompt')).toHaveTextContent(`Mi próximo paso: ${NOTE_WITH_HTML}`);
       expect(document.querySelector('img')).toBeNull();
     });
   });

   describe('copying the prompt', () => {
     function stubClipboard(writeText: () => Promise<void>, copyCommand: () => boolean): void {
       Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
       Object.defineProperty(document, 'execCommand', { configurable: true, value: copyCommand });
     }

     it('uses the clipboard first', async () => {
       const user = userEvent.setup();
       const writeText = vi.fn(async () => undefined);
       stubClipboard(writeText, () => false);
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Copiar pedido para mi tutor' }));
       expect(writeText).toHaveBeenCalledWith(document.getElementById('tutor-prompt')?.textContent);
       expect(rig.events).toEqual(['notify Pedido copiado. Pegalo en tu asistente.']);
     });

     it('falls back to the copy command with an off-screen field it removes', async () => {
       const user = userEvent.setup();
       stubClipboard(() => Promise.reject(new Error('denied')), () => true);
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Copiar pedido para mi tutor' }));
       expect(rig.events).toEqual(['notify Pedido copiado.']);
       expect(document.body.querySelectorAll('body > textarea')).toHaveLength(0);
     });

     it('selects the prompt when both fail', async () => {
       const user = userEvent.setup();
       stubClipboard(() => Promise.reject(new Error('denied')), () => false);
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Copiar pedido para mi tutor' }));
       expect(rig.events).toEqual(['notify Texto seleccionado. Usá Copiar en tu navegador.']);
       expect(document.getSelection()?.toString()).toBe(document.getElementById('tutor-prompt')?.textContent);
     });
   });

   describe('the sources and the backups', () => {
     it('lists every source as a link to another tab with its note', () => {
       openMethod();
       const list = screen.getByRole('heading', { name: 'Las fuentes, a mano.' }).parentElement as HTMLElement;
       const links = within(list).getAllByRole('link');
       expect(links).toHaveLength(guide.sources.length);
       expect(links[0]).toHaveAttribute('href', guide.sources[0]?.url);
       expect(links[0]).toHaveAttribute('target', '_blank');
       expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
       expect(links[0]).toHaveTextContent(`${guide.sources[0]?.title} ↗`);
     });

     it('hides the backups panel without slots', () => {
       openMethod();
       expect(screen.queryByRole('heading', { name: 'Respaldos de seguridad.' })).toBeNull();
     });

     it('lists each slot with its area, key and size, and downloads the text it reads again', async () => {
       const user = userEvent.setup();
       const rig = openMethod({}, (backup) => {
         backup.backups = [
           { area: 'laboratorio', key: 'taller-laboratorio-v1:respaldo', text: 'x'.repeat(2048) },
           { area: 'campaña', key: 'taller-campaign-v1:respaldo', text: '{"campaign":1}' },
         ];
       });
       const panel = screen.getByRole('heading', { name: 'Respaldos de seguridad.' }).parentElement as HTMLElement;
       const items = within(panel).getAllByRole('listitem');
       expect(items[0]).toHaveTextContent('laboratorio · taller-laboratorio-v1:respaldo · 2.0 KB Descargar');
       expect(items[1]).toHaveTextContent('campaña · taller-campaign-v1:respaldo · 0.0 KB Descargar');
       rig.backup.backups[1] = { area: 'campaña', key: 'taller-campaign-v1:respaldo', text: '{"campaign":"cambió"}' };
       await user.click(screen.getByRole('button', { name: 'Descargar respaldo de campaña: taller-campaign-v1:respaldo' }));
       expect(rig.backup.calls).toEqual(['readBackup taller-campaign-v1:respaldo']);
       expect(downloadJsonFile).toHaveBeenCalledWith({ fileName: 'respaldo.json', text: '{"campaign":"cambió"}' });
       expect(rig.events).toEqual(['notify Respaldo descargado.']);
     });
   });

   describe('exporting and importing', () => {
     it('downloads what the feature exports and announces it, without writing', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Exportar progreso' }));
       expect(downloadJsonFile).toHaveBeenCalledWith(rig.backup.exportedFile);
       expect(rig.events).toEqual(['notify Copia de progreso exportada.']);
     });

     it('Review Focus 5: plans the exact text of the file, applies it, announces it and empties the picker', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       const input = document.getElementById('import-file') as HTMLInputElement;
       expect(input).toHaveAttribute('accept', 'application/json,.json');
       expect(input).toHaveAttribute('aria-label', 'Importar archivo de progreso');
       await user.upload(input, new File(['  {"version":1}\n'], 'copia.json', { type: 'application/json' }));
       await vi.waitFor(() => expect(rig.events).toContain('notify Copia importada y combinada con tu avance actual.'));
       expect(rig.backup.calls).toEqual(['planImport   {"version":1}\n', 'applyImport']);
       expect(input.value).toBe('');
     });

     it('rejects a file over 10 MB before reading it', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       const file = new File(['{}'], 'enorme.json', { type: 'application/json' });
       Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 });
       const read = vi.spyOn(file, 'text');
       await user.upload(document.getElementById('import-file') as HTMLInputElement, file);
       await vi.waitFor(() =>
         expect(rig.events).toEqual(['notify No se pudo importar: El archivo supera el tamaño permitido (10 MB).']),
       );
       expect(read).not.toHaveBeenCalled();
     });

     it('explains a broken JSON', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       rig.backup.planFailure = new SyntaxError('Unexpected end of JSON input');
       await user.upload(document.getElementById('import-file') as HTMLInputElement, new File(['{'], 'roto.json'));
       await vi.waitFor(() => expect(rig.events).toEqual(['notify No se pudo importar: el archivo no contiene JSON válido.']));
     });

     it('shows the imported notes without remounting and keeps the note status', async () => {
       const user = userEvent.setup();
       const rig = openMethod(storedRoute());
       await user.type(screen.getByRole('textbox', { name: 'La próxima vez voy a…' }), 'x');
       rig.backup.onApplyImport = () => {
         const progress = rig.store.getProgress();
         rig.store.applyImport({
           state: { ...progress, notes: { ...progress.notes, go: { learned: 'importado', next: 'x' } } },
           lossy: false,
         });
       };
       await user.upload(document.getElementById('import-file') as HTMLInputElement, new File(['{}'], 'copia.json'));
       expect(await screen.findByDisplayValue('importado')).toBeInTheDocument();
       expect(screen.getByText(SAVED)).toBeInTheDocument();
     });
   });

   describe('Borrar todo, local', () => {
     it('opens the confirmation in body and closes it with «Conservar mi avance» without resetting', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       const dialog = screen.getByRole('dialog', { name: '¿Borrar tu progreso?' });
       expect(dialog.parentElement).toBe(document.body);
       expect(dialog).toHaveAttribute('id', 'confirm-dialog');
       await user.click(within(dialog).getByRole('button', { name: 'Conservar mi avance' }));
       expect(screen.queryByRole('dialog')).toBeNull();
       expect(rig.backup.calls).toEqual([]);
       expect(rig.events).toEqual([]);
     });

     it('resets, saves, closes, shows the blank route and announces, in that order, and focuses «Borrar mi progreso»', async () => {
       const user = userEvent.setup();
       const stored = storedRoute({ notes: { rust: { learned: '', next: '' }, go: { learned: 'de Go', next: '' } } });
       const rig = openMethod(stored, (backup) => {
         backup.backups = [{ area: 'campaña', key: 'taller-campaign-v1:respaldo', text: '{' }];
       });
       rig.backup.onResetAll = () => {
         rig.backup.backups = [];
         rig.events.push('resetAll');
         rig.store.reset();
       };
       const opener = screen.getByRole('button', { name: 'Borrar mi progreso' });
       await user.click(opener);
       const dialog = screen.getByRole('dialog', { name: '¿Borrar tu progreso?' });
       dialog.addEventListener('close', () => rig.events.push('close'));
       await user.click(within(dialog).getByRole('button', { name: 'Borrar todo' }));
       await vi.waitFor(() => expect(rig.events.at(-1)).toBe(`notify ${RESET_DONE}`));
       expect(rig.events).toEqual(['resetAll', `save ${ROUTE_KEY}`, 'close', `notify ${RESET_DONE}`]);
       expect(screen.getByRole('heading', { name: 'Tu bitácora de Rust.' })).toBeInTheDocument();
       expect(screen.getByRole('textbox', { name: 'Lo que entendí / lo que todavía me cuesta' })).toHaveValue('');
       expect(screen.queryByRole('heading', { name: 'Respaldos de seguridad.' })).toBeNull();
       expect(opener).toHaveFocus();
     });

     it('announces the failure notice of the feature', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       rig.backup.resetNotice = 'No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.';
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar todo' }));
       await vi.waitFor(() =>
         expect(rig.events.at(-1)).toBe(
           'notify No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.',
         ),
       );
     });

     it('closes the confirmation when the page unmounts', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       rig.unmount();
       expect(document.getElementById('confirm-dialog')).toBeNull();
     });
   });
   ```

   - El caso de los respaldos cambia la ranura después de dibujar y exige el texto nuevo: es la relectura de FR-020.
   - El cierre de la confirmación se anota con un oyente de `close`, porque el stub lo despacha en el momento.
5. **Correr** `npm run test:unit -- frontend/src/pages/method`: la spec de la página falla con `not implemented`.
6. **Commit:** `test(front): la página de Método (en rojo)`.

### Tarea 3.6 · La página (T011, M)

**Archivos:** los ocho componentes y `lib/copy-with-fallback.ts`.

1. **`lib/copy-with-fallback.ts`.** Conserva las dos propiedades CSSOM de hoy (FR-036):

   ```ts
   export type CopyResult = 'clipboard' | 'command' | 'selection';

   function copyWithCommand(text: string): boolean {
     const field = document.createElement('textarea');
     field.value = text;
     field.style.position = 'fixed';
     field.style.top = '-1000px';
     document.body.appendChild(field);
     field.select();
     let copied = false;
     try {
       copied = document.execCommand('copy');
     } catch {
       copied = false;
     }
     field.remove();
     return copied;
   }

   function selectContents(target: HTMLElement): void {
     const range = document.createRange();
     range.selectNodeContents(target);
     const selection = document.getSelection();
     selection?.removeAllRanges();
     selection?.addRange(range);
   }

   export async function copyWithFallback(text: string, fallbackTarget: HTMLElement): Promise<CopyResult> {
     try {
       await navigator.clipboard.writeText(text);
       return 'clipboard';
     } catch {
       if (copyWithCommand(text)) return 'command';
       selectContents(fallbackTarget);
       return 'selection';
     }
   }
   ```

2. **`ui/MethodIntro.tsx`.** Copia el encabezado y la grilla de `renderMethod`; el `style=` ya es `className="routine-note"`:

   ```tsx
   const MethodIntro = () => (
     <>
       <div className="page-heading">
         <div className="eyebrow">
           <span className="eyebrow-line"></span> HACER ESPACIO PARA APRENDER
         </div>
         <h1>
           Menos inercia.
           <br />
           <em>Más curiosidad.</em>
         </h1>
         <p>
           No necesitás una tarde libre. Necesitás un problema pequeño y un lugar al que volver. Esta es una propuesta
           flexible, no una obligación diaria.
         </p>
       </div>
       <div className="method-grid">
         <section className="method-panel">
           <h2>Una sesión de 25 minutos.</h2>
           <ol className="routine">
             <li>
               <span className="routine-time">03′</span>
               <span>
                 <strong>Recordá sin mirar.</strong>
                 <br />
                 Reconstruí una idea de la sesión anterior.
               </span>
             </li>
             <li>
               <span className="routine-time">17′</span>
               <span>
                 <strong>Escribí, ejecutá, probá.</strong>
                 <br />
                 Un ejercicio o una modificación pequeña. Si te trabás, buscá una pista concreta.
               </span>
             </li>
             <li>
               <span className="routine-time">05′</span>
               <span>
                 <strong>Dejá un hilo para volver.</strong>
                 <br />
                 Anotá qué entendiste y el siguiente paso exacto.
               </span>
             </li>
           </ol>
           <p className="routine-note">
             ¿Día complicado? Cinco minutos para un test o una pregunta también cuentan. Si elegís otra duración, adaptá
             los bloques sin apuro.
           </p>
         </section>
         <section className="method-panel">
           <h2>Aprender con intención.</h2>
           <ul>
             <li>Elegí un curso principal y un proyecto.</li>
             <li>Después de resolver, cambiá una condición.</li>
             <li>De vez en cuando, volvé a escribir algo desde cero.</li>
             <li>
               Usá la IA para preguntas y pistas. Probá desactivar la generación de bloques completos durante los
               ejercicios.
             </li>
             <li>Medí avance por lo que podés explicar y demostrar.</li>
           </ul>
         </section>
       </div>
     </>
   );

   export default MethodIntro;
   ```

   JSX junta las líneas partidas de un texto con un espacio, así que el texto de cada párrafo queda igual al de `renderMethod`. Los saltos alrededor de `<br />` no dejan espacios: el marcado queda `Menos inercia.<br><em>…`, como hoy. La comparación única de T021 lo confirma.
3. **`ui/JournalPanel.tsx`:**

   ```tsx
   import { useState, type ChangeEvent } from 'react';
   import type { RouteStore } from '../../../entities/guide';
   import { languageName, noteStateAfterWrite, noteStateOnMount } from '../model/method-texts';
   import { writeNote, type NoteField } from '../model/write-note';

   interface JournalPanelProps {
     readonly store: RouteStore;
   }

   const JournalPanel = ({ store }: JournalPanelProps) => {
     const [noteState, setNoteState] = useState(() => noteStateOnMount(store.storageAvailable()));
     const progress = store.getProgress();
     const notes = progress.notes[progress.language];
     const write = (field: NoteField) => (event: ChangeEvent<HTMLTextAreaElement>) => {
       setNoteState(noteStateAfterWrite(writeNote(store, field, event.target.value)));
     };
     return (
       <section className="method-panel notes-panel">
         <h2>{`Tu bitácora de ${languageName(progress.language)}.`}</h2>
         <div className="notes-grid">
           <label>
             <span className="field-label">Lo que entendí / lo que todavía me cuesta</span>
             <textarea
               id="note-learned"
               maxLength={20000}
               placeholder="Hoy entendí por qué…"
               value={notes.learned}
               onChange={write('learned')}
             />
           </label>
           <label>
             <span className="field-label">La próxima vez voy a…</span>
             <textarea
               id="note-next"
               maxLength={20000}
               placeholder="Dejá una acción concreta: escribir un test para…"
               value={notes.next}
               onChange={write('next')}
             />
           </label>
         </div>
         <p id="note-state" className="note-state">
           {noteState}
         </p>
       </section>
     );
   };

   export default JournalPanel;
   ```

4. **`ui/TutorPanel.tsx`:**

   ```tsx
   import { useRef } from 'react';
   import type { RouteStore } from '../../../entities/guide';
   import { copyWithFallback, type CopyResult } from '../lib/copy-with-fallback';
   import { tutorPrompt } from '../model/method-texts';

   const COPY_NOTICE: Readonly<Record<CopyResult, string>> = {
     clipboard: 'Pedido copiado. Pegalo en tu asistente.',
     command: 'Pedido copiado.',
     selection: 'Texto seleccionado. Usá Copiar en tu navegador.',
   };

   interface TutorPanelProps {
     readonly store: RouteStore;
     notify(message: string): void;
   }

   const TutorPanel = ({ store, notify }: TutorPanelProps) => {
     const promptElement = useRef<HTMLQuoteElement>(null);
     const copy = async (): Promise<void> => {
       const target = promptElement.current;
       if (target === null) return;
       notify(COPY_NOTICE[await copyWithFallback(tutorPrompt(store.getProgress()), target)]);
     };
     return (
       <section className="method-panel notes-panel">
         <h2>Un tutor que te haga pensar.</h2>
         <p>
           Copiá este pedido en tu asistente. Context7 aporta documentación; el asistente acompaña con preguntas. El
           acceso a Context7 depende de las herramientas de ese asistente.
         </p>
         <blockquote className="tutor-prompt" id="tutor-prompt" ref={promptElement}>
           {tutorPrompt(store.getProgress())}
         </blockquote>
         <button className="button secondary" onClick={() => void copy()}>
           Copiar pedido para mi tutor <span aria-hidden="true">↗</span>
         </button>
       </section>
     );
   };

   export default TutorPanel;
   ```

5. **`ui/SourcesPanel.tsx`:**

   ```tsx
   import type { GuideSource } from '../../../entities/guide';

   interface SourcesPanelProps {
     readonly sources: readonly GuideSource[];
   }

   const SourcesPanel = ({ sources }: SourcesPanelProps) => (
     <section className="method-panel notes-panel">
       <h2>Las fuentes, a mano.</h2>
       <p>
         La selección combina sitios originales y experiencias de comunidad. Los hilos son opiniones, no un consenso.
         Las duraciones del recorrido son propuestas de esta guía.
       </p>
       <ul className="source-list">
         {sources.map((source) => (
           <li key={source.url}>
             <a href={source.url} target="_blank" rel="noopener noreferrer">
               {`${source.title} ↗`}
             </a>
             <p>{source.note}</p>
           </li>
         ))}
       </ul>
     </section>
   );

   export default SourcesPanel;
   ```

   Las URL de `content/guide/sources.yaml` son únicas (9 de 9), así que sirven de `key`.
6. **`ui/BackupsPanel.tsx`:**

   ```tsx
   import type { ProgressBackup } from '../../../features/progress-backup';
   import { downloadJsonFile } from '../../../shared/lib/download-file';
   import { backupSizeLabel } from '../model/method-texts';

   interface BackupsPanelProps {
     readonly progressBackup: ProgressBackup;
     notify(message: string): void;
   }

   const BackupsPanel = ({ progressBackup, notify }: BackupsPanelProps) => {
     const backups = progressBackup.listBackups();
     if (backups.length === 0) return null;
     const download = (key: string): void => {
       const file = progressBackup.readBackup(key);
       if (file === undefined) return;
       downloadJsonFile(file);
       notify('Respaldo descargado.');
     };
     return (
       <section className="method-panel notes-panel">
         <h2>Respaldos de seguridad.</h2>
         <p>
           Cuando esta versión no pudo leer parte de tu progreso, guardó acá el texto original. Descargalo antes de
           borrar los datos del navegador; «Borrar mi progreso» también los elimina.
         </p>
         <ul className="source-list">
           {backups.map(({ area, key, text }) => (
             <li key={key}>
               <strong>{area}</strong>
               {` · ${key} · ${backupSizeLabel(text)} `}
               <button
                 className="button secondary"
                 aria-label={`Descargar respaldo de ${area}: ${key}`}
                 onClick={() => download(key)}
               >
                 Descargar
               </button>
             </li>
           ))}
         </ul>
       </section>
     );
   };

   export default BackupsPanel;
   ```

7. **`ui/ResetDialog.tsx`,** la versión local de U3. U4 la reemplaza en T018:

   ```tsx
   import { useEffect, useRef } from 'react';
   import { createPortal } from 'react-dom';
   import type { ResetOutcome } from '../../../features/progress-backup';

   interface ResetDialogProps {
     onConfirm(): Promise<ResetOutcome>;
     onDone(notice: string): void;
     onClose(): void;
   }

   const ResetDialog = ({ onConfirm, onDone, onClose }: ResetDialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     useEffect(() => {
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
       return () => element?.close();
     }, []);
     const confirm = async (): Promise<void> => {
       const outcome = await onConfirm();
       if ('refusal' in outcome) return;
       dialog.current?.close();
       onDone(outcome.notice);
     };
     return createPortal(
       <dialog id="confirm-dialog" aria-labelledby="confirm-title" ref={dialog} onClose={onClose}>
         <div className="dialog-content">
           <h2 id="confirm-title">¿Borrar tu progreso?</h2>
           <p>
             Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos
             lenguajes en este navegador. Podés exportarlos antes.
           </p>
           <div className="dialog-actions">
             <button className="button secondary" id="cancel-reset" onClick={() => dialog.current?.close()}>
               Conservar mi avance
             </button>
             <button className="button danger" id="confirm-reset" onClick={() => void confirm()}>
               Borrar todo
             </button>
           </div>
         </div>
       </dialog>,
       document.body,
     );
   };

   export default ResetDialog;
   ```

8. **`ui/ProgressPanel.tsx`,** la versión local de U3:

   ```tsx
   import { useRef, useState, type ChangeEvent } from 'react';
   import type { RouteStore } from '../../../entities/guide';
   import {
     assertImportSize,
     importFailureNotice,
     type ProgressBackup,
     type ResetOutcome,
   } from '../../../features/progress-backup';
   import { downloadJsonFile } from '../../../shared/lib/download-file';
   import ResetDialog from './ResetDialog';

   interface ProgressPanelProps {
     readonly progressBackup: ProgressBackup;
     readonly store: RouteStore;
     notify(message: string): void;
   }

   const ProgressPanel = ({ progressBackup, store, notify }: ProgressPanelProps) => {
     const [confirming, setConfirming] = useState(false);
     const fileInput = useRef<HTMLInputElement>(null);
     const resetButton = useRef<HTMLButtonElement>(null);

     const exportProgress = (): void => {
       downloadJsonFile(progressBackup.exportProgress());
       notify('Copia de progreso exportada.');
     };

     const importChosenFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
       const input = event.currentTarget;
       const file = input.files?.[0];
       if (file === undefined) return;
       try {
         assertImportSize(file.size);
         const plan = progressBackup.planImport(await file.text());
         const { notice } = await progressBackup.applyImport(plan);
         notify(notice);
       } catch (error) {
         notify(importFailureNotice(error));
       }
       input.value = '';
     };

     const resetEverything = async (): Promise<ResetOutcome> => {
       const outcome = await progressBackup.resetAll();
       if (!('refusal' in outcome)) store.save();
       return outcome;
     };

     const finishReset = (notice: string): void => {
       resetButton.current?.focus();
       notify(notice);
     };

     return (
       <section className="method-panel notes-panel">
         <h2>Tu progreso te pertenece.</h2>
         <p>
           Pasos, favoritos, respuestas y notas se guardan en este navegador. Incluyen también XP, sellos e insignias de
           campaña, más los talleres, notas y etapas de Sistemas. No se sincronizan entre dispositivos. Si cambiás de
           navegador, movés el archivo o borrás sus datos, exportá antes una copia.
         </p>
         <div className="data-actions">
           <button className="button secondary" onClick={exportProgress}>
             Exportar progreso
           </button>
           <button className="button secondary" onClick={() => fileInput.current?.click()}>
             Importar una copia
           </button>
           <button className="text-button" ref={resetButton} onClick={() => setConfirming(true)}>
             Borrar mi progreso
           </button>
         </div>
         <p className="data-explainer">
           Importar combina los pasos y favoritos. Para notas y respuestas del mismo tema, conserva los valores de la
           copia importada. El temporizador no forma parte del respaldo.
         </p>
         <input
           id="import-file"
           type="file"
           accept="application/json,.json"
           hidden
           aria-label="Importar archivo de progreso"
           ref={fileInput}
           onChange={(event) => void importChosenFile(event)}
         />
         {confirming ? (
           <ResetDialog onConfirm={resetEverything} onDone={finishReset} onClose={() => setConfirming(false)} />
         ) : null}
       </section>
     );
   };

   export default ProgressPanel;
   ```

   - `event.currentTarget` se lee antes del primer `await`: React lo vacía cuando termina de despachar el evento.
   - Sin paso del servidor, `resetAll` nunca rechaza. La rama del rechazo ya está tipada para U4, que sólo le agrega la contraseña.
9. **`ui/MethodPage.tsx`:**

   ```tsx
   import { useStore } from 'zustand';
   import { routeStore, type GuideSource, type RouteStore } from '../../../entities/guide';
   import type { ProgressBackup } from '../../../features/progress-backup';
   import BackupsPanel from './BackupsPanel';
   import JournalPanel from './JournalPanel';
   import MethodIntro from './MethodIntro';
   import ProgressPanel from './ProgressPanel';
   import SourcesPanel from './SourcesPanel';
   import TutorPanel from './TutorPanel';

   export interface MethodPageProps {
     readonly sources: readonly GuideSource[];
     readonly progressBackup: ProgressBackup;
     readonly store?: RouteStore;
     notify(message: string): void;
   }

   const MethodPage = ({ sources, progressBackup, store = routeStore, notify }: MethodPageProps) => {
     useStore(store.changes, (state) => state.revision);
     return (
       <>
         <MethodIntro />
         <JournalPanel store={store} />
         <TutorPanel store={store} notify={notify} />
         <SourcesPanel sources={sources} />
         <BackupsPanel progressBackup={progressBackup} notify={notify} />
         <ProgressPanel progressBackup={progressBackup} store={store} notify={notify} />
       </>
     );
   };

   export default MethodPage;
   ```

   - **La suscripción** a la revisión vive en la página: cualquier escritura del recorrido vuelve a dibujar las seis secciones, que leen `store.getProgress()` y `listBackups()` en ese render.
   - **El orden** es el de `renderMethod`: el encabezado y la grilla, la bitácora, el tutor, las fuentes, los respaldos y «Tu progreso te pertenece.».
10. **`shared/lib/download-file.ts`.** Suma `downloadJsonFile`, que la página ya usa. Va acá porque la spec lo reemplaza con `vi.mock`, y T013 lo usa también desde `app.js`:

    ```ts
    export interface DownloadableFile {
      readonly fileName: string;
      readonly text: string;
    }

    export function downloadJsonFile(file: DownloadableFile): void {
      downloadBlob(new Blob([file.text], { type: 'application/json' }), file.fileName);
    }
    ```

11. **Correr** `npm run test:unit -- frontend/src/pages/method`, todo en verde, y después `npm run typecheck` y `npm run lint`. Ninguna función pasa de 10.
12. **Commit:** `feat(front): la página de Método, sin montar`.

### Tarea 3.7 · Los checks cargan `app.js` con su instancia (T012, Q, desde S1)

**Archivos:**

- `qa/lib/sources.ts`, `qa/lib/legacy-sources.ts` y `qa/lib/app-shell-harness.ts`;
- `qa/app-shell-check.ts` y `qa/boot-check.ts`;
- `frontend/src/features/progress-backup/model/progress-backup-edges.spec.ts` (nuevo).

**Por qué antes del corte.** Todo esto pasa en verde contra el `app.js` de hoy, que ignora el argumento de `startApp` y arma su instancia. Después del corte sigue en verde sin tocarlo (research.md, R10).

1. **`qa/lib/sources.ts`.**
   - **La expresión del arranque** acepta un argumento:

     ```ts
     const START_CALL_STATEMENT = /^[ \t]*startApp\([^)]*\);?[ \t]*$/gm;
     ```

   - **`bundleApp` puede exponer exportaciones** del mismo bundle:

     ```ts
     export interface AppBundleOptions {
       withoutStartCall?: boolean;
       expose?: readonly string[];
     }

     const EXPOSED_GLOBAL = '__QA_EXPOSED__';

     function exposingEntry(relativePath: string, exposed: readonly string[]): esbuild.BuildOptions {
       const lines = [
         `import ${JSON.stringify(path.join(repoRoot, relativePath))};`,
         ...exposed.map((module) => `export * from ${JSON.stringify(path.join(repoRoot, module))};`),
       ];
       return {
         stdin: {
           contents: lines.join('\n'),
           resolveDir: repoRoot,
           loader: 'ts',
           sourcefile: `exposing:${relativePath}`,
         },
         globalName: EXPOSED_GLOBAL,
       };
     }

     export async function bundleApp(
       relativePath: string,
       options: AppBundleOptions = {},
     ): Promise<string> {
       const withoutStartCall = options.withoutStartCall ?? false;
       const exposed = options.expose ?? [];
       const key = `${relativePath}|withoutStartCall=${withoutStartCall}|expose=${exposed.join(',')}`;
       const cached = appCache.get(key);
       if (cached !== undefined) return cached;
       const text = await buildWithPlugins(relativePath, {
         ...(exposed.length > 0 ? exposingEntry(relativePath, exposed) : {}),
         ...(withoutStartCall ? { plugins: [stripStartCall()] } : {}),
         format: 'iife',
         platform: 'browser',
         target: 'es2020',
         jsx: 'automatic',
         loader: { '.css': 'empty' },
         define: {
           'process.env.NODE_ENV': '"production"',
           __CONTENT_VERSION__: JSON.stringify(contentVersion()),
         },
       });
       appCache.set(key, text);
       return text;
     }
     ```

     Con `globalName`, el `var` de la IIFE queda como propiedad del contexto `vm`.
   - **`runEntry`** evalúa una entrada virtual y devuelve sus exportaciones, como `runModule`:

     ```ts
     const entryCache = new Map<string, string>();

     export function runEntry<T>(context: vm.Context, name: string, contents: string): T {
       let wrapped = entryCache.get(name);
       if (wrapped === undefined) {
         const bundle = build(name, {
           stdin: { contents, resolveDir: repoRoot, loader: 'ts', sourcefile: name },
           format: 'iife',
           globalName: MODULE_GLOBAL_NAME,
           platform: 'browser',
           target: 'es2020',
           legalComments: 'inline',
         });
         wrapped = `(function () {\n${bundle}\nreturn ${MODULE_GLOBAL_NAME};\n})()`;
         entryCache.set(name, wrapped);
       }
       return vm.runInContext(wrapped, context, { filename: name }) as T;
     }
     ```

2. **`qa/lib/legacy-sources.ts`.** Con B2 presente, se suman sólo las dos líneas y los dos miembros que falten.

   ```ts
   export interface ShellProgressFile {
     fileName: string;
     text: string;
   }

   export interface ShellProgressBackup {
     exportProgress(): ShellProgressFile;
     registerSessionReset(reset: () => void): void;
   }

   export interface ShellRouteStore {
     getProgress(): { language: Language; notes: Record<Language, { learned: string; next: string }> };
     save(): boolean;
     reset(): boolean;
   }

   export interface AppShellModule {
     startApp(progressBackup: ShellProgressBackup): void;
     routeStore: ShellRouteStore;
     createProgressBackup(options: {
       guide: unknown;
       areas: unknown;
       sessionResets: readonly (() => void)[];
     }): Omit<ShellProgressBackup, 'registerSessionReset'>;
     createProgressAreas(sources: {
       route: unknown;
       campaign: unknown;
       systems: unknown;
       legacy(): unknown;
     }): unknown;
   }

   const APP_SHELL_ENTRY = [
     "export { startApp } from './frontend/app.js';",
     "export { routeStore } from './frontend/src/entities/guide';",
     "export { createProgressBackup } from './frontend/src/features/progress-backup';",
     "export { createProgressAreas } from './frontend/src/app/progress-backup/progress-areas';",
   ].join('\n');

   export function loadAppShell(context: vm.Context): AppShellModule {
     return runEntry<AppShellModule>(context, 'app-shell-entry', APP_SHELL_ENTRY);
   }
   ```

   - El import de `runModule` pasa a `runEntry`, si `runModule` queda sin uso en el archivo.
   - Los cuatro exports salen del mismo bundle: `createProgressBackup` evalúa el índice de `entities/guide`, y su `routeStore` es el mismo que abre `startApp`.
3. **`qa/lib/app-shell-harness.ts`.**
   - **La interfaz `Harness`** suma tres miembros:

     ```ts
     shell: AppShellModule | null;
     writeNote(field: 'learned' | 'next', value: string): void;
     resetRoute(): void;
     ```

   - **En `createHarness`**, el objeto que se devuelve pasa a ser `const harness: Harness = { …lo de hoy…, shell: null, writeNote, resetRoute }`, con:

     ```ts
     writeNote(field, value) {
       const store = shellOf(harness).routeStore;
       const progress = store.getProgress();
       progress.notes[progress.language][field] = value;
       store.save();
     },
     resetRoute() {
       shellOf(harness).routeStore.reset();
     },
     ```

     Después del objeto, `return harness;`.
   - **Las funciones nuevas,** antes de `buildHarness`:

     ```ts
     function shellOf(harness: Harness): AppShellModule {
       assert.ok(harness.shell, 'el shell todavía no arrancó: usá buildHarness o startShell');
       return harness.shell;
     }

     function progressBackupFor(harness: Harness, shell: AppShellModule): ShellProgressBackup {
       const context = harness.context;
       const sessionResets: (() => void)[] = [
         () => (context['TallerSystems'] as { resetSimulations(): void } | undefined)?.resetSimulations(),
       ];
       const backup = shell.createProgressBackup({
         guide: context['GUIDE_DATA'],
         areas: shell.createProgressAreas({
           route: shell.routeStore,
           campaign: context['TallerCampaignEngine'],
           systems: context['TallerSystemsEngine'],
           legacy: () => context,
         }),
         sessionResets,
       });
       return {
         ...backup,
         registerSessionReset(reset) {
           sessionResets.push(reset);
         },
       };
     }

     export function startShell(harness: Harness): ShellProgressBackup {
       const shell = loadAppShell(harness.context);
       harness.shell = shell;
       const progressBackup = progressBackupFor(harness, shell);
       shell.startApp(progressBackup);
       return progressBackup;
     }
     ```

   - **`buildHarness`** pasa a ser:

     ```ts
     export function buildHarness(options: HarnessOptions = {}): Harness {
       const harness = createHarness(options);
       startShell(harness);
       return harness;
     }
     ```

   - **Los imports:** `ShellProgressBackup` y `AppShellModule` de `./legacy-sources.ts`.
4. **`qa/app-shell-check.ts`,** sin tocar ningún valor esperado:
   - **«startApp calls the adapters in order and then renders».** `loadAppShell(harness.context).startApp();` pasa a `startShell(harness);`.
   - **«a second startApp call fails and adds no timer or listener».** Las dos primeras líneas pasan a `const harness = createHarness();` y `const progressBackup = startShell(harness);`. El `assert.throws` llama a `() => harness.shell?.startApp(progressBackup)`.
   - **«almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar».** `await changeField(harness, 'input', { note: 'learned' }, '');` pasa a `harness.writeNote('learned', '');`.
   - **Los imports:** `startShell` entra en el import de `./lib/app-shell-harness.ts`, y el de `loadAppShell` sale.
5. **`qa/boot-check.ts`.**
   - **«main.tsx without its call»** y los dos escenarios de `startApp` toman la llamada del mismo bundle:

     ```ts
     const APP_SHELL = 'frontend/app.js';
     const PROGRESS_BACKUP = 'frontend/src/app/progress-backup/app-progress-backup.ts';

     interface ExposedApp {
       startApp(progressBackup: unknown): void;
       appProgressBackup(): unknown;
     }

     interface UnstartedApp {
       harness: BootHarness;
       startApp(): void;
     }

     function exposed<T>(harness: BootHarness): T {
       return harness.context['__QA_EXPOSED__'] as T;
     }

     async function evaluateWithoutStartCall(options: HarnessOptions = {}): Promise<UnstartedApp> {
       const harness = createBootHarness({ fetch: createContentServer().fetch, ...options });
       const bundle = await bundleApp(ENTRY, { withoutStartCall: true, expose: [APP_SHELL, PROGRESS_BACKUP] });
       vm.runInContext(bundle, harness.context, { filename: ENTRY });
       await harness.flush();
       const app = exposed<ExposedApp>(harness);
       return { harness, startApp: () => app.startApp(app.appProgressBackup()) };
     }
     ```

   - **Los imports** de `loadAppShell` y `AppShellModule` salen. Los escenarios que llaman a `startApp()` no cambian.
6. **`frontend/src/features/progress-backup/model/progress-backup-edges.spec.ts`.** Es la caracterización del escenario «b) importar: sin lab, campaign ni systems no llama a ningún adaptador», que deja `app-shell-check` en T013. Nace en verde:

   ```ts
   import { describe, expect, it } from 'vitest';
   import curriculum from '../../../../../build/curriculum.json';
   import { blankRouteProgress, type GuideData } from '../../../entities/guide';
   import { createProgressBackup } from './create-progress-backup';
   import type { ProgressAreas, SealedArea } from './types';

   const guide = curriculum.guide as unknown as GuideData;

   function recordingAreas(events: string[]): ProgressAreas {
     const section = (name: string): SealedArea => ({
       exportState: () => undefined,
       planImport: () => {
         events.push(`${name}:planImport`);
         return { lossy: false };
       },
       applyImport: () => {
         events.push(`${name}:applyImport`);
         return true;
       },
       reset: () => {
         events.push(`${name}:reset`);
         return true;
       },
       backups: () => [],
       syncDerivedSeals: () => events.push(`${name}:sync`),
     });
     let route = blankRouteProgress();
     return {
       route: {
         getProgress: () => route,
         applyImport: (plan) => {
           events.push('route:applyImport');
           route = plan.state;
           return true;
         },
         reset: () => {
           events.push('route:reset');
           return true;
         },
         backups: () => [],
       },
       lab: section('lab'),
       campaign: section('campaign'),
       systems: section('systems'),
     };
   }

   describe('importing a copy without sections', () => {
     it('plans and applies only the route, and still syncs the derived seals', async () => {
       const events: string[] = [];
       const backup = createProgressBackup({ guide, areas: recordingAreas(events), sessionResets: [] });
       const plan = backup.planImport(JSON.stringify({ version: 1, completed: ['rust-ownership'] }));
       expect(await backup.applyImport(plan)).toEqual({
         notice: 'Copia importada y combinada con tu avance actual.',
       });
       expect(events).toEqual(['route:applyImport', 'systems:sync', 'campaign:sync']);
     });
   });
   ```

   T015 le suma el `describe` del paso del servidor.
7. **Correr** contra el `app.js` de hoy:
   - `node qa/app-shell-check.ts`: 58 de 58;
   - `node qa/boot-check.ts`: todos;
   - `node qa/load-order-check.ts`;
   - `npm run test:unit -- frontend/src/features/progress-backup`;
   - `npm run typecheck` y `npm run lint`.
8. **Commit:** `refactor(qa): app-shell-check y boot-check arrancan app.js con su instancia de progress-backup, del mismo bundle`.
9. **El escenario rojo de la suscripción del shell** (B1). Va en `qa/app-shell-check.ts`, después de «shell: al cargar se inicializan campaña y Sistemas y se sincroniza la barra lateral»:

   ```ts
   await test('shell: una escritura del recorrido desde una página actualiza el pie, la barra lateral y el idioma', () => {
     const harness = buildHarness({ stored: localProgress, writesBlocked: true });
     assert.equal(harness.elements['sidebar-language']?.textContent, 'GO');
     harness.writeNote('learned', 'nota nueva');
     assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
     harness.resetRoute();
     assert.equal(harness.elements['sidebar-language']?.textContent, 'RUST');
     assert.equal(harness.elements['sidebar-completed']?.textContent, '0 de 12');
     assert.equal(harness.context.document.body.dataset.language, 'rust');
   });
   ```

   - **Sin suscripción,** falla en el idioma: `#sidebar-language` sigue en `GO`.
   - **Con la suscripción de `updateSaveLabel`,** también falla en el idioma.
   - **Con `syncShell`,** nace verde, y se anota en el commit.

   **Commit:** `test(qa): el shell se entera de una escritura del recorrido hecha fuera de app.js (en rojo)`.

### Tarea 3.8 · El corte (T013, K, desde S2)

**Archivos:**

- `frontend/app.js`, `frontend/src/index.html` y `frontend/src/shared/lib/download-file.ts`, que ya trae `downloadJsonFile` de T011;
- `frontend/src/app/legacy/register-method.tsx` (nuevo) y `frontend/src/app/boot/legacy-views.ts`;
- `qa/load-order-check.ts`, `qa/lib/app-adapters.ts`, `qa/lib/app-shell-harness.ts`, `qa/app-shell-check.ts`, `qa/lib/boot-harness.ts` y `qa/boot-check.ts`.

Con las ramas F5 y F9, también lo que dice «Ramas».

**Un solo commit**, por FR-011: las ramas de los delegados salen en el mismo commit que monta la página.

1. **`frontend/src/app/legacy/register-method.tsx`:**

   ```tsx
   import { flushSync } from 'react-dom';
   import { createRoot, type Root } from 'react-dom/client';
   import type { ProgressBackup } from '../../features/progress-backup';
   import { MethodPage } from '../../pages/method';
   import { getContent } from '../content/content';

   declare global {
     interface Window {
       TallerMethod: Readonly<{ mount: typeof mount; unmount: typeof unmount }>;
     }
   }

   let root: Root | null = null;

   function unmount(): void {
     root?.unmount();
     root = null;
   }

   function mount(
     host: HTMLElement | null,
     notify: (message: string) => void,
     progressBackup: ProgressBackup,
   ): void {
     unmount();
     if (!host) return;
     const pageRoot = createRoot(host, {
       onUncaughtError(error) {
         console.error('No se pudo mostrar Método.', error);
       },
     });
     root = pageRoot;
     flushSync(() => {
       pageRoot.render(
         <MethodPage sources={getContent().guide.sources} progressBackup={progressBackup} notify={notify} />,
       );
     });
   }

   window.TallerMethod = Object.freeze({ mount, unmount });
   ```

2. **`frontend/src/app/boot/legacy-views.ts`.**
   - **La cadena.** Después de `() => import('../legacy/register-atlas'),` se suma `() => import('../legacy/register-method'),`.
   - **`run`** pasa a ser:

     ```ts
     async run() {
       for (const load of LEGACY_MODULES) await load();
       const { appProgressBackup } = await import('../progress-backup/app-progress-backup');
       const progressBackup = appProgressBackup();
       const { startApp } = await import('../../../app.js');
       startApp(progressBackup);
     },
     ```

3. **`qa/load-order-check.ts`.**
   - `START_CALL` pasa a `/^[ \t]*startApp\([^)]*\);?[ \t]*$/gm`.
   - Junto a `ATLAS`, la constante `const METHOD = 'frontend/src/app/legacy/register-method.tsx';`.
   - En `BEFORE_APP_REASONS`, la entrada:

     ```ts
     [METHOD]: 'render() de app.js llama a window.TallerMethod.unmount() y mount() sin guarda opcional',
     ```

   - El mensaje `startApp() debe llamarse exactamente una vez…` y el resto del check no cambian.
4. **`frontend/app.js`,** diez cambios:
   - **Los imports.** Salen las cinco líneas del import de `./src/features/progress-backup`. `import { downloadBlob } from './src/shared/lib/download-file';` pasa a `import { downloadJsonFile } from './src/shared/lib/download-file';`.
   - **La firma.** `export function startApp() {` pasa a `export function startApp(progressBackup) {`.
   - **La suscripción** (B1). Justo después de `const timer = { … };` va `routeStore.changes.subscribe(() => syncShell());`. Va ahí y no después de `routeStore.open(data);` porque `syncShell` lee `currentView`, un `let` declarado más abajo: un aviso antes de esa línea caería en la zona muerta temporal. Si ya hay una suscripción que llama a `updateSaveLabel`, se reemplaza por esta; si ya llama a `syncShell`, no se toca.
   - **El temporizador.** El bloque `const progressBackup = createProgressBackup({ … });` se reemplaza por el registro del paso:

     ```js
     progressBackup.registerSessionReset(() => {
       timer.running = false;
       timer.remaining = routeState().minutes * 60;
     });
     ```

     Con la rama F9, el bloque se borra sin reemplazo.
   - **Lo de Método.** Salen las funciones `tutorPrompt`, `backupsPanel`, `downloadBackup`, `renderMethod` y `copyPrompt`, y el comentario sobre `downloadBackup`.
   - **`render()`, el desmontaje.** Después de `window.TallerSystems?.unmount();` va `window.TallerMethod.unmount();`.
   - **`render()`, el montaje.** En `renderers`, `metodo: renderMethod,` pasa a `metodo: () => '',`. Después del montaje del laboratorio va:

     ```js
     if (currentView === 'metodo') window.TallerMethod.mount($('#main'), toast, progressBackup);
     ```

   - **`exportProgress`** pasa a ser:

     ```js
     function exportProgress() {
       downloadJsonFile(progressBackup.exportProgress());
       toast('Copia de progreso exportada.');
     }
     ```

   - **Los delegados.** Del de clic salen las cinco líneas `copy-prompt`, `download-backup`, `export`, `import` y `reset`. Del de entrada sale el bloque `if (target.dataset.note) { … }`.
   - **Los oyentes.** Salen los de `#cancel-reset`, `#confirm-reset` e `#import-file`. El de `#export-progress` se queda.
5. **`frontend/src/index.html`.** Salen la línea `<dialog id="confirm-dialog" …>…</dialog>` y la línea `<input id="import-file" …>`. Nada más.
6. **`qa/lib/app-adapters.ts`.** Después de `TallerAtlas: ['mount', 'unmount'],` va `TallerMethod: ['mount', 'unmount'],`.
7. **`qa/lib/app-shell-harness.ts`:**
   - **los ids:** de `ids` salen `'confirm-dialog'`, `'cancel-reset'`, `'confirm-reset'`, `'import-file'`, `'note-state'` y `'tutor-prompt'`;
   - **el comentario** de `resource-results-label` pasa a `// Los usa la biblioteca (favoritos) al guardar.`;
   - **el campo de archivo:** sale la línea `elements['import-file'] = new FakeElement('input', 'import-file');`;
   - **los adaptadores falsos:** `behaviors` suma `TallerMethod: {},`;
   - **las ayudas:** sale la función `importFile`.
8. **`qa/app-shell-check.ts`.**
   - Salen los 38 escenarios de §3.9, que ya están cubiertos o descartados con su motivo.
   - Salen también las constantes y los imports que quedan sin uso: `validImport`, `NOT_SAVED_HEAD`, `NOT_SAVED_TAIL`, `OMITTED`, `RESET_FAILED`, `scriptNote`, `backupSlots`, `plainJson` e `importFile`.
   - Quedan 21: los 20 de §3.9, «Se quedan», más el de T012.
9. **`qa/lib/boot-harness.ts`.** De `ELEMENT_IDS` salen `'confirm-dialog'`, `'cancel-reset'`, `'confirm-reset'` e `'import-file'`, y sale la línea `elements['import-file'] = new FakeElement('input', 'import-file');`.
10. **`qa/boot-check.ts`.**
    - **La navegación** (B3). Si la base no tiene la ayuda, se suma `FakeText` al import de `./lib/fake-dom.ts`, y:

      ```ts
      const REACT_VIEWS = new Set<string>(['metodo']);

      function renderedText(node: FakeElement | FakeText): string {
        if (node instanceof FakeText) return node.nodeValue;
        return node.childNodes.map(renderedText).join('');
      }
      ```

      El cuerpo del bucle de «navegación: cada vista se renderiza por hash sin lanzar» pasa a tener tres ramas:

      ```ts
      if (view === 'atlas') {
        assert.ok(main.childNodes.length > 0, 'el Atlas no montó nodos en #main');
      } else if (REACT_VIEWS.has(view)) {
        assert.ok(renderedText(main).includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
      } else {
        assert.ok(main.innerHTML.includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
      }
      ```

      Si la base ya tiene `REACT_VIEWS` o `drawnText`, se suma `'metodo'` y se usa esa ayuda.
    - **El arranque con el armado expuesto,** después de `bootApp`:

      ```ts
      interface ExposedProgressBackup {
        resetAll(confirmation?: { password: string }): Promise<{ notice?: string }>;
        exportProgress(): { text: string };
        planImport(text: string): unknown;
        applyImport(plan: unknown): Promise<{ notice: string }>;
      }

      async function bootExposingBackup(
        initialStorage: Record<string, string> = {},
        server: ContentServer = createContentServer(),
      ): Promise<{ harness: BootHarness; backup: ExposedProgressBackup }> {
        const harness = createBootHarness({ fetch: server.fetch });
        for (const [key, text] of Object.entries(initialStorage)) harness.storage.set(key, text);
        vm.runInContext(await bundleApp(ENTRY, { expose: [PROGRESS_BACKUP] }), harness.context, { filename: ENTRY });
        await harness.flush();
        const { appProgressBackup } = exposed<{ appProgressBackup(): ExposedProgressBackup }>(harness);
        return { harness, backup: appProgressBackup() };
      }
      ```

    - **«borrar todo».** El nombre pasa a «borrar todo: resetAll del armado reinicia cada adaptador y deja el recorrido en blanco», y el cuerpo, a:

      ```ts
      const { harness, backup } = await bootExposingBackup();
      const progress = { version: 1, completed: ['rust-ownership'], favorites: ['rustlings'] };
      harness.storage.set(STORAGE_KEY, JSON.stringify(progress));
      harness.storage.set(BACKUP_KEY, 'copia anterior');
      const reset: string[] = [];
      for (const [adapter, method] of RESET_METHODS) {
        const target = harness.context[adapter] as Record<string, (...args: unknown[]) => unknown>;
        const original = target[method];
        if (!original) continue;
        target[method] = (...args) => (reset.push(`${adapter}.${method}`), original(...args));
      }
      const outcome = await backup.resetAll({ password: 'contraseña de prueba' });
      await harness.flush();
      assert.deepEqual(harness.errors, []);
      assert.deepEqual(
        reset,
        RESET_METHODS.map(([adapter, method]) => `${adapter}.${method}`),
      );
      assert.equal(harness.storage.has(BACKUP_KEY), false);
      const exported = JSON.parse(backup.exportProgress().text) as { completed: string[] };
      assert.deepEqual(exported.completed, []);
      assert.equal(outcome.notice, 'Progreso reiniciado. Un nuevo comienzo.');
      ```

      - **Los mismos valores, observados en otro lado:** el recorrido en blanco se lee por la exportación, y el aviso, por lo que resuelve `resetAll`.
      - **Lo que ahora es de la página:** el `save()` que vuelve a escribir la clave y el `toast` (§3.9).
      - **Los espías ven al armado.** Los motores que importa el armado son los mismos objetos que publican `window.TallerCampaignEngine` y `window.TallerSystemsEngine`.
    - **«importación: <fixture>»** pasa a ser:

      ```ts
      const { harness, backup } = await bootExposingBackup();
      const text = readFileSync(file, 'utf8');
      const { notice } = await backup.applyImport(backup.planImport(text));
      await harness.flush();
      assert.deepEqual(harness.errors, []);
      assert.equal(notice, 'Copia importada y combinada con tu avance actual.');
      ```

11. **Correr:**
    - **la búsqueda de FR-010:** `git grep -nE "renderMethod|backupsPanel|tutorPrompt|copyPrompt|downloadBackup|createProgressBackup|features/progress-backup|confirm-dialog|cancel-reset|confirm-reset|import-file|data-note|copy-prompt|download-backup" -- frontend/app.js` no imprime nada;
    - **`index.html`:** `git diff <T001> -- frontend/src/index.html` muestra dos líneas borradas y ninguna agregada;
    - **los checks:**
      - `node qa/load-order-check.ts`, `node qa/seams-guard-check.ts` y `node qa/app-shell-check.ts` (21);
      - `node qa/boot-check.ts`, con el escenario de T012 en verde;
    - **el resto:** `npm run build`, `npm test`, `npm run lint` y `npm run format:check`;
    - **la complejidad:** el valor de `render()` es el de T001 más 1 (quickstart.md, §1.1);
    - **los E2E:** `E2E_PORT=4173 npm run test:e2e`:
      - la red de F1, A2, F11a y los ítems que ya entraron;
      - los de U1;
      - los tres de `method-kept-state.spec.ts`, ahora en verde.

      Si «after a successful import the focus stays on «Importar una copia»» falla porque el navegador mueve el foco al cerrar el selector, `ProgressPanel` suma una ref en ese botón y `importChosenFile` termina con `importButton.current?.focus()` (FR-019). Va en el mismo commit, y la prueba no se toca.
12. **Commit:** `feat(front): Método en React con su adaptador window.TallerMethod, y startApp recibe progress-backup`.
13. **Guardar la punta** como rama local `f8/u3-port`, para las comparaciones de T021.

**Compuerta de U3** (K): la de §0.1, sin ningún E2E en rojo, y la cuenta de avisos igual a T001.

### 3.9 La correspondencia de `app-shell-check` y de `boot-check`

**Los 38 escenarios de `app-shell-check` que salen** (FR-041, SC-010). Los nombres de las pruebas de Vitest son los de `create-progress-backup.spec.ts` («feature»), `progress-backup-edges.spec.ts` («bordes»), `progress-areas.spec.ts` («áreas») y `method-page.spec.tsx` («página»).

| Escenario de hoy | Lo cubre |
| --- | --- |
| b) importar una copia válida combina el recorrido y llama a cada adaptador | Feature: «merges the route with the current one» y «resolves the success notice and applies the merged route»; página: «Review Focus 5» (el campo vacío); E2E: «empties the picker so that the same file imports again» |
| b) una nota no vacía pisa la local y una vacía no | Feature: «lets a non-empty note override the local one and an empty note not» |
| b) se conservan los minutes y el language locales | Feature: «keeps the local language and minutes» |
| b) planifica las tres secciones y después aplica los tres planes | Feature: «plans the three sections in order when all are present» y «applies the sections in plan order and then the route, each after the previous ended»; áreas: «applies to each engine the plan it computed» |
| b) después de aplicar sincroniza Sistemas y Campaña, y luego renderiza | Feature: el mismo escenario de orden (`systems:sync`, `campaign:sync`); áreas: «syncs the derived seals through the legacy views…»; página: «shows the imported notes without remounting and keeps the note status» |
| b) si la sincronización de Sistemas lanza, la de campaña igual se llama | Feature: «logs a failing sync, still calls the other one and resolves the success notice» |
| b) si el laboratorio no se pudo guardar, no anuncia éxito y lo nombra | Feature: «names a laboratory that resolves false as not saved» |
| b) con el recorrido no escribible lo nombra primero y conserva la cola de omisiones | Feature: «names a route that does not save first and keeps the omission tail» |
| b) si sync lanza, el error se registra y la copia ya quedó importada | Feature: los dos escenarios de «syncing the derived seals» |
| b) sin lab, campaign ni systems no llama a ningún adaptador | Bordes: «plans and applies only the route, and still syncs the derived seals» |
| c) copia con version 2: no aplica nada y avisa el formato | Feature: «rejects version 2 as an unsupported format»; E2E: «rejects a version 2 copy without writing» |
| c) una entrada que no es objeto da el error de formato | Feature: «rejects null / an array / a number as an unsupported format» |
| d) JSON roto | Feature: «lets a broken JSON throw a SyntaxError» y «explains a SyntaxError as invalid JSON»; página: «explains a broken JSON»; E2E: «rejects a broken JSON without writing» |
| d) archivo mayor de 10 MB: se rechaza antes de leerlo | Feature: «rejects one byte more»; página: «rejects a file over 10 MB before reading it»; E2E: «rejects a file over 10 MB without writing» |
| e) atomicidad: si el plan de Sistemas lanza, no se aplica nada | Feature: «applies nothing when a section throws while planning» |
| e) atomicidad: si applyImport de Sistemas lanza a mitad, notas y pasos locales no cambian | Feature: «rejects when a section throws while applying and leaves the route unapplied»; el aviso del `catch`, página: «explains a broken JSON» |
| e) omisiones: un plan del laboratorio con lossy avisa el área | Feature: «lists the omitted areas as route, laboratory, campaign and Sistemas» |
| e) omisiones: un paso desconocido agrega el recorrido, primero en la lista | Feature: «counts an unknown step as route loss» y el escenario anterior |
| e) omisiones: el orden del aviso es recorrido, laboratorio, campaña y Sistemas | Feature: el mismo |
| e) omisiones: lab, campaign, systems y exportedAt no cuentan como pérdida | Feature: «does not count lab, campaign, systems and exportedAt as route loss» |
| h) borrar todo: elimina el respaldo del recorrido y reinicia a los motores | Feature: «resets route, laboratory, campaign and Sistemas one after the other, then the session»; `boot-check`: «borrar todo» con los adaptadores reales; E2E: el `KNOWN DEFECT` de las cuatro claves |
| h) un motor que no pudo borrar (`{ removed: false }`) da el aviso de fallo | Áreas: «resolves the removed flag of each engine reset…»; feature: «gives the failure notice when %s resolves false…» |
| h) el laboratorio que devuelve false también da el aviso de fallo | Feature: el mismo `it.each`, con `lab` |
| h) si el recorrido no pudo borrar sus claves, avisa el fallo | Feature: el mismo `it.each`, con `route` |
| h) un adaptador ausente no cuenta como fallo | Feature: «does not count an undefined result as a failure»; áreas: «treats an absent laboratory as nothing to export, reset or list». **La parte de los motores se descarta:** el armado los importa, así que no pueden faltar |
| h) sin acceso al almacenamiento no hay nada que borrar y avisa éxito | E2E: «KNOWN DEFECT: with the storage blocked it still announces success» |
| async areas: importing ends with the same notice and route | Feature: «resolves the success notice and applies the merged route», con áreas asíncronas |
| async areas: a lab that resolves false is named as not saved | Feature: «names a laboratory that resolves false as not saved», asíncrono |
| async areas: resetting everything ends with the same notice and a blank route | Feature: «resolves the success notice», asíncrono |
| async areas: an engine that resolves `{ removed: false }` gives the failure notice | Feature: el `it.each` asíncrono; áreas: el `reset` que resuelve después |
| async areas: a campaign engine that resolves `{ removed: false }` gives the failure notice | Las mismas |
| seguridad: una nota importada con HTML se escapa en #metodo | Página: «shows a note with HTML as text»; E2E: «shows an imported note with HTML as text in the journal and in the prompt» |
| almacenamiento sin escritura: importar funciona en memoria y avisa que exporte | Feature: «treats any falsy route result as not saved»; `app-shell-check`: el escenario nuevo de la suscripción (el pie) |
| respaldos: Método lista el área y la clave de cada ranura antes de «Tu progreso te pertenece» | Página: «lists each slot with its area, key and size…»; E2E: «lists an unreadable campaign before «Tu progreso te pertenece»…» |
| respaldos: sin ranuras no aparece el panel | Página: «hides the backups panel without slots»; E2E: «does not show the panel without slots» |
| respaldos: el clic descarga el texto exacto de la ranura, con su nombre, y avisa | Feature: «replaces every character outside a-z, 0-9 and the dash in the file name»; página y E2E: los de la descarga |
| respaldos: el clic vuelve a leer la ranura y descarga su texto actual | Feature: «reads the slot again on every call»; página: el mismo escenario; E2E: «downloads the current text of a slot that changed after drawing» |
| respaldos: la ranura del recorrido sale del almacenamiento y su nombre reemplaza los dos puntos | Feature: «lists route, laboratory, campaign and Sistemas in that order with their area» y el del nombre |

**Se quedan, con los mismos valores (20):**

- los 2 de a), que exportan por la barra lateral;
- los 7 de f);
- los 2 de avisos;
- los 3 de almacén, el primero con `harness.writeNote`;
- accesibilidad;
- los 2 de g);
- shell;
- los 2 de `startApp`.

A esos se suma el nuevo de T012.

**`boot-check`:**

| Escenario | Qué cambia | Por qué |
| --- | --- | --- |
| navegación: cada vista se renderiza por hash sin lanzar | `#metodo` se lee por los nodos de React, con el mismo texto esperado | La página no escribe `innerHTML` |
| borrar todo | Llama a `resetAll` de la instancia real, expuesta del mismo bundle; el recorrido en blanco se lee por la exportación y el aviso, por lo que resuelve | `#confirm-reset` deja de existir. El `save()` posterior, el cierre y el `toast` son de la página: los fijan la spec de la página («resets, saves, closes…») y el E2E del `KNOWN DEFECT` |
| importación: las dos fixtures | Llaman a `planImport` y `applyImport` de la instancia real y miran el aviso que resuelve | `#import-file` deja de existir en el marcado estático |
| main.tsx without its call, y los dos de `startApp` | `startApp` sale del mismo bundle que `main.tsx`, con `appProgressBackup()` | El contrato nuevo de `startApp` (FR-046), sin un segundo `routeStore` empaquetado aparte |

**El orden de los efectos de «Borrar todo»** queda afirmado entre cuatro checks:

| Tramo | Lo afirma |
| --- | --- |
| El servidor antes de los almacenes | `progress-backup-edges.spec.ts` (T015) y el escenario nuevo de `boot-check` (T019) |
| Los cuatro almacenes y después las simulaciones | La spec de la feature y `boot-check` con los adaptadores reales |
| Las simulaciones antes que el temporizador | La spec de la feature, que corre los pasos de sesión en el orden en que se registraron («…then the session»): el armado registra primero las simulaciones, y `startApp()` suma el temporizador después |
| `save()`, el cierre, el estado en blanco y el aviso | La spec de la página y la del diálogo (T017) |

## 4. U4 · «Borrar todo» con el servidor (E, A, M y Q en la onda 5; K en la 6)

**Cubre:**

- **Requisitos:** FR-021 a FR-025 (la parte de Q1), FR-039 (el paso del servidor y la confirmación), FR-040 (con el servidor) y FR-047 a FR-049;
- **Criterios:** SC-002 (los de Q1) y SC-013;
- **Historias:** US3 entera.

Research.md, R4, R5 y R7.

### Tarea 4.1 · Los E2E de «Borrar todo» con el servidor, en rojo (T014, E)

**Archivos:**

- `qa/e2e/lib/api-contract.ts`, `qa/e2e/fixtures/api-double.ts`, `qa/e2e/lib/method-files.ts` y `qa/e2e/pages/method.ts`;
- `qa/e2e/specs/method-reset-server.spec.ts` (nuevo);
- `qa/e2e/specs/method-reset.spec.ts` y `method-kept-state.spec.ts`;
- los E2E de B8.

1. **`qa/e2e/lib/api-contract.ts`.** `MESSAGES` suma cinco códigos, copiados de `backend/api/lang/es/api.php` y de `App\Progress\ContentNotImported`:

   ```ts
   password_confirmation_required: 'Confirmá tu contraseña para continuar.',
   epoch_mismatch: 'Tu progreso se borró desde otro dispositivo. Se cargará el estado nuevo.',
   client_outdated: 'Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.',
   email_unverified: 'Verificá tu email para continuar.',
   content_not_imported: 'Todavía no hay contenido importado.',
   ```

2. **`qa/e2e/fixtures/api-double.ts`.** `installDefaults()` suma, al final, las tres rutas que responden bien (contrato de F11a, «Lo que suman otros ítems»):

   ```ts
   this.on('POST /api/auth/confirm-password', () => ({ status: 201, json: {} }));
   this.on('GET /api/progress', () => ({
     status: 200,
     headers: { 'Cache-Control': 'private, no-store' },
     json: {
       userId: this.account?.id ?? null,
       epoch: 1,
       revision: 0,
       resetAt: null,
       contentVersion: CONTENT_VERSION,
       serverTime: '2026-03-04T05:06:07.000Z',
     },
   }));
   this.on('POST /api/progress/reset', () => ({ status: 200, json: { epoch: 2, revision: 1 } }));
   ```

3. **`qa/e2e/lib/method-files.ts`** suma `export const E2E_PASSWORD = 'una-contraseña-de-prueba-larga';`.
4. **`qa/e2e/pages/method.ts`.**
   - El import de `../lib/method-files` pasa a `import { E2E_PASSWORD, type FilePayload } from '../lib/method-files';`.
   - La clase suma `readonly password: Locator;`, y en el constructor, después de `this.confirmation = …`:

     ```ts
     this.password = this.confirmation.getByLabel('Tu contraseña', { exact: true });
     ```

   - Suma el método:

     ```ts
     async resetEverything(password: string = E2E_PASSWORD): Promise<void> {
       await this.resetProgress().click();
       await this.password.fill(password);
       await this.confirmReset().click();
     }
     ```

5. **`qa/e2e/specs/method-reset-server.spec.ts`:**

   ```ts
   import type { ApiDouble, ApiReply, ApiRoute } from '../fixtures/api-double';
   import { expect, test } from '../fixtures';
   import { ADMIN, MESSAGES, STUDENT, errorBody, type ApiCode } from '../lib/api-contract';
   import { frozenProgress } from '../lib/curriculum';
   import { observeReload } from '../lib/document-marker';
   import { E2E_PASSWORD } from '../lib/method-files';
   import { urls } from '../lib/urls';
   import type { MethodPage } from '../pages/method';

   const FAILED_RESOURCE = /Failed to load resource/;
   const RESET_DONE = 'Progreso reiniciado. Un nuevo comienzo.';
   const UNREACHABLE =
     'No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.';
   const EPOCH_MOVED =
     'Tu progreso de la cuenta se acaba de borrar desde otra pestaña o dispositivo. No se borró nada de este navegador: si querés, volvé a confirmar.';
   const CONFIRM: ApiRoute = 'POST /api/auth/confirm-password';
   const READ: ApiRoute = 'GET /api/progress';
   const RESET: ApiRoute = 'POST /api/progress/reset';
   const LATER: Record<string, readonly ApiRoute[]> = { [CONFIRM]: [READ, RESET], [READ]: [RESET], [RESET]: [] };
   const PROGRESS_ROUTES: readonly string[] = [CONFIRM, READ, RESET];
   const OTHER_PROGRESS_KEYS = ['taller-laboratorio-v1', 'taller-campaign-v1', 'taller-systems-v1'];

   function progressCalls(api: ApiDouble): string[] {
     return api.calls.map((call) => `${call.method} ${call.path}`).filter((route) => PROGRESS_ROUTES.includes(route));
   }

   function failure(code: ApiCode, status: number, headers?: Record<string, string>): ApiReply {
     return { status, json: errorBody(code), headers };
   }

   function holdRoute(api: ApiDouble, route: ApiRoute, reply: ApiReply): () => void {
     let release: () => void = () => undefined;
     const held = new Promise<void>((resolve) => {
       release = resolve;
     });
     api.on(route, async () => {
       await held;
       return reply;
     });
     return () => release();
   }

   async function confirmWithPassword(method: MethodPage): Promise<void> {
     await method.resetProgress().click();
     await method.password.fill(E2E_PASSWORD);
     await method.confirmReset().click();
   }

   test.beforeEach(async ({ storage }) => {
     await storage.seed({ ...frozenProgress, 'taller-campaign-v1': '{roto' });
   });

   test('opens with the texts of L8 and focuses the password field', async ({ shell, method }) => {
     await shell.goto(urls.view('metodo'));
     await method.resetProgress().click();
     await expect(method.confirmation).toContainText(
       'Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos lenguajes en este navegador y en tu cuenta. Podés exportarlos antes.',
     );
     await expect(method.confirmation).toContainText(
       'No se borran el historial de tus ejecuciones ni las copias que importaste: quedan en el servidor el tiempo que dice el aviso de privacidad. Para borrarlos, borrá tu cuenta desde «Tu cuenta».',
     );
     await expect(method.password).toBeFocused();
   });

   test('confirms the password, reads the epoch, resets with it and only then deletes this browser', async ({
     shell,
     method,
     storage,
     api,
   }) => {
     const release = holdRoute(api, RESET, { status: 200, json: { epoch: 2, revision: 1 } });
     await shell.goto(urls.view('metodo'));
     const before = await storage.snapshot();
     await confirmWithPassword(method);
     await expect(method.confirmation.getByRole('button', { name: 'Borrando…' })).toBeDisabled();
     expect(await storage.snapshot()).toEqual(before);
     release();
     await expect(shell.toast).toHaveText(RESET_DONE);
     expect(progressCalls(api)).toEqual([CONFIRM, READ, RESET]);
     const [confirm] = api.callsTo(CONFIRM);
     const [reset] = api.callsTo(RESET);
     expect(confirm?.body).toEqual({ password: E2E_PASSWORD });
     expect(confirm?.user).toBe(String(STUDENT.id));
     expect(reset?.body).toEqual({ format: 2, epoch: 1 });
     expect(reset?.user).toBe(String(STUDENT.id));
     expect(reset?.xsrf).toBe(api.xsrfValue());
     const keys = Object.keys(await storage.snapshot());
     expect(keys.filter((key) => OTHER_PROGRESS_KEYS.includes(key) || key.includes(':respaldo'))).toEqual([]);
     expect(keys).toContain('taller-learning-v1');
     await expect(method.confirmation).toBeHidden();
     await expect(method.resetProgress()).toBeFocused();
   });

   test('Review Focus 2: while the reset waits, neither Esc twice nor «Conservar mi avance» closes the confirmation', async ({
     shell,
     method,
     page,
     api,
   }) => {
     const release = holdRoute(api, RESET, { status: 200, json: { epoch: 2, revision: 1 } });
     await shell.goto(urls.view('metodo'));
     await confirmWithPassword(method);
     await expect(method.confirmation.getByRole('button', { name: 'Borrando…' })).toBeDisabled();
     await expect(method.keepProgress()).toBeDisabled();
     await expect(method.password).toHaveAttribute('readonly', '');
     await page.keyboard.press('Escape');
     await page.keyboard.press('Escape');
     await expect(method.confirmation).toBeVisible();
     release();
     await expect(shell.toast).toHaveText(RESET_DONE);
   });

   test('cancelling sends no request and deletes nothing', async ({ shell, method, storage, api }) => {
     await shell.goto(urls.view('metodo'));
     const before = await storage.snapshot();
     await method.resetProgress().click();
     await method.password.fill(E2E_PASSWORD);
     await method.keepProgress().click();
     await expect(method.confirmation).toBeHidden();
     expect(progressCalls(api)).toEqual([]);
     expect(await storage.snapshot()).toEqual(before);
   });

   interface Failure {
     readonly name: string;
     readonly route: ApiRoute;
     readonly reply: ApiReply | 'network';
     readonly field?: string;
     readonly alert?: string;
     readonly reload?: boolean;
     readonly blocked?: boolean;
   }

   const FAILURES: readonly Failure[] = [
     { name: 'a wrong password (422)', route: CONFIRM, reply: failure('auth_failed', 422), field: MESSAGES.auth_failed },
     {
       name: 'an expired confirmation (423)',
       route: RESET,
       reply: failure('password_confirmation_required', 423),
       field: MESSAGES.password_confirmation_required,
     },
     {
       name: 'the daily limit (429)',
       route: RESET,
       reply: failure('too_many_requests', 429, { 'Retry-After': '3600' }),
       alert: MESSAGES.too_many_requests,
       blocked: true,
     },
     {
       name: 'another account (409 account_mismatch)',
       route: CONFIRM,
       reply: failure('account_mismatch', 409),
       alert: MESSAGES.account_mismatch,
       reload: true,
     },
     {
       name: 'another tab that reset first (409 epoch_mismatch)',
       route: RESET,
       reply: { status: 409, json: { ...errorBody('epoch_mismatch'), epoch: 3, revision: 9 } },
       alert: EPOCH_MOVED,
     },
     {
       name: 'an outdated tab (409 client_outdated)',
       route: RESET,
       reply: failure('client_outdated', 409),
       alert: MESSAGES.client_outdated,
       reload: true,
     },
     { name: 'an unverified email (403)', route: READ, reply: failure('email_unverified', 403), alert: MESSAGES.email_unverified },
     {
       name: 'a disabled account (403)',
       route: CONFIRM,
       reply: failure('account_disabled', 403),
       alert: MESSAGES.account_disabled,
       reload: true,
     },
     { name: 'a server error (500)', route: CONFIRM, reply: failure('server_error', 500), alert: UNREACHABLE },
     {
       name: 'content not imported yet (503)',
       route: READ,
       reply: failure('content_not_imported', 503, { 'Retry-After': '60' }),
       alert: UNREACHABLE,
     },
     {
       name: 'a gateway page (502)',
       route: RESET,
       reply: { status: 502, body: '<html>Bad Gateway</html>', contentType: 'text/html' },
       alert: UNREACHABLE,
     },
     { name: 'no network', route: RESET, reply: 'network', alert: UNREACHABLE },
   ];

   for (const item of FAILURES) {
     test(`with ${item.name} keeps the confirmation open and deletes nothing`, async ({
       shell,
       method,
       storage,
       api,
       page,
       pageIssues,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, `the answer to ${item.route}: ${item.name}`);
       if (item.reply === 'network') await page.route('**/api/progress/reset', (route) => route.abort());
       else api.reply(item.route, item.reply);
       await shell.goto(urls.view('metodo'));
       const before = await storage.snapshot();
       await confirmWithPassword(method);
       if (item.field !== undefined) {
         await expect(method.confirmation.getByText(item.field)).toBeVisible();
         await expect(method.password).toHaveAttribute('aria-invalid', 'true');
       }
       if (item.alert !== undefined) await expect(method.confirmation.getByRole('alert')).toContainText(item.alert);
       if (item.reload === true) await expect(method.confirmation.getByRole('button', { name: 'Recargar' })).toBeVisible();
       if (item.blocked === true) await expect(method.confirmReset()).toBeDisabled();
       else await expect(method.confirmReset()).toBeEnabled();
       await expect(method.confirmation).toBeVisible();
       for (const later of LATER[item.route] ?? []) expect(api.callsTo(later)).toEqual([]);
       expect(await storage.snapshot()).toEqual(before);
       await expect(shell.toast).not.toHaveText(RESET_DONE);
     });
   }

   test('with a 401 asks to sign in and, with the same account, keeps the confirmation open with an empty field', async ({
     shell,
     method,
     storage,
     api,
     access,
     page,
     pageIssues,
   }) => {
     pageIssues.expectIssue(FAILED_RESOURCE, 'the 401 of the confirmation');
     api.reply(CONFIRM, failure('unauthenticated', 401));
     await shell.goto(urls.view('metodo'));
     const before = await storage.snapshot();
     await confirmWithPassword(method);
     await expect(access.heading('Ingresá al taller')).toBeVisible();
     await access.button('Aviso de privacidad').click();
     await page.keyboard.press('Escape');
     await access.signIn(STUDENT.email, 'una contraseña de prueba');
     await expect(access.heading('Ingresá al taller')).toBeHidden();
     await expect(method.confirmation).toBeVisible();
     await expect(method.password).toHaveValue('');
     expect(api.callsTo(READ)).toEqual([]);
     expect(await storage.snapshot()).toEqual(before);
   });

   test('with a 401 and another account signing in, reloads the document without deleting anything', async ({
     shell,
     method,
     storage,
     api,
     access,
     page,
     pageIssues,
   }) => {
     pageIssues.expectIssue(FAILED_RESOURCE, 'the 401 of the reset');
     api.reply(RESET, failure('unauthenticated', 401));
     api.signInAccount = ADMIN;
     await shell.goto(urls.view('metodo'));
     const before = await storage.snapshot();
     await confirmWithPassword(method);
     await expect(access.heading('Ingresá al taller')).toBeVisible();
     expect(await observeReload(page, () => access.signIn(ADMIN.email, 'una contraseña de prueba'))).toBe(true);
     expect(await storage.snapshot()).toEqual(before);
   });
   ```

   Ninguna función pasa de 10: el cuerpo del bucle tiene seis decisiones.
6. **Los cambios a propósito,** listados en el commit y en el PR:
   - **`method-reset.spec.ts`:**
     - «opens as a modal named «¿Borrar tu progreso?» and focuses its first button» pasa a exigir el nombre del diálogo y el foco en `method.password`. Los textos de L8 los fija «opens with the texts of L8…».
     - Los dos escenarios de «Borrar todo» cambian `await method.resetProgress().click(); await method.confirmReset().click();` por `await method.resetEverything();`.
   - **`method-kept-state.spec.ts`:** el mismo cambio en «after Borrar todo…» y en «#note-state keeps…».
   - **Los E2E de B8** (F5 y F9): el mismo cambio, sin tocar ninguna otra línea.
7. **Correr** `npm run build && E2E_PORT=4194 npm run test:e2e -- specs/method-reset-server.spec.ts specs/method-reset.spec.ts specs/method-kept-state.spec.ts`.
   - **En rojo,** por la razón esperada: no existe el campo «Tu contraseña» (el `fill` agota su espera), y no sale ningún pedido.
   - **En verde,** los escenarios que no la necesitan: el cierre, Tab y «cancelling sends no request».
8. **Commit:** `test(e2e): «Borrar todo» con la contraseña y el reset del servidor, y las respuestas de cada falla (en rojo)`.

### Tarea 4.2 · Las specs del paso del servidor, en rojo (T015, A)

**Archivos:**

- `frontend/src/app/progress-backup/server-reset.ts`: el stub, con las tres constantes, `ServerResetDependencies` y las dos funciones lanzando `not implemented`;
- `server-reset.spec.ts`;
- `frontend/src/features/progress-backup/model/progress-backup-edges.spec.ts`.

1. **`progress-backup-edges.spec.ts`** suma, al final, el `describe` del paso:
   - el import de `./types` suma `ResetRefusal`, `ServerReset` y `ServerResetResult`.

   ```ts
   describe('resetting with the server', () => {
     const REFUSAL: ResetRefusal = {
       passwordMessages: ['El email o la contraseña no son correctos.'],
       generalMessages: [],
       retryAfterSeconds: null,
       offerReload: false,
       clearPassword: false,
     };

     function backupWith(events: string[], answer: ServerResetResult) {
       const serverReset: ServerReset = async ({ password }) => {
         events.push(`server ${password}`);
         return answer;
       };
       return createProgressBackup({
         guide,
         areas: recordingAreas(events),
         sessionResets: [() => events.push('session')],
         serverReset,
       });
     }

     it('asks the server before touching any area and then resets locally', async () => {
       const events: string[] = [];
       const backup = backupWith(events, { confirmed: true });
       expect(await backup.resetAll({ password: 'secreta' })).toEqual({
         notice: 'Progreso reiniciado. Un nuevo comienzo.',
       });
       expect(events).toEqual([
         'server secreta',
         'route:reset',
         'lab:reset',
         'campaign:reset',
         'systems:reset',
         'session',
       ]);
     });

     it('resolves the refusal and touches no area nor session step', async () => {
       const events: string[] = [];
       const backup = backupWith(events, { confirmed: false, refusal: REFUSAL });
       expect(await backup.resetAll({ password: 'secreta' })).toEqual({ refusal: REFUSAL });
       expect(events).toEqual(['server secreta']);
     });

     it('asks the server with an empty password when no confirmation arrives', async () => {
       const events: string[] = [];
       await backupWith(events, { confirmed: false, refusal: REFUSAL }).resetAll();
       expect(events).toEqual(['server ']);
     });
   });
   ```

2. **`server-reset.spec.ts`.** Usa el cliente real de F11a con su `fetch` falso, y los mensajes de `lang/es/api.php`:

   ```ts
   import { describe, expect, it, vi } from 'vitest';
   import type { ReauthenticationOutcome } from '../../features/sign-in';
   import { createApiClient, type ApiFailure } from '../../shared/api/http';
   import { apiErrorBodyFactory } from '../../shared/api/http/api-error.factory';
   import { createFakeFetch, type FakeReply } from '../../shared/api/http/fake-fetch';
   import { ACCOUNT_LOST, EPOCH_MOVED, SERVER_UNREACHABLE, createServerReset, refusalFor } from './server-reset';

   const CONFIRMED: FakeReply = { status: 201, json: {} };
   const SNAPSHOT: FakeReply = { status: 200, json: { userId: 41, epoch: 7, revision: 3, resetAt: null } };
   const RESET: FakeReply = { status: 200, json: { epoch: 8, revision: 4 } };
   const NOTHING = {
     passwordMessages: [],
     generalMessages: [],
     retryAfterSeconds: null,
     offerReload: false,
     clearPassword: false,
   };
   const WRONG_PASSWORD = 'El email o la contraseña no son correctos.';

   function errorReply(status: number, code: string, message: string): FakeReply {
     return { status, json: apiErrorBodyFactory.build({ code, message }) };
   }

   function response(
     status: number,
     code: string,
     message: string,
     extra: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number } = {},
   ): ApiFailure {
     return {
       kind: 'response',
       status,
       code,
       message,
       fieldErrors: extra.fieldErrors ?? {},
       retryAfterSeconds: extra.retryAfterSeconds ?? null,
     };
   }

   function stepWith(
     replies: readonly (FakeReply | 'network-error')[],
     options: { accountId?: number | null; outcome?: ReauthenticationOutcome } = {},
   ) {
     const fake = createFakeFetch(replies);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc%3D' });
     const reauthenticate = vi.fn(async (): Promise<ReauthenticationOutcome> => options.outcome ?? 'same-account');
     const step = createServerReset({
       client,
       accountId: () => (options.accountId === undefined ? 41 : options.accountId),
       reauthenticate,
     });
     return { step, calls: fake.calls, reauthenticate };
   }

   describe('createServerReset', () => {
     it('confirms the password, reads the epoch and resets with it, in that order', async () => {
       const { step, calls } = stepWith([CONFIRMED, SNAPSHOT, RESET]);
       expect(await step({ password: 'secreta' })).toEqual({ confirmed: true });
       expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
         'POST /api/auth/confirm-password',
         'GET /api/progress',
         'POST /api/progress/reset',
       ]);
       expect(calls.map((call) => call.body)).toEqual([{ password: 'secreta' }, undefined, { format: 2, epoch: 7 }]);
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
       expect(calls[1]?.headers['x-taller-user']).toBeUndefined();
       expect(calls[2]?.headers['x-taller-user']).toBe('41');
       expect(calls[2]?.headers['x-xsrf-token']).toBe('abc=');
     });

     it('asks nothing without an account and offers to reload', async () => {
       const { step, calls } = stepWith([CONFIRMED], { accountId: null });
       expect(await step({ password: 'secreta' })).toEqual({
         confirmed: false,
         refusal: { ...NOTHING, generalMessages: [ACCOUNT_LOST], offerReload: true },
       });
       expect(calls).toEqual([]);
     });

     it('stops after a refused confirmation and shows the message on the password', async () => {
       const { step, calls } = stepWith([errorReply(422, 'auth_failed', WRONG_PASSWORD)]);
       expect(await step({ password: 'mala' })).toEqual({
         confirmed: false,
         refusal: { ...NOTHING, passwordMessages: [WRONG_PASSWORD] },
       });
       expect(calls).toHaveLength(1);
     });

     it('does not reset when the snapshot has no valid epoch', async () => {
       const { step, calls } = stepWith([CONFIRMED, { status: 200, json: { userId: 41, epoch: 0 } }]);
       expect(await step({ password: 'secreta' })).toEqual({
         confirmed: false,
         refusal: { ...NOTHING, generalMessages: [SERVER_UNREACHABLE] },
       });
       expect(calls).toHaveLength(2);
     });

     it('treats a network failure of the reset as a server that does not answer', async () => {
       const { step } = stepWith([CONFIRMED, SNAPSHOT, 'network-error']);
       expect(await step({ password: 'secreta' })).toEqual({
         confirmed: false,
         refusal: { ...NOTHING, generalMessages: [SERVER_UNREACHABLE] },
       });
     });

     it('asks to sign in again after a 401 and, with the same account, empties the password', async () => {
       const { step, calls, reauthenticate } = stepWith([
         CONFIRMED,
         errorReply(401, 'unauthenticated', 'Iniciá sesión para continuar.'),
       ]);
       expect(await step({ password: 'secreta' })).toEqual({
         confirmed: false,
         refusal: { ...NOTHING, clearPassword: true },
       });
       expect(reauthenticate).toHaveBeenCalledWith(41);
       expect(calls).toHaveLength(2);
     });

     it('shows nothing when another account signed in, because the document reloads', async () => {
       const { step } = stepWith([errorReply(401, 'unauthenticated', 'Iniciá sesión para continuar.')], {
         outcome: 'reloading',
       });
       expect(await step({ password: 'secreta' })).toEqual({ confirmed: false, refusal: NOTHING });
     });

     it('Review Focus 3: renews the CSRF token once and resets once when it expires before the reset', async () => {
       const session: FakeReply = {
         status: 200,
         json: { user: { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true } },
       };
       const { step, calls } = stepWith([
         CONFIRMED,
         SNAPSHOT,
         errorReply(419, 'csrf_token_mismatch', 'La página venció: recargala e intentá de nuevo.'),
         session,
         RESET,
       ]);
       expect(await step({ password: 'secreta' })).toEqual({ confirmed: true });
       expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
         'POST /api/auth/confirm-password',
         'GET /api/progress',
         'POST /api/progress/reset',
         'GET /api/session',
         'POST /api/progress/reset',
       ]);
     });
   });

   describe('refusalFor', () => {
     it.each([
       ['no network', { kind: 'network' } as ApiFailure],
       ['an answer that is not JSON', { kind: 'unexpected', status: 502 } as ApiFailure],
       ['a server error', response(500, 'server_error', 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.')],
       ['content not imported', response(503, 'content_not_imported', 'Todavía no hay contenido importado.')],
     ])('says that the server does not answer for %s', (_name, failure) => {
       expect(refusalFor(failure)).toEqual({ ...NOTHING, generalMessages: [SERVER_UNREACHABLE] });
     });

     it('says that another tab or device reset first', () => {
       const failure = response(409, 'epoch_mismatch', 'Tu progreso se borró desde otro dispositivo. Se cargará el estado nuevo.');
       expect(refusalFor(failure)).toEqual({ ...NOTHING, generalMessages: [EPOCH_MOVED] });
     });

     it.each([
       [422, 'auth_failed', WRONG_PASSWORD],
       [423, 'password_confirmation_required', 'Confirmá tu contraseña para continuar.'],
     ])('puts a %i %s on the password', (status, code, message) => {
       expect(refusalFor(response(status, code, message))).toEqual({ ...NOTHING, passwordMessages: [message] });
     });

     it.each([
       [409, 'client_outdated', 'Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.'],
       [403, 'account_disabled', 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.'],
       [409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.'],
     ])('offers to reload after a %i %s', (status, code, message) => {
       expect(refusalFor(response(status, code, message))).toEqual({
         ...NOTHING,
         generalMessages: [message],
         offerReload: true,
       });
     });

     it('offers to reload when the session came back with another account', () => {
       const message = 'La sesión cambió de cuenta: recargá la página.';
       expect(refusalFor({ kind: 'account-changed', message })).toEqual({
         ...NOTHING,
         generalMessages: [message],
         offerReload: true,
       });
     });

     it('shows the wait of a 429 and keeps its seconds', () => {
       const message = 'Demasiados intentos. Esperá un momento antes de volver a probar.';
       expect(refusalFor(response(429, 'too_many_requests', message, { retryAfterSeconds: 120 }))).toEqual({
         ...NOTHING,
         generalMessages: [message, 'Podés volver a intentar en 2 minutos.'],
         retryAfterSeconds: 120,
       });
     });

     it('shows the message of an unverified email', () => {
       const message = 'Verificá tu email para continuar.';
       expect(refusalFor(response(403, 'email_unverified', message))).toEqual({ ...NOTHING, generalMessages: [message] });
     });

     it('puts the password errors of a 422 on the field', () => {
       const failure = response(422, 'validation_failed', 'Hay datos que corregir.', {
         fieldErrors: { password: ['El campo contraseña es obligatorio.'] },
       });
       expect(refusalFor(failure)).toEqual({ ...NOTHING, passwordMessages: ['El campo contraseña es obligatorio.'] });
     });

     it('empties the password when the session is gone', () => {
       expect(refusalFor({ kind: 'signed-out' })).toEqual({ ...NOTHING, clearPassword: true });
     });
   });
   ```

   «Podés volver a intentar en 2 minutos.» sale de `describeFailure` de F11a, con `formatWait(120)`, que su contrato fija en «2 minutos».
3. **Correr:**
   - `npm run test:unit -- frontend/src/app/progress-backup frontend/src/features/progress-backup`;
   - `server-reset.spec.ts` falla con `not implemented`;
   - el `describe` nuevo de `progress-backup-edges.spec.ts` falla porque `createProgressBackup` todavía no mira `serverReset`.
4. **Commit:** `test(front): el paso del servidor de «Borrar todo» y su lugar en resetAll (en rojo)`.

### Tarea 4.3 · El paso del servidor (T016, A)

**Archivos:**

- `frontend/src/features/progress-backup/model/create-progress-backup.ts`;
- `frontend/src/app/progress-backup/server-reset.ts` y `app-progress-backup.ts`.

1. **`create-progress-backup.ts`.**
   - El import de `./types` suma `ResetConfirmation`, `ResetOutcome` y `ServerReset`.
   - Antes de `createProgressBackup` va la función nueva:

     ```ts
     async function resetWithServer(
       serverReset: ServerReset | undefined,
       confirmation: ResetConfirmation | undefined,
       resetLocally: () => Promise<ProgressNotice>,
     ): Promise<ResetOutcome> {
       if (serverReset === undefined) return resetLocally();
       const answer = await serverReset(confirmation ?? { password: '' });
       if (!answer.confirmed) return { refusal: answer.refusal };
       return resetLocally();
     }
     ```

   - `createProgressBackup` desestructura también `serverReset`, y su `resetAll` pasa a ser:

     ```ts
     resetAll: (confirmation) => resetWithServer(serverReset, confirmation, () => resetAll(areas, sessionResets)),
     ```

   La función `resetAll(areas, sessionResets)` de hoy no cambia.
2. **`server-reset.ts`:**

   ```ts
   import type {
     ResetConfirmation,
     ResetRefusal,
     ServerReset,
     ServerResetResult,
   } from '../../features/progress-backup';
   import type { ReauthenticationOutcome } from '../../features/sign-in';
   import type { ApiClient, ApiFailure } from '../../shared/api/http';
   import { isPlainObject } from '../../shared/lib/is-plain-object';
   import { describeFailure } from '../../shared/ui/form';

   export const SERVER_UNREACHABLE =
     'No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.';
   export const EPOCH_MOVED =
     'Tu progreso de la cuenta se acaba de borrar desde otra pestaña o dispositivo. No se borró nada de este navegador: si querés, volvé a confirmar.';
   export const ACCOUNT_LOST = 'La sesión cambió de cuenta: recargá la página.';

   const RESET_FORMAT = 2;
   const UNAUTHENTICATED = 401;
   const SERVER_ERROR = 500;
   const PASSWORD_CODES: ReadonlySet<string> = new Set(['auth_failed', 'password_confirmation_required']);
   const RELOAD_CODES: ReadonlySet<string> = new Set(['client_outdated', 'account_disabled']);
   const NOTHING: ResetRefusal = {
     passwordMessages: [],
     generalMessages: [],
     retryAfterSeconds: null,
     offerReload: false,
     clearPassword: false,
   };

   type ResponseFailure = Extract<ApiFailure, { kind: 'response' }>;

   export interface ServerResetDependencies {
     readonly client: ApiClient;
     accountId(): number | null;
     reauthenticate(expectedUserId: number): Promise<ReauthenticationOutcome>;
   }

   function general(message: string, offerReload = false): ResetRefusal {
     return { ...NOTHING, generalMessages: [message], offerReload };
   }

   function refusalForResponse(failure: ResponseFailure): ResetRefusal {
     if (failure.status >= SERVER_ERROR) return general(SERVER_UNREACHABLE);
     if (failure.code === 'epoch_mismatch') return general(EPOCH_MOVED);
     if (PASSWORD_CODES.has(failure.code)) return { ...NOTHING, passwordMessages: [failure.message] };
     if (RELOAD_CODES.has(failure.code)) return general(failure.message, true);
     const description = describeFailure(failure, ['password']);
     return {
       ...NOTHING,
       passwordMessages: description.fieldMessages['password'] ?? [],
       generalMessages: description.generalMessages,
       retryAfterSeconds: description.retryAfterSeconds,
       offerReload: description.offerReload,
     };
   }

   export function refusalFor(failure: ApiFailure): ResetRefusal {
     switch (failure.kind) {
       case 'response':
         return refusalForResponse(failure);
       case 'account-changed':
         return general(failure.message, true);
       case 'signed-out':
         return { ...NOTHING, clearPassword: true };
       case 'network':
       case 'unexpected':
         return general(SERVER_UNREACHABLE);
     }
   }

   function isSignedOut(failure: ApiFailure): boolean {
     return failure.kind === 'signed-out' || (failure.kind === 'response' && failure.status === UNAUTHENTICATED);
   }

   function epochOf(body: unknown): number | null {
     const epoch = isPlainObject(body) ? body['epoch'] : undefined;
     return typeof epoch === 'number' && Number.isInteger(epoch) && epoch >= 1 ? epoch : null;
   }

   function refused(refusal: ResetRefusal): ServerResetResult {
     return { confirmed: false, refusal };
   }

   async function settle(
     failure: ApiFailure,
     accountId: number,
     dependencies: ServerResetDependencies,
   ): Promise<ServerResetResult> {
     if (!isSignedOut(failure)) return refused(refusalFor(failure));
     const outcome = await dependencies.reauthenticate(accountId);
     return refused(outcome === 'same-account' ? { ...NOTHING, clearPassword: true } : NOTHING);
   }

   export function createServerReset(dependencies: ServerResetDependencies): ServerReset {
     return async ({ password }: ResetConfirmation) => {
       const accountId = dependencies.accountId();
       if (accountId === null) return refused(general(ACCOUNT_LOST, true));
       const asAccount = { asUser: accountId };
       const confirmed = await dependencies.client.send('POST', '/api/auth/confirm-password', { password }, asAccount);
       if (!confirmed.ok) return settle(confirmed.failure, accountId, dependencies);
       const snapshot = await dependencies.client.get('/api/progress');
       if (!snapshot.ok) return settle(snapshot.failure, accountId, dependencies);
       const epoch = epochOf(snapshot.body);
       if (epoch === null) return refused(general(SERVER_UNREACHABLE));
       const reset = await dependencies.client.send('POST', '/api/progress/reset', { format: RESET_FORMAT, epoch }, asAccount);
       if (!reset.ok) return settle(reset.failure, accountId, dependencies);
       return { confirmed: true };
     };
   }
   ```

3. **`app-progress-backup.ts`.**
   - Suma estos imports:

     ```ts
     import { sessionStore } from '../../entities/session';
     import { reauthenticate, requestSignIn } from '../../features/sign-in';
     import { apiClient } from '../account/api-client';
     import { reloadDocument } from '../account/reload-document';
     import { createServerReset } from './server-reset';
     ```

   - Suma la opción, después de `sessionResets,`:

     ```ts
     serverReset: createServerReset({
       client: apiClient,
       accountId: () => sessionStore.getState().user?.id ?? null,
       reauthenticate: (expectedUserId) => reauthenticate(expectedUserId, { requestSignIn, reloadDocument }),
     }),
     ```

4. **Correr:**
   - `npm run test:unit -- frontend/src/app frontend/src/features/progress-backup`, todo en verde, incluido `create-progress-backup.spec.ts` sin editar;
   - `node qa/seams-guard-check.ts`: `entities/session` no está entre los índices de R4;
   - `npm run typecheck` y `npm run lint`. Ninguna función pasa de 6.
5. **Commit:** `feat(front): «Borrar todo» confirma la contraseña, lee la época y pide el reset antes del borrado local`.

### Tarea 4.4 · Las specs de la confirmación con la contraseña, en rojo (T017, M)

**Archivos,** en `frontend/src/pages/method/ui/`: `progress-backup-double.ts`, `render-method.tsx` y `reset-dialog.spec.tsx` (nuevo).

1. **`progress-backup-double.ts`.**
   - Suma `ResetConfirmation` al import de tipos, y tres campos:

     ```ts
     resetOutcomes: ResetOutcome[] = [];
     confirmations: (ResetConfirmation | undefined)[] = [];
     hold: Promise<void> | null = null;
     ```

   - `resetAll` pasa a ser:

     ```ts
     async resetAll(confirmation?: ResetConfirmation): Promise<ResetOutcome> {
       this.calls.push('resetAll');
       this.confirmations.push(confirmation);
       if (this.hold !== null) await this.hold;
       const queued = this.resetOutcomes.shift();
       if (queued !== undefined) return queued;
       this.onResetAll();
       return { notice: this.resetNotice };
     }
     ```

2. **`render-method.tsx`.** `MethodPage` recibe `reloadDocument={() => events.push('reload')}`.
3. **`reset-dialog.spec.tsx`:**

   ```tsx
   import { act, fireEvent, screen, within } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
   import { createRouteStore } from '../../../entities/guide';
   import type { ResetRefusal } from '../../../features/progress-backup';
   import type { ProgressBackupDouble } from './progress-backup-double';
   import { guide, memoryStorage, renderMethod } from './render-method';

   const ROUTE_KEY = 'taller-learning-v1';

   function openMethod(stored: Record<string, string> = {}, configure?: (backup: ProgressBackupDouble) => void) {
     const storage = memoryStorage(stored);
     const store = createRouteStore();
     store.open(guide, { storage });
     return renderMethod(store, storage, configure);
   }

   const NO_REFUSAL: ResetRefusal = {
     passwordMessages: [],
     generalMessages: [],
     retryAfterSeconds: null,
     offerReload: false,
     clearPassword: false,
   };
   const RESET_DONE = 'Progreso reiniciado. Un nuevo comienzo.';
   const PASSWORD = 'una contraseña larga';

   const realShowModal = HTMLDialogElement.prototype.showModal;
   const realClose = HTMLDialogElement.prototype.close;

   beforeAll(() => {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       if (!this.open) return;
       this.open = false;
       this.dispatchEvent(new Event('close'));
     };
   });

   afterAll(() => {
     HTMLDialogElement.prototype.showModal = realShowModal;
     HTMLDialogElement.prototype.close = realClose;
   });

   afterEach(() => {
     vi.useRealTimers();
   });

   function holdReset(rig: ReturnType<typeof openMethod>): () => void {
     let release: () => void = () => undefined;
     rig.backup.hold = new Promise<void>((resolve) => {
       release = resolve;
     });
     return () => release();
   }

   async function typePasswordAndConfirm(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
     await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
     const dialog = screen.getByRole('dialog', { name: '¿Borrar tu progreso?' });
     await user.type(within(dialog).getByLabelText('Tu contraseña'), PASSWORD);
     await user.click(within(dialog).getByRole('button', { name: 'Borrar todo' }));
     return dialog;
   }

   describe('the confirmation with the password', () => {
     it('shows the texts of L8 and the password field before the buttons', async () => {
       const user = userEvent.setup();
       openMethod();
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       const dialog = screen.getByRole('dialog', { name: '¿Borrar tu progreso?' });
       expect(dialog).toHaveTextContent(
         'Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos lenguajes en este navegador y en tu cuenta. Podés exportarlos antes.',
       );
       expect(dialog).toHaveTextContent(
         'No se borran el historial de tus ejecuciones ni las copias que importaste: quedan en el servidor el tiempo que dice el aviso de privacidad. Para borrarlos, borrá tu cuenta desde «Tu cuenta».',
       );
       const field = within(dialog).getByLabelText('Tu contraseña');
       expect(field).toHaveAttribute('type', 'password');
       expect(field).toHaveAttribute('autocomplete', 'current-password');
       const keep = within(dialog).getByRole('button', { name: 'Conservar mi avance' });
       expect(field.compareDocumentPosition(keep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
       expect(within(dialog).queryByRole('alert')).toBeNull();
     });

     it('asks for the password before calling the feature', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       const dialog = screen.getByRole('dialog');
       await user.click(within(dialog).getByRole('button', { name: 'Borrar todo' }));
       expect(await within(dialog).findByText('Completá este campo.')).toBeInTheDocument();
       expect(rig.backup.calls).toEqual([]);
     });

     it('sends the password, then saves, closes and announces, and focuses «Borrar mi progreso»', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       const dialog = screen.getByRole('dialog');
       dialog.addEventListener('close', () => rig.events.push('close'));
       await user.type(within(dialog).getByLabelText('Tu contraseña'), PASSWORD);
       await user.click(within(dialog).getByRole('button', { name: 'Borrar todo' }));
       await vi.waitFor(() => expect(rig.events.at(-1)).toBe(`notify ${RESET_DONE}`));
       expect(rig.backup.confirmations).toEqual([{ password: PASSWORD }]);
       expect(rig.events).toEqual([`save ${ROUTE_KEY}`, 'close', `notify ${RESET_DONE}`]);
       expect(screen.getByRole('button', { name: 'Borrar mi progreso' })).toHaveFocus();
     });

     it('shows the wait and holds Esc, «Conservar mi avance» and the field while the request runs', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       const release = holdReset(rig);
       const dialog = await typePasswordAndConfirm(user);
       expect(await within(dialog).findByRole('button', { name: 'Borrando…' })).toBeDisabled();
       expect(within(dialog).getByRole('button', { name: 'Conservar mi avance' })).toBeDisabled();
       expect(within(dialog).getByLabelText('Tu contraseña')).toHaveAttribute('readonly');
       const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
       document.body.dispatchEvent(escape);
       expect(escape.defaultPrevented).toBe(true);
       const cancel = new Event('cancel', { cancelable: true });
       dialog.dispatchEvent(cancel);
       expect(cancel.defaultPrevented).toBe(true);
       const elsewhere = document.createElement('button');
       document.body.append(elsewhere);
       const escapeElsewhere = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
       elsewhere.dispatchEvent(escapeElsewhere);
       expect(escapeElsewhere.defaultPrevented).toBe(false);
       elsewhere.remove();
       release();
       await vi.waitFor(() => expect(rig.events.at(-1)).toBe(`notify ${RESET_DONE}`));
     });

     it('Review Focus 4: a double click sends a single reset', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       const release = holdReset(rig);
       await user.click(screen.getByRole('button', { name: 'Borrar mi progreso' }));
       const dialog = screen.getByRole('dialog');
       await user.type(within(dialog).getByLabelText('Tu contraseña'), PASSWORD);
       const confirm = within(dialog).getByRole('button', { name: 'Borrar todo' });
       fireEvent.click(confirm);
       fireEvent.click(confirm);
       release();
       await vi.waitFor(() => expect(rig.events.at(-1)).toBe(`notify ${RESET_DONE}`));
       expect(rig.backup.calls.filter((call) => call === 'resetAll')).toHaveLength(1);
     });

     it('keeps the confirmation open with the message on the password, without saving', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       rig.backup.resetOutcomes = [{ refusal: { ...NO_REFUSAL, passwordMessages: ['El email o la contraseña no son correctos.'] } }];
       const dialog = await typePasswordAndConfirm(user);
       expect(await within(dialog).findByText('El email o la contraseña no son correctos.')).toBeInTheDocument();
       expect(within(dialog).getByLabelText('Tu contraseña')).toHaveAttribute('aria-invalid', 'true');
       expect(screen.getByRole('dialog')).toBeInTheDocument();
       expect(rig.events).toEqual([]);
     });

     it('shows a general refusal in an alert and offers «Recargar»', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       rig.backup.resetOutcomes = [
         { refusal: { ...NO_REFUSAL, generalMessages: ['La sesión cambió de cuenta: recargá la página.'], offerReload: true } },
       ];
       const dialog = await typePasswordAndConfirm(user);
       expect(await within(dialog).findByRole('alert')).toHaveTextContent('La sesión cambió de cuenta: recargá la página.');
       await user.click(within(dialog).getByRole('button', { name: 'Recargar' }));
       expect(rig.events).toEqual(['reload']);
     });

     it('does not let «Borrar todo» be sent again before Retry-After ends', async () => {
       vi.useFakeTimers({ shouldAdvanceTime: true });
       const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
       const rig = openMethod();
       rig.backup.resetOutcomes = [
         {
           refusal: {
             ...NO_REFUSAL,
             generalMessages: ['Demasiados intentos. Esperá un momento antes de volver a probar.'],
             retryAfterSeconds: 60,
           },
         },
       ];
       const dialog = await typePasswordAndConfirm(user);
       await vi.waitFor(() => expect(within(dialog).getByRole('button', { name: 'Borrar todo' })).toBeDisabled());
       act(() => {
         vi.advanceTimersByTime(60_000);
       });
       expect(within(dialog).getByRole('button', { name: 'Borrar todo' })).toBeEnabled();
     });

     it('empties the password after signing in again with the same account', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       rig.backup.resetOutcomes = [{ refusal: { ...NO_REFUSAL, clearPassword: true } }];
       const dialog = await typePasswordAndConfirm(user);
       await vi.waitFor(() => expect(within(dialog).getByLabelText('Tu contraseña')).toHaveValue(''));
       expect(within(dialog).queryByRole('alert')).toBeNull();
     });

     it('announces the failure notice when the server confirmed but a store could not delete', async () => {
       const user = userEvent.setup();
       const rig = openMethod();
       rig.backup.resetNotice = 'No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.';
       await typePasswordAndConfirm(user);
       await vi.waitFor(() =>
         expect(rig.events.at(-1)).toBe(
           'notify No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.',
         ),
       );
     });
   });
   ```

4. **`method-page.spec.tsx`.** Los cuatro escenarios de «Borrar todo, local» siguen como están, salvo los dos que confirman: escriben la contraseña con `user.type(within(dialog).getByLabelText('Tu contraseña'), 'una contraseña larga')` antes de «Borrar todo». Es el cambio a propósito de Q1 en esa spec.
5. **Correr** `npm run test:unit -- frontend/src/pages/method`. `reset-dialog.spec.tsx` y los dos escenarios de `method-page.spec.tsx` fallan, porque no existe el campo «Tu contraseña».
6. **Commit:** `test(front): la confirmación con la contraseña, su espera y cada rechazo (en rojo)`.

### Tarea 4.5 · La confirmación con la contraseña (T018, M)

**Archivos:**

- `frontend/src/pages/method/ui/ResetDialog.tsx`, `ProgressPanel.tsx` y `MethodPage.tsx`;
- `frontend/src/shared/ui/form/TextField.tsx` y `PasswordField.tsx`;
- `frontend/src/app/legacy/register-method.tsx`.

1. **`shared/ui/form/TextField.tsx` y `PasswordField.tsx`** suman la prop opcional `readonly readOnly?: boolean;`, que es lo que F8 le suma al contrato de F11a.
   - `TextField` la pone en el `<input>` antes de `{...registration}`: `readOnly={readOnly}`.
   - `PasswordField` la recibe y se la pasa a `TextField`.

   Ninguna spec de F11a cambia.
2. **`ui/ResetDialog.tsx`:**

   ```tsx
   import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
   import { createPortal } from 'react-dom';
   import { useForm } from 'react-hook-form';
   import type { ResetConfirmation, ResetOutcome, ResetRefusal } from '../../../features/progress-backup';
   import {
     PasswordField,
     ServerError,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
   } from '../../../shared/ui/form';

   interface ResetValues {
     password: string;
   }

   interface ResetDialogProps {
     onConfirm(confirmation: ResetConfirmation): Promise<ResetOutcome>;
     onDone(notice: string): void;
     onClose(): void;
     reloadDocument(): void;
   }

   const REQUIRED = 'Completá este campo.';
   const VISIBLE_FIELDS = ['password'] as const;

   const ResetDialog = ({ onConfirm, onDone, onClose, reloadDocument }: ResetDialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     const countdown = useRetryCountdown();
     const [offerReload, setOfferReload] = useState(false);
     const {
       register,
       handleSubmit,
       setError,
       setValue,
       formState: { errors, isSubmitting },
     } = useForm<ResetValues>({ criteriaMode: 'all', defaultValues: { password: '' } });

     useEffect(() => {
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
       return () => element?.close();
     }, []);

     useEffect(() => {
       if (!isSubmitting) return undefined;
       const holdEscape = (event: KeyboardEvent): void => {
         const target = event.target;
         const aimsAtConfirmation =
           target === document.body || (target instanceof Node && dialog.current?.contains(target) === true);
         if (event.key === 'Escape' && aimsAtConfirmation) event.preventDefault();
       };
       document.addEventListener('keydown', holdEscape, true);
       return () => document.removeEventListener('keydown', holdEscape, true);
     }, [isSubmitting]);

     const showRefusal = (refusal: ResetRefusal): void => {
       if (refusal.clearPassword) setValue('password', '');
       showFailure(
         setError,
         {
           fieldMessages: { password: refusal.passwordMessages },
           generalMessages: refusal.generalMessages,
           retryAfterSeconds: refusal.retryAfterSeconds,
           offerReload: refusal.offerReload,
           signedOut: false,
         },
         VISIBLE_FIELDS,
       );
       setOfferReload(refusal.offerReload);
       if (refusal.retryAfterSeconds !== null) countdown.start(refusal.retryAfterSeconds);
     };

     const submit = useGuardedSubmit(async ({ password }: ResetValues) => {
       setOfferReload(false);
       const outcome = await onConfirm({ password });
       if ('refusal' in outcome) {
         showRefusal(outcome.refusal);
         return;
       }
       dialog.current?.close();
       onDone(outcome.notice);
     });

     const holdCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
       if (isSubmitting) event.preventDefault();
     };

     return createPortal(
       <dialog id="confirm-dialog" aria-labelledby="confirm-title" ref={dialog} onCancel={holdCancel} onClose={onClose}>
         <div className="dialog-content">
           <h2 id="confirm-title">¿Borrar tu progreso?</h2>
           <p>
             Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos
             lenguajes en este navegador y en tu cuenta. Podés exportarlos antes.
           </p>
           <p>
             No se borran el historial de tus ejecuciones ni las copias que importaste: quedan en el servidor el tiempo
             que dice el aviso de privacidad. Para borrarlos, borrá tu cuenta desde «Tu cuenta».
           </p>
           <form noValidate onSubmit={handleSubmit(submit)}>
             <div className="form-stack">
               <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={errors.password === undefined}>
                 {offerReload ? (
                   <button className="button secondary" type="button" onClick={reloadDocument}>
                     Recargar
                   </button>
                 ) : null}
               </ServerError>
               <PasswordField
                 label="Tu contraseña"
                 autoComplete="current-password"
                 registration={register('password', { required: REQUIRED })}
                 messages={messagesOf(errors.password)}
                 readOnly={isSubmitting}
               />
             </div>
             <div className="dialog-actions">
               <button
                 className="button secondary"
                 id="cancel-reset"
                 type="button"
                 disabled={isSubmitting}
                 onClick={() => dialog.current?.close()}
               >
                 Conservar mi avance
               </button>
               <button
                 className="button danger"
                 id="confirm-reset"
                 type="submit"
                 disabled={isSubmitting || countdown.waiting}
               >
                 {isSubmitting ? 'Borrando…' : 'Borrar todo'}
               </button>
             </div>
           </form>
         </div>
       </dialog>,
       document.body,
     );
   };

   export default ResetDialog;
   ```

   - **El oyente de `keydown` en captura** sobre `document` existe sólo mientras corre el envío. Cubre el caso en que el foco cayó al documento, cuando el botón se deshabilitó (research.md, R7).
   - **Sólo frena el Esc dirigido a la confirmación o a `body`.** La espera incluye `reauthenticate`, que dura lo que tarde el alumno en ingresar, y el aviso de privacidad que se abre desde ese ingreso tiene que seguir cerrándose con Esc.
   - **El estado de React** sigue al diálogo nativo con `onClose`.
3. **`ui/ProgressPanel.tsx`.**
   - Los props suman `reloadDocument(): void;`.
   - El import de la feature suma `type ResetConfirmation`.
   - `resetEverything` pasa a ser:

     ```tsx
     const resetEverything = async (confirmation: ResetConfirmation): Promise<ResetOutcome> => {
       const outcome = await progressBackup.resetAll(confirmation);
       if (!('refusal' in outcome)) store.save();
       return outcome;
     };
     ```

   - `<ResetDialog …>` suma `reloadDocument={reloadDocument}`.
4. **`ui/MethodPage.tsx`.** `MethodPageProps` suma `reloadDocument(): void;`, y se lo pasa a `ProgressPanel`.
5. **`app/legacy/register-method.tsx`.**
   - Suma `import { reloadDocument } from '../account/reload-document';`.
   - `<MethodPage …>` suma `reloadDocument={reloadDocument}`.
6. **Correr** `npm run test:unit -- frontend/src/pages/method frontend/src/shared/ui/form`, todo en verde, y después `npm run typecheck` y `npm run lint`.
   - `ResetDialog` tiene una sola función de más de cinco caminos: el componente, con 8.
7. **Commit:** `feat(front): la confirmación de «Borrar todo» pide la contraseña y muestra la espera y cada rechazo`.

### Tarea 4.6 · `boot-check` con el servidor (T019, Q)

**Archivos:** `qa/lib/content-server.ts`, `qa/lib/boot-harness.ts` y `qa/boot-check.ts`.

**Cuándo entra:** antes que T016 (S3). El escenario nuevo queda en rojo hasta T016.

1. **`qa/lib/content-server.ts`.** Es la versión con la sesión que dejó F11a, más tres cosas:
   - **`apiRequests`.** La interfaz y el objeto que devuelve `createContentServer` suman `apiRequests: string[]`.
   - **El `init`.** El tipo del `init` de `fetch` pasa a `{ signal?: AbortSignal; method?: string }`.
   - **Las rutas,** antes de `createContentServer`:

     ```ts
     function jsonResponse(status: number, body: unknown): Response {
       return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
     }

     const PROGRESS_API: Readonly<Record<string, () => Response>> = {
       'POST /api/auth/confirm-password': () => jsonResponse(201, {}),
       'GET /api/progress': () => jsonResponse(200, { userId: 41, epoch: 1, revision: 0, resetAt: null }),
       'POST /api/progress/reset': () => jsonResponse(200, { epoch: 2, revision: 1 }),
     };
     ```

   - **El principio de `fetch`.** Al principio de `fetch`, antes de `order.push(requested)`, va:

     ```ts
     const route = `${init?.method ?? 'GET'} ${requested}`;
     const answer = PROGRESS_API[route];
     if (answer !== undefined) {
       apiRequests.push(route);
       return answer();
     }
     ```

   Ni `requests` ni `order` cambian, así que los escenarios de A2 y de F11a siguen iguales.
2. **`qa/lib/boot-harness.ts`.** El objeto `document` suma `cookie: ''`. El `send()` del cliente de F11a lee `document.cookie`.
3. **`qa/boot-check.ts`.** Después de «borrar todo: resetAll del armado…», un escenario nuevo:

   ```ts
   await test('borrar todo: los tres pedidos del servidor van antes del primer reinicio local', async () => {
     const { harness, backup } = await bootExposingBackup();
     const events: string[] = [];
     const realFetch = harness.context['fetch'] as (url: string, init?: { method?: string }) => Promise<unknown>;
     harness.context['fetch'] = (url: string, init?: { method?: string }) => {
       if (url.startsWith('/api/progress') || url === '/api/auth/confirm-password') {
         events.push(`${init?.method ?? 'GET'} ${url}`);
       }
       return realFetch(url, init);
     };
     for (const [adapter, method] of RESET_METHODS) {
       const target = harness.context[adapter] as Record<string, (...args: unknown[]) => unknown>;
       const original = target[method];
       if (!original) continue;
       target[method] = (...args) => (events.push(`${adapter}.${method}`), original(...args));
     }
     await backup.resetAll({ password: 'contraseña de prueba' });
     assert.deepEqual(events, [
       'POST /api/auth/confirm-password',
       'GET /api/progress',
       'POST /api/progress/reset',
       ...RESET_METHODS.map(([adapter, method]) => `${adapter}.${method}`),
     ]);
   });
   ```

   El cliente de F11a llama a `window.fetch` en cada pedido, así que reemplazar `fetch` en el contexto alcanza.
4. **Correr** `node qa/boot-check.ts`: falla sólo el escenario nuevo (sin T016, no sale ningún pedido). Los demás, en verde.
5. **Commit:** `test(qa): boot-check exige los tres pedidos antes del borrado local (en rojo)`.

### Tarea 4.7 · La compuerta de U4 (T020, K)

1. **Integrar en el orden de S3:** T019, T014, T015, T017, T016 y T018.
2. **Correr la compuerta de §0.1** sin ningún rojo:
   - los E2E de U4;
   - los de B8;
   - `boot-check` con su escenario nuevo.
3. **Verificar a mano,** con el stack del usuario y su permiso para Docker (quickstart.md, §4):
   - «Borrar todo» con la contraseña correcta, contra la API real;
   - una contraseña incorrecta;
   - las claves después de cada caso.
4. **Commit:** ninguno; las medidas van a la descripción del PR.

## 5. U5 · Las comparaciones, la documentación, el peso y el PR (K, onda 7)

### Tarea 5.1 · Las comparaciones únicas (T021, K)

**Cubre:** FR-042 y FR-016; SC-003 y SC-007. Las recetas están en quickstart.md, §3.2 y §3.3.

1. **El DOM de la página.** Se compara el `dist/` de T005 (el legacy, ya con `.routine-note`) con el de `f8/u3-port` (el port con el borrado local) sobre la grilla de FR-042:
   - Rust y Go, con notas y sin notas;
   - con ranuras de respaldo y sin ranuras;
   - con la confirmación abierta;
   - con el almacenamiento disponible y bloqueado.

   Lo esperado: 0 diferencias fuera de la lista admitida (§3.0 y quickstart.md, §3.2), con la cuenta de estados y de elementos.
2. **La confirmación después de Q1.** La misma comparación, contra la punta de U4, y sólo con la confirmación abierta. Lista las diferencias que trae Q1:
   - el segundo párrafo de L8 y el cambio del primero;
   - el `<form>` y `.form-stack`;
   - el campo con «Mostrar»;
   - `type` en los dos botones.

   Nada más.
3. **Los bytes del archivo exportado.** Con la fixture de master sembrada y el reloj fijo, el archivo de los dos builds tiene los mismos bytes (`sha256sum`).
4. **Registrar** los resultados en la descripción del PR. No se commitea ningún script: viven en el scratchpad, como los de F2b.

### Tarea 5.2 · La documentación (T022, K)

**Cubre:** FR-044.

1. **`docs/architecture.md`:**
   - **una fila nueva para Método:** `frontend/src/pages/method/` (`ui`, `model` y `lib`), con el adaptador `frontend/src/app/legacy/register-method.tsx`, que lee `getContent().guide.sources` al montar y recibe la instancia de `progress-backup` desde `app.js`;
   - **la fila de «Respaldo global del progreso»:**
     - el armado vive en `frontend/src/app/progress-backup/` (`appProgressBackup()`, la única instancia);
     - «Borrar todo» confirma la contraseña, lee la época y pide el reset del servidor antes del borrado local (`server-reset.ts`, F8-Q1);
     - `app.js` ya no es dueño de la interfaz de Método;
   - **el párrafo de «Evaluar una fuente legacy no arranca nada»:** `legacy-views.ts` arma la instancia con `appProgressBackup()` y llama a `startApp(progressBackup)` una sola vez, después del último `import()`;
   - **R4:** el armado es el único archivo de `app/` que, además de los dueños, importa los índices de `guide`, `campaign` y `systems-workshop`, con el motivo de L10.
2. **`qa/AGENTS.md`:**
   - **la línea de `bundleApp`:** quita el `startApp();` de la entrada, con su argumento, y `expose` deja exportaciones del mismo bundle en `globalThis.__QA_EXPOSED__`;
   - **`loadAppShell`:** devuelve, de un mismo bundle, `startApp`, `routeStore`, `createProgressBackup` y `createProgressAreas`;
   - **la fila de «Recorrido, biblioteca o respaldo global»:**
     - las specs nuevas: `progress-areas`, `server-reset`, `progress-backup-edges` y las de `pages/method`;
     - los E2E `method-*.spec.ts`;
   - **`app-adapters.ts`:** suma `TallerMethod`.
3. **Comprobar** rutas, comandos y enlaces locales.
4. **Commit:** `docs: Método en React, el armado de progress-backup en src/app y startApp(progressBackup)`.

### Tarea 5.3 · El peso, la compuerta final y el PR (T023, K)

**Cubre:** FR-004, FR-005, FR-006, FR-043 y FR-046; SC-008, SC-009 y SC-012.

1. **El peso** (quickstart.md, §5):
   - el tamaño de `dist/index.html`, antes (T001) y después;
   - si crece más de 9 000 caracteres o pasa de 1 250 000, parar y avisar con la medida por módulo.
2. **La compuerta de §0.1,** con la red repetida tres veces (`--repeat-each=3 --retries=0`):
   - `git diff --check`;
   - `git grep -n "useStore(" -- frontend/src/pages/method` muestra una sola llamada, con su selector (SC-011);
   - la cuenta de avisos igual a T001;
   - `render()` en T001 + 1;
   - con permiso, `docker compose build taller`, porque la imagen web corre `QA_CHECKS=web`.
3. **El PR a `master`,** con título y descripción en inglés: `feat(front): port Método to React with the server reset (F8)`. La descripción lleva:
   - el contexto;
   - qué faltaba;
   - qué cambia, con la lista de lo que cambia a propósito;
   - las medidas;
   - la correspondencia de §3.9;
   - las comparaciones de T021;
   - los E2E que cambiaron a propósito en U4;
   - el aviso a A2 y a F10 del contrato nuevo de `startApp(progressBackup)` (FR-046);
   - las lecturas L1 a L12 para que el usuario las confirme;
   - lo que queda pendiente:
     - D1c: el espacio por cuenta, la foto de la época nueva, la guarda general y la cláusula de las claves v1;
     - F10: `mount`, `unmount`, `exportProgress` y `#export-progress`.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T003 (en verde contra el legacy), T004 (los tres de React, en rojo), T014 (Q1, en rojo, en su commit) |
| FR-002 | La compuerta de cada unidad |
| FR-003 | Restricciones globales; T011 (`copyWithFallback` conserva las propiedades CSSOM); T018 (React Hook Form de F11a) |
| FR-004 | T001, T023 |
| FR-005 | T001, T013 (`render()` +1), T023 |
| FR-006 | R1: un solo PR, con las unidades como compuertas |
| FR-007 | T010, T011 (las secciones y su orden), T013 |
| FR-008 | T013 (`flushSync` y `onUncaughtError`) |
| FR-009 | T013 (las fuentes por props desde `getContent()`) |
| FR-010, FR-011 | T013 (la búsqueda y un solo commit) |
| FR-012 | T013 |
| FR-013 | T011 y T013 (`downloadJsonFile` y la misma instancia); T003 (los mismos bytes desde la barra lateral) |
| FR-014 | T013 (el adaptador, `legacy-views`, `load-order-check` y `app-adapters`) |
| FR-015 | T008, T009 (el armado y R4), T016 (el paso del servidor) |
| FR-016 | T003 (los bytes), T021 |
| FR-017 | T003, T010 («Review Focus 5»), T011 |
| FR-018 | T004, T010 (las notas importadas sin remontar) |
| FR-019 | T004 |
| FR-020 | T003, T010, T011 |
| FR-021 | T003 (el modal, Esc, Tab y el fondo), T010, T014, T017, T018 |
| FR-022 | T010 (el orden después del aviso), T015, T016, T019 |
| FR-023 | T004, T014, T017 |
| FR-024 | T014, T015, T016, T019 |
| FR-025 | T014 («Review Focus 2»), T017, T018 |
| FR-026, FR-027 | T003, T006, T007, T010, T011 |
| FR-028 | T004, T010 |
| FR-029 | T003, T006, T007 |
| FR-030 | T003 (el portapapeles), T010 (las tres ramas) |
| FR-031 | T003, T010 («Review Focus 1»), T011 (`useStore` con selector) |
| FR-032 | T003 (las escrituras), T014 (ninguna escritura sin el 200) |
| FR-033 | T003 (el pie, la barra lateral y el idioma), T012 (el escenario de la suscripción), T013 |
| FR-034 | T011 (sin regiones vivas nuevas), T018 (sólo la `role="alert"` del formulario) |
| FR-035 | T011 (§3.0), T021 |
| FR-036, FR-037 | T005 |
| FR-038 | T003 (Tab), T005 (590 px y movimiento reducido en el barrido) |
| FR-039 | T006, T008, T010, T015, T017 |
| FR-040 | T002, T003, T004, T014 |
| FR-041 | T012, T013, §3.9 |
| FR-042 | T021 |
| FR-043 | «Ramas», T001 |
| FR-044 | T022 |
| FR-045 | T009 y T013, con las ramas F5 y F9 |
| FR-046 | T012, T013, T023 (el aviso a A2 y a F10) |
| FR-047 | T014, T015, T017, T018 |
| FR-048 | T014 (502, 503, 500 y sin red), T015 |
| FR-049 | T014 (el borrado local después del 200) |
| SC-001 | La compuerta de cada unidad |
| SC-002 | T003, T004, T014 |
| SC-003 | T003, T021 |
| SC-004 | T003 |
| SC-005 | T005 |
| SC-006 | T013, T003 (la exportación desde la barra lateral) |
| SC-007 | T021 |
| SC-008 | T023 |
| SC-009 | T001, T023 |
| SC-010 | §3.9 |
| SC-011 | T011 (un solo `useStore`, con selector); T023 (la búsqueda de `useStore(` en `pages/method`) |
| SC-012 | T023 |
| SC-013 | T014, T015, T019 |

## Descargas y permisos

- **Descargas:** ninguna. F8 usa lo que instalaron F2a y F11a.
- **Docker** corre sólo con permiso, en T020 (la verificación a mano) y en T023 (la imagen web).

## Riesgos y lo que quedó sin verificar

1. **Nada corrió al planificar.** *Mitigación:* cada tarea corre su spec y los checks, y cada compuerta corre la red.
2. **El foco del navegador** al abrir, al cerrar y después de importar. *Mitigación:* T003 lo fija contra el legacy antes de portar, y FR-021 y FR-023 admiten lo que haga el navegador.
3. **El segundo Esc durante la espera.** *Mitigación:* el oyente en captura y el E2E de T014. Si Chromium igual cierra, el E2E falla y el plan vuelve al coordinador antes de seguir.
4. **El DOM falso de `boot-check`** tiene que montar Método. *Mitigación:* T013 lo comprueba en «navegación». Si falta algo del DOM falso, se suma en `fake-dom.ts` sin tocar ningún valor esperado.
5. **La cascada al mudar 24 reglas.** *Mitigación:* el commit propio sobre el DOM legacy, el barrido con impresión y la rotura deliberada (T005).
6. **Las ramas.** Si F3, F4, F5 o F9 cambian una pieza compartida con otros nombres, la tarea usa los de la base. *Mitigación:* T001 lo deja anotado, y la revisión de cada tarea lo compara con «Ramas».
7. **El tipo de `resetAll` cambia en U3,** antes de usarse (T009). *Mitigación:* `create-progress-backup.spec.ts` sigue en verde sin editarse. D1c recibe la interfaz con el rechazo ya tipado.
8. **El peso.** *Mitigación:* la condición de corte de T023.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| R4 ampliada para el armado | Q2 lleva el armado a `src/app/`, y el armado necesita `routeStore` y los motores | Leer los motores de `window` y recibir `routeStore` de `app.js`: el dueño de `routeStore` recibe la instancia ya armada, así que sería circular (research.md, R2) |
| `bundleApp` con `expose` y la entrada virtual del shell en `qa/` | Los checks tienen que llegar a la instancia real, o a `startApp`, sin un segundo `routeStore` en el contexto | Empaquetar el armado aparte: deja un segundo almacén y un segundo motor, justo lo que R4 prohíbe |
| `render()` de `app.js` sube a T001 + 1 | Un `if` de montaje igual a los de las otras vistas, y `unmount` sin `?.`, porque `load-order-check` garantiza el adaptador | Una tabla de montaje reescribiría las líneas de las otras vistas, que no son de F8. F10 retira `render()` |
| Un oyente de `keydown` en `document` durante la espera | El foco cae al documento cuando el botón se deshabilita, y el segundo Esc puede cerrar un `<dialog>` modal | Sólo `onCancel`: falla con el segundo Esc. No deshabilitar el botón: contradice FR-025 |
