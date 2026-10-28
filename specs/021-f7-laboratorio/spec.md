# Feature Specification: F7 · Port del laboratorio con sus exploradores a React

**Feature Branch**: `021-f7-laboratorio` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Draft: clarify respondido el 2026-10-28 (ver «Clarifications»). Partida en F7a y F7b (P2), cada una con su plan; ninguno escrito todavía.

**Input**: Ítem **F7** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Laboratorio con exploradores»: portar a React el laboratorio, sus exploradores, el editor y la ejecución, con el transporte como interfaz, sin que el alumno note el cambio. Encargo del coordinador del 2026-10-28 (ver «Lo que pidió el usuario»).

- **Depende de** F2b (PR #41 a #44, con las compuertas en verde), F5 (Sistemas) y F6 (Campaña). Lo espera A4 (spec 017, PR #50, rama `spec/a4-laboratorio`, que se cita sin enlace hasta que se integre), y a A4 lo espera D1c.
- **Describe el código de `f2b-acum` (`2b37caf4`: `master` más F2a, A2 y las cuatro unidades de F2b), no el de `master` (`e87772d`), que todavía no los tiene.** Por eso las rutas de F2a y F2b van entre comillas invertidas y sin enlace. Lo que toma de F2b es un hecho, con el archivo citado.
- **F5 y F6 no tienen spec entregada:** son las specs 018 (rama `spec/f5-sistemas`) y 019 (`spec/f6-campana`), con su clarify del 2026-10-28 y sin plan, que se citan sin enlace. Lo que toma de ellas es un supuesto con nombre (F5-S*, F6-S*, en «Assumptions»), contrastado con esos borradores, con sus líneas de la hoja de ruta y con la tabla «Lo que F5 a F8, F10, A2 y D1c toman de F2b» del [plan de F2b](../009-f2-seams/plan-f2b.md).
- **Base:** el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), el [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md), el [mapa del front legacy](../front-react/legacy-map.md), la [spec de F2](../009-f2-seams/spec.md), la [spec de D1](../007-d1-progreso-sincronizacion/spec.md), la [spec de C4](../008-c4-exposicion/spec.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** El laboratorio (`#laboratorio`) es la vista más grande del legacy y la que más depende de las otras. Hoy lo dibuja `frontend/lab.js` con cadenas de HTML:

- el mapa de los 137 desafíos del lenguaje;
- el ejercicio en sus tres fases («Descubrí», «Experimentá» y «Explicá»);
- el bloqueo de campaña, que reemplaza toda la vista.

Lo acompañan dos archivos que dibujan fragmentos dentro de ese HTML: `lab-explorers.js` (los minilabs de canal, genérico y puntero, más las misiones de proyecto) y `quest-explorers.js` (el robot y el paquete de los ejercicios 101 a 106). El laboratorio guarda en `taller-laboratorio-v1` en cada tecla, ejecuta el código del alumno en los Playgrounds públicos y le pide HTML a la campaña y a Sistemas para el contexto de una misión.

F7 lo lleva a una página de React que conserva el aspecto, los textos, el teclado, el foco, las URL y el progreso guardado. Lo hace dejando tres contratos con nombre, para que los ítems que siguen cambien un lado sin tocar el otro:

- **`features/run-exercise`**, con el transporte como un puerto inyectable: A4 cambia el adaptador de los Playgrounds por el de `/api/runs` y no la orquestación.
- **El bloqueo y el contexto como datos** de los puentes de F2b, y no como HTML de los adaptadores de campaña y Sistemas.
- **Un hook del editor** con un callback de cambio.

Es para quien porta vistas, para quien revisa el PR y para A4 y D1c, que esperan a F7. Para el alumno no cambia nada. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. El alumno ve el mismo mapa, las mismas fases, los mismos textos, el mismo revisor y los mismos exploradores, con el mismo teclado, el mismo foco, el mismo aspecto en cada ancho y el movimiento reducido de hoy. La excepción es lo que el clarify decidió cambiar (X1): los paneles y el foco siguen el comportamiento de React.
2. Para la misma secuencia de acciones, lo que se guarda en `taller-laboratorio-v1` es igual byte a byte, y las fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar.
3. `?ejercicio=`, `?paso=`, `?campana=` y `?sistema=` llevan adonde llevaban, con la gramática de F2b.
4. Los 106 E2E de F1 y los 17 de A2 pasan sin editarse, y los E2E nuevos del laboratorio pasan contra el legacy antes de portar y contra la página después, sin editarse. Los que fijan lo que decidió X1 entran en rojo contra el legacy y pasan con la página.
5. A4 puede cambiar el transporte tocando sólo el adaptador, su cableado y lo que su spec dice que arrastra: una spec de la feature lo demuestra con un adaptador doble que no arma programa ni lee marcas.
6. `frontend/` ya no tiene `lab.js`, `lab-explorers.js`, `quest-explorers.js`, `lab.css` ni `quest-explorers.css`. `window` ya no tiene `TallerExplorers`, `TallerQuestExplorers`, `TallerRunner` ni `TallerEditor`, y los adaptadores de campaña y Sistemas ya no devuelven HTML para el laboratorio.
7. Se conserva la distinción entre compilación real, simulación y pasos manuales:
   - sólo el compilador aprueba;
   - los exploradores siguen diciendo que son modelos conceptuales;
   - las misiones de proyecto siguen siendo de evaluación manual.

**Entra:**

- La página del laboratorio en `pages/lab`: el mapa, el ejercicio en sus tres fases y el bloqueo de campaña, montada como el Atlas.
- Los exploradores de `lab-explorers.js` y `quest-explorers.js`, más los tres modelos visuales que dibuja `lab.js` (ownership, slices y recorrido), en React y sobre los modelos puros de F2b.
- Un hook del editor (CodeMirror 6) con un callback de cambio.
- `features/run-exercise`, con el puerto de transporte y el adaptador de los Playgrounds.
- `diagnose` y `liveHint` en `entities/exercise`, y los selectores de resuelto, repaso, puntos y nivel.
- La composición de los puentes (lista navegable, regreso, contexto y bloqueo) en `pages/lab/model`.
- Los E2E del laboratorio y de los exploradores, las specs de Vitest y el ajuste de los checks de `qa/` que cargan lo que se borra.

**Queda fuera:**

- **A4:** el cambio de transporte a `/api/runs`, los estados de la fila, las cuotas, la vista previa con la plantilla del servidor y el `attemptId`.
- **El debounce de la escritura por tecla:** se conserva la escritura en cada tecla; un debounce es otro cambio y se mide antes.
- **La regla de evidencia** (`hasPassingEvidence`, ADR 0003), que no cambia.
- **El router y la raíz única** (F10), Método y «Borrar todo» (F8), y llevar las misiones de proyecto a `content/`.
- **Cualquier cambio de texto, de ID o de URL.**

**Sin hacer a propósito (YAGNI):** un contexto o un provider del progreso; memoización; una librería de animación, de diálogos o de formularios; estados de espera que hoy no existen (F7-Q2); llevar los filtros del mapa a la URL; capturas de pantalla y pruebas con axe; E2E con dos pestañas.

**Actores:**

- quien porta la vista (el usuario y los agentes que implementan);
- quien revisa el PR;
- el agente principal, que integra `main.tsx`, `legacy-views.ts`, `package.json`, las configuraciones y la documentación;
- A4 y D1c, que consumen sus contratos;
- el alumno, que no debe notar nada.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una decisión de esta spec («Decisiones que toma esta spec»).

| Pedido | Fuente |
| --- | --- |
| Port y no rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso guardado, los IDs y las URL | Usuario, 2026-10-05 (supuesto que no corrigió) |
| Las vistas una por una, las hojas primero y cada raíz de React dentro del shell legacy, como el Atlas; el laboratorio después de Sistemas y Campaña | Usuario, 2026-10-05; hoja de ruta, «Orden y paralelismo» |
| Antes de portar, E2E con Playwright y Page Objects contra la versión actual; las piezas nuevas llevan Vitest, Testing Library y, si hay fábricas, fishery | Usuario, 2026-10-05; clarify de F1, Q1; ADR 0008 |
| La suscripción al progreso con Zustand: `useStore` con un selector chico, nunca con el store entero | Usuario, clarify de F2, 2026-10-06 (Q3); `AGENTS.md` |
| F7 entra con el mapa, el ejercicio en sus tres fases, el bloqueo, los exploradores, un hook del editor con un callback de cambio, `features/run-exercise` con el transporte como interfaz, `diagnose` y `liveHint` en `entities/exercise`, los selectores y los E2E; borra los tres JS, las dos hojas, los dos `style=` de la reflexión, sus globals y los métodos de HTML de los adaptadores de F5 y F6; conserva `mount` y `unmount` hasta F10 | Hoja de ruta, F7 en «Alcance por ítem» |
| Los exploradores migran con el laboratorio, porque una raíz anidada en el `innerHTML` del lab se perdería en cada render | Hoja de ruta, F7; mapa, §10 |
| A4 espera a F7 y cambia sólo el adaptador de transporte de `features/run-exercise` | Hoja de ruta (decidido el 2026-10-05); spec de A4 |
| Adoptar cada supuesto F7-S1 a F7-S9 de la spec de A4 o explicar por qué no, en una tabla; hoy el transporte sigue siendo el de los Playgrounds | Coordinador, 2026-10-28 |
| La escritura en cada tecla del editor, de la prueba propia y de la reflexión se conserva; el debounce queda fuera | Hoja de ruta, «Reglas de todo port» y F7 |
| D1 sincroniza campos del laboratorio (borradores, intentos y evidencia): los IDs y las formas no cambian | Coordinador, 2026-10-28; spec de D1 |
| F7 retira `quest-explorers-check` cuando borra `quest-explorers.js`, con la correspondencia de las 47 aserciones | Plan de F2b, «Lo que F5 a F8, F10, A2 y D1c toman de F2b» |
| Decir qué queda en `window.*` y hasta cuándo (F8 y F10) | Coordinador, 2026-10-28 |
| Si F7 pasa los 52 requisitos, proponer F7a y F7b con su costo, sin aplicarlo | Coordinador, 2026-10-28; hoja de ruta, F7 |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify | Coordinador, 2026-10-28 |
| Las respuestas del clarify: F7-Q1, F7-Q2, X1 con el criterio C2, P2, X2 y F9-Q4 | Usuario y coordinador, 2026-10-28 (ver «Clarifications») |
| La documentación va en español; el código y las pruebas, en inglés | `AGENTS.md` |

## Clarifications

### Session 2026-10-28

El usuario respondió las cuatro preguntas de esta spec junto con el clarify de las specs #46 a #55. Dos decisiones transversales también tocan a F7: X2 y la Q4 de F9. Y el criterio C2 del coordinador fija el alcance de X1. Los requisitos, los criterios, los supuestos y la partición ya las aplican.

- Q: **Q1**, ¿qué respalda la etiqueta «Resuelto con pruebas», las métricas y los 20 puntos? → A: Opción A (F7-Q1): se conserva `solvedAt`, porque un resultado que no aprueba no borra un logro (ADR 0003, punto 5). Es el caso de `rust-09` en la fixture congelada `progress-master-2a278ad-storage.json`: se resolvió y después falló con una variante. Descartadas: la evidencia del último resultado (B), que quitaría logros en el uso normal, y cambiar la leyenda a «Resuelto» (C), un cambio de texto que no es de un port. Decidió el usuario. (FR-054)
- Q: **Q2**, ¿qué estados de la espera expone `features/run-exercise` (supuesto F7-S5 de A4)? → A: Opción B (F7-Q2): un canal de progreso y la cancelación, con los estados de hoy (libre y ejecutando) en una unión ampliable. A4 suma los suyos (la fila, la demora y la espera de turno que decidió su Q3) y sus textos sin cambiar la feature. Descartadas: los cinco estados sin productor (A), por el principio V, y un booleano (C), que obligaría a A4 a cambiar la feature. Decidió el usuario. (FR-048)
- Q: **Q3**, ¿se conserva el efecto de los redibujos completos de hoy? → A: Opción C (X1, con el criterio C2 del coordinador): se adopta el comportamiento de React, y los E2E lo fijan sin `KNOWN DEFECT`. Los paneles plegables quedan como los dejó el alumno, «Otra pista» no cierra la solución y el foco no se pierde después de «Repasar pendientes» ni de la autoevaluación: queda en el botón pulsado. Por C2, el criterio vale para todo lo que existe sólo porque `innerHTML` rehace la vista, y las rarezas de lógica (qué guarda una acción o qué se marca) se conservan. Esta spec aplica C2 también al estado del filtro, que pasa a decir «para tu búsqueda» siempre que hay una búsqueda. No era la recomendada (A, conservar los tres efectos). Descartadas: A, y B (los paneles sí, el foco no). Decidió el usuario. (FR-001, FR-023, FR-028, FR-031, FR-033 y FR-036)
- Q: **Q4**, ¿se parte F7 en F7a y F7b? → A: Opción A (P2): F7a, el laboratorio sin vista nueva (`features/run-exercise`, el diagnóstico, los selectores y los E2E contra el legacy), y F7b, la vista. Cada parte tiene su plan, y A4 toma el puerto de F7a. Descartadas: un PR previo sólo con los E2E (B) y no partir (C). Decidió el usuario. («La partición en F7a y F7b»)
- Q: **X2**, ¿qué pasa con las regiones vivas que hoy se recrean? (lo decidía la hoja de ruta; no era una pregunta de esta spec) → A: Quedan montadas, como pide la hoja de ruta para la campaña y el laboratorio, con una comprobación manual con lector de pantalla. Decidió el usuario. (FR-057 y SC-010; riesgo 5)
- Q: **F9-Q4**, ¿dónde vive el diálogo de confirmación? (la decisión D3 de esta spec, ligada a la Q4 de F9) → A: Dentro de la raíz de la página, con un portal a `<body>`, y se cierra al navegar. Confirma D3. Decidió el usuario. (FR-031)

## El laboratorio de hoy, en `f2b-acum@2b37caf4`

Esta sección es la referencia del comportamiento. El contrato fino es el DOM y los textos que hoy producen las funciones de `frontend/lab.js`, `lab-explorers.js` y `quest-explorers.js`, que una comparación única mide (FR-064).

### Lo que dibuja

- **El mapa** (`mapHTML`):
  - la portada «LABORATORIO · RUST» o «GO», con el sello de «N DESAFÍOS EN …»;
  - las métricas: resueltos, temas, puntos de práctica y para repasar;
  - los avisos de guardado no disponible y de carga;
  - «UN DESAFÍO PARA HOY»;
  - el banner de campaña («Jugar la campaña ↗»);
  - los niveles (`levelTabsHTML`);
  - la barra: búsqueda, «Clásicos y sistemas · N», «Sorprendeme ↗» y «Repasar pendientes»;
  - el estado del filtro (`#lab-filter-status`), la grilla de temas (`topicsHTML`) con sus nodos, la leyenda y el ciclo de aprendizaje;
  - la nota de respaldo, los recursos de práctica (`practiceSourcesHTML`) y las misiones de proyecto (`curriculumHTML` de `lab-explorers.js`).
- **El ejercicio** (`exerciseHTML`):
  - el contexto de campaña o de Sistemas, si lo hay;
  - la miga con «← Volver al mapa» o «← Volver al taller», la posición «N / M» y las flechas;
  - el encabezado y las pestañas (`role="tablist"` con tabindex itinerante);
  - el panel de la fase:
    - **«Descubrí»** (`learnHTML`): el concepto, el porqué, las fuentes, el explorador y la predicción;
    - **«Experimentá»** (`codeHTML`): la guía de ejecución, la misión, el editor, «Ejecutar y revisar», el aviso del Playground, la vista previa del programa, el caso propio, las pistas, la solución y el revisor (`reviewHTML`);
    - **«Explicá»** (`reflectHTML`): el estado, la reflexión, el razonamiento del revisor, la variante, la autoevaluación, las fuentes y el pie.
- **El bloqueo:** si `campaignLinkAccess` no permite la misión, la sección `.quest-direct-lock` de campaña reemplaza toda la vista.
- **El diálogo de confirmación** (`#lab-confirm-dialog`): un `<dialog>` modal que `lab.js` crea en `body` la primera vez y nunca quita. Lo usan «Restaurar inicio» y «Cargarla y experimentar».

### Los exploradores

En «Descubrí» se dibuja un solo explorador, por prioridad: el de misión (los 12 ejercicios 101 a 106) va después del concepto y reemplaza al de laboratorio. Si no hay, va el del mapa explícito. Si tampoco, uno de los tres modelos visuales de `lab.js` según el lenguaje y el campo `visual`.

| Explorador | Ejercicios | Modelo hoy | Su estado vive | El foco después de actuar | Región viva |
| --- | --- | --- | --- | --- | --- |
| Robot | 101 a 103 de cada lenguaje (6) | `entities/exercise/model/quest-explorer.ts` (F2b) | Uno por ejercicio; se vacían todos al abrir un ejercicio | El mismo control, o el primero habilitado | `[data-q-status]` (`aria-live="polite"`, atómica): queda montada al actuar |
| Paquete | 104 a 106 de cada lenguaje (6) | Ídem | Ídem | Ídem | Ídem |
| Canal | 21 | `entities/exercise/model/lab-explorer.ts` (F2b) | Uno para todos; se reinicia al abrir un ejercicio | El mismo botón, o el complementario si quedó deshabilitado | `.explorer-explanation` (`role="status"`): se recrea en cada operación |
| Genérico | 20 | Ídem | Ídem | El mismo `select` | Ídem |
| Puntero | 20 | Ídem | Ídem | El mismo botón | Ídem |
| Ownership (Rust, `visual` memory u ownership) | El resto de Rust con ese `visual` | Sin modelo: `simulation` en `lab.js` | En la sesión; se reinicia al abrir un ejercicio | Se queda en el botón | `.explorer-explanation`: se recrea |
| Slices (Go, `visual` memory, collections u ownership) | El resto de Go con ese `visual` | Ídem | Ídem | Ídem | Ídem |
| Recorrido | Los demás | Ídem | Ídem | Ídem | Ninguna |

La clasificación de los 274 ejercicios está congelada en `qa/fixtures/explorer-kinds-a179d03.json`: 21, 20, 20, 6 y 6, más 201 sin explorador del mapa. Ningún E2E de hoy abre un explorador: lo dice el PR de la unidad 7 de F2b.

### La ejecución hoy

`runExercise` hace esto, en orden:

1. **Rechaza sin pedir nada** una ejecución en curso, una misión bloqueada («Completá los requisitos de esta misión en tu campaña.») y un borrador vacío («Escribí una solución o restaurá el inicio.»).
2. **Suma `attempts` y guarda**, antes de ejecutar.
3. **Ejecuta:** arma el programa con `buildProgram`, lo manda por `window.TallerRunner.run` (los Playgrounds: 60 s y 200 KB) e interpreta la salida con `interpretRun`, que lee las marcas `__TALLER_TEST__<id>:PASS` y recorta la salida a 12 000 y 18 000 caracteres.
4. **Guarda el `result`.**
5. **Si aprueba,** marca `solvedAt` la primera vez y `reviewAt` a un día si no había, y avisa: «¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.» o «Estos casos siguen funcionando. Probá una variante.».
6. **Sincroniza campaña y Sistemas** (`syncAfterRun`), con el aviso de XP o el de falla de hoy.

Cancelar, abrir otro ejercicio, volver al mapa, salir del laboratorio y «Borrar todo» abortan el pedido, y el resultado que llega tarde se descarta sin guardar. Cambiar de fase no aborta. Un intento cancelado o fallido ya quedó sumado.

`buildProgram` tiene tres usos: la ejecución, la vista previa (`#lab-program-source`) y «Copiar programa completo».

### Lo que guarda y cuándo

| Acción | Escrituras de `taller-laboratorio-v1` | Qué cambia |
| --- | --- | --- |
| Montar, recorrer el mapa, filtrar, buscar, cambiar de fase, copiar, usar un explorador, volver al mapa | 0 | — |
| Abrir un ejercicio (nodo, «Un desafío para hoy», «Sorprendeme», anterior o siguiente) | 1 | `selected[lenguaje]` |
| Mostrar un ejercicio | 0, pero deja `records[id] = {}` en memoria, que guarda la escritura siguiente | El registro vacío (decisión D1 de esta spec) |
| Elegir una predicción | 1 | `prediction` y, si acierta, `predictionCorrect` |
| Escribir en el editor, en el caso propio o en la reflexión | 1 por tecla | `draft`, `customTest` o `reflection` |
| «Inventar una variante» sin caso propio | 1 | `customTest` |
| «Dame una pista» u «Otra pista» | 1 | `hints` (tope 3) |
| Abrir «Ver una solución razonada» | 1 cada vez que se abre | `solutionSeen` y `assisted` |
| Confirmar «Restaurar inicio» | 1 | `draft` igual al inicial |
| Confirmar «Cargarla y experimentar» | 1 | `draft` igual a la solución y `assisted` |
| Ejecutar | 1 antes y 1 al terminar; sólo la primera si se cancela o se descarta | `attempts`; después `result`, `solvedAt` y `reviewAt` |
| Autoevaluarse | 1 | `confidence`, `reviewedAt` y `reviewAt` (1, 3 o 7 días) |
| «Borrar todo» (`TallerLab.reset`) | El borrado del almacén y 1 | El estado en blanco |

### El foco y las regiones vivas

Adónde va el foco: los 13 movimientos de hoy, más los dos que cambia X1 (marcados):

| Acción | Adónde va el foco |
| --- | --- |
| Abrir un ejercicio | El título del ejercicio, con la vista desplazada al principio |
| Cambiar de fase (pestaña, flechas, Home o End, o un botón del pie) | La pestaña de la fase, sin desplazar |
| Cambiar de nivel | El mismo botón de nivel |
| «Clásicos y sistemas» | El mismo botón |
| «Repasar pendientes» (X1) | El mismo botón; hoy se pierde |
| Autoevaluarse (X1) | El botón elegido; hoy se pierde |
| Pedir una pista | El botón de pista, con las pistas desplazadas a la vista |
| «Inventar una variante» | El caso propio, abierto, seleccionado y centrado |
| Confirmar «Restaurar inicio» | El editor |
| Confirmar «Cargarla y experimentar» | El editor |
| «Conservar mi código» | El elemento que tenía el foco antes del diálogo |
| Esc en el editor | «Ejecutar y revisar» |
| Actuar en un explorador de laboratorio | El mismo botón, o el complementario |
| Cambiar un `select` del explorador genérico | El mismo `select` |
| Actuar en un explorador de misión | El mismo control, o el primero habilitado |

Las regiones vivas son `#lab-review` (`aria-live="polite"`), `#lab-prediction-feedback`, `#lab-filter-status`, `#lab-reflect-status` (hoy se reemplaza con `replaceWith` al terminar una ejecución), `.explorer-explanation` y `[data-q-status]`. Por la regla de la hoja de ruta, que el clarify confirmó (X2), en la página quedan montadas mientras su región exista, con una comprobación manual con lector de pantalla.

### Rarezas que el port conserva

Son rarezas de lógica, y el criterio C2 del clarify las conserva. Cambiarlas es otro commit, con TDD y con aprobación. Cada una lleva `KNOWN DEFECT` en el nombre de su E2E.

1. **Al cambiar de idioma** se reinician la búsqueda y «Repasar pendientes», pero no el nivel ni «Clásicos y sistemas».
2. **Entrar a un ejercicio por URL** no reinicia los exploradores ni los modelos visuales. Abrirlo desde el laboratorio sí los reinicia.
3. **La reflexión tiene tres textos de estado:** uno al dibujarse con 40 caracteres o más, otro con menos, y uno distinto al escribir.
4. **Con `?campana`, el botón dice «← Volver al mapa»** y lleva al mundo de la campaña (F1 lo fija).
5. **El bloqueo de campaña gana** aunque el ejercicio sea de un taller enlazado con `?sistema`. F1 lo fija como `KNOWN DEFECT` en `bridges.spec.ts`.
6. **Abrir la solución escribe cada vez,** aunque las marcas ya estén.
7. **«Sorprendeme» puede elegir el ejercicio actual.**
8. **El número de intentos cuenta** también las ejecuciones canceladas y las fallas de conexión.

### Lo que el port cambia a propósito (X1 y C2)

Lo que hoy existe sólo porque `innerHTML` rehace la vista adopta el comportamiento de React. Los E2E lo fijan sin `KNOWN DEFECT` y entran en F7b, en el commit que cambia el comportamiento: primero en rojo contra el legacy, después en verde con la página (FR-036).

1. **Los paneles plegables quedan como los dejó el alumno** después de una acción dentro de la misma vista. Las acciones son «Repasar pendientes», el nivel, «Clásicos y sistemas», la autoevaluación, una ejecución, y confirmar «Restaurar inicio» o «Cargarla y experimentar».
   - Hoy cierran la solución, la vista previa, la salida, «Contrastar con el razonamiento del revisor» y las notas del mapa, y devuelven el caso propio a su estado inicial.
   - Cada caso de prueba se abre cuando pasa a fallar y se cierra cuando deja de fallar; si no cambia de estado, queda como lo dejó el alumno.
   - Lo que se desmonta (otra fase, otro ejercicio o el mapa) vuelve a su estado inicial al montarse otra vez, como hoy.
2. **«Otra pista» no cierra la solución.**
3. **El foco queda en el botón pulsado** después de «Repasar pendientes» y de la autoevaluación. Hoy se pierde.
4. **El estado del filtro dice «para tu búsqueda»** siempre que hay una búsqueda. Hoy el redibujo del mapa lo omite, y sólo lo dice mientras se escribe.

## El transporte como interfaz: `features/run-exercise`

**Qué hace la feature.** Orquesta una ejecución sin conocer el transporte:

- los rechazos previos;
- la política de intentos;
- la ejecución activa con su cancelación;
- el armado del `result` v1 en un solo lugar;
- el guardado;
- `solvedAt`, `reviewAt` y los avisos;
- la sincronización de campaña y Sistemas.

Recibe el transporte como un puerto. El adaptador de hoy, el de los Playgrounds, arma el programa con `buildProgram`, llama a `runCode` de `shared/api/playground` e interpreta con `interpretRun`. El adaptador lo elige `app` (la raíz de composición) y se lo pasa a la página: la vista no importa ningún adaptador.

**El contrato del puerto** (el plan fija los nombres y los tipos):

- **Entrada:**
  - el ejercicio: id, lenguaje, pruebas (id y expresión) e imports;
  - el borrador tal cual;
  - la prueba propia normalizada (sin espacios en los extremos);
  - una señal de cancelación.

  Nunca el programa armado.
- **Salida, un veredicto:**
  - si se ejecutó, o el mensaje de la falla de transporte;
  - si compiló y terminó bien;
  - la salida estándar y la de error;
  - el veredicto de cada prueba esperada, por id, y el de la prueba propia;
  - un id de intento opcional, que hoy ningún adaptador da.

  No es la salida cruda: la feature no lee marcas.
- **Política de intentos:** el adaptador declara antes de ejecutar si la ejecución suma al contador local `attempts`. El de los Playgrounds suma, y la feature lo hace y guarda antes de llamar al puerto, como hoy.
- **Progreso y cancelación:** un canal por el que el adaptador avisa los cambios de estado, con los estados de hoy en una unión ampliable, y la cancelación con la señal (F7-Q2).

**Los supuestos de A4.** La spec de A4 supone F7-S1 a F7-S9 para cambiar sólo el adaptador. F7 los resuelve así:

| # | Supuesto de A4 | Decisión de F7 | Requisito | Matiz |
| --- | --- | --- | --- | --- |
| F7-S1 | El transporte es un puerto inyectable y ninguna vista legacy lee `window.TallerRunner` | Se adopta | FR-044 y FR-012 | El puerto llega desde `app`. En F7a lo elige `lab.js`, que hace de raíz de composición del laboratorio legacy |
| F7-S2 | La entrada es el ejercicio, el borrador, la prueba propia y la señal, nunca el programa | Se adopta | FR-045 | El adaptador de los Playgrounds arma el programa adentro |
| F7-S3 | La salida es un veredicto y no la salida cruda; el adaptador llama a `interpretRun` | Se adopta | FR-046 y FR-052 | La feature agrega `code`, `customTest` y `time`, y arma el `result` en un solo lugar, también el de una falla de transporte. Los recortes se aplican una vez |
| F7-S4 | Contar o no `attempts` lo decide el adaptador (o viene en su resultado) | Se adopta con un matiz: el adaptador lo **declara antes de ejecutar**; «viene en su resultado», no | FR-047 | Hoy el intento se suma y se guarda antes de ejecutar, y una ejecución cancelada no trae resultado: si el conteo viniera en el resultado, la cancelación dejaría de contar. Para A4 da lo mismo, porque su adaptador declara que no suma |
| F7-S5 | La feature expone cinco estados de la espera y la cancelación | Se adopta en parte (F7-Q2): un canal y la cancelación, con los estados de hoy en una unión ampliable | FR-048 | A4 suma sus estados y sus textos sin cambiar la feature (constitución, principio V) |
| F7-S6 | La vista previa recibe el arnés por parámetro | Se adopta y **se extiende a «Copiar programa completo»** | FR-051 | `buildProgram` tiene tres usos; la spec de A4 (FR-030) copia el programa de la vista previa |
| F7-S7 | `sanitizeResult` sigue en `entities/exercise` y es el único normalizador del `result` v1 | Se adopta: ya es un hecho (`entities/exercise/model/lab-state.ts`) | FR-052 | F7 no escribe otro normalizador. A4 le suma `attemptId` en ese lugar |
| F7-S8 | E2E con un doble de red del compilador y un Page Object para la revisión | Se adopta: ya existen `qa/e2e/fixtures/compiler-double.ts` (con `hold`) y `qa/e2e/pages/lab.ts` | FR-060 | F7 los amplía con métodos nuevos, sin cambiar los que hay |
| F7-S9 | Si ninguna vista legacy lee `window.TallerRunner`, F7 retira `register-runner.ts` | Se adopta, **y también `register-editor.ts`**, que sólo lee `lab.js` | FR-012 | `runner-check` carga `register-runner.ts`: F7 lo re-apunta a `shared/api/playground` y no lo retira (lo retira A4) |

**Qué le queda a A4 después de F7.** El adaptador de `/api/runs` y su cableado en `app`, `attemptId` en `sanitizeResult`, sus estados y sus textos en la revisión de la vista vigente cuando entra (F7-Q2 y el criterio C4 del coordinador: la revisión de `lab.js` si F7b todavía no entró, o la página React si ya entró), el constructor de la vista previa con la plantilla del servidor (FR-051) y el doble de red de `/api/runs`, que reutiliza el Page Object. La orquestación no cambia.

## Los puentes como datos: el bloqueo y el contexto

Hoy el laboratorio le pide HTML a `window.TallerCampaign.exerciseContextHTML` y `lockedExerciseHTML`, y a `window.TallerSystems.exerciseContextHTML`, y navega con `missionIDs`, `returnURL` y `TallerCampaignEngine.getWorlds`. Desde F2b, esos adaptadores arman su HTML a partir de datos puros:

- **Campaña:** `campaignMissionContext` y `campaignLinkAccess`, en `entities/campaign/bridge.ts`.
- **Sistemas:** `workshopMissionIds`, `workshopExerciseRole` y `workshopReturnTarget`, en `entities/systems-workshop/bridge.ts`.
- **La gramática de URL:** `readLinkQuery`, `exercisePhaseOr`, `withLabQuery`, `worldHref` y `workshopReturnHref`, en `shared/config/url-grammar.ts`.

F7 compone esos datos en `pages/lab/model`, sin HTML de los adaptadores:

| Qué | Regla de hoy, que se conserva | Datos |
| --- | --- | --- |
| Bloqueo | Sólo con `?campana`. Se calcula antes que el contexto, y por eso gana aunque haya `?sistema` (rareza 5) | `campaignLinkAccess(mundos, mundo enlazado, id, permiso)`, con los mundos y el permiso del motor de campaña |
| Contexto | Sistemas primero (`?sistema` y un rol) y, si no, campaña (`?campana` y una misión del mundo) | Sistemas: el título del taller y su núcleo verificado, del motor de Sistemas, más el rol del puente («Núcleo del taller» o «Herramienta previa»). Campaña: el título del mundo, los puntos, los dos sellos y el tipo de misión (supuesto F6-S2) |
| Lista navegable | Las misiones del taller si el ejercicio está entre ellas; si no, las del mundo enlazado; si no, los 137 del lenguaje | `workshopMissionIds` y los mundos del motor de campaña |
| Regreso al terminar | Con `?sistema`, la vuelta al taller (parte `build`); con `?campana`, el mundo; si no, el mapa. Los dos primeros navegan con `location.href` | `workshopReturnHref(workshopReturnTarget(…))` y `worldHref` |
| Rótulo del botón de volver | «Volver al taller» si hay `?sistema` y, si no, «Volver al mapa» | `readLinkQuery` |

Los motores se refrescan en memoria con la evidencia del laboratorio (`refreshFromLab`, que nunca escribe ni sube la revisión) al montar y después de cada cambio del laboratorio, no como efecto del dibujado: la misma regla que la spec de F6 fija para su página (su FR-023). Se sincronizan después de una ejecución o de una predicción (`syncLab`), como hoy. La página los importa de los índices de sus slices. Ninguna entidad importa a otra.

## El editor

**Hoy.** `window.TallerEditor.mount(textarea, {language, onRun, onEscape})` (`shared/ui/code-editor/mount-code-editor.ts`) inserta CodeMirror antes del `textarea`, le agrega `cm-enhanced` al contenedor y oculta el `textarea`. En cada cambio copia el texto al `textarea` y despacha un evento `input` que burbujea, y el manejador de `lab.js` guarda, actualiza la numeración, el estado, la vista previa, la vigencia del revisor y la pista en vivo. `lab.js` destruye y recrea el editor en cada redibujo.

**Por qué un callback.** La hoja de ruta preguntaba si el `onChange` de React recibe ese `input` despachado por código. Lo más probable es que no: React registra el valor que se asigna por la propiedad `value` y, si el evento llega con el valor ya asignado, no lo ve como un cambio. Es una inferencia del funcionamiento de React, sin verificar en un navegador, y la decisión no depende de ella: la hoja de ruta ya pide un callback explícito.

**El hook.** Monta el editor sobre un elemento que React no reconcilia y recibe:

- el lenguaje, el texto inicial, el tope de 30 000 caracteres y el nombre accesible;
- `onChange` con el texto, `onRun` (Ctrl o ⌘ + Enter) y `onEscape` (el foco a «Ejecutar y revisar»).

Expone cómo enfocarlo y cómo reemplazar su texto (para «Restaurar inicio» y «Cargarla y experimentar»), y se destruye al desmontar, al cambiar de fase y al cambiar de ejercicio. Conserva el autocompletado, los snippets, Tab y Mayús+Tab y el tema. No agrega debounce.

**El editor de respaldo.** Hoy, si `window.TallerEditor` falta, queda el `textarea` con su numeración (`#lab-line-numbers`), Tab y Mayús+Tab de cuatro espacios, y la sincronización del desplazamiento. Con el editor importado, ese camino no se alcanza. Esta spec lo retira (decisión D2).

## Qué queda en `window.*` y hasta cuándo

| Global y métodos | Quién los lee después de F7 | Se retiran con |
| --- | --- | --- |
| `TallerLab.mount` y `unmount` | `app.js:render` | F10 |
| `TallerLab.init`, `loadWarning` y `getExercises` | `app.js`: `startApp`, los avisos de carga y `syncLinkedLanguage` | F10 (el arranque y el router) |
| `TallerLab.exportState`, `planImport`, `applyImport`, `backups` y `reset` | El área `lab` de `features/progress-backup`, que arma `app.js`. `reset` también reinicia la sesión del laboratorio y aborta la ejecución | F10. F8 sólo si saca de `app.js` el armado de `progress-backup`, cosa que F2b no prevé |
| `TallerLab.getExercises` y `exportState` | Los adaptadores de Sistemas (F5) y de campaña (F6), que por R4 no importan el índice del laboratorio, y `register-project-kit.ts` (supuesto F5-S3) | F10 |
| `TallerCampaign.mount`, `unmount` y `refresh` | `app.js:render` | F10 |
| `TallerCampaign.sync` y `TallerSystems.sync` | `syncDerivedSeals` de `progress-backup`, en `app.js` | F10 (o F8, como en la fila de `reset`) |
| `TallerSystems.mount`, `unmount` e `init` | `app.js` (`render` y `startApp`) | F10 (supuesto F5-S1) |
| `TallerSystems.resetSimulations` | `sessionResets` de `progress-backup` | El último de F5 y F8 que entre (F8-Q2, spec 022) |
| `TallerCampaignEngine` y `TallerSystemsEngine` | `progress-backup`, en `app.js` (los cinco métodos del respaldo) | F10 |
| `TallerCampaign.exerciseContextHTML`, `lockedExerciseHTML` y `returnURL`; `TallerSystems.exerciseContextHTML`, `missionIDs`, `returnURL` y `refresh` | Nadie | **F7b** |
| `TallerExplorers`, `TallerQuestExplorers`, `TallerRunner` y `TallerEditor` | Nadie | **F7b** (`TallerRunner`, en F7a) |

La hoja de ruta dice que F6 conserva `refresh` y `sync` de `TallerCampaign` «hasta F7», y F5 los de `TallerSystems`. Pero `app.js` también los lee: `render()` llama a `TallerCampaign.refresh()`, y `syncDerivedSeals` llama a los dos `sync`. F7 retira sólo lo que leía el laboratorio. Es un hallazgo para la hoja de ruta, y los borradores de F5 y F6 llegan a lo mismo por su cuenta. Con eso, después de F7 `window.TallerCampaign` queda con `mount`, `unmount`, `refresh` y `sync`.

## El progreso que D1 sincroniza

Ningún campo cambia de nombre, de forma ni de tope (30 000, 10 000 y 3 000 caracteres para el borrador, la reflexión y la prueba propia; 12 000 y 18 000 para las salidas). La tabla dice qué hace D1 con cada campo (`features/progress-sync/model/field-kinds.ts` y la tabla de B2 en la spec de D1) y cuándo lo escribe el laboratorio.

| Campo v1 | D1 | Cuándo lo escribe el laboratorio |
| --- | --- | --- |
| `draft` | `exercise.draft`: gana la última escritura, con su grupo | En cada tecla, y al confirmar «Restaurar inicio» o «Cargarla y experimentar» |
| `customTest` | `exercise.customTest`: gana la última escritura | En cada tecla, y con «Inventar una variante» si no había |
| `reflection` | Gana la última escritura; `''` es un valor | En cada tecla |
| `prediction` y `predictionCorrect` | Gana la última escritura; sólo crece, con fecha | Al elegir una opción |
| `hints` | Máximo, con tope en las pistas del ejercicio | Al pedir una pista |
| `assisted` y `solutionSeen` | OR | Al abrir la solución; `assisted` también al cargarla |
| `confidence`, `reviewedAt` y `reviewAt` | Un solo reloj para el grupo | Al autoevaluarse; `reviewAt` también al resolver por primera vez |
| `selected.rust` y `selected.go` | `preference.labSelected*`: gana la última escritura | Al abrir un ejercicio |
| `attempts` | Sólo la importación (`legacy_attempts`) | Antes de cada ejecución, según la política del adaptador |
| `result` y `solvedAt` | Los escribe el cierre de una ejecución de B2 (desde A4) y la importación; antes de A4 no viajan (Q4 de D1) | Al terminar una ejecución |

## Qué cambia en `dist/index.html`

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `dist/content/curriculum.<versión>.json` | No | `content/` y el generador no cambian |
| El marcado de `frontend/src/index.html` | No | El diálogo de confirmación se crea al usarse, hoy y en la página (D3, confirmada por F9-Q4) |
| `<style>` | Casi nada | Las dos hojas se mueven sin editarse y se importan en el mismo lugar de la cascada (D4). Se suman sólo las reglas que reemplazan los dos `style=` de la reflexión y el `cssText` de la copia |
| `<script type="module">` | Sí | Sale el código de los tres archivos legacy, `register-runner.ts` y `register-editor.ts`; entran la página, sus modelos, la feature y el adaptador |
| El tamaño | Se informa | Mide 1 141 337 caracteres al cerrar F2b (borrador de T038), y el tope de `qa/build-check` (`BOOT_SIZE_LIMIT`) es de 1 250 000 |
| Los avisos de licencia | No | Ninguna dependencia de ejecución nueva |

## Cómo se demuestra que nada cambió

| Qué se afirma | Cómo se demuestra | Requisitos |
| --- | --- | --- |
| Los enlaces, las recargas, el arranque, el contexto y el bloqueo, el ciclo con el compilador simulado y el aspecto del shell siguen igual | Los 106 E2E de F1 (`bridges`, `cycle`, `url-contract`, `reload`, `startup-storage`, `guards`, `views` y `css-contract`) y los 17 de A2, sin editar | FR-002 |
| El mapa, las fases, el revisor, el editor, la ejecución con el doble de red y los exploradores se comportan como hoy | E2E nuevos con Page Objects, en verde contra el legacy antes de portar (F7a) y sin editar después (F7b) | FR-001, FR-060 y FR-061 |
| Lo que cambia X1 sigue el comportamiento de React | E2E de F7b, en rojo contra el legacy y en verde con la página, sin `KNOWN DEFECT` | FR-036 |
| La lógica y los componentes | Specs de Vitest: de modelo en `node` y de componente en `jsdom` con Testing Library; fishery si hay fábricas | FR-062 |
| El DOM y los textos | Una comparación única del legacy contra la página sobre una grilla de estados, y las trazas de operaciones de los exploradores sobre los 274 ejercicios (el oráculo de la unidad 7 de F2b) | FR-064 |
| El aspecto | El barrido de estilo computado, antes y después de mover las hojas, y `css-contract` (R1 a R10) | FR-011 y FR-065 |
| Lo guardado | `storage.watchWrites()` y la comparación de lo escrito para secuencias de acciones; las fixtures arrancan sin escribir; `lab-state-check`, `versioned-storage-check` y `curriculum-ids-check` en verde | FR-016 a FR-019 |
| La evidencia | `exercise-evidence-check` y `runtime-check`, sin cambios | FR-052 y FR-063 |
| El contrato para A4 | Una spec de la feature con un adaptador doble que no arma programa ni lee marcas | FR-043 a FR-052 |
| El retiro del legacy | `grep` en 0, los checks ajustados con la correspondencia de cada escenario y `seams-guard-check` en 0 violaciones | FR-010 a FR-015 y FR-063 |

## La partición en F7a y F7b

Decidida en el clarify (P2, la opción A de la Q4). Cada parte tiene su plan, sus tareas y su PR, como F2 con F2a y F2b. Siguiendo ese precedente, el plan de F7a iría en `plan.md` y el de F7b en `plan-f7b.md`, porque los scripts de Spec Kit buscan `plan.md` por nombre; lo confirma el coordinador. A4 toma el puerto de F7a.

| Parte | Qué entrega | Visible para el alumno | Depende de | La esperan |
| --- | --- | --- | --- | --- |
| **F7a · El laboratorio sin vista nueva** | `features/run-exercise` con su puerto y el adaptador de los Playgrounds; `diagnose`, `liveHint`, los selectores y las reglas del registro; los E2E del laboratorio y de los exploradores, contra el legacy. `lab.js` usa todo eso, hace de raíz de composición y deja de leer `window.TallerRunner`, que se retira con `register-runner.ts` | No | F2b. No toca la vista, los puentes ni los adaptadores de campaña y Sistemas (ver «Hoja de ruta») | F7b, y A4 entero, que espera a F7a y a B3 (criterio C4) |
| **F7b · La vista** | La página React, los exploradores, el hook del editor, la composición de los puentes, la sesión, las hojas movidas, los borrados, el retiro de los métodos de los adaptadores, los checks restantes, los E2E de X1, la comparación del DOM y el barrido. Si A4 entró antes, porta también sus estados y sus textos de la revisión como comportamiento vigente, con sus E2E (criterio C4) | Sólo lo que decidió X1 | F7a, F5 y F6 | F8 y F10 |

**Los requisitos de cada parte** (cada uno lleva su marca en «Functional Requirements»):

| Grupo | Requisitos | Cuántos |
| --- | --- | --- |
| Sólo F7a | FR-043 a FR-050, FR-052 a FR-055, FR-060 y FR-061 | 14 |
| Sólo F7b | FR-007 a FR-011, FR-013, FR-014, FR-017, FR-020 a FR-028, FR-030 a FR-042, FR-056 a FR-059, FR-064 y FR-065 | 36 |
| Las dos, cada una sobre lo suyo | FR-001 a FR-006, FR-015, FR-016, FR-018, FR-019, FR-062, FR-063 y FR-066 | 13 |
| Partidos | FR-012 (F7a retira `TallerRunner` y `register-runner.ts`; F7b, el resto), FR-029 (F7a, la lógica del revisor; F7b, su vista) y FR-051 (F7a, el parámetro; F7b, la vista que lo usa) | 3 |

F7a suma 30 requisitos y F7b 52, justo el tope de C3a.

**Lo compartido, por parte:**

| Requisito | F7a | F7b |
| --- | --- | --- |
| FR-001 | Escribe los E2E del laboratorio y de los exploradores contra el legacy, sin fijar lo que cambia X1 | Los pasa sin editar y suma los de X1 |
| FR-002 a FR-006 | Sobre `lab.js`, la feature y las reglas | Sobre la página y los borrados |
| FR-015 | La cadena sin `register-runner.ts` y la comprobación de aislamiento de `lab.js` con la feature | El adaptador nuevo, `boot-check`, `seams-guard` y el resto |
| FR-016, FR-018 y FR-019 | Las escrituras de la ejecución (`attempts`, `result`, `solvedAt` y `reviewAt`) y de las reglas del registro | Las de la página |
| FR-062 | Las specs de modelo | Las de componente |
| FR-063 | `runner-check` y los escenarios de `lab-state-check` que toca la feature | El resto de `lab-state-check`, `quest-explorers-check` y `lab-bridge-check` |
| FR-066 | La documentación de la feature y de las reglas | La de la página y los borrados |

- **Qué gana:** dos PR revisables en lugar del mayor del épico. F7b queda como un port puro, salvo lo que decidió X1: si A4 entró antes, porta como comportamiento vigente lo que A4 haya dibujado en la revisión de `lab.js`. A4 espera a F7a y a B3, no a F7b (criterio C4): sus estados y sus textos (la fila, el aviso de demora, la espera de turno, el 401 y el sandbox caído) los dibuja la vista vigente cuando entra, la revisión de `lab.js`, que desde F7a se suscribe al estado de la feature, o la página React si F7b ya entró.
- **Qué cuesta:**
  - `lab.js` se edita en F7a (`runExercise` delega en la feature, `updateRunUI` se suscribe a su estado e importa las reglas) y se borra en F7b;
  - el estado de la ejecución tiene que poder leerse sin React (un store de `zustand/vanilla`, como `changes`);
  - hay dos compuertas completas.
- **Descartados:** un corte por regiones de la vista (el mapa contra el ejercicio), porque comparten sesión, montaje y URL; y adelantar los exploradores en React dentro del `innerHTML` legacy, que la hoja de ruta ya descartó.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno recorre el mapa y elige un desafío como hoy (Priority: P1)

El alumno abre `#laboratorio`, ve sus métricas, filtra por nivel, busca un tema, pide un desafío al azar o sus repasos pendientes, y abre un ejercicio.

**Why this priority**: es la entrada del laboratorio y lo primero que se ve; cualquier diferencia en un conteo o un texto se nota de inmediato.

**Independent Test**: con el build servido, abrir el mapa desde un navegador vacío y desde el progreso congelado de master, recorrer los filtros con teclado y abrir un ejercicio.

**Acceptance Scenarios**:

1. **Given** el progreso congelado de master, **When** el alumno abre `#laboratorio` en Rust, **Then** ve «LABORATORIO · RUST», «137» desafíos, las métricas de resueltos, temas, puntos y repasos que salen de la fixture, y los nodos resueltos con «✓».
2. **Given** el mapa, **When** elige un nivel o «Clásicos y sistemas», **Then** la grilla y el estado del filtro cambian como hoy y el foco queda en el botón pulsado.
3. **Given** una búsqueda sin resultados, **When** pulsa «Ver todos los desafíos», **Then** se limpian la búsqueda, el nivel y los dos filtros, y vuelve la grilla completa.
4. **Given** el reloj de la prueba en una fecha posterior a un `reviewAt`, **When** pulsa «Repasar pendientes», **Then** ve sólo los vencidos, el botón dice «Ver todos» y el foco queda en el botón (X1).
5. **Given** el mapa, **When** abre un ejercicio desde un nodo, **Then** se guarda una vez el ejercicio elegido, la URL pasa a `?ejercicio=<id>&paso=learn#laboratorio` y el foco va al título del ejercicio.

---

### User Story 2 - El alumno resuelve un ejercicio en sus tres fases, con el editor y el revisor, como hoy (Priority: P1)

El alumno predice, escribe código, pide pistas, mira o carga la solución, inventa un caso, ejecuta con el compilador, lee el revisor, explica y se autoevalúa.

**Why this priority**: es el ciclo de aprendizaje del taller y lo que A4 y D1c van a tocar después.

**Independent Test**: con el doble de red del compilador (`page.route`), recorrer las tres fases de `rust-02` y `go-113` con teclado: los cuatro resultados de F1, la cancelación con el pedido retenido y la vigencia del resultado.

**Acceptance Scenarios**:

1. **Given** «Descubrí», **When** elige la opción correcta, **Then** se marca con `aria-pressed`, aparece «Esa es la idea.» con la explicación y se guarda una vez.
2. **Given** «Experimentá», **When** escribe en el editor, **Then** cada tecla guarda, el estado dice «Borrador guardado», la vista previa se actualiza y la pista en vivo cambia según sus reglas.
3. **Given** un resultado vigente, **When** el alumno cambia el código, **Then** el revisor dice «El código cambió. Revisémoslo.».
4. **Given** el doble que aprueba, **When** pulsa «Ejecutar y revisar» o Ctrl/⌘ + Enter, **Then** el botón muestra «Revisando…» y se deshabilita, el revisor dice «La idea funciona en estos casos.», aparece el aviso de la primera resolución y el contador dice «1 intento».
5. **Given** un pedido retenido, **When** pulsa «Cancelar ejecución», **Then** avisa «Ejecución cancelada. Tu código sigue guardado.», no se guarda resultado y el intento quedó sumado.
6. **Given** «Experimentá», **When** pide «Cargarla y experimentar» y confirma, **Then** el borrador es la solución, se marca la ayuda y el foco va al editor; si elige «Conservar mi código», el foco vuelve al botón que lo abrió.
7. **Given** «Explicá», **When** elige «Lo entiendo, quiero otra vuelta», **Then** se guarda el repaso a 3 días, aparece «Próximo repaso: …» con la fecha en español de Argentina, avisa «Repaso agendado en tu mapa de aprendizaje.» y el foco queda en el botón elegido (X1).
8. **Given** la solución abierta, **When** pide otra pista o confirma «Restaurar inicio», **Then** la solución sigue abierta, como la dejó el alumno (X1).

---

### User Story 3 - Dentro de una misión o de un taller, el laboratorio muestra el contexto, el bloqueo y la vuelta como hoy (Priority: P1)

El alumno entra desde la campaña o desde Sistemas, ve de dónde viene, recorre sólo las misiones de ese mundo o de ese taller, y vuelve.

**Why this priority**: es el puente entre vistas que más se rompe al portar, y F1 lo protege con E2E que no pueden editarse.

**Independent Test**: los nueve E2E de `bridges.spec.ts` y los ocho de `cycle.spec.ts` (F1), sin editar, más los nuevos del pie de «Explicá» y de la vuelta.

**Acceptance Scenarios**:

1. **Given** `?campana=rust-world-1&ejercicio=rust-02`, **When** se dibuja, **Then** el bloque de contexto dice «0/30 XP · Entrenamiento» y «○ Pruebas ○ Predicción», y su enlace es «← Estación del robot».
2. **Given** una misión que todavía no está disponible, **When** se dibuja, **Then** la sección del bloqueo reemplaza toda la vista y «Ejecutar y revisar» no existe.
3. **Given** un núcleo de Sistemas, **When** el alumno aprueba, **Then** el contexto pasa a «✓ Núcleo verificado» sin redibujar el ejercicio.
4. **Given** la última misión de la lista, **When** pulsa el botón del pie de «Explicá» o la flecha siguiente, **Then** navega al taller o al mundo con una navegación completa.
5. **Given** `?campana` y `?sistema` a la vez, **When** el ejercicio es de los dos, **Then** gana el contexto de Sistemas; y **When** no es misión del mundo, **Then** gana el bloqueo (rareza 5).

---

### User Story 4 - Lo guardado no cambia, y D1 puede sincronizarlo (Priority: P1)

Nada de lo que el alumno guardó se pierde ni cambia de forma, y cada acción escribe lo mismo que hoy.

**Why this priority**: es el contrato del ADR 0003 y lo que D1c va a sincronizar campo por campo; una escritura de más o de menos rompe la fusión.

**Independent Test**: con `storage.watchWrites()`, una instantánea de `localStorage`, el mismo reloj fijo y la misma fuente de azar, repetir en el legacy y en la página cada fila de «Lo que guarda y cuándo» y una secuencia combinada, y comparar.

**Acceptance Scenarios**:

1. **Given** cada fixture congelada, **When** se abre el laboratorio en el mapa, en cada fase y en el bloqueo, **Then** no hay ninguna escritura, ningún respaldo y ningún aviso.
2. **Given** la misma secuencia de acciones, **When** se corre en el legacy y en la página, **Then** la secuencia de `set taller-laboratorio-v1` y el texto final son iguales byte a byte.
3. **Given** dos pestañas, **When** una importa una copia mientras la otra ejecuta, **Then** al terminar quedan el progreso importado y el resultado de la ejecución.
4. **Given** el almacenamiento bloqueado, **When** el alumno escribe la reflexión, **Then** el estado dice «El guardado no está disponible: exportá tu avance.» y el mapa muestra el aviso de hoy.
5. **Given** el alumno en un ejercicio, con una ejecución en curso, **When** va a Método y pulsa «Borrar todo», **Then** la ejecución se abortó al salir sin guardar nada, el almacén queda en blanco y, al volver, el laboratorio abre el mapa sin ejercicio elegido.

---

### User Story 5 - Los exploradores responden como hoy (Priority: P2)

El alumno mueve el robot, altera un paquete, coordina un canal, prueba un contrato genérico, compara una copia con un puntero o juega con los modelos de ownership, slices y recorrido.

**Why this priority**: son simulaciones sin progreso, pero hoy ningún E2E los cubre, y un port los puede romper sin que falle nada.

**Independent Test**: un E2E por tipo de explorador con su operación, su región viva y su foco, y la comparación de las trazas de operaciones sobre los 274 ejercicios.

**Acceptance Scenarios**:

1. **Given** `rust-103`, **When** el alumno mueve el robot contra la pared, **Then** la posición y la batería no cambian, la región dice por qué, el foco queda en el mismo botón y la traza conserva su `<details>` cerrado si el alumno lo cerró.
2. **Given** `go-106`, **When** altera un byte, **Then** el CRC calculado cambia, el veredicto dice «Rechazado: la comprobación recibida no coincide con la calculada.» y el foco queda en el mismo control.
3. **Given** un ejercicio de canal, sin buffer, **When** pulsa «Paso del productor →», **Then** la región dice «El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.», el botón se deshabilita y el foco pasa a «Paso del consumidor →».
4. **Given** un explorador con estado, **When** el alumno abre otro ejercicio y vuelve, **Then** el explorador arrancó de nuevo; y **When** sólo cambia de fase, **Then** conserva el estado.
5. **Given** cualquier explorador, **When** se dibuja, **Then** dice que es un modelo conceptual que no ejecuta el código ni acredita la misión, como hoy.

---

### User Story 6 - A4 cambia sólo el adaptador de transporte (Priority: P2)

Quien implementa A4 reemplaza el adaptador de los Playgrounds por el de `/api/runs` sin tocar la orquestación ni la vista, salvo lo que su spec dice que arrastra.

**Why this priority**: A4 está en el camino crítico y espera a F7; un puerto mal cortado lo obliga a reescribir la feature.

**Independent Test**: una spec de Vitest de la feature con un adaptador doble que no arma programa, no lee marcas, declara que no suma intentos y devuelve un id de intento.

**Acceptance Scenarios**:

1. **Given** el adaptador doble, **When** se ejecuta un ejercicio, **Then** el puerto recibe el ejercicio, el borrador, la prueba propia y la señal, y ningún programa.
2. **Given** un veredicto aprobado del doble, **When** termina, **Then** el `result` v1 aprueba según `hasPassingEvidence`, se marcan `solvedAt` y `reviewAt` y `attempts` no cambia.
3. **Given** el adaptador de los Playgrounds, **When** se ejecutan los cuatro resultados de F1, **Then** los textos y lo guardado son los de hoy.
4. **Given** cualquier adaptador, **When** el alumno cancela, **Then** la señal se dispara y no se guarda resultado.

---

### User Story 7 - El legacy del laboratorio se retira y los checks lo acompañan (Priority: P3)

Quien mantiene el taller encuentra el laboratorio en `pages/lab` y `features/run-exercise`, sin los tres archivos legacy, sin sus hojas y sin sus globals, y con los checks apuntando a lo nuevo.

**Why this priority**: deja el camino libre a F8 y a F10, pero no cambia nada para el alumno.

**Independent Test**: `grep` sobre `frontend/`, `qa/` y `frontend/src/app/`, y la tabla de correspondencia de `lab-state-check`, `quest-explorers-check` y `lab-bridge-check`.

**Acceptance Scenarios**:

1. **Given** el árbol de F7, **When** se busca `lab.js`, `lab-explorers.js`, `quest-explorers.js`, `lab.css` o `quest-explorers.css` en `frontend/` y en los imports, **Then** no aparecen.
2. **Given** el build, **When** se listan los `window.Taller*`, **Then** faltan los cuatro retirados y `TallerLab` tiene exactamente los métodos de la tabla.
3. **Given** `npm test`, **When** corre, **Then** pasa, y cada escenario de los tres checks tiene su lugar nuevo o su motivo.

---

### Edge Cases

- **Un ejercicio de otro lenguaje en `?ejercicio=`:** `app.js` cambia el idioma antes de montar, como hoy. Si no existe, el mapa se abre y la query se borra (F1 lo fija).
- **`?paso=` desconocido:** se abre en «Descubrí» y la URL se corrige.
- **El historial no disponible** (una vista previa de archivo): escribir la URL falla en silencio, como hoy.
- **Doble clic o Ctrl/⌘ + Enter dos veces:** una sola ejecución.
- **Cambiar de fase con una ejecución en curso:** no se cancela; al terminar, el estado de «Explicá» se actualiza si está a la vista, y volver a «Experimentá» muestra el resultado.
- **Salir del laboratorio con una ejecución en curso** (otra vista, otro idioma, otro ejercicio o el mapa): se aborta y no se guarda nada.
- **La sincronización de campaña o Sistemas falla después de aprobar o de predecir:** «No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.», una sola vez, y el resultado no se reinterpreta (ADR 0003, punto 8).
- **Una misión que se desbloquea mientras el alumno está en el laboratorio:** el bloqueo se recalcula sólo al redibujar, como hoy.
- **El portapapeles no disponible:** la copia usa la selección como respaldo y avisa «Código copiado.» o «No se pudo copiar automáticamente. Probá seleccionar el texto.».
- **Un borrador de sólo espacios:** «Escribí una solución o restaurá el inicio.», sin pedir nada ni sumar intento.
- **La pista número cuatro:** el botón está deshabilitado con tres pistas.
- **Una prueba propia en blanco:** no existe; la vista previa y la ejecución no la incluyen.
- **«Borrar todo» sin haber montado el laboratorio:** el reinicio de la sesión no lanza.
- **El modelo de un explorador al entrar por URL desde otro ejercicio:** conserva el estado anterior (rareza 2).
- **«Otra pista» con la solución abierta:** la solución sigue abierta (X1).
- **Una fixture con `solvedAt` y un último resultado que no aprueba (`rust-09`):** se muestra resuelta (F7-Q1).
- **CodeMirror lanza al montarse** (no se observó nunca): hoy el error sale de `render` y queda el `textarea` de respaldo, que sigue funcionando. En la página, con D2, el adaptador registra el error con un mensaje en español, como el del Atlas, y la fase queda sin editor; si se revierte D2, queda el respaldo.

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito lleva entre paréntesis la parte que lo entrega (P2): *(F7a)*, *(F7b)* o *(F7a y F7b)*. Las listas y lo que hace cada parte con los compartidos están en «La partición en F7a y F7b».

**Reglas de todo port** *(salen de la hoja de ruta y de la spec de F2)*

- **FR-001** *(F7a y F7b)*: Los E2E de comportamiento del laboratorio y de los exploradores (FR-060 y FR-061) DEBEN entrar en F7a, escritos con Page Objects contra el legacy y en verde antes de portar, sin fijar lo que cambia X1. Esos E2E DEBEN pasar sin editarse sobre la página de F7b. Los E2E de lo que cambia X1 entran en F7b (FR-036). Editar cualquier otro es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, «E2E primero»; clarify de F1, Q1; clarify de F7, X1)*
- **FR-002** *(F7a y F7b)*: Los 106 E2E de F1 y los 17 de A2 DEBEN pasar sin editarse después de cada PR. Los Page Objects y los dobles de F1 (`qa/e2e/pages/lab.ts` y `qa/e2e/fixtures/compiler-double.ts`) sólo pueden sumar métodos, y sus localizadores de hoy no cambian: `.quest-lab-context` sigue siendo la clase del bloque de contexto.
- **FR-003** *(F7a y F7b)*: F7 NO DEBE agregar dependencias de ejecución. NO DEBE dejar estilos en línea propios en `pages/lab`, en `features/run-exercise` ni en el adaptador: ni `style=`, ni `setAttribute('style', …)`, ni `style.cssText`, ni la prop `style` de React. Los dos `style=` de la reflexión y el `cssText` del respaldo de la copia pasan a clases con el mismo estilo computado. Las dependencias de desarrollo de la primera spec de componente (`jsdom` y Testing Library) y de la primera fábrica (`fishery`) entran sólo con el permiso del usuario, con su peso medido, y sólo si ningún ítem anterior las instaló. *(Hoja de ruta, «Acciones del usuario»; C4, FR-017)*
- **FR-004** *(F7a y F7b)*: `dist/index.html` DEBE conservar la forma que fija A2 (un documento con un script y un estilo en línea, y el contenido aparte) y quedar bajo `BOOT_SIZE_LIMIT` de `qa/build-check` (1 250 000 caracteres), con el tamaño antes y después informado en cada PR.
- **FR-005** *(F7a y F7b)*: Los avisos de complejidad de `lab.js`, `lab-explorers.js` y `quest-explorers.js` DEBEN desaparecer con ellos. Ninguna función nueva DEBE superar 10 sin justificarlo en la revisión, y el total de avisos de `npm run lint` no sube. El mapa contó 13, 2 y 4; F2a y F2b movieron algunos, y el plan los mide en la base. *(Hoja de ruta, criterios globales)*
- **FR-006** *(F7a y F7b)*: Cada PR DEBE poder revertirse entero y devolver el laboratorio anterior con la red en verde. Cada cambio de comportamiento DEBE empezar con una prueba que falla por la razón esperada. *(Hoja de ruta, «Un PR por vista»; constitución, principio II)*

**Alcance y retiro**

- **FR-007** *(F7b)*: La página DEBE dibujar lo que hoy dibujan `mapHTML`, `exerciseHTML` con sus tres fases y el bloqueo de campaña (ver «Lo que dibuja»), con el mismo DOM y los mismos textos, salvo las diferencias listadas de FR-064. Si A4 entró antes que F7b, la referencia es la revisión de `lab.js` con los estados y los textos de A4, que F7b porta como comportamiento vigente con sus E2E (criterio C4).
- **FR-008** *(F7b)*: La página DEBE montarse con una raíz de React sobre `#main`, como el Atlas, por el adaptador `window.TallerLab` (`mount(host, language, toast)` y `unmount()`), publicado desde `frontend/src/app/legacy/`. Cuando `mount` vuelve, la página ya está dibujada. Si la página lanza al dibujarse, el adaptador lo registra con `console.error` y un mensaje en español.
- **FR-009** *(F7b)*: La página DEBE recibir por props, desde el adaptador, lo que hoy sale de `window` o del contenido: el catálogo de ejercicios, el puerto de transporte (FR-044), el constructor del programa (FR-051) y el `toast` del shell. Al almacén, a los motores y a los puentes llega por imports de sus slices. NO DEBE leer `window` ni importar `getContent()` (R5 de `seams-guard-check`).
- **FR-010** *(F7b)*: DEBEN borrarse `frontend/lab.js`, `frontend/lab-explorers.js` y `frontend/quest-explorers.js`, con sus entradas en `legacy-views.ts`, `load-order-check`, `boot-check` y `qa/lib/legacy-sources.ts`. Al terminar, `grep` no los encuentra en `frontend/` ni en `qa/`.
- **FR-011** *(F7b)*: `frontend/lab.css` y `frontend/quest-explorers.css` DEBEN salir de `frontend/`. Sus reglas se mueven sin editarse al slice (`pages/lab/ui/`, como `atlas.css`) y se importan en el mismo lugar de la cascada de `main.tsx` (decisión D4). Con eso, el `<style>` del dist queda igual salvo las reglas que reemplazan a los estilos en línea (FR-003).
- **FR-012** *(F7a: `TallerRunner`; F7b: el resto)*: DEBEN retirarse `window.TallerExplorers`, `window.TallerQuestExplorers`, `window.TallerRunner` con `register-runner.ts`, y `window.TallerEditor` con `register-editor.ts` (decisión D5). `runner-check` DEBE pasar a cargar `shared/api/playground` directamente, sin perder escenarios; lo retira A4. *(Supuesto F7-S9 de A4)*
- **FR-013** *(F7b)*: DEBEN retirarse de los adaptadores de campaña y de Sistemas los métodos que sólo leía el laboratorio: `TallerCampaign.exerciseContextHTML`, `lockedExerciseHTML` y `returnURL`, y `TallerSystems.exerciseContextHTML`, `missionIDs`, `returnURL` y `refresh`. `TallerCampaign.refresh`, `TallerCampaign.sync` y `TallerSystems.sync` DEBEN quedarse mientras `app.js` los lea (ver «Qué queda en `window.*`»).
- **FR-014** *(F7b)*: `window.TallerLab` DEBE publicar exactamente los diez métodos que `app.js` invoca (`qa/lib/app-adapters.ts`), delegando en `labStore`, en `exerciseCatalog` y en la sesión de la página: `init` abre el catálogo y el almacén como hoy, sin escribir. `reset` borra el almacén, reinicia la sesión y aborta la ejecución (FR-021). Los métodos que no dibujan DEBEN poder evaluarse en los checks sin empaquetar la página ni los motores: un check que carga el adaptador junto con `register-campaign-engine.ts` no puede terminar con dos motores ni con dos almacenes (spec de F2, FR-018). El plan elige cómo; por ejemplo, separar la parte que dibuja, y que la sesión se reinicie desde un módulo que no importa la vista. El PR DEBE listar quién lee cada método y qué ítem lo retira.
- **FR-015** *(F7a y F7b)*: Los checks de infraestructura DEBEN cambiar sólo cómo cargan o qué observan, sin relajar ninguna restricción:
  - `load-order-check` y `legacy-views.ts`, con el adaptador en el lugar de `lab.js`;
  - `boot-check`, que lee los nodos de la vista del laboratorio como ya lo hace con el Atlas y exige que evaluar el adaptador no toque el almacenamiento;
  - `seams-guard` y su check, donde el dueño del índice de `exercise` pasa de `lab.js` al adaptador y salen las fixtures que citan `lab-explorers.js` y `quest-explorers.js`;
  - `qa/lib/legacy-sources.ts`;
  - `qa/lib/app-adapters.ts`, cuya lista no cambia;
  - una comprobación de aislamiento, como las de las entradas sin estado de F2b, que pruebe que empaquetar `lab.js` (en F7a) o el adaptador (en F7b) no trae otra instancia de un motor ni del almacén.

**Datos y progreso**

- **FR-016** *(F7a y F7b)*: Cada acción DEBE escribir en `taller-laboratorio-v1` lo mismo y la misma cantidad de veces que hoy (tabla «Lo que guarda y cuándo»). Montar, recorrer el mapa, filtrar, buscar, cambiar de fase, copiar, usar un explorador y volver al mapa NO DEBEN escribir. El editor, el caso propio y la reflexión escriben en cada tecla, sin debounce. *(Hoja de ruta, «Reglas de todo port»)*
- **FR-017** *(F7b)*: Mostrar un ejercicio DEBE dejar en memoria su registro vacío, que guarda la escritura siguiente, como hoy (decisión D1). La página lo crea al mostrar el ejercicio y no durante el render.
- **FR-018** *(F7a y F7b)*: El formato guardado NO DEBE cambiar: la clave, `version: 1`, los nombres y topes de los campos, `selected` por lenguaje y los IDs. Las tres fixtures congeladas DEBEN arrancar sin escribir, sin respaldar y sin avisar (ADR 0003). La página no agrega campos ni cambia la forma de los que D1 sincroniza (tabla «El progreso que D1 sincroniza»).
- **FR-019** *(F7a y F7b)*: El progreso DEBE leerse de `labStore.getProgress()` en cada render y en cada manejador, nunca de una copia. Un componente DEBE suscribirse con `useStore(labStore.changes, (state) => state.revision)`, nunca con el store entero. Con dos pestañas, una ejecución que termina después de que otra pestaña fusionó su progreso DEBE dejar los dos: la identidad de los registros que garantiza el almacén (spec de F2, FR-025) o una relectura después de esperar dan ese resultado.
- **FR-020** *(F7b)*: La sesión del laboratorio DEBE vivir en un módulo que sobrevive al desmontaje y se pierde al recargar, sin `localStorage` ni `sessionStorage`. Tiene el ejercicio elegido, el modo, la fase, la búsqueda, el nivel, los dos filtros, los modelos visuales, los estados de los exploradores y la ejecución activa. Se reinicia como hoy:
  - **al cambiar de idioma,** el ejercicio, el modo, la fase, la búsqueda y «Repasar pendientes», pero no el nivel ni «Clásicos y sistemas»;
  - **al abrir un ejercicio,** los modelos visuales y los exploradores.
- **FR-021** *(F7b)*: «Borrar todo» (`TallerLab.reset`) DEBE abortar la ejecución en curso sin guardar y dejar la sesión en el mapa, en «Descubrí» y sin ejercicio elegido, como hoy. Si la página nunca se montó, el reinicio no lanza.

**El mapa**

- **FR-022** *(F7b)*: El mapa DEBE mostrar las regiones de «Lo que dibuja» con los textos de hoy. Los conteos (desafíos del lenguaje, resueltos, temas, puntos, repasos, «Clásicos y sistemas · N», los niveles y la nota de respaldo con 274, 137 y 137) DEBEN derivarse del catálogo y del progreso en cada render.
- **FR-023** *(F7b)*: Los filtros DEBEN comportarse como hoy:
  - el nivel, por el campo del ejercicio o, si falta, por etapa (1 a 4, 5 a 8, 9 a 12 y más);
  - «Clásicos y sistemas», etapas 16 a 20;
  - «Repasar pendientes», `reviewAt` vencido;
  - la búsqueda, con `normalizeSearchText` sobre título, tema, intro y porqué, y sus estados vacíos;
  - «Ver todos los desafíos», que limpia los cuatro.

  El estado del filtro conserva sus textos y dice «para tu búsqueda» siempre que hay una búsqueda (X1 y C2). Después del nivel, de «Clásicos y sistemas» y de «Repasar pendientes», el foco queda en el botón pulsado.
- **FR-024** *(F7b)*: «Sorprendeme» DEBE elegir al azar entre los filtrados vencidos o sin resolver o, si no hay, entre los filtrados. Avisa «Un desafío elegido para tu próxima idea.» o, sin candidatos, «No hay desafíos con estos filtros. Probá ampliar la búsqueda.». La fuente de azar DEBE poder controlarse en las pruebas.
- **FR-025** *(F7b)*: Cada tema DEBE mostrar su nivel, su etapa con dos dígitos, «resueltos/total» y sus nodos, con «✓» o el número, las clases `is-complete`, `is-due` e `is-current`, `title` y `aria-label` («Resuelto. » más el título). «UN DESAFÍO PARA HOY» elige el primero sin resolver, después el primero vencido, después el primero, entre los del nivel y «Clásicos y sistemas», sin mirar la búsqueda.

**El ejercicio**

- **FR-026** *(F7b)*: El encabezado, la miga, la posición «N / M», las flechas deshabilitadas en los extremos y las pestañas DEBEN ser los de hoy. Las pestañas son un `tablist` con tabindex itinerante: las flechas, Home y End cambian de fase, y el foco va a la pestaña sin desplazar. Abrir un ejercicio desplaza la vista al principio y enfoca el título.
- **FR-027** *(F7b)*: «Descubrí» DEBE mostrar el concepto, el porqué, las fuentes, el explorador (por la prioridad de «Los exploradores») y la predicción. Elegir una opción guarda una vez, marca `aria-pressed` e `is-right` y muestra la devolución. Después sincroniza campaña y Sistemas, con «+N XP por razonar tu predicción.» en una misión de campaña o el aviso de falla, y actualiza el bloque de contexto.
- **FR-028** *(F7b)*: «Experimentá» DEBE mostrar:
  - la guía de ejecución, la misión, el editor con su barra y su pie;
  - «Ejecutar y revisar» y «Copiar programa completo ↗»;
  - el aviso con el enlace al Playground oficial del lenguaje y la vista previa;
  - el caso propio (abierto si hay uno);
  - las pistas: tope de 3; el foco vuelve al botón, las pistas se desplazan a la vista y pedir otra no cierra la solución (X1);
  - la solución: abrirla marca `solutionSeen` y `assisted` cada vez;
  - el revisor.
- **FR-029** *(F7a: la lógica; F7b: la vista)*: El revisor DEBE tener los estados de hoy, con sus textos:
  - **ejecutando,** con «Cancelar ejecución»;
  - **sin resultado o con un resultado que dejó de estar vigente,** con la pista en vivo;
  - **falla de transporte;**
  - **aprobado,** con la pregunta de transferencia y «Explicar lo que aprendí →»;
  - **parcial,** con el porqué de la primera prueba que falló;
  - **error,** con la explicación y la acción de `diagnose`.

  Además: la lista de casos con su estado (también para lectores de pantalla), el caso propio, la salida del compilador y la línea final con «Práctica con solución de apoyo. », «N intento(s)» y la cantidad de casos.
- **FR-030** *(F7b)*: «Inventar una variante» DEBE copiar la expresión de la prueba al caso propio sólo si no había uno, y guardar. Abre el panel, enfoca, selecciona y centra el campo, y avisa con el texto de cada caso.
- **FR-031** *(F7b)*: «Restaurar inicio» y «Cargarla y experimentar» DEBEN pedir confirmación en un `<dialog>` modal con los títulos, los textos y los botones de hoy («Conservar mi código» y «Continuar»). Confirmar escribe una vez, reemplaza el texto del editor y le da el foco, y los paneles quedan como estaban (X1); conservar devuelve el foco a quien lo tenía. El diálogo vive dentro de la raíz de la página, cuelga de `<body>` con un portal y se cierra al navegar (F9-Q4, que confirma D3).
- **FR-032** *(F7b)*: «Copiar programa completo» DEBE copiar el programa del constructor (FR-051) con el portapapeles, o con la selección si el portapapeles falla, sin `style.cssText`. Avisa «Código copiado. Incluye las pruebas.», «Código copiado.» o «No se pudo copiar automáticamente. Probá seleccionar el texto.».
- **FR-033** *(F7b)*: «Explicá» DEBE mostrar:
  - el estado: «Lo hiciste funcionar…» o «Lo exploraste con una solución de apoyo.», sólo si el resultado actual aprueba, está vigente y pasa cada prueba; si no, la invitación a ejecutar;
  - la reflexión, con sus tres textos de estado (rareza 3);
  - el razonamiento del revisor, con clases en lugar de los dos `style=`;
  - la variante y las fuentes;
  - la autoevaluación (1, 3 o 7 días, `reviewedAt`, `aria-pressed` y el aviso), con la fecha del próximo repaso en `es-AR` y el foco en el botón elegido (X1);
  - el pie, con «Siguiente experimento →», «Volver al taller →» o «Volver al mapa →».
- **FR-034** *(F7b)*: Anterior y siguiente DEBEN recorrer la lista navegable y, pasado el extremo, terminar la navegación (tabla de «Los puentes como datos»). «← Volver al mapa» y «← Volver al taller» abortan la ejecución, terminan la navegación y desplazan la vista al principio.
- **FR-035** *(F7b)*: La página DEBE leer `ejercicio`, `paso`, `campana` y `sistema` con `readLinkQuery` y `exercisePhaseOr` al montar, y escribir la URL con `withLabQuery` y `history.replaceState` en cada cambio de modo, de ejercicio o de fase. En el mapa borra `campana` y `sistema`, y si el historial no está disponible, falla en silencio. Las seis formas de URL de F1 siguen llevando adonde llevan. Si nuqs ya está instalado cuando llegue F7b (lo trae F5 por su Q3), `AGENTS.md` pide usarlo para la selección y la fase; el plan de F7b decide, y la URL tiene que salir carácter por carácter igual que con `withLabQuery`.
- **FR-036** *(F7b)*: Las rarezas de lógica de «Rarezas que el port conserva» DEBEN conservarse, cada una con su E2E `KNOWN DEFECT`. Lo de «Lo que el port cambia a propósito» DEBE seguir el comportamiento de React (X1 y C2), y lo fijan E2E sin `KNOWN DEFECT`. Entran en F7b, en el commit que cambia el comportamiento: en rojo contra el legacy y en verde con la página, con la aprobación de este clarify. La página NO DEBE reproducir un redibujo completo para cerrar paneles ni para soltar el foco.

**Campaña y Sistemas dentro del laboratorio**

- **FR-037** *(F7b)*: La lista navegable, el regreso, el contexto, el bloqueo y los rótulos de la vuelta DEBEN componerse en `pages/lab/model` como funciones puras, con los puentes de F2b, los motores de campaña y de Sistemas y el tipo de misión de `entities/campaign` (supuesto F6-S2). Las reglas son las de «Los puentes como datos». Ninguna entidad importa a otra.
- **FR-038** *(F7b)*: Si el enlace de campaña no da acceso, la sección del bloqueo DEBE reemplazar toda la vista, con «CAMPAÑA · ACCESO A LA MISIÓN», el título, los motivos y «Ver mi mapa →» al mundo o a `#campana`. El bloqueo se calcula antes que el contexto, y una ejecución pedida sobre una misión bloqueada se rechaza con su aviso.
- **FR-039** *(F7b)*: El bloque de contexto DEBE conservar su marcado (`.quest-lab-context`, el enlace con «←» y dos rótulos), sus textos y el orden de efectos que fija la spec de F6 (su FR-035: el contexto de campaña refresca antes de leer y sólo si el enlace trae un mundo; el bloqueo usa el último estado refrescado):
  - **campaña:** «N/30 XP · tipo» y «✓/○ Pruebas ✓/○ Predicción»;
  - **Sistemas:** el rol del ejercicio y «✓ Núcleo verificado» o «Tres pruebas para verificar el núcleo».

  Se actualiza al terminar una ejecución y al predecir, sin redibujar el ejercicio. Los motores se refrescan en memoria al montar y después de cada cambio del laboratorio, nunca como efecto del dibujado ni con `syncLab`.

**El editor**

- **FR-040** *(F7b)*: El editor DEBE montarse con un hook de `shared/ui/code-editor` que recibe un callback de cambio con el texto, sin consumir eventos `input` despachados por código.
  - **El teclado:** Ctrl o ⌘ + Enter ejecuta, Esc lleva el foco a «Ejecutar y revisar», y Tab y Mayús+Tab avanzan entre los campos del snippet o sangran.
  - **Lo demás:** el autocompletado, el tope de 30 000 caracteres, el lenguaje y el nombre accesible «Editor de código Rust» o «Go».

  Cada cambio escribe en la tecla, sin debounce. El editor se destruye al desmontar, al cambiar de fase y al cambiar de ejercicio.
- **FR-041** *(F7b)*: React NO DEBE reconciliar el DOM que maneja CodeMirror. El DOM de «Experimentá» DEBE ser el de hoy, o diferir sólo en lo listado en FR-064 con el mismo estilo computado. «Restaurar inicio» y «Cargarla y experimentar» reemplazan el texto del editor y le dan el foco.
- **FR-042** *(F7b)*: El editor de respaldo (el `textarea` con su numeración, su Tab de cuatro espacios y la sincronización del desplazamiento) DEBE retirarse, porque con el editor importado no se alcanza (decisión D2). El teclado del editor real lo fijan los E2E.

**La ejecución: `features/run-exercise`**

- **FR-043** *(F7a)*: `features/run-exercise` DEBE orquestar la ejecución como hoy (ver «La ejecución hoy»):
  - los rechazos previos con sus avisos;
  - la política de intentos (FR-047);
  - una sola ejecución activa;
  - el armado del `result` v1 con `code`, `customTest` normalizado y `time`;
  - el guardado;
  - `solvedAt` la primera vez y `reviewAt` a un día si no había;
  - los avisos;
  - `syncAfterRun`;
  - el descarte de un resultado que llega cuando la ejecución ya no es la activa.

  La feature recibe como dependencias inyectadas el almacén, el reloj, el aviso, las dos sincronizaciones y la consulta de si el ejercicio es una misión de campaña, como hoy `syncAfterRun` recibe sus funciones. NO DEBE importar el índice de ningún motor: así, empaquetarla junto a `lab.js` o al adaptador no duplica un singleton en los checks.
- **FR-044** *(F7a)*: El transporte DEBE llegar como un puerto inyectado desde la raíz de composición: en F7b, el adaptador de `app/legacy`; en F7a, `lab.js`, que hace de raíz del laboratorio legacy. Ni la feature ni la vista importan un adaptador, y nadie lee `window.TallerRunner`. *(F7-S1)*
- **FR-045** *(F7a)*: La entrada del puerto DEBE ser el ejercicio (id, lenguaje, pruebas e imports), el borrador tal cual, la prueba propia normalizada y la señal de cancelación, nunca el programa armado. *(F7-S2)*
- **FR-046** *(F7a)*: La salida del puerto DEBE ser un veredicto:
  - si se ejecutó o el mensaje de la falla de transporte;
  - si compiló y terminó bien;
  - las salidas;
  - el veredicto de cada prueba esperada por id y el de la prueba propia;
  - un id de intento opcional.

  La feature NO DEBE leer marcas de la salida. *(F7-S3)*
- **FR-047** *(F7a)*: El adaptador DEBE declarar antes de ejecutar si suma al contador local `attempts`. Si suma, la feature suma y guarda antes de llamar al puerto, así que una ejecución cancelada o fallida cuenta, como hoy. *(F7-S4, con el matiz de su tabla)*
- **FR-048** *(F7a)*: La feature DEBE exponer a la vista el estado de la ejecución en una unión ampliable con los estados de hoy (libre y ejecutando), con un canal por el que el adaptador avisa sus cambios, y la cancelación. A4 suma sus estados (la fila, la demora y la espera de turno) y sus textos sin cambiar la orquestación ni el puerto. *(F7-Q2)*
- **FR-049** *(F7a)*: El adaptador de los Playgrounds DEBE dar el comportamiento de hoy: arma el programa con `buildProgram`, ejecuta con `runCode` (60 s, 200 KB y sus mensajes) e interpreta con `interpretRun`. Las salidas se recortan una sola vez, a 12 000 y 18 000 caracteres.
- **FR-050** *(F7a)*: «Cancelar ejecución», abrir otro ejercicio, anterior y siguiente, volver al mapa, desmontar y «Borrar todo» DEBEN abortar la ejecución sin guardar resultado. Sólo el primero avisa. Cambiar de fase NO DEBE abortar.
- **FR-051** *(F7a: el parámetro; F7b: la vista)*: La vista previa y «Copiar programa completo» DEBEN recibir el constructor del programa por parámetro desde `app`. Hoy es `buildProgram` (ejercicio, borrador y prueba propia); A4 lo cambia por la plantilla del servidor. *(F7-S6, extendido)*
- **FR-052** *(F7a)*: `sanitizeResult` (`entities/exercise/model/lab-state.ts`) DEBE seguir siendo el único normalizador del `result` v1, y la feature DEBE armar el `result` en un solo lugar, también el de una falla de transporte. `hasPassingEvidence` sigue siendo la regla única de aprobación. *(F7-S7; ADR 0003, punto 7)*

**Las reglas del ejercicio en `entities/exercise`**

- **FR-053** *(F7a)*: `diagnose` (8 reglas de Rust y 8 de Go, más la explicación por omisión) y `liveHint` (4 casos) DEBEN pasar a `entities/exercise` sin cambiar un texto ni una expresión, con specs cuyos valores esperados se escriben a mano.
- **FR-054** *(F7a)*: Los selectores DEBEN ser funciones puras, con la hora y el azar explícitos:
  - **en `entities/exercise`, los del registro:**
    - resuelto alguna vez, por `solvedAt` (F7-Q1), fijado por una spec con `rust-09`;
    - vencido para repaso;
    - los puntos: 20 por `solvedAt`, 5 por `predictionCorrect` y 5 por una reflexión de 40 caracteres o más sin contar los espacios de los extremos;
    - el nivel, con `LEVEL_LABELS`;
    - la vigencia del resultado;
    - el resuelto de «Explicá»;
    - el completo del revisor;
  - **en `pages/lab/model`, los del mapa:** el filtro, «Un desafío para hoy» y el grupo de «Sorprendeme».
- **FR-055** *(F7a)*: Las reglas que cambian un registro DEBEN ser funciones puras con valores esperados escritos a mano:
  - la pista con tope 3;
  - la autoevaluación (1, 3 o 7 días);
  - las marcas al abrir y al cargar la solución;
  - restaurar el inicio;
  - la predicción, donde `predictionCorrect` sólo crece.

**Los exploradores**

- **FR-056** *(F7b)*: Los exploradores DEBEN ser componentes de React que dibujan los modelos de F2b desde `entities/exercise/explorers`, con el mismo marcado, las mismas clases, los mismos `aria-*` y los mismos textos que hoy. Respetan la prioridad de «Los exploradores» y la nota «Modelo conceptual · No ejecuta el código del editor ni acredita la misión.».
- **FR-057** *(F7b)*: Después de cada operación, el foco DEBE ir adonde va hoy (tabla de «Los exploradores»). Las regiones vivas quedan montadas (X2), y el historial del robot conserva su `<details>` cerrado si el alumno lo cerró.
- **FR-058** *(F7b)*: El estado de cada explorador DEBE vivir en la sesión (FR-020) y reiniciarse como hoy. Los de misión van por ejercicio y se vacían al abrir un ejercicio; el de laboratorio es uno y se reinicia al abrir; los modelos visuales se reinician al abrir. Entrar por URL o cambiar de fase no reinicia nada.
- **FR-059** *(F7b)*: Los modelos visuales de ownership, slices y recorrido DEBEN conservar sus textos, sus operaciones y sus estados. Las misiones de proyecto, «Cómo está diseñado este taller…» y los recursos de práctica DEBEN conservar sus textos y enlaces, como constantes del slice (decisión D6).

**Las pruebas**

- **FR-060** *(F7a)*: Los E2E nuevos del laboratorio DEBEN usar Page Objects (el de F1 ampliado y los nuevos que hagan falta) con localizadores por rol y nombre accesible, el doble del compilador (con `hold` para cancelar), `page.clock` para las fechas y una fuente de azar fija. Cubren US1 a US4:
  - el mapa y sus filtros;
  - las tres fases;
  - el editor por teclado;
  - las pistas y la solución;
  - el diálogo y sus dos caminos de foco;
  - la copia y la vista previa;
  - la ejecución libre con los cuatro resultados, la cancelación, la vigencia y el contador;
  - la autoevaluación;
  - el pie y la vuelta;
  - las escrituras con `storage.watchWrites()`;
  - las rarezas de lógica con `KNOWN DEFECT`.

  *(F7-S8)*
- **FR-061** *(F7a)*: DEBE haber al menos un E2E por cada tipo de explorador (robot, paquete de Rust y de Go, canal, genérico, puntero, ownership, slices y recorrido), con una operación, el texto de su región viva y el destino del foco, escrito contra el legacy.
- **FR-062** *(F7a y F7b)*: Las specs nuevas DEBEN ser de Vitest:
  - **de modelo** (proyecto `node`): los selectores, `diagnose`, `liveHint`, las reglas del registro, la composición de los puentes y la feature con un transporte doble;
  - **de componente** (proyecto `jsdom`): con Testing Library y consultas por rol y nombre accesible, y el editor reemplazado por la interfaz del hook si CodeMirror no corre en jsdom.

  Los valores esperados se escriben a mano desde `content/` y las fixtures congeladas. Las entradas repetidas usan fábricas de fishery sólo si hacen falta.
- **FR-063** *(F7a y F7b)*: Los checks de `qa/` que cargan lo que F7 borra DEBEN listar en el PR la correspondencia de cada escenario: su spec o su E2E nuevo, o su descarte con el motivo.
  - **`lab-state-check` (37 escenarios):** los de almacén apuntan a `labStore`; los que manejan la vista con su DOM falso (dos pestañas, la predicción, la reflexión y el guardado degradado) pasan a specs o a E2E.
  - **`quest-explorers-check` (47 aserciones):** se retira con la tabla de la unidad 7 de F2b. Las cinco que sólo veía el check (tres de foco y dos de `states.clear()`) pasan a E2E y a la spec de la sesión.
  - **`lab-bridge-check` (21):** queda sin escenarios que lean HTML de los adaptadores.
  - **`runner-check`:** se re-apunta (FR-012).

  `exercise-evidence-check` y `runtime-check` no cambian.
- **FR-064** *(F7b)*: Una comparación única DEBE medir el DOM y los textos del legacy contra la página sobre una grilla de estados:
  - el mapa con cada filtro;
  - cada fase de una muestra de ejercicios de los dos lenguajes;
  - cada estado del revisor;
  - el bloqueo y los dos contextos;
  - el diálogo;
  - los exploradores, con las trazas de operaciones sobre los 274 ejercicios (el oráculo de la unidad 7 de F2b).

  El PR lista las diferencias de serialización de React y los atributos `data-*` de delegación que se retiran, que ninguna hoja ni ningún E2E usa.
- **FR-065** *(F7b)*: Un barrido de estilo computado DEBE comparar el antes y el después de mover las hojas y de reemplazar los estilos en línea, con 0 diferencias. Recorre el mapa, las tres fases, los estados del revisor, el bloqueo, los contextos, el diálogo y cada explorador, más las vistas de Campaña y de Sistemas, que pueden usar clases de `lab.css`. Mide en 1200, 981, 850, 700, 650 y 590 px, con y sin `prefers-reduced-motion: reduce`. Con movimiento reducido, el spinner (`.lab-spinner`) y las transiciones quedan apagados como hoy, por la regla global de `styles.css` y la de la hoja del laboratorio, y la página no suma animaciones ni una librería de animación.

**La integración**

- **FR-066** *(F7a y F7b)*: F7 DEBE integrarse de a uno con F8 y F10, que comparten `app.js` y los arneses. En el mismo PR, `docs/architecture.md`, `qa/AGENTS.md` y la lista de vistas legacy de `AGENTS.md` DEBEN reflejar el cambio; los integra el agente principal.

### Key Entities *(include if feature involves data)*

- **Registro del ejercicio (v1):** lo que guarda `taller-laboratorio-v1` por id: `draft`, `customTest`, `reflection`, `prediction`, `predictionCorrect`, `hints`, `assisted`, `solutionSeen`, `confidence`, `reviewedAt`, `reviewAt`, `attempts`, `solvedAt` y `result`. Su forma no cambia.
- **`result` v1:** `code`, `success`, `stdout`, `stderr`, `transportError`, `tests` (id y si pasó), `time`, `customTest` y `customPassed`. Lo normaliza sólo `sanitizeResult`.
- **Sesión del laboratorio:** el estado en memoria que sobrevive al desmontaje: el ejercicio elegido, el modo, la fase, los filtros, los modelos visuales, los estados de los exploradores y la ejecución activa.
- **Puerto de transporte:** la interfaz entre `features/run-exercise` y un adaptador (los Playgrounds hoy; `/api/runs` con A4). Tiene su entrada, su veredicto, su política de intentos y su canal de progreso.
- **Veredicto:** lo que devuelve el puerto; no es la salida cruda.
- **Estado de la ejecución:** lo que la feature expone a la vista: una unión ampliable con los estados de hoy (F7-Q2).
- **Composición de los puentes:** la lista navegable, el regreso, el contexto, el bloqueo y los rótulos, derivados de los puentes de F2b y de los motores.
- **Explorador:** su tipo (el mapa explícito de F2b), su modelo puro, su estado, su vida y su región viva.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los 123 E2E de F1 y A2 pasan sin editarse después de cada PR. Los E2E nuevos del laboratorio y de los exploradores pasan contra el legacy antes de portar y contra la página después, sin editarse, y su cantidad se informa.
- **SC-002**: `grep` da 0 apariciones de `lab.js`, `lab-explorers.js`, `quest-explorers.js`, `lab.css` y `quest-explorers.css` en `frontend/` y en `qa/`, y 0 asignaciones a `window.TallerExplorers`, `TallerQuestExplorers`, `TallerRunner` o `TallerEditor`. `window.TallerLab` publica 10 métodos y los adaptadores de campaña y Sistemas, los de la tabla.
- **SC-003**: Para cada fila de «Lo que guarda y cuándo» y para una secuencia combinada, la lista de escrituras y el texto final de `taller-laboratorio-v1` son iguales byte a byte en el legacy y en la página. Las dos corridas usan el mismo reloj fijo (`page.clock`), porque `time`, `solvedAt`, `reviewAt` y `reviewedAt` salen de la hora, y la misma fuente de azar, por «Sorprendeme». Las tres fixtures arrancan con 0 escrituras.
- **SC-004**: La comparación del DOM da 0 diferencias fuera de la lista del PR, y las trazas de los exploradores sobre los 274 ejercicios dan 0 diferencias (la unidad 7 de F2b midió 2 214 comparaciones).
- **SC-005**: El barrido de estilo computado da 0 diferencias en los seis anchos, con y sin movimiento reducido, y `css-contract` (R1 a R10) sigue en verde.
- **SC-006**: Una spec de la feature corre el ciclo completo (aprobado, parcial, error, falla de transporte y cancelación) con un adaptador doble que no arma programa, no lee marcas y declara que no suma intentos, sin cambiar la feature ni la vista. El adaptador de los Playgrounds reproduce los cuatro resultados de F1.
- **SC-007**: `npm test` pasa, y las correspondencias de `lab-state-check` (37), `quest-explorers-check` (47) y `lab-bridge-check` (21) tienen 0 filas sin destino ni motivo.
- **SC-008**: `dist/index.html` queda bajo 1 250 000 caracteres, con el antes y el después informados, y no entra ninguna dependencia de ejecución.
- **SC-009**: Los avisos de complejidad de los tres archivos desaparecen, no hay funciones nuevas de más de 10 sin justificar y el total de `npm run lint` no sube.
- **SC-010**: Los E2E fijan los 15 destinos del foco (los 13 de hoy y los dos de X1), los cuatro cambios de «Lo que el port cambia a propósito», el teclado de las pestañas y del editor, y Esc. Las specs de componente comprueban que las regiones vivas conservan su nodo al actualizarse, y la revisión del PR registra la comprobación manual con lector de pantalla (X2).
- **SC-011**: `pages/lab`, `features/run-exercise` y el adaptador tienen 0 `style=`, `setAttribute('style'`, `style.cssText` o prop `style`, y la guardia de C4, si ya existe, sigue en verde.
- **SC-012**: `curriculum-ids-check` y los escenarios de almacén de `lab-state-check` siguen en verde, y la exportación de cada fixture congelada por `TallerLab.exportState()` es igual byte a byte antes y después.

## Decisiones que toma esta spec

No las pidió el usuario y no cambian lo que el alumno ve. D3 la confirmó el clarify (F9-Q4); las demás no se preguntaron y siguen vigentes, y cada una se puede revertir en el plan con la aprobación del usuario.

| # | Decisión | Por qué | Si se revierte |
| --- | --- | --- | --- |
| D1 | Conservar el registro vacío que deja mostrar un ejercicio | Lo guardado queda igual byte a byte, y eso deja usar la comparación de SC-003 | Las exportaciones pierden esos registros vacíos (D1 no los sincroniza) y la comparación los tiene que excluir |
| D2 | Retirar el editor de respaldo | Con el editor importado sólo se alcanzaría si CodeMirror lanza al montarse, cosa que no se observó. Hoy lo usan los checks, que no cargan el editor | Hay que portar la numeración, el Tab de cuatro espacios y el desplazamiento, con sus pruebas, para un camino que nadie ve |
| D3 | El diálogo de confirmación vive dentro de la raíz de la página y cuelga de `<body>` con un portal | Replica el padre de hoy sin otra raíz. Confirmada en el clarify (F9-Q4), que agrega que se cierra al navegar | — |
| D4 | Mover las dos hojas sin editarlas a `pages/lab/ui/`, en el mismo lugar de la cascada | La hoja de ruta las borra de `frontend/`, el Atlas ya vive así y el `<style>` casi no cambia | Podarlas o partirlas exige un barrido por cada cambio |
| D5 | Retirar también `register-editor.ts` y `window.TallerEditor` | Sólo los lee `lab.js` (misma lógica que F7-S9) | Queda un global sin lector |
| D6 | Las misiones de proyecto y los recursos de práctica quedan como constantes del slice | Llevarlos a `content/` es un cambio de contenido que el port no hace | Un ítem de contenido aparte |

## Riesgos

1. **El tamaño de F7.** Es el ítem más grande del épico. *Mitigación:* la partición en F7a y F7b (P2) y la comparación única, que ataja las diferencias que los E2E no ven.
2. **CodeMirror y React sobre el mismo DOM.** CodeMirror inserta nodos y cambia clases y estilos de un contenedor. Si React lo reconcilia, el editor se rompe o pierde texto. *Mitigación:* FR-041, un contenedor que React no toca y los E2E del editor.
3. **CodeMirror en jsdom no está verificado** (hoja de ruta, «Sin verificar»). *Mitigación:* las specs de componente reciben el editor por la interfaz del hook, y el editor real se prueba en E2E.
4. **El foco y los paneles con X1.** Sin reproducir los redibujos, el foco y el estado de los paneles dependen de qué nodos conserva React en cada acción. *Mitigación:* los 15 destinos del foco y los cuatro cambios de X1 fijados con E2E, y referencias con `flushSync` donde haga falta.
5. **Lo que anuncia un lector de pantalla** al dejar montadas las regiones que hoy se recrean no está verificado. *Mitigación:* la comprobación manual con lector de pantalla que pide X2, en la revisión (acción del usuario).
6. **El barrido no ve `:hover`, `:focus` ni las animaciones.** *Mitigación:* las hojas se mueven sin editarse, y sólo cambian las reglas de los estilos en línea, que no tienen esos estados.
7. **F5 y F6 no tienen spec.** Si dejan los adaptadores distintos de lo que supone esta spec, cambian las filas de «Qué queda en `window.*`» y FR-013. *Mitigación:* los supuestos con nombre y una revisión de sus specs antes del plan de F7.
8. **Dos pestañas y una ejecución larga.** La fusión en el lugar es lo que hoy salva el resultado. *Mitigación:* FR-019 y su spec.
9. **Las fechas y el azar en los E2E** (repasos y «Sorprendeme»). *Mitigación:* `page.clock` y una fuente de azar inyectable.
10. **El orden de integración con F8, F10 y A4,** que tocan `app.js`, `legacy-views.ts` y la feature. *Mitigación:* de a uno, el que llega después rebasa.
11. **La comparación del DOM y la serialización de React** (orden de atributos, atributos booleanos y `data-*` retirados). *Mitigación:* la lista de diferencias admitidas en el PR, con el barrido como juez del aspecto.
12. **Dos instancias de un motor o del almacén en los checks.** La regla R4 sólo mira los imports directos. Si el adaptador empaqueta la página, que importa los motores, o si la feature importa uno, un check que también carga `register-campaign-engine.ts` termina con dos (spec de F2, FR-018). El borrador de F5 lo plantea en su V3, y el de F6 lo resuelve en su FR-036. *Mitigación:* la feature recibe sus dependencias inyectadas (FR-043), los métodos del adaptador que no dibujan se evalúan sin la página (FR-014) y una comprobación de aislamiento lo vigila (FR-015).

## Relación con otros ítems

| Ítem | Qué toma F7 o qué le deja | Estado de la fuente |
| --- | --- | --- |
| F2b | La gramática de URL, los dos puentes, el mapa y los modelos de los exploradores, la fixture congelada, `features/progress-backup` y las reglas de CSS en la hoja de su dueño | Hecho: `f2b-acum@2b37caf4` (`shared/config/url-grammar.ts`, `entities/campaign/bridge.ts`, `entities/systems-workshop/bridge.ts`, `entities/exercise/explorers.ts` y `qa/fixtures/explorer-kinds-a179d03.json`) |
| F2a | `labStore` con `changes`, `exerciseCatalog`, `buildProgram`, `interpretRun`, `syncAfterRun`, `sanitizeResult` y el arranque explícito | Hecho, en `f2b-acum` |
| F5 | Los métodos de `TallerSystems` que lee el laboratorio hasta F7, y el motor de Sistemas importable. Su tabla de retiros coincide con la de F7 | Spec 018 (rama `spec/f5-sistemas`), con clarify; supuestos F5-S1 a F5-S3 |
| F6 | Los métodos de `TallerCampaign` hasta F7, el selector del tipo de misión y `.quest-direct-lock` en `lab.css`. Retira `TallerCampaign.init` | Spec 019 (rama `spec/f6-campana`), con clarify; supuestos F6-S1 a F6-S3 |
| A4 | F7-S1 a F7-S9, resueltos en su tabla. Toma el puerto de F7a (P2) y espera a F7a y a B3, no a F7b (criterio C4): dibuja sus estados y sus textos en la vista vigente cuando entra. Le quedan el adaptador por reemplazar, el constructor de la vista previa y el Page Object | Spec 017 (PR #50), con clarify |
| D1 | Los campos y sus escrituras no cambian (tabla) | Spec 007 |
| C4 | Los dos `style=` y el `cssText` de la copia salen del laboratorio. Con la Q3 de C4 (`style-src-attr 'unsafe-inline'`), ya no bloquean la CSP: F7 los borra por la hoja de ruta, no porque C4 lo espere. CodeMirror sigue necesitando ese permiso | Spec 008, con clarify |
| F8 | Hereda `TallerSystems.resetSimulations` y, si saca de `app.js` el armado de `progress-backup`, los métodos de respaldo de `TallerLab` | Hoja de ruta |
| F10 | Hereda `TallerLab.mount`, `unmount`, `init`, `loadWarning` y `getExercises`, `TallerCampaign.refresh` y los dos `sync` | Hoja de ruta |
| F3, F4 y F9 | El primero en llegar instala `jsdom`, Testing Library y fishery, y pasa Vitest a dos proyectos. F9-Q4 fijó dónde cuelga su diálogo, y F7 lo sigue (D3) | Specs 012, 013 y 014, con clarify |
| A3 | Cuando el contenido venga de la API, el adaptador sigue pasándole el catálogo por props a la página, sin cambio en la página | Spec 016, con clarify |

**Hoja de ruta (enmiendas que integra el coordinador):**

- F7 pasa de «Pendiente» a «En especificación» (clarify respondido; falta el plan de cada parte), con el enlace a esta spec.
- Sus líneas de F5 y F6 dicen que `refresh` y `sync` se conservan «hasta F7»: `app.js` también los lee, así que quedan hasta F10 (o F8).
- La línea de F7 en «Borra» suma `register-runner.ts`, `register-editor.ts` y sus globals.
- La fila de C4 en «Ítems del backend que tocan el front» ya no es una espera: C4 decidió `style-src-attr 'unsafe-inline'`.
- Con P2, F7 se parte en F7a y F7b. Por el criterio C4 del coordinador, A4 espera a F7a y a B3, no a F7b. Si A4 entra antes que F7b, dibuja sus estados en la revisión de `lab.js`, y F7b los porta con sus E2E.
- **Propuesta para el coordinador:** F7a no toca la vista, los puentes ni los adaptadores de campaña y Sistemas, así que podría correr en paralelo con F5 y F6, integrándose de a uno con ellos porque comparte `legacy-views.ts` y `qa/`. La regla «las hojas primero» sólo ata a F7b. Acortaría todavía más el camino de A4 y D1c.
- El tope de 2 500 000 caracteres de «Criterios de aceptación globales» quedó viejo con A2 (1 250 000).

## Assumptions

- **F2b está integrada como en `f2b-acum@2b37caf4`** (PR #41 a #44), con sus compuertas en verde: 123 E2E, 39 checks y 35 avisos de complejidad (borrador de T038). Si algo cambia al integrarla, el plan de F7 vuelve a medir la base.
- **F3, F4, F5 y F6 se entregan antes que F7** (hoja de ruta, tramos 2 y 3), así que `jsdom`, Testing Library, fishery y los dos proyectos de Vitest ya existen. Si no, F7 pide el permiso (FR-003).
- **F5-S1:** F5 conserva `window.TallerSystems` con sus nueve métodos: `refresh`, `missionIDs`, `returnURL`, `exerciseContextHTML` y el `sync` que lee el laboratorio hasta F7; el `sync` de `app.js` y `resetSimulations` hasta F8 o F10; e `init`, `mount` y `unmount` hasta F10. Así lo dice su borrador («El adaptador `window.TallerSystems` tras F5»). `lab-bridge-check` apunta a ese adaptador, con sus 10 escenarios de Sistemas como contrato de HTML hasta F7.
- **F5-S2:** el motor de Sistemas sigue dando el título, el núcleo y las herramientas de cada taller (`systemsEngine.get` y `list`, como hoy, y como los usa la página de F5 en su FR-018), así que la página del laboratorio no necesita el catálogo de talleres por `window`.
- **F5-S3:** el adaptador de Sistemas sigue leyendo el estado del laboratorio por `window.TallerLab` (por R4, como dice su borrador), y `window.TallerProjectKit` se queda. Por eso `TallerLab.getExercises` y `exportState` quedan hasta F10, que es cuando se irían igual por `app.js`.
- **F6-S1:** F6 publica `window.TallerCampaign` con exactamente siete métodos (`mount`, `unmount`, `refresh`, `sync`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML`) y retira `init` (su FR-033 y FR-034). F7 retira los tres últimos.
- **F6-S2:** F6 exporta de `entities/campaign` el tipo de misión («Entrenamiento», «Reparación · lings», «Kata» y «Desafío final»), importable sin evaluar el motor (su FR-029). Si no lo hace, F7 lo mueve desde el adaptador de campaña.
- **F6-S3:** F6 mueve las cuatro reglas de `.quest-direct-lock` al final de `lab.css` antes de borrar `campaign.css` (su FR-039, el plan de F2b y R10 de `css-contract`), así que F7 las mueve con `lab.css`.
- **El motor de campaña** sigue exponiendo `refreshFromLab`, `syncLab`, `getWorlds` y `canAttempt` desde el índice de su slice, como hoy.
- **La spec de A4 respondió su clarify el 2026-10-28** sin tocar F7-S1 a F7-S9. Su Q3 (la fila visible, la demora y la espera de turno) es lo que el canal ampliable de F7-Q2 le deja sumar sin cambiar la feature. Si su plan cambia un supuesto, la tabla de F7 se revisa en el plan de F7a.
- **El ADR 0006 sigue en propuesta.** F7 no depende de él: sólo conserva la forma v1 que D1 lee.

## Alternativas consideradas

| Decisión | Alternativas | Elegida y por qué |
| --- | --- | --- |
| Los exploradores | Portarlos antes, con una raíz de React dentro del `innerHTML` del laboratorio legacy; portarlos con el laboratorio | Con el laboratorio (hoja de ruta): una raíz anidada se pierde en cada redibujo |
| El cambio del editor | El `onChange` de React sobre el `textarea` oculto; un callback del hook | El callback (hoja de ruta): React probablemente no ve el `input` despachado por código, y el callback no depende de eso |
| La política de intentos | En el resultado del adaptador; declarada antes de ejecutar | Declarada antes: conserva que una cancelación cuente (F7-S4) |
| El bloqueo y el contexto | Seguir pidiendo HTML a los adaptadores; componerlos con los puentes de F2b | Los puentes: el HTML de los adaptadores es lo que la hoja de ruta borra |
| La sesión del laboratorio | Estado de React en la raíz; un módulo que sobrevive al desmontaje | El módulo: la raíz se crea en cada `mount`, y hoy la sesión sobrevive a la navegación (el mapa, §5) |
| Las hojas | Dejarlas en `frontend/`; podarlas; moverlas sin editarlas | Moverlas sin editarlas (D4) |
| Los selectores | Todo en `entities/exercise`; todo en `pages/lab/model` | Los del registro en la entidad y los del mapa en la página: ninguna capa nueva sin un consumidor real |
