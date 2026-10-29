# Feature Specification: A4 · Laboratorio con el sandbox propio

**Feature Branch**: `017-a4-laboratorio-sandbox` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-07

**Status**: Clarificada (sesión del 2026-10-28): el usuario respondió Q1 a Q5 con la opción recomendada, y después D1 a D3 del plan, también con la recomendada. Lo que depende de F7 espera a F7a, no a F7b (P2; C4 del coordinador)

**Input**: Ítem **A4** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Laboratorio con el sandbox propio»: que el laboratorio use `/api/runs` en lugar de los Playgrounds públicos. Depende de B2, entregado ([spec 005](../005-b2-api-ejecuciones/spec.md), PR #31); de A3 (spec 016, rama `spec/a3-contenido-api`); de F7a, la primera parte del port del laboratorio en la [hoja de ruta del front](../front-react/roadmap.md) (spec 021, rama `spec/f7-laboratorio`; P2); y de B3, la auditoría del currículo (spec 020, rama `spec/b3-auditoria`; Q5). Las tres specs se citan sin enlace hasta que se integren. Fuente técnica: el [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) (aceptada) y el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**), en su D24, su D26 y su §10. **Extiende** a [`specs/005-b2-api-ejecuciones`](../005-b2-api-ejecuciones/spec.md) en un punto del contrato de la ejecución, el id del intento (Q1). Pedido del coordinador del 2026-10-07 (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Hoy el laboratorio arma en el navegador el programa completo (el borrador del alumno más el arnés de `buildProgram`), lo manda a los Playgrounds públicos de Rust y de Go y decide en el navegador qué pruebas pasaron, leyendo las marcas de la salida. B2 ya dejó en el servidor todo lo necesario para hacerlo en el sandbox propio: el envío asincrónico, la cola con cuotas, el programa que arma el servidor con la plantilla del arnés y el veredicto que decide el servidor. A4 conecta el laboratorio con eso. El alumno sigue pulsando «Ejecutar y revisar» y sigue viendo el mismo revisor, con compilación real. Lo que cambia es dónde corre su código, que el taller le dice si espera turno, que las cuotas tienen aviso y que los Playgrounds desaparecen. El progreso guardado conserva su forma: el resultado suma sólo el id del intento del servidor, que D1b ya sabe leer. Es para el alumno, para quien opera el taller (deja de depender de servicios de terceros) y para D1c, que espera a A4 para sincronizar lo resuelto. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el mismo código, el alumno ve el mismo revisor que hoy: «La idea funciona en estos casos.», «N de M: encontramos algo para explorar.» o «El programa nos dejó una pista.», con las mismas explicaciones. Campaña y Sistemas cuentan lo mismo.
2. Nada aprueba si el servidor no dijo `passed`: ni un rechazo, ni una falla del taller, ni una red caída, ni una evidencia inválida.
3. El navegador no vuelve a hablar con `play.rust-lang.org` ni con `play.golang.org` (Q2), y la CSP deja de nombrarlos.
4. El progreso guardado arranca igual con las fixtures congeladas, y cada resultado de una ejecución del servidor lleva el id de su intento, con el que D1b no lo duplica al importar.
5. La vista previa muestra el programa que corre en el servidor, con los mismos números de línea.
6. Con el stack real, un ejercicio de Rust y uno de Go se resuelven desde el navegador con su solución de referencia y fallan con su código inicial.

**Entra:**

- El adaptador de transporte de `features/run-exercise` (la feature que trae F7a) sobre `POST /api/runs`, `GET /api/runs/{id}` y `POST /api/runs/{id}/cancel`, con la espera, los reintentos con la misma clave y el reparto de errores.
- El armado del `result` v1 a partir de una ejecución terminada, con el id del intento.
- El campo `attemptId` en la ejecución que publica la API (Q1): un cambio aditivo del backend, con sus pruebas.
- La vista previa con la plantilla del servidor y su renderizador en el navegador.
- Los estados de la espera y los avisos (fila, demora, cuotas y sesión) en la revisión del laboratorio, y los textos que nombran el Playground.
- El retiro del cliente de Playgrounds, de su adaptador y de lo que sólo él usa, y la CSP sin los dos hosts (Q2).
- La adaptación de la red E2E y de los checks de `qa/` que simulan o usan los Playgrounds, y la documentación que los nombra (la integra el agente principal).

**Queda fuera:**

- **F7:** portar el laboratorio a React, sus exploradores, el editor y la feature `features/run-exercise` con su puerto de transporte y su canal de progreso. A4 cambia el adaptador y lo que el cambio de transporte arrastra (ver «El seam de hoy y lo que F7 decidió»).
- **D1c:** el cliente v2 del progreso. El progreso sigue en las claves v1 del navegador, y A4 no sincroniza nada.
- **A3 y F11a:** la sesión, el ingreso y la lectura del contenido de la API. A4 usa la sesión, «pedir el ingreso» y el doble de la API que dejan.
- **B3:** la auditoría del currículo en el ejecutor local, que va antes que A4 (Q5).
- **B2:** la API de ejecuciones, salvo el campo `attemptId` (Q1). Las cuotas, la cola, la clasificación y la evidencia quedan como están.
- **C5:** las estadísticas y los endpoints de administración de ejecuciones.
- El historial de intentos (`GET /api/attempts*`), que B2 dejó sin dueño en su Q4: A4 no lo necesita.

**Sin hacer a propósito (YAGNI):** SSE, WebSocket o Reverb para la espera (el camino de escala del ADR 0006 §9 los trae con su disparador); retomar una ejecución después de recargar la página; guardar el estado de la espera en el almacenamiento; reintentar solo el código del alumno; un historial de ejecuciones en la vista; un modo sin conexión para ejecutar; dependencias nuevas.

**Actores:** el alumno (ejecuta, espera, cancela y lee el revisor), quien opera el taller (el sandbox, las cuotas y la CSP), quien mantiene el front (F7 y la red E2E) y los ítems vecinos: B2 (el contrato), A3 (la sesión y el contenido), D1 (la importación y el cliente v2), C4 (la CSP) y B3 (la auditoría).

### Cambios visibles para el alumno

A4 no es un port: cambia el transporte a propósito. Esto es todo lo que el alumno puede notar, con su motivo. Cada punto tiene su requisito y, si cambia un texto, su fila en «Textos que cambian».

1. Los cuatro lugares que nombran el Playground (la guía de ejecución, el aviso bajo «Ejecutar y revisar», la vista previa y el aviso de fallo) hablan del taller (FR-033).
2. Mientras espera, la revisión dice si está en la fila del taller y en qué lugar, avisa si tarda y, ante un taller ocupado o su ejecución anterior, espera turno sola (Q3).
3. Las cuotas y la sesión vencida tienen su aviso, con cuándo volver a intentar (FR-011 y FR-012).
4. Un programa que supera el tiempo límite se muestra como «El programa nos dejó una pista.» y no como «No pude ejecutar esta vez.»: el tiempo lo corta el sandbox, no la conexión, y el servidor lo cuenta como intento.
5. La salida del programa ya no muestra las marcas de prueba (`__TALLER_TEST__…`), y la vista previa las muestra con el código de cada ejecución en ceros (FR-017 y FR-026).
6. Tres casos raros tienen explicación propia: la salida recortada, la evidencia inválida y los límites de memoria o de hilos (FR-018).
7. El tope del código pasa de 200 KB a 64 KB, el que fija el servidor (FR-002).
8. La revisión deja de mostrar el número de intentos hasta D1c (Q4).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o lo decidió el clarify (Clarifications).

| Pedido | Fuente |
| --- | --- |
| El laboratorio usa `/api/runs` en lugar de los Playgrounds públicos | Hoja de ruta del backend, A4; [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md), «Fases» (3) y «Consecuencias» |
| La vista previa con la misma plantilla y el retiro del cliente de Playgrounds | Hoja de ruta, alcance de A4; ADR 0005 §4 y «Consecuencias» |
| A4 cambia el adaptador de transporte de `features/run-exercise`, la feature que trae F7, y espera a F7 | Hoja de ruta del backend (decidido el 2026-10-05) y hoja de ruta del front, «Ítems del backend que tocan el front» y «Orden y paralelismo». La precisan P2 y el ruling C4 del coordinador: espera a F7a y a B3, no a F7b |
| Guarda el id del intento del servidor en el `result` v1 y deja de sumar `attempts` por las ejecuciones del servidor | Hoja de ruta, alcance de A4; ADR 0006 §10 y D24 |
| La consulta con espera creciente de 0,3 s a 2 s hasta un estado final; `POST /api/runs/{id}/cancel` cancela | ADR 0005 §3 |
| El navegador usa la plantilla para la vista previa, y un fixture compartido prueba que los dos renderizadores dan el mismo texto | ADR 0005 §4; [B2](../005-b2-api-ejecuciones/spec.md), FR-036 |
| La CSP quita los Playgrounds de `connect-src` | ADR 0005, «Consecuencias»; [C4](../008-c4-exposicion/spec.md), que los deja hasta A4 |
| Se conservan los IDs, la compatibilidad del progreso y la distinción entre compilación real, simulaciones y pasos manuales | [`AGENTS.md`](../../AGENTS.md); [constitución](../../.specify/memory/constitution.md), principio IV |
| El cliente de D1 (D1c) entra en servicio después de A4 | [D1](../007-d1-progreso-sincronizacion/spec.md), Q4 (usuario, 2026-10-06) |
| La spec deja claro el transporte nuevo (pedido, espera con intervalos y tope, estados y errores, id del intento), qué pasa con los Playgrounds, lo que ve el alumno, la compatibilidad y qué se planifica antes de F7, y toma de F7 sólo supuestos explícitos | Pedido de esta tarea (coordinador, 2026-10-07) |
| TDD; código y pruebas en inglés; Spec Kit en español; accesibilidad de teclado, diseño móvil y movimiento reducido | `AGENTS.md`; constitución, principios II y VI |
| Vitest prueba la lógica y los componentes, y Playwright la red de punta a punta contra el build servido, sin tocar servicios públicos | [ADR 0008](../../docs/adr/0008-pruebas-del-front.md); constitución, principio II |
| Un E2E que haya que editar es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario | Hoja de ruta del front, «Criterios de aceptación globales» (la regla de los ports, que A4 sigue) |
| A4 suma `attemptId` a la ejecución de la API, aditivo y con Pest, y extiende la spec 005 | Usuario, 2026-10-28 (Q1, opción A) |
| Los Playgrounds se retiran del todo; la CSP de C4 queda estricta y, con el sandbox caído, no se ejecuta | Usuario, 2026-10-28 (Q2, opción A) |
| La fila visible, el aviso de demora a los 15 s y la espera de turno automática ante `active` y `queue_full`, con el mismo `clientRunId`, esperas que crecen y varían, por debajo de 30 envíos por minuto y hasta 2 minutos | Usuario, 2026-10-28 (Q3, opción A) |
| La revisión oculta el número de intentos hasta que D1c lo traiga del servidor | Usuario, 2026-10-28 (Q4, opción A) |
| B3 va antes que A4 (ADR 0005 §8), en paralelo con F5, F6 y F7, y es condición de A4 | Usuario, 2026-10-28 (Q5, opción A; Q3 de B3) |
| `features/run-exercise` expone un canal de progreso y la cancelación, con los estados de hoy en una unión ampliable; A4 suma los suyos sin cambiar la feature | Usuario, 2026-10-28 (Q2 de F7) |
| F7 se parte en F7a (la feature con su puerto, sin vista nueva) y F7b (la vista); A4 toma el puerto de F7a | Usuario, 2026-10-28 (P2, la Q4 de F7) |
| A4 espera a F7a y a B3, no a F7b; sus estados y textos los dibuja la vista vigente cuando A4 entra | Ruling C4 del coordinador, 2026-10-28 |
| A3 no pide la plantilla del arnés al arrancar: la pide A4 cuando el laboratorio la necesita | Spec de A3, clarify del 2026-10-28 |

**Base del ADR 0006 (propuesta).** A4 usa D24 (la importación omite los intentos que ya existen en el servidor «porque desde A4 el `result` v1 guarda el id de su intento»), D26 (todo cierre deja un intento) y la fila A4 de §10. El usuario todavía no aprobó el ADR, pero autorizó implementar B2 y D1 sobre él; si lo enmienda en esos puntos, esta spec cambia con la enmienda.

## Clarifications

### Session 2026-10-28

El usuario respondió las cinco preguntas con la opción recomendada. Las tres últimas líneas vienen de otras specs y cambian lo que A4 construye. Los requisitos que citan «(Q*n*)» aplican la respuesta.

- Q: **Q1**, ¿cómo llega al navegador el id del intento? → A: Opción A: A4 suma `attemptId` a la ejecución de la API, `null` mientras no terminó y el id del intento cuando terminó. Es aditivo, llega con sus pruebas de Pest y extiende la spec 005 (constitución, principio VIII). Descartadas: guardar el id de la ejecución (B), que pide una spec nueva sobre D1b y pierde la deduplicación cuando la ejecución se poda a los 14 días; y no guardar ninguno (C), que contradice la hoja de ruta y el ADR 0006 D24. Decidió el usuario. (FR-019, FR-024, FR-025 y FR-041)
- Q: **Q2**, ¿qué pasa con los Playgrounds públicos? → A: Opción A: se retiran del todo, como decide el ADR 0005: ni pedidos, ni CSP, ni menciones. La CSP de C4 queda estricta y, con el sandbox caído, no se ejecuta. Descartadas: el enlace manual en el aviso de fallo (B) y el respaldo automático (C), que contradice el ADR 0005 y crea logros que el servidor no conoce. Decidió el usuario. (FR-031 a FR-034 y SC-003)
- Q: **Q3**, ¿cómo espera el laboratorio? → A: Opción A: la fila visible, el aviso de demora a los 15 s y la espera de turno automática ante `active` y `queue_full`, con el mismo `clientRunId`, esperas que crecen y varían al azar, por debajo de 30 envíos por minuto y hasta 2 minutos. `too_many_requests` se muestra y no se reintenta solo. Descartadas: lo visible sin reintento (B) y un solo mensaje, como hoy (C). Decidió el usuario. (FR-006, FR-010, FR-011 y FR-036)
- Q: **Q4**, ¿qué número de intentos muestra la revisión entre A4 y D1c? → A: Opción A: se oculta hasta que D1c lo traiga del servidor, y el resto de la frase queda. Descartadas: el número del servidor sólo después de ejecutar (B), que suma otro campo a la API, y seguir sumando el contador v1 (C), que enmienda el ADR 0006 D24 y cuenta dos veces. Decidió el usuario. (FR-021 y FR-038)
- Q: **Q5**, ¿A4 espera a la auditoría de B3? → A: Opción A: sí. B3 va antes que A4 (ADR 0005 §8), en paralelo con F5, F6 y F7, y el clarify de B3 la hace condición de A4 (su Q3). `runtime-check` se retira con A4. Descartadas: no esperarla (B) y absorberla en A4 (C). Decidió el usuario. (FR-034, FR-044 y FR-047)
- Q: **Q2 de F7** (el supuesto F7-S5), ¿qué estados de la espera expone `features/run-exercise`? → A: Un canal de progreso y la cancelación, con los estados de hoy en una unión ampliable. A4 suma los suyos (en la fila, esperando turno y la demora) y sus textos en la revisión, sin cambiar la orquestación ni el puerto. Decidió el usuario. (FR-036; «El seam de hoy y lo que F7 decidió»)
- Q: **P2** (la Q4 de F7), ¿se parte F7? → A: Sí: F7a trae `features/run-exercise` con su puerto, el diagnóstico, los selectores y los E2E contra el legacy, sin vista nueva; F7b trae la vista. El puerto llega con F7a, y lo de A4 que depende de F7 espera a F7a, no a F7 entero. Decidió el usuario. Lo precisa el ruling C4 del coordinador: A4 espera a F7a y a B3, no a F7b, y sus estados y textos los dibuja la vista vigente cuando A4 entra, la revisión de `lab.js` si F7b todavía no entró (y F7b los porta con sus E2E) o la página React si ya entró. («Qué se puede planificar antes de F7a»)
- Q: ¿Quién pide la plantilla del arnés? → A: A4, cuando el laboratorio la necesita. A3 confirmó en su clarify que no la pide al arrancar, y su copia del contenido admite guardarla como porción opcional (FR-015 de A3). (FR-029)

### Session 2026-10-28 (decisiones del plan)

El usuario respondió las tres decisiones del plan con la opción recomendada. Los detalles están en el research del plan (R10, R14 y R15).

- Q: **D1**, ¿dónde se guarda la plantilla del arnés? → A: Opción (a): como porción opcional del registro de la copia del contenido de A3. El almacén de A3 suma un `update` que lee y escribe en una sola transacción, y el `afterPublish` de A3 arrastra la plantilla del registro anterior. Descartadas: la porción opcional sin arrastre (b), que se pierde en cada arranque con servidor, y sólo en memoria (c), que enmendaba esta FR. Decidió el usuario, 2026-10-28. (FR-029)
- Q: **D2**, ¿se aprueba el commit de las E2E editadas? → A: Sí. Son 20, las medidas sobre F7a:
  - las 9 de F1 que prevé FR-042;
  - 10 de las 14 de `lab-run.spec.ts`;
  - 1 de `lab-exercise.spec.ts`.

  Van en un solo commit, con TDD. «quirk 8» de la spec 021 deja de ser `KNOWN DEFECT`, porque A4 lo corrige: el laboratorio ya no suma intentos. Decidió el usuario, 2026-10-28. (FR-042)
- Q: **D3**, ¿cómo se hace la verificación contra el stack? → A: Como una verificación manual declarada, con la lista del quickstart del plan (§6). SC-007 se mide con `npm run api:runs:check`. Enmienda la forma de FR-047, que dejaba al plan elegir entre un proyecto de Playwright contra el stack y una verificación manual. Descartado: el proyecto de Playwright, porque el ADR 0008 corre Playwright sin API, no hay comando de consola para crear cuentas de prueba y la sesión dura 30 minutos. Decidió el usuario, 2026-10-28. (FR-047 y SC-007)

## El seam de hoy y lo que F7 decidió

**El seam de hoy** (en `master`, `e87772d`):

- [`frontend/src/shared/api/playground/`](../../frontend/src/shared/api/playground/) es el transporte: `runCode({language, code, signal})` recibe el **programa armado**, lo manda al Playground del lenguaje con un tope de 60 s y 200 KB, y devuelve `{success, stdout, stderr}` o una falla con `errorType` (`input`, `aborted`, `http`, `response`, `timeout` o `network`) y su mensaje.
- [`frontend/src/app/legacy/register-runner.ts`](../../frontend/src/app/legacy/register-runner.ts) lo publica como `window.TallerRunner`, y sólo lo lee el laboratorio legacy.
- [`frontend/lab.js`](../../frontend/lab.js), en `runExercise`, suma `attempts` y guarda **antes** de ejecutar, arma el programa con `buildProgram`, llama a `TallerRunner.run`, interpreta la salida con `interpretRun` (las marcas `__TALLER_TEST__<id>:PASS`), guarda el `result`, marca `solvedAt` y `reviewAt` si aprobó y sincroniza campaña y Sistemas. Cancelar, abrir otro ejercicio, volver al mapa, salir del laboratorio y «Borrar todo» abortan el pedido sin guardar nada.
- `sanitizeResult`, en `lab.js`, reconstruye el `result` con un conjunto fijo de campos al cargar y al importar. Con F2a (PR #40) pasa a `frontend/src/entities/exercise/model/lab-state.ts`, junto a `buildProgram` (`build-program.ts`).

**Por qué «sólo el adaptador» no alcanzaba contra este seam.** La hoja de ruta del front dice que A4 cambia el adaptador de transporte de `features/run-exercise` «y no `runExercise` ni `sanitizeResult` de `lab.js`». Contra el seam de hoy eso no se sostenía, por cinco motivos verificados:

1. **La entrada no encaja.** `TallerRunner.run` recibe el programa y el lenguaje; `POST /api/runs` recibe el id del ejercicio, el borrador y la prueba propia, y rechaza con 422 el lenguaje y el programa (B2 FR-003).
2. **La salida no encaja.** `interpretRun` lee la salida cruda con `^__TALLER_TEST__(\w+):(PASS|FAIL)\s*$`, y las marcas del servidor llevan el nonce (`__TALLER_TEST__<nonce>:t1:PASS`): sobre una salida de la plantilla nueva, esa expresión da 0 coincidencias (medido al especificar). Los veredictos tienen que venir de `tests` de la ejecución.
3. **El conteo de intentos está en la orquestación**, no en el adaptador: `attempts` se suma en `runExercise` antes de llamar al transporte.
4. **`sanitizeResult` descartaría el `attemptId`** al recargar y al importar, porque arma un conjunto fijo de campos.
5. **La espera, los avisos y la vista previa son interfaz:** la fila, la demora, las cuotas y la plantilla del servidor no existen con los Playgrounds.

El puerto de F7 resuelve los tres primeros; el cuarto y el quinto quedan en A4.

**Lo que F7 decidió sobre los supuestos de A4.** Esta spec le pedía a F7 nueve supuestos (F7-S1 a F7-S9). La spec de F7 (021, rama `spec/f7-laboratorio`) los adoptó con los matices de su tabla, y el usuario decidió el F7-S5 con la Q2 de F7. Ya no son supuestos: son el contrato que A4 recibe de F7a.

| # | Lo que A4 suponía | Lo que decidió F7 | Lo que hace A4 |
| --- | --- | --- | --- |
| F7-S1 | El transporte es un puerto inyectable, y nadie lee `window.TallerRunner` | Se adopta (FR-044 y FR-012 de F7): el puerto llega desde la raíz de composición, que en F7a es `lab.js` y en F7b el adaptador de `app/legacy` | Cablea su adaptador en esa raíz, sin tocar la orquestación |
| F7-S2 | La entrada es el ejercicio, el borrador, la prueba propia normalizada y la señal, nunca el programa | Se adopta (FR-045): el adaptador de los Playgrounds arma el programa adentro | Manda esa entrada a `POST /api/runs` (FR-001) |
| F7-S3 | La salida es un veredicto, no la salida cruda | Se adopta (FR-046 y FR-052): la feature agrega `code`, `customTest` y `time`, arma el `result` en un solo lugar, también el de una falla de transporte, y recorta una sola vez | Su adaptador da el veredicto de la tabla de «Del resultado del servidor a lo que ve el alumno», con la salida sin evidencia, la explicación y el `attemptId` |
| F7-S4 | Contar o no `attempts` lo decide el adaptador | Se adopta con un matiz (FR-047): el adaptador lo declara antes de ejecutar | Su adaptador declara que no suma (FR-021) |
| F7-S5 | La feature expone los estados de la espera y la cancelación | Q2 de F7: un canal de progreso y la cancelación, con los estados de hoy en una unión ampliable (FR-048) | Suma a la unión sus estados (en la fila, esperando turno y la demora) y sus textos a la revisión, sin cambiar la orquestación ni el puerto (FR-036) |
| F7-S6 | La vista previa recibe el arnés por parámetro | Se adopta y se extiende a «Copiar programa completo» (FR-051): el constructor del programa llega desde `app` | Cambia ese constructor por el de la plantilla del servidor (FR-026 y FR-030) |
| F7-S7 | `sanitizeResult` sigue en `entities/exercise` y es el único normalizador del `result` v1 | Se adopta: ya es un hecho (FR-052) | Le suma `attemptId` en ese lugar (FR-040) |
| F7-S8 | E2E con un doble de red del compilador y un Page Object para la revisión | Se adopta (FR-060): `qa/e2e/fixtures/compiler-double.ts` y `qa/e2e/pages/lab.ts`, que F7 amplía | Cambia el doble a `/api/runs` y reutiliza el Page Object (FR-042) |
| F7-S9 | F7 retira `register-runner.ts` si nadie lo lee | Se adopta en F7a (FR-012), que además re-apunta `runner-check` a `shared/api/playground`; F7b retira también `register-editor.ts` | Retira el cliente de Playgrounds y `runner-check` (FR-031 y FR-044) |

**Qué le queda a A4 después de F7a.** El adaptador de `/api/runs` y su cableado; `attemptId` en `sanitizeResult`; sus estados en el canal y sus textos en la revisión; el constructor de la vista previa con la plantilla del servidor; el doble de red de `/api/runs` sobre el Page Object; y el retiro del cliente de Playgrounds, de `runner-check`, de `buildProgram` y de `interpretRun`. La orquestación no cambia.

## Qué se puede planificar antes de F7a

**Antes de F7a.** Dependen sólo de contratos entregados (B2, C3a y D1b) y de la forma v1 del progreso, que no cambia:

1. El campo `attemptId` de la ejecución (Q1), con sus pruebas de Pest.
2. El cliente de `/api/runs`: el envío con su clave, la consulta con su calendario y sus topes, la cancelación, el reintento del envío y el reparto de errores. Recibe la sesión (la cuenta y el token) por parámetro.
3. El veredicto que arma el adaptador a partir de una ejecución terminada (la tabla de «Del resultado del servidor a lo que ve el alumno») y su invariante con `hasPassingEvidence`.
4. El renderizador de la plantilla para la vista previa, contra el fixture compartido.
5. `sanitizeResult` con `attemptId`.
6. El doble de `/api/runs` para Playwright y la guarda de `/api/` sin doble, sobre el doble de la API que trae F11a (F11-Q1).
7. La CSP sin los Playgrounds y la redacción de los textos nuevos.

**Con F7a.** Dependen del puerto y del canal que trae F7a, no de F7b (P2; C4 del coordinador):

8. El adaptador de `/api/runs`, que declara que no suma `attempts` y traduce la señal de cancelación del puerto en `POST /api/runs/{id}/cancel` (FR-007 y FR-008), y su cableado en la raíz de composición.
9. Los estados de A4 en la unión del canal (Q2 de F7) y sus textos, en la vista vigente cuando A4 entra (C4 del coordinador): la revisión de `lab.js`, que desde F7a se suscribe al estado de la feature, si F7b todavía no entró, y entonces F7b los porta como comportamiento vigente, con sus E2E; o la página React, si F7b ya entró. La misma regla vale para los puntos 10 y 11.
10. El constructor de la vista previa y de «Copiar programa completo» con la plantilla del servidor (FR-051 de F7), y el número de intentos en la revisión.
11. El cambio de los E2E del laboratorio al doble nuevo, sobre el Page Object de F7.
12. El retiro del cliente de Playgrounds, de `runner-check` (que F7a re-apunta), de `buildProgram` y de `interpretRun`.

**Planificar no es implementar.** Implementar los puntos 2 a 6 antes de F7a dejaría módulos sin quien los use (constitución, principio V). El punto 1 sí puede adelantarse si el usuario quiere, porque es aditivo y lo prueba Pest.

**Partición.** La spec tiene 48 requisitos, por debajo de los 52 de C3a, así que no se parte. Si el plan crece, el corte natural es la frontera de F7a: A4a (los puntos 1 a 7) y A4b (del 8 al 12), con el costo de entregar A4a sin consumidor hasta A4b.

## Del resultado del servidor a lo que ve el alumno

El `result` v1 conserva sus campos (`code`, `success`, `stdout`, `stderr`, `transportError`, `tests`, `time`, `customTest` y `customPassed`) y suma `attemptId`. Esta tabla fija cómo se arma desde la ejecución terminada o desde la respuesta del servidor, y qué ve el alumno. Con el puerto de F7a, el adaptador de A4 da el veredicto (si se ejecutó o el mensaje de la falla, si compiló y terminó bien, las salidas, las pruebas y el `attemptId`) y la feature arma el `result` en un solo lugar, con los recortes una sola vez (F7-S3). «Los veredictos» son los de `tests` de la ejecución (FR-016). Las explicaciones nuevas viajan en la salida de error (FR-018), y sus textos están en «Textos que cambian».

| Lo que responde el servidor | `success` | Pruebas aprobadas | `transportError` | `attemptId` | Lo que ve el alumno: título y explicación | ¿Cuenta como intento en el servidor? |
| --- | --- | --- | --- | --- | --- | --- |
| `passed` | sí | todas (los veredictos) | no | sí | «La idea funciona en estos casos.» y el `review.success` del ejercicio, como hoy | Sí |
| `failed` sin motivo | sí | las de los veredictos | no | sí | «N de M: encontramos algo para explorar.» y el porqué de la primera prueba que falló, como hoy | Sí |
| `failed` con `output_limit` | no | las de los veredictos | no | sí | «El programa nos dejó una pista.» y la explicación de la salida recortada | Sí |
| `failed` con `evidence_invalid` | no | las de los veredictos | no | sí | «El programa nos dejó una pista.» y la explicación de la evidencia inválida | Sí |
| `compile_error` sin motivo | no | ninguna | no | sí | «El programa nos dejó una pista.» y el diagnóstico de la salida de error, como hoy | Sí |
| `compile_error` con `oom` | no | ninguna | no | sí | «El programa nos dejó una pista.» y la explicación de la memoria al compilar | Sí |
| `runtime_error` sin motivo o con `signal` | no | ninguna | no | sí | «El programa nos dejó una pista.» y el diagnóstico de la salida de error (un pánico, por ejemplo), como hoy | Sí |
| `runtime_error` con `oom` o `pids_limit` | no | ninguna | no | sí | «El programa nos dejó una pista.» y la explicación de la memoria o de los hilos | Sí |
| `timeout` | no | ninguna | no | sí | «El programa nos dejó una pista.» y la explicación del tiempo límite (hoy era «No pude ejecutar esta vez.» a los 60 s) | Sí |
| `infra_error`, con cualquier motivo | no | ninguna | sí | sí | «No pude ejecutar esta vez.» y la explicación de la falla del taller | No |
| `canceled` por el alumno | — | — | — | — | No se guarda resultado: «Ejecución cancelada. Tu código sigue guardado.», como hoy | No |
| `canceled` con `account_disabled` | no | ninguna | sí | sí | «No pude ejecutar esta vez.» y el mensaje de cuenta deshabilitada de C3a | No |
| Un rechazo (422, 429, 503, 401, 403, 409, 419 o 413), después de la espera de turno de FR-010 si corresponde; una red caída o una respuesta ilegible | no | ninguna | sí | no | «No pude ejecutar esta vez.» y el mensaje de cada caso (FR-011, FR-012 y FR-037) | No se crea ejecución |

**El invariante** (FR-015): `hasPassingEvidence` da verdadero si y sólo si el estado es `passed`. Por eso `failed` con `output_limit` o `evidence_invalid` va con `success` falso: con una marca ajena o un centinela repetido la evidencia queda incompleta aunque las tres pruebas esperadas tengan su marca `PASS` (contrato de B2, «La clasificación», filas 9 y 10), y con `success` verdadero el navegador lo aprobaría.

## Textos que cambian

Son propuestas de esta spec, y el clarify no las cambió: el usuario puede corregirlas en el PR del plan. Los mensajes de la API (cuotas, cola, sesión y cuenta) no figuran: se muestran tal como llegan, en español, desde `lang/es` de B2 y C3a (FR-037). Las llaves marcan valores que se completan.

| Dónde | Hoy | Propuesta |
| --- | --- | --- |
| Guía de ejecución, paso «02 · Compilá y comprobá» | «El Playground oficial compila tu programa y ejecuta los tres casos. Cada expresión debe dar `true`. Podés abrir las pruebas antes de resolverlas y agregar un caso propio.» | «El taller compila tu programa en su propio entorno aislado y ejecuta los tres casos. Cada expresión debe dar `true`. Podés abrir las pruebas antes de resolverlas y agregar un caso propio.» |
| Aviso bajo «Ejecutar y revisar» | «Al ejecutar, se envía este código al Playground oficial de {Rust/Go}. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.» (con un enlace al Playground) | «Al ejecutar, tu código viaja al servidor del taller, que lo compila y lo ejecuta en un entorno aislado. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.» (sin enlace) |
| «Ver el programa completo y sus pruebas» | «Este es el código que se enviará al ejecutar. Incluye tu borrador, la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Podés copiarlo y explorar cómo cada condición produce un resultado.» | «Este es el programa que el taller arma con tu borrador al ejecutar. Incluye la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Al ejecutar, cada marca de prueba lleva un código propio de esa ejecución, que acá se muestra con ceros. Podés copiarlo y explorar cómo cada condición produce un resultado.» |
| Aviso de un fallo de transporte (Q2) | «Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas o copiar el programa para probarlo en el Playground.» | «Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas y volver a ejecutar en un rato.» |
| Sin conexión | «No se pudo conectar al Playground. Revisá tu conexión o un posible bloqueo del navegador. Podés seguir leyendo y resolviendo las preguntas sin conexión.» | «No se pudo conectar con el taller. Revisá tu conexión. Podés seguir leyendo y resolviendo las preguntas sin conexión.» |
| El servicio no responde (un 5xx sin el cuerpo de error de la API) | «El Playground no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.» | «El taller no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.» |
| Otro rechazo HTTP sin el cuerpo de error de la API | «El Playground rechazó la solicitud (HTTP {estado}). Revisá el código y volvé a intentar.» | «El taller rechazó la solicitud (HTTP {estado}). Volvé a intentar; si se repite, recargá la página.» |
| Respuesta ilegible | «El Playground devolvió una respuesta que no se pudo leer. Volvé a intentar.» (y las dos de «… devolvió una respuesta inesperada») | «El taller devolvió una respuesta que no se pudo leer. Volvé a intentar.» |
| Código demasiado largo | «Este editor admite programas de hasta 200 KB. Reducí el código antes de volver a ejecutar.» | «El taller admite programas de hasta 64 KB. Reducí el código antes de volver a ejecutar.» |
| Tiempo agotado | «La ejecución superó los 60 segundos. Revisá bucles y bloqueos; también puede haber demoras del servicio.» (un fallo de transporte) | Se retira: el tiempo lo corta el sandbox y se explica como una pista (fila «Tiempo límite»). |
| Revisión, en la fila (Q3) | — | «En la fila del taller: sos el número {N}.» |
| Revisión, esperando turno después de un rechazo (Q3) | — | «Esperando turno para ejecutar: vuelvo a intentar en {N} s.» |
| Revisión, demora (Q3) | — | «Está tardando más de lo habitual. Podés seguir esperando o cancelar; tu código sigue guardado.» |
| Cuándo volver a intentar | — | «Podés volver a ejecutar en {N} s.», «… en {N} min.» o «… a las {HH:MM}.» |
| Sesión vencida | — | «Tu sesión venció: volvé a ingresar para ejecutar. Tu código sigue guardado.» |
| Tiempo límite | — | «La ejecución superó el tiempo límite del taller y se cortó.» Probá esto: «Revisá bucles que no terminan y esperas entre hilos o goroutines que nunca se destraban.» |
| Memoria al ejecutar | — | «El programa usó más memoria de la que el taller permite.» Probá esto: «Buscá estructuras que crecen sin límite o copias grandes que no hacen falta.» |
| Memoria al compilar | — | «La compilación usó más memoria de la que el taller permite.» Probá esto: «Simplificá tipos o macros muy anidados y volvé a ejecutar.» |
| Hilos | — | «El programa lanzó más hilos de los que el taller permite.» Probá esto: «Reducí la cantidad de hilos o goroutines que corren a la vez.» |
| Salida recortada | — | «El programa imprimió más de lo que el taller puede leer, y la salida se cortó antes de las pruebas.» Probá esto: «Quitá impresiones de más (por ejemplo, dentro de un bucle) y volvé a ejecutar.» |
| Evidencia inválida | — | «El programa terminó sin dejar correr todas las pruebas, o imprimió marcas que imitan las del taller.» Probá esto: «Revisá que tu código no termine el programa antes de tiempo (por ejemplo, con `exit`) ni imprima líneas que empiecen como las marcas de las pruebas.» |
| Falla del taller | — | «El taller no pudo ejecutar tu código por una falla propia, no de tu programa. Tu código sigue guardado; volvé a intentar en un momento.» |
| Número de intentos (Q4) | «{N} intento(s). Revisar es parte de aprender.» | «Revisar es parte de aprender.», sin el número hasta D1c |

Siguen igual: «Pruebas reales al ejecutar», «COMPILADOR + CASOS EXPLICADOS», «Probemos tu hipótesis.», «Ejecutando código real…», «Cancelar ejecución», «Ejecución cancelada. Tu código sigue guardado.», «Escribí una solución o restaurá el inicio.», «No pude ejecutar esta vez.» y el alcance de las pruebas («Son comprobaciones de comportamiento dentro de un programa generado por el taller…»).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ejecutar mi código y ver el resultado, ahora en el sandbox del taller (Priority: P1)

El alumno escribe su solución, pulsa «Ejecutar y revisar» y ve el mismo revisor de hoy: qué pruebas pasaron, por qué y la salida del compilador. La compilación es real y ocurre en el sandbox del taller.

**Why this priority**: es el motivo de A4 y lo que el alumno hace en cada ejercicio.

**Independent Test**: los E2E del ciclo con el doble de `/api/runs` (los cuatro resultados, en una misión de campaña y en un núcleo de Sistemas) y la verificación con el stack real de FR-047.

**Acceptance Scenarios**:

1. **Dada** una misión de campaña abierta en «Experimentá», **cuando** el alumno ejecuta y el servidor termina en `passed`, **entonces** la revisión dice «La idea funciona en estos casos.», el aviso dice «+20 XP. Tu progreso de campaña está actualizado.» y la misión muestra «✓ Pruebas · 20», como hoy.
2. **Dado** un resultado `failed` con la prueba `t2` en `fail`, **cuando** llega, **entonces** la revisión dice «2 de 3: encontramos algo para explorar.» con el porqué de `t2`, y la misión no cuenta las pruebas.
3. **Dado** un `compile_error` con el diagnóstico del compilador, **cuando** llega, **entonces** la revisión dice «El programa nos dejó una pista.» con la misma explicación que hoy da ese diagnóstico.
4. **Dado** cualquier resultado, **cuando** el alumno abre «Ver la salida del compilador y del programa», **entonces** ve la salida sin las marcas de prueba ni el centinela.
5. **Dado** un resultado guardado, **cuando** el alumno recarga la página, **entonces** la revisión muestra lo mismo que antes de recargar.
6. **Dado** el stack real con gVisor, **cuando** el alumno ejecuta la solución de referencia de un ejercicio de Rust y la de uno de Go, **entonces** los dos aprueban, y con su código inicial ninguno aprueba.

---

### User Story 2 - Lo que no se pudo ejecutar no aprueba ni se pierde (Priority: P1)

Si la red se corta, el taller falla, la sesión vence o el servidor rechaza el pedido, el alumno lo sabe con un mensaje claro, su código sigue guardado y ninguna prueba se aprueba ni se desaprueba sin ejecutarla.

**Why this priority**: con un servidor propio hay más formas de fallar que con un Playground, y ninguna puede dar un aprobado falso (constitución, principio IV; ADR 0003, punto 7).

**Independent Test**: specs de Vitest con un doble de `fetch` (un caso por estado, motivo y respuesta de error) y E2E de la sesión vencida y de la red caída.

**Acceptance Scenarios**:

1. **Dado** un envío cuya respuesta se pierde por la red, **cuando** el laboratorio lo reintenta con la misma clave, **entonces** el servidor devuelve la misma ejecución y no hay dos; si la red sigue caída, la revisión dice «No pude ejecutar esta vez.» y «No se pudo conectar con el taller…».
2. **Dada** una ejecución que termina `infra_error`, **cuando** llega, **entonces** la revisión dice «No pude ejecutar esta vez.» con la explicación de la falla del taller, y no aprueba.
3. **Dada** una ejecución que termina `timeout`, **cuando** llega, **entonces** la revisión dice «El programa nos dejó una pista.» con la explicación del tiempo límite.
4. **Dado** un `failed` con `evidence_invalid` cuyas tres pruebas esperadas traen `pass`, **cuando** llega, **entonces** el ejercicio no queda resuelto, la campaña no lo cuenta y la revisión muestra la explicación de la evidencia inválida.
5. **Dada** una sesión que vence mientras el laboratorio espera, **cuando** la consulta recibe 401, **entonces** el laboratorio deja de consultar, avisa que la sesión venció y llama a «pedir el ingreso» de F11a, con el código guardado.
6. **Dada** otra cuenta que inició sesión en otra pestaña, **cuando** el alumno ejecuta, **entonces** recibe el aviso de C3a («La sesión cambió de cuenta: recargá la página.») y el laboratorio no reintenta.

---

### User Story 3 - Mi progreso guardado no cambia de forma, y cada ejecución deja el id de su intento (Priority: P1)

El progreso de hoy arranca igual. Cada resultado de una ejecución del servidor guarda el id de su intento, con el que una importación posterior a la cuenta no lo duplica.

**Why this priority**: el progreso no se pierde ni cambia de forma (constitución, principio IV; ADR 0003), y D1c espera a A4 para sincronizar lo resuelto.

**Independent Test**: arrancar con las tres fixtures congeladas; recargar, exportar e importar un resultado con `attemptId`; e importarlo con D1b contra el stack.

**Acceptance Scenarios**:

1. **Dadas** las tres fixtures congeladas de `qa/fixtures/`, **cuando** arranca el taller, **entonces** no escribe, no respalda y no avisa.
2. **Dado** un resultado con `attemptId`, **cuando** el alumno recarga, exporta o importa su progreso, **entonces** el `attemptId` sigue igual.
3. **Dado** un resultado de antes de A4, sin `attemptId`, **cuando** se carga, **entonces** sigue siendo válido y conserva su evidencia.
4. **Dado** un registro con `attempts` en 4, **cuando** el alumno ejecuta en el servidor, **entonces** `attempts` sigue en 4.
5. **Dada** una copia v1 cuyo resultado lleva el `attemptId` de un intento del servidor, **cuando** se importa con `POST /api/progress/import`, **entonces** D1b reutiliza ese intento y no inserta un intento legado para ese resultado.

---

### User Story 4 - Esperar sabiendo qué pasa, y poder cancelar (Priority: P2)

Mientras espera, el alumno sabe si su ejecución está en la fila del taller o corriendo, se entera si tarda más de lo habitual y puede cancelar en cualquier momento.

**Why this priority**: con 4 lugares en el sandbox, un aula entera espera turno (en la medición de B2, el último de 30 cuentas simultáneas terminó a los 9,5 s). No bloquea el resultado, pero cambia cómo se vive la espera (Q3).

**Independent Test**: E2E con un doble que deja la ejecución en la fila, la pasa a corriendo y la termina tarde, y specs de Vitest con relojes simulados.

**Acceptance Scenarios**:

1. **Dada** una ejecución en la fila con `queuePosition` 3, **cuando** el laboratorio la consulta, **entonces** la revisión dice «En la fila del taller: sos el número 3.» y ofrece «Cancelar ejecución».
2. **Dada** una ejecución que pasa a `running`, **cuando** el laboratorio la consulta, **entonces** la revisión dice «Ejecutando código real…».
3. **Dada** una ejecución que no terminó a los 15 s, **cuando** pasa ese tiempo, **entonces** la revisión suma el aviso de demora.
4. **Dada** una ejecución en la fila, **cuando** el alumno cancela, **entonces** el laboratorio pide la cancelación, deja de consultar, no guarda resultado y avisa «Ejecución cancelada. Tu código sigue guardado.».
5. **Dada** una ejecución cancelada mientras corría, **cuando** el alumno vuelve a ejecutar enseguida y el servidor responde `quota_exceeded` con `quota: active` y `Retry-After: 3`, **entonces** la revisión dice que espera turno y en cuántos segundos vuelve a intentar (nunca menos de 3), y el laboratorio reenvía el mismo pedido (Q3).
6. **Dada** una ejecución en curso, **cuando** el alumno abre otro ejercicio, **entonces** el laboratorio pide la cancelación y no guarda resultado, como hoy aborta el pedido.
7. **Dado** un lector de pantalla, **cuando** el lugar en la fila baja de 3 a 1 y la ejecución empieza a correr, **entonces** se anuncian la entrada a la fila y el paso a ejecutando, no cada lugar.

---

### User Story 5 - Las cuotas del taller, con aviso claro (Priority: P2)

Si el alumno ejecuta demasiado seguido, o llega a su límite del día, el taller se lo dice con el mensaje del servidor y cuándo puede volver a ejecutar.

**Why this priority**: las cuotas protegen el sandbox para todos (B2), y un rechazo sin explicación parecería una falla.

**Independent Test**: E2E y specs de Vitest con respuestas 429 de cada tipo de cuota.

**Acceptance Scenarios**:

1. **Dado** un 429 `quota_exceeded` con `quota: per_minute` y `Retry-After: 40`, **cuando** llega, **entonces** la revisión muestra «Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.» y «Podés volver a ejecutar en 40 s.», sin reintentar solo.
2. **Dado** un 429 con `quota: per_day` y un `Retry-After` de horas, **cuando** llega, **entonces** la revisión muestra el mensaje del servidor y la hora en que puede volver a ejecutar.
3. **Dado** un 503 `queue_full`, **cuando** llega, **entonces** el laboratorio espera el `Retry-After` y reenvía el mismo pedido hasta el tope (Q3); vencido el tope, muestra «El taller está ocupado ahora mismo: reintentá en unos segundos.».
4. **Dado** cualquier rechazo, **cuando** el alumno lo ve, **entonces** su código sigue guardado y el contador v1 no cambió.

---

### User Story 6 - La vista previa muestra el programa que corre en el servidor (Priority: P2)

El alumno abre «Ver el programa completo y sus pruebas» y ve el mismo programa que el taller arma en el servidor, así que los números de línea del compilador coinciden.

**Why this priority**: la vista previa sólo sirve si es el mismo texto (ADR 0005 §4; B2 FR-036). No bloquea la ejecución.

**Independent Test**: una spec de Vitest que recorre los 11 casos del fixture compartido, y un E2E que abre la vista previa con la plantilla del doble.

**Acceptance Scenarios**:

1. **Dados** los 11 casos de `qa/fixtures/shared/harness-cases.json`, **cuando** el renderizador del navegador arma cada programa con el nonce del fixture, **entonces** el texto es el esperado, línea por línea.
2. **Dado** un error de compilación en la línea 4 del programa del servidor, **cuando** el alumno abre la vista previa, **entonces** la línea 4 de la vista previa es la misma línea del programa.
3. **Dada** una prueba propia con espacios, tabuladores o un espacio de no separación en los extremos, **cuando** se arma la vista previa y se envía, **entonces** las dos llevan el mismo texto normalizado, y el programa del servidor es el de la vista previa salvo el nonce.
4. **Dado** un laboratorio que todavía no tiene la plantilla, **cuando** el alumno abre la vista previa, **entonces** la sección dice que no está disponible, y ejecutar sigue funcionando.

---

### User Story 7 - Sin Playgrounds: ni pedidos, ni CSP, ni textos (Priority: P3)

El taller deja de depender de los Playgrounds públicos: el navegador no les manda nada, la CSP no los nombra y ningún texto los menciona (Q2).

**Why this priority**: lo decidió el ADR 0005; la ejecución ya funciona sin esto, pero la dependencia y la superficie de la CSP quedan abiertas.

**Independent Test**: la red estricta de los E2E (0 pedidos a hosts públicos), una búsqueda de los dos hosts en `dist/index.html` y en la configuración de Nginx, y los textos.

**Acceptance Scenarios**:

1. **Dada** la red E2E completa, **cuando** corre, **entonces** no hay ningún pedido a `play.rust-lang.org` ni a `play.golang.org`.
2. **Dado** el build, **cuando** se busca cada host en `dist/index.html`, **entonces** no aparece.
3. **Dada** la CSP que sirve Nginx, **cuando** se lee `connect-src`, **entonces** es `'self'`.
4. **Dados** la guía de ejecución, el aviso bajo «Ejecutar y revisar», la vista previa y el aviso de fallo, **cuando** el alumno los lee, **entonces** hablan del taller y no del Playground.

---

### User Story 8 - Quien mantiene el taller sigue protegido por la red (Priority: P3)

La red E2E y los checks de `qa/` siguen fijando el comportamiento: los que simulaban los Playgrounds simulan ahora la API, con los mismos escenarios y valores esperados, y lo que se retira deja escrito qué lo reemplaza.

**Why this priority**: sin esto el cambio de transporte deja agujeros en la red, aunque no cambie lo que ve el alumno.

**Independent Test**: la red E2E y `npm test` en verde, con la lista de lo editado y de lo retirado en el PR.

**Acceptance Scenarios**:

1. **Dados** los 8 escenarios de `cycle.spec.ts`, **cuando** corren con el doble de `/api/runs`, **entonces** dan los mismos títulos y detalles que con el doble de los Playgrounds, salvo el detalle del fallo de transporte.
2. **Dado** un pedido del mismo origen a `/api/` sin respuesta simulada, **cuando** ocurre en una prueba, **entonces** la prueba falla.
3. **Dado** el retiro de `runner-check`, **cuando** se revisa el PR, **entonces** cada uno de sus 12 escenarios tiene su reemplazo en las specs de Vitest del cliente nuevo o su motivo para retirarse.

---

### Edge Cases

- **Doble clic o Ctrl/⌘ + Enter dos veces:** una sola ejecución. El botón se deshabilita con la primera, como hoy, y una clave nueva sólo sale con un clic sin ejecución en curso.
- **Una respuesta del envío que se pierde** después de que el servidor lo aceptó: el reintento con la misma clave recibe 200 con la misma ejecución (B2 FR-006); nunca hay dos.
- **Recargar o cerrar la pestaña con una ejecución en curso:** la ejecución sigue en el servidor, deja su intento y, si aprueba, el servidor la cuenta. El navegador no guarda ese resultado, como hoy se pierde, y la próxima ejecución puede esperar turno por la cuota de una activa. Hasta D1c, lo local y el servidor difieren en ese ejercicio.
- **Dos pestañas o dos dispositivos:** la segunda ejecución choca con la cuota de una activa y espera turno (Q3).
- **Cancelar una ejecución que corre:** el servidor acepta (202) y el sandbox termina igual, hasta unos 30 s (B2, Riesgos, 4); la ejecución termina `canceled` y no toca el progreso del servidor.
- **«Borrar todo» con una ejecución en curso:** el laboratorio pide la cancelación y no guarda nada, como hoy aborta. La época del servidor sólo cambia con el reset de D1b.
- **Un ejercicio que el servidor retiró** (un import de contenido en el medio): el envío recibe 422 con `errors.exerciseId`, y la revisión muestra el mensaje y sugiere recargar.
- **Un import de contenido entre la vista previa y la ejecución:** el servidor usa su plantilla y sus pruebas vigentes; en ese caso raro, los números de línea pueden diferir de la vista previa ya abierta.
- **La consulta recibe 404:** la ejecución ya no es de esta sesión (otra cuenta) o se podó; se muestra como no ejecutada.
- **Una prueba propia que no compila:** falla la compilación de todo el programa (`compile_error`), como hoy.
- **Un código de más de 64 KiB:** el laboratorio no envía nada y avisa. Con el editor acotado a 30.000 caracteres sólo pasa con muchos caracteres de varios bytes.
- **La salida con bytes inválidos:** llega con U+FFFD (la repara el ejecutor) y se muestra así.
- **El tiempo real de Go:** un `time.Sleep` tarda lo que dice, no lo que simulaba el Playground; la auditoría de B3, que va antes que A4 (Q5), confirma que ninguna solución pasa el tiempo límite.
- **Una pestaña abierta con la versión anterior** lee un `result` con `attemptId`, que no conoce: lo descarta, respalda la copia y avisa (ADR 0003, punto 4), sin perder lo demás.
- **La cuenta deshabilitada mientras espera:** la ejecución termina `canceled` con `account_disabled` (C3b y B2 FR-050), y la revisión muestra el mensaje de cuenta deshabilitada.
- **La sincronización de campaña o de Sistemas falla después de aprobar:** el aviso de hoy («No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.»), y el resultado no se reinterpreta (ADR 0003, punto 8).
- **Un contexto no seguro:** la clave de cada envío se genera en el navegador; el taller se sirve en `localhost` y, con C4, en HTTPS (Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Envío y espera**

- **FR-001**: Al ejecutar, el laboratorio DEBE pedir la ejecución con `POST /api/runs` y mandar sólo el id del ejercicio, el borrador tal cual (sin recortar ni normalizar) y la prueba propia normalizada (FR-028), nunca el lenguaje, las pruebas ni el programa (B2 FR-003). Cada clic en «Ejecutar y revisar», o Ctrl/⌘ + Enter, sin una ejecución en curso DEBE generar un `clientRunId` nuevo (UUID).
- **FR-002**: Antes de enviar, el laboratorio DEBE rechazar sin pedir nada un borrador vacío o de sólo espacios, con el aviso de hoy («Escribí una solución o restaurá el inicio.»), y uno de más de 64 KiB contados en bytes, con el aviso de «Textos que cambian». La prueba propia ya la acota el editor a 3.000 caracteres.
- **FR-003**: Si el envío no recibe respuesta (la red se corta) o recibe un 5xx distinto de `queue_full`, el laboratorio DEBE reintentarlo con el mismo `clientRunId` y el mismo cuerpo, con espera y un tope de intentos que fija el plan, antes de informar el fallo: si el servidor ya lo había aceptado, devuelve la misma ejecución, y nunca crea dos (B2 FR-006).
- **FR-004**: Con la ejecución aceptada (202 o 200), el laboratorio DEBE consultar `GET /api/runs/{id}` hasta un estado final, con una espera entre consultas que crece de 0,3 s a 2 s y se queda en 2 s (ADR 0005 §3). Nunca DEBE haber dos consultas en vuelo para la misma ejecución.
- **FR-005**: Si una consulta falla por la red o recibe un 5xx, el laboratorio DEBE seguir con el mismo calendario, y ante un 429 espera su `Retry-After` antes de la próxima. Si las fallas siguen durante 30 s, deja de consultar y muestra el fallo de conexión, sin aprobar ni desaprobar. La ejecución sigue en el servidor.
- **FR-006**: El laboratorio NO DEBE abandonar por su cuenta una ejecución que el servidor informa en curso antes de los plazos con que B2 garantiza su cierre: 10 minutos en la fila y 140 s corriendo, más el barrido de cada minuto (B2 FR-016 y FR-018). A los 15 s sin terminar muestra el aviso de demora (Q3). Como red de seguridad, a los 12 minutos del envío pide la cancelación y muestra la falla del taller.
- **FR-007**: «Cancelar ejecución» DEBE pedir `POST /api/runs/{id}/cancel`, dejar de consultar, no guardar resultado y avisar «Ejecución cancelada. Tu código sigue guardado.», como hoy.
- **FR-008**: Lo que hoy aborta la ejecución en curso (abrir otro ejercicio, el anterior o el siguiente, volver al mapa, salir del laboratorio y «Borrar todo»; cambiar de fase no aborta, como fija el FR-050 de F7) DEBE pedir también la cancelación al servidor, como mejor esfuerzo, y no guardar resultado. El adaptador traduce la señal de cancelación del puerto en `POST /api/runs/{id}/cancel` (ver «Alternativas consideradas»).
- **FR-009**: Hay a lo sumo una ejecución en curso por laboratorio: mientras dura, «Ejecutar y revisar» está deshabilitado y Ctrl/⌘ + Enter no envía otra, como hoy.
- **FR-010**: *(Q3)* Ante 429 `quota_exceeded` con `quota: active` o 503 `queue_full`, el laboratorio DEBE esperar y reenviar el mismo pedido, con el mismo `clientRunId`, mostrando que espera turno y con «Cancelar ejecución». Cada espera es al menos el `Retry-After`, crece de un reintento al siguiente y lleva una variación al azar, para que un aula no reintente toda a la vez; y los reintentos de un envío quedan por debajo del límite de 30 pedidos por minuto de la cuenta, que cuenta también los rechazados (B2 FR-011). El tope es de 2 minutos; vencido, muestra el mensaje del servidor.
- **FR-011**: Ante las cuotas con ventana (`per_minute`, `per_day` y `sandbox_time`) y ante 429 `too_many_requests`, el laboratorio NO DEBE reintentar solo: muestra el mensaje del servidor y cuándo puede volver a ejecutar, calculado del `Retry-After` (en segundos si falta menos de dos minutos, en minutos si falta menos de dos horas y, si no, la hora). «Ejecutar y revisar» sigue disponible.

**Sesión y cuenta**

- **FR-012**: El envío y la cancelación DEBEN llevar las cabeceras de C3a (`X-XSRF-TOKEN` y `X-Taller-User` con la cuenta de la sesión) y seguir sus reglas ([contrato de C3a](../004-c3-identidad-acceso/contracts/http.md), «Lo que el front tiene que hacer»): 401 llama a «pedir el ingreso» de F11a (que espera y termina con la cuenta), con el código guardado; 419 pide `GET /api/session` y reintenta una vez si la cuenta es la misma; 409 `account_mismatch` muestra el aviso de C3a y no reintenta; 403 `account_disabled` y `email_unverified` muestran su aviso. El laboratorio usa la etapa de sesión que traen F11a y A3 (la cuenta, el token y «pedir el ingreso») y no escribe otra (Assumptions).
- **FR-013**: Una consulta que recibe 401, 403 o 404 DEBE cortar la espera y mostrar la ejecución como no ejecutada (un fallo de transporte), sin aprobar, además de lo que pide FR-012; su intento, si lo hay, queda en el servidor.

**El resultado**

- **FR-014**: Al terminar, el laboratorio DEBE armar el `result` v1 según la tabla de «Del resultado del servidor a lo que ve el alumno»: el estado, el motivo y la respuesta definen `success`, las pruebas aprobadas, `transportError` y la explicación.
- **FR-015**: El `result` v1 DEBE aprobar según `hasPassingEvidence`, la regla única del ADR 0003 (punto 7), si y sólo si el estado es `passed`. Ningún otro estado, motivo, rechazo o error lo aprueba, aunque traiga las pruebas esperadas en `pass`.
- **FR-016**: Las pruebas aprobadas DEBEN salir de `tests` de la ejecución: una prueba del ejercicio queda aprobada sólo con `outcome` `pass` en su clave; `fail`, `missing` o la clave ausente la dejan sin aprobar. La prueba propia queda aprobada sólo con `customTest` en `pass`. Para las ejecuciones del servidor, el laboratorio NO DEBE leer las marcas de la salida.
- **FR-017**: La salida que se guarda y se muestra en «Ver la salida del compilador y del programa» DEBE ser la de la ejecución sin las líneas de evidencia (las marcas con el nonce y el centinela), con los recortes de hoy: 12.000 caracteres para la salida estándar y 18.000 para la de error.
- **FR-018**: La explicación de un motivo del servidor que hoy no tiene equivalente (tiempo límite, memoria, hilos, salida recortada, evidencia inválida y falla del taller) DEBE guardarse con el resultado, dentro de su salida de error, como hoy los mensajes de transporte, para que la revisión la muestre igual después de recargar. El `result` v1 no suma campos para eso: D1b rechaza los desconocidos. Esa explicación tiene prioridad sobre el diagnóstico del compilador, al mostrarla y después de recargar: en la fase de ejecución la salida de error trae también los avisos de compilación, y una regla del diagnóstico (la de sintaxis de Rust, por ejemplo) le ganaría.
- **FR-019**: *(Q1)* El `result` v1 de una ejecución que terminó (todo estado final menos la cancelación del alumno) DEBE llevar `attemptId`, el id del intento del servidor, como entero positivo. Un resultado de transporte (rechazo, red o sesión) no lo lleva.
- **FR-020**: `code` DEBE ser el borrador enviado; `customTest`, la prueba propia normalizada; y `time`, el reloj del navegador al guardar el resultado, como hoy.
- **FR-021**: Una ejecución del servidor NO DEBE sumar `attempts` en el registro v1, y tampoco un rechazo ni un fallo de transporte (ADR 0006 D24): las ejecuciones que cuentan las suma el servidor en `attempt_count`.
- **FR-022**: Lo que hoy pasa al aprobar DEBE seguir igual: `solvedAt` la primera vez, `reviewAt` a un día si no había, el aviso («¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.» o «Estos casos siguen funcionando. Probá una variante.») y la sincronización de campaña y Sistemas (`syncAfterRun`, ADR 0003, punto 8).
- **FR-023**: Un resultado que no aprueba NO DEBE borrar un logro: `solvedAt`, los sellos y la fusión entre pestañas siguen la regla de hoy (ADR 0003, punto 5).

**El contrato de la ejecución (extiende a B2)**

- **FR-024**: *(Q1)* La ejecución que devuelven `GET /api/runs/{id}`, `POST /api/runs` y la cancelación DEBE sumar el campo `attemptId`: `null` mientras está en la fila o corriendo, y el id del intento que dejó el cierre cuando terminó, en todo estado final. Es aditivo: ningún otro campo cambia, sigue respondiendo sólo al dueño y nunca devuelve el programa armado.
- **FR-025**: El cambio de FR-024 DEBE llegar con sus pruebas de Pest contra MySQL real, con valores que salen del contrato: `null` en la fila y corriendo; igual al `attempt_id` de la fila de la ejecución en cada estado final, `canceled` e `infra_error` incluidos; 404 para lo ajeno. La spec de B2 no se edita: A4 la extiende (constitución, principio VIII) y su plan publica el contrato ampliado.

**La vista previa**

- **FR-026**: «Ver el programa completo y sus pruebas» DEBE mostrar el programa armado con la plantilla del servidor (`GET /api/harness`) y la gramática de B2 ([contrato de la plantilla](../005-b2-api-ejecuciones/contracts/harness-template.md)), con un nonce fijo de 32 ceros en lugar del de cada ejecución: con las mismas entradas es el texto que arma el servidor salvo el nonce, que ocupa el mismo largo, así que los números de línea coinciden (B2 FR-036).
- **FR-027**: El renderizador del navegador DEBE reproducir línea por línea los 11 casos del fixture compartido `qa/fixtures/shared/harness-cases.json`, que no se regenera ni se edita.
- **FR-028**: La prueba propia del envío y la de la vista previa DEBEN ser el mismo texto, el que normaliza la feature de F7a antes de llamar al puerto. El renderizador del navegador recorta como el servidor (sólo los espacios, tabuladores y saltos de línea de los extremos, no el espacio de no separación, como fija un caso del fixture), así que sobre ese texto ninguno de los dos recorta nada más; una en blanco no existe.
- **FR-029**: A4 DEBE pedir la plantilla (`GET /api/harness`) cuando el laboratorio la necesita, porque A3 no la pide al arrancar, y revalidarla con `If-None-Match` al abrir el laboratorio. La guarda como porción opcional en la copia del contenido de A3 (su FR-015), con sus reglas, y le llega a la vista previa por parámetro desde `app`: nada por debajo de `app` importa `getContent()` (F2, FR-015). Si nunca se obtuvo, la sección lo dice y «Copiar programa completo» avisa que no está disponible; ejecutar sigue funcionando.
- **FR-030**: «Copiar programa completo» DEBE copiar el programa de la vista previa.

**Los Playgrounds**

- **FR-031**: *(Q2)* El laboratorio NO DEBE hacer pedidos a `play.rust-lang.org` ni a `play.golang.org`. Se retiran el cliente ([`frontend/src/shared/api/playground/`](../../frontend/src/shared/api/playground/)) y su check (`runner-check`), que F7a re-apunta al cliente. `register-runner.ts` y `window.TallerRunner` ya los retira F7a (su FR-012).
- **FR-032**: *(Q2)* La CSP DEBE quitar los dos Playgrounds de `connect-src`, que queda en `'self'`: en [`docker/nginx/nginx.conf`](../../docker/nginx/nginx.conf) o, si C4 ya la movió, en `docker/nginx/headers.conf`. Lo hace el último de los dos en llegar ([spec de C4](../008-c4-exposicion/spec.md)), con los checks de cabeceras de C4 si ya existen.
- **FR-033**: Los textos que nombran el Playground DEBEN cambiar según «Textos que cambian» (Q2).
- **FR-034**: El arnés viejo (`buildProgram`) y la lectura de marcas sin nonce (`interpretRun`) DEBEN retirarse cuando ya no los use nadie. `runtime-check`, que los usa contra los Playgrounds, se retira con ellos: la auditoría de B3, que va antes, lo reemplaza (Q5). `hasPassingEvidence` y `testPassed` se quedan: son la regla del progreso v1.

**Lo que ve el alumno**

- **FR-035**: El laboratorio DEBE seguir presentando la ejecución como compilación real: «Pruebas reales al ejecutar», «COMPILADOR + CASOS EXPLICADOS», «Ejecutando código real…» y el alcance de las pruebas no cambian; los modelos visuales siguen siendo simulaciones, y las misiones de proyecto, revisión manual (constitución, principio IV). Ningún texto que A4 agrega o cambia llama «verificado» al resultado del servidor (B2 y ADR 0006 §12: «ejecutado en el servidor»); el sello «Código verificado» de Sistemas queda como está, y lo decide su port (F5).
- **FR-036**: *(Q3)* Mientras espera, la revisión DEBE mostrar el estado que el adaptador avisa por el canal de progreso de la feature (Q2 de F7): en la fila, con su lugar; ejecutando («Ejecutando código real…»); esperando turno después de un rechazo (FR-010); y, a los 15 s, el aviso de demora. «Cancelar ejecución» está en todos.
- **FR-037**: Un error de la API con el cuerpo `{message, code}` (cuotas, cola, sesión, cuenta, validación o `server_error`) DEBE mostrarse con el mensaje en español que trae (`lang/es` de B2 y C3a) y, si hay `Retry-After`, con cuándo volver a intentar (FR-011). Los demás textos son los de «Textos que cambian».
- **FR-038**: *(Q4)* La línea de intentos de la revisión DEBE dejar de mostrar el número hasta D1c y conservar el resto de la frase.
- **FR-039**: Cada cambio de estado de la espera DEBE anunciarse una vez en la región viva de la revisión, y no en cada consulta ni en cada cambio de lugar en la fila. Ninguna actualización mueve el foco; se puede ejecutar, cancelar y volver a ejecutar sólo con el teclado; no hay animaciones nuevas (el indicador sigue la regla de movimiento reducido de hoy); y los avisos caben en el diseño móvil sin desbordar.

**Compatibilidad**

- **FR-040**: El progreso guardado NO DEBE cambiar de forma salvo por el campo opcional `result.attemptId`. `sanitizeResult` (hoy en `lab.js`; con F2a, en `entities/exercise`) lo conserva si es un entero positivo y lo descarta si no; cargar, importar, exportar y fusionar entre pestañas lo mantienen; un resultado sin él sigue siendo válido. Las tres fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar (ADR 0003).
- **FR-041**: *(Q1)* Un `result` con `attemptId` DEBE poder importarse con `POST /api/progress/import`, que lo acepta como entero positivo y reutiliza ese intento en lugar de insertar uno legado ([contrato de D1b](../007-d1-progreso-sincronizacion/contracts/http-d1b.md), §3.3).
- **FR-042**: Los E2E que hoy simulan los Playgrounds DEBEN pasar a simular `/api/runs` (el envío, la consulta y la cancelación) en un commit propio, con TDD y con la aprobación del usuario. Los 8 de `cycle.spec.ts` conservan sus escenarios y sus textos esperados, salvo el detalle del fallo de transporte y el conteo de pedidos (un envío); los 2 del indicador en `css-contract.spec.ts` conservan su aserción; y la guarda de `guards.spec.ts`, que hoy dispara un pedido a un host público al ejecutar, lo dispara de otro modo. Ese cambio es obligatorio: después de A4, ejecutar sale al mismo origen, el aviso esperado (`ERR_BLOCKED_BY_CLIENT`) nunca llega y la prueba falla por otro motivo, así que su `test.fail` seguiría en verde sin proteger nada. Las 11 son de F1; sus otras 95 pruebas y las 17 de A2 (PR #40) no se editan.
- **FR-043**: Un pedido del mismo origen a `/api/` sin respuesta simulada DEBE hacer fallar el E2E, como hoy un pedido a un host público. Esa guarda llega con el doble de la API de F11a, un fixture automático de los E2E (F11-Q1); si F11a no la trae, la suma A4.
- **FR-044**: Los checks de `qa/` que tocan la ejecución DEBEN adaptarse o retirarse con su motivo: `runner-check` se retira con el cliente de Playgrounds, y su contrato pasa a las specs de Vitest del cliente nuevo; los escenarios de `interpretRun` de `exercise-evidence-check` se retiran con él, y los de `hasPassingEvidence`, `testPassed` y `syncAfterRun` se quedan; la spec o el check que cubra `sanitizeResult` suma `attemptId`; y `runtime-check` se retira con A4 (Q5).
- **FR-045**: La documentación que presenta los Playgrounds como el compilador DEBE cambiar en el mismo cambio: `AGENTS.md` («Los compiladores son los Playgrounds oficiales»), `README.md` («Qué se ejecuta y dónde»), `qa/AGENTS.md`, `docs/architecture.md` y una nota en el ADR 0008 sobre el doble de red. La integra el agente principal.

**Verificación**

- **FR-046**: El cliente de `/api/runs` y el armado del `result` DEBEN probarse con Vitest, con un doble de `fetch`, relojes simulados y valores esperados que salen de los contratos de B2 y C3a: un caso por fila de la tabla de estados y por respuesta de error, el calendario de consulta, los reintentos con la misma clave, la cancelación y los topes. Los E2E de A4 cubren, con el doble de la API, la fila, la demora, la cancelación, la espera de turno, una cuota con ventana, la sesión vencida y la vista previa.
- **FR-047**: Una verificación contra el stack real con gVisor DEBE resolver desde el navegador un ejercicio de Rust y uno de Go con su solución de referencia y fallar con su código inicial, y comprobar que la línea de un error de compilación coincide con la vista previa. Es una verificación manual declarada, con la lista del quickstart del plan (D3, decidido por el usuario el 2026-10-28), porque el ADR 0008 corre Playwright sin API. Antes, la auditoría de B3 DEBE estar en verde: es condición de A4 (Q5; Q3 de B3).
- **FR-048**: A4 NO DEBE agregar dependencias de npm ni de Composer ni estilos en línea (`style=`), y el HTML DEBE quedar bajo el tope que fija A2.

### Key Entities *(include if feature involves data)*

- **Envío:** un pedido de ejecución desde el laboratorio, con su `clientRunId`. Cada clic genera uno, y los reintentos de ese pedido usan el mismo.
- **Ejecución del servidor:** lo que devuelve `/api/runs`: el id opaco, el estado, el motivo, el lugar en la fila, las salidas, los veredictos y, con A4, el id de su intento (Q1).
- **Intento del servidor:** el registro permanente que deja cada ejecución terminada (B2). Su id es el `attemptId` que guarda el `result` y que D1b usa para no duplicar.
- **Resultado del laboratorio (`result` v1):** el último resultado de un ejercicio en el progreso del navegador. Conserva sus campos de hoy, suma `attemptId` y lo lee `hasPassingEvidence`.
- **Estado de la espera:** enviado, en la fila (con su lugar), ejecutando, esperando turno, con demora o terminado. Viaja por el canal de progreso de la feature, cuya unión amplía A4; vive en memoria y no se guarda.
- **Plantilla del arnés:** el texto por lenguaje con el que el servidor arma el programa y el navegador, la vista previa.
- **Marca de prueba y centinela:** las líneas de evidencia, con el nonce de cada ejecución. El servidor las lee; el navegador las saca de la salida que muestra.
- **Puerto de transporte de `features/run-exercise`:** la interfaz que trae F7a y cuyo adaptador cambia A4: la entrada, el veredicto, la política de intentos y el canal de progreso (lo que F7 decidió sobre F7-S1 a F7-S9).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el doble de `/api/runs`, los 8 escenarios del ciclo (los cuatro resultados, en una misión de campaña y en un núcleo de Sistemas) muestran el mismo título y el mismo detalle que hoy en 6 de 8; en los 2 de fallo de transporte, el mismo título con el detalle nuevo. Campaña y Sistemas cuentan sólo el aprobado.
- **SC-002**: Ningún resultado distinto de `passed` aprueba: en la batería de Vitest, con cada estado final, cada motivo que puede acompañarlo y cada respuesta de rechazo o de error, `hasPassingEvidence` da falso en el 100 % de los casos salvo `passed`, y verdadero con `passed`. La batería incluye el `failed` con `evidence_invalid` y las tres pruebas en `pass`.
- **SC-003**: *(Q2)* Hay 0 pedidos a `play.rust-lang.org` y a `play.golang.org` en toda la red E2E, y 0 apariciones de los dos hosts en `dist/index.html` y en la CSP.
- **SC-004**: Las tres fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar. Un `attemptId` sobrevive igual a recargar, exportar e importar. Contra el stack, importar con D1b una copia v1 cuyo resultado lleva el `attemptId` de un intento del servidor deja 0 intentos legados nuevos para ese resultado.
- **SC-005**: El renderizador del navegador reproduce los 11 casos del fixture compartido con 0 diferencias.
- **SC-006**: Con el stack real y gVisor, desde el navegador, la solución de referencia de un ejercicio de Rust y la de uno de Go llegan a «La idea funciona en estos casos.» y su código inicial no; la línea de un error de compilación coincide con la vista previa.
- **SC-007**: Con relojes simulados, entre dos consultas de una ejecución nunca pasan menos de 0,3 s ni más de 2 s mientras no hay error, y nunca hay dos en vuelo. Medición, sin objetivo previo: con 30 clientes que ejecutan a la vez contra el stack, se informan las respuestas 429 de Nginx y el tiempo hasta el resultado del último.
- **SC-008**: Cada clic deja a lo sumo una ejecución en el servidor, también cuando el envío se reintenta por una red caída: 0 ejecuciones duplicadas en la batería de reintentos.
- **SC-009**: Con el teclado se ejecuta (con el botón y con Ctrl/⌘ + Enter), se cancela y se vuelve a ejecutar; la región viva anuncia cada cambio de estado una sola vez; con movimiento reducido no hay animación nueva; y a 590 px de ancho los avisos nuevos no desbordan.
- **SC-010**: Pasan `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` (95 de F1 y 17 de A2 sin editar, 11 de F1 con el doble nuevo y las de A4), `npm run api:test`, `npm run api:analyse`, `npm run api:format:check` y `git diff --check`; el HTML queda bajo el tope de A2 y no hay dependencias nuevas.

## Riesgos

1. **El puerto de F7a cambia en su plan.** La spec de F7 adoptó F7-S1 a F7-S9, pero el plan fija los nombres y los tipos. *Mitigación:* el contrato está en los requisitos de F7 (FR-044 a FR-052), y la tabla de «El seam de hoy y lo que F7 decidió» dice qué hace A4 con cada uno.
2. **La evidencia es autodeclarada** (ADR 0005 §5). Un código que lee el nonce de su binario puede imprimir marcas válidas, y el servidor lo acepta. *Mitigación:* el navegador muestra lo que decide el servidor, no lo llama «verificado», y los logros siguen la regla de siempre.
3. **La capacidad en un aula.** Con 4 lugares en el sandbox, un aula espera turno. *Mitigación:* la fila visible y la espera de turno (Q3), las cuotas de B2 y su medición (mediana de 1,1 s en reposo; el último de 30, a los 9,5 s).
4. **El costo de consultar.** Cada consulta es un pedido PHP que escribe la sesión (ADR 0006 §12), y el límite de Nginx es de 50 pedidos por segundo por IP, con una ráfaga de 400. *Mitigación:* el calendario de 0,3 a 2 s y la medición de SC-007.
5. **Recargar con una ejecución en curso** deja el resultado en el servidor y no en el navegador. *Mitigación:* es lo de hoy (el resultado se pierde), y D1c lo resuelve al sincronizar.
6. **La plantilla cambia entre la vista previa y la ejecución** si hay un import en el medio. *Mitigación:* revalidarla al abrir el laboratorio; el caso es raro y no afecta el veredicto.
7. **El sandbox no es el Playground:** el tiempo real de Go, el límite de hilos de gVisor y los paquetes de la caché. *Mitigación:* la auditoría de B3 va antes que A4 y es su condición (Q5).
8. **A3 y F11a todavía no están implementadas.** La etapa de sesión, «pedir el ingreso» y el doble de la API son contratos de sus specs, y sus planes fijan la forma. *Mitigación:* la tabla de «Relación con otras specs» y los supuestos.
9. **El ADR 0006 sigue en propuesta.** D24 y §10 son la base del id del intento. *Mitigación:* si el usuario lo enmienda, la spec cambia con la enmienda.

## Relación con otras specs

| Spec | Qué toma A4 | Qué le deja o le pide |
| --- | --- | --- |
| [B2](../005-b2-api-ejecuciones/spec.md) (005, entregada) | El [contrato HTTP](../005-b2-api-ejecuciones/contracts/runs-api.md): las tres rutas, los estados, los motivos, las cuotas, los errores y `Retry-After`; la [plantilla y su fixture](../005-b2-api-ejecuciones/contracts/harness-template.md) | Extiende la ejecución con `attemptId` (Q1). B2 registró el riesgo de «un cliente que todavía no existe» (su riesgo 12): A4 es ese cliente |
| [C3a](../004-c3-identidad-acceso/spec.md) (004) | Las cabeceras, el cuerpo de error y las reglas del front ante 401, 403, 409, 419 y 429; la sesión de 30 minutos de inactividad y 8 horas | — |
| [D1](../007-d1-progreso-sincronizacion/spec.md) (007) | D1b acepta `attemptId` y lo usa para no duplicar (R30 y R42); `legacy_attempts` y `attempt_count` van separados | D1c entra en servicio después de A4 (Q4 de D1). Con A4 entregado, lo resuelto en el laboratorio sale del servidor |
| A3 (016, clarificada) | La etapa de sesión que extiende de F11a, la `Content-Version` y la copia del contenido, que admite la plantilla como porción opcional (su FR-015) | A3 no pide la plantilla al arrancar: la pide A4 (FR-029) |
| F11a (015, clarificada) | La etapa de sesión (`GET /api/session` y «pedir el ingreso», R1 y C1 del clarify), y el doble de la API como fixture automático de los E2E (F11-Q1) | La guarda de `/api/` sin doble, si F11a no la trae (FR-043) |
| F7 (021, clarificada) | F7a: `features/run-exercise` con su puerto, su política de intentos y su canal de progreso (Q2 de F7), el constructor de la vista previa por parámetro, el doble del compilador y el Page Object; F7b: la página React | Sus decisiones sobre F7-S1 a F7-S9 (tabla de «El seam de hoy y lo que F7 decidió»). A4 espera a F7a y no a F7b (P2; C4 del coordinador) |
| [F1](../003-f1-red-de-seguridad/spec.md) (003) y [A2](../006-a2-compuerta-arranque/spec.md) (006) | La red E2E (106 y 17 pruebas) | Cambian 11 pruebas (FR-042) |
| [C4](../008-c4-exposicion/spec.md) (008) | La CSP en `nginx.conf` o en `headers.conf` | Los dos Playgrounds salen de `connect-src` (FR-032) |
| B3 (020, clarificada) | La auditoría en el ejecutor local, que va antes que A4 y es su condición (Q5; Q3 de B3) | Con A4 se retira `runtime-check` |
| [F2](../009-f2-seams/spec.md) (009) | `sanitizeResult` y `buildProgram` en `entities/exercise` (F2a); nada por debajo de `app` importa `getContent()` | — |
| [C3b](../010-c3b-admin-ciclo-de-vida/spec.md) (010) | La cuenta deshabilitada cancela las ejecuciones (B2 FR-050) | — |

## Acciones del usuario

Los agentes no las hacen.

| Cuándo | Acción |
| --- | --- |
| Plan | Revisar los textos de «Textos que cambian», que siguen como propuesta: el clarify no los tocó. |
| Implementación | Aprobar el commit que cambia los 11 E2E (FR-042), como pide la hoja de ruta del front. |
| Verificación | Levantar el stack con gVisor y las imágenes del sandbox para FR-047, o autorizar al coordinador a hacerlo. |
| Siempre | Cada descarga pide permiso con nombre, origen y tamaño. A4 no prevé ninguna: no suma dependencias y usa las imágenes que B2 ya tiene. |

## Assumptions

- **B2 entregado** con el contrato de `contracts/runs-api.md` y las cuotas por omisión de su Q1. Las esperas de 3 s y 10 s son su configuración.
- **F11a y A3 dejan** la etapa de sesión con la cuenta, el token y «pedir el ingreso», y F11a el doble de la API para los E2E. Si no dejan un cliente reutilizable para los pedidos que modifican (las cabeceras de C3a, el reintento del 419 y el 409 sin reintento), A4 aplica esas reglas en un módulo compartido y no las copia.
- **F7a llega antes que A4** con lo que decidió su spec sobre F7-S1 a F7-S9. F7b puede llegar antes o después, y A4 no la espera (C4 del coordinador; ver «Qué se puede planificar antes de F7a»).
- **B3 está entregada** antes de A4, con su auditoría en verde (Q5).
- **F2a y F2b están integradas:** `sanitizeResult` y `buildProgram` viven en `entities/exercise`.
- **Un contexto seguro:** el taller se sirve en `localhost` y, con C4, en HTTPS, donde el navegador genera la clave de cada envío.
- **Los valores con número** (15 s de demora, 30 s de fallas de consulta, 2 minutos de espera de turno y 12 minutos de red de seguridad) son propuestas de esta spec; el plan los confirma con las mediciones de B2 (su SC-012).
- **Los textos son propuestas,** en español rioplatense y con voseo; los mensajes de la API salen de `lang/es`.
- **El ADR 0006 sigue en propuesta,** con B2 y D1 implementados con el permiso del usuario.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q5 están en «Clarifications», con las descartadas.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se espera el resultado | Consultar con espera creciente; SSE o Reverb; una conexión larga | Consultar de 0,3 a 2 s (ADR 0005 §3). SSE o Reverb llegan por el camino de escala del ADR 0006 §9, si la consulta supera el 30 % de los pedidos |
| Qué pasa al salir de un ejercicio con una ejecución en curso | Cancelarla, como hoy aborta; seguir esperando en segundo plano y guardar el resultado en su ejercicio; recordarla y retomarla al volver | Cancelarla. Es lo de hoy, y la espera para ejecutar otra vez es la misma en las tres (la cuota de una activa); las otras dos suman estados que viven fuera de la vista |
| Un tope propio en el navegador | 60 s, como hoy; seguir hasta el cierre que garantiza el servidor | Seguir, con aviso de demora y red de seguridad: un tope menor abandonaría ejecuciones que después aprueban en el servidor |
| De dónde salen los veredictos | Leer las marcas de la salida en el navegador; los veredictos del servidor | Los del servidor: el navegador no conoce el nonce, e `interpretRun` no lee las marcas nuevas |
| `failed` con evidencia inválida o salida recortada | `success` verdadero, que muestra «N de M»; falso, con su explicación | Falso: con una marca ajena puede traer las tres pruebas en `pass`, y verdadero lo aprobaría en el navegador |
| Cómo viaja la explicación de un motivo del servidor | Un campo nuevo en el `result` v1; la salida de error, como los mensajes de transporte | La salida de error: D1b rechaza los campos desconocidos, y la revisión ya muestra ahí los mensajes |
| Los mensajes de cuota y de sesión | Textos propios del front; el `message` de la API | El de la API, con el `Retry-After` traducido a cuándo volver: una sola fuente de los textos |
| La vista previa | El arnés de `buildProgram`; la plantilla del servidor con un nonce fijo | La plantilla (ADR 0005 §4; B2 FR-036): los números de línea coinciden |
| Dónde se prueba contra el sandbox real | Sólo con dobles; un proyecto de Playwright contra el stack; una verificación manual | Dobles para la red y una verificación contra el stack (FR-047), que define el plan: el ADR 0008 corre Playwright sin API |
