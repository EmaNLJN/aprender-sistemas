# Hoja de ruta: Port del front legacy a React

Épico que lleva las seis vistas legacy del taller (`frontend/app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js`) a React con TypeScript, una vista por PR y sin que el alumno note el cambio: se conservan el aspecto, el comportamiento, el progreso guardado, los IDs y las URLs.

- **Fuente técnica:** el [mapa del front legacy](legacy-map.md), con lo que hace cada vista, sus globals, su DOM, sus URLs, su persistencia y sus puntos calientes; el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), en estado «propuesta» (hasta que se apruebe, cada spec lo usa como base y lo dice); los [ADR 0001](../../docs/adr/0001-react-vite-y-backend-diferido.md), [0003](../../docs/adr/0003-integridad-del-progreso.md) y [0007](../../docs/adr/0007-organizacion-del-repositorio.md); [`docs/architecture.md`](../../docs/architecture.md) y [`docs/refactor-roadmap.md`](../../docs/refactor-roadmap.md).
- **Camino decidido por el usuario (2026-10-05):** red y seams primero; después las vistas una por una, las hojas primero y cada raíz de React dentro del shell legacy; el shell y el router al final, con una sola raíz. A2 va temprano. Quedan descartados el shell primero y la reescritura en paralelo.
- **Corre en paralelo con** la [hoja de ruta del backend](../backend-multiusuario/roadmap.md), que sigue con C3 y C6. Los ítems A2, A3, A4 y C3 pertenecen a esa hoja de ruta y se referencian acá; no se duplican.
- **Flujo:** Spec Kit, con la [constitución](../../.specify/memory/constitution.md) como compuerta de cada plan.

## Vocabulario

- **Port:** pasar una vista de JavaScript legacy a React sin cambiar lo que el alumno ve ni lo que guarda.
- **Red:** las pruebas que fijan el comportamiento actual antes de tocar el código: E2E en un navegador real y specs de Vitest.
- **Seam:** el módulo con nombre y contrato que reemplaza una lectura de `window` o un acoplamiento entre vistas, de modo que se pueda cambiar un lado sin editar el otro.
- **Puente:** el contrato de HTML, URL o datos por el que una vista legacy usa a otra (mapa, §3.2).
- **Adaptador mínimo:** lo que sigue publicado en `window.Taller*` (o en `frontend/src/app/legacy/`) mientras una vista legacy lo consuma, con sólo esos métodos.
- **Raíz:** una raíz de React (`createRoot`) que monta una vista o, al final, todo el shell.

## Convenciones

- **IDs estables:** F1…F11 no se renumeran ni se reutilizan. Un ítem nuevo recibe un ID nuevo. F11 existe porque ninguna hoja de ruta asignaba las pantallas de acceso, y no sigue el orden de ejecución: corre en el tramo 2.
- **Una spec por ítem,** en `specs/NNN-<id>-<nombre>/` (`NNN` es el orden de creación de Spec Kit, compartido con el backend). La línea `Input` de cada spec nombra el ID de su ítem; esta tabla enlaza la spec de vuelta.
- **Estados:** `Pendiente` (sin spec), `En especificación` (spec redactada, con preguntas abiertas o sin plan), `Planificado` (plan, tareas y análisis hechos), `En curso`, `Entregado`.
- **Entregado** exige la implementación integrada y la evidencia de QA: PR, commit y qué se ejecutó. Si algo quedó sin verificar, se escribe.
- **Persistencia flow-forward** (constitución, principio VIII): al entregar, el directorio de la feature queda inmutable. Un cambio sustancial es una spec nueva, enlazada a la original. Los bugs van a `.specify/bugs/<slug>/`.
- **Un PR por vista,** que se puede revertir entero y devuelve la vista legacy. Un port no mezcla seams ni cambios de comportamiento. Lo que cambia el comportamiento va en su propio commit, con TDD: primero se caracteriza lo actual y después la prueba cambia a propósito (`docs/refactor-roadmap.md`).
- **Qué borra un port y qué conserva.** Borra el JS y el CSS de su vista, y su global como implementación legacy. Pero otra vista legacy puede seguir consumiéndolo: el laboratorio usa métodos de campaña y de Sistemas hasta F7, y `app.js` llama a los `mount` hasta F10. En ese caso queda un adaptador mínimo con sólo esos métodos, y el PR dice cuáles son y qué ítem los retira. Biblioteca, Proyecto, Método y Recorrido no tienen JS, CSS ni global propios: son cierres de `app.js` y reglas de `styles.css`. Sus ports borran sus funciones, sus ramas en los delegados de `app.js` y las reglas que ninguna otra vista usa.
- **E2E primero.** El PR de un port abre con los E2E de comportamiento de su vista, escritos contra el legacy y en verde antes de portar. Pasan sin editarse después. Esto supone la respuesta recomendada a la Q1 del clarify de F1; si el usuario elige otra, esta convención se ajusta.
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
| F1 | Red de seguridad | Fijar en un navegador real lo que hace hoy el front (enlaces, recargas, arranque con progreso real, puentes entre vistas) y probar los dos riesgos altos del mapa, sin cambiar código de producción | ADR 0008 aprobado | Pendiente | — |
| F2 | Seams sin cambio visible | Dejar los almacenes, los motores, el catálogo, el arranque, los puentes y el respaldo como módulos importables, para portar cada vista sin tocar a las demás | F1 | Pendiente | — |
| F3 | Biblioteca | Portar la página de Biblioteca (búsqueda, filtros, favoritos y categorías) | F2 | Pendiente | — |
| F4 | Proyecto | Portar la página de Proyecto y sus hitos, con los 10 IDs de hitos fijados | F2 | Pendiente | — |
| F5 | Sistemas | Portar el catálogo y el taller de Sistemas | F2 | Pendiente | — |
| F6 | Campaña | Portar la campaña: héroe, mundos, misiones, vitrina y reglas | F2 | Pendiente | — |
| F7 | Laboratorio con exploradores | Portar el laboratorio con sus exploradores, el editor y la ejecución, con el transporte como interfaz | F2, F5, F6; coordina con A4 | Pendiente | — |
| F8 | Método | Portar Método: exportar, importar, borrar y respaldos | F2, F5, F7 | Pendiente | — |
| F9 | Recorrido | Portar Recorrido: pasos, temporizador, notas y lección | F2 | Pendiente | — |
| F10 | Shell y router | Una sola raíz de React con el shell y el router, y retirar `app.js` | F3 a F9, A2 | Pendiente | — |
| F11 | Acceso | Las pantallas de login e invitación, como una raíz previa al shell | A2, C3 | Pendiente | — |

El orden de F3 a F9 es el de las hojas primero: dependen de F2, no unas de otras, pero se integran de a uno (ver «Orden y paralelismo»).

## Alcance por ítem

Cada línea nombra lo que entra, lo que borra, lo que conserva y lo que queda fuera. Los detalles están en el [mapa](legacy-map.md) y se bajan a la spec de cada ítem.

- **F1:**
  - Entra: la adopción del ADR 0008 (Vitest en `node`, Playwright, los scripts, el paso de la CI y la documentación); la red E2E contra el legacy, con las ocho vistas por hash, las seis formas de URL con query, la recarga de los enlaces que cambian la query (detectando una recarga real del documento), el arranque con el progreso real de master y con el almacenamiento bloqueado, el contexto de campaña y de Sistemas dentro del laboratorio y el ciclo entre vistas; los Page Objects de lo que esos escenarios tocan; los Playgrounds simulados; dos specs de Vitest para los riesgos altos (la segunda instancia de un almacén y el motor usado antes de `init`); y la protección del aspecto que F2 necesita.
  - Fuera: cualquier cambio de código de producción, incluidos atributos de prueba; los flujos de comportamiento de cada vista, que trae cada port (Q1 de su spec); los seams (F2); el router (F10); `#invitacion=` (F11).
- **F2:**
  - Entra, en unidades que define el plan, cada una con su prueba y su punto de reversión (A2 espera las unidades 1 a 4):
    1. un almacén por clave, con suscripción (el del recorrido en `entities/guide` y el del laboratorio en `entities/exercise`), y los motores de campaña y Sistemas como singletons importables;
    2. el catálogo de los 274 ejercicios como módulo (`exercises` y `byId`), y `buildProgram` en `entities/exercise`;
    3. el arranque explícito: lo que `app.js` hace al evaluarse (los `init` de campaña y Sistemas, `loadWarning` y el primer render) pasa a una función que se llama en orden;
    4. el registro de modelos de Sistemas, en `entities/systems-simulation`;
    5. los puentes entre vistas como datos puros (contexto de misión, permiso, regreso y lista navegable) y la gramática de URL en `shared/config`;
    6. `features/progress-backup`: exportar, importar en dos fases, avisos, «Borrar todo» y respaldos;
    7. los modelos puros de los exploradores;
    8. las reglas de CSS que cruzan hojas, cada una a la hoja de su dueño.
  - Conserva: los `window.Taller*` que las vistas legacy leen, como adaptadores finos sobre los módulos. Las dos pruebas de Vitest de F1 se invierten en su commit TDD.
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
  - Fuera: el cambio de transporte a `/api/runs` (A4); la regla de evidencia; el debounce de la escritura por tecla.
- **F8:**
  - Entra: la página y el panel de respaldos; la interfaz de exportar, importar (`#import-file`) y «Borrar todo» con su confirmación; los E2E, con la descarga y la carga de archivo.
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
  - Entra: las pantallas de login e invitación (la decisión está en «Pantallas de acceso»), que arrancan antes de evaluar el shell legacy y que borran de la URL, con `history.replaceState` y antes de que `app.js` mire el hash, el fragmento con token (`#invitacion=<token>`, y el de recuperación si el alcance lo incluye); los E2E.
  - Fuera: las pantallas de cuenta y de administración que implica el ADR 0006 (decisión abierta); la API (C3).

## Ítems del backend que tocan el front

La hoja de ruta del backend es la dueña de estos ítems. Acá sólo se cablean las dependencias.

| Ítem | Qué toca del front | Relación con esta hoja de ruta |
| --- | --- | --- |
| A2 | El arranque: que el front espere el contenido antes de evaluar las vistas legacy y que el HTML deje de embeberlo | Espera a F1 y a F2 (unidades 1 a 4): el catálogo es un módulo que A2 vuelve asíncrono y el arranque de `app.js` es una función explícita que A2 difiere. Lo esperan F10 (aloja el shell en su arranque) y F11 |
| A3 | Que el front lea las 17 porciones con el protocolo de arranque | Espera a A2, a C3 y a F11: sin pantalla de acceso no hay sesión, y C3 deja el contenido detrás de ella |
| A4 | Que el laboratorio use `/api/runs` | Coordina con F7. El que llegue segundo lleva los cambios del otro en `lab.js` (el id del intento en `sanitizeResult` y la suma de `attempts`). Se recomienda F7 antes, para que A4 cambie un adaptador de `features/run-exercise` y no `runExercise` |
| C3 | La API de cuentas: no incluye pantallas | Las pantallas de login e invitación son F11 |
| C4 | CSP sin `'unsafe-inline'` | Los cuatro `style=` de las plantillas legacy la bloquearían (uno en Sistemas, dos en el laboratorio y uno en Método). C4 espera a F5, F7 y F8, o los reemplaza por clases en su PR |
| D1 | El cliente v2, con espacios por cuenta | Se apoya en los almacenes con suscripción de F2 |
| E1 | Esenciales suma un catálogo | Los conteos del nav (4, 25 y 274), «24 misiones» y «/180» salen del catálogo (F6 y F10) o se actualizan a mano con E1 |

## Pantallas de acceso (A3 y C3)

**Decisión: entran como una raíz de React previa al shell (F11) y no esperan al paso del shell (F10).**

- **Motivo principal, la cadena del backend.** C3 deja el contenido detrás de la sesión (sin sesión, 401) y A3 lo lee. Si el login esperara a F10, el último ítem del épico, A3 esperaría a todo el port. Con A3 esperarían A4 y C4, que dependen de él, y D1, cuyo cliente por cuenta también necesita un login en el navegador.
- **No toca el shell legacy.** La raíz previa decide antes de evaluar `app.js`: sin sesión, dibuja sólo el acceso y el resto no se evalúa; con sesión, sigue el arranque de A2 (contenido y vistas). F11 no depende de ninguna vista portada, sólo del arranque explícito de A2.
- **Protege los fragmentos con token.** Hoy un `#invitacion=<token>` caería en `#recorrido` y el token quedaría en la URL (mapa, §4). El enlace de recuperación de contraseña también viaja en el fragmento (ADR 0006, §4.3). La raíz previa los lee y los borra con `history.replaceState` antes de que `app.js` mire el hash.
- **El costo:** hasta F10 hay dos puntos de montaje de React, el acceso y la vista que esté montada. F11 vive en `pages/` como cualquier página, con su modelo y su interfaz propios; F10 decide si pasa a ser una ruta de la raíz única o si sigue siendo la compuerta. Lo que cambia es el punto de montaje, no el código.
- **Descartadas:** esperar a F10, por lo que bloquea; y dibujar el login con `innerHTML` en el shell legacy, que es código que se tira y contradice «el código nuevo usa React».
- **Un hueco que esta decisión no cierra.** Ninguna hoja de ruta asigna las otras pantallas de cuenta que el ADR 0006 implica: recuperar y cambiar la contraseña, confirmar la contraseña, exportar y borrar la cuenta, el aviso de privacidad y la administración de usuarios e invitaciones. Si el usuario quiere que F11 las incluya o que sean otro ítem, es una decisión abierta de F11.

## Orden y paralelismo

- **Tronco del front:** F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10. A2 entra después de la unidad 4 de F2, antes de F3 (decisión del usuario: A2 temprano), y F11 corre aparte.
- **Por qué de a uno:** F3 a F9 no se esperan por datos, pero cada una toca `app.js` y `main.tsx`, que se integran de a uno. Si A2 se demora por su spike, F3 a F6 pueden empezar igual porque no dependen de él. F7 no empieza antes de F5 y F6, por la regla de las hojas primero.
- **Tramos,** en paralelo con las olas del backend (un tramo arranca cuando termina el anterior):

| Tramo | Ítems | Corre con (backend) | Condición |
| --- | --- | --- | --- |
| 1 | F1, F2 y A2 | Ola 2: C3 y C6 | El usuario aprueba el ADR 0008 y autoriza las descargas de F1 |
| 2 | F3, F4, F5 y F6, y F11 | Ola 3: B2 y A3 | F2 entregado; F11 también necesita A2 y C3, y A3 lo espera |
| 3 | F7 | Ola 4: D1, C4, A4 y B3 | F5 y F6 entregados; A4 coordina con F7 |
| 4 | F8, F9 y F10 | Ola 5: C5 y E1 | F7 entregado; F10 también necesita A2 |

- **Archivos que comparten los dos épicos:** `package.json` y `.github/workflows/ci.yml` (F1 suma el E2E al job `front` y C6 toca el job `api`), y la documentación. Los integra el agente principal.

## Acciones del usuario (los agentes no las hacen)

| Cuándo | Acción |
| --- | --- |
| Siempre | Cada descarga (paquetes npm, navegadores o imágenes) pide permiso con nombre, origen y tamaño antes de bajarse. |
| Ahora | Aprobar o enmendar el ADR 0008. Ratificar la constitución 1.4.0. |
| F1 (implementación) | Permiso para instalar `vitest` 5.0.3 y `@playwright/test` 1.63.0 desde el registro de npm: 19 paquetes con sus dependencias, unos 22,4 MB desempaquetados y 5,0 MB comprimidos (estimación). Permiso para bajar con `npx playwright install --only-shell chromium` el Chrome Headless Shell 153.0.8010.12 (119,8 MB) y ffmpeg (2,4 MB) del CDN de Playwright. Si faltan librerías del sistema, `install-deps` pide `sudo` y baja paquetes de apt (sin medir). Hay que darlo antes de la primera tarea de instalación. |
| Primera spec de componente (F3) | Permiso para `jsdom` 30.1.2 y Testing Library (`@testing-library/react`, `dom`, `user-event` y `jest-dom`): 56 paquetes, unos 26,3 MB y 5,0 MB comprimidos (estimación). |
| Primera factory | Permiso para `fishery` 2.4.0: 2 paquetes, unos 0,19 MB. |
| F10 | Permiso para lo que el spike elija entre router, nuqs y Zustand, con su peso medido antes. |
| F11 | Decidir si F11 incluye las otras pantallas de cuenta o si son otro ítem (ver «Pantallas de acceso»). |

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
| F1 | Las cinco de su spec: el alcance de los E2E por vista, cómo se protege el aspecto, qué hacer con los errores de consola, qué resultados del compilador se simulan y cómo se escriben las dos pruebas de riesgo |
| F2 | El tipo de explorador (`lab-explorers.js:kind` es hoy una expresión regular): ¿un campo de `content/`, que cambia los bytes publicados y los validadores de C2 y se coordina con el backend, o un mapa explícito por ID en el front? Y qué unidades y en qué orden, para que A2 empiece cuanto antes |
| F3 | Si los filtros siguen en memoria, como hoy (se recomienda que sí) |
| F4 | Dónde vive el fixture de los 10 IDs de hitos y quién lo fija: hoy sólo los fija el escenario «g) hitos» de `app-shell-check`, que se retira con la página |
| F5 | Dónde vive la sesión de simulaciones para que «Borrar todo» la alcance |
| F6 | Los conteos y el XP derivados del catálogo: «4 mundos · 24 misiones · 12 desafíos», «/180» y los literales de XP quedan desactualizados con E1 |
| F7 | La etiqueta de un `solvedAt` importado sin evidencia: hoy el mapa lo muestra como «Resuelto con pruebas» y suma 20 puntos aunque `hasPassingEvidence` da `false`, y el port tiene que decidir qué selector lo respalda. Y si el `onChange` de React recibe los eventos `input` que el editor emite por código, o conviene que el editor exponga un callback |
| F8 | Nada previo a la spec |
| F9 | Si se anuncian las regiones vivas que hoy se recrean (no verificado) |
| F10 | El router y nuqs, con un spike: el contrato (la vista en el hash, la query antes del hash y `#invitacion=` en el hash) descarta un router por path, y `createHashRouter` lee la ruta dentro del hash; el adaptador `nuqs/adapters/react` lee `location.search`, compatible con la query antes del hash. Los conteos del nav (`.nav-count` 4 y 25, `.lab-nav-count` 274) derivados del catálogo. Si F11 pasa a ser una ruta de la raíz única. Si un `import()` dinámico genera un chunk que `vite-plugin-singlefile` no inlinea (lo comparte con A2) |
| F11 | Si cubre sólo login e invitación, o también la recuperación de contraseña. Quién construye las otras pantallas de cuenta y de administración |
| Transversales | A4 antes o después de F7. Cablear D1, C4 y E1 en la hoja de ruta del backend |

## Estado y evidencia

- **2026-10-05, planificación.** El [mapa](legacy-map.md) sale de una lectura completa del código legacy en `8f1bdbc`. Los conteos de líneas de las seis vistas (750, 1 227, 203, 376, 255 y 296) coinciden con `ca9e619`, y 21 de sus identificadores siguen existiendo. Se midieron, sin instalar ni bajar nada, los tamaños del ADR 0008: 77 paquetes y 48,9 MB para la pila completa, y 122,2 MB para el navegador con `--only-shell`. La imagen que fija `frontend/Dockerfile` es `node:24.21.0-alpine`, que cumple lo que pide `jsdom` 30.1.2. El tamaño actual del HTML (2 202 074 bytes) sale de la evidencia de A1 en la hoja de ruta del backend; no se reconstruyó.
- **Sin verificar:** la recarga completa de un enlace que cambia la query en un navegador real (F1 la fija); que CodeMirror 6 corra en jsdom; los tiempos de la CI, del paso de instalación del navegador y de la suite E2E; que `import()` dinámico y `vite-plugin-singlefile` convivan (A2); el tamaño real del build con un router o con nuqs (F10); y si se anuncian las regiones vivas que se recrean.
- **Orden de especificación:** sólo F1 tiene spec, con cinco preguntas abiertas. F2 se especifica después del clarify de F1, porque su protección depende de lo que F1 decida; los demás ítems, de a uno, cuando les toca.

## Enmiendas pendientes

Al aprobar el ADR 0008, hay que registrarlo en:

- `AGENTS.md`, con los comandos `npm run test:unit`, `npm run test:e2e` y `npm run test:e2e:install`;
- `qa/AGENTS.md`, con la tabla de checks y las reglas de las pruebas del front;
- `docs/agent-skills.md`, cuyo «Alcance» dice que las skills de pruebas todavía no tienen dónde correr;
- el principio II de la constitución, como PATCH.

Al integrar las dos hojas de ruta, hay que ajustar la del backend en lo que esta cableó sólo en parte:

- «Orden y paralelismo» dice que A2 depende sólo de A1 y que va en la ola 1;
- D1, C4 y E1 no citan a F2, F5, F7, F8 ni los conteos del catálogo;
- «Acciones del usuario» dice que `npm ci` baja 243 dependencias: con la pila de pruebas son hasta 320;
- `docs/architecture.md` nombra una «Planificación del backend con Spec Kit», y `docs/agent-skills.md`, que Spec Kit «sostiene la planificación del backend».
