# Feature Specification: F1 · Red de seguridad del port del front

**Feature Branch**: `003-f1-red-de-seguridad` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Clarificada (sesión del 2026-10-05); lista para el plan

**Input**: Ítem **F1** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Red de seguridad». Pedido del usuario del 2026-10-05: el camino «red y seams primero» (ver «Lo que pidió el usuario»). Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), aceptado el 2026-10-05.

## Intención y alcance

**Lo que entendemos.** Hoy una vista legacy se puede romper sin que falle ninguna prueba. Los checks de `qa/` cargan el código sobre un DOM falso; ninguno dibuja el laboratorio en modo ejercicio ni con `?campana` o `?sistema`, y nadie probó en un navegador qué pasa al recargar un enlace que cambia la query. El épico va a portar el front a React una vista por vez, y cada port tiene que demostrar que el alumno no nota el cambio. Antes de portar la primera, el taller necesita una red: pruebas de punta a punta, en un navegador real y contra el build actual, que fijen lo que hoy hacen los enlaces, las recargas, el arranque con progreso guardado y los puentes entre vistas; y dos pruebas de lógica para los dos riesgos altos del mapa. La red describe lo que hay, defectos incluidos, y no cambia código de producción. Es para quien porta vistas y para quien revisa los PR. Para el alumno no cambia nada. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el build actual servido, la red pasa en verde: las ocho vistas por hash y las seis formas de URL con query llevan adonde llevan hoy, y una prueba dice si cada enlace que cambia la query recarga el documento.
2. Un navegador con el progreso real de master arranca sin escribir, sin respaldar y sin avisar. Con el almacenamiento bloqueado, el taller arranca y muestra el aviso que muestra hoy.
3. Aprobar un ejercicio con el compilador simulado cambia lo que muestran campaña y Sistemas, y ninguna prueba toca los Playgrounds públicos.
4. Si se rompe a propósito un contrato (un adaptador sin `exerciseContextHTML`, una forma de URL que deja de leerse, un arranque que escribe en `localStorage`), la red falla: 3 de 3.
5. Las dos pruebas de Vitest pasan con el código de producción sin cambios, y F1 no toca ningún archivo de producción.

**Entra:** la adopción del ADR 0008 (Vitest en `node`, Playwright, los scripts de npm, el paso del job `front` y la documentación que cita los comandos); la red E2E con las ocho vistas por hash, las seis formas de URL con query, la recarga de los enlaces que cambian la query, el arranque con el progreso real de master y con el almacenamiento bloqueado, los puentes del laboratorio con campaña y Sistemas, y el ciclo entre vistas; los Page Objects de lo que esos escenarios tocan; los Playgrounds simulados; las dos pruebas de Vitest; y la protección del aspecto que F2 necesita, con estilo computado.

**Queda fuera:** cualquier cambio de código de producción, incluidos atributos de prueba y el callback del editor; los flujos de comportamiento de cada vista (Q1: los trae cada port); los seams de F2; el router (F10); las pantallas de acceso y `#invitacion=` (F11); un E2E contra el stack de Docker, la CSP y `/api/` (los cambian A3 y C4); Firefox y WebKit; la pila de DOM de Vitest (`jsdom` y Testing Library), que llega con la primera spec de componente, y `fishery`, con la primera factory.

**Sin hacer a propósito (YAGNI):** capturas de pantalla (el aspecto se protege con estilo computado); E2E con dos pestañas, porque la fusión entre pestañas ya la prueba `versioned-storage-check` y la cubre la primera prueba de Vitest; metas de cobertura; pruebas de accesibilidad con axe; MSW; un caché del navegador en la CI; retirar un check de `qa/` (cada port retira los suyos).

**Actores:** quien porta una vista (el usuario y los agentes que implementan), quien revisa un PR, el agente principal que integra `package.json` y la CI, y el alumno, que no debe notar nada.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una corrección del plan (Clarifications).

| Pedido | Fuente |
| --- | --- |
| Red y seams primero, el shell y el router al final con una sola raíz; A2 temprano; descartados el shell primero y la reescritura en paralelo | Usuario, 2026-10-05 |
| Es un port y no un rediseño: se conservan el aspecto, el comportamiento, el progreso, los IDs y las URLs | Usuario, 2026-10-05 (supuesto que no corrigió) |
| Antes de portar van los E2E con Playwright y Page Objects contra la versión actual | Usuario, 2026-10-05 (supuesto que no corrigió) |
| Las piezas nuevas llevan Vitest y Testing Library, más factories con fishery | Usuario, 2026-10-05 (supuesto que no corrigió) |
| El paso 0 se parte en dos ítems: la red (F1) y los seams (F2) | Hoja de ruta del front, recomendación del 2026-10-05 |
| La red cubre `?campana`, `?sistema` y `?ejercicio` y las recargas de los enlaces que cambian la query; Vitest cubre los dos riesgos altos del mapa; no cambia producción | Coordinador, 2026-10-05 |
| Playwright Test 1.63 con Page Objects por fixtures, sobre el build servido (`vite preview`), con los Playgrounds simulados con `page.route` y sólo el Chrome Headless Shell | ADR 0008, aceptado por el usuario el 2026-10-05 sin enmiendas |
| Cada descarga pide permiso con nombre, origen y tamaño | Hoja de ruta del backend, «Acciones del usuario» |
| F1 instala `vitest` y `@playwright/test` (19 paquetes de npm) y baja el Chrome Headless Shell con `--only-shell` | Usuario, 2026-10-05 (autorización de las descargas de F1) |
| F1 trae la infraestructura y los contratos transversales; cada port abre con los E2E de comportamiento de su vista | Usuario, clarify del 2026-10-05 (Q1) |
| El aspecto que F2 mueve entre hojas se protege con estilo computado en 981, 850, 650 y 590 px, sin capturas de pantalla | Usuario, clarify del 2026-10-05 (Q2) |
| Una excepción de la página o un error de consola hace fallar el test, salvo una lista blanca explícita | Usuario, clarify del 2026-10-05 (Q3) |
| Cuatro resultados del compilador armados a mano, para dos ejercicios | Usuario, clarify del 2026-10-05 (Q4) |
| Las dos pruebas de riesgo caracterizan lo actual en verde, y F2 las invierte | Usuario, clarify del 2026-10-05 (Q5) |
| La documentación va en español; el código y las pruebas, en inglés | `AGENTS.md` |

## Clarifications

### Session 2026-10-05

Las cinco respuestas son del usuario y eligieron la opción recomendada. Las opciones que no se eligieron están en «Alternativas consideradas».

- Q: **Q1**, ¿qué E2E de comportamiento por vista escribe F1 y cuáles escribe cada port? → A: F1 trae la infraestructura, los Page Objects del shell y de lo que usan los escenarios transversales (enlaces, recargas, arranque con progreso y puentes), y esos contratos transversales. Cada port abre con los E2E de comportamiento de su vista. Decidió el usuario. (FR-013)
- Q: **Q2**, ¿cómo se protege el aspecto mientras F2 mueve reglas de CSS entre hojas? → A: Con aserciones de estilo computado sobre las nueve reglas del mapa (§7), en 981, 850, 650 y 590 px y con el movimiento reducido apagado y encendido. Sin capturas de pantalla. Decidió el usuario. (FR-012, SC-008)
- Q: **Q3**, ¿qué hace la red con un error de página o de consola? → A: Una excepción de la página o un `console.error` hace fallar el test, en todos los escenarios, salvo lo que figure en una lista blanca explícita y comentada. Decidió el usuario. (FR-011)
- Q: **Q4**, ¿qué resultados del compilador simulan los E2E? → A: Cuatro armados a mano (aprobado, prueba fallida, error de compilación y error de transporte) para dos ejercicios, uno de Rust y uno de Go. El valor esperado sale del formato documentado del arnés y no de `buildProgram`. Decidió el usuario. (FR-009)
- Q: **Q5**, ¿cómo se escriben las dos pruebas de riesgo, si F1 no cambia producción? → A: Caracterizan el comportamiento actual, en verde y marcadas como defecto conocido. F2 las cambia a propósito en su commit TDD. Decidió el usuario. (FR-016, FR-017)

**Correcciones del plan.** Al planificar se midió el build actual en una copia aparte del repositorio, sin tocarlo y sin descargar nada (ver `research.md`, «Cómo se verificó»). Esas mediciones, y la lectura del código, corrigen o precisan afirmaciones de esta spec y confirman una. No son decisiones del usuario: son errores de la spec que el plan corrige, y cada una ya está aplicada en el texto de abajo.

- **US1, escenario 1:** el enlace «Laboratorio» del menú cambia la query (`?#laboratorio`) y recarga el documento. Sólo los siete enlaces de hash del menú no recargan. (FR-002, FR-004)
- **US1, escenario 4:** con `campana` y `sistema` juntos, gana Sistemas sólo si el ejercicio es misión de ese mundo y herramienta de ese taller. Si no es misión de ese mundo, el bloqueo de campaña se evalúa primero y reemplaza al laboratorio: defecto conocido. (FR-005, FR-014)
- **US2, escenario 2:** un checkpoint de campaña no se puede responder desde un navegador vacío, porque se abre al verificar las seis misiones del mundo. La prueba siembra sólo el almacén del laboratorio con las misiones resueltas del fixture congelado. (FR-008)
- **US6, escenario 1:** los anchos son 981, 850, 650 y 590 px, los que cambian el diseño. El borrador decía 1 200. (FR-012)
- **FR-007:** con el almacenamiento bloqueado el acceso mismo lanza, así que «no escribe» no es observable. La prueba comprueba que el taller arranca sin una excepción de la página y muestra lo que muestra hoy.
- **FR-009:** el formato del marcador, `__TALLER_TEST__<id>:<PASS|FAIL>`, está en el ADR 0003 (punto 7) y en `qa/exercise-evidence-check.ts`. El ADR 0005, §5, describe el formato futuro del servidor, con nonce, que es de A4.
- **SC-008:** la regla del último enlace de la navegación (`.navigation a:last-child { grid-column: auto }`) es código muerto: repite el valor inicial y ninguna regla le da otra columna. Borrarla no cambia nada visible, así que sólo un cambio de su valor puede hacer fallar la prueba.
- **FR-012, SC-008 y US6, escenario 1:** el mapa (§7) omite una regla que cruza hojas, `.quest-direct-lock`. `campaign.css` la define y el laboratorio la dibuja (`lockedExerciseHTML` reemplaza el host cuando una misión no está abierta), así que F6 puede borrar `campaign.css` antes de que F7 retire ese bloque sin que nada lo note. La protección suma una décima regla, medida en el laboratorio con una misión que no está abierta. Q2 no cambia: la respuesta fija el criterio (estilo computado sobre las reglas que cruzan hojas) y el plan lo aplica también a ésta. El plan completa además el grupo de la navegación con `.navigation .nav-symbol` (`font-size` de 14 px a 590 px, en `lab.css`): está en el mismo bloque que las demás y no se medía.
- **FR-023:** la documentación del ADR 0008 se registró al aceptarlo; F1 reemplaza el aviso «hasta que se integre, no existen» de `AGENTS.md` y de `qa/AGENTS.md` por los comandos reales.
- **FR-004:** la suposición de la hoja de ruta se confirmó al planificar: los 11 enlaces que cambian la query recargan el documento. F1 la deja fijada como prueba.
- **Hallazgos nuevos que la red fija como defecto conocido:** el bloqueo de campaña que gana sobre el contexto de Sistemas (arriba) y `aria-pressed` en `<body>`, porque `app.js` marca todo `[data-language]` y el `body` lo tiene. (FR-014)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Los enlaces y las recargas se comportan igual hoy y después del port (Priority: P1)

Un alumno abre un enlace guardado, uno de la campaña o uno del Atlas, y el taller lo lleva al mismo lugar que hoy: la misma vista, el mismo idioma, el mismo ejercicio y el mismo bloque de contexto. Cuando usa un enlace que cambia la query, el taller hace lo que hoy hace con el documento, y la prueba lo fija.

**Why this priority**: es el contrato de URL que documenta el README y que A2, A3 y el router de F10 tienen que respetar. Hoy no lo cubre ninguna prueba, y el supuesto de que esos enlaces recargan el documento no tenía prueba en el repositorio (mapa, §4): al planificar se midió en una copia aparte y se confirmó, y F1 lo deja como prueba.

**Independent Test**: con el build servido, abrir cada forma de URL en un contexto vacío y comprobar la vista, el idioma y lo que dibuja; después usar cada enlace que cambia la query y comprobar si el documento se recargó.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío, **cuando** se abre cada una de las ocho vistas por hash (`#recorrido`, `#biblioteca`, `#proyecto`, `#metodo`, `#atlas`, `#campana`, `#sistemas` y `#laboratorio`), **entonces** se muestra su página, su entrada del menú queda con `aria-current`, y ir de una a otra por los siete enlaces de hash del menú no recarga el documento (el enlace «Laboratorio» cambia la query y recarga: escenario 6).
2. **Dado** `?ejercicio=<id>&paso=<fase>#laboratorio` con el ID de un ejercicio de Rust y después el de uno de Go, **cuando** carga, **entonces** el laboratorio abre ese ejercicio en esa fase y el idioma pasa al del ejercicio.
3. **Dado** `?campana=<mundo>&ejercicio=<id>&paso=learn#laboratorio` con una misión habilitada, **cuando** carga, **entonces** el laboratorio muestra el bloque de contexto de campaña y el enlace de regreso a `?mundo=<mundo>#campana`. Con una misión que todavía no está habilitada, el bloqueo de campaña reemplaza al laboratorio.
4. **Dado** `?sistema=<taller>&ejercicio=<id>&paso=code#laboratorio`, **cuando** carga, **entonces** el laboratorio muestra el contexto de Sistemas y su enlace de regreso. Si vinieran `campana` y `sistema` juntos con un ejercicio que es misión de ese mundo y herramienta de ese taller, gana el contexto de Sistemas; si el ejercicio no es misión de ese mundo, el bloqueo de campaña va primero y reemplaza al laboratorio (defecto conocido).
5. **Dado** `?mundo=<mundo>#campana` y `?lenguaje=<idioma>&taller=<taller>&parte=<parte>#sistemas`, **cuando** cargan, **entonces** campaña abre ese mundo, y Sistemas abre ese taller, en esa parte y en ese idioma.
6. **Dado** cada enlace que cambia la query (el «Laboratorio» del menú, el «laboratorio libre» y las misiones de la campaña, los enlaces de regreso del bloque de contexto y del bloqueo, «Entrar al IDE» de Sistemas, el enlace del Atlas y los botones «Volver» del laboratorio), **cuando** el alumno lo usa, **entonces** la prueba registra si el documento se recargó (un marcador puesto en `window` desaparece) y qué estado en memoria se pierde, incluido el contexto de campaña o de Sistemas del laboratorio, el temporizador, la sesión del Atlas y las simulaciones de Sistemas, que sí se conservan en una navegación sólo de hash. El mapa supone que recargan (§4); al planificar se midió que los 11 recargan, y la red lo deja fijado.
7. **Dado** un concepto del Atlas, **cuando** el alumno sigue su enlace al laboratorio, **entonces** llega a `?ejercicio=<labId>&paso=learn#laboratorio`.
8. **Dado** un cambio de idioma en cada vista, **cuando** el alumno lo hace, **entonces** el taller escribe `lenguaje` en la URL o vacía la query, como hoy.

*Cubre: FR-001 a FR-005, FR-010, FR-013 a FR-015; SC-001 y SC-002.*

---

### User Story 2 - El progreso guardado arranca intacto y sobrevive a recargar (Priority: P1)

Un alumno que ya tiene progreso en su navegador abre el taller y no pasa nada: el taller no escribe, no hace copias de respaldo y no avisa. Lo que hizo antes de recargar lo encuentra después. Si el navegador bloquea el almacenamiento, el taller arranca igual y muestra lo que muestra hoy.

**Why this priority**: es el contrato del ADR 0003 y de las fixtures congeladas de master, y F2 mueve los cuatro almacenes. El oráculo es independiente del código: son archivos de progreso real que nadie edita.

**Independent Test**: sembrar `localStorage` con `qa/fixtures/progress-master-2a278ad-storage.json` antes de cargar la página, arrancar, recorrer las ocho vistas y comparar el texto de las cuatro claves.

**Acceptance Scenarios**:

1. **Dado** `localStorage` sembrado con las cuatro claves del progreso real de master, **cuando** arranca el taller y se recorren las ocho vistas, **entonces** el texto de las cuatro claves no cambia, no aparece ninguna clave `:respaldo` y no hay avisos.
2. **Dado** un navegador vacío, **cuando** el alumno hace una acción en el recorrido (un paso), en el laboratorio (código) y en Sistemas (una observación y una nota) y recarga la página, **entonces** las tres siguen ahí. Y **dado** el laboratorio sembrado con las misiones del mundo 1 resueltas del fixture congelado, que es lo que abre el checkpoint, **cuando** el alumno responde el checkpoint de campaña y recarga, **entonces** la respuesta sigue ahí.
3. **Dado** un navegador donde acceder a `localStorage` lanza una excepción, **cuando** arranca el taller, **entonces** arranca igual, sin una excepción de la página, y muestra lo que muestra hoy: el aviso «No se pudo leer o guardar el avance. Podés exportarlo al terminar.» (`loadNoticeFor` de `app.js`, que sale en el toast de arranque) y el pie «Exportá para conservar tu avance» (`updateSaveLabel`).

*Cubre: FR-007, FR-008 y FR-014; SC-003.*

---

### User Story 3 - El ciclo entre vistas funciona con el compilador simulado (Priority: P1)

Un alumno aprueba un ejercicio de una misión o de un taller y, al volver a campaña o a Sistemas, ve el avance. Si el compilador falla, no se marca nada. En las pruebas, el código del alumno no sale a Internet.

**Why this priority**: el laboratorio llama a campaña y a Sistemas para refrescar y sincronizar sus sellos (`refresh` y `sync`), y F2 vuelve esos puentes datos puros. Sin esta prueba, nadie sabe si el refactor rompió el ciclo (mapa, §3.2 y §10).

**Independent Test**: con los Playgrounds simulados, ejecutar un ejercicio de una misión habilitada y otro núcleo de un taller con cada resultado simulado, y volver a campaña y a Sistemas.

**Acceptance Scenarios**:

1. **Dado** un ejercicio de una misión habilitada, **cuando** el alumno ejecuta código y el Playground simulado responde un resultado aprobado, **entonces** el laboratorio lo marca resuelto con pruebas y, al volver al mundo, campaña lo cuenta.
2. **Dado** el mismo ejercicio, **cuando** el resultado simulado es una prueba fallida, un error de compilación o un error de transporte, **entonces** el laboratorio no lo marca resuelto e informa qué pasó.
3. **Dado** el ejercicio núcleo de un taller de Sistemas, **cuando** se aprueba, **entonces** el sello de código del taller aparece al volver a Sistemas.
4. **Dado** cualquier escenario, **cuando** la página intenta un pedido a un host que no sea el del servidor de pruebas y no tiene respuesta simulada, **entonces** el test falla.

*Cubre: FR-006, FR-009, FR-011 y FR-014; SC-004.*

---

### User Story 4 - Los dos riesgos altos del mapa tienen prueba (Priority: P1)

Quien porta una vista sabe qué dos cosas no puede romper sin que nadie se entere: abrir dos veces el mismo almacén en un documento y usar un motor antes de `init`.

**Why this priority**: son los dos hallazgos de severidad alta del mapa (§12), ambos verificados. Una página React que abre su propia instancia hace reaparecer un favorito que el alumno quitó, y un `init` movido a un effect hace que campaña lance y Sistemas quede vacío sin error.

**Independent Test**: correr las dos pruebas de Vitest con el código de producción sin cambios.

**Acceptance Scenarios**:

1. **Dado** un almacenamiento en memoria compartido, **cuando** se abren dos instancias del almacén del recorrido, la primera quita un favorito y completa un paso, y la segunda, que no lo sabe, guarda una nota, **entonces** el favorito reaparece y el paso sobrevive: la segunda instancia se comporta como otra pestaña y la fusión une los conjuntos. La prueba está marcada como defecto conocido.
2. **Dado** el motor de campaña sin `init`, **cuando** se usa `getWorlds`, `refreshFromLab` o `canAttempt`, **entonces** lanza «Inicializá la campaña antes de usarla.». El motor de Sistemas, sin `init`, devuelve `[]` sin error.
3. **Dado** el código de producción sin cambios, **cuando** corren las dos pruebas, **entonces** pasan, y cada una está marcada como defecto conocido y cita su referencia al mapa.

*Cubre: FR-016 a FR-018; SC-005.*

---

### User Story 5 - Quien porta corre la red con un comando, y la CI la corre en cada PR (Priority: P1)

Quien porta una vista corre la red en su máquina con un comando y ve el mismo resultado que la CI. Una red que falla por azar contamina todos los ports, así que tiene que ser estable.

**Why this priority**: sin esto, la red no sirve como criterio de aceptación de cada port (hoja de ruta, «Criterios de aceptación globales»).

**Independent Test**: construir, correr `npm run test:e2e` y abrir un PR de prueba para ver el job `front`.

**Acceptance Scenarios**:

1. **Dado** un build existente, **cuando** se corre `npm run test:e2e`, **entonces** la red corre contra ese build en un navegador real y termina en verde.
2. **Dado** que no hay build, **cuando** se corre, **entonces** falla con un mensaje que manda a correr `npm run build`.
3. **Dado** un PR, **cuando** corre la CI, **entonces** el job `front` instala el navegador, corre la red y, si falla, sube el informe y los resultados.
4. **Dada** la red en verde, **cuando** se rompe a propósito cada uno de los tres contratos de «Cómo sabremos que salió bien» (en una rama descartable), **entonces** la red falla en los tres.
5. **Dada** la red completa, **cuando** se corre cinco veces seguidas sin reintentos, **entonces** pasa las cinco.

*Cubre: FR-001, FR-019 a FR-024; SC-006, SC-007 y SC-009.*

---

### User Story 6 - El aspecto que F2 mueve entre hojas queda protegido (Priority: P2)

Quien mueve reglas de CSS entre hojas, o borra una hoja al portar una vista, sabe si cambió algo que el alumno ve en el menú, en la barra lateral y en los bloques de contexto y de bloqueo del laboratorio.

**Why this priority**: es el único riesgo de F2 que ninguna prueba funcional detecta (mapa, §7 y §12), y vale también para quien borra una hoja: F6 borra `campaign.css` antes de que F7 retire el bloque de bloqueo del laboratorio. Es P2 porque protege a esos cambios, no al alumno directamente.

**Independent Test**: medir los estilos computados de esas reglas en 981, 850, 650 y 590 px, y con el movimiento reducido apagado y encendido, y compararlos con los valores que fija la prueba, que son los de las hojas de hoy.

**Acceptance Scenarios**:

1. **Dado** el build actual a 981, 850, 650 y 590 px de ancho, **cuando** se miden los estilos computados de las nueve reglas que el mapa (§7) lista como cruzadas entre hojas (el contador del menú del laboratorio, la navegación en 850 y 590 px, la barra lateral y su pie desde 981 px, el `touch-action` global, `.sr-only`, el banner de campaña, el bloque de contexto, el último enlace de la navegación en 650 y 590 px y el estado vacío de Sistemas) y de una décima que el mapa omite (el bloqueo de campaña que dibuja el laboratorio, `.quest-direct-lock`), **entonces** la prueba fija esos valores y falla si cambian. El último enlace de la navegación es código muerto (ver «Correcciones del plan»): su prueba falla si alguna regla le da otra columna, pero no si se borra la regla.
2. **Dado** el movimiento reducido, **cuando** se carga el taller, **entonces** las transiciones, el desplazamiento suave y la animación del indicador de ejecución están apagados, y sin él están encendidos, como hoy.

*Cubre: FR-012; SC-008.*

---

### Edge Cases

- **ID inexistente o fase inválida:** `?ejercicio=<id que no existe>` o `?paso=<fase que no existe>`. La red fija lo que hace hoy el laboratorio.
- **Query sin ejercicio:** `?campana=<mundo>` o `?sistema=<taller>` sin `ejercicio`. Se fija lo que pasa hoy.
- **Idioma que manda la URL:** un `?ejercicio=go-…` fija el idioma Go aunque el progreso guardado diga Rust (`syncLinkedLanguage`).
- **Historial:** los enlaces con `#` agregan entradas al historial y las escrituras de la query usan `history.replaceState`. La red fija cuántas entradas agrega cada navegación y qué hace «Atrás».
- **Reloj:** el temporizador de 500 ms y los vencimientos de repaso dependen de la hora. Las pruebas que los usan controlan el reloj.
- **Un hash desconocido,** como `#invitacion=<token>`: hoy cae en `#recorrido` y el token queda en la URL. La red no lo cubre: es contrato futuro de F11.
- **Defectos que la red encuentre,** además de los del mapa: se caracterizan como están y se marcan, con su referencia. F1 no los corrige.
- **El editor y los diálogos nativos** (CodeMirror y `<dialog>`) se ejercen en el navegador real, pero sus flujos completos se caracterizan en el port que los toca (F7, F8 y F9).

## Requirements *(mandatory)*

### Functional Requirements

**Red E2E**

- **FR-001**: La red DEBE correr contra el build que genera Vite (`dist/index.html`), servido con `vite preview`, en un navegador real (el Chrome Headless Shell), sin Nginx y sin API. *(ADR 0008)*
- **FR-002**: DEBE cubrir las ocho vistas por hash: cada una se abre desde un contexto vacío y desde el menú, e ir de una a otra por los siete enlaces de hash del menú no recarga el documento. El enlace «Laboratorio» cambia la query y se cubre con FR-004.
- **FR-003**: DEBE cubrir cada forma de URL con query que lista el mapa (§4): `?ejercicio=&paso=#laboratorio`, `?campana=&ejercicio=&paso=#laboratorio`, `?sistema=&ejercicio=&paso=#laboratorio`, `?mundo=#campana`, `?lenguaje=&taller=&parte=#sistemas` y `?#laboratorio`. Comprueba lo que cada vista lee de la URL (vista, idioma, ejercicio, fase, mundo, taller y parte) y lo que escribe. Los valores válidos salen de `qa/fixtures/curriculum-ids.json`.
- **FR-004**: Para cada enlace que cambia la query, la red DEBE detectar si el documento se recargó de verdad y no sólo si cambió la URL, y qué estado se pierde: el temporizador, la sesión del Atlas y las simulaciones de Sistemas. Lo observado queda fijado como comportamiento actual. Si cambia respecto del supuesto de la hoja de ruta (que recargan), se avisa al usuario antes de seguir, porque cambia el diseño del router de F10. Al planificar se midió que los 11 enlaces recargan.
- **FR-005**: DEBE cubrir los puentes del laboratorio con campaña y Sistemas que ningún check dibuja: el bloque de contexto (`.quest-lab-context`), el bloqueo de campaña (`.quest-direct-lock`), el enlace de regreso, la lista navegable y la prioridad de Sistemas sobre campaña, que vale cuando el ejercicio es de los dos y no cuando el bloqueo de campaña lo reemplaza.
- **FR-006**: DEBE cubrir el ciclo entre vistas: aprobar un ejercicio con el compilador simulado cambia lo que muestran campaña y Sistemas, y un resultado que no aprueba no cambia nada.
- **FR-007**: DEBE arrancar con el progreso real de master (`qa/fixtures/progress-master-2a278ad-storage.json`, sembrado en `localStorage` antes de cargar la página) y comprobar que el arranque no escribe, no respalda y no avisa. Con el almacenamiento bloqueado (el acceso a `localStorage` lanza), DEBE comprobar que el taller arranca sin una excepción de la página y muestra el aviso de arranque y el pie del shell que muestra hoy (US2, escenario 3). Que no escribe lo garantiza el acceso que lanza: no hace falta observarlo.
- **FR-008**: DEBE comprobar que una acción en cada uno de los cuatro almacenes (recorrido, laboratorio, campaña y Sistemas) sobrevive a una recarga completa. El checkpoint de campaña sólo se puede responder con las misiones del mundo resueltas, así que esa prueba siembra el almacén del laboratorio con las del fixture congelado.
- **FR-009**: Los Playgrounds (`https://play.rust-lang.org/execute` y `https://play.golang.org/compile`) DEBEN simularse en el navegador con cuatro resultados armados a mano (aprobado, prueba fallida, error de compilación y error de transporte) para dos ejercicios, uno de Rust y uno de Go. El valor esperado sale del formato del marcador, `__TALLER_TEST__<id>:<PASS|FAIL>` (ADR 0003, punto 7, y `qa/exercise-evidence-check.ts`), no de `buildProgram`. Cualquier otro pedido a un host que no sea el del servidor de pruebas DEBE hacer fallar el test: ninguna prueba toca los servicios públicos.
- **FR-010**: DEBEN existir un Page Object para el shell y uno por cada vista que tocan los escenarios (el laboratorio, campaña, Sistemas y el Atlas), entregados por fixtures; los demás nacen con su port (Q1). Los localizadores salen del nombre accesible (rol, etiqueta y texto), no de atributos que haya que agregar a producción. *(ADR 0008)*
- **FR-011**: Una excepción de la página o un error de consola DEBE hacer fallar el test, en todos los escenarios, salvo lo que figure en una lista blanca explícita y comentada, o que el propio test espere con su motivo. Las guardas de la red (esta y la de FR-009) tienen una prueba propia que falla si dejan de actuar.
- **FR-012**: El aspecto que F2 mueve entre hojas de estilo DEBE tener una protección automática: aserciones de estilo computado sobre las nueve reglas que el mapa (§7) lista como cruzadas y sobre una décima que el mapa omite (`.quest-direct-lock`, el bloqueo de campaña dentro del laboratorio), en 981, 850, 650 y 590 px y con el movimiento reducido apagado y encendido. Sin capturas de pantalla.
- **FR-013**: Los flujos de comportamiento de cada vista, más allá de los escenarios de esta spec, quedan fuera de F1: F1 trae la infraestructura y los contratos transversales, y cada port abre con los E2E de comportamiento de su vista.
- **FR-014**: Lo que la red observe y no sea deseable DEBE caracterizarse como está y marcarse como defecto conocido (`KNOWN DEFECT` en el nombre de la prueba), con su referencia al mapa o al hallazgo de F1. F1 no corrige nada.
- **FR-015**: Los valores esperados DEBEN salir del contrato (el README y el mapa para las URL), de las fixtures congeladas o de un ejemplo resuelto aparte, nunca de recalcularlos con el código que se prueba (constitución, principio II). Las pruebas que dependen de la hora DEBEN controlar el reloj.

**Vitest**

- **FR-016**: Una prueba de Vitest DEBE fijar que dos instancias de `openVersionedStore` con la clave `taller-learning-v1`, sobre un `StorageLike` compartido y con la fusión real del recorrido (`mergeRouteProgress`), se comportan como dos pestañas: un favorito que la primera quitó reaparece cuando la segunda guarda otro cambio, y lo que la primera agregó sobrevive. La prueba caracteriza lo actual, en verde y marcada como defecto conocido (Q5); F2 la cambia a propósito en su commit TDD. El valor esperado sale del caso que el mapa verificó (§5 y §12), no del algoritmo de fusión.
- **FR-017**: Una prueba de Vitest DEBE fijar que el motor de campaña lanza «Inicializá la campaña antes de usarla.» al usar `getWorlds`, `refreshFromLab` o `canAttempt` antes de `init`, y que el de Sistemas devuelve `[]` sin error. Como la anterior, caracteriza lo actual, en verde y marcada como defecto conocido (Q5).
- **FR-018**: Las dos pruebas DEBEN pasar con el código de producción sin cambios.

**Entrega**

- **FR-019**: `npm run test:e2e` DEBE correr toda la red contra un build existente y fallar con un mensaje claro si falta `dist/index.html`.
- **FR-020**: `npm test` DEBE correr las specs de Vitest además de los checks de `qa/`. La red E2E NO forma parte de `npm test`. *(ADR 0008)*
- **FR-021**: El job `front` de la CI DEBE correr la red con el navegador instalado en el mismo job, y subir el informe y los resultados si falla. *(ADR 0008)*
- **FR-022**: F1 NO DEBE cambiar archivos de producción: ni `frontend/*.js` ni las hojas de estilo, ni `frontend/src/` fuera de las specs de Vitest y su setup, ni `content/`, ni Docker. Sólo suma `qa/`, configuración, `package.json` con su lockfile, el workflow de la CI y la documentación.
- **FR-023**: La documentación del ADR 0008 se registró al aceptarlo (`AGENTS.md`, `qa/AGENTS.md`, el «Alcance» de `docs/agent-skills.md` y, como PATCH, el principio II de la constitución). F1 DEBE reemplazar el aviso «hasta que se integre, no existen» de `AGENTS.md` y de `qa/AGENTS.md` por los comandos reales, en el mismo cambio que los trae.
- **FR-024**: Cada paquete y cada descarga DEBEN tener el permiso del usuario antes de instalarse (hoja de ruta, «Acciones del usuario»). F1 instala sólo `vitest`, `@playwright/test` y el navegador con `--only-shell chromium`.

### Key Entities *(include if feature involves data)*

- **Escenario E2E:** un recorrido de un alumno sobre el build actual, en un navegador real y desde un contexto sin datos o sembrado con progreso.
- **Page Object:** la clase que expresa una vista o el shell con intención de alumno (`openFromMenu`, `runCode`) y localizadores por nombre accesible.
- **Contrato de URL:** las ocho vistas por hash y las seis formas de URL con query que el taller escribe y lee hoy (mapa, §4).
- **Fixture de progreso congelada:** los archivos de `qa/fixtures/progress-*.json`, progreso real generado por master. No se regeneran ni se editan.
- **Doble del compilador:** la respuesta simulada de un Playground, con la forma que interpreta el laboratorio.
- **Defecto conocido:** un comportamiento no deseado que la red fija tal cual y marca, para que quien lo corrija cambie su escenario a propósito.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 8 vistas por hash y las 6 formas de URL con query tienen un escenario en verde sobre el build actual: 14 de 14 cubiertas, 0 fallas.
- **SC-002**: Para cada uno de los 11 enlaces que cambian la query, la red distingue si el documento se recargó: 0 enlaces con el resultado sin determinar.
- **SC-003**: El arranque con las fixtures de master deja el texto de las cuatro claves de `localStorage` idéntico, sin claves `:respaldo` y sin avisos: 0 diferencias.
- **SC-004**: La red no hace ningún pedido real a `play.rust-lang.org` ni a `play.golang.org`: 0 pedidos.
- **SC-005**: Las dos pruebas de Vitest pasan con el código de producción sin cambios, y el diff de F1 no toca ningún archivo de producción: 0 archivos.
- **SC-006**: Con tres roturas deliberadas, una por contrato (un adaptador sin `exerciseContextHTML`, una forma de URL que deja de leerse y un arranque que escribe en `localStorage`), hechas en una rama descartable, la red falla: 3 de 3 detectadas.
- **SC-007**: La red completa pasa 5 corridas seguidas con 0 reintentos. El tiempo de la suite y el del paso de instalación del navegador se miden y se registran en la hoja de ruta; no hay tope hasta medirlos.
- **SC-008**: Las 10 reglas de CSS que cruzan hojas (las 9 que el mapa (§7) lista y `.quest-direct-lock`, que omite) tienen una prueba que falla si cambia su valor: 10 de 10. La del último enlace de la navegación es código muerto, así que su prueba no falla si se borra la regla.
- **SC-009**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan en local y en la CI, y la imagen web sigue construyendo.

## Riesgos

1. **La recarga supuesta.** La hoja de ruta supone que un enlace que cambia la query recarga el documento. Al planificar se confirmó (11 de 11); si un cambio posterior lo altera, cambia el diseño del router de F10. *Mitigación:* FR-004 lo deja como prueba.
2. **Pruebas inestables.** El temporizador de 500 ms, la creación asíncrona de CodeMirror y las animaciones pueden hacer fallar la red por azar, y una red inestable contamina todos los ports. *Mitigación:* el reloj controlado, las esperas por aserción y no por tiempo, el movimiento reducido y las cinco corridas seguidas de SC-007.
3. **Acople al texto en español.** Los localizadores usan nombres accesibles en español. Si un port cambia un texto, la red falla, y eso es lo que se busca: el port conserva el texto. Un cambio deliberado de copy se corrige en el Page Object, no en la spec.
4. **`vite preview` no es Nginx.** La red no ejerce la CSP ni `/api/`. *Mitigación:* un humo contra el stack espera a A3 y a C4, que cambian ese contrato (ADR 0008).
5. **Costo de la CI.** Cada corrida baja 122,2 MB de navegador y, con `--with-deps`, paquetes de sistema. El tiempo no se midió. *Mitigación:* SC-007 lo registra; sin caché del navegador, por lo que dice la documentación oficial (ADR 0008).
6. **Un solo navegador.** El Chrome Headless Shell cubre Blink y no Firefox ni Safari.
7. **El tamaño de F1.** Con Q1 en A, F1 queda acotada a la infraestructura y los contratos transversales: unas 106 pruebas de punta a punta y dos de Vitest.
8. **Lo que la red no ve.** Los flujos completos del editor, de los diálogos y de Método quedan para los ports que los tocan, con la regla «E2E primero» de la hoja de ruta.
9. **El ingreso (evolución prevista, no es trabajo de F1).** Los E2E arrancan hoy sin sesión. Cuando C3a y A3 dejen el contenido detrás de la sesión, los que parten del progreso de master tendrán que pasar por el ingreso (la pantalla de F11 o una fixture de sesión). La red arma cada arranque en un solo lugar para que ese cambio no toque cada escenario.

## Assumptions

- El ADR 0008 está aceptado (usuario, 2026-10-05, sin enmiendas) y esta spec lo usa como base. Donde la medición del plan lo precisa, el plan lo dice en una sección aparte y la implementación lo enmienda.
- El front legacy es el de `master` (`ca9e619`) con el [mapa](../front-react/legacy-map.md) como descripción: sus hallazgos marcados como verificados no se vuelven a verificar, salvo lo que la red prueba.
- Los IDs de ejercicio, mundo y taller que usan los escenarios salen de `qa/fixtures/curriculum-ids.json` (por ejemplo `rust-world-1`, `cache` y `rust-113`).
- Los escenarios arrancan desde un contexto vacío, salvo los que siembran progreso con las fixtures congeladas.
- La prueba del primer riesgo usa un `parse` propio de la prueba, porque `parseProgress` vive hoy dentro de `app.js` y no se puede importar sin cambiar producción. Sí importa `openVersionedStore` y `mergeRouteProgress`, que ya son módulos.
- La fusión entre pestañas ya la prueba `versioned-storage-check` (Node) y la reproduce la primera prueba de Vitest. Un E2E con dos pestañas no agrega un riesgo nuevo.
- Los defectos conocidos del mapa que F1 no ve, como el `solvedAt` importado sin evidencia, se caracterizan en el port que los decide (F7).
- Con Q1 en A, los Page Objects de F1 son los del shell y los de lo que tocan los escenarios transversales: el laboratorio, campaña, Sistemas y el Atlas. Los demás nacen con su port.
- Los ejercicios de los escenarios son `rust-02` (misión de `rust-world-1`, en Rust) y `go-113` (núcleo del taller `cache`, en Go): los dos con tres pruebas, `t1`, `t2` y `t3`.
- Las descargas de F1 las hace el coordinador, en la primera tarea del plan, con el permiso del usuario del 2026-10-05.
- Dependencias: ninguna del backend. F2 depende de esta feature, y A2 de F2.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las cinco primeras filas son las opciones de las preguntas del clarify; la elegida fue la A en todas, por el usuario.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Alcance de los E2E por vista (Q1) | B: todas las acciones de las ocho vistas; C: sólo la infraestructura y los enlaces, y el arranque con progreso y los puentes pasan a F2 | A: F1 trae la infraestructura y los contratos transversales. B vuelve a F1 una revisión larga que protege vistas que no se portan hasta dentro de meses; C deja a F2 tocar almacenes y puentes sin la red que más los protege |
| Protección del aspecto (Q2) | B: capturas de pantalla (`toHaveScreenshot`) de las ocho vistas en dos anchos; C: revisión manual | A: estilo computado. B depende del sistema operativo y de las fuentes, sólo corre en la CI de Linux y pesa en el repo; C deja a F2 mover CSS sin red |
| Errores de página y de consola (Q3) | B: sólo fallan los escenarios de arranque y de enlaces; C: se registran y no fallan | A: fallan todos, con lista blanca. B deja pasar los errores de las demás vistas; C no detecta nada |
| Resultados del compilador (Q4) | B: derivados de `buildProgram` y de las soluciones de referencia, para todos los ejercicios; C: ninguno | A: cuatro armados a mano, para dos ejercicios. B toma el valor esperado del código que se prueba y es lento; C no prueba el camino de aprobación |
| Escritura de las pruebas de riesgo (Q5) | B: piden lo deseado y quedan marcadas con `test.fails` hasta F2; C: dos pruebas por riesgo | A: caracterizan lo actual, en verde. B engaña si pasa por otra razón; C duplica las pruebas |
| Dónde corre la red | `vite dev`; el build servido con `vite preview`; el stack de Docker | El build servido (ADR 0008): es el documento que sirve Nginx, y la CI del front no necesita Docker. Un humo contra el stack espera a A3 y a C4 |
| Cuándo se escriben los E2E de cada vista | Después de portarla; antes, contra el legacy | Antes (usuario): después, un E2E sólo confirma lo que el port ya hizo |
| Cómo se siembra el progreso | Manejando la interfaz; escribiendo `localStorage` antes de cargar | Escribiendo `localStorage` antes de cargar, con las fixtures congeladas: es rápido y el oráculo no pasa por el código que se prueba |
| Cómo se sabe si hubo recarga | Mirar sólo la URL; un marcador en `window` que desaparece al recargar | El marcador: un cambio de URL no prueba que el documento se recargó, y eso es lo que el mapa no verificó |
| Quién prueba los riesgos altos | Un E2E; Vitest sobre los módulos | Vitest: la segunda instancia y el `init` ausente son lógica de módulos, sin DOM, y corren en milisegundos |
