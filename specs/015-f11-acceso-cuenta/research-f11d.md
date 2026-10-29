# Research: F11d · Lo de D1

Las decisiones técnicas del [plan de F11d](./plan-f11d.md), con sus motivos, sus alternativas y lo que se midió. Las de F11a (R1 a R18), F11b (R19 a R33) y F11c (R34 a R42) están en [research.md](./research.md), [research-f11b.md](./research-f11b.md) y [research-f11c.md](./research-f11c.md), y no se repiten: F11d sigue con R43. Las interfaces que suma F11d están en el plan, sección «Interfaces», porque el encargo fija los cuatro archivos de la parte y no un contrato aparte; la tarea de documentación (T076) las pasa a [contracts/front-interfaces.md](./contracts/front-interfaces.md).

## Cómo se planificó

Se planificó sin tocar código de producción, sin correr nada en los worktrees de implementación y sin descargar nada. Las fuentes:

- **La spec,** con su clarify del 2026-10-28: FR-062 a FR-065, los transversales FR-066 a FR-077, SC-010 (la parte de F11d), la historia 9, las filas de F11d de «Pantallas, endpoints y estados» y los textos de «Lo de D1 (F11d)».
- **D1c, el plan del que depende:** PR #93, `plan/d1c-cliente-v2` en `2e743c00`, leído en el worktree `plan-d1c` sin cambiar nada:
  - [`contracts/sync-client-d1c.md`](../007-d1-progreso-sincronizacion/contracts/sync-client-d1c.md), que llega a `master` con ese PR: el estado, los avisos, las acciones y la tabla de superficies;
  - `plan-d1c.md`: «Decisiones ya tomadas», «Unidades, dueños y orden», T011 (el motor, con `boot`, `answerImport`, `enterSharedMode` y `leaveSharedMode`), T016 (`chooseMode`, `browserEnvironment`, `appProgressSync` y la etapa), T017 (`rememberPublishedVersion` en `afterPublish`), T020 (los contextos en `AccountRoot`), T023 (`seedRaw`, `rawSnapshot` y `rawWrites`), T025 (sus E2E) y «Hallazgos para otros ítems»;
  - `data-model-d1c.md` y `research-d1c.md` (R12, R13, R15, R19 y R23);
  - `.coordinador/plan-d1c-report.md`, sobre todo la decisión 2.
- **A3,** en `master`: [`plan.md`](../016-a3-contenido-api/plan.md) (T009 y T011: `content-copies.ts`, `forgetContentCopy()` y `afterPublish` de `app/boot/content-stage.ts`; la señal `taller:content-copy-saved`; `qa/e2e/lib/content-copy.ts` con `watchCopySaved`, `copySaved` y `readStoredCopy`; `shared/lib/format-long-date.ts`) y [`research.md`](../016-a3-contenido-api/research.md) (R10).
- **F11a,** implementada en `impl-f11a` (`a7b3c71d`), leída con `git show`: `app/account/AccountRoot.tsx` y `mount-account-root.tsx`, `features/sign-in/ui/render-access.tsx` (`stubDialogs`), `shared/ui/form`, el doble de la API (`qa/e2e/fixtures/api-double.ts`), los fixtures (`qa/e2e/fixtures/index.ts` y `storage-control.ts`) y `qa/e2e/lib/api-contract.ts`. «Tu cuenta» (T022 a T025) todavía no está implementada: se leyó en el [plan de F11a](./plan.md), tareas 2.7 a 2.9.
- **F11b y F12a,** por dónde insertan en `AccountDialog`: F11b, antes de `<SignOutSection`, y su plan («Lo que otros ítems toman de F11b») le deja a F11d el lugar de después; F12a, después del aviso.
- **F8,** por `qa/e2e/pages/method.ts` (`importFile`) y `qa/e2e/lib/method-files.ts` (`FROZEN_EXPORTS`), del [plan de F8](../022-f8-metodo/plan.md), tarea 1.
- **Las restricciones del coordinador:** las secciones «F11d», «D1c» y «Transversal» de `.coordinador/hallazgos-para-planes.md`, y en `.coordinador/clarify-decisiones.md`, «Decisiones del 2026-10-28 (noche)» y «El FR-068 de D1, reparto vigente» (2026-10-29).

## Decisiones

### R43. La base, las unidades y la entrega con D1c

**Decisión.** F11d tiene dos unidades, con las tareas T060 a T077, numeradas después de las de F11c (T054 a T059, U8):

- **U9, «¿Este progreso es tuyo?»** (FR-064 y FR-065);
- **U10, «Computadora compartida»** (FR-062 y FR-063), con la guarda de `afterPublish` (F11d-1).

La línea base (T060) y el cierre (T076 y T077) son del coordinador.

**La base.** F11d sale de la punta de D1c U5, como PR apilados, o de `master` si D1c U5 ya entró. Necesita de D1c:

- **U3:** el motor arranca en `progressStage`; `chooseMode`, `browserEnvironment` y `appProgressSync` están en `app/progress-sync/app-progress-sync.ts`, y `afterPublish` arranca con `rememberPublishedVersion`;
- **U4:** T020 de D1c, que hace que `AccountRoot` provea `ProgressSyncContext`;
- **U5:** `seedRaw`, `rawSnapshot` y `rawWrites` en `StorageControl`, y `POST /api/sync` y la foto completa por omisión en el doble.

Además necesita F11a entera, con «Tu cuenta» (TR-12), A3 (`forgetContentCopy`, `afterPublish` y `formatLongDate`) y F8, por el E2E de la importación desde Método.

**El orden del merge:** D1c U3 → D1c U4 → D1c U5 → F11d U9 → F11d U10, seguidos, sin nada en el medio.

- **Por qué seguidos:** con U3 en `master` y sin U9, el progreso v1 de un alumno deja de verse y nadie le pregunta si es suyo (research-d1c.md, R23).
- **Si F11d no está lista,** U3 no se mergea.
- **U10 también va en la entrega:** D1c enmienda el FR-070, que elige el modo compartido en «Tu cuenta», y sin U10 esa opción no existe.

**Una diferencia con el encargo.** El encargo dice que U1, U2 y U4 de D1c pueden integrarse antes, y que U3 y U5 van con F11d. El plan de D1c dice otra cosa («Unidades, dueños y orden», «La entrada en servicio»), y también su informe, en la decisión 2: U1 y U2 antes, y U3, U4 y U5 con F11d. El motivo es que U4 importa `appProgressSync` de U3. F11d sigue al plan de D1c, y además necesita U4 por T020. El informe lo anota como hallazgo.

**Por qué dos unidades y no una:**

- son dos superficies con requisitos, pruebas y reversión propios;
- U9 es la que D1c necesita para entrar en servicio sin perder nada de vista;
- cada PR se revisa y se revierte solo.

**Alternativa descartada:** una sola unidad, como F11c. Juntaba en un PR la mitad que no puede faltar y la que sí, y la compuerta no separaba sus fallas.

### R44. Dónde vive

**Decisión:**

- **Las pantallas viven en `pages/account`,** el slice de «Tu cuenta». Ahí van la pregunta (`ImportQuestionDialog` y sus piezas), la opción (`SharedComputerSection` y `SharedComputerOption`) y los textos.
- **La pregunta la monta `AccountRoot`,** al lado de `AccountMenu` y dentro del `ProgressSyncContext` que provee T020 de D1c.
- **La opción va en `AccountDialog`,** justo después de `<SignOutSection … />`.
- **Lo que junta a los dueños de los datos** vive en `app/account/shared-computer.ts`.

**Por qué:**

- **Las capas.** `pages` puede importar `features/progress-sync` (`useProgressSync` y los tipos) y `shared`. Un slice nuevo en `features` no podría importar `features/progress-sync`, porque dos features no se importan entre sí.
- **El lugar en el diálogo.** «Después de `<SignOutSection`» es el que F11b le deja a F11d («Lo que otros ítems toman de F11b») y el que dice el contrato de F11a («Lo que suman otros ítems»), así que no choca con F11b, que inserta antes, ni con F12a, que inserta después del aviso.
- **El arranque.** La pregunta aparece al arrancar, antes de que el alumno abra «Tu cuenta», así que no puede vivir dentro de ese diálogo.

**Alternativas:**

- **Un slice `pages/progress-question`:** otra página para un diálogo que comparte la raíz, los textos y el doble de pruebas con «Tu cuenta».
- **Dentro de `AccountDialog`:** la pregunta no se vería hasta que el alumno abriera «Tu cuenta».

### R45. Los «datos locales de la cuenta» sin un registro

**El problema.** El FR-062 y la entidad «Datos locales de la cuenta» dicen que se borran «los datos locales de la cuenta que registran sus dueños», sin que F11 nombre sus almacenes. Ningún plan creó ese registro: A3 expone `forgetContentCopy()` (R15 de D1c y `plan.md:5636` de A3), y D1c, `enterSharedMode()`, que no borra la copia del contenido.

**Decisión: la interfaz más chica que alcanza,** un puerto de dos acciones y una consulta, armado en `app/`:

```ts
// pages/account/model/shared-computer-context.ts
export interface SharedComputer {
  enter(): Promise<void>; // borra los datos locales de la cuenta y deja de guardar progreso
  leave(): void; // desde el próximo documento, el progreso vuelve a guardarse
  hasLeft(): boolean; // si este documento ya salió del modo
}
```

- **Quién lo arma:** `app/account/shared-computer.ts`, con `createSharedComputer({progress, forgetContentCopy})`. `enter()` llama primero a `progress.enterSharedMode()` de D1c y después a `forgetContentCopy()` de A3.
- **Si el primero falla,** la copia queda: el modo no se activó, y la pantalla lo dice.
- **Cómo llega a la pantalla:** `AccountRoot` lo provee con `SharedComputerContext`. No va por props, porque `AccountMenu` y `AccountDialog` no lo usan y sólo lo reenviarían (prop drilling).
- **El registro es esa función:** la lista de dueños es el cuerpo de `enter()`, en un solo lugar de `app/`. Un tercer dueño suma una línea ahí, y la pantalla no cambia.

**Por qué no un registro con altas en tiempo de ejecución** (por ejemplo, `registerAccountLocalData(owner)` en `shared/lib`):

- son dos dueños, una pantalla y un solo momento de borrado (YAGNI);
- el modo compartido no es sólo borrar: D1c además pasa la cola a memoria y guarda la elección, y A3 deja de escribir la copia (R46). Un registro de funciones de borrado no expresa eso, y cada dueño tendría que registrar más de una;
- un registro agrega orden de inicialización entre módulos que hoy no existe.

**La redacción de la spec.** «Que registran sus dueños» describe un mecanismo que no existe. El informe propone, como hallazgo, cambiar en FR-062 y en «Datos locales de la cuenta» «que registran sus dueños» por «que borra cada dueño con su operación pública (el espacio de D1c con `enterSharedMode()` y la copia del contenido de A3 con `forgetContentCopy()`), y que la aplicación junta en un solo lugar». F11 sigue sin nombrar los almacenes.

### R46. `afterPublish` en el modo compartido (F11d-1)

**El problema.** `contentGate` publica el contenido antes de que corra `progressStage`. En el arranque que sigue a la activación del modo, el motor de D1c todavía tiene su estado inicial (`mode: 'browser'`) cuando `afterPublish` decide si escribir la copia. Preguntarle el modo al motor escribiría la copia de nuevo.

**Decisión:**

- **La elección se lee del almacenamiento.** `keepsNoContentCopy()` (en `app/account/shared-computer.ts`) lee la elección guardada, `taller-v2-compartida:<id>`, con `chooseMode` de D1c y la cuenta de `sessionStore`, sin depender del motor.
- **El accesor:** usa `browserEnvironment.localStorage()` de D1c. T070 exporta esa constante de `app-progress-sync.ts`, para no repetir el sondeo.
- **El cambio en `afterPublish`:** después de `rememberPublishedVersion(...)` (D1c T017) y de la rama de la copia sin servidor, si `keepsNoContentCopy()` da `true`, no escribe y emite `taller:content-copy-saved` con `saved: false`.
- **Con el almacenamiento bloqueado,** el comportamiento es el de A3: `chooseMode(null, id)` da `'blocked'`, no `'shared'`.

**Por qué emite `saved: false`:**

- La señal de A3 (su R10) dice si la copia quedó guardada, y acá no quedó.
- Así el E2E espera la señal en lugar de un tiempo: con la escritura asíncrona de A3, «no hay copia» medido antes de que la escritura termine pasaría aunque la guarda faltara.
- Nadie en producción escucha la señal (A3 la usa en sus E2E y en su medición).

**Por qué el bloqueado no cambia:**

- No es una elección del alumno.
- A3-Q2 dice que sólo el modo compartido no guarda la copia.
- La copia vive en IndexedDB, que A3 ya trata cuando falla.

**Alternativas:**

- **Preguntarle al motor:** falla justo en el arranque que importa.
- **Mover la decisión a `progressStage`:** es de D1c, y la copia ya se habría escrito.
- **Que A3 lea la elección:** A3 está mergeada y su FR-021 deja el modo compartido a quien lo implemente.

### R47. La pregunta: cuándo aparece, cómo se dibuja y qué hace Esc

**Decisión:**

- **Cuándo aparece:** mientras `importQuestion` no es `null` **y** `status` no es `null`, es decir, con el arranque del motor terminado. El motor abre la pregunta en `boot()` antes de pedir la foto (T011 de D1c), y `runImport` usa `copy.epoch`. Responder durante la espera de la foto, de hasta 10 s, mandaría la época de la copia en blanco (`blankCopy`, época 1) en lugar de la de la foto.
- **Lo que no espera:** la etapa de D1c no espera la respuesta: las vistas se montan detrás del diálogo modal, y el motor no escribe nada antes del sí (FR-072 de D1, Review Focus 3 de D1c).
- **Cómo se dibuja:** un `<dialog>` modal con `showModal()`, con el título «¿Este progreso es tuyo?». El foco va al título al abrir y al volver a preguntar, a la región de estado mientras espera y al resultado al terminar.
- **El 409:** al volver a preguntar, se ve el mismo texto, sin el mensaje del servidor (FR-065).
- **Esc** cierra el diálogo nativo, y F11d lo traduce según la fase:
  - en la pregunta, es «No es mío»;
  - mientras espera, lo vuelve a abrir;
  - en el resultado, es «Entendido».

**Por qué `onClose` y no `onCancel`:** Chromium sólo deja cancelar el `cancel` si hubo una activación del usuario desde que se abrió el diálogo, y la pregunta se abre sola al arrancar. Con `onCancel`, el primer Esc cerraría el diálogo sin que F11d se enterara. React propaga `close` por su árbol (Context7, «Dialog-specific Event Props»), pero el diálogo de la pregunta no está dentro de otro.

**Un doble clic en «Sí, es mío».** El motor no cierra la pregunta `offer` hasta que termina la importación. Por eso, mientras F11d espera su sí, la pregunta `offer` se dibuja como «Sumando tu progreso…», sin botones. Un segundo clic no tiene dónde caer, y no sale un `answerImport(true)` que el motor rechazaría con `BUSY`.

**Por qué no `useGuardedSubmit`:** la promesa del primer sí sigue pendiente durante la repregunta, y la guarda bloquearía el segundo sí.

### R48. La importación desde Método

**El problema.** El motor también abre `importQuestion` con `source: 'export'` y `stage: 'confirm'` cuando la importación de un archivo desde Método recibe un 409 `import_needs_confirmation` (R13 de D1c). El texto de la spec («Este navegador tiene progreso guardado sin cuenta…») no sirve para un archivo.

**Decisión:**

- **El texto:** con `source: 'export'`, «La copia que elegiste tiene progreso guardado: {resumen}. Si es tuyo, lo sumamos a tu cuenta. Si no, no se importa.», con los mismos botones.
- **Después de responder,** el diálogo se cierra, y el resultado lo muestra Método con su aviso, porque la promesa de `applyImport` resuelve el texto de D1c (§6 y §8 del contrato de D1c).
- **Sin informe:** F11d no muestra el informe de esa importación ni su espera.

**Por qué:**

- **Una superficie por importación:** Método ya muestra el aviso de la suya.
- **El alcance del FR-065:** viene del FR-073 de D1, que habla del v1 del navegador. La repregunta del archivo es lo que D1c le pasó a F11d (R13 de D1c); el informe del archivo no lo pide nadie.
- **Hallazgo para F8:** su importación no muestra el informe ni espera visible, aunque `lastImport` y `busy` están para quien los dibuje.

### R49. El final: el informe, las fallas y la recarga

**Decisión:**

- **El resultado de la importación del navegador** sale del estado después de que resuelve la promesa del primer `answerImport(true)`, que en el motor resuelve al final, también después de una repregunta:
  - si `lastImport` es otro objeto que antes del sí, se muestra el informe con `role="status"`;
  - si no, se muestra `importNotice` con `role="alert"`, seguido de «Te lo volvemos a preguntar la próxima vez que abras el taller.»;
  - si no hay aviso, se muestra el mensaje común de respuesta inesperada (`UNEXPECTED_MESSAGE` de `shared/ui/form`).
- **El informe** dice lo escrito por área, sin los ceros, y después lo omitido, lo reemplazado y los conflictos, cada uno con su ruta y su motivo en palabras («Textos que agrega el plan»).
- **Con «No es mío» en la repregunta,** el diálogo se cierra sin aviso: la pregunta vuelve en el próximo documento.
- **«Entendido» después del informe recarga el documento** (decisión 2 del usuario, con recomendación). Después de una falla, sólo cierra.

**Por qué se compara `lastImport` y no el texto del aviso:** el índice de `features/progress-sync` exporta `BUSY`, pero no `IMPORTED`. Además, `lastImport` e `importNotice` quedan de una importación anterior, también de una de Método. Un objeto nuevo en `lastImport` sólo aparece si esta importación terminó bien (`patch({ lastImport: outcome.report })`, T011 de D1c).

**Por qué la frase sobre la próxima vez:** los avisos de D1c hablan de «la copia» y de «el archivo» porque los comparte con Método («volvé a importar la copia»). Para el v1 del navegador, lo cierto es que las claves quedan y la pregunta vuelve.

**Por qué recargar:**

- Las vistas legacy no se vuelven a dibujar cuando llega un cambio a mitad del documento (riesgo 4 de D1c). Justo después de leer «sumamos este progreso a tu cuenta», el alumno vería su progreso vacío en la vista de atrás.
- La recarga arranca de nuevo con el espacio de la cuenta ya escrito.
- Las claves v1 quedaron archivadas, así que no se vuelve a preguntar.
- Es lo que F11 ya hace ante un cambio de cuenta.

**El costo y la alternativa:**

- **El costo:** un arranque más (la sesión y el contenido).
- **La alternativa:** cerrar sin recargar, como el riesgo aceptado de D1c. Las vistas de React se actualizan solas; las legacy, al navegar.

### R50. La opción: casilla, confirmación en línea y salida

**Decisión:**

- **La casilla.** «Estoy en una computadora compartida» es una casilla controlada: marcada mientras `mode` es `'shared'`. La describe «No guardamos tu progreso en este navegador: lo que no llegue al servidor se pierde al cerrar la pestaña.» (`aria-describedby`).
- **Activar.** Marcarla en `browser` no la marca. Abre, debajo, el aviso de la spec con «Activar y borrar» y «Cancelar», y el foco va al aviso.
  - «Cancelar» devuelve el foco a la casilla.
  - «Activar y borrar» llama a `enter()`, y al terminar el motor pasa a `shared`, la casilla queda marcada y el foco vuelve a ella.
  - Si `enter()` falla: «No pudimos activar el modo compartido. Probá de nuevo.», con `role="alert"`.
- **Salir** (decisión 1 del usuario, con recomendación). Desmarcarla en `shared` llama a `leave()` (`leaveSharedMode()` de D1c). En lugar de la casilla queda, con el foco y `role="status"`, «Listo: desde la próxima vez que abras el taller, tu progreso se guarda en este navegador.».
  - La salida no tiene confirmación, porque no se pierde nada.
  - `hasLeft()` lo recuerda mientras dura el documento, también si se cierra y se abre «Tu cuenta».
- **Con el almacenamiento bloqueado** (`mode: 'blocked'`), sólo se ve el aviso del FR-063, sin casilla, porque `enterSharedMode()` no hace nada fuera de `browser`.
- **Mientras el motor no arrancó** (`status: null`), la sección no se dibuja: `enterSharedMode()` lanza sin una sesión arrancada (`opened()`, T011 de D1c).

**Por qué la salida desaparece hasta el próximo documento:** después de `leaveSharedMode()`, el motor sigue en `mode: 'shared'`, porque la cola vive en memoria. Un `enterSharedMode()` en el mismo documento vuelve sin hacer nada (`if (state.getState().mode !== 'browser') return;`) y no guarda la elección. Volver a ofrecer la casilla dejaría activar un modo que no se guarda. Es un hallazgo para D1c.

**Por qué una casilla y no un botón:** la spec la llama «la opción», y una casilla dice su estado al lector de pantalla. La confirmación en línea evita un tercer diálogo encima de «Tu cuenta» y no depende de `AccountSubdialog`, de F11b.

**Alternativas:**

- **Sin salida** (la letra estricta del FR-062, que sólo pide ofrecerla): un alumno que la activa por error en su computadora no tiene cómo volver atrás sin borrar los datos del sitio.
- **Salir y recargar:** perdería la cola que vive en memoria.

### R51. Los estados de la tabla y SC-004

**Decisión.** Cada estado no vacío de las dos filas de F11d tiene su prueba:

| Fila | Estado | Prueba |
| --- | --- | --- |
| Computadora compartida | Almacenamiento bloqueado: el aviso | `shared-computer.spec.tsx` y el E2E «a browser that blocks storage…» |
| ¿Este progreso es tuyo? | «Sumando tu progreso…» | `import-question.spec.tsx` y el E2E con el pedido retenido |
| | 409 `import_needs_confirmation` | `import-question.spec.tsx` y dos E2E (con «Sí» y con «No») |
| | 422 con rutas, 413 de Nginx, 5xx, 401, 409 `account_mismatch` y 429 | El E2E por tabla, con el cuerpo del contrato |
| | 419 | El E2E que renueva el CSRF y reintenta |

**Por qué los estados HTTP son E2E:** SC-004 pide «un cuerpo tomado del contrato», y el que traduce cada respuesta en un aviso es el motor de D1c. Una spec de Vitest de F11d con un `importNotice` armado probaría el texto, pero no la respuesta. Los E2E mandan la respuesta real por el doble, y el motor real la traduce.

**El 429 sin cuenta regresiva.** D1c traduce el 429 a un texto y no expone el `Retry-After`. Después de una falla la pregunta se cierra y no se puede reenviar en el mismo documento, así que el «no permitir reenviar antes» del FR-021 se cumple. Lo que no se muestra es cuánto falta. Es un hallazgo para D1c.

### R52. Sin React Hook Form y sin dependencias nuevas

**Decisión:**

- **Sin React Hook Form:** F11d no tiene campos, sólo una casilla y botones, y no envía nada al servidor por sí misma. El FR-024 rige para los formularios.
- **Sin paquetes nuevos:** usa Zustand (`useStore` con selector, TR-5), React 19, Testing Library y Playwright, ya instalados.
- **Sin fishery:** los datos de las specs son estado del motor escrito a mano, no respuestas HTTP. Las respuestas HTTP de los E2E salen de http-d1b.md, también escritas a mano.

### R53. El peso

**Decisión:** F11d suma como mucho **+10 000 caracteres** sobre la medida de T060, y el total queda bajo `BOOT_SIZE_LIMIT`, que es **1 500 000** (`qa/build-check.ts`).

**Por qué ese número:** son seis componentes chicos, un hook, dos módulos puros, unos veinte textos y cuatro reglas de CSS. F11b, con tres diálogos y un formulario cada uno, pidió +15 000, y F11c, +5 000. Es una estimación, no una medida.

### R54. La red E2E

**Decisión:**

- **Sin editar:** los E2E de la base de T060, que incluyen los de D1c U5, y los escenarios de `boot-check`, `dist-content-check` y `load-order-check` (FR-076).
- **Una excepción, con la aprobación del usuario** (T067). El escenario de «Borrar todo» de T025 de D1c siembra el v1 real con `seedRaw(frozenProgress)` y después hace clic en Método. Con F11d, la pregunta modal aparece al arrancar y tapa la página. La edición suma una línea que responde «No es mío» antes del primer clic.
  - Contra la base sin F11d, la línea falla, porque no hay diálogo.
  - T060 inventaría cualquier otro uso de `seedRaw` con claves v1 seguido de un clic.
- **El escenario de `boot-check` con `rawStorage`** (T017 de D1c) arranca con las claves v1. Con F11d, el diálogo se dibuja en el DOM falso, si el harness conoce `#account-root`: `FakeElement` tiene `showModal`, `close` y `focus` (`qa/lib/fake-dom.ts:162` y `:201`). El escenario no se edita, y su `harness.errors` tiene que seguir vacío. Lo comprueba la compuerta de U9.
- **Lo que se suma:**
  - `qa/e2e/pages/progress-question.ts`;
  - `qa/e2e/lib/progress-import.ts`;
  - el fixture `progressQuestion`;
  - `sharedComputer()` en `qa/e2e/pages/account.ts`;
  - `progress-question.spec.ts` y `shared-computer.spec.ts`.

## Consultas de documentación (Context7)

El servidor `mcp__context7__*` agotó su cuota el 2026-10-28. Las consultas fueron al segundo servidor de Context7 de la sesión.

| Librería | Versión del proyecto | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` (la más cercana) | `useStore(store, selector)` con un almacén de `zustand/vanilla` | `useStore` de `zustand` recibe el almacén vanilla y un selector, y el componente se suscribe sólo a lo que el selector devuelve | Sí: los selectores devuelven `null` mientras `status` es `null` (R47 y R50), y nunca se suscribe al almacén entero (TR-5) |
| React | 19.2.8 | `/react/react/v19.2.8` y `/websites/react_dev_reference` | El contexto como proveedor (`<Context value>`) y los eventos `onCancel` y `onClose` de `<dialog>` | En React, `onCancel` y `onClose` de `<dialog>` propagan por el árbol de React. `<Context value>` es la forma que ya usan F11a y D1c | Sí: la pregunta escucha `onClose` y no `onCancel` (R47); el diálogo no está dentro de otro |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `timezoneId` en `test.use` | Cambia la zona horaria del contexto del navegador, no la del proceso de pruebas | Sí: el E2E de la pregunta fija `America/Argentina/Buenos_Aires`, y el resumen del fixture dice «3 de octubre de 2026» |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `browserContext.storageState()` | Devuelve el `localStorage` de cada origen del contexto, y con `indexedDB: true` también IndexedDB, sin una página abierta en ese origen | Sí: el E2E de «al cerrar la pestaña» cierra la página y lee el estado del contexto (SC-010) |
| Testing Library (user-event) | 14.6.7 | `/testing-library/user-event` | `user.click` sobre una casilla | El clic dispara la acción por omisión de la casilla; con `checked` controlado, React vuelve al estado del render | No: la casilla controlada se queda desmarcada mientras se confirma |
| Testing Library | 16.3.3 | `/websites/testing-library` | `ByRole` y los elementos ocultos | Por omisión excluye lo que está fuera del árbol de accesibilidad | No: los diálogos se consultan abiertos, con `stubDialogs` |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `vi.fn`, `mockResolvedValue`, `mockRejectedValueOnce` y `toHaveBeenCalledWith` | Las firmas de los dobles se tipan con el genérico de `vi.fn` | No |
| jsdom | 30.1.2 | `/jsdom/jsdom` | `HTMLDialogElement.showModal` y `close` | No están implementados (la WebIDL los comenta) | No: las specs usan `stubDialogs()` de F11a, como F11b (F11a-7) |
| React Hook Form, fishery, nuqs, Vite, Laravel, Pest, PHPStan y Docker | — | sin consulta | — | F11d no los usa ni los configura (R52). La verificación a mano usa los comandos del quickstart de D1c | — |

## Mediciones de sólo lectura

| Qué | Valor | Fuente |
| --- | --- | --- |
| El resumen del v1 congelado | 9 registros del laboratorio con `solvedAt`, de 11; el `result.time` más nuevo es `1791073357290`, es decir, `2026-10-04T00:22:37.290Z`, que en Buenos Aires es el 3 de octubre de 2026 | `qa/fixtures/progress-master-2a278ad-storage.json`, contado con un script de sólo lectura, independiente de `summarizeLab` |
| El resumen de los dos exports congelados | Los mismos 9 resueltos y el mismo instante | `qa/fixtures/progress-master-2a278ad-export.json` y `progress-d0e1b49-export.json` |
| El informe del contrato | `written` con las doce áreas (11, 11, 11, 9, 1, 1, 3, 1, 4, 1, 1 y 1), un omitido (`lab.records.rust-02.reviewAt`, `date_out_of_range`) y un conflicto (`lab.records.rust-06.reflection`, `newer_value_kept`) | http-d1b.md §3.4 |
| El mensaje del 409 | «Confirmá que esta copia es tuya antes de combinarla con el progreso de tu cuenta.» | `backend/api/lang/es/api.php:28`; http-d1b.md §6 |
| Los avisos de la importación de D1c | `IMPORT_UNREACHABLE`, `IMPORT_TOO_LARGE`, `IMPORT_SIGNED_OUT`, `IMPORT_ACCOUNT_CHANGED`, el prefijo `No se pudo importar: ` del 422 y el 429, y `BUSY` | `plan-d1c.md`, T003 (`sync-texts.ts`), y el mapeo de `failureNotice` de T011 |
| Lo que exporta `features/progress-sync` | `ProgressSyncContext`, `useProgressSync`, `createMemoryStorage`, `sharedModeKey`, `BUSY` y los tipos del contrato; no exporta `IMPORTED` | `plan-d1c.md`, T011, paso del índice |
| La elección del modo | `taller-v2-compartida:<id>` = `'1'`; `chooseMode(local, id)` da `'blocked'` con `null`, `'shared'` con la elección y `'browser'` sin ella | `plan-d1c.md`, T016 |
| Dónde se escribe la copia | Sólo en `afterPublish` de `app/boot/content-stage.ts` | A3, `plan.md:3699` y `:5636` |
| Lo que el DOM falso de `boot-check` ya tiene | `showModal()`, `close()` y `focus()` en `FakeElement` | `qa/lib/fake-dom.ts:162` y `:201`, en `master` |

## Textos que agrega el plan

Los de la spec van tal cual: la opción y su ayuda, el aviso antes de activarla con «Activar y borrar» y «Cancelar», el del almacenamiento bloqueado, «¿Este progreso es tuyo?», el resumen del navegador y los botones «Sí, es mío» y «No es mío». También «Sumando tu progreso…», que sale de la tabla de estados, y «Entendido», que ya usa F11b. Los que suma el plan son para que el usuario los corrija (decisión 3):

| Dónde | Texto |
| --- | --- |
| El resumen con un solo ejercicio | «1 ejercicio resuelto» |
| El resumen sin fecha del último resultado | Sin «, el último el {fecha}» |
| La repregunta de una copia de Método | «La copia que elegiste tiene progreso guardado: {resumen}. Si es tuyo, lo sumamos a tu cuenta. Si no, no se importa.» |
| El informe, al principio | «Listo: sumamos este progreso a tu cuenta.» |
| El informe, lo escrito | «Guardamos {n} ejercicios, {n} borradores, … y {n} preferencias.», sin las áreas en 0. Los nombres de las doce áreas están en `local-progress-texts.ts` (plan, T062) |
| El informe sin nada escrito | «Tu cuenta ya tenía todo lo que traía este progreso.» |
| El informe, lo omitido | «No se guardaron estos datos:», con «{ruta}: {motivo}» |
| El informe, lo reemplazado | «Estos textos tenían caracteres que no se podían leer, y los reemplazamos:» |
| El informe, los conflictos | «En estos datos, tu cuenta ya tenía algo más nuevo, y lo conservamos:» |
| Los motivos | Los nueve de http-d1b.md §8, en palabras: «no es un número entero», «la fecha está fuera de rango», «no es una de las opciones», «pide más pistas de las que hay», «el paso ya no existe», «contradice un error de conexión», «tenía caracteres que no se podían leer», «tu cuenta tenía un valor más nuevo» y «tu cuenta tenía un intento del servidor». Uno desconocido se muestra como llega |
| Después de una falla | «Te lo volvemos a preguntar la próxima vez que abras el taller.», después del aviso de D1c |
| Al salir del modo compartido | «Listo: desde la próxima vez que abras el taller, tu progreso se guarda en este navegador.» |
| Si el modo no se pudo activar | «No pudimos activar el modo compartido. Probá de nuevo.» |

## Lo que no se verificó

- **Nada corrió.** Ni el motor de D1c, ni «Tu cuenta» de F11a, ni el `content-stage.ts` con las líneas de A3 y de D1c existen todavía en una rama implementada. T060 compara cada firma antes de empezar, y la tarea que use una firma distinta sigue la real.
- **El comportamiento de Esc en Chromium** con un diálogo abierto sin activación del usuario (R47) sale de la regla de los «close watchers» del estándar de HTML, no de una prueba. El E2E «Esc answers «No es mío»» lo fija, y `onClose` cubre los dos casos, se pueda cancelar o no.
- **Que `boot-check` conozca `#account-root`:** depende de cómo T012 y T013 de F11a armaron el DOM falso. T060 lo anota.
- **La verificación contra el stack** (el import real, el CSRF real y la IndexedDB real) va a mano, con permiso para Docker (quickstart-f11d.md §3).
