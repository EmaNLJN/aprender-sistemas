# Feature Specification: F10 · El shell y el router en una sola raíz de React

**Feature Branch**: `024-f10-shell` (nombre de la feature; el proyecto no crea una rama por feature: el trabajo va en `spec/f10-shell`)

**Created**: 2026-10-28

**Status**: Borrador para el clarify: cinco preguntas abiertas y una partición propuesta, sin aplicar; sin plan

**Input**: Ítem **F10** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Shell y router»: una sola raíz de React con el shell y el router, y retirar `frontend/app.js`. Es el último port del tronco del front y espera a F3, F4, F5, F6, F7b, F8 y F9, y a A2. Encargo del coordinador del 2026-10-28, con las decisiones del clarify de ese día (`X1` con el ruling C2, `X2`, `X3`, F3-Q1, F5-Q3, F8-Q2, F12-Q1). **Describe el código de la integración `f2b-acum` (`2b37caf4`: F2a, A2 y F2b), no el de `master` (`dd870a9c`), que todavía no los tiene.** Lo que dejan F3 a F9, F11a y F12a sale de sus specs (012 a 023, con clarify y sin plan) y es un supuesto con nombre. Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** Cuando F10 empiece, cada vista ya va a ser una página de React, pero el taller todavía no es una aplicación de React. Lo que queda de `frontend/app.js` es el shell:

- el router: `navigateFromLocation`, los oyentes de `hashchange` y `popstate`, y `render()`, que desmonta todas las páginas y monta la actual;
- el idioma: `syncLinkedLanguage` y el selector de lenguaje;
- la barra lateral (`syncShell`), el pie de guardado, el toast y el salto al contenido;
- «Exportar mi progreso» de la barra lateral;
- el arranque (`startApp()`): abre los almacenes y los motores en orden y junta los avisos de carga.

Cada página tiene su propia raíz de React, que crea su adaptador `window.Taller*` sobre `#main` en cada montaje. Además está la raíz de la cuenta de F11a, al costado.

F10 reemplaza todo eso por **una sola raíz de React**, que dibuja el shell y la página actual, con un router que lee la vista del hash. Retira `app.js`, los adaptadores `window.Taller*`, los `register-*` que los publicaban y los checks de `qa/` que existen sólo para ellos. El alumno no nota el cambio: se conservan el aspecto, los textos, el teclado, el foco, las URL, el historial, las recargas y el progreso guardado.

Cambia a propósito, cada cosa en su propio commit con TDD:

- la administración de F12a pasa de diálogo a una ruta enlazable (F12-Q1);
- la devolución de la lección (`#quiz-feedback`) queda montada (X2);
- `<body>` deja de llevar el `aria-pressed` que F1 fijó como defecto;
- los conteos del menú salen del catálogo.

Antes de escribir el shell, un spike decide qué router entra, o si no entra ninguno. Lo decide con una regla, contra el contrato de URL y contra el tope de tamaño del HTML.

Es para quien mantiene el front y para quien revisa los PR; para el alumno, nada cambia. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Todos los E2E de la base pasan sin editarse con el build de F10: los 106 de F1, los 17 de A2 y los que suman F3 a F9, F11a y F12a. Las excepciones son las de «Lo que cambia a propósito», cada una en su commit con TDD.
2. El spike mide cada candidato contra el contrato de URL y contra el peso, sobre la base de F10, y la regla elige uno, o ninguno. Si entra una dependencia, entra con permiso.
3. En el front hay una sola llamada a `createRoot`. No quedan `frontend/app.js`, la etapa `legacyViews`, ningún `window.Taller*` ni ningún `register-*`.
4. Las URL, las recargas y el historial siguen como los fija la red de F1. `url-grammar` sigue siendo el único lugar que conoce las formas de URL.
5. El DOM del shell es el de hoy, y el barrido de estilo computado da 0 diferencias. `styles.css` queda con los tokens, las reglas globales y las clases base.
6. Con las fixtures congeladas, el arranque no escribe, no respalda ni avisa. El orden en que se abren los almacenes y los avisos de carga es el de hoy.
7. `boot-check`, `load-order-check` y `app-shell-check` se retiran. Cada escenario queda cubierto por un E2E o por una spec, o descartado con su motivo.
8. `dist/index.html` queda bajo el tope de `qa/build-check.ts` (1 250 000 caracteres), con su tamaño antes y después.

**Entra:**

- **El spike del router,** primera tarea, con su regla de decisión («El spike del router»).
- **Una sola raíz de React** con:
  - el shell: la barra lateral, la navegación, el salto al contenido, el selector de lenguaje, el pie de guardado, «Exportar mi progreso», `#toast`, la entrada «Tu cuenta» de F11a y los diálogos del shell;
  - el router, con `syncLinkedLanguage`;
  - la página actual, importada sin adaptador.
- **Los conteos del menú,** derivados del catálogo.
- **El arranque sin `startApp()`.** La raíz abre los almacenes y los motores en el orden de hoy, arma `progress-backup` con lo que F8 dejó en `src/app/` y muestra los avisos de carga.
- **La administración de F12a como una ruta enlazable** («El compromiso con F10» de la [spec 023](../023-f12-administracion/spec.md)).
- **`#quiz-feedback` montada,** con su regla `:empty` (X2).
- **El retiro:**
  - `frontend/app.js`;
  - la etapa `legacyViews` y su cadena;
  - todos los `window.Taller*` y los `register-*` que los publicaban;
  - los globals de catálogos, según Q3;
  - `boot-check`, `load-order-check`, `app-shell-check` y sus arneses.
- **La limpieza de `styles.css`.** Las reglas del shell pasan a su propia hoja y las que ya nadie usa se borran. Quedan los tokens, las reglas globales y las clases base.
- **Las pruebas:** los E2E del shell y del arranque, que reemplazan a `boot-check` y a `load-order-check`; las specs de Vitest del router y del shell; y la documentación que cambia con ellos.

**Queda fuera:**

- Rutas por path y cambiar `docker/nginx/nginx.conf`.
- Cualquier forma de URL nueva salvo la de la administración (Q4).
- Interceptar los enlaces que cambian la query.
- La sincronización y sus avisos: el cliente v2 es D1c, y el estado en `#save-label` es F13 (propuesta).
- Las pantallas de F11b, F11c, F11d y F12b.
- Convertir «Tu cuenta» en una ruta: sigue siendo un diálogo (F11-Q3).
- Partir el bundle en chunks y retirar `vite-plugin-singlefile`: es C4.
- Tocar `allowJs` de `frontend/tsconfig.app.json`. Es un hallazgo para el coordinador, porque después de F10 no queda JavaScript legacy.
- Cambiar `withLanguageQuery` o los filtros de la Biblioteca: F10 hereda lo que F3 decidió.
- Instalar nuqs: lo hereda de F3 o F5.
- El contenido (E1), A3 y A4.

**Sin hacer a propósito (YAGNI):**

- loaders, actions, navegación con espera o carga de datos por ruta, porque el contenido ya llega por la compuerta del arranque;
- rutas anidadas o con parámetros, porque las vistas son nueve palabras fijas;
- código partido por ruta;
- un store global del shell, porque el idioma sigue en `routeStore`;
- una librería de diálogos, de animación o de toasts;
- transiciones entre vistas;
- prefetch;
- un router por si acaso: si el spike no encuentra uno que el contrato necesite, no entra ninguno.

**Actores:**

- quien porta (el usuario y los agentes que implementan);
- quien revisa los PR;
- el agente principal, que integra `main.tsx`, `package.json`, las configuraciones y la documentación;
- el alumno, que no debe notar nada;
- quien administra el taller, que gana un enlace a la administración.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta.

| Pedido | Fuente |
| --- | --- |
| Port y no rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso guardado, los IDs y las URL | Usuario, 2026-10-05; hoja de ruta, «Vocabulario» |
| Red y seams primero, las vistas de a una y el shell con el router al final, con una sola raíz; descartados el shell primero y la reescritura en paralelo | Usuario, 2026-10-05 |
| F10: un spike previo del router; una sola raíz con el shell (barra lateral, navegación, `skip-link`, idioma, `#toast` y diálogos) y el Atlas debajo; `syncLinkedLanguage` en el router; los conteos del menú derivados del catálogo; los E2E del arranque en lugar de `boot-check` y `load-order-check` | Hoja de ruta, F10, «Entra» |
| F10 borra `frontend/app.js`, todo `window.Taller*` de vistas, los `register-*` que los publicaban y las reglas de `styles.css` que ya nadie usa; `styles.css` conserva los tokens y las clases base | Hoja de ruta, F10, «Borra» |
| El contrato de URL (la vista en el hash, la query antes del hash y `#invitacion=` en el hash) descarta un router por path | Hoja de ruta, «Decisiones abiertas»; mapa, §4 y §10 |
| nuqs ya no se decide en F10: lo instala F3 o F5, el primero que se integre, y F10 lo hereda; el spike es sólo del router | Usuario, clarify del 2026-10-28 (F3-Q1 y F5-Q3); hoja de ruta, F10, «Hereda» |
| Zustand entró con F2a; F10 lo hereda | Usuario, 2026-10-06 |
| F10 convierte en una ruta enlazable el diálogo de administración de F12a: la URL lleva la vista y quizás la sección, nunca datos; F10 decide qué ve una cuenta que no es admin y reescribe con TDD los E2E que abren y cierran el diálogo | Usuario, clarify del 2026-10-28 (F12-Q1); spec 023, «El compromiso con F10» |
| F10 retira lo que quede de `window.Taller*`; el armado de `progress-backup` ya está en `src/app/` y `startApp()` lo recibe | Usuario, clarify del 2026-10-28 (F8-Q2) y su regla de orden |
| `#quiz-feedback` se monta en F10, con su regla `:empty`, y se comprueba a mano con un lector de pantalla | Usuario, clarify del 2026-10-28 (X2; F9-Q3) |
| `#export-progress`, el toast y los diálogos del shell quedan en `app.js` hasta F10 | Specs 022 (F8) y 014 (F9); coordinador, 2026-10-28 |
| Lo que existe sólo porque `innerHTML` rehace la vista adopta el comportamiento de React; las rarezas de lógica se conservan | Usuario, clarify del 2026-10-28 (X1); coordinador (C2) |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla si supera los 52 requisitos de C3a | Coordinador, 2026-10-28 |

## Preguntas abiertas para el clarify

Son cinco, cada una con sus opciones, una recomendada, su motivo y su costo. Se cierran en `/speckit-clarify`, y las respuestas pasan a una sección Clarifications.

- **Los marcadores.** Cada pregunta deja un `[NEEDS CLARIFICATION]` donde decide algo, y esos cinco son los únicos: Q1 en FR-010, Q2 en FR-034, Q3 en FR-049, Q4 en FR-041 y Q5 en FR-033.
- **La partición** no es una pregunta: está en su sección, con su recomendación, y el usuario la acepta o la cambia al responder.
- **Hasta el clarify,** lo que depende de una pregunta usa como borrador la opción recomendada.

### Q1. La regla del spike: cuándo entra un router, y si «ninguno» es un resultado válido

**Contexto.** El contrato de URL descarta lo que más ofrecen los routers: rutas por path, parámetros en la ruta, loaders y carga de datos por ruta. Lo que F10 necesita es leer una de nueve palabras del hash y reaccionar a `hashchange` y a `popstate`. Hoy eso son unas 15 líneas de `app.js` sobre `viewFromHash` y `readLinkQuery` de F2b.

Lo que se sabe de los candidatos, sin medir en el build:

- **React Router 8.5.1** (MIT, 2 dependencias): 206 775 bytes minificado y 64 607 con gzip, según bundlephobia (el paquete entero, sin el recorte de lo que no se usa).
- **TanStack Router 1.170.46** (MIT, 4 dependencias): 90 893 bytes minificado y 30 979 con gzip.

Las dos cifras son la cota superior: el aumento real en `dist/index.html` lo mide el spike. El margen bajo el tope era de 108 663 caracteres con F2b (1 141 337 medidos por el coordinador), y antes de F10 lo consumen nuqs (unos 18 KB minificado, el paquete entero), React Hook Form (unos 43 KB, hoja de ruta), F11a, F12a, A3 y las páginas de F3 a F9. Después de F10 todavía vienen F11b, F11c, F11d, F12b, D1c y F13. (FR-010)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Ninguno por omisión, y una librería sólo si se gana el lugar.** El spike mide tres candidatos sobre la base de F10: un router propio y chico sobre `url-grammar`, React Router con `createHashRouter` y TanStack Router con historia por hash (o con una historia propia). Una librería entra sólo si cumple las tres condiciones: pasa los ocho criterios del contrato (FR-008), resuelve algo que F10 necesita y que el router propio no resuelve, nombrado en el informe, y su aumento medido en `dist/index.html` no pasa de un cuarto del margen que quede al empezar F10. Si no, entra el propio | Decide con datos, y no suma una dependencia que no paga su peso. Con el margen de F2b, un cuarto son 27 165 caracteres, y las cotas de bundlephobia ya lo superan. **Costo:** el spike corre igual, aunque lo más probable es que gane el propio, y ese router es código del taller, con sus pruebas. Si mañana hacen falta rutas anidadas o datos por ruta, se vuelve a decidir |
| B | **Una librería siempre** (React Router, la más usada), y lo que no encaje en el contrato se adapta con una historia propia | Un router conocido y documentado. **Costo:** con las cotas de hoy, probablemente no entra bajo el tope; hay que escribir y mantener la adaptación a `?query#vista`; nuqs sigue con su adaptador de SPA (FR-020) |
| C | **Ninguno, sin spike:** decidirlo ahora | Ahorra el spike. **Costo:** decide sin medir lo que la hoja de ruta pidió medir, y contra versiones que pueden cambiar antes de F10 |
| Otra | Decir cuál, o fijar otro umbral (por ejemplo, un número fijo de caracteres) | |

### Q2. La raíz única: ¿el acceso de F11a y la compuerta de A2 se dibujan dentro de ella?

**Contexto.** Hoy, y hasta F10, conviven tres cosas:

- **El shell estático de `frontend/src/index.html`,** visible desde el primer cuadro.
- **La compuerta de A2,** que escribe su carga y su error dentro de `#main` con `innerHTML` (`gate-view.ts`).
- **La raíz de la cuenta de F11a,** con elementos propios fuera de `#main` y de `.app-shell`:
  - sin sesión, dibuja el acceso y deja el shell estático inerte, con un solo `main` visible (FR-010 y FR-011 de la [spec 015](../015-f11-acceso-cuenta/spec.md));
  - con sesión, dibuja «Tu cuenta» y el diálogo de administración de F12a;
  - «pedir el ingreso» la vuelve a mostrar sobre el taller ante un 401.

Una sola raíz que dibuje el shell choca con dos de esas piezas: la compuerta escribe un contenedor que dibujaría React, y la cuenta vive en otra raíz. Los 17 E2E de A2 ubican la compuerta en `#main` (`[data-content-gate]`, `role="alert"` y «Reintentar»), y los de F11a ubican el acceso por sus roles. Ninguno se edita. (FR-034)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Una sola raíz desde el primer cuadro.** `main.tsx` crea la raíz antes de las etapas. Las etapas siguen siendo las de `runBoot`, con su lógica y su orden (los tokens, la sesión y la compuerta), pero lo que muestran lo dibuja la raíz: el acceso, la carga y el error de la compuerta dentro de `#main` con su DOM de hoy, y después el shell con la página. «Pedir el ingreso» dibuja el acceso dentro de la misma raíz. El shell sale de `index.html`, que queda con el contenedor, el `noscript` y el script | Una sola raíz y un solo dueño de cada contenedor. El acceso y la compuerta no se convierten en rutas: siguen siendo etapas. **Costo:** cambia cómo montan la vista de la compuerta (`gate-view.ts` pasa a ser un componente con el mismo DOM) y la raíz de la cuenta, aunque no cambia su lógica. Además, el primer cuadro deja de tener el shell estático: el script en línea corre apenas se lee el documento, y el E2E lo comprueba |
| B | **Dos raíces.** El acceso sigue en la raíz de la cuenta, previa al shell y a su costado, y la raíz única es la del shell, que monta después de la compuerta. La compuerta sigue escribiendo el `#main` estático. «Tu cuenta» pasa al shell (spec 015, Assumptions) | Toca menos lo de F11a y A2. **Costo:** no es una sola raíz. El shell estático tiene que quedar en `index.html` hasta que monte el de React, con dos copias del mismo marcado y un reemplazo visible, o si no el shell aparece recién con el contenido. Ante un 401, las dos raíces conviven |
| C | **El shell estático queda en `index.html` y React lo hidrata** (`hydrateRoot`) | El primer cuadro queda idéntico. **Costo:** la hidratación exige que el marcado estático y el de React coincidan byte a byte, incluidos los conteos y el idioma, que dependen del contenido y del progreso: cualquier diferencia es un error de hidratación. Además, deja dos fuentes del mismo marcado |
| Otra | Decir cuál | |

### Q3. Los globals de catálogos: ¿se retiran con los `register-*`?

**Contexto.** `register-catalogs.ts` y los cuatro `register-systems-*.ts` publican once globals de datos, que no son `window.Taller*`: `GUIDE_DATA`, `RUST_LAB`, `GO_LAB`, `RUST_QUESTS`, `GO_QUESTS`, `RUST_CAMPAIGN`, `GO_CAMPAIGN` y los `SYSTEMS_*` con sus `SYSTEMS_*_LABS`.

Después de F7b, la última lectura de producción es la de `app.js` (`GUIDE_DATA`, y `RUST_CAMPAIGN` y `GO_CAMPAIGN` en `syncLinkedLanguage`), que F10 retira. Los siguen leyendo:

- **Los oráculos:** `tools/content/dump-globals.ts`, la prueba «the globals of the bundle equal the dump-globals oracle» de `qa/dist-content-check.ts` y el `PUBLISHED_GLOBAL` de `qa/lib/boot-harness.ts`.
- **Unos diez checks de `qa/`,** que cargan el contenido en un contexto `vm` evaluando esos adaptadores (`qa/lib/legacy-sources.ts`).

El mapa (§8) ya avisaba que, si se retiran, hace falta otro oráculo. (FR-049)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Se retiran.** La raíz pasa el contenido a cada página desde `getContent()` (regla R5), y los cinco adaptadores se borran. Los checks que los usaban como cargador pasan a leer el contenido con el mismo módulo de contenido, desde `qa/lib`. `dump-globals` y la prueba de globals del dist se retiran, porque ya no hay globals que comparar. La equivalencia del contenido la siguen probando `build-check` (los bytes del currículo servido contra el generador) y el resto de `dist-content-check` | No queda ningún global del taller en `window`. **Costo:** cambia el cargador de unos diez checks (un solo archivo de `qa/lib` y sus llamadores, sin tocar los valores esperados) y desaparece el criterio de F2 «`dump-globals` da los mismos bytes», que ya cumplió su función con F2 y A2 |
| B | **Salen del arranque, pero los archivos quedan** en `frontend/src/app/legacy/` sólo para `qa/`, hasta un ítem que los retire | Menos cambios en `qa/` ahora. **Costo:** código de producción que producción no usa; la prueba de globals del dist igual falla, porque el dist ya no los publica, y hay que cambiarla; el retiro queda sin dueño |
| C | **Quedan publicados como hoy:** `main.tsx` sigue evaluando los cinco adaptadores de datos | Nada cambia en `qa/`. **Costo:** contradice «retirar los `register-*`»; quedan once globals visibles desde la consola y una etapa de arranque sólo para ellos |
| Otra | Decir cuál | |

### Q4. La ruta de administración: su forma de URL y qué ve quien no es admin

**Contexto.** F12-Q1 deja la decisión en F10: la URL lleva la vista y quizás la sección, nunca datos (FR-008 de F12), y F10 decide qué ve en ella una cuenta que no es admin. El servidor sigue siendo la autoridad: toda ruta de `/api/admin` responde 403 a quien no es admin.

Restricciones de la red:

- `views.spec.ts` y `url-grammar.spec.ts` fijan las **ocho** vistas del menú;
- la regla R8 de `css-contract` mide el último enlace del menú;
- un hash desconocido muestra el Recorrido y no se reescribe (`viewFromHash`).

La página de F12a recibe sólo la sección inicial y qué hacer al cerrar (FR-062 de F12), y el Page Object la abre desde un único método (FR-063). (FR-041 y FR-042)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **`#administracion`, una vista más en el hash, fuera del menú.** Se dibuja en `#main`, dentro del shell, como cualquier vista. La sección no va a la URL: abre en «Cuentas», como hoy. «Administrar el taller», en «Tu cuenta», pasa a ser un enlace a `#administracion`, y «Cerrar» vuelve a la vista de la que vino (`#recorrido` si se entró por enlace). Quien no tiene el rol admin ve el Recorrido, como con cualquier hash desconocido, y la URL queda como estaba | Una sola forma nueva, sin parámetros. El menú, las ocho vistas y su prueba no cambian. Para quien no es admin no hay texto nuevo ni pistas. **Costo:** la administración deja de ocupar la pantalla entera y pasa al ancho de `#main`. Un alumno que recibe el enlace por error ve el Recorrido sin explicación. Volver a «Cuentas» tras recargar en «Invitaciones» es un clic |
| B | **`?seccion=invitaciones#administracion`,** con la sección en la query, que se escribe con `replaceState` al cambiar de sección. Quien no es admin ve un aviso («Esta página es para quien administra el taller») con un enlace al Recorrido | La recarga conserva la sección, y el enlace equivocado se explica solo. **Costo:** otra forma con query en la gramática y en `url-contract`, un texto nuevo para revisar y un estado de pantalla más |
| C | **Como A, pero a pantalla entera,** con el shell oculto mientras la ruta está activa | Conserva el aspecto del diálogo de F12a. **Costo:** una ruta que esconde el shell es un caso especial del layout, y el foco y el salto al contenido se comportan distinto en esa ruta |
| Otra | Decir cuál | |

### Q5. Antes de que llegue el contenido, ¿qué muestra el shell?

**Contexto.** Hoy, mientras corren la sesión y la compuerta, el shell estático de `index.html` ya se ve:

- con valores fijos: «RUST», «0 de 12», «0%» y los conteos 4, 25, 274 y 15;
- `syncShell` los reemplaza al arrancar por los del alumno, salvo los conteos de Campaña, Sistemas y Laboratorio, que nunca cambian.

Con el shell en React y los conteos derivados del catálogo (hoja de ruta), esos números no se conocen hasta que la compuerta publica el contenido. La compuerta muestra «Cargando…» sólo si tarda más de 400 ms, y desde F11a el acceso se muestra con el shell inerte. Ningún E2E mira el shell antes del contenido: `ShellPage.goto` espera la página. (FR-033)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Lo que depende del contenido aparece con el contenido.** Antes, el shell muestra lo fijo: la marca, el lema, los enlaces, los botones y el pie. Los conteos, el idioma y el avance del recorrido aparecen cuando la compuerta publica el contenido. Los conteos no se reservan espacio: quedan vacíos hasta entonces | Ninguna cifra tiene una segunda copia en el código. Hoy el idioma y el avance ya cambian al arrancar, así que lo nuevo son sólo los cuatro conteos. **Costo:** durante la carga lenta (más de 400 ms) o detrás del acceso, el menú se ve sin sus conteos, y en el primer cuadro cambian de ancho los enlaces que los llevan |
| B | **Los mismos valores fijos de hoy hasta que llega el contenido** («RUST», «0 de 12», «0%», 4, 25, 274 y 15) | El primer cuadro queda idéntico al de hoy. **Costo:** una copia fija de cada número en el código del shell, que queda vieja con E1 (por ejemplo, 274 durante la carga y 290 después) |
| C | **El shell aparece recién con el contenido:** el acceso y la carga se dibujan solos | Nada se muestra a medias. **Costo:** un cambio visible mayor: durante la carga y el acceso no hay barra lateral ni barra superior, y la carga lenta se ve como una pantalla vacía con un aviso |
| Otra | Decir cuál | |

## El contrato de URL que se conserva

Es el de la red de F1 (`url-contract`, `views` y `reload`), el de la gramática de F2b (`frontend/src/shared/config/url-grammar.ts`) y el que suman F3, F5 y F11a. F10 no lo cambia, salvo la forma de la administración (Q4).

| Forma | Ejemplo | Quién la escribe al empezar F10 | Qué hace |
| --- | --- | --- | --- |
| La vista en el hash (8) | `#recorrido` … `#metodo` | El menú y los enlaces internos (el navegador suma la entrada al historial) | Muestra esa vista sin recargar |
| Sin hash, hash vacío o desconocido | `/`, `#`, `#loquesea` | Nadie | Muestra el Recorrido y no reescribe la URL |
| Laboratorio libre | `?#laboratorio` | El menú («Laboratorio») y la campaña | Recarga el documento y vacía la query |
| Ejercicio | `?ejercicio=<id>&paso=learn\|code\|reflect#laboratorio` | El laboratorio (`replaceState`) y el Atlas | Abre el ejercicio y fija el idioma del ejercicio |
| Misión de campaña | `?campana=<mundo>&ejercicio=<id>&paso=learn#laboratorio` | La campaña | Recarga y abre la misión con su contexto |
| Núcleo de Sistemas | `?sistema=<taller>&ejercicio=<id>&paso=code#laboratorio` | Sistemas | Recarga y abre el núcleo con su contexto |
| Mundo | `?mundo=<mundo>#campana` | La campaña | Abre el mundo y fija su idioma |
| Taller | `?lenguaje=rust\|go[&taller=<id>&parte=explore\|build\|ship]#sistemas` | Sistemas, con nuqs desde F5, y el selector de lenguaje | Abre el catálogo o el taller y fija el idioma |
| Filtros de la Biblioteca | `?<filtros>#biblioteca` (nombres provisionales de F3: `buscar`, `lenguaje`, `acceso`, `tipo` y `favoritos`) | La Biblioteca, con nuqs desde F3 | Aplica los filtros; sin filtros es `#biblioteca` |
| Tokens de F11a | `#invitacion=<token>`, `#restablecer=<token>&email=<email>` | El enlace que entrega quien opera | La etapa de los tokens los lee y los borra con `replaceState` antes de que se mire el hash |
| **Nueva (Q4, borrador A)** | `#administracion` | «Administrar el taller», en «Tu cuenta» | Abre la administración para un admin; para otra cuenta, como un hash desconocido |

**Las reglas del contrato:**

- **La vista va en el hash, sin barra:** `#campana`, nunca `#/campana`.
- **Los parámetros van en la query, antes del hash,** y se leen de `location.search`.
- **Las páginas y el idioma escriben con `history.replaceState`:** no suman entradas al historial y no disparan una navegación.
- **Un enlace que cambia la query es una navegación del documento.** La red de F1 midió que los 11 enlaces que la cambian recargan (`reload.spec.ts`, L1 a L11), y con la recarga se pierden el temporizador, las sesiones del Atlas y las simulaciones de Sistemas. Ése es hoy el mecanismo que saca al alumno del contexto de una misión.
- **Los enlaces que sólo cambian el hash no recargan.**

**Por qué descarta un router por path:**

- **El servidor.** Nginx sirve todo con `try_files $uri $uri/ =404`, así que recargar `/campana` daría 404, y habría que cambiar el servidor.
- **Las URL guardadas.** El README documenta `#sistemas`, `#campana`, `#laboratorio` y `#atlas`, y la red completa usa las formas de hash.
- **Las recargas.** Un router por path con `pushState` haría navegaciones sin recarga donde hoy hay recargas, y cambiaría lo que se pierde al salir de una misión.
- **Los tokens.** Viajan en el fragmento a propósito (ADR 0006, §4.1 y §4.3): el fragmento no llega al servidor ni a sus registros.

**Por qué los routers por hash tampoco encajan solos.** Su historia por hash guarda la ruta y la query dentro del hash (`#/campana?mundo=…`). Escribe `#/vista`, con barra, y lee la query de adentro del hash, no la que va antes. El contrato de este taller es el opuesto: `?mundo=…#campana`. Esto sale de la documentación consultada («Fuentes consultadas») y no se verificó en un navegador: lo comprueba el spike.

## El spike del router

Es la primera tarea de F10, antes de cualquier código de producción. Corre en una copia descartable de la base de F10 (con F3 a F9 integradas), no en el repositorio, y no deja código de producción. Su resultado es una decisión, con las medidas que la sostienen, en la investigación del plan.

**Los candidatos,** con la versión del registro de npm del día del spike (las de referencia, del 2026-10-28, están en «Fuentes consultadas»):

1. **Ninguno:** un router propio y chico, que lee la vista con `viewFromHash`, se suscribe a `hashchange` y a `popstate` y entrega la vista actual a la raíz.
2. **React Router,** en modo de datos (`createHashRouter` con `RouterProvider`), y en modo declarativo (`HashRouter`) si el de datos no pasa algún criterio.
3. **TanStack Router,** con `createHashHistory` y, si no pasa el contrato, con una historia propia que cumpla su interfaz `RouterHistory`.

**Los criterios del contrato,** todos eliminatorios (FR-008):

| # | Criterio | Cómo se mide |
| --- | --- | --- |
| C1 | La vista se escribe y se lee como `#vista`, sin barra; abrir `/` o `#` no reescribe la URL | `url-contract` y `views` de F1, sin editar, y la URL después de cada navegación |
| C2 | La query va antes del hash y se lee de `location.search`, con `readLinkQuery` y con el adaptador de nuqs de SPA (`nuqs/adapters/react`) | Las seis formas con query de F1, las de F3 y F5, y una prueba de que la query no se muda adentro del hash |
| C3 | Los 11 enlaces que cambian la query recargan el documento, y los de sólo hash no | `reload.spec.ts` de F1, sin editar |
| C4 | Cada navegación por hash suma una entrada al historial, Atrás vuelve a la vista anterior, y abrir un ejercicio no suma ninguna | `views.spec.ts` («history»), sin editar |
| C5 | Las escrituras con `replaceState` de las páginas, del idioma y de nuqs no disparan una navegación ni un remontaje, y nuqs las ve (`enableHistorySync()`) | Un E2E que cuenta los montajes de la página al cambiar de idioma, de ejercicio, de taller y de filtro |
| C6 | Los tokens nunca llegan al router: la etapa de los tokens corre antes | Los E2E de F11a, sin editar |
| C7 | Un hash desconocido muestra el Recorrido y no se reescribe | `url-contract` y un caso nuevo |
| C8 | El estado de la página de hoy sobrevive como hoy: el temporizador, las sesiones del Atlas y las simulaciones, a una navegación por hash, y no a una recarga | `reload.spec.ts` («what stays in memory»), sin editar |

**Las medidas,** para cada candidato que pase los ocho criterios (FR-009):

- el aumento real de `dist/index.html`, en caracteres, construido sobre la base de F10, no la cifra de bundlephobia;
- la licencia, la cantidad de dependencias y el tamaño desempaquetado, del registro;
- qué resuelve que el router propio no resuelve, en una frase, o «nada».

**La regla de decisión** (FR-010, Q1, borrador A): entra el router propio, salvo que una librería pase los ocho criterios, resuelva algo nombrado que F10 necesita y el propio no, y sume como mucho un cuarto del margen que quede al empezar F10. Si una librería gana, se instala sólo con el permiso del usuario, con su nombre, su versión exacta, su origen y su peso.

**Qué no decide el spike:** nuqs, que ya está instalado; la forma de la administración (Q4); y la raíz única (Q2).

**Lo que ya se sabe y no hace falta medir:** si un `import()` dinámico deja un chunk aparte. Esa pregunta, que la hoja de ruta compartía con A2, ya la cerró A2: con `vite-plugin-singlefile` y `codeSplitting: false`, la salida es un solo script en línea ([spec 006](../006-a2-compuerta-arranque/spec.md), «Lo que ya se sabe», punto 1), y el `dist` de la integración de F2b lo confirma.

## El shell que F10 recibe

Es lo que dicen las specs de F3 a F9 que queda en `app.js` y en `window.Taller*` al empezar F10. Los nombres de los adaptadores nuevos son provisionales. **Cada port puede entregar algo distinto de lo que dice su spec,** así que F10 empieza con un inventario del código real (FR-048) y retira todo lo que encuentre, figure o no en estas tablas.

**Lo que queda en `frontend/app.js`:**

| Qué | Lo dejó | Qué pasa en F10 |
| --- | --- | --- |
| `startApp(progressBackup)`: `TallerLab.init()`, `routeStore.open(guide)`, el motor de campaña (F6 lo inicializa adentro), `TallerSystems.init()`, la lista de avisos de carga y el primer `render()` | F2a (unidad 3), F6, F8-Q2 | La raíz abre los almacenes y los motores en el mismo orden y muestra los avisos (FR-036) |
| `syncLinkedLanguage` (lee `GUIDE_DATA`, `RUST_CAMPAIGN`, `GO_CAMPAIGN` y `TallerLab.getExercises()`) | Todos los ports (la unidad 5 de F2b cambió cómo lee la URL) | Pasa al router, leyendo el catálogo sin `window` (FR-021) |
| `render()`: desmonta las páginas, llama a `TallerCampaign.refresh()`, llama a `syncShell()` y monta la vista actual | Todos | El router muestra la página actual y la remonta en los mismos momentos (FR-030 y FR-031) |
| `navigateFromLocation`, `lastNavigation` y los oyentes de `hashchange` y `popstate`, con el desplazamiento arriba y el foco en `#main` | — | Pasan al router (FR-016) |
| `syncShell`, `save`, `updateSaveLabel`, `stepsFor`, `completedCount` y `languageName`, y la suscripción a `routeStore.changes` que suma el primero de F3, F4 y F9 | F3, F4, F8 y F9 | Pasan a la barra lateral de React (FR-025 y FR-026) |
| `toast` | F8 y F9 | Pasa al shell (FR-028) |
| El selector de lenguaje y el salto al contenido | — | Pasan al shell (FR-019 y FR-022) |
| `exportProgress` y el oyente de `#export-progress`, con la instancia que recibe `startApp()` | F8 | Pasan a la barra lateral (FR-027) |
| `downloadBlob` (import) | F8 | Lo usa la exportación de la barra lateral |

**Lo que queda en `window`:**

| Global y métodos | Quién los lee al empezar F10 | Fuente |
| --- | --- | --- |
| `TallerLab`: `mount`, `unmount`, `init`, `loadWarning`, `getExercises` y `exportState` | `app.js`, los adaptadores de Sistemas y de campaña, y `register-project-kit.ts` | Spec 021, «Qué queda en `window.*`»; spec 022, L11 |
| `TallerCampaign`: `mount`, `unmount`, `refresh` y, si L11 no lo retiró, `sync` | `app.js` y el armado de `progress-backup` | Specs 019 y 022 |
| `TallerSystems`: `init`, `mount`, `unmount` y, si L11 no lo retiró, `sync` | `app.js` y el armado | Specs 018 y 022 |
| `TallerAtlas`: `mount` y `unmount` (con las sesiones de cada idioma en el módulo del adaptador) | `app.js` | `register-atlas.tsx` |
| `TallerLibrary` (F3), el adaptador de Proyecto (F4), `TallerRoute` (F9) y `TallerMethod` (F8): `mount` y `unmount` | `app.js` | Specs 012, 013, 014 y 022 |
| `TallerCampaignEngine` y `TallerSystemsEngine` | Los lectores legacy que queden, o nadie (L10 de F8) | Specs 019 y 022 |
| `TallerProjectKit` | El adaptador de Sistemas | Spec 018 |
| `GUIDE_DATA`, `RUST_*`, `GO_*`, `SYSTEMS_*` y `SYSTEMS_*_LABS` | `app.js` (los tres primeros) y `qa/` | Q3 |

Ya no deberían estar `TallerRunner` (F7a), `TallerEditor`, `TallerExplorers` y `TallerQuestExplorers` (F7b), `TallerEffects` (el último de F5 y F6), `resetSimulations` (el último de F5 y F8), `resetTimer` (el último de F8 y F9) ni el `init` de campaña (F6). Si alguno queda, F10 lo retira igual.

## Qué hereda de cada ítem y qué tiene que estar entregado antes

| Ítem | Qué deja | Qué hace F10 con eso | ¿Entregado antes? |
| --- | --- | --- | --- |
| F2a | Los almacenes y los motores como singletons con `changes`; el catálogo; `startApp()`; el registro de modelos de Sistemas | Los abre desde la raíz en el mismo orden | Sí, por A2 |
| [A2](../006-a2-compuerta-arranque/spec.md) | `runBoot`, la compuerta, `getContent()`, la etapa `legacyViews` con sus `import()`, el tope de 1 250 000 y 17 E2E | Conserva la compuerta y sus E2E; retira `legacyViews` | **Sí** (dependencia directa) |
| F2b | La gramática de URL, los puentes como datos, `features/progress-backup`, los modelos de los exploradores y las reglas de CSS en la hoja de su dueño | La gramática sigue siendo la única fuente de las URL | Sí, por F5 a F8 |
| F3 | La Biblioteca, `TallerLibrary`, el arnés de componentes (jsdom y Testing Library), nuqs con `enableHistorySync()`, la forma de URL de los filtros y lo que decidió sobre el cambio de idioma | Un solo `NuqsAdapter` en la raíz (FR-020); retira el adaptador | **Sí** |
| F4 | Proyecto y su adaptador | Retira el adaptador | **Sí** |
| F5 | Sistemas, `TallerSystems`, `TallerProjectKit`, la sesión de simulaciones en `pages/systems/model` y nuqs (o lo hereda de F3) | Inyecta la descarga del kit; retira los dos globals | **Sí** |
| F6 | La campaña, `TallerCampaign` y el motor inicializado dentro de `startApp()` | Inicializa el motor en la raíz; conserva el efecto de `refresh` | **Sí** |
| F7a y F7b | `features/run-exercise`, el laboratorio y `TallerLab` | Abre el almacén del laboratorio en la raíz; retira el global | **Sí** (F7b) |
| F8 | Método, `TallerMethod`, el armado de `progress-backup` en `src/app/`, `startApp(progressBackup)`, y `#export-progress` y el toast en `app.js` | Usa el armado; mueve la exportación y el toast al shell | **Sí** |
| F9 | El Recorrido, `TallerRoute`, el módulo del temporizador y `#quiz-feedback`, que se recrea | Monta `#quiz-feedback` (FR-045); retira el adaptador | **Sí** |
| F11a | Las etapas de los tokens y de la sesión, la raíz de la cuenta, «Tu cuenta», «pedir el ingreso», el doble de la API en los E2E y el proxy de `/api/` | Conserva las etapas; la raíz de la cuenta, según Q2 | Sí, por F8 |
| F12a | La página de la administración separada del diálogo, la condición de admin en un solo lugar y un único método de apertura en el Page Object | La monta como ruta (Q4) | No hace falta (FR-044) |
| A3, A4, D1c, C4, F11b a F11d, F12b y F13 | — | No los espera; si alguno está en curso, se integra de a uno (FR-059) | No |

## El arranque después de F10

Con Q2 en el borrador A:

1. **`main.tsx`** importa las hojas en el orden de hoy, crea la raíz única y corre `runBoot` con las etapas de hoy, sin `legacyViews`:
   - la de los tokens (F11a);
   - la de la sesión (F11a, que A3 extiende);
   - la compuerta del contenido (A2);
   - una etapa del shell, nueva.
2. **Mientras corren las etapas,** la raíz dibuja lo que cada una pide: el acceso, la carga o el error del contenido. El shell muestra sólo lo que no depende del contenido (Q5).
3. **La etapa del shell** abre los almacenes y los motores en el orden de `startApp()`:
   1. el del laboratorio;
   2. el del recorrido, con la guía;
   3. el motor de campaña;
   4. el de Sistemas.

   Después arma `progress-backup` con lo que F8 dejó en `src/app/`, fija el idioma con `syncLinkedLanguage` y muestra la vista del hash. Los avisos de carga salen juntos en un solo toast (FR-036).
4. **Desde ahí, el router** muestra la página de cada navegación. «Pedir el ingreso» puede volver a mostrar el acceso, en la misma raíz.

Evaluar cualquier módulo no arranca nada (F2-I1): ni almacenes, ni oyentes, ni temporizadores. Sólo `main.tsx` corre el arranque, una vez.

## Lo que cambia a propósito

Cada fila va en su propio commit, con TDD: primero la prueba que falla contra la base por la razón esperada, después el cambio.

| Cambio | Decisión | Qué prueba cambia | Aprobación |
| --- | --- | --- | --- |
| La administración pasa de diálogo a ruta (`#administracion`) | F12-Q1; la forma, Q4 | Los E2E de F12a que la abren y la cierran (historia 5, escenarios 2 y 3), a través del único método del Page Object; uno nuevo por enlace y por recarga | Usuario (F12-Q1); la forma, en el clarify |
| `#quiz-feedback` queda montada, vacía hasta que hay respuesta, con su regla `:empty` | X2 | Un E2E nuevo: la región existe antes de responder y su texto cambia en el lugar. Los de F9 que miran la devolución se revisan en el commit en rojo | Usuario (X2) |
| `<body>` deja de llevar `aria-pressed` | F1 lo fijó como defecto, y la spec de F9 lo deja a «quien porte el shell» | `views.spec.ts`, «KNOWN DEFECT (new, found by F1): <body> carries aria-pressed…», que pasa a fijar que `<body>` no lo lleva | **Pendiente:** el usuario lo aprueba en el clarify o en el PR. Si no lo aprueba, el shell lo reproduce |
| Los conteos del menú salen del catálogo; antes del contenido, según Q5 | Hoja de ruta; Q5 | Ninguna de hoy; uno nuevo con los cuatro valores | Hoja de ruta; Q5 |
| `index.html` pierde el marcado del shell, que dibuja la raíz | Q2 | Ninguno: los E2E ubican el shell por roles e ids | Q2 |
| Se retiran `boot-check`, `load-order-check` y `app-shell-check`, y los globals de catálogos con su oráculo | Hoja de ruta; Q3 | Cada escenario, en la tabla de correspondencia (FR-052) | Hoja de ruta; Q3 |

## Qué cambia en `dist/index.html`

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `dist/content/curriculum.<versión>.json` | No | `content/` y el generador no cambian; `build-check` compara sus bytes con los del generador |
| El marcado de `frontend/src/index.html` | Sí (Q2) | Sale el shell estático, que dibuja la raíz; queda el contenedor, el `noscript` y el script. El DOM después de arrancar es el de hoy, salvo lo listado (FR-024) |
| `<style>` | Sí | Las reglas del shell pasan a su hoja (cambia el orden) y las que ya nadie usa salen (FR-054 y FR-055) |
| `<script type="module">` | Sí | Salen `app.js`, los adaptadores, `legacyViews` y los `register-*`; entran la raíz, el shell, el router y, si el spike lo elige, una librería |
| El tamaño | Se informa | Antes y después, con el aumento del router aparte; bajo 1 250 000 |
| Los avisos de licencia | Sólo si entra un router | Su aviso en `frontend/THIRD-PARTY-NOTICES.txt` |

## Cómo se demuestra que nada cambió

| Qué se afirma | Cómo se demuestra | Requisitos |
| --- | --- | --- |
| Las URL, las recargas, el historial y las ocho vistas | Los 106 E2E de F1 (`url-contract`, `views`, `reload` y los demás), sin editar salvo la fila del `aria-pressed` | FR-002, FR-012 a FR-018 |
| El arranque y la compuerta | Los 17 E2E de A2 y `startup-storage` de F1, sin editar, más los E2E del arranque que reemplazan a `boot-check` | FR-034 a FR-040, FR-057 |
| Cada página | Los E2E de F3 a F9, sin editar, con sus remontajes | FR-002, FR-030 |
| El acceso y la cuenta | Los E2E de F11a, sin editar, con el doble de la API | FR-039 |
| El DOM del shell | Una comparación única del DOM fuera de `#main`, entre la base y F10, sobre una grilla de estados | FR-024 |
| El aspecto | El barrido de estilo computado y el multiconjunto de reglas de la unidad 8 de F2b, ampliados al shell | FR-054 y FR-055 |
| Lo guardado | Las fixtures congeladas arrancan sin escribir; `storage.watchWrites()` cuenta las escrituras | FR-036 y FR-037 |
| El retiro | `grep` en 0, la tabla de correspondencia de los tres checks y `seams-guard-check` en 0 violaciones | FR-047 a FR-053 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno navega por el taller como hoy (Priority: P1)

El alumno usa el menú, los enlaces, Atrás y Adelante, y el salto al contenido. Ve las mismas vistas, en las mismas URL, con las mismas recargas.

**Why this priority**: es lo que el alumno toca en cada sesión, y lo que más fácil rompe un router.

**Independent Test**: con el build servido, recorrer el menú, seguir los once enlaces que cambian la query, usar Atrás y Adelante, abrir URL desconocidas y usar el salto al contenido con el teclado.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío, **cuando** se abre cada una de las ocho vistas por hash, **entonces** se ve su título y sólo su enlace del menú lleva `aria-current="page"`.
2. **Dado** `#recorrido`, **cuando** el alumno recorre los siete enlaces de hash del menú, **entonces** cada URL es `#vista`, sin barra, y el documento no se recarga.
3. **Dado** dos navegaciones por el menú, **cuando** el alumno usa Atrás dos veces, **entonces** vuelve a cada vista anterior, y cada navegación sumó una sola entrada al historial.
4. **Dado** cada uno de los enlaces L1 a L11 de `reload.spec.ts`, **cuando** el alumno lo sigue, **entonces** el documento se recarga y llega a la URL de hoy.
5. **Dado** una navegación por hash, **cuando** se muestra la vista nueva, **entonces** la página se monta una sola vez, el desplazamiento vuelve arriba y el foco queda en `#main` sin desplazar.
6. **Dado** `/`, `#` o `#loquesea`, **cuando** se abre, **entonces** se ve el Recorrido y la URL queda como estaba.
7. **Dado** cualquier vista, **cuando** el alumno activa «Ir al contenido» con el teclado, **entonces** el foco pasa a `#main`, la URL no cambia y la vista sigue siendo la misma.
8. **Dado** el temporizador en marcha y una sesión del Atlas abierta, **cuando** el alumno navega por hash y vuelve, **entonces** siguen como estaban; **cuando** sigue un enlace que cambia la query, **entonces** se pierden, como hoy.
9. **Dado** una misión de campaña aprobada en el laboratorio, **cuando** el alumno vuelve a la campaña por el menú, **entonces** la campaña la cuenta, sin que nada se escriba al mostrarla (`cycle.spec.ts`, sin editar).

*Cubre: FR-012 a FR-019, FR-030, FR-031 y FR-056; SC-001 y SC-010.*

---

### User Story 2 - El idioma sigue al alumno y a sus enlaces (Priority: P1)

El alumno cambia de lenguaje con el selector o llega por un enlace que trae un ejercicio, un mundo o un taller de un lenguaje. El taller muestra ese lenguaje, escribe la URL como hoy y avisa.

**Why this priority**: el idioma es estado del shell que todas las páginas leen; un error se ve en todas.

**Independent Test**: cambiar de idioma desde cada vista con una query ajena; abrir `?ejercicio=go-113&paso=code#laboratorio`, `?mundo=go-world-2#campana` y `?lenguaje=go#sistemas` con el progreso congelado (idioma Go o Rust).

**Acceptance Scenarios**:

1. **Dado** `/?basura=1#vista`, para cada una de las ocho vistas, **cuando** el alumno elige Go, **entonces** el botón Go lleva `aria-pressed="true"` y Rust `"false"`, y la URL queda como hoy: `/?basura=1&lenguaje=go#sistemas` en Sistemas y `#vista` en las demás (o lo que F3 haya decidido para la Biblioteca).
2. **Dado** lo anterior, **cuando** se cambia el idioma, **entonces** `taller-learning-v1` se escribe una vez, la página se remonta en el idioma nuevo, el toast dice «Recorrido de Go. Tu otro avance sigue guardado.» y `<body>` lleva `data-language="go"`.
3. **Dado** el idioma activo, **cuando** el alumno elige el mismo, **entonces** no pasa nada: ni escritura, ni aviso, ni remontaje.
4. **Dado** el progreso congelado con el idioma Go, **cuando** se abre `?ejercicio=rust-02&paso=learn#laboratorio`, **entonces** el taller muestra Rust sin escribir el idioma (rareza conservada: `syncLinkedLanguage` cambia el idioma en memoria).
5. **Dado** `?mundo=<mundo de Go>#campana` o `?lenguaje=go#sistemas`, **cuando** se abre o se navega hasta ahí, **entonces** el idioma pasa a Go antes de dibujar la página.
6. **Dado** cualquier idioma, **cuando** se lee `<body>`, **entonces** lleva `data-language` y no lleva `aria-pressed` (cambio a propósito, con la aprobación del usuario: FR-046).

*Cubre: FR-020 a FR-023, FR-030 y FR-046; SC-001.*

---

### User Story 3 - La barra lateral, el pie, la exportación y los avisos funcionan como hoy (Priority: P1)

El alumno ve su avance en la barra lateral, el pie le dice si se guarda, exporta su progreso desde cualquier vista y recibe los avisos en el mismo lugar.

**Why this priority**: es lo único del shell que muestra datos, y cada página escribe datos que la barra lateral tiene que reflejar.

**Independent Test**: marcar un paso, exportar desde la barra lateral, arrancar con el almacenamiento bloqueado y con copias ilegibles, y leer los conteos del menú.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío, **cuando** el alumno marca el primer paso del Recorrido, **entonces** la barra lateral dice «RUST», «1 de 12», «8%» y la barra de progreso vale 1 de 12, sin recargar.
2. **Dado** cualquier vista, **cuando** el alumno usa «Exportar mi progreso», **entonces** descarga `taller-progreso-AAAA-MM-DD.json` con la forma de hoy y el toast dice «Copia de progreso exportada.».
3. **Dado** el almacenamiento bloqueado, **cuando** arranca y el alumno marca un paso, **entonces** el pie dice «Exportá para conservar tu avance» y el aviso de arranque es el de hoy.
4. **Dado** copias ilegibles del recorrido y de campaña, **cuando** arranca, **entonces** sale un solo toast con los avisos unidos por « · », en el orden recorrido, campaña, Sistemas y laboratorio, y cada copia queda respaldada como hoy.
5. **Dado** el contenido de hoy, **cuando** arranca, **entonces** el menú muestra 4 en Campaña, 25 en Sistemas, 274 en Laboratorio y 15 en Biblioteca.
6. **Dado** dos avisos seguidos, **cuando** sale el segundo, **entonces** reemplaza al primero en `#toast` y se ve 4,5 s desde el segundo.
7. **Dado** la grilla de estados de FR-024, **cuando** se compara el DOM fuera de `#main` con el de la base, **entonces** sólo aparecen las diferencias listadas.

*Cubre: FR-024 a FR-029, FR-032, FR-033 y FR-036; SC-001, SC-004 y SC-006.*

---

### User Story 4 - El arranque pasa por el acceso y la compuerta, y termina en una sola raíz (Priority: P1)

Quien abre el taller ve el acceso si no tiene sesión, la carga o el error del contenido si tarda o falla, y después el taller, como hoy. Por dentro, todo lo dibuja una sola raíz.

**Why this priority**: el arranque es el contrato que comparten A2, F11a, A3 y D1c, y el orden de inicialización tiene un riesgo alto verificado (el motor de campaña lanza si se usa antes de `init`).

**Independent Test**: arrancar con y sin sesión (el doble de la API), con el contenido lento, fallido y recuperado, con las fixtures congeladas y con `#invitacion=<token>`; contar las raíces y las escrituras.

**Acceptance Scenarios**:

1. **Dado** las fixtures congeladas de master, **cuando** arranca y se recorren las ocho vistas, **entonces** no hay escrituras, ni claves `:respaldo`, ni avisos.
2. **Dado** el contenido que falla y después responde, **cuando** el alumno usa «Reintentar», **entonces** se ven el error y la recuperación de hoy dentro de `#main`, sin recargar, con un pedido por intento (los 17 E2E de A2, sin editar).
3. **Dado** una sesión vencida, **cuando** arranca, **entonces** se ve el acceso de F11a y nada del taller responde detrás; al ingresar, el taller arranca sin recargar (los E2E de F11a, sin editar).
4. **Dado** `#invitacion=<token>`, **cuando** arranca, **entonces** el token sale de la URL antes de que el router mire el hash, y el alta de F11a se muestra.
5. **Dado** el taller arrancado, **cuando** se cuentan las raíces de React del documento, **entonces** hay una.
6. **Dado** una copia de campaña ilegible, **cuando** arranca y se navega, **entonces** la copia no se pisa ni se borra, y con la clave de campaña ausente, arrancar y navegar no la crean.

*Cubre: FR-034 a FR-040, FR-057; SC-001, SC-003 y SC-006.*

---

### User Story 5 - Quien administra llega a la administración por un enlace (Priority: P2)

Un admin abre la administración desde «Tu cuenta» o pegando su enlace, la recarga sin perderla y la cierra volviendo a donde estaba. Una cuenta que no es admin no la ve.

**Why this priority**: es la mitad de F12-Q1 que el usuario dejó para F10; no afecta al alumno.

**Independent Test**: con el doble de la API, una sesión admin y otra de alumno, abrir `#administracion` por el enlace de «Tu cuenta», por URL y por recarga, y cerrarla.

**Acceptance Scenarios** (con Q4 en el borrador A):

1. **Dado** una sesión admin en `#campana`, **cuando** usa «Administrar el taller» en «Tu cuenta», **entonces** la URL pasa a `#administracion`, la administración se ve en «Cuentas» y ningún enlace del menú lleva `aria-current`.
2. **Dado** lo anterior, **cuando** recarga, **entonces** sigue en la administración.
3. **Dado** la administración abierta desde `#campana`, **cuando** usa «Cerrar», **entonces** vuelve a `#campana`; si había entrado por enlace, vuelve a `#recorrido`.
4. **Dado** una sesión de alumno, **cuando** abre `#administracion`, **entonces** ve el Recorrido, la URL queda como estaba y no se pide nada a `/api/admin`.
5. **Dado** la administración abierta, **cuando** se lee la URL, **entonces** no lleva ningún nombre, email, filtro ni enlace de invitación.

*Cubre: FR-041 a FR-044; SC-011.*

---

### User Story 6 - La devolución de la lección queda montada (Priority: P3)

Quien usa un lector de pantalla escucha la devolución de la pregunta de la lección, porque la región ya existe antes de que llegue el texto.

**Why this priority**: es una mejora de accesibilidad acordada (X2), chica y aislada.

**Independent Test**: abrir una lección, comprobar que la región existe vacía y sin borde, responder y comprobar el texto; la comprobación con lector de pantalla la hace el usuario.

**Acceptance Scenarios**:

1. **Dado** una lección sin responder, **cuando** se abre, **entonces** `#quiz-feedback` existe, con `role="status"` y `aria-live="polite"`, vacía, y no se ve ni ocupa espacio.
2. **Dado** lo anterior, **cuando** el alumno responde, **entonces** el texto aparece en la misma región, sin recrearla, con el aspecto de hoy.
3. **Dado** una lección ya respondida, **cuando** se abre, **entonces** la devolución ya está.

*Cubre: FR-045; SC-001.*

---

### User Story 7 - Lo legacy desaparece y `qa/` se queda con lo que sirve (Priority: P2)

Quien mantiene el front encuentra una aplicación de React sin `app.js`, sin adaptadores ni globals, con `styles.css` reducido a la base, y una red que cubre lo que cubrían los checks retirados.

**Why this priority**: es el objetivo del épico, pero no cambia nada para el alumno.

**Independent Test**: `grep` sobre `frontend/`, la tabla de correspondencia, `seams-guard-check` y el barrido de estilo computado.

**Acceptance Scenarios**:

1. **Dado** el árbol después de F10, **cuando** se busca `window.Taller`, `register-`, `legacyViews`, `startApp` y `frontend/app.js`, **entonces** no hay ninguna aparición en `frontend/`, y `createRoot` aparece una sola vez.
2. **Dado** cada escenario de `boot-check`, `load-order-check` y `app-shell-check`, **cuando** se lee la tabla del PR, **entonces** figura cubierto por un E2E o una spec con su nombre, o descartado con su motivo.
3. **Dado** `styles.css`, **cuando** se lo lee, **entonces** tiene sólo tokens, reglas globales y clases base, y cada regla que salió figura con su destino o con la evidencia de que nadie la usa.
4. **Dado** el orden de las etapas, **cuando** alguien las permuta, **entonces** falla una prueba.
5. **Dado** el router y el shell, **cuando** corre `npm run test:unit`, **entonces** sus specs pasan con URL y textos escritos a mano, y la documentación nombra la raíz, el router y los checks que quedan.

*Cubre: FR-047 a FR-055 y FR-058 a FR-060; SC-003, SC-005, SC-007, SC-009 y SC-012.*

---

### User Story 8 - El spike decide el router con datos (Priority: P1)

Quien planifica F10 sabe, antes de escribir el shell, qué router entra o por qué no entra ninguno, con las medidas sobre la base real.

**Why this priority**: todo lo demás se apoya en esa decisión, y una librería mal elegida rompe el contrato de URL o el tope.

**Independent Test**: el informe del spike, con los ocho criterios y el peso de cada candidato, y la decisión con la regla.

**Acceptance Scenarios**:

1. **Dado** los tres candidatos, **cuando** corre el spike, **entonces** cada uno tiene su resultado en C1 a C8 y, si los pasa, su aumento medido en `dist/index.html`.
2. **Dado** los resultados, **cuando** se aplica la regla, **entonces** la decisión se puede reproducir desde el informe.
3. **Dado** una librería elegida, **cuando** se va a instalar, **entonces** el usuario ya dio permiso con su nombre, su versión exacta, su origen y su peso.

*Cubre: FR-007 a FR-011; SC-002.*

---

### Edge Cases

- **`hashchange` y `popstate` llegan los dos por una sola navegación:** la página se monta una vez (hoy lo evita `lastNavigation`).
- **Una navegación con la lección de F9 o un diálogo de una página abiertos:** se cierran con la página, como dejó cada port.
- **El alumno vuelve con Atrás a una URL con query** (por ejemplo, desde `#biblioteca` a `?mundo=…#campana` sin recarga, porque llegó por hash): la página lee la query de esa URL, como hoy.
- **Un 401 con una página abierta** (A3, F12): «pedir el ingreso» muestra el acceso; al volver con la misma cuenta, la página sigue donde estaba.
- **La cuenta pierde el rol con la administración abierta:** el siguiente pedido recibe 403 y la página muestra su mensaje con «Recargar» (F12). Al recargar, `#administracion` muestra el Recorrido (Q4, A).
- **`#administracion` sin F12a entregada:** cae en el Recorrido, como un hash desconocido (FR-044).
- **El almacenamiento bloqueado o lleno:** el shell funciona, el pie cambia y los avisos son los de hoy.
- **Otra pestaña guarda el recorrido:** la barra lateral muestra el estado fusionado en la próxima escritura o el próximo remontaje, como hoy; el shell no escucha el evento `storage`.
- **Un ejercicio de un idioma en `?ejercicio=` y otro idioma guardado:** gana el del enlace, en memoria, sin escribir (US2, escenario 4).
- **Un enlace de mundo o de ejercicio que no existe:** el idioma no cambia; la página resuelve el caso como hoy.
- **El contenido no llega:** la compuerta muestra su error; el shell no muestra conteos (Q5, A) y no se monta ninguna página.
- **Pulsar «Ir al contenido» con el contenido cargando:** el foco va a `#main`, que tiene la carga o el error.
- **Un `import()` que A3 o C4 sumen después:** no es de F10; el tope y `build-check` lo vigilan.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de todo port** *(de la hoja de ruta y de los criterios globales)*

- **FR-001**: Cada parte DEBE abrir con sus E2E de comportamiento, escritos con el Page Object del shell (`qa/e2e/pages/shell.ts`, ampliado) contra la base de F10 y en verde antes de cambiar el código, y esos E2E DEBEN pasar sin editarse después. Los de «Lo que cambia a propósito» se escriben con el comportamiento nuevo, fallan contra la base por esa razón y van en su propio commit, con TDD. *(Hoja de ruta, «E2E primero»; ADR 0008)*
- **FR-002**: Todos los E2E de la base de F10 DEBEN pasar sin editarse con el build de F10: los 106 de F1, los 17 de A2 y los de F3 a F9, F11a y F12a. Las únicas excepciones son las de «Lo que cambia a propósito». Editar cualquier otro es un cambio de comportamiento: va en su commit, con TDD y con la aprobación del usuario.
- **FR-003**: F10 NO DEBE agregar estilos en línea (`style=`, `setAttribute('style', …)` ni `style.cssText`) ni dependencias de ejecución, salvo la que elija el spike, con permiso. *(`AGENTS.md`; C4)*
- **FR-004**: `dist/index.html` DEBE conservar la forma de A2 (un documento con un script y un estilo en línea, y el contenido en su propio archivo) y quedar bajo el tope de `qa/build-check.ts` (`BOOT_SIZE_LIMIT`, 1 250 000 caracteres). El PR DEBE informar su tamaño antes y después, con el aumento del router aparte. *(Hoja de ruta, criterios globales)*
- **FR-005**: Los avisos de complejidad que queden en `app.js` DEBEN desaparecer con él, y ninguna función nueva DEBE pasar de 10 sin justificarlo en la revisión. El total de `npm run lint` no sube, y de los 29 avisos de las seis vistas no queda ninguno. *(Hoja de ruta; `docs/architecture.md`)*
- **FR-006**: Cada parte DEBE entregarse como un PR que se puede revertir entero, con la red en verde. Cada cambio de comportamiento DEBE empezar con una prueba que falla por la razón esperada. *(Constitución, principio II)*

**El spike del router**

- **FR-007**: La primera tarea DEBE ser el spike, antes de cualquier código de producción. Corre en una copia descartable de la base de F10, sin tocar el repositorio, y mide tres candidatos: un router propio sobre `url-grammar`; React Router con `createHashRouter` (modo de datos) y, si hace falta, `HashRouter`; y TanStack Router con `createHashHistory` o con una historia propia. Cada uno va con la versión del registro de ese día.
- **FR-008**: Cada candidato DEBE medirse contra los ocho criterios del contrato (C1 a C8, «El spike del router»), y fallar uno lo descarta: la vista en `#vista` sin barra y sin reescribir `/`; la query antes del hash, leída de `location.search` por `readLinkQuery` y por nuqs; las 11 recargas; el historial; las escrituras con `replaceState` sin navegación y vistas por nuqs; los tokens fuera del router; el hash desconocido sin reescribir; y lo que sobrevive en memoria.
- **FR-009**: Para cada candidato que pase los ocho, el spike DEBE medir el aumento real de `dist/index.html` en caracteres, construido sobre la base de F10, y registrar su licencia, sus dependencias, su tamaño desempaquetado y qué resuelve que el router propio no resuelve.
- **FR-010**: Entra el router propio, salvo que una librería pase los ocho criterios, resuelva algo nombrado que F10 necesita y el propio no, y sume como mucho un cuarto del margen que quede bajo el tope al empezar F10. **[NEEDS CLARIFICATION: Q1, la regla del spike]**
- **FR-011**: El spike DEBE dejar su informe en la investigación del plan: las medidas, la decisión con la regla aplicada y la documentación consultada (Context7 y el registro). Si gana una librería, DEBE pedirse el permiso del usuario, con el nombre, la versión exacta, el origen y el peso, antes de instalarla, y su aviso de licencia entra en `frontend/THIRD-PARTY-NOTICES.txt`.

**El contrato de URL y la navegación**

- **FR-012**: `shared/config/url-grammar` DEBE seguir siendo el único lugar que conoce las formas de URL. El router DEBE leer la vista con `viewFromHash` y los parámetros con `readLinkQuery`, y la forma de la administración (Q4) DEBE entrar ahí, con su spec de cadenas escritas a mano, sin cambiar la lista de las ocho vistas.
- **FR-013**: Las ocho vistas por hash, las formas con query de «El contrato de URL que se conserva» y los fragmentos con token DEBEN llevar adonde llevaban. `url-contract`, `views` y `reload` de F1 pasan sin editarse, salvo la fila del `aria-pressed`.
- **FR-014**: Ninguna vista DEBE ir en el path, y `docker/nginx/nginx.conf` NO DEBE cambiar.
- **FR-015**: Los enlaces que cambian la query DEBEN seguir siendo navegaciones del documento: el router NO DEBE interceptarlos. Los que sólo cambian el hash NO DEBEN recargar.
- **FR-016**: Cada navegación DEBE remontar la página una sola vez, aunque lleguen `hashchange` y `popstate`. Antes de mostrarla, fija el idioma con `syncLinkedLanguage`. Después, lleva el desplazamiento arriba al instante y pone el foco en `#main` sin desplazar. El primer dibujo del arranque no mueve el foco ni el desplazamiento.
- **FR-017**: Cada navegación por hash DEBE sumar una sola entrada al historial, y Atrás y Adelante DEBEN mostrar la vista de esa entrada. Las escrituras con `replaceState` NO DEBEN sumar entradas ni disparar una navegación.
- **FR-018**: Un hash desconocido, vacío o ausente DEBE mostrar el Recorrido sin reescribir la URL.
- **FR-019**: «Ir al contenido» DEBE poner el foco en `#main` y desplazarlo al inicio, sin cambiar la URL ni la vista.
- **FR-020**: La raíz DEBE tener un solo `NuqsAdapter`, de `nuqs/adapters/react`, con `enableHistorySync()` activado una sola vez. No se usa el adaptador de nuqs de un router, porque en modo hash leería la query dentro del hash. Los filtros de F3 y la selección de F5 siguen igual (sus E2E, sin editar).

**El idioma**

- **FR-021**: El router DEBE fijar el idioma desde la URL como `syncLinkedLanguage` hoy, al arrancar y en cada navegación: `?lenguaje=` válido en `#sistemas`; el lenguaje del mundo de `?mundo=` en `#campana`; y el del ejercicio de `?ejercicio=` en `#laboratorio`. Lo fija en memoria, sin guardar (rareza conservada), y lee los mundos y los ejercicios del catálogo, sin `window`.
- **FR-022**: El selector de lenguaje DEBE conservar su grupo («Lenguaje del recorrido»), sus botones con `aria-pressed` y su comportamiento. Elegir el idioma activo no hace nada. Elegir el otro reescribe la URL con `withLanguageQuery`, como al empezar F10, y después guarda una vez, remonta la página y avisa «Recorrido de <lenguaje>. Tu otro avance sigue guardado.».
- **FR-023**: `<body>` DEBE llevar `data-language` con el idioma activo, que tematiza `--accent*`.

**El shell**

- **FR-024**: El shell DEBE producir el mismo DOM que hoy fuera de `#main`: la barra lateral, el menú, la barra superior con «Tu cuenta», el pie, el salto al contenido y `#toast`, con sus etiquetas, clases, ids, roles, `aria-*`, textos y orden. Una comparación única contra la base, sobre una grilla de estados (las nueve rutas, los dos idiomas, con y sin avance, con el almacenamiento bloqueado, con y sin sesión de admin), lo mide en el PR. Las diferencias se listan: el `aria-pressed` de `<body>` y el contenedor de la raíz, si lo hay.
- **FR-025**: La barra lateral DEBE mostrar el avance del recorrido del idioma activo («RUST», «N de M», el porcentaje redondeado y la barra de progreso) y actualizarlo después de cada escritura de cualquier página, sin que la página conozca al shell. DEBE leer la revisión de `routeStore.changes` con un selector chico, nunca con el store entero.
- **FR-026**: El pie DEBE decir «Guardado en este navegador» o «Exportá para conservar tu avance» según `routeStore.storageAvailable()`, como hoy.
- **FR-027**: «Exportar mi progreso» DEBE descargar el mismo archivo (`taller-progreso-AAAA-MM-DD.json`, con la forma de hoy) y avisar «Copia de progreso exportada.», con la única instancia de `progress-backup` del armado de `src/app/`.
- **FR-028**: `#toast` DEBE ser una sola región (`role="status"`, `aria-live="polite"`), montada desde el primer dibujo, que muestra cada aviso 4,5 s y reinicia la cuenta con el siguiente. Es el único aviso de todas las páginas, que lo reciben sin prop drilling.
- **FR-029**: El enlace del menú de la vista actual DEBE llevar `aria-current="page"`, y ninguno lo lleva en la ruta de la administración.
- **FR-030**: El router DEBE conservar los remontajes que el shell hace al empezar F10: la página se remonta en cada navegación y en cada cambio de idioma. Importar y «Borrar todo» siguen haciendo lo que dejó F8. Las sesiones de módulo (el temporizador, el Atlas y las simulaciones) sobreviven al remontaje, y se pierden al recargar.
- **FR-031**: Antes de mostrar la campaña, su estado derivado del laboratorio DEBE estar al día, como lo deja hoy `TallerCampaign.refresh()` en cada `render()`, sin escribir nada. Lo prueban, sin editarse, los E2E de `cycle.spec.ts` y los de F6.

**Los conteos del menú**

- **FR-032**: Los conteos del menú DEBEN salir del catálogo y dar los textos de hoy:
  - Campaña: los mundos del idioma activo (4);
  - Sistemas: los talleres (25);
  - Laboratorio: los ejercicios de los dos idiomas (274);
  - Biblioteca: los recursos (15).

  Lo que cuenta cada uno es una lectura de esta spec que el usuario puede corregir. Hoy el laboratorio muestra 137 por idioma y el menú, 274, y cambiar eso es otro commit.
- **FR-033**: Antes de que la compuerta publique el contenido, el shell DEBE mostrar lo que no depende de él, y los conteos, el idioma y el avance aparecen con el contenido. **[NEEDS CLARIFICATION: Q5, qué muestra el shell antes del contenido]**

**El arranque y la raíz única**

- **FR-034**: El front DEBE tener una sola raíz de React (una llamada a `createRoot`), creada al arrancar, que dibuja el acceso de F11a, la carga y el error de la compuerta y después el shell con la página. Ningún contenedor tiene dos dueños: la compuerta deja de escribir `#main` con `innerHTML`. Los diálogos usan portales dentro de esa raíz. **[NEEDS CLARIFICATION: Q2, la raíz única con el acceso y la compuerta]**
- **FR-035**: Las etapas DEBEN correr en el orden de hoy: la de los tokens, la de la sesión, la compuerta y el shell. Nada pide a la red antes de borrar los tokens, el contenido no se pide sin sesión, y el shell no lee el contenido antes de que la compuerta lo publique. A3 sigue extendiendo la etapa de sesión sin sumar otra.
- **FR-036**: La etapa del shell DEBE abrir los almacenes y los motores en el orden de `startApp()` (el laboratorio, el recorrido con la guía, la campaña y Sistemas), antes de que se dibuje cualquier página, y mostrar los avisos de carga en un solo toast, unidos por « · », en el orden recorrido, campaña, Sistemas y laboratorio.
- **FR-037**: Con las tres fixtures congeladas, el arranque y el recorrido de las ocho vistas NO DEBEN escribir, respaldar ni avisar. Con el almacenamiento bloqueado, el taller arranca con el aviso y el pie de hoy. Una copia ilegible no se pisa, y una clave ausente no se crea al arrancar ni al navegar. *(ADR 0003)*
- **FR-038**: La compuerta DEBE conservar lo que fijan sus 17 E2E: la carga dentro de `#main` sólo después de 400 ms, el error con `role="alert"` y «Reintentar» con el foco, un pedido por intento y la recuperación sin recargar. Su lógica (`content-gate.ts`) no cambia; cambia cómo se dibuja.
- **FR-039**: El acceso, «Tu cuenta», «Salir» y «pedir el ingreso» de F11a DEBEN conservar su comportamiento y sus E2E. La entrada «Tu cuenta» pasa a ser parte del shell, en el mismo lugar de la barra superior, y el diálogo sigue siendo un diálogo (F11-Q3).
- **FR-040**: Evaluar cualquier módulo de `frontend/src` NO DEBE abrir almacenes, leer el almacenamiento, registrar oyentes ni crear temporizadores. Sólo `main.tsx` corre el arranque, una vez. *(F2-I1)*

**La administración como ruta** *(F12-Q1)*

- **FR-041**: Con F12a entregada, la administración DEBE ser una ruta enlazable: `#administracion`, dibujada en `#main` dentro del shell, fuera del menú de ocho vistas, con la sección fuera de la URL. La URL NUNCA lleva un nombre, un email, un filtro con datos de una persona ni un enlace. **[NEEDS CLARIFICATION: Q4, la forma de la ruta y qué ve quien no es admin]**
- **FR-042**: Una cuenta sin el rol admin que abre la ruta DEBE ver el Recorrido, sin reescribir la URL y sin pedir nada a `/api/admin`. La condición de admin es la de F12a, en un solo lugar. El servidor sigue siendo la autoridad.
- **FR-043**: «Administrar el taller», en «Tu cuenta», DEBE pasar a ser un enlace a la ruta, y «Cerrar» DEBE volver a la vista de la que vino, o a `#recorrido` si se entró por enlace. El contenedor de diálogo de F12a se retira y la página no cambia. Los E2E que abren y cierran el diálogo se reescriben, con TDD y en su propio commit, cambiando sólo el método de apertura del Page Object, y se suman los de enlace y recarga.
- **FR-044**: Si F12a no está entregada al empezar F10, F10 NO DEBE construir la ruta. La administración nace como ruta cuando llegue, y el plan de F12a lo consulta con el usuario (spec 023).

**Lo que cambia a propósito**

- **FR-045**: `#quiz-feedback` DEBE quedar montada mientras la lección está abierta (`role="status"`, `aria-live="polite"`), vacía hasta que hay respuesta, y su texto cambia en el lugar. Una regla `:empty` le quita el borde, el relleno y el margen sin sacarla del árbol de accesibilidad: nada de `display: none` ni de `visibility: hidden`. La comprobación con lector de pantalla, antes sobre la base y después sobre F10, es una acción del usuario. *(X2)*
- **FR-046**: `<body>` NO DEBE llevar `aria-pressed`. El E2E «KNOWN DEFECT (new, found by F1)…» de `views.spec.ts` se reescribe para fijarlo, en su propio commit, con TDD y con la aprobación del usuario. Sin esa aprobación, el shell reproduce el defecto.

**El retiro**

- **FR-047**: `frontend/app.js` DEBE borrarse, junto con la etapa `legacyViews`, su lista de módulos, `startApp()` y el import de `app.js`. Sus responsabilidades pasan a la raíz, el shell y el router (FR-012 a FR-036).
- **FR-048**: F10 DEBE empezar con un inventario del código real de cada `window.*` del taller y de sus lectores. Después DEBE retirar todos los `window.Taller*` y los `register-*` que los publicaban, con sus declaraciones `declare global`. Al terminar, ningún módulo de `frontend/` publica nada en `window`, y la búsqueda de `window.Taller` y `register-` da 0 en `frontend/`.
- **FR-049**: Los globals de catálogos (`GUIDE_DATA`, `RUST_*`, `GO_*`, `SYSTEMS_*` y `SYSTEMS_*_LABS`) y sus cinco adaptadores DEBEN retirarse. Los checks de `qa/` que los usan como cargador pasan a leer el contenido con el módulo de contenido, sin cambiar sus valores esperados. `tools/content/dump-globals.ts` y la prueba de globals de `qa/dist-content-check.ts` se retiran, con su motivo en la tabla de correspondencia. **[NEEDS CLARIFICATION: Q3, los globals de catálogos]**
- **FR-050**: El estado de módulo que hoy guardan los adaptadores DEBE pasar a un módulo de la página o de `app/`, con la misma vida: sobrevive a la navegación por hash y se pierde al recargar. Por ejemplo, las sesiones del Atlas por idioma de `register-atlas.tsx`.
- **FR-051**: Lo que inyectaban los adaptadores DEBE inyectarlo la raíz, sin prop drilling: el contenido de cada página desde `getContent()`, el toast, la descarga del kit de proyecto y la instancia de `progress-backup`. Las páginas siguen sin leer `window` ni `getContent()` (regla R5).
- **FR-052**: Se DEBEN retirar `qa/boot-check.ts`, `qa/load-order-check.ts`, `qa/app-shell-check.ts` y lo que sólo ellos usan: `qa/lib/app-adapters.ts`, `boot-harness.ts`, `app-shell-harness.ts`, `fake-dom.ts` y, con Q3 en A, `legacy-sources.ts`. El PR DEBE traer una tabla con cada escenario: el E2E o la spec que lo cubre, con su nombre, o el motivo del descarte (por ejemplo, «each legacy source evaluated alone», porque ya no hay fuentes legacy). Dos restricciones siguen con una prueba propia: el orden de las etapas y que `styles.css` sea la primera hoja.
- **FR-053**: `seams-guard-check` DEBE conservar sus invariantes con 0 violaciones, apuntando sus reglas a la raíz donde hoy nombran fuentes legacy y adaptadores: una sola instancia por clave, `openVersionedStore` sólo en los cuatro dueños, ningún import de fábricas, el arranque como único lugar que abre los almacenes, `getContent()` sólo en `app/` y los imports por el índice de cada slice.

**El CSS**

- **FR-054**: `frontend/styles.css` DEBE quedar con los tokens (las 13 propiedades de `:root` y las de `body[data-language='go']`), las reglas globales (el documento, la tipografía, `touch-action` y el movimiento reducido) y las clases base, que son las que usan dos o más páginas, o el shell y una página. Las reglas del shell DEBEN mudarse a su propia hoja, enteras y en el orden de hoy, sin cambiar sus declaraciones. Se prueba con el multiconjunto de declaraciones y con el barrido de estilo computado de la unidad 8 de F2b, ampliado al shell (los cuatro anchos de F1, 1 280 y 375 px, el movimiento reducido encendido y apagado, y los dos idiomas), con 0 diferencias.
- **FR-055**: Las reglas que ningún elemento usa en ningún estado de la grilla DEBEN borrarse. Cada una va en una lista del PR con su evidencia (por ejemplo, la cobertura de CSS de Chromium sobre la grilla de estados de todas las páginas), y el barrido sigue en 0 diferencias.

**Las pruebas**

- **FR-056**: Los E2E del shell DEBEN usar el Page Object del shell, con localizadores por rol y nombre accesible, y cubrir:
  - la navegación, el historial, el foco y el desplazamiento, y el salto al contenido;
  - el idioma desde cada vista y desde cada enlace;
  - la barra lateral, el pie y la exportación;
  - el toast y los avisos de carga;
  - los conteos;
  - un montaje por navegación.

  Cada rareza conservada lleva `KNOWN DEFECT` en el nombre.
- **FR-057**: Los E2E del arranque DEBEN reemplazar lo que `boot-check` cubría en un navegador: el orden de inicialización, observado por sus efectos; la copia de campaña ilegible que sobrevive; la clave ausente que no se crea; los avisos de carga juntos; las fixtures congeladas y el almacenamiento bloqueado; y una sola raíz.
- **FR-058**: Las specs nuevas de Vitest DEBEN cubrir el router (el propio o la integración de la librería) con URL escritas a mano, y el shell con componentes en `jsdom` y Testing Library. Los valores esperados salen del contrato, de la red de F1 y de las fixtures, nunca del algoritmo que se prueba.

**La integración**

- **FR-059**: F10 DEBE integrarse de a uno con lo que esté en curso y toque la raíz, el arranque o `qa/`: A3, A4, D1c, C4, F11b, F11c, F11d, F12b y F13. El que llega después rebasa.
- **FR-060**: En el mismo PR, `AGENTS.md` (la lista de vistas legacy y la organización de `frontend/`), `docs/architecture.md` (el mapa y la secuencia de arranque) y `qa/AGENTS.md` (los checks retirados) DEBEN reflejar el cambio. Los integra el agente principal.

### Key Entities *(include if feature involves data)*

- **Raíz única:** la raíz de React que dibuja todo el taller, desde el acceso y la compuerta hasta el shell con la página.
- **Shell:** lo que rodea a la página: la barra lateral, el menú, la barra superior con el selector de lenguaje y «Tu cuenta», el pie, el salto al contenido y `#toast`.
- **Router:** lo que traduce la URL en la página que se muestra y reacciona a las navegaciones. Puede ser propio o una librería (el spike).
- **Vista:** una de las ocho palabras del hash que tiene un enlace en el menú, más la ruta de la administración, que no lo tiene.
- **Navegación:** un cambio de la URL que muestra otra vista, por un enlace de hash, Atrás o Adelante. No lo es una escritura con `replaceState`. Un enlace que cambia la query es una navegación del documento: recarga.
- **Remontaje:** desmontar la página y volver a montarla desde los almacenes. Pasa en cada navegación y en cada cambio de idioma; las sesiones de módulo sobreviven.
- **Etapa de arranque:** un paso de `runBoot`, en orden: los tokens, la sesión, la compuerta y el shell.
- **Conteo del menú:** el número de un enlace del menú, derivado del catálogo.
- **Adaptador mínimo:** un `window.Taller*` que una página publicaba para que `app.js` la montara. F10 los retira todos.
- **Spike:** la medición previa que decide el router con una regla.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Todos los E2E de la base de F10 pasan con el build de F10, con 0 fallas y 0 escenarios editados, fuera de los de «Lo que cambia a propósito».
- **SC-002**: El informe del spike tiene los resultados de los tres candidatos en los ocho criterios y el aumento medido de cada uno que los pasa, y la decisión se reproduce aplicando la regla.
- **SC-003**: Las búsquedas de `window.Taller`, `register-`, `legacyViews` y `startApp` dan 0 en `frontend/`, `frontend/app.js` no existe y hay 1 llamada a `createRoot`.
- **SC-004**: La comparación única del DOM del shell da 0 diferencias sobre su grilla, salvo las listadas en FR-024.
- **SC-005**: El barrido de estilo computado da 0 diferencias, y el multiconjunto de declaraciones es el de la base menos las reglas borradas, cada una listada con su evidencia.
- **SC-006**: Con las fixtures congeladas hay 0 escrituras, 0 claves `:respaldo` y 0 avisos. Los almacenes se abren en el orden de hoy, y un E2E falla si se usa el motor de campaña antes de inicializarlo.
- **SC-007**: El 100 % de los escenarios de `boot-check`, `load-order-check` y `app-shell-check` figura en la tabla de correspondencia.
- **SC-008**: `dist/index.html` queda bajo 1 250 000 caracteres, con su tamaño antes, después y el aumento del router informados.
- **SC-009**: El total de avisos de complejidad no sube, y 0 avisos quedan en código legacy.
- **SC-010**: Cada navegación produce 1 montaje de la página, contado en un E2E.
- **SC-011**: Con F12a entregada, el enlace a la administración la abre, la recarga la conserva y una cuenta de alumno ve el Recorrido, con 0 pedidos a `/api/admin`.
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, y la imagen web sigue construyendo.

## Riesgos

1. **Un router por hash que reescribe el hash** (`#/vista`) o que lee la query dentro del hash. Rompe `url-contract` y los enlaces guardados. *Mitigación:* los criterios C1 y C2 son eliminatorios (FR-008).
2. **Un router que intercepta los enlaces con query.** Cambia las 11 recargas y lo que se pierde en memoria al salir de una misión. *Mitigación:* C3 y C8, y FR-015.
3. **El peso.** Las cotas de bundlephobia superan el margen que queda. *Mitigación:* la regla de FR-010, medida sobre la base real.
4. **La raíz única choca con la compuerta y con la raíz de la cuenta.** Dos escritores sobre un contenedor, o los E2E de A2 y F11a rotos. *Mitigación:* Q2, FR-034, FR-038 y FR-039; sus E2E, sin editar.
5. **El orden de inicialización.** El motor de campaña lanza si se usa antes de `init` (mapa, §12, verificado). *Mitigación:* FR-036, `engine-init-order.spec.ts` y SC-006.
6. **Los remontajes.** Si el router deja de remontar en un cambio de idioma, cambian los estados que fijan los E2E de los ports (por ejemplo, los módulos abiertos de F9). Si remonta de más, se pierden estados. *Mitigación:* FR-030 y SC-010.
7. **Doble manejo de `hashchange` y `popstate`.** Monta dos veces. *Mitigación:* FR-016.
8. **La cascada del CSS** al mudar las reglas del shell y borrar las huérfanas. *Mitigación:* FR-054 y FR-055, con el barrido y el multiconjunto.
9. **Perder cobertura** al retirar tres checks. *Mitigación:* FR-052 y SC-007.
10. **Los ports entregan algo distinto de lo que dicen sus specs.** *Mitigación:* el inventario de FR-048.
11. **nuqs y el router.** Las escrituras ajenas, el parche de `history` de `enableHistorySync()` y el adaptador de un router en modo hash. *Mitigación:* C2 y C5, y FR-020. Que `enableHistorySync()` esté en la versión instalada lo confirman F3 o F5 (V6 de la spec 018).
12. **El primer cuadro sin el shell estático** (Q2, A). *Mitigación:* el script corre en línea apenas se lee el documento, y un E2E mide que el shell está antes de la compuerta.
13. **F12a llega después de F10.** *Mitigación:* FR-044.
14. **Nada se ejecutó al especificar.** No corrieron `npm`, Docker ni un navegador. Las cifras de peso son del registro y de bundlephobia, del paquete entero. *Mitigación:* el spike mide sobre la base de F10.

## Relación con otros ítems

| Ítem | Qué comparte con F10 | Qué hace F10 |
| --- | --- | --- |
| [A2](../006-a2-compuerta-arranque/spec.md) | `runBoot`, la compuerta, `getContent()`, `legacyViews`, el tope y sus 17 E2E | Conserva la compuerta, retira `legacyViews` y mantiene el tope |
| F2b ([plan](../009-f2-seams/plan-f2b.md)) | La gramática de URL, `progress-backup`, el barrido de estilo computado y el multiconjunto | Usa la gramática como única fuente y reutiliza el barrido |
| [F3](../012-f3-biblioteca/spec.md) y [F5](../018-f5-sistemas/spec.md) | nuqs, `enableHistorySync()`, las formas de URL de los filtros y del taller, y `withLanguageQuery` | Un `NuqsAdapter` en la raíz; hereda lo que decidieron |
| [F4](../013-f4-proyecto/spec.md), [F6](../019-f6-campana/spec.md), [F7](../021-f7-laboratorio/spec.md), [F8](../022-f8-metodo/spec.md) y [F9](../014-f9-recorrido/spec.md) | Sus adaptadores, sus remontajes, el armado de `progress-backup`, el toast y la exportación de la barra lateral | Los retira o los muda al shell, con sus E2E sin editar |
| [F11](../015-f11-acceso-cuenta/spec.md) (F11a) | Las etapas de los tokens y de la sesión, la raíz de la cuenta, «Tu cuenta» y el doble de la API | Conserva las etapas; la raíz de la cuenta, según Q2 |
| [F12](../023-f12-administracion/spec.md) (F12a) | La página de la administración y su Page Object | La monta como ruta (Q4), o nada si F12a no llegó |
| A3 ([spec 016](../016-a3-contenido-api/spec.md)) | La etapa de sesión y la fuente del contenido | No la toca; si A3 entra después, rebasa sobre la raíz |
| A4 ([spec 017](../017-a4-laboratorio-sandbox/spec.md)) | El laboratorio | Nada; se integra de a uno |
| D1 ([spec 007](../007-d1-progreso-sincronizacion/spec.md)) y D1c | Los almacenes y `progress-backup` | No los cambia; D1c los reemplaza después sin tocar el shell |
| [C4](../008-c4-exposicion/spec.md) | Los estilos en línea, la CSP y `vite-plugin-singlefile` | Ningún estilo en línea nuevo; no parte el bundle |
| E1 | Los conteos del menú | Salen del catálogo (FR-032) |
| F13 (propuesta) | `#save-label` y los avisos de sincronización | Deja el pie como está; F13 cuelga del shell portado |

**Hoja de ruta (enmiendas que integra el coordinador):**

- F10 pasa de «Pendiente» a «En especificación», con el enlace a esta spec.
- Su decisión abierta pierde dos preguntas. La de nuqs ya estaba cerrada. La de si un `import()` deja un chunk la cerró A2 (spec 006).
- Suma las cinco preguntas de esta spec.
- Su «Entra» suma la limpieza de `styles.css` en dos pasos: las reglas del shell a su hoja y las huérfanas fuera.
- Su «Borra» suma los checks retirados y sus arneses (FR-052) y, con Q3, los globals de catálogos con su oráculo.
- La fila de F10 en «Acciones del usuario» suma la aprobación del `aria-pressed` de `<body>`.
- El criterio de F2 «`dump-globals` da los mismos bytes» deja de poder correrse después de F10, si Q3 queda en A.

## Assumptions

- Esta spec describe la integración `f2b-acum` (`2b37caf4`: F2a, A2 y F2b). Lo que dejan F3 a F9, F11a y F12a sale de sus specs (012 a 023), con clarify y sin plan, y por eso F10 empieza con un inventario del código real (FR-048).
- Los nombres son provisionales y los confirma el plan:
  - la hoja del shell;
  - los módulos de la raíz y del router en `frontend/src/app/`, la única capa que puede componer páginas;
  - `#administracion`;
  - los Page Objects.
- F11a está entregada al empezar F10, porque F8 la espera. F12a puede no estarlo (FR-044).
- La red de la base de F10 es la de F1 (106), la de A2 (17) y la que suman F3 a F9, F11a y F12a. Con el doble de la API de F11a, todos arrancan con una sesión simulada.
- `withLanguageQuery`, las formas de URL de los filtros y del taller, y el lugar de `enableHistorySync()` son los que dejen F3 y F5. Que `enableHistorySync()` exista en la versión publicada de nuqs lo verifican ellos (V6 de la spec 018). Context7 lo muestra en el código fuente de la rama `next`, y los metadatos del registro no lo dicen ni lo niegan.
- La pila de componentes (jsdom, Testing Library y, si entró, fishery) ya la instaló el primero de F3, F4, F9, F11a o F12a.
- Las versiones de referencia de los routers son las del registro de npm del 2026-10-28, porque ningún router figura en `package-lock.json`. El spike usa las de su día.
- Ninguna medida de esta spec se ejecutó. Las cifras de peso son de bundlephobia (el paquete entero, minificado) y del registro. El margen de 108 663 caracteres sale de la medida del coordinador con F2b (1 141 337). El resto sale de leer el código.
- Los mensajes que lee el alumno van en español rioplatense, como hoy; el código y las pruebas, en inglés.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| El orden del épico | El shell y el router primero; reescribir en paralelo | Descartadas por el usuario el 2026-10-05: F10 va al final |
| Router por path | `createBrowserRouter` con rutas `/campana` | Descartado: Nginx da 404 al recargar, cambian las URL guardadas y las recargas, y los tokens dejarían de tener un lugar propio en el fragmento |
| El router (Q1) | Una librería siempre (B); ninguno sin spike (C) | Borrador A: ninguno por omisión, y una librería sólo si se gana el lugar con la regla. B probablemente no entra bajo el tope y obliga a adaptar el contrato; C decide sin medir |
| El modo de React Router | El de datos (`createHashRouter`), que trae loaders y actions; el declarativo (`HashRouter`) | Se miden los dos sólo si el de datos falla un criterio. F10 no necesita loaders: el contenido llega por la compuerta |
| TanStack Router con una historia propia | Implementar su `RouterHistory` para `?query#vista` | Se mide en el spike. Cumpliría el contrato a costa de mantener la adaptación |
| La raíz (Q2) | Dos raíces (B); hidratar el shell estático (C) | Borrador A: una sola raíz desde el primer cuadro. B no cumple «una sola raíz» y duplica el marcado; C exige un marcado idéntico byte a byte con datos que dependen del contenido |
| Los globals de catálogos (Q3) | Salen del arranque y quedan para `qa/` (B); quedan como hoy (C) | Borrador A: se retiran, y `qa/` lee el módulo de contenido. B y C dejan código o globals sin uso en producción |
| La administración (Q4) | La sección en la query y un aviso para quien no es admin (B); a pantalla entera (C) | Borrador A: `#administracion` en `#main`, sin sección en la URL, y el Recorrido para quien no es admin. B suma una forma con query y un texto; C, un caso especial del layout |
| El shell antes del contenido (Q5) | Los valores fijos de hoy (B); sin shell hasta el contenido (C) | Borrador A: lo que depende del contenido aparece con él. B deja copias fijas que se desactualizan con E1; C cambia más lo visible |
| Los remontajes | Montar la página una vez y dejar que reaccione al idioma | Se conservan los de hoy (FR-030): los E2E de los ports los fijan, y cambiar cuándo se pierde estado no es un port |
| El toast | Una librería de avisos; un store global | Un provider chico o un módulo del shell, que decide el plan. La región es la de hoy |
| `#quiz-feedback` con `display: none` vacía | Ocultarla del todo hasta que haya texto | Descartado: una región oculta con `display: none` no está en el árbol de accesibilidad, y montarla no serviría (FR-045) |
| El defecto del `aria-pressed` | Reproducirlo en React | Sólo si el usuario no aprueba corregirlo (FR-046) |
| Retirar `boot-check` | Adaptarlo a la raíz única sobre el DOM falso | Descartado: el DOM falso existe para correr el legacy sin navegador, y la hoja de ruta pide E2E en su lugar |

## Partición propuesta

**El tamaño:** 60 requisitos, 6 transversales (FR-001 a FR-006) y 54 propios, contra los 52 de C3a, la mayor del épico. Supera el tope, así que se propone un corte, sin aplicarlo.

**Recomendada, en tres partes:**

| Parte | Qué entra | Requisitos | Con los transversales | Espera a |
| --- | --- | --- | --- | --- |
| **F10a · El spike y la red** | El spike con su regla y su informe; los E2E del shell y del arranque escritos contra la base, en verde, y la tabla de correspondencia de los tres checks, todavía sin retirarlos. No cambia código de producción | FR-007 a FR-011, FR-056 y FR-057 (7) | 13 | F3 a F9 y A2 entregados |
| **F10b · La raíz única, el shell y el router** | La raíz, el arranque, el shell, el router, el idioma, los conteos, la administración como ruta, `#quiz-feedback`, el `aria-pressed`, el retiro de `app.js`, de los globals y de los checks, `seams-guard` y la integración | FR-012 a FR-053, FR-058 a FR-060 (45) | 51 | F10a y, para la ruta, F12a |
| **F10c · La limpieza de `styles.css`** | Las reglas del shell a su hoja y las huérfanas fuera | FR-054 y FR-055 (2) | 8 | F10b |

**Por qué así:**

- **F10a** es el candidato natural que señaló el coordinador. Decide el router antes de escribir el shell, y deja la red lista contra el legacy, que es la regla de «E2E primero». Su riesgo es bajo, porque no toca producción. Si el spike elige una librería, el permiso se pide entre F10a y F10b.
- **F10b** es lo que no se puede partir sin un puente temporal. El shell, el router y el retiro de `app.js` comparten `render()`, el idioma y el arranque. Partirlos obligaría a que una raíz de React conviviera con `app.js` por `window`, que es código que se tira.
- **F10c** sólo mueve y borra CSS, con su propia prueba (el barrido y el multiconjunto). Separarla aísla el riesgo de cascada y deja a F10b con una comparación de estilo de 0 diferencias sin reordenar nada.

**Costo:** tres PR en lugar de uno. Entre F10b y F10c, `styles.css` sigue con las reglas del shell, sin efecto visible. Y F10b queda en 51 requisitos, cerca del tope.

**Alternativas:**

- Sacar la administración como ruta (FR-041 a FR-044) a una cuarta parte, que espere a F12a: tiene sentido si F12a llega después que F10b.
- Llevar los globals de catálogos (FR-049) a F10c, con el CSS. F10b bajaría a 50, pero tendría que dejar un cargador temporal para `qa/`.

## Acciones del usuario

Los agentes no las hacen.

| Cuándo | Acción |
| --- | --- |
| Clarify de F10 | Responder Q1 a Q5 y aceptar o cambiar la partición |
| Clarify o PR de F10b | Aprobar que `<body>` deje de llevar `aria-pressed` (FR-046), o pedir que se reproduzca |
| Entre F10a y F10b, sólo si el spike elige una librería | Permiso para instalarla, con su nombre, su versión exacta, su origen (el registro de npm) y su peso medido |
| F10b, antes y después de montar `#quiz-feedback` | La comprobación manual con lector de pantalla, primero sobre la base y después sobre F10 (X2) |

## Descargas previstas

- **Si el spike elige el router propio:** ninguna.
- **Si elige una librería:** esa librería y sus dependencias, con permiso. Las de referencia, del 2026-10-28:
  - `react-router` 8.5.1 (MIT, 2 dependencias, 3 010 360 bytes desempaquetados);
  - `@tanstack/react-router` 1.170.46 (MIT, 4 dependencias, 1 073 323 bytes desempaquetados).
- **Nada más:** nuqs, Zustand y la pila de componentes ya están instalados.

## Fuentes consultadas (2026-10-28)

- **Context7.** El servidor `mcp__context7__*` agotó su cuota mensual, y las consultas se hicieron con la otra instancia de Context7 de la sesión.
  - `/remix-run/react-router`: `createHashRouter(routes, opts)` crea un router de datos que «manages the application path via the URL hash», se crea fuera del árbol y se pasa a `RouterProvider`. La referencia enlazada es la de la v8. `parsePath` y `createPath` separan `pathname`, `search` y `hash`. No devolvió el código de la historia por hash, así que que escriba `#/vista` y lea la query adentro del hash queda para el spike.
  - `/tanstack/router`: `createHashHistory` para servidores sin reescritura a `index.html`. La interfaz `RouterHistory` permite una historia propia. La búsqueda va aparte de `to` (`search`). No documenta el formato exacto del hash.
  - `/47ng/nuqs` y `/websites/nuqs_dev`: `NuqsAdapter` de `nuqs/adapters/react` para una SPA. `enableHistorySync()` (rama `next`) parchea `pushState` y `replaceState` para que las escrituras ajenas lleguen a los hooks y marca las propias. Hay adaptadores para React Router v6, v7 y v8 y para TanStack Router, que leen la ubicación del router, y por eso F10 conserva el de SPA (FR-020).
- **El registro de npm:** `react-router` 8.5.1 (pide `react` y `react-dom` 19.2.7 o más, y el lockfile tiene 19.2.8), `@tanstack/react-router` 1.170.46 y `nuqs` 2.10.2 (MIT, una dependencia; sus metadatos no permiten saber si trae `enableHistorySync()`).
- **bundlephobia**, del paquete entero, minificado y con gzip:
  - `react-router` 8.5.1: 206 775 y 64 607 bytes;
  - `@tanstack/react-router` 1.170.46: 90 893 y 30 979;
  - `nuqs` 2.10.2: 18 209 y 6 500.
