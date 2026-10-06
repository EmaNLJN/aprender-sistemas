# Hoja de ruta: Port del front legacy a React

Épico que lleva las seis vistas legacy del taller (`frontend/app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js`) a React con TypeScript, una vista por PR y sin que el alumno note el cambio: se conservan el aspecto, el comportamiento, el progreso guardado, los IDs y las URLs.

- **Fuente técnica:** el [mapa del front legacy](legacy-map.md), con lo que hace cada vista, sus globals, su DOM, sus URLs, su persistencia y sus puntos calientes; el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), aceptado el 2026-10-05; los [ADR 0001](../../docs/adr/0001-react-vite-y-backend-diferido.md), [0003](../../docs/adr/0003-integridad-del-progreso.md) y [0007](../../docs/adr/0007-organizacion-del-repositorio.md); [`docs/architecture.md`](../../docs/architecture.md) y [`docs/refactor-roadmap.md`](../../docs/refactor-roadmap.md).
- **Camino decidido por el usuario (2026-10-05):** red y seams primero; después las vistas una por una, las hojas primero y cada raíz de React dentro del shell legacy; el shell y el router al final, con una sola raíz. A2 va temprano. Quedan descartados el shell primero y la reescritura en paralelo.
- **Corre en paralelo con** la [hoja de ruta del backend](../backend-multiusuario/roadmap.md), que sigue con C3 y C6. El usuario partió C3 en C3a (identidad y acceso, la spec 004, sin Fortify por decisión suya del 2026-10-05) y C3b (correo y administración, sin spec). Los ítems A2, A3, A4, C3a y C3b pertenecen a esa hoja de ruta y se referencian acá; no se duplican.
- **Flujo:** Spec Kit, con la [constitución](../../.specify/memory/constitution.md) como compuerta de cada plan.

## Vocabulario

- **Port:** pasar una vista de JavaScript legacy a React sin cambiar lo que el alumno ve ni lo que guarda.
- **Red:** las pruebas que fijan el comportamiento actual antes de tocar el código: E2E en un navegador real y specs de Vitest.
- **Seam:** el módulo con nombre y contrato que reemplaza una lectura de `window` o un acoplamiento entre vistas, de modo que se pueda cambiar un lado sin editar el otro.
- **Puente:** el contrato de HTML, URL o datos por el que una vista legacy usa a otra (mapa, §3.2).
- **Adaptador mínimo:** lo que sigue publicado en `window.Taller*` (o en `frontend/src/app/legacy/`) mientras una vista legacy lo consuma, con sólo esos métodos.
- **Raíz:** una raíz de React (`createRoot`) que monta una vista o, al final, todo el shell.

## Convenciones

- **IDs estables:** F1…F13 no se renumeran ni se reutilizan. Un ítem nuevo recibe un ID nuevo. F11 y F12 existen porque ninguna hoja de ruta asignaba las pantallas de cuenta ni las de administración, y F13 es una propuesta de la spec de D1 (ver «Superficies que pide D1»). Ninguno sigue el orden de ejecución: F11 corre en el tramo 2 y F12 y F13 aparte.
- **Una spec por ítem,** en `specs/NNN-<id>-<nombre>/` (`NNN` es el orden de creación de Spec Kit, compartido con el backend). La línea `Input` de cada spec nombra el ID de su ítem; esta tabla enlaza la spec de vuelta.
- **Estados:** `Pendiente` (sin spec), `En especificación` (spec redactada, con preguntas abiertas o sin plan), `Planificado` (plan, tareas y análisis hechos), `En curso`, `Entregado`.
- **Entregado** exige la implementación integrada y la evidencia de QA: PR, commit y qué se ejecutó. Si algo quedó sin verificar, se escribe.
- **Persistencia flow-forward** (constitución, principio VIII): al entregar, el directorio de la feature queda inmutable. Un cambio sustancial es una spec nueva, enlazada a la original. Los bugs van a `.specify/bugs/<slug>/`.
- **Un PR por vista,** que se puede revertir entero y devuelve la vista legacy. Un port no mezcla seams ni cambios de comportamiento. Lo que cambia el comportamiento va en su propio commit, con TDD: primero se caracteriza lo actual y después la prueba cambia a propósito (`docs/refactor-roadmap.md`).
- **Qué borra un port y qué conserva.** Borra el JS y el CSS de su vista, y su global como implementación legacy. Pero otra vista legacy puede seguir consumiéndolo: el laboratorio usa métodos de campaña y de Sistemas hasta F7, y `app.js` llama a los `mount` hasta F10. En ese caso queda un adaptador mínimo con sólo esos métodos, y el PR dice cuáles son y qué ítem los retira. Biblioteca, Proyecto, Método y Recorrido no tienen JS, CSS ni global propios: son cierres de `app.js` y reglas de `styles.css`. Sus ports borran sus funciones, sus ramas en los delegados de `app.js` y las reglas que ninguna otra vista usa.
- **E2E primero.** El PR de un port abre con los E2E de comportamiento de su vista, escritos contra el legacy y en verde antes de portar. Pasan sin editarse después. Es la respuesta del usuario a la Q1 del clarify de F1 (2026-10-05).
- **Reglas de todo port,** salidas del mapa (§3 a §5, §9 y §11):
  - cada port saca sus ramas de los tres delegados de `app.js` sobre `#main` y del intervalo del temporizador en el mismo commit, para no manejar un evento dos veces;
  - un solo almacén por clave y un solo motor por tipo: nada abre su propia instancia de `openVersionedStore`, y cada lectura de `window` pasa a ser un import de un singleton;
  - la escritura en cada tecla del editor, de las notas y de la reflexión se conserva; un debounce es otro cambio y se mide antes;
  - el foco vuelve explícitamente después de cada redibujo (refs y `flushSync`) y las regiones vivas que hoy se recrean quedan montadas;
  - ninguna librería de animación: el movimiento reducido depende de la regla global de `styles.css`.
- **Integración:** `frontend/src/app/main.tsx`, `package.json`, `.github/workflows/ci.yml`, las configuraciones y la documentación las integra el agente principal, aunque dos ítems corran en paralelo ([AGENTS.md](../../AGENTS.md)). Cada port toca también `frontend/app.js`, así que los ports se integran de a uno.

## Ítems

| ID | Ítem | Intención | Depende de | Estado | Spec |
| --- | --- | --- | --- | --- | --- |
| F1 | Red de seguridad | Fijar en un navegador real lo que hace hoy el front (enlaces, recargas, arranque con progreso real, puentes entre vistas) y probar los dos riesgos altos del mapa, sin cambiar código de producción | ADR 0008 (aceptado) | Planificado | [003-f1-red-de-seguridad](../003-f1-red-de-seguridad/spec.md) |
| F2 | Seams sin cambio visible | Dejar los almacenes, los motores, el catálogo, el arranque, los puentes y el respaldo como módulos importables, para portar cada vista sin tocar a las demás | F1 | Pendiente | — |
| F3 | Biblioteca | Portar la página de Biblioteca (búsqueda, filtros, favoritos y categorías) | F2 | Pendiente | — |
| F4 | Proyecto | Portar la página de Proyecto y sus hitos, con los 10 IDs de hitos fijados | F2 | Pendiente | — |
| F5 | Sistemas | Portar el catálogo y el taller de Sistemas | F2 | Pendiente | — |
| F6 | Campaña | Portar la campaña: héroe, mundos, misiones, vitrina y reglas | F2 | Pendiente | — |
| F7 | Laboratorio con exploradores | Portar el laboratorio con sus exploradores, el editor y la ejecución, con el transporte como interfaz | F2, F5, F6; lo espera A4 | Pendiente | — |
| F8 | Método | Portar Método: exportar, importar, borrar y respaldos | F2, F5, F7 | Pendiente | — |
| F9 | Recorrido | Portar Recorrido: pasos, temporizador, notas y lección | F2 | Pendiente | — |
| F10 | Shell y router | Una sola raíz de React con el shell y el router, y retirar `app.js` | F3 a F9, A2 | Pendiente | — |
| F11 | Acceso y cuenta | Las pantallas de cuenta, como una raíz previa al shell: login, invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta, el aviso de privacidad y, de D1, la opción «computadora compartida» y la pregunta «¿Este progreso es tuyo?» | A2, C3a; C3b para exportar y borrar la cuenta; D1c para lo de D1 | Pendiente | — |
| F12 | Administración | Las pantallas de administración de usuarios e invitaciones | C3b, F11 | Pendiente | — |
| F13 | Sincronización | **Propuesta, sin aceptar.** El estado de sincronización, el aviso al salir con la cola sin enviar y los avisos de cuenta distinta, época cambiada y reloj desfasado | D1c, F10, F11 | Pendiente | — |

El orden de F3 a F9 es el de las hojas primero: dependen de F2, no unas de otras, pero se integran de a uno (ver «Orden y paralelismo»).

## Alcance por ítem

Cada línea nombra lo que entra, lo que borra, lo que conserva y lo que queda fuera. Los detalles están en el [mapa](legacy-map.md) y se bajan a la spec de cada ítem.

- **F1:**
  - Entra: la adopción del ADR 0008 (Vitest en `node`, Playwright, los scripts, el paso de la CI y la documentación); la red E2E contra el legacy, con las ocho vistas por hash, las seis formas de URL con query, la recarga de los enlaces que cambian la query (detectando una recarga real del documento: al planificar se midió que los 11 recargan), el arranque con el progreso real de master y con el almacenamiento bloqueado, el contexto de campaña y de Sistemas dentro del laboratorio y el ciclo entre vistas; los Page Objects de lo que esos escenarios tocan; los Playgrounds simulados, con cuatro resultados armados a mano; dos specs de Vitest que caracterizan los riesgos altos (la segunda instancia de un almacén y el motor usado antes de `init`); y la protección del aspecto que F2 necesita, con estilo computado en 981, 850, 650 y 590 px, más `.quest-direct-lock`, la regla que el mapa omite: la define `campaign.css` y la dibuja el laboratorio, así que F6 la conserva (por ejemplo, moviéndola a `lab.css`) hasta que F7 retire el bloque de bloqueo.
  - Fuera: cualquier cambio de código de producción, incluidos atributos de prueba; los flujos de comportamiento de cada vista, que trae cada port (Q1 de su spec); los seams (F2); el router (F10); `#invitacion=` (F11).
  - Evolución prevista, no es trabajo de F1: sus E2E arrancan hoy sin sesión. Cuando C3a y A3 dejen el contenido detrás del ingreso, los que parten del progreso de master pasarán por el ingreso (la pantalla de F11 o una fixture de sesión), y la red arma cada arranque en un solo lugar para que ese cambio no toque cada escenario.
- **F2:**
  - Entra, en unidades que define el plan, cada una con su prueba y su punto de reversión (A2 espera las unidades 1 a 4):
    1. un almacén por clave, con suscripción (el del recorrido en `entities/guide` y el del laboratorio en `entities/exercise`), y los motores de campaña y Sistemas como singletons importables; el cliente v2 de D1 se monta sobre ellos;
    2. el catálogo de los 274 ejercicios como módulo (`exercises` y `byId`), y `buildProgram` en `entities/exercise`;
    3. el arranque explícito: lo que `app.js` hace al evaluarse (los `init` de campaña y Sistemas, `loadWarning` y el primer render) pasa a una función que se llama en orden;
    4. el registro de modelos de Sistemas, en `entities/systems-simulation`;
    5. los puentes entre vistas como datos puros (contexto de misión, permiso, regreso y lista navegable) y la gramática de URL en `shared/config`;
    6. `features/progress-backup`: exportar, importar en dos fases, avisos, «Borrar todo» y respaldos, con una interfaz que el cliente v2 de D1 (D1c) pueda reemplazar sin reescribir las vistas (importar pasará a ser `POST /api/progress/import` y «Borrar todo», el reset con contraseña);
    7. los modelos puros de los exploradores;
    8. las reglas de CSS que cruzan hojas, cada una a la hoja de su dueño.
  - Conserva: los `window.Taller*` que las vistas legacy leen, como adaptadores finos sobre los módulos. F2 cambia a propósito las dos pruebas de Vitest de F1 en su commit TDD.
  - Fuera: portar una vista; cambiar comportamiento fuera de ese commit; el tipo de explorador, si exige un campo nuevo en `content/` (decisión abierta).
- **F3:**
  - Entra: la página en `pages/` con el filtro y los favoritos como modelo puro; los E2E de la vista.
  - Borra: `renderLibrary`, `renderResourceResults` y sus ramas en los tres delegados de `app.js` (el `input` de `resource-search`, el `change` de `filter-*` y los clics `favorite`, `category` y `clear-filters`).
  - Conserva: un `mount` y un `unmount` como los del Atlas, hasta F10.
  - Fuera: llevar los filtros a la URL, que cambia el contrato de URL.
- **F4:**
  - Entra: la página con sus hitos; los 10 IDs de hitos persistidos (`rust-memory`…) fijados en un fixture; los E2E.
  - Borra: `renderProject`, `milestones` y `milestoneIds` (pasan a la configuración de `entities/guide`) y la rama `data-milestone` del delegado de clic.
  - Conserva: el `mount` y el `unmount`, hasta F10.
  - Fuera: cambiar un ID de hito.
- **F5:**
  - Entra: el catálogo y el taller (explorar, construir y entregar); la sesión de simulaciones como módulo, alcanzable desde «Borrar todo»; el saneo del SVG de `scene` en `entities/systems-simulation`; los E2E.
  - Borra: `frontend/systems.js`, `frontend/systems.css` y su `style=` (el del SVG).
  - Conserva: `window.TallerSystems` con `mount` y `unmount` hasta F10, con `refresh`, `sync`, `missionIDs`, `returnURL` y `exerciseContextHTML` hasta F7, y con `resetSimulations` hasta F8.
  - Fuera: cambiar el kit ZIP, que ya es `features/download-project-kit`.
- **F6:**
  - Entra: la página (héroe, mundos, misiones, vitrina y reglas); los selectores de `entities/campaign` (rango, etiquetas y tipo de misión) con `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` exportados; los conteos y el XP derivados del catálogo; los E2E.
  - Borra: `frontend/campaign.js` y `frontend/campaign.css`.
  - Conserva: `window.TallerCampaign` con `mount` y `unmount` hasta F10, y con `refresh`, `sync`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML` hasta F7.
  - Fuera: cambiar las reglas de XP o de desbloqueo.
- **F7:**
  - Entra: el mapa, el ejercicio en sus tres fases y el bloqueo de campaña; los exploradores de `lab-explorers.js` y `quest-explorers.js`, que migran con el laboratorio porque una raíz anidada en el `innerHTML` del lab se perdería en cada render; un hook del editor con un callback de cambio; `features/run-exercise` con el transporte como interfaz; `diagnose` y `liveHint` en `entities/exercise`; los selectores de resuelto, repaso, puntos y nivel; los E2E. Si el plan lo encuentra grande, se parte en F7a y F7b.
  - Borra: `frontend/lab.js`, `lab-explorers.js`, `quest-explorers.js`, `lab.css` y `quest-explorers.css`; los dos `style=` de la fase de reflexión; los globals `TallerLab`, `TallerExplorers` y `TallerQuestExplorers`; y los métodos de HTML de los adaptadores de F5 y F6 (`exerciseContextHTML` y `lockedExerciseHTML`), que el lab React reemplaza por datos.
  - Conserva: `mount` y `unmount` hasta F10.
  - Fuera: el cambio de transporte a `/api/runs` (A4, que espera a F7 por decisión del 2026-10-05 y cambia sólo el adaptador de transporte de `features/run-exercise`); la regla de evidencia; el debounce de la escritura por tecla.
- **F8:**
  - Entra: la página y el panel de respaldos; la interfaz de exportar, importar (`#import-file`) y «Borrar todo» con su confirmación; los E2E, con la descarga y la carga de archivo.
  - Propuesta de la spec de D1, sin aceptar: F8 depende de D1b, y «Borrar todo» pide la contraseña de la cuenta (superficie 4 de «Superficies que pide D1»). La alternativa es portar el flujo local tal como está y dejar la contraseña para F13, y entonces F8 no espera a D1b.
  - Borra: `renderMethod`, `backupsPanel`, los manejadores de `#export-progress`, `#cancel-reset`, `#confirm-reset` e `#import-file`, el `#confirm-dialog` estático y el `style=` de la página.
  - Conserva: el toast del shell, hasta F10.
- **F9:**
  - Entra: pasos, temporizador (sin el `setInterval` global), notas y el diálogo de lección, que devuelve el foco a quien lo abrió; los E2E.
  - Borra: `renderRoute`, `timerMarkup`, `updateTimer` con su `setInterval` de 500 ms, `openLesson` y `#lesson-dialog`.
  - Fuera: cambiar el contenido del recorrido.
- **F10:**
  - Entra: un spike previo del router y de nuqs (ver «Decisiones abiertas»); una sola raíz con el shell (sidebar, navegación, `skip-link`, idioma, `#toast` y diálogos), con el Atlas montado debajo; `syncLinkedLanguage` en el router; los conteos del nav derivados del catálogo; los E2E del arranque en lugar de `boot-check` y `load-order-check`.
  - Borra: `frontend/app.js`, todo `window.Taller*` de vistas, los `register-*` que los publicaban y las reglas de `styles.css` que ya nadie use; `styles.css` conserva los tokens y las clases base.
  - Fuera: Zustand y nuqs, salvo que el spike los justifique con un caso real.
- **F11:**
  - Entra: las pantallas de cuenta (la decisión de dónde viven está en «Pantallas de acceso»), que arrancan antes de evaluar el shell legacy: el login, la invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta y el aviso de privacidad. Borran de la URL, con `history.replaceState` y antes de que `app.js` mire el hash, los fragmentos con token (`#invitacion=<token>` y el de recuperación de contraseña). De D1 (superficies 1 y 2 de «Superficies que pide D1»): la opción «computadora compartida» del ingreso y el resumen con la pregunta «¿Este progreso es tuyo?» al importar el v1. Los E2E.
  - Fuera: las pantallas de administración (F12); la API, que es de C3a y C3b (C3a va sin Fortify por decisión del usuario del 2026-10-05: las pantallas siguen el contrato de su spec y no las rutas por omisión de Fortify).
  - Dependencias: el login, la invitación y la contraseña esperan a C3a; exportar y borrar la cuenta, a C3b; lo de D1, al cliente v2 (D1c). Con todo eso adentro, F11 es el ítem que más cosas espera: su clarify decide si se parte (ver «Decisiones abiertas»).
- **F12:**
  - Entra: las pantallas de administración de usuarios e invitaciones que consuman `/api/admin` de C3b (el detalle sale de la spec de C3b); los E2E.
  - Fuera: las estadísticas del admin (C5); la API (C3b); las pantallas de cuenta (F11).
  - No bloquea a ningún otro ítem del front. Dónde se monta, y si C4 la espera, son decisiones abiertas.
- **F13 (propuesta, sin aceptar):**
  - Entra: el estado de sincronización en el shell (hoy `#save-label` dice «Guardado en este navegador»), el aviso al salir con la cola sin enviar (conservar o descartar) y los avisos de cuenta distinta, de época cambiada y de reloj desfasado; los E2E.
  - Fuera: el cliente v2 y su contrato (D1c); la confirmación de contraseña de «Borrar todo» (F8); la opción «computadora compartida» y la pregunta de la importación (F11).
  - Existe sólo si el usuario acepta la partición de D1; si no, estas superficies se reparten entre F10 y F8.

## Ítems del backend que tocan el front

La hoja de ruta del backend es la dueña de estos ítems. Acá sólo se cablean las dependencias.

| Ítem | Qué toca del front | Relación con esta hoja de ruta |
| --- | --- | --- |
| A2 | El arranque: que el front espere el contenido antes de evaluar las vistas legacy y que el HTML deje de embeberlo | Espera a F1 y a F2 (unidades 1 a 4): el catálogo es un módulo que A2 vuelve asíncrono y el arranque de `app.js` es una función explícita que A2 difiere. Lo esperan F10 (aloja el shell en su arranque) y F11 |
| A3 | Que el front lea las 17 porciones con el protocolo de arranque | Espera a A2, a C3a y a F11: sin pantalla de acceso no hay sesión, y C3a deja el contenido detrás de ella. Con las pantallas de cuenta adentro, F11 también espera a C3b y a D1c: si A3 espera a todo F11 o sólo al acceso es una decisión abierta |
| A4 | Que el laboratorio use `/api/runs` | Espera a F7 (decidido el 2026-10-05): A4 cambia el adaptador de transporte de `features/run-exercise`, con el id del intento en el resultado y sin sumar `attempts`, y no `runExercise` ni `sanitizeResult` de `lab.js` |
| C3a | La API de identidad y acceso: no incluye pantallas | Las pantallas de cuenta son F11 |
| C3b | El correo, la administración de usuarios e invitaciones y el ciclo de vida de la cuenta: no incluye pantallas | Las de administración son F12; exportar y borrar la cuenta, F11 |
| C4 | CSP sin `'unsafe-inline'` | Los cuatro `style=` de las plantillas legacy la bloquearían (uno en Sistemas, dos en el laboratorio y uno en Método). C4 espera a F5, F7 y F8, o los reemplaza por clases en su PR |
| D1 | El cliente v2, con espacios por cuenta (D1c, en la partición que propone la spec de D1 y que el usuario no aceptó) | Se apoya en los almacenes con suscripción (unidad 1 de F2) y en la interfaz de `features/progress-backup` (unidad 6), y espera a F11 y a A3. Sus superficies de vista están en «Superficies que pide D1» |
| E1 | Esenciales suma un catálogo | Los conteos del nav (4, 25 y 274), «24 misiones» y «/180» salen del catálogo (F6 y F10) o se actualizan a mano con E1 |

## Pantallas de acceso (A3 y C3)

**Decisión de la planificación, que el usuario no confirmó: entran como una raíz de React previa al shell (F11) y no esperan al paso del shell (F10).**

- **Motivo principal, la cadena del backend.** C3a deja el contenido detrás de la sesión (sin sesión, 401) y A3 lo lee. Si el login esperara a F10, el último ítem del épico, A3 esperaría a todo el port. Con A3 esperarían A4 y C4, que dependen de él, y D1, cuyo cliente por cuenta también necesita un login en el navegador.
- **No toca el shell legacy.** La raíz previa decide antes de evaluar `app.js`: sin sesión, dibuja sólo el acceso y el resto no se evalúa; con sesión, sigue el arranque de A2 (contenido y vistas). F11 no depende de ninguna vista portada, sólo del arranque explícito de A2.
- **Protege los fragmentos con token.** Hoy un `#invitacion=<token>` caería en `#recorrido` y el token quedaría en la URL (mapa, §4). El enlace de recuperación de contraseña también viaja en el fragmento (ADR 0006, §4.3). La raíz previa los lee y los borra con `history.replaceState` antes de que `app.js` mire el hash.
- **El costo:** hasta F10 hay dos puntos de montaje de React, el acceso y la vista que esté montada. F11 vive en `pages/` como cualquier página, con su modelo y su interfaz propios; F10 decide si pasa a ser una ruta de la raíz única o si sigue siendo la compuerta. Lo que cambia es el punto de montaje, no el código.
- **Descartadas:** esperar a F10, por lo que bloquea; y dibujar el login con `innerHTML` en el shell legacy, que es código que se tira y contradice «el código nuevo usa React».
- **Las otras pantallas de cuenta y las de administración (decidido el 2026-10-05).** F11 incluye todas las de cuenta: login, invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta y el aviso de privacidad. F12, un ítem nuevo, cubre las de administración (usuarios e invitaciones) y depende de C3b. La ubicación de las pantallas, una raíz previa al shell, sigue siendo una propuesta que el usuario no confirmó (la hoja de ruta del backend lo dice).

## Superficies que pide D1

La spec de D1 (borrador en otra rama, sin clarify) fija el estado y el contrato de cinco superficies de vista que ningún ítem del front tenía. Propone partir D1 en D1a (servidor), D1b (importación y reset) y D1c (cliente v2); el usuario no aceptó esa partición. Si la rechaza, D1b y D1c se leen como D1. Esto es una propuesta de dónde va cada una, para que el usuario la decida:

| Superficie | Dónde va | Depende de |
| --- | --- | --- |
| 1. La opción «computadora compartida» en el ingreso | F11 | D1c |
| 2. El resumen y la pregunta «¿Este progreso es tuyo?» al importar el v1 | F11 | D1b y D1c |
| 3. El aviso al salir con la cola sin enviar | F13 (propuesta) | D1c y F11 |
| 4. La confirmación de contraseña de «Borrar todo» | F8 | D1b (propuesta de D1: F8 depende de D1b) |
| 5. El estado de sincronización y los avisos de cuenta distinta, época cambiada y reloj desfasado | F13 (propuesta) | D1c y F10 |

- **Por qué un ítem nuevo y no F10 para la 3 y la 5:** F10 es el último del tronco del front y no debería esperar a D1c, que depende del backend. F13 cuelga del shell ya portado (F10) y del cliente v2.
- **Por qué la 4 en F8:** «Borrar todo» vive en Método. La alternativa es que F8 porte el flujo local tal como está y F13 lo cambie por el reset con contraseña, para que F8 no espere a D1b.
- **Interfaz de F2:** la unidad 6 (`features/progress-backup`) tiene que dejar una interfaz que D1c reemplace sin reescribir las vistas, y las unidades 1 y 6 son lo que D1c pide a F2.

## Orden y paralelismo

- **Tronco del front:** F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10. A2 entra después de la unidad 4 de F2, antes de F3 (decisión del usuario: A2 temprano), y F11, F12 y F13 corren aparte. A4 va después de F7 (decidido el 2026-10-05).
- **Por qué de a uno:** F3 a F9 no se esperan por datos, pero cada una toca `app.js` y `main.tsx`, que se integran de a uno. Si A2 se demora por su spike, F3 a F6 pueden empezar igual porque no dependen de él. F7 no empieza antes de F5 y F6, por la regla de las hojas primero.
- **Tramos,** en paralelo con las olas del backend (un tramo arranca cuando termina el anterior):

| Tramo | Ítems | Corre con (backend) | Condición |
| --- | --- | --- | --- |
| 1 | F1, F2 y A2 | Ola 2: C3 y C6 | Cumplida el 2026-10-05: el usuario aceptó el ADR 0008 y autorizó las descargas de F1 |
| 2 | F3, F4, F5 y F6, y F11 | Ola 3: B2 y A3 | F2 entregado; F11 también necesita A2 y C3a (y C3b y D1c para sus partes), y A3 lo espera |
| 3 | F7 | Ola 4: D1, C4, A4 y B3 | F5 y F6 entregados; A4 espera a F7 |
| 4 | F8, F9 y F10 | Ola 5: C5 y E1 | F7 entregado; F10 también necesita A2 |
| Aparte | F12 y F13 | Cuando C3b (F12) y D1c (F13) estén entregados | F12 necesita F11; F13, F10 y F11. Ninguno bloquea a otro ítem del front |

- **Archivos que comparten los dos épicos:** `package.json` y `.github/workflows/ci.yml` (F1 suma el E2E al job `front` y C6 toca el job `api`), y la documentación. Los integra el agente principal.

## Acciones del usuario (los agentes no las hacen)

| Cuándo | Acción |
| --- | --- |
| Siempre | Cada descarga (paquetes npm, navegadores o imágenes) pide permiso con nombre, origen y tamaño antes de bajarse. |
| Ahora | Ratificar la constitución 1.4.1 (la 1.4.0 y el ADR 0008 ya los aceptó el 2026-10-05). Aceptar o rechazar la partición de D1 y el ítem F13; decidir si F11 se parte y qué espera A3; decidir dónde se monta F12 y si C4 lo espera. |
| F1 (implementación) | Autorizado el 2026-10-05: `vitest` 5.0.3 y `@playwright/test` 1.63.0 desde el registro de npm (19 paquetes con sus dependencias, unos 22,4 MB desempaquetados y 5,0 MB comprimidos, estimación) y, con `npx playwright install --only-shell chromium`, el Chrome Headless Shell 153.0.8010.12 (119,8 MB) y ffmpeg (2,4 MB) del CDN de Playwright. Las descargas las hace el coordinador en la primera tarea del plan. Si faltan librerías del sistema, `install-deps` pide `sudo` y baja paquetes de apt (sin medir): en la CI lo hace el paso `--with-deps`. |
| Primera spec de componente (F3) | Permiso para `jsdom` 30.1.2 y Testing Library (`@testing-library/react`, `dom`, `user-event` y `jest-dom`): 56 paquetes, unos 26,3 MB y 5,0 MB comprimidos (estimación). |
| Primera factory | Permiso para `fishery` 2.4.0: 2 paquetes, unos 0,19 MB. |
| F10 | Permiso para lo que el spike elija entre router, nuqs y Zustand, con su peso medido antes. |
| F11 | Confirmar la ubicación de las pantallas de cuenta (una raíz previa al shell) y decidir cómo se parte F11 (ver «Decisiones abiertas»). |

## Criterios de aceptación globales

- **Todo port (F3 a F10):**
  - los E2E de su vista pasan sobre el legacy antes del cambio y siguen pasando, sin editarse, sobre la vista portada; si hay que editar uno, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario;
  - el progreso, los IDs y las URLs no cambian: las fixtures `qa/fixtures/progress-*.json` arrancan sin escribir, sin respaldar y sin avisar (ADR 0003), `curriculum-ids-check` sigue en verde, y las ocho vistas por hash y las seis formas de URL con query (mapa, §4) llevan adonde llevaban;
  - el PR borra el JS y el CSS de su vista y deja sólo el adaptador mínimo que otra vista legacy todavía consuma, con el ítem que lo retira;
  - se conservan la navegación por teclado, el foco visible, el diálogo que devuelve el foco, el diseño móvil y el movimiento reducido;
  - `dist/index.html` queda bajo el límite de `qa/build-check` (2 500 000 caracteres). Tras A1 pesa 2 202 074 bytes, así que el margen es de unos 300 KB, y cada dependencia de runtime nueva se mide antes de entrar, hasta que A2 saque el contenido del HTML;
  - el código nuevo no suma funciones de complejidad mayor que 10 sin justificarlo en la revisión, y los 29 avisos de las seis vistas desaparecen con ellas.
- **F2:** `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después, y los E2E de F1 pasan sin editarse.
- **Todo ítem** cierra con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y, desde F1, `npm run test:e2e`, que también corre en la CI. La imagen web (`frontend/Dockerfile`) sigue construyendo: su etapa de build corre `npm test`.

## Decisiones abiertas

Se cierran en el paso clarify de la spec de cada ítem.

| Ítem | Preguntas |
| --- | --- |
| F1 | Cerradas en su clarify (2026-10-05): las cinco de su spec, todas con la opción recomendada |
| F2 | El tipo de explorador (`lab-explorers.js:kind` es hoy una expresión regular): ¿un campo de `content/`, que cambia los bytes publicados y los validadores de C2 y se coordina con el backend, o un mapa explícito por ID en el front? Y qué unidades y en qué orden, para que A2 empiece cuanto antes |
| F3 | Si los filtros siguen en memoria, como hoy (se recomienda que sí) |
| F4 | Dónde vive el fixture de los 10 IDs de hitos y quién lo fija: hoy sólo los fija el escenario «g) hitos» de `app-shell-check`, que se retira con la página |
| F5 | Dónde vive la sesión de simulaciones para que «Borrar todo» la alcance |
| F6 | Los conteos y el XP derivados del catálogo: «4 mundos · 24 misiones · 12 desafíos», «/180» y los literales de XP quedan desactualizados con E1 |
| F7 | La etiqueta de un `solvedAt` importado sin evidencia: hoy el mapa lo muestra como «Resuelto con pruebas» y suma 20 puntos aunque `hasPassingEvidence` da `false`, y el port tiene que decidir qué selector lo respalda. Y si el `onChange` de React recibe los eventos `input` que el editor emite por código, o conviene que el editor exponga un callback |
| F8 | Nada previo a la spec |
| F9 | Si se anuncian las regiones vivas que hoy se recrean (no verificado) |
| F10 | El router y nuqs, con un spike: el contrato (la vista en el hash, la query antes del hash y `#invitacion=` en el hash) descarta un router por path, y `createHashRouter` lee la ruta dentro del hash; el adaptador `nuqs/adapters/react` lee `location.search`, compatible con la query antes del hash. Los conteos del nav (`.nav-count` 4 y 25, `.lab-nav-count` 274) derivados del catálogo. Si F11 pasa a ser una ruta de la raíz única. Si un `import()` dinámico genera un chunk que `vite-plugin-singlefile` no inlinea (lo comparte con A2) |
| F11 | Cómo se parte, porque con todas las pantallas de cuenta adentro espera a C3a, a C3b (exportar y borrar la cuenta) y a D1c (lo de D1) y A3 la espera: partirla en el acceso (login, invitación y contraseña), la cuenta (exportar, borrar y privacidad) y lo de D1, para que A3 espere sólo al acceso, o estrechar la dependencia de A3. Dónde vive la opción «computadora compartida» |
| F12 | Dónde se monta (una raíz previa como F11 o una ruta de la raíz única de F10) y si C4 la espera, porque sin administración no se expone el taller |
| F13 | Si el usuario acepta la partición de D1 y, con ella, el ítem y qué superficies lleva (la 3 y la 5, o también la 4) |
| Transversales | Cablear D1, C4 y E1 en la hoja de ruta del backend (A4 va después de F7: decidido el 2026-10-05) |

## Estado y evidencia

- **2026-10-05, planificación.** El [mapa](legacy-map.md) sale de una lectura completa del código legacy en `8f1bdbc`. Los conteos de líneas de las seis vistas (750, 1 227, 203, 376, 255 y 296) coinciden con `ca9e619`, y 21 de sus identificadores siguen existiendo. Se midieron, sin instalar ni bajar nada, los tamaños del ADR 0008: 77 paquetes y 48,9 MB para la pila completa, y 122,2 MB para el navegador con `--only-shell`. La imagen que fija `frontend/Dockerfile` es `node:24.21.0-alpine`, que cumple lo que pide `jsdom` 30.1.2. El tamaño actual del HTML (2 202 074 bytes) sale de la evidencia de A1 en la hoja de ruta del backend; no se reconstruyó.
- **Sin verificar:** que CodeMirror 6 corra en jsdom; los tiempos de la CI y del paso de instalación del navegador (la suite local de F1 tarda unos 12 s con 8 workers y unos 35 s con uno); que `import()` dinámico y `vite-plugin-singlefile` convivan (A2); el tamaño real del build con un router o con nuqs (F10); y si se anuncian las regiones vivas que se recrean.
- **2026-10-05, decisiones del usuario.** Aceptó el ADR 0008 sin enmiendas, ratificó la constitución 1.4.0 y respondió el clarify de F1 con la opción recomendada en las cinco preguntas; autorizó las descargas de F1 (vitest, `@playwright/test` y el Chrome Headless Shell). Partió C3 en C3a (spec 004, sin Fortify) y C3b. El coordinador decidió que F11 cubre todas las pantallas de cuenta, que F12 cubre las de administración y que F7 va antes que A4.
- **2026-10-05, la recarga se confirmó.** Al planificar F1 se midió el build actual en una copia aparte, sin tocar el repositorio ni descargar nada: los 11 enlaces que cambian la query recargan el documento, y los de sólo hash no. Con la recarga se pierden el temporizador, la sesión del Atlas y las simulaciones de Sistemas. El diseño del router de F10 no cambia.
- **2026-10-05, la spec de D1.** Su borrador pide cinco superficies de vista y propone partir D1; las ubicaciones propuestas están en «Superficies que pide D1», sin aceptar.
- **2026-10-05, F1 planificada.** Plan, investigación, modelo de datos, validación y 16 tareas en cuatro fases, con siete dueños de archivos disjuntos (K, B, V, U, C, P y S) y cuatro ondas. El código de referencia corrió al planificar, en una copia aparte y sin instalar ni bajar nada: la red completa (106 pruebas en 8 specs) pasa cinco veces seguidas sin reintentos (530 de 530), las dos specs de Vitest (3 pruebas) pasan, y las 31 roturas deliberadas del código de producción las detectó la spec prevista. El análisis cruzado no dejó hallazgos críticos ni altos: los 24 requisitos (FR-013 es un límite de alcance, sin tarea) y los 9 criterios tienen tarea, y se corrigieron dos medianos y dos bajos. Sin verificar: el job de la CI y su tiempo, la imagen web de Docker, macOS y los otros navegadores. Sin implementar.
- **2026-10-06, F1 implementada** en `feat/f1-red-de-seguridad`, con siete dueños en worktrees separados y la integración del coordinador:
  - **La red:** 106 pruebas E2E en 8 specs (las guardas, las ocho vistas, las formas de URL, las recargas, los puentes, el ciclo con el compilador simulado, el arranque con progreso y el contrato de CSS). Vitest suma 2 archivos y 3 pruebas, dentro de `npm test`.
  - **Las roturas sobre el árbol integrado:** 18 de 18 fallan en la spec esperada: 3 de SC-006, las 10 reglas de SC-008 (13 roturas; R8 por un cambio de valor) y las 2 de Vitest. Las 2 roturas de las guardas no corrieron: el control de permisos del agente las negó, y quedan para el usuario.
  - **Cinco corridas seguidas** (`--repeat-each=5 --retries=0`): 530 de 530, en 64 s en local. Con un solo worker (`CI=1`): 106 en 42 s.
  - **Producción intacta:** ningún archivo de `frontend/*.js`, de las hojas, de `frontend/src/` (salvo las dos specs), de `content/`, `docker/` ni `backend/` cambió, y `build/curriculum.json` sigue en `ef8f5715…`. `docker compose build taller` construye la imagen web en 32 s, con los 30 checks y Vitest adentro.
  - **En la CI (#23, primera corrida):** el job `front` tarda 2 min 5 s. La instalación del navegador con sus dependencias (`--with-deps`) lleva 21 s, un 17 % del job, y la red 52 s. La instalación no llega a la mitad del job, así que la caché de R13 queda afuera, como dice el ADR.
- **Orden de especificación:** F1 está planificada. F2 se especifica después, porque su protección depende de lo que F1 decidió; los demás ítems, de a uno, cuando les toca.

## Enmiendas pendientes

El ADR 0008 se aceptó el 2026-10-05 y su documentación ya está registrada (`AGENTS.md`, `qa/AGENTS.md`, el «Alcance» de `docs/agent-skills.md` y el principio II, en la constitución 1.4.1). F1 reemplaza el aviso «hasta que se integre, no existen» por los comandos reales.

Al integrar las dos hojas de ruta, falta ajustar la del backend en lo que esta cableó sólo en parte:

- D1, C4 y E1 no citan a F2, F5, F7, F8 ni los conteos del catálogo;
- «Acciones del usuario» dice que `npm ci` baja 243 dependencias: con la pila de pruebas son hasta 320;
- el alcance de C3 y su fila de «Acciones del usuario» todavía hablan de Fortify, y C3a va sin Fortify por decisión del usuario (a corregir al integrar la rama de C3).
