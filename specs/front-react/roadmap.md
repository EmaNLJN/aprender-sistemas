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

- **IDs estables:** F1…F13 no se renumeran ni se reutilizan. Un ítem nuevo recibe un ID nuevo. Un ítem partido conserva su ID, y cada parte lo lleva con una letra: F2a y F2b, F7a y F7b, F11a a F11d. F11 y F12 existen porque ninguna hoja de ruta asignaba las pantallas de cuenta ni las de administración, y F13 es una propuesta de la spec de D1 (ver «Superficies que pide D1»). Ninguno sigue el orden de ejecución: F11a corre en el tramo 2, y F11b a F11d, F12 y F13, aparte.
- **Una spec por ítem,** en `specs/NNN-<id>-<nombre>/` (`NNN` es el orden de creación de Spec Kit, compartido con el backend). La línea `Input` de cada spec nombra el ID de su ítem; esta tabla enlaza la spec de vuelta.
- **Estados:** `Pendiente` (sin spec), `En especificación` (spec redactada, con preguntas abiertas o sin plan), `Planificado` (plan, tareas y análisis hechos), `En curso`, `Entregado`.
- **Entregado** exige la implementación integrada y la evidencia de QA: PR, commit y qué se ejecutó. Si algo quedó sin verificar, se escribe.
- **Persistencia flow-forward** (constitución, principio VIII): al entregar, el directorio de la feature queda inmutable. Un cambio sustancial es una spec nueva, enlazada a la original. Los bugs van a `.specify/bugs/<slug>/`.
- **Un PR por vista,** que se puede revertir entero y devuelve la vista legacy. Un port no mezcla seams ni cambios de comportamiento. Lo que cambia el comportamiento va en su propio commit, con TDD: primero se caracteriza lo actual y después la prueba cambia a propósito (`docs/refactor-roadmap.md`).
- **Qué borra un port y qué conserva.** Borra el JS y el CSS de su vista, y su global como implementación legacy. Pero otra vista legacy puede seguir consumiéndolo: el laboratorio usa métodos de campaña y de Sistemas hasta F7b, y `app.js` llama a los `mount` hasta F10. En ese caso queda un adaptador mínimo con sólo esos métodos, y el PR dice cuáles son y qué ítem los retira. Biblioteca, Proyecto, Método y Recorrido no tienen JS, CSS ni global propios: son cierres de `app.js` y reglas de `styles.css`. Sus ports borran sus funciones, sus ramas en los delegados de `app.js` y las reglas que ninguna otra vista usa; esas reglas salen de `styles.css` hacia la hoja de su página, como `atlas.css` (X3, más abajo).
- **E2E primero.** El PR de un port abre con los E2E de comportamiento de su vista, escritos contra el legacy y en verde antes de portar. Pasan sin editarse después. Es la respuesta del usuario a la Q1 del clarify de F1 (2026-10-05). La excepción son los E2E de lo que cambia por X1: fallan contra el legacy por la razón esperada y van en el commit en rojo del TDD.
- **Reglas de todo port,** salidas del mapa (§3 a §5, §9 y §11):
  - cada port saca sus ramas de los tres delegados de `app.js` sobre `#main` y del intervalo del temporizador en el mismo commit, para no manejar un evento dos veces;
  - un solo almacén por clave y un solo motor por tipo: nada abre su propia instancia de `openVersionedStore`, y cada lectura de `window` pasa a ser un import de un singleton;
  - la escritura en cada tecla del editor, de las notas y de la reflexión se conserva; un debounce es otro cambio y se mide antes;
  - el foco vuelve explícitamente después de cada redibujo (refs y `flushSync`) y las regiones vivas que hoy se recrean quedan montadas (X2, más abajo);
  - ninguna librería de animación: el movimiento reducido depende de la regla global de `styles.css`.
- **Criterios de todo port, del clarify del 2026-10-28:**
  - **X1, con el ruling C2:** lo que existe sólo porque `innerHTML` rehace la vista (paneles, detalles, módulos o trazas que se cierran, foco que se pierde) adopta el comportamiento de React, y los E2E lo fijan. Esos E2E van en el commit en rojo del TDD, porque fallan contra el legacy. Las rarezas de lógica (qué guarda una acción o qué se marca) se conservan. Vale para todo port, también F5 y F9.
  - **X2:** las regiones vivas que hoy se recrean se montan, salvo `#quiz-feedback` de F9, que se conserva como hoy hasta que F10 la monte con su regla `:empty`. Cada una lleva una comprobación manual con lector de pantalla.
  - **X3:** cada port de `app.js` (F3, F4, F8 y F9) muda a la hoja de su página el CSS que sólo usa esa página, probado con el barrido de estilo computado de F2b y el multiconjunto de reglas. El primero que se integre parte los bloques compartidos (los `@media`, como el de 590 px, `.search-wrap`, `.empty-state` y la regla de impresión), y los demás rebasan. La convención de «Qué borra un port» no cambia: así se aplica.
- **nuqs (F3-Q1 y F5-Q3):** lo usan F3, para los filtros, y F5, para `taller` y `parte`. El primero de los dos que se integre lo instala, con permiso y con su peso medido contra el tope del HTML, y activa `enableHistorySync()` una sola vez en la raíz, para que el adaptador vea las escrituras de idioma de `app.js`; el otro lo reusa. F10 lo hereda.
- **Integración:** `frontend/src/app/main.tsx`, `package.json`, `.github/workflows/ci.yml`, las configuraciones y la documentación las integra el agente principal, aunque dos ítems corran en paralelo ([AGENTS.md](../../AGENTS.md)). Cada port toca también `frontend/app.js`, así que los ports se integran de a uno.

## Ítems

| ID | Ítem | Intención | Depende de | Estado | Spec |
| --- | --- | --- | --- | --- | --- |
| F1 | Red de seguridad | Fijar en un navegador real lo que hace hoy el front (enlaces, recargas, arranque con progreso real, puentes entre vistas) y probar los dos riesgos altos del mapa, sin cambiar código de producción | ADR 0008 (aceptado) | Entregado (PR #23) | [003-f1-red-de-seguridad](../003-f1-red-de-seguridad/spec.md) |
| F2a | Seams, primera parte | Los almacenes y los motores con suscripción (Zustand), el catálogo y `buildProgram`, el arranque explícito y el registro de modelos de Sistemas: las unidades 1 a 4, que espera A2 | F1 | Planificado | [009-f2-seams](../009-f2-seams/spec.md), con el [plan](../009-f2-seams/plan.md) y las [tareas](../009-f2-seams/tasks.md) de F2a |
| F2b | Seams, segunda parte | Los puentes entre vistas y la gramática de URL, `features/progress-backup`, los modelos de los exploradores y las reglas de CSS que cruzan hojas: las unidades 5 a 8 | F2a | Planificado | [009-f2-seams](../009-f2-seams/spec.md), con el [plan](../009-f2-seams/plan-f2b.md) y las [tareas](../009-f2-seams/tasks-f2b.md) de F2b |
| F3 | Biblioteca | Portar la página de Biblioteca (búsqueda, filtros en la URL, favoritos y categorías) | F2a | En especificación | [012-f3-biblioteca](../012-f3-biblioteca/spec.md), clarify del 2026-10-28, sin plan |
| F4 | Proyecto | Portar la página de Proyecto y sus hitos, con los 10 IDs de hitos fijados | F2a | En especificación | [013-f4-proyecto](../013-f4-proyecto/spec.md), clarify del 2026-10-28, sin plan |
| F5 | Sistemas | Portar el catálogo y el taller de Sistemas | F2b | En especificación | [018-f5-sistemas](../018-f5-sistemas/spec.md), clarify del 2026-10-28, sin plan |
| F6 | Campaña | Portar la campaña: héroe, mundos, misiones, vitrina y reglas | F2b | En especificación | [019-f6-campana](../019-f6-campana/spec.md), clarify del 2026-10-28, sin plan |
| F7a | Laboratorio, sin vista nueva | `features/run-exercise` con el transporte como puerto y el adaptador de los Playgrounds; `diagnose`, `liveHint`, los selectores y las reglas del registro; los E2E del laboratorio y de los exploradores contra el legacy. `lab.js` usa todo eso y nada visible cambia | F2b; lo esperan F7b y A4 | En especificación | [021-f7-laboratorio](../021-f7-laboratorio/spec.md), clarify del 2026-10-28, sin plan |
| F7b | Laboratorio, la vista | Portar el laboratorio con sus exploradores y el editor sobre lo que deja F7a | F7a, F5, F6 | En especificación | [021-f7-laboratorio](../021-f7-laboratorio/spec.md), clarify del 2026-10-28, sin plan |
| F8 | Método | Portar Método: exportar, importar, borrar y respaldos | F2b, F5, F7 | Pendiente | — |
| F9 | Recorrido | Portar Recorrido: pasos, temporizador y lección | F2a | En especificación | [014-f9-recorrido](../014-f9-recorrido/spec.md), clarify del 2026-10-28, sin plan |
| F10 | Shell y router | Una sola raíz de React con el shell y el router, y retirar `app.js` | F3 a F9, A2 | Pendiente | — |
| F11a | Acceso | Una raíz previa al shell con las etapas de los tokens y de la sesión, «pedir el ingreso», el cliente de la API, el ingreso, el alta por invitación, restablecer la contraseña con el enlace de la consola, el aviso de privacidad, «Tu cuenta» y «Salir» | A2, C3a; lo espera A3 | En especificación | [015-f11-acceso-cuenta](../015-f11-acceso-cuenta/spec.md), clarify del 2026-10-28, sin plan |
| F11b | Cuenta | Cambiar la contraseña, descargar los datos y borrar la cuenta | F11a, C3b | En especificación | [015-f11-acceso-cuenta](../015-f11-acceso-cuenta/spec.md), clarify del 2026-10-28, sin plan |
| F11c | Recuperar por correo | «¿Te olvidaste la contraseña?» y su pantalla, con el enlace por correo | F11a, C3c (espera el dominio) | En especificación | [015-f11-acceso-cuenta](../015-f11-acceso-cuenta/spec.md), clarify del 2026-10-28, sin plan |
| F11d | Lo de D1 | La opción «computadora compartida» en «Tu cuenta» y la pregunta «¿Este progreso es tuyo?» al importar el v1 | F11a, D1c; entra en servicio con D1c | En especificación | [015-f11-acceso-cuenta](../015-f11-acceso-cuenta/spec.md), clarify del 2026-10-28, sin plan |
| F12 | Administración | Las pantallas de administración de usuarios e invitaciones | C3b, F11 | Pendiente | — |
| F13 | Sincronización | **Propuesta, sin aceptar.** El estado de sincronización, el aviso al salir con la cola sin enviar y los avisos de cuenta distinta, época cambiada y reloj desfasado | D1c, F10, F11 | Pendiente | — |

El orden de F3 a F9 es el de las hojas primero: F3, F4 y F9 dependen sólo de F2a; F5, F6 y F7a, de F2b; y F7b, de F5, F6 y F7a. No se esperan por datos, pero se integran de a uno (ver «Orden y paralelismo»).

## Alcance por ítem

Cada línea nombra lo que entra, lo que borra, lo que conserva y lo que queda fuera. Los detalles están en el [mapa](legacy-map.md) y se bajan a la spec de cada ítem.

- **F1:**
  - Entra: la adopción del ADR 0008 (Vitest en `node`, Playwright, los scripts, el paso de la CI y la documentación); la red E2E contra el legacy, con las ocho vistas por hash, las seis formas de URL con query, la recarga de los enlaces que cambian la query (detectando una recarga real del documento: al planificar se midió que los 11 recargan), el arranque con el progreso real de master y con el almacenamiento bloqueado, el contexto de campaña y de Sistemas dentro del laboratorio y el ciclo entre vistas; los Page Objects de lo que esos escenarios tocan; los Playgrounds simulados, con cuatro resultados armados a mano; dos specs de Vitest que caracterizan los riesgos altos (la segunda instancia de un almacén y el motor usado antes de `init`); y la protección del aspecto que F2 necesita, con estilo computado en 981, 850, 650 y 590 px, más `.quest-direct-lock`, la regla que el mapa omite: la define `campaign.css` y la dibuja el laboratorio, así que F6 la conserva (por ejemplo, moviéndola a `lab.css`) hasta que F7 retire el bloque de bloqueo.
  - Fuera: cualquier cambio de código de producción, incluidos atributos de prueba; los flujos de comportamiento de cada vista, que trae cada port (Q1 de su spec); los seams (F2); el router (F10); `#invitacion=` (F11).
  - Evolución prevista, no es trabajo de F1: sus E2E arrancan hoy sin sesión. Desde F11a la sesión es obligatoria (F11-Q1), así que F11a trae el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión, y la red arma cada arranque en un solo lugar para que ese cambio no toque cada escenario.
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
  - Entra: la página en `pages/` con el filtro y los favoritos como modelo puro; los filtros en la URL con nuqs (F3-Q1), que se pueden enlazar y sobreviven a la recarga: un cambio visible deliberado, con una forma de URL nueva en la gramática de F2b (`url-grammar`) y su caso en `url-contract`, y el plan decide si el cambio de idioma los conserva (hoy `withLanguageQuery` borra la query salvo en Sistemas); el CSS que sólo usa la página, mudado a su hoja (X3); los E2E de la vista.
  - Borra: `renderLibrary`, `renderResourceResults` y sus ramas en los tres delegados de `app.js` (el `input` de `resource-search`, el `change` de `filter-*` y los clics `favorite`, `category` y `clear-filters`).
  - Conserva: un `mount` y un `unmount` como los del Atlas, hasta F10.
  - Fuera: guardar los filtros en `localStorage`; cambiar la búsqueda (por ejemplo, a la búsqueda por palabras del Atlas), el orden, los textos o el aspecto.
- **F4:**
  - Entra: la página con sus hitos, atada a los 10 IDs persistidos (`rust-memory`…) que F2a ya fijó en `MILESTONE_IDS`; los textos de los hitos como configuración de TypeScript en `entities/guide`, junto a `MILESTONE_IDS`, sin cambiar un byte del contenido ni de la API (F4-Q1); una pista por idioma para el primer hito, que hoy habla de Rust también en Go, en un commit propio con TDD, con el texto de Go que propone el plan para revisión (F4-Q4); el CSS que sólo usa la página, mudado a su hoja (X3); los E2E.
  - Borra: `renderProject`, `milestones` (pasa a la configuración de `entities/guide`) y la rama `data-milestone` del delegado de `change` de `#main`.
  - Conserva: el `mount` y el `unmount`, hasta F10.
  - Fuera: cambiar un ID de hito; los kits ZIP de proyecto, cuyo único llamador es Sistemas (F5).
- **F5:**
  - Entra: el catálogo y el taller (explorar, construir y entregar); la sesión de simulaciones como módulo de la página (`pages/systems/model`), con el reinicio en su API pública (F5-Q1); `taller` y `parte` en la URL con nuqs, que pasa a ser la fuente de verdad, con historial `replace` y sin cambiar `url-contract` ni `reload` de F1 (F5-Q3); el saneo del SVG de `scene` en `entities/systems-simulation`, con el color saneado en la propiedad `style` de React, el único sitio que el PR declara ante el grep de estilos en línea (F5-Q2); la descarga del kit ZIP de proyecto («Llevátelo a un proyecto»), que el adaptador inyecta; los E2E.
  - Borra: `frontend/systems.js` y su `style=` (el del SVG). `frontend/systems.css` se muda tal cual a `pages/systems/ui/systems.css`, como el Atlas.
  - Conserva: `window.TallerSystems` con sus nueve métodos, cada uno hasta que se porte el último que lo llama (tabla de la [spec 018](../018-f5-sistemas/spec.md)): `refresh`, `missionIDs`, `returnURL` y `exerciseContextHTML` hasta F7 (F7b), que los reemplaza por datos; `init`, `mount` y `unmount` hasta F10; `sync`, el de `lab.js` hasta F7 y el de `app.js` hasta F10; y `resetSimulations`, el único camino de «Borrar todo» a la sesión mientras `app.js` arme `progress-backup`, hasta F10. F8 adelanta el retiro de `sync` y `resetSimulations` sólo si saca de `app.js` esa composición. `window.TallerProjectKit` sigue hasta F10.
  - Fuera: cambiar el kit ZIP, que ya es `features/download-project-kit`.
- **F6:**
  - Entra: la página (héroe, mundos, misiones, vitrina y reglas); los selectores de `entities/campaign` (rango, etiquetas y tipo de misión) con `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` exportados; los conteos y el XP derivados del catálogo, con las palabras que repiten un conteo como texto editorial y una spec que las compara con el catálogo real y le avisa a E1 qué frases editar (F6-Q1); la retroalimentación del checkpoint montada (X2); los E2E.
  - Borra: `frontend/campaign.js`, `frontend/campaign.css` y el método `init` de `window.TallerCampaign`.
  - Conserva: `window.TallerCampaign` con `mount` y `unmount` hasta F10; `refresh` y `sync` hasta F10, porque `app.js` también los llama (F8 adelanta el de `sync` sólo si saca de `app.js` el armado de `progress-backup`); y `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML` hasta F7 (F7b).
  - Fuera: cambiar las reglas de XP o de desbloqueo.
- **F7** (partida en F7a y F7b, P2):
  - Entra en F7a, sin vista nueva: `features/run-exercise` con el transporte como puerto y el adaptador de los Playgrounds, con un canal de progreso y la cancelación, y los estados de hoy en una unión ampliable a la que A4 suma los suyos (F7-Q2); `diagnose` y `liveHint` en `entities/exercise`; los selectores de resuelto, repaso, puntos y nivel, que conservan `solvedAt`, porque un resultado que no aprueba no borra un logro (F7-Q1, ADR 0003); los E2E del laboratorio y de los exploradores, contra el legacy. `lab.js` usa todo eso. F7a no toca la vista, los puentes ni los adaptadores de campaña y Sistemas.
  - Entra en F7b, la vista: el mapa, el ejercicio en sus tres fases y el bloqueo de campaña; los exploradores de `lab-explorers.js` y `quest-explorers.js`, que migran con el laboratorio porque una raíz anidada en el `innerHTML` del lab se perdería en cada render; un hook del editor con un callback de cambio; la composición de los puentes; el diálogo de confirmación en la raíz de la página, con un portal a `body`, como el de F9; los E2E de X1. Si A4 entró antes, F7b porta sus estados y sus textos de la revisión de `lab.js` como comportamiento vigente, con sus E2E (ruling C4).
  - Borra: en F7a, `window.TallerRunner` con `register-runner.ts`; en F7b, `frontend/lab.js`, `lab-explorers.js` y `quest-explorers.js` (`lab.css` y `quest-explorers.css` se mudan sin editarse a `pages/lab/ui/`); los dos `style=` de la fase de reflexión; los globals `TallerExplorers`, `TallerQuestExplorers` y `TallerEditor`, con `register-editor.ts`; y los métodos de HTML de los adaptadores de F5 y F6 (`exerciseContextHTML` y `lockedExerciseHTML`), que el lab React reemplaza por datos.
  - Conserva: `TallerLab` con `mount` y `unmount` hasta F10, y lo que lee `app.js` (la tabla «Qué queda en `window.*`» de la [spec 021](../021-f7-laboratorio/spec.md)).
  - Fuera: el cambio de transporte a `/api/runs`, que es A4: no cambia sólo el adaptador, y lo que toma de F7 está en la [spec 017](../017-a4-laboratorio-sandbox/spec.md) y en la tabla F7-S1 a F7-S9; la regla de evidencia; el debounce de la escritura por tecla.
- **F8:**
  - Entra: la página y el panel de respaldos; la interfaz de exportar, importar (`#import-file`) y «Borrar todo» con su confirmación; las notas (`#note-learned` y `#note-next`), su estado (`#note-state`) y el pedido al tutor, que dibuja Método y no Recorrido (F9-Q1 y ruling C3); el CSS que sólo usa la página, mudado a su hoja (X3); los E2E, con la descarga y la carga de archivo.
  - Propuesta de la spec de D1, sin aceptar: F8 depende de D1b, y «Borrar todo» pide la contraseña de la cuenta (superficie 4 de «Superficies que pide D1»). La alternativa es portar el flujo local tal como está y dejar la contraseña para F13, y entonces F8 no espera a D1b.
  - Borra: `renderMethod`, `backupsPanel`, los manejadores de `#export-progress`, `#cancel-reset`, `#confirm-reset` e `#import-file`, el `#confirm-dialog` estático y el `style=` de la página.
  - Conserva: el toast del shell, hasta F10.
- **F9:**
  - Entra: pasos, temporizador (sin el `setInterval` global) y el diálogo de lección, que devuelve el foco a quien lo abrió, dentro de la raíz de la página con un portal a `body`, y que se cierra al navegar (F9-Q4); `#quiz-feedback`, que se sigue recreando en cada apertura hasta F10 (X2); el CSS que sólo usa la página, mudado a su hoja (X3); los E2E.
  - Borra: `renderRoute`, `timerMarkup`, `updateTimer` con su `setInterval` de 500 ms, `openLesson` y `#lesson-dialog`.
  - Fuera: cambiar el contenido del recorrido; las notas, su estado y el pedido al tutor, que dibuja Método y van a F8 (F9-Q1): F9 sólo garantiza que siguen por `routeStore`.
- **F10:**
  - Entra: un spike previo del router (ver «Decisiones abiertas»); una sola raíz con el shell (sidebar, navegación, `skip-link`, idioma, `#toast` y diálogos), con el Atlas montado debajo; `syncLinkedLanguage` en el router; los conteos del nav derivados del catálogo; `#quiz-feedback` montada, con su regla `:empty` (X2); los E2E del arranque en lugar de `boot-check` y `load-order-check`.
  - Borra: `frontend/app.js`, todo `window.Taller*` de vistas, los `register-*` que los publicaban y las reglas de `styles.css` que ya nadie use; `styles.css` conserva los tokens y las clases base.
  - Hereda: Zustand, que entra con F2a (unidad 1; decisión del usuario del 2026-10-06), y nuqs, que instala F3 o F5, el primero que se integre (F3-Q1 y F5-Q3). F10 ya no decide si entra nuqs.
- **F11** (partida en F11a, F11b, F11c y F11d, P1):
  - Entra: las pantallas de cuenta (la decisión de dónde viven está en «Pantallas de acceso»), que arrancan antes de evaluar el shell legacy. Borran de la URL, con `history.replaceState` y antes de que `app.js` mire el hash, los fragmentos con token (`#invitacion=<token>` y el de recuperación de contraseña). Las partes:
    - F11a, el acceso: las etapas de los tokens y de la sesión, «pedir el ingreso», el cliente de la API, el ingreso, el alta por invitación, restablecer la contraseña con el enlace de la consola, el aviso de privacidad, la entrada a «Tu cuenta» y «Salir». La sesión es obligatoria desde F11a: pide `GET /api/session` en cada arranque y, sin sesión, muestra el ingreso (F11-Q1). Con el ruling C1, F11a introduce la etapa de sesión, el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión para que los 123 escenarios no se editen, y el proxy de `/api/` de la vista previa y de `npm run dev`; A3 extiende esa etapa. «Pedir el ingreso» es una operación que se espera y termina con la cuenta, y la etapa de sesión la llama cada vez que recibe `user: null`, al arrancar y después de un 401 (R1). El aviso de privacidad es un archivo del front con su texto y su versión, con la misma `PRIVACY_VERSION` en `.env` (F11-Q2). «Tu cuenta» es un botón de la barra superior, junto al selector de lenguaje, que abre un diálogo modal (F11-Q3). «Salir» no toca el progreso local antes de D1c, y «Tu cuenta» lo avisa junto al botón (F11-Q4, ADR 0003).
    - F11b, la cuenta: cambiar la contraseña, descargar los datos y borrar la cuenta.
    - F11c, recuperar la contraseña por correo.
    - F11d, lo de D1 (superficies 1 y 2 de «Superficies que pide D1»): la opción «computadora compartida», que se elige en «Tu cuenta» y al activarse borra el espacio local de la cuenta, incluida la copia del contenido de A3 (F11-Q5), y el resumen con la pregunta «¿Este progreso es tuyo?» al importar el v1.
    - Los E2E de cada parte.
  - Fuera: las pantallas de administración (F12); la API, que es de C3a y C3b (C3a va sin Fortify por decisión del usuario del 2026-10-05: las pantallas siguen el contrato de su spec y no las rutas por omisión de Fortify).
  - Formularios: con una librería establecida, no con estado de formulario propio (pedido del usuario, 2026-10-06). La recomendada es React Hook Form:
    - trabaja con inputs no controlados;
    - `setError` vuelca en cada campo los `errors.<campo>` del 422 de la API, y deja en `root.serverError` los 401, 409, 419 y 429 (`{message, code}`);
    - los errores salen accesibles, con `aria-invalid` y `role="alert"`.

    TanStack Form es la alternativa. El servidor es la autoridad de la política de contraseñas (la lista bloqueada, el nombre y el email): el cliente sólo valida lo obligatorio y el largo de 15 a 64, sin un esquema propio. La spec de F11 confirma React Hook Form; su versión 7.89.0 pesa unos 43 KB minificada según bundlephobia, más de un tercio del margen del HTML, y el plan la mide en `dist/index.html`. Se instala con el primer formulario, en F11a, y con permiso.
  - Dependencias: F11a espera a A2 y a C3a; F11b, a F11a y a C3b; F11c, a F11a y a C3c, que espera el dominio; F11d, a F11a y a D1c. A3 espera sólo a F11a, y así desaparece el ciclo A3 → F11 → D1c → A4 → A3 (P1). F11b, F11c y F11d tocan el diálogo «Tu cuenta» y el ingreso que deja F11a, así que se integran después y de a una.
- **F12:**
  - Entra: las pantallas de administración de usuarios e invitaciones que consuman `/api/admin` de C3b (el detalle sale de la spec de C3b); los E2E.
  - Fuera: las estadísticas del admin (C5); la API (C3b); las pantallas de cuenta (F11).
  - No bloquea a ningún otro ítem del front. Dónde se monta, y si C4 la espera, son decisiones abiertas.
- **F13 (propuesta, sin aceptar):**
  - Entra: el estado de sincronización en el shell (hoy `#save-label` dice «Guardado en este navegador»), el aviso al salir con la cola sin enviar (conservar o descartar) y los avisos de cuenta distinta, de época cambiada y de reloj desfasado; los E2E.
  - Fuera: el cliente v2 y su contrato (D1c); la confirmación de contraseña de «Borrar todo» (F8); la opción «computadora compartida» y la pregunta de la importación (F11d).
  - Existe sólo si el usuario acepta la partición de D1; si no, estas superficies se reparten entre F10 y F8.

## Ítems del backend que tocan el front

La hoja de ruta del backend es la dueña de estos ítems. Acá sólo se cablean las dependencias.

| Ítem | Qué toca del front | Relación con esta hoja de ruta |
| --- | --- | --- |
| A2 | El arranque: que el front espere el contenido antes de evaluar las vistas legacy y que el HTML deje de embeberlo | Espera a F1 y a F2 (unidades 1 a 4): el catálogo es un módulo que A2 vuelve asíncrono y el arranque de `app.js` es una función explícita que A2 difiere. Lo esperan F10 (aloja el shell en su arranque) y F11a |
| A3 | Que el front lea las 17 porciones con el protocolo de arranque | Espera a A2, a C3a y a F11a, el acceso (P1 y A3-Q1): sin ingreso no hay sesión, y C3a deja el contenido detrás de ella. No espera a F11b, F11c ni F11d, así que desaparece el ciclo A3 → F11 → D1c → A4 → A3. Extiende la etapa de sesión que introduce F11a (ruling C1) con la `Content-Version` de las porciones y, ante un 401 en una porción, llama a «pedir el ingreso» ([spec 016](../016-a3-contenido-api/spec.md)) |
| A4 | Que el laboratorio use `/api/runs` | Espera a F7a y a B3, no a F7b (ruling C4 y A4-Q5): toma el puerto de `features/run-exercise` que deja F7a. No cambia sólo el adaptador: suma `attemptId` a la ejecución de la API (A4-Q1) y retira los Playgrounds (A4-Q2); lo que toma de F7 está en la [spec 017](../017-a4-laboratorio-sandbox/spec.md) y en la tabla F7-S1 a F7-S9. Sus estados y sus textos los dibuja la vista vigente cuando entra: la revisión de `lab.js` si F7b todavía no entró, y entonces F7b los porta con sus E2E, o la página React si ya entró |
| C3a | La API de identidad y acceso: no incluye pantallas | Las pantallas de cuenta son F11 |
| C3b | El correo, la administración de usuarios e invitaciones y el ciclo de vida de la cuenta: no incluye pantallas | Las de administración son F12; exportar y borrar la cuenta, F11b |
| C4 | CSP sin `'unsafe-inline'` | Ya no espera a ningún port: su clarify (Q3) conservó `style-src-attr 'unsafe-inline'`, así que los cuatro `style=` de las plantillas legacy (uno en Sistemas, dos en el laboratorio y uno en Método) no la bloquean. F5, F7 y F8 igual los retiran, por su alcance. Con los Playgrounds retirados (A4-Q2), la CSP queda estricta. Recomendación de B3: B3 en verde antes de la compuerta G2 de C4 |
| D1 | El cliente v2, con espacios por cuenta (D1c, en la partición que propone la spec de D1 y que el usuario no aceptó) | Se apoya en los almacenes con suscripción (unidad 1 de F2) y en la interfaz de `features/progress-backup` (unidad 6), y espera a F11a, a A3 y a A4; F11d entra en servicio con D1c. D1c enmienda el FR-070 de D1 por F11-Q5. Sus superficies de vista están en «Superficies que pide D1» |
| E1 | Esenciales suma un catálogo | Los conteos del nav (4, 25 y 274), «24 misiones» y «/180» salen del catálogo (F6 y F10) o se actualizan a mano con E1 |

## Pantallas de acceso (A3 y C3)

**Decisión de la planificación, que el usuario no confirmó: entran como una raíz de React previa al shell (F11) y no esperan al paso del shell (F10).**

- **Motivo principal, la cadena del backend.** C3a deja el contenido detrás de la sesión (sin sesión, 401) y A3 lo lee. Si el login esperara a F10, el último ítem del épico, A3 esperaría a todo el port. Con A3 esperarían A4 y C4, que dependen de él, y D1, cuyo cliente por cuenta también necesita un login en el navegador.
- **No toca el shell legacy.** La raíz previa decide antes de evaluar `app.js`: sin sesión, dibuja sólo el acceso y el resto no se evalúa; con sesión, sigue el arranque de A2 (contenido y vistas). F11 no depende de ninguna vista portada, sólo del arranque explícito de A2.
- **Protege los fragmentos con token.** Hoy un `#invitacion=<token>` caería en `#recorrido` y el token quedaría en la URL (mapa, §4). El enlace de recuperación de contraseña también viaja en el fragmento (ADR 0006, §4.3). La raíz previa los lee y los borra con `history.replaceState` antes de que `app.js` mire el hash.
- **El costo:** hasta F10 hay dos puntos de montaje de React, el acceso y la vista que esté montada. F11 vive en `pages/` como cualquier página, con su modelo y su interfaz propios; F10 decide si pasa a ser una ruta de la raíz única o si sigue siendo la compuerta. Lo que cambia es el punto de montaje, no el código.
- **Descartadas:** esperar a F10, por lo que bloquea; y dibujar el login con `innerHTML` en el shell legacy, que es código que se tira y contradice «el código nuevo usa React».
- **Las otras pantallas de cuenta y las de administración (decidido el 2026-10-05).** F11 incluye todas las de cuenta: login, invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta y el aviso de privacidad. F12, un ítem nuevo, cubre las de administración (usuarios e invitaciones) y depende de C3b. La ubicación de las pantallas, una raíz previa al shell, sigue siendo una propuesta que el usuario no confirmó (la hoja de ruta del backend lo dice).
- **El clarify de F11 (2026-10-28).** F11 se parte en F11a (acceso), F11b (cuenta), F11c (correo) y F11d (lo de D1), y A3 espera sólo a F11a (P1). La sesión es obligatoria desde F11a, que introduce la etapa de sesión y «pedir el ingreso»; A3 la extiende (F11-Q1, R1 y ruling C1). La entrada a «Tu cuenta» es un botón de la barra superior que abre un diálogo modal (F11-Q3). El detalle está en la [spec 015](../015-f11-acceso-cuenta/spec.md).

## Superficies que pide D1

La spec de D1 (borrador en otra rama, sin clarify) fija el estado y el contrato de cinco superficies de vista que ningún ítem del front tenía. Propone partir D1 en D1a (servidor), D1b (importación y reset) y D1c (cliente v2); el usuario no aceptó esa partición. Si la rechaza, D1b y D1c se leen como D1. Esto es una propuesta de dónde va cada una, para que el usuario la decida:

| Superficie | Dónde va | Depende de |
| --- | --- | --- |
| 1. La opción «computadora compartida», en «Tu cuenta» (F11-Q5) | F11d | D1c |
| 2. El resumen y la pregunta «¿Este progreso es tuyo?» al importar el v1 | F11d | D1b y D1c |
| 3. El aviso al salir con la cola sin enviar | F13 (propuesta) | D1c y F11 |
| 4. La confirmación de contraseña de «Borrar todo» | F8, a decidir en su spec | D1b (propuesta de D1: F8 depende de D1b) |
| 5. El estado de sincronización y los avisos de cuenta distinta, época cambiada y reloj desfasado | F13 (propuesta) | D1c y F10 |

- **La superficie 1, en «Tu cuenta» (F11-Q5):** al activar «computadora compartida», el cliente borra en ese momento el espacio local de la cuenta, incluida la copia del contenido de A3. El FR-070 de D1, que elegía el modo antes de guardar, se enmienda en D1c.
- **Por qué un ítem nuevo y no F10 para la 3 y la 5:** F10 es el último del tronco del front y no debería esperar a D1c, que depende del backend. F13 cuelga del shell ya portado (F10) y del cliente v2.
- **Por qué la 4 en F8:** «Borrar todo» vive en Método. La alternativa es que F8 porte el flujo local tal como está y F13 lo cambie por el reset con contraseña, para que F8 no espere a D1b.
- **Interfaz de F2:** la unidad 6 (`features/progress-backup`) tiene que dejar una interfaz que D1c reemplace sin reescribir las vistas, y las unidades 1 y 6 son lo que D1c pide a F2.

## Orden y paralelismo

- **Tronco del front:** F1 → F2a → F2b → (F5, F6 y F7a) → F7b → F8 → F10. A2 entra después de la unidad 4 de F2, antes de F3 (decisión del usuario: A2 temprano). F3, F4, F9 y F11a cuelgan de F2a y arrancan apenas F2a está en `master`; F9 depende sólo de F2a y sale del tramo 4, donde estaba. F7a corre en paralelo con F5 y F6, porque no toca la vista, los puentes ni los adaptadores de campaña y Sistemas; F7b espera a F5, F6 y F7a. F11b, F11c, F11d, F12 y F13 corren aparte. A4 va después de F7a y de B3, no de F7b (ruling C4 y A4-Q5).
- **Por qué de a uno:** F3 a F9 no se esperan por datos, pero cada una toca `app.js` y `main.tsx`, que se integran de a uno; F7a también, porque comparte `legacy-views.ts` y `qa/` con ellos. Si A2 se demora por su spike, F3 a F6 pueden empezar igual porque no dependen de él. F7b no empieza antes de F5 y F6, por la regla de las hojas primero, que no ata a F7a.
- **Tramos,** en paralelo con las olas del backend (un tramo arranca cuando se cumple su condición, y los ítems se integran de a uno):

| Tramo | Ítems | Corre con (backend) | Condición |
| --- | --- | --- | --- |
| 1 | F1, F2 y A2 | Ola 2: C3 y C6 | Cumplida el 2026-10-05: el usuario aceptó el ADR 0008 y autorizó las descargas de F1 |
| 2 | F3, F4, F9 y F11a | Ola 3: B2 y A3 | F2a en `master`, que llega con A2 en el PR #40; F11a también necesita C3a, y A3 lo espera |
| 3 | F5, F6 y F7a | Ola 4: B3, que va antes que A4, en paralelo con F5, F6 y F7 | F2b entregado |
| 4 | F7b | Ola 4: D1, C4 y A4, que espera a F7a y a B3 | F5, F6 y F7a entregados |
| 5 | F8 y F10 | Ola 5: C5 y E1 | F7b entregado; F10 también necesita F3 a F9 y A2 |
| Aparte | F11b, F11c, F11d, F12 y F13 | Cuando C3b (F11b y F12), C3c con el dominio (F11c) y D1c (F11d y F13) estén entregados | Las partes de F11 necesitan F11a; F12, F11; F13, F10 y F11. Ninguno bloquea a otro ítem del front |

- **Archivos que comparten los dos épicos:** `package.json` y `.github/workflows/ci.yml` (F1 suma el E2E al job `front` y C6 toca el job `api`), y la documentación. Los integra el agente principal.

## Acciones del usuario (los agentes no las hacen)

| Cuándo | Acción |
| --- | --- |
| Siempre | Cada descarga (paquetes npm, navegadores o imágenes) pide permiso con nombre, origen y tamaño antes de bajarse. |
| Ahora | Ratificar la constitución 1.4.1 (la 1.4.0 y el ADR 0008 ya los aceptó el 2026-10-05). Aceptar o rechazar la partición de D1 y el ítem F13; decidir dónde se monta F12 y si C4 lo espera. |
| F1 (implementación) | Autorizado el 2026-10-05: `vitest` 5.0.3 y `@playwright/test` 1.63.0 desde el registro de npm (19 paquetes con sus dependencias, unos 22,4 MB desempaquetados y 5,0 MB comprimidos, estimación) y, con `npx playwright install --only-shell chromium`, el Chrome Headless Shell 153.0.8010.12 (119,8 MB) y ffmpeg (2,4 MB) del CDN de Playwright. Las descargas las hace el coordinador en la primera tarea del plan. Si faltan librerías del sistema, `install-deps` pide `sudo` y baja paquetes de apt (sin medir): en la CI lo hace el paso `--with-deps`. |
| El primer port con specs de componentes (el primero de F3, F4, F5, F6, F7, F9 y F11a que se integre) | Permiso para `jsdom` 30.1.2 y Testing Library (`@testing-library/react`, `dom`, `user-event` y `jest-dom`): 56 paquetes, unos 26,3 MB sin comprimir y 5,0 MB comprimidos (estimación del ADR 0008). Si una fábrica se gana su lugar, `fishery` 2.4.0: 2 paquetes, unos 0,19 MB. |
| F3 o F5, el primero que se integre | Permiso para `nuqs`, con versión exacta y su peso medido antes contra el tope del HTML. |
| Cada port con regiones vivas (X2) | La comprobación manual con lector de pantalla, antes sobre el legacy y después sobre la página. |
| F10 | Permiso para el router que elija el spike, con su peso medido antes. Zustand ya lo instala F2a, y nuqs, F3 o F5. |
| F11a | Confirmar la ubicación de las pantallas de cuenta (una raíz previa al shell). El texto del aviso de privacidad y la misma `PRIVACY_VERSION` en `.env` (F11-Q2). Permiso para `react-hook-form` 7.89.0 (MIT, sin dependencias, 1 527 796 bytes desempaquetados). |

## Criterios de aceptación globales

- **Todo port (F3 a F10):**
  - los E2E de su vista pasan sobre el legacy antes del cambio y siguen pasando, sin editarse, sobre la vista portada; si hay que editar uno, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. La excepción son los E2E de lo que cambia por X1, que fallan contra el legacy y van en el commit en rojo del TDD;
  - el progreso, los IDs y las URLs no cambian: las fixtures `qa/fixtures/progress-*.json` arrancan sin escribir, sin respaldar y sin avisar (ADR 0003), `curriculum-ids-check` sigue en verde, y las ocho vistas por hash y las seis formas de URL con query (mapa, §4) llevan adonde llevaban. La excepción es F3: los filtros de la Biblioteca pasan a la URL, con una forma nueva en `url-grammar` y su caso en `url-contract`, sin editar los existentes (F3-Q1);
  - el PR borra el JS y el CSS de su vista y deja sólo el adaptador mínimo que otra vista legacy todavía consuma, con el ítem que lo retira;
  - cumple X1, X2 y X3 («Criterios de todo port», en «Convenciones»);
  - se conservan la navegación por teclado, el foco visible, el diálogo que devuelve el foco, el diseño móvil y el movimiento reducido;
  - `dist/index.html` queda bajo el tope de `qa/build-check` que deja A2: `BOOT_SIZE_LIMIT`, 1 250 000 caracteres. Con F2b mide 1 141 337 (medida del coordinador), así que quedan unos 108 000 para F3 a F11 y A3, y cada dependencia de runtime nueva (nuqs, React Hook Form) se mide antes de entrar;
  - el código nuevo no suma funciones de complejidad mayor que 10 sin justificarlo en la revisión, y los 29 avisos de las seis vistas desaparecen con ellas.
- **F2:** `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después, y los E2E de F1 pasan sin editarse.
- **Todo ítem** cierra con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y, desde F1, `npm run test:e2e`, que también corre en la CI. La imagen web (`frontend/Dockerfile`) sigue construyendo: su etapa de build corre `npm test`.

## Decisiones abiertas

Se cierran en el paso clarify de la spec de cada ítem.

| Ítem | Preguntas |
| --- | --- |
| F1 | Cerradas en su clarify (2026-10-05): las cinco de su spec, todas con la opción recomendada |
| F2 | Cerradas en su clarify (2026-10-06): la partición en F2a (unidades 1 a 4) y F2b (5 a 8); Q1, el tipo de explorador, con un mapa explícito por ID en el front y una fixture congelada, sin tocar `content/`; Q2, la inversión de las pruebas de riesgo de F1; Q3, la suscripción con Zustand (el store guarda sólo la revisión: lectura confirmada por el usuario); y Q4, `progress-backup` con promesas y confirmación en «Borrar todo». Todas con la opción recomendada salvo Q3 |
| Ports (X1 a X3) | Cerradas en el clarify del 2026-10-28, para todo port: X1, con el ruling C2, adopta el comportamiento de React en lo que existe sólo por `innerHTML`; X2 monta las regiones vivas, salvo `#quiz-feedback` hasta F10; X3 muda con cada port de `app.js` el CSS que sólo usa su página («Convenciones») |
| F3 | Cerradas en su clarify (2026-10-28): Q1, los filtros en la URL con nuqs; Q2, el CSS se muda con la página (X3); Q3, el detalle abierto queda abierto y el foco no se pierde (X1). Q1 y Q2 no eran las recomendadas |
| F4 | Cerradas en su clarify (2026-10-28): el fixture de los 10 IDs ya lo fijó F2a (`MILESTONE_IDS`); Q1, los textos de los hitos en una configuración de `entities/guide`; Q2, el CSS se muda con la página (X3); Q3, las pistas abiertas siguen abiertas (X1); Q4, una pista por idioma para el primer hito, en F4. Q3 y Q4 no eran las recomendadas |
| F5 | Cerradas en su clarify (2026-10-28): Q1, la sesión de simulaciones en `pages/systems/model`, alcanzable por `window.TallerSystems.resetSimulations()`; Q2, la propiedad `style` de React con el color saneado; Q3, `taller` y `parte` en la URL con nuqs, que no era la recomendada |
| F6 | Cerradas en su clarify (2026-10-28): Q1, los numerales y las constantes se derivan del catálogo y las palabras que repiten un conteo quedan como texto editorial, con una spec de coherencia; Q2, la retroalimentación del checkpoint, montada (X2); Q3, los `<details>` quedan abiertos (X1) |
| F7 | Cerradas en su clarify (2026-10-28): Q1, se conserva `solvedAt`; Q2, un canal de progreso y la cancelación, con una unión ampliable; Q3, el comportamiento de React (X1), que no era la recomendada; Q4, la partición en F7a y F7b (P2). La spec resuelve el editor con un hook que expone un callback de cambio |
| F8 | Si «Borrar todo» pide la contraseña de la cuenta y F8 espera a D1b (superficie 4), o porta el flujo local y la contraseña queda para F13. Se decide en su spec |
| F9 | Cerradas en su clarify (2026-10-28): Q1, las notas van a F8; Q2, el CSS se muda con la página (X3), que no era la recomendada; Q3, `#quiz-feedback` se sigue recreando hasta F10 (X2); Q4, el diálogo de la lección en la raíz de la página, con un portal a `body` |
| F10 | El router, con un spike: el contrato (la vista en el hash, la query antes del hash y `#invitacion=` en el hash) descarta un router por path, y `createHashRouter` lee la ruta dentro del hash. nuqs ya no se decide acá: lo hereda de F3 o F5. Los conteos del nav (`.nav-count` 4 y 25, `.lab-nav-count` 274) derivados del catálogo. Si F11 pasa a ser una ruta de la raíz única. Si un `import()` dinámico genera un chunk que `vite-plugin-singlefile` no inlinea (lo comparte con A2) |
| F11 | Cerradas en su clarify (2026-10-28): P1, la partición en F11a a F11d, con A3 esperando sólo a F11a; R1, «pedir el ingreso»; Q1, la sesión obligatoria desde F11a, que no era la recomendada; Q2, el aviso de privacidad en un archivo del front; Q3, «Tu cuenta» en la barra superior; Q4, «Salir» no toca el progreso local antes de D1c; Q5, «computadora compartida» en «Tu cuenta», que no era la recomendada |
| F12 | Dónde se monta (una raíz previa como F11 o una ruta de la raíz única de F10) y si C4 la espera, porque sin administración no se expone el taller |
| F13 | Si el usuario acepta la partición de D1 y, con ella, el ítem y qué superficies lleva (la 3 y la 5, o también la 4) |
| Transversales | Cablear D1, C4 y E1 en la hoja de ruta del backend (A4 va después de F7a y de B3: ruling C4 y A4-Q5) |

## Estado y evidencia

- **2026-10-05, planificación.** El [mapa](legacy-map.md) sale de una lectura completa del código legacy en `8f1bdbc`. Los conteos de líneas de las seis vistas (750, 1 227, 203, 376, 255 y 296) coinciden con `ca9e619`, y 21 de sus identificadores siguen existiendo. Se midieron, sin instalar ni bajar nada, los tamaños del ADR 0008: 77 paquetes y 48,9 MB para la pila completa, y 122,2 MB para el navegador con `--only-shell`. La imagen que fija `frontend/Dockerfile` es `node:24.21.0-alpine`, que cumple lo que pide `jsdom` 30.1.2. El tamaño actual del HTML (2 202 074 bytes) sale de la evidencia de A1 en la hoja de ruta del backend; no se reconstruyó.
- **Sin verificar:** que CodeMirror 6 corra en jsdom; los tiempos de la CI y del paso de instalación del navegador (la suite local de F1 tarda unos 12 s con 8 workers y unos 35 s con uno); que `import()` dinámico y `vite-plugin-singlefile` convivan (A2); el tamaño real del build con nuqs (F3 o F5) o con un router (F10); y qué anuncia un lector de pantalla con las regiones vivas montadas (X2).
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
- **2026-10-06, F2 especificada y F2a planificada.** La spec de F2 (`specs/009-f2-seams/`) define ocho unidades y los seis contratos que espera A2 (F2-I1 a F2-I6). El clarify partió F2 en F2a y F2b y eligió Zustand para la suscripción. El plan de F2a tiene 19 tareas, con una compuerta por unidad (la red de F1, cinco oráculos idénticos y un tope de tamaño de `dist/index.html`) y una comparación única de la lógica que mueve cada unidad. El análisis cubrió 42 de 42 requisitos.
- **2026-10-06, F2b planificada.** El plan de las unidades 5 a 8 (`plan-f2b.md`, T020 a T038) tiene cinco dueños en la onda 1 y abre los PR en el orden 8 → 5 → 7 → 6. Se prototipó cada unidad en copias descartables de la base con F2a: las comparaciones dieron 0 diferencias (2 569 URL, 2 214 HTML y el barrido de estilo computado de la unidad 8), y el HTML crece 4 266 caracteres en toda F2b. Sin correr: la comparación de la unidad 6, la regla R6 del guard, las specs nuevas salvo la de aislamiento, Docker, la CI y macOS. El usuario aceptó la segunda API pública sin estado en tres slices y confirmó que ningún check se retira.
- **2026-10-28, clarify de diez specs.** F3 (spec 012, PR #46), F4 (013, #47), F9 (014, #48), F11 (015, #51), F5 (018, #52), F6 (019, #53) y F7 (021, #55) del front, y A3 (016, #49), A4 (017, #50) y B3 (020, #54) del backend, se especificaron en paralelo, y el usuario respondió su clarify el 2026-10-28, con brainstorming. Ninguna tiene plan. Lo que decidió, una línea por tema:
  - **Ports (X1 a X3):** el comportamiento de React donde `innerHTML` rehacía la vista; las regiones vivas montadas, salvo `#quiz-feedback` hasta F10; el CSS de cada página de `app.js` se muda con su port.
  - **F11 y A3:** F11 se parte en F11a a F11d y A3 espera sólo a F11a (P1); «pedir el ingreso» une las dos specs (R1); la sesión es obligatoria desde F11a, y la vista previa pasa `/api/` al stack (F11-Q1 y A3-Q3); el aviso de privacidad en un archivo del front, con `PRIVACY_VERSION` en `.env`; «Tu cuenta» en la barra superior; «Salir» no toca el progreso local antes de D1c; «computadora compartida» en «Tu cuenta», y el FR-070 de D1 se enmienda en D1c.
  - **La copia de A3:** sólo la usa quien no cerró su sesión, y vive en IndexedDB.
  - **A4:** suma `attemptId` a la ejecución; retira los Playgrounds del todo; espera con la fila visible, el aviso a los 15 s y la espera de turno; oculta el número de intentos hasta D1c; espera a B3.
  - **B3:** un inicial falla por sus pruebas, salvo `kind: reparar`; corre en local con runsc; es obligatoria en los PR que tocan lo auditado y condición de A4; reporta el tiempo y la memoria sólo como OOM; verifica la prueba propia con una muestra de 4 programas. La Q2 tiene una discrepancia abierta (hoja de ruta del backend).
  - **F7:** se parte en F7a y F7b (P2); conserva `solvedAt`; un canal de progreso con una unión ampliable para los estados de A4.
  - **F5:** la sesión de simulaciones en la página; el `style` de React con el color saneado; nuqs para `taller` y `parte`.
  - **F3:** los filtros en la URL con nuqs.
  - **F4:** los textos de los hitos en `entities/guide`; una pista por idioma en el primer hito.
  - **F6:** las palabras que repiten un conteo quedan como texto editorial, con una spec de coherencia.
  - **F9:** las notas van a F8; el diálogo de la lección en la raíz de la página, con un portal a `body`.
  - **Rulings del coordinador:** C1, F11a introduce la etapa de sesión, el doble de la API y el proxy de `/api/`, y A3 la extiende; C2, el criterio de X1 vale para todo port, y las rarezas de lógica se conservan; C3, F8 muda su CSS y suma las notas, su estado y el pedido al tutor; C4, A4 espera a F7a y a B3, no a F7b, y sus estados los dibuja la vista vigente cuando entra.
- **Orden de especificación:** F1 está implementada (#23) y F2a, planificada; F2b se planifica después de F2a. Los diez ítems de la entrada del 2026-10-28 se especificaron en paralelo, no de a uno.

## Enmiendas pendientes

El ADR 0008 se aceptó el 2026-10-05 y su documentación ya está registrada (`AGENTS.md`, `qa/AGENTS.md`, el «Alcance» de `docs/agent-skills.md` y el principio II, en la constitución 1.4.1). F1 reemplaza el aviso «hasta que se integre, no existen» por los comandos reales.

Al integrar las dos hojas de ruta, falta ajustar la del backend en lo que esta cableó sólo en parte:

- D1 y E1 no citan a F2, F5, F7, F8 ni los conteos del catálogo (C4 ya no los necesita: su Q3 conservó `style-src-attr 'unsafe-inline'`);
- «Acciones del usuario» dice que `npm ci` baja 243 dependencias: con la pila de pruebas son hasta 320;
- el alcance de C3 y su fila de «Acciones del usuario» todavía hablan de Fortify, y C3a va sin Fortify por decisión del usuario (a corregir al integrar la rama de C3).
