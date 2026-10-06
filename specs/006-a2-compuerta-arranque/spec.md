# Feature Specification: A2 · Compuerta de arranque

**Feature Branch**: `006-a2-compuerta-arranque` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Clarificada y planificada el 2026-10-05: el usuario respondió Q1 a Q5, y el plan, las tareas y el análisis están hechos. El 2026-10-06 aceptó las tres decisiones de diseño que el plan dejaba abiertas (Q6 a Q8). Sin implementar

**Input**: Ítem **A2** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Compuerta de arranque»: que el front espere el contenido antes de evaluar las vistas legacy y que el HTML deje de embeberlo. Depende de A1, entregado, y, por decisión del usuario del 2026-10-05, de F1 (la red de pruebas del front) y de las unidades 1 a 4 de F2 (almacenes y motores singleton, catálogo, arranque explícito y registro de modelos), ítems del épico del front (`specs/front-react/roadmap.md`, en la rama del PR #16: se cita sin enlace hasta que se integre). La lectura real de la API es de A3. Pedido del usuario del 2026-10-05 (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Hoy el currículo viaja dentro de `dist/index.html`, y las vistas legacy lo leen de `window.*` en el instante en que se evalúan. Con el backend (ADR 0004 y 0006) el contenido va a venir de la API y el HTML va a dejar de llevarlo. Esta feature hace las dos cosas que tienen que existir antes y que no necesitan la API. Una es una compuerta en el arranque, que pide el contenido y recién después evalúa las vistas legacy, en el mismo orden de hoy. La otra es un HTML sin currículo, que recibe el contenido como un archivo aparte que sirve el mismo Nginx, hasta que A3 reemplace esa fuente por el protocolo de la API. Para el alumno no cambia nada cuando el contenido llega. Lo nuevo es lo que ve cuando no llega: un aviso con «Reintentar», en lugar de vistas armadas con catálogos vacíos que descartan su progreso. Es para quien mantiene el front y para A3. Por decisión del usuario, A2 corre después de F1 y de las unidades 1 a 4 de F2 (el épico del front): arranca sobre un arranque que F2 ya volvió explícito, y su verificación en un navegador real son los E2E de F1. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el contenido disponible, el alumno ve las mismas vistas con los mismos datos. Los catálogos que leen las vistas legacy son, byte a byte, los de hoy (el volcado de `dump-globals` no cambia), y los enlaces, el idioma y el progreso funcionan igual.
2. Si el contenido no llega, no se evalúa ninguna vista, no se toca el almacenamiento del progreso (ni escrituras, ni copias de respaldo, ni avisos de datos descartados) y el alumno ve un mensaje en español con «Reintentar».
3. `dist/index.html` ya no contiene el currículo, y un check falla si el contenido vuelve al HTML.
4. El contenido que recibe el navegador es el que genera el generador, y cada una de las 17 porciones tiene su huella, de modo que A3 cambia la fuente sin tocar la compuerta.
5. No se agrega ninguna dependencia, la suite pasa y los E2E de F1, con los escenarios que suma A2, confirman los flujos en un navegador real.

**Entra:** la compuerta en el arranque (`frontend/src/app/`) y la publicación de los mismos globals desde el contenido cargado; la fuente transitoria (Q1), un documento que sirve Nginx, con lo que hay que tocar para servirla (el build, `frontend/Dockerfile`, `docker/compose.preview.yaml` y el servidor de desarrollo); el retiro de los seis importadores estáticos del currículo, el Atlas incluido; los estados de espera y de error; la adaptación de los checks de `qa/` que hoy cargan los catálogos y de los oráculos (`dump-globals` idéntico y un check nuevo que reemplaza a `dump-dist-globals`); la documentación que llama «autónomo» al HTML; el spike, que es la primera tarea del plan; y los escenarios E2E de A2, dentro de la red de F1.

**Queda fuera:** la lectura real de la API (sesión, validadores por porción, comparación de `Content-Version`, reintento con tope, última copia y aviso sin backend), que es de A3; las pantallas de acceso e invitación (F11 del épico del front; C3 y A3 aportan la API y la sesión); el retiro de `vite-plugin-singlefile` y la CSP sin `'unsafe-inline'` (C4); portar vistas a React y cambiar el código de las seis vistas legacy (el épico del front); el generador y el contenido; los conteos fijos del menú, que duplican el currículo (E1 o el port); un Service Worker y el modo sin conexión para una carga nueva.

**Sin hacer a propósito (YAGNI):** reintentos automáticos; guardar una copia local del contenido; un router, un store o cualquier dependencia nueva; verificar hashes en el navegador; partir el documento en 17 archivos; minificarlo; una salida autónoma opcional con el contenido embebido; una lista manual de verificación en un navegador, que reemplazan los E2E de F1.

**Actores:** el alumno (ve la espera y el error), quien opera el taller (despliega la imagen y la vista previa), quien mantiene el front (el port y A3) y los checks de `qa/`.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o lo decidió el clarify (Clarifications). Las rutas del épico del front que llevan «PR #16» existen en la rama de ese PR y no en esta: se citan sin enlace hasta que se integre.

| Pedido | Fuente |
| --- | --- |
| El front espera el contenido antes de evaluar las vistas legacy y el HTML deja de embeberlo | Hoja de ruta, A2; [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md), §2 «Entrega» |
| Validar la técnica con un spike antes de comprometerla: espera de nivel superior e imports dinámicos ordenados, con `vite-plugin-singlefile` o con la salida estándar de Vite | ADR 0004, §2 «Entrega», «Riesgos conocidos» y fase 4; hoja de ruta, A2 |
| El diseño admite el protocolo por porciones; la lectura real de la API queda fuera | Hoja de ruta, alcance de A2 y de A3; [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md), §7 y §10 |
| El navegador lee el contenido de la API. Servirlo como archivos estáticos fue la alternativa recomendada y el usuario la descartó | Usuario, ADR 0004 (aprobado el 2026-10-04), «Contexto» y «Alternativas consideradas» |
| `dist/index.html` deja de ser un documento autónomo y no funciona con `file://` | ADR 0004, «Consecuencias» (sobre el [ADR 0001](../../docs/adr/0001-react-vite-y-backend-diferido.md)) |
| Los checks de TypeScript siguen sin necesitar Laravel y simulan la respuesta con el `curriculum.json` generado cuando arrancan la app en `node:vm` | ADR 0004, §5 |
| Portar el front legacy a React en este orden: primero la red y los seams, después las vistas una por una y al final el shell con una sola raíz. A2 va temprano, en un arranque de `frontend/src/app/` que después aloja el shell | Usuario, 2026-10-05 (el épico del front tiene su hoja de ruta, `specs/front-react/roadmap.md`, en la rama del PR #16) |
| Hasta C3 el contenido de C2 responde sin sesión, con el puerto sólo en `127.0.0.1` | Hoja de ruta, C2 y C3; ADR 0006, §7 |
| Hasta A3, el front lee un `curriculum.json` estático que sirve Nginx, sin reescribirlo; es un puente que A3 retira | Usuario, 2026-10-05 (Q1, opción A) |
| Si el contenido no llega, un mensaje en `#main` con «Reintentar» a mano y un tope de espera; no evalúa ni escribe nada | Usuario, 2026-10-05 (Q2, opción A) |
| Un check en `npm test` corre el bundle construido con un `fetch` simulado y exige globals iguales a los de `dump-globals`, bytes servidos iguales al `documentHash` y las 17 porciones con la huella de `portions` | Usuario, 2026-10-05 (Q3, opción A) |
| `vite-plugin-singlefile` se conserva hasta C4; `build-check` parsea como módulo, baja el tope a un valor medido, suma un oráculo de ausencia y exige el contenido junto al HTML | Usuario, 2026-10-05 (Q4, opción A) |
| La verificación en un navegador real la hacen los E2E de F1 (Playwright, ADR 0008); A2 suma sus escenarios y no hay lista manual | Usuario, 2026-10-05 (Q5, distinta de la recomendada) |
| El contenido servido lleva la versión en el nombre, `dist/content/curriculum.<versión>.json`, con los mismos bytes que genera `tools/content`, en lugar del `curriculum.json` literal de Q1 | Usuario, 2026-10-06 (Q6, opción del plan) |
| El build emite los dos avisos de licencia junto al HTML y al contenido, y `frontend/Dockerfile` copia `dist/` entero con una sola línea | Usuario, 2026-10-06 (Q7, opción del plan) |
| Los marcadores del oráculo de ausencia son los de `curriculumMarkers()` (`qa/lib/content-document.ts`): dos textos largos de una entrada y, si no es una palabra común del código, su ID | Usuario, 2026-10-06 (Q8, opción del plan) |
| A2 depende de F1 y de las unidades 1 a 4 de F2 (almacenes y motores singleton, catálogo, arranque explícito y registro de modelos) | Usuario, 2026-10-05 |
| `main.tsx` pasa de una lista de imports a una secuencia de etapas, y `load-order-check` lee esa secuencia | Propuesta de A2, aceptada por el coordinador el 2026-10-05 |
| Las pantallas de acceso (F11) entran como una etapa previa de esa secuencia y borran `#invitacion=` de la URL | Épico del front, `specs/front-react/roadmap.md` (PR #16) |
| El épico del front no planifica un segundo cargador de contenido: el acceso tipado y la carga asíncrona son de A2 | Coordinador, 2026-10-05 |
| Spec Kit cubre también el front; la constitución 1.4.0 está ratificada | Usuario, 2026-10-05 (constitución 1.4.0, en la rama del PR #16) |
| El spike es la primera tarea del plan; si P1 falla, el plan se detiene y el usuario decide | Coordinador, 2026-10-05 |
| TDD; código y pruebas en inglés; documentos de Spec Kit en español; accesibilidad de teclado, diseño móvil y movimiento reducido | [`AGENTS.md`](../../AGENTS.md); [constitución](../../.specify/memory/constitution.md), principios II y VI |

## Clarifications

### Session 2026-10-05

- Q: **Q1**, ¿de dónde lee el contenido el front entre A2 y A3? → A: Opción A: un `curriculum.json` estático que sirve Nginx, sin reescribirlo, como puente que A3 retira. Descartadas: las 17 porciones de la API sin sesión desde ahora (B), que contradice el alcance de A2, ata el front a C2 desplegado y se rompe cuando C3 exija sesión; y un script clásico con el contenido como globals (C), que `build-check` prohíbe y no maneja la falla. Decidió el usuario. (FR-004, FR-016)
- Q: **Q2**, ¿qué ve el alumno si el contenido no llega y qué reintenta la compuerta? → A: Opción A: un mensaje en `#main` que dice que el contenido no se pudo cargar y que el progreso sigue guardado, con «Reintentar» a mano (sin recargar la página) y un tope de espera; no evalúa ni escribe nada. Descartadas: los reintentos automáticos con espera creciente (B), que suman estados y temporizadores y retrasan el error; y guardar la última copia (C), que es el alcance de A3. Decidió el usuario. (FR-007, FR-009)
- Q: **Q3**, ¿qué oráculo reemplaza la comparación de `dump-dist-globals`? → A: Opción A: un check en `npm test` que corre el bundle construido con un `fetch` simulado y exige tres igualdades: los globals son los de `dump-globals`, los bytes servidos tienen el `documentHash` del meta y las 17 porciones tienen la huella de `portions`; `dump-dist-globals` se retira. Descartadas: la comparación a mano (B) y un E2E que vuelque `window.*` (C). Decidió el usuario. (FR-018)
- Q: **Q4**, ¿qué pasa con `build-check` y con el «HTML autónomo» (ADR 0001)? → A: Opción A: se conserva `vite-plugin-singlefile` hasta C4, así que el código y los estilos siguen en un solo documento y sólo sale el contenido; `build-check` parsea el script como módulo, baja el tope a un valor medido, suma un oráculo de ausencia y exige el contenido junto al HTML; la documentación deja de llamar «autónomo» al documento. Descartadas: retirar el plugin ahora (B), que adelanta parte de C4; y una salida autónoma opcional con el contenido embebido (C), que duplica el build. Decidió el usuario. (FR-014, FR-015, FR-021)
- Q: **Q5**, ¿cómo se verifica el arranque en un navegador real? → A: Cambia respecto de la recomendada (una lista manual). Como A2 ahora depende de F1, la verificación en un navegador real la hacen los E2E de F1 (Playwright, ADR 0008, sólo Chromium), y A2 suma sus escenarios: enlaces profundos, recarga, sin red, contenido roto, reintento, teclado y móvil. No hace falta una lista manual. Decidió el usuario. (FR-024, SC-007)
- Q: ¿De qué depende A2 ahora? → A: De A1 (entregado), de F1 (la red de pruebas del front) y de las unidades 1 a 4 de F2 (almacenes y motores singleton, catálogo, arranque explícito y registro de modelos). Las pantallas de acceso (F11) entran como una etapa previa de la secuencia de arranque y borran `#invitacion=`. El épico del front no planifica un segundo cargador de contenido: el acceso tipado y la carga asíncrona son de A2. Decidió el usuario. (Intención y alcance; FR-013)
- El arranque pasa de una lista de imports a una secuencia de etapas con nombre, y `load-order-check` lee esa secuencia. Lo propuso A2 y lo aceptó el coordinador. (FR-003, FR-013)
- FR-010 y FR-011 siguen como propuestas de la spec, sin pregunta propia: el usuario no las objetó. El plan fija el tope de espera y el umbral del estado de carga; el mecanismo de la versión lo decidió después el usuario (Q6, sesión del 2026-10-06). (FR-007, FR-010, FR-011)
- El spike es la primera tarea del plan y corre sobre la base con F1 y F2 integradas, porque la unidad 3 de F2 cambia cómo arranca `app.js`. Si P1 falla, el plan se detiene y el usuario decide. Lo pidió el coordinador. (El spike; SC-008)

### Session 2026-10-06

El usuario aceptó las tres decisiones de diseño que el plan dejaba abiertas, con la opción que el plan traía ([research.md](./research.md), R3, R4 y R11). Ninguna cambia las tareas. Las opciones descartadas están en cada respuesta.

- Q: **Q6**, ¿cómo viaja la versión del contenido y cómo se llama el archivo que sirve Nginx? → A: La opción del plan: el build copia `build/curriculum.json`, con los mismos bytes, a `dist/content/curriculum.<versión>.json`, donde la versión son los primeros 32 hexadecimales del `documentHash`, y la página pide ese nombre. Precisa Q1: el generador sigue escribiendo `build/curriculum.json` y los bytes servidos son los suyos, pero el archivo servido ya no se llama `curriculum.json`. Es la única opción de R3 con la que la compuerta puede observar la versión de lo que recibió: una página de otro build pide un nombre que el servidor no tiene y recibe un 404. Descartadas: una constante del build sola, que dice lo que la página espera y no lo que llegó; una query (`?v=`), que `try_files` ignora; un encabezado de Nginx, que obliga a tocar `nginx.conf`; el hash en el navegador, que exige un contexto seguro; y un archivo por porción o un manifiesto aparte, que suman pedidos para una fuente que A3 retira. Decidió el usuario. (FR-004, FR-011)
- Q: **Q7**, ¿quién entrega los avisos de licencia y qué copia la imagen? → A: La opción del plan: el build emite `EDITOR-LICENSES.txt` y `THIRD-PARTY-NOTICES.txt` junto al HTML y al contenido, así que `dist/` es la raíz web completa. `frontend/Dockerfile` la copia con una sola línea, en lugar de las tres de hoy, y la vista previa la monta entera. Cambia cómo se entregan los avisos, no sus nombres ni sus URL. Así, cuando A3 retire el contenido estático, la imagen y la vista previa lo pierden sin editar el `Dockerfile` ni el montaje, y C4 parte de un `Dockerfile` que ya copia todo `dist/`. Descartadas: dos montajes en la vista previa, con el `Dockerfile` copiando `content/` aparte, que dejan una línea y un montaje que A3 tiene que acordarse de borrar; montar todo `dist/` sin emitir las licencias, que dejaría sin servir las dos URL de avisos en la vista previa; `publicDir`, que copiaría `curriculum.meta.json` y no le pone la versión al nombre; un paso de copia después de `vite build`, con el que `vite build` solo ya no deja un `dist/` completo; y el JSON como activo `?url`, que `vite-plugin-singlefile` incrustaría como `data:`. Decidió el usuario. (FR-016)
- Q: **Q8**, ¿qué marcadores usa el oráculo de ausencia de SC-003? → A: La opción del plan: los de `curriculumMarkers()` en `qa/lib/content-document.ts`. Por cada una de las siete familias, dos textos largos de una entrada y, si no es una palabra común del código, su ID (la regla exacta, con sus filtros, está en research.md, R11). Reemplaza el «un ID, un título y una pista por familia» que pedía SC-003: el bundle escapa los títulos y las pistas con acentos o comillas, y el ID de un taller como «cache» es una palabra común del código, que no prueba nada. C4 reutiliza la misma función para escanear la imagen web. Descartadas: sólo el tope de tamaño, por el que se colaría un contenido chico, como una porción; los marcadores con comillas, que dan falsos negativos; y un análisis del bundle con esbuild, que suma otro parser. Decidió el usuario. (FR-015, SC-003)
- Sigue abierta, a propósito: qué hacer si P1 falla en T001. Se decide si pasa. Con P1 en verde no hay nada que decidir; con P1 en rojo, el plan se detiene y el coordinador le lleva al usuario las alternativas de research.md (R1) con su costo: la salida estándar de Vite en chunks, importar todo en estático con el arranque explícito de F2, o una función de arranque por vista legacy. (El spike; SC-008)

## El spike, primera tarea del plan

El ADR 0004 (§2 «Entrega» y «Riesgos conocidos») y la hoja de ruta piden validar la técnica antes de comprometerla. El spike es la primera tarea del plan (T001) y trae su regla de decisión: si P1 falla, el plan se detiene y el usuario decide. Corre sobre la base de la implementación, con F1 y las unidades 1 a 4 de F2 integradas, porque la unidad 3 de F2 cambia cómo arranca `app.js`: medir antes mediría un arranque que ya no existe. Deja sus resultados en el mensaje del commit de T001, con las versiones, los comandos y las cifras, y en `research.md`. No deja código de producción y no usa dependencias nuevas: si el worktree no tiene `node_modules`, reutiliza una instalación existente o pide permiso para `npm ci`, como manda la regla de descargas de la hoja de ruta.

**Lo que ya se sabe (observación preliminar del 2026-10-05, sobre `master` y antes de F2).** Se armó una sonda descartable, fuera del repositorio: tres módulos que escriben una marca de orden al evaluarse, construidos con Vite 8.3.2 (Rolldown 1.2.12), `vite-plugin-singlefile` 2.3.3 (con `removeViteModuleLoader`) y esbuild 0.28.2, que son los del lockfile, con `target: 'es2020'` y sin minificar. La salida se ejecutó como módulo en Node, no en un navegador.

1. Con `import()` dinámicos, la salida fue un solo `<script type="module">` inline, sin archivos ni enlaces externos, y cada módulo importado se evaluó cuando se lo llamó y en el orden de las llamadas. Para Vite 8 el plugin fija `codeSplitting: false`, que [Rolldown equipara](https://rolldown.rs/reference/OutputOptions.codeSplitting) con incorporar los imports dinámicos al mismo archivo. [Rollup advierte](https://rollupjs.org/configuration-options/#output-inlinedynamicimports) que en ese modo un módulo importado sólo dinámicamente se ejecuta enseguida, y la documentación de Rolldown no lo aclara. La sonda mostró evaluación diferida.
2. Con un top-level await y `es2020`, el build de Vite avisa (`TOLERATED_TRANSFORM`) y termina bien. El empaquetador que usan los checks (`qa/lib/sources.ts`, esbuild en formato IIFE) lo rechaza: «Top-level await is not available in the configured target environment». Queda descartado, porque rompería `boot-check` y todo check que empaquete el arranque.
3. Cualquier `import()` suma al script el ayudante de precarga de Vite, que usa `import.meta`. `build-check` parsea el script como script clásico y falla («Cannot use 'import.meta' outside a module»), y `modulePreload: false` no lo evita. Lo mismo le pasaría a `dump-dist-globals`, que evalúa el script en un contexto vm clásico. Además, en la salida de la sonda el polyfill de precarga quedó en el script: `removeViteModuleLoader` sólo lo quita si es lo primero, y el runtime de Rolldown iba antes.

Esto no reemplaza al spike: los módulos eran triviales, no había dependencias compartidas entre importadores estáticos y dinámicos, y el anfitrión era Node.

**Qué responde y cómo se mide.** Todo sobre el `main.tsx` real de la base y la configuración del proyecto.

| ID | Pregunta | Cómo se mide | Pasa si |
| --- | --- | --- | --- |
| P1 | Con la cadena legacy real detrás de `import()`, ¿se conserva un solo documento y el orden de evaluación? | Build real; contar los `<script>` y los archivos o enlaces externos de `dist/`; una marca por módulo legacy, escrita al evaluarse y leída al ejecutar el bundle en un contexto vm y en Chromium (el Playwright de F1); y, con `grep`, qué módulos leen contenido de `window.*` al evaluarse en la base | 1 `<script>` y 0 externos; ninguna marca legacy antes de «contenido publicado»; las restricciones de orden de la base cumplidas |
| P2 | ¿Qué cambio mínimo necesitan `build-check` y el oráculo que evalúa el script del dist, que deja de ser un script clásico? | Correr `build-check` y un esbozo del check nuevo sobre la salida de P1 | Queda la lista del cambio mínimo, y `build-check` pasa con el parseo como módulo |
| P3 | ¿Cuánto pesa el HTML sin el contenido y cuánto el contenido? | Bytes de `dist/index.html` antes y después, y del contenido, sin comprimir y con gzip | Las cifras fijan el tope nuevo de `build-check`, a lo sumo un 10 % sobre lo medido |
| P4 | ¿El arnés de los checks arranca la cadena diferida con un `fetch` simulado, y cómo se prueban el tope de espera y el umbral de carga con sus temporizadores? | Empaquetar el arranque como lo hace `qa/lib/sources.ts` y correr `boot-check`; con un `fetch` que no responde, anotar qué temporizadores corren en `flush()` (el arnés ignora la demora y no cancela) | Los 10 casos pasan sin cambiar sus valores esperados, queda dicho qué temporizadores corren y el camino feliz se asienta antes de la primera ronda de `flush()` |
| P5 | ¿Qué cambia en un navegador real que la simulación no ve? | No es del spike: lo miden los E2E de A2 en la red de F1 (sólo Chromium, ADR 0008): el orden de las marcas, un solo pedido de contenido, la recarga completa de `?#laboratorio`, sin red y con el pedido bloqueado | Mismo orden que en el vm, el error aparece y la consola queda sin errores inesperados |

**Regla de decisión.**

- Si P1 pasa, el plan adopta `import()` encadenados desde un arranque asíncrono, con `vite-plugin-singlefile` hasta C4.
- Si P1 falla (más de un script, archivos o enlaces externos, o evaluación anticipada), el plan se detiene y el usuario decide. El coordinador le lleva las alternativas con su costo, contra la base con F2: la salida estándar de Vite en chunks, que adelanta parte de C4; importar todo en estático y llamar al arranque explícito de F2 después de la compuerta, si ningún módulo legacy lee contenido al evaluarse (T001 lo audita); y una función de arranque exportada por cada vista legacy, que toca los archivos legacy y los checks que los evalúan.
- El top-level await queda descartado en los dos casos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El taller abre igual que hoy cuando el contenido llega (Priority: P1)

El alumno abre el taller, o recarga una página con un enlace profundo, y ve la misma vista con los mismos datos y el mismo progreso. Entre medio, el arranque pidió el contenido y evaluó las vistas después.

**Why this priority**: es la condición para que A2 pueda salir. El cambio es de plomería y el alumno no debe notarlo.

**Independent Test**: con lo construido servido por la vista previa o por Nginx, abrir el taller con el progreso de `qa/fixtures`, recorrer las 8 vistas y los enlaces profundos, y comparar el volcado de los globals con el de `dump-globals`.

**Acceptance Scenarios**:

1. **Dado** el contenido disponible, **cuando** se abre el taller, **entonces** el arranque publica los globals y recién después evalúa las vistas legacy, en el orden de hoy, y el alumno ve la primera vista.
2. **Dado** el progreso de `qa/fixtures/progress-master-2a278ad-storage.json`, **cuando** arranca el taller, **entonces** no escribe, no respalda ni avisa, como hoy.
3. **Dado** un enlace profundo (`?ejercicio=…&paso=code#laboratorio`, `?campana=…&ejercicio=…#laboratorio`, `?sistema=…&ejercicio=…#laboratorio`, `?mundo=…#campana` o `?lenguaje=go&taller=…#sistemas`), **cuando** se abre o se recarga, **entonces** muestra la misma vista y el mismo contexto que hoy.
4. **Dado** el menú «Laboratorio» (`?#laboratorio`), que según el estándar recarga el documento (F1 lo confirma), **cuando** se pulsa, **entonces** el estado de carga sólo aparece si la espera pasa del umbral (FR-010) y el laboratorio se muestra como hoy.

*Cubre: FR-001 a FR-003, FR-005, FR-010, FR-016, FR-017, FR-019 y FR-022 a FR-024; SC-001 y SC-005 a SC-007.*

---

### User Story 2 - Si el contenido no llega, el progreso no se toca (Priority: P1)

Sin red, con un error del servidor o con un contenido roto, el alumno ve un mensaje que le dice que el contenido no se pudo cargar y que su progreso sigue guardado, y puede reintentar. Ninguna vista se arma con una parte del contenido.

**Why this priority**: es lo único nuevo que ve el alumno y lo que protege su progreso. Sin la compuerta, una falla de red se convierte en registros descartados y en copias de respaldo.

**Independent Test**: arrancar el bundle con un `fetch` simulado que falla de cada modo (SC-004), con el progreso de `qa/fixtures` en el almacenamiento, y comparar las claves antes y después. Repetirlo en un navegador real con los E2E de F1, que bloquean el pedido con `page.route`.

**Acceptance Scenarios**:

1. **Dado** un pedido que falla (sin red, estado de error o tope de espera vencido), **cuando** arranca el taller, **entonces** el alumno ve el mensaje con «Reintentar», ninguna vista legacy se evalúa y el almacenamiento queda como estaba, sin avisos de datos descartados.
2. **Dado** un contenido ilegible, con una porción ausente o de otra forma, o de otra versión que la del HTML, **cuando** arranca, **entonces** pasa lo mismo: no se publica ninguna porción.
3. **Dado** el mensaje de error y que el contenido vuelve, **cuando** el alumno pulsa «Reintentar» con el teclado, **entonces** el arranque sigue sin recargar la página, como si el contenido hubiera llegado a la primera.
4. **Dado** un lector de pantalla, **cuando** aparece el estado de carga o de error, **entonces** lo anuncia en español, sin movimiento y con el foco en el control.

*Cubre: FR-001, FR-007 a FR-011 y FR-020; SC-004.*

---

### User Story 3 - El HTML ya no trae el contenido (Priority: P1)

`dist/index.html` pesa mucho menos y no contiene el currículo. El contenido llega como un archivo aparte, idéntico al que genera el generador.

**Why this priority**: es el objetivo de la hoja de ruta («que el HTML deje de embeberlo») y lo que libera el margen de tamaño que hoy limita al port.

**Independent Test**: construir, buscar marcadores del currículo en `dist/index.html`, medir su tamaño y comparar el sha256 del contenido servido con el `documentHash` del meta.

**Acceptance Scenarios**:

1. **Dado** el build, **cuando** se inspecciona `dist/index.html`, **entonces** no contiene ningún marcador del currículo y pesa menos que el tope nuevo.
2. **Dado** el contenido servido, **cuando** se calcula su sha256 y el de cada porción como la publica la compuerta, **entonces** coinciden con el `documentHash` y con las huellas de `portions` del meta.
3. **Dado** un cambio que vuelve a embeber el contenido (un import estático del JSON), **cuando** corre `npm test`, **entonces** `build-check` falla.

*Cubre: FR-004, FR-005, FR-014, FR-015, FR-018 y FR-021; SC-002 y SC-003.*

---

### User Story 4 - Quien continúa el trabajo no reescribe la compuerta (Priority: P2)

Quien implementa A3 cambia la fuente del contenido por la del protocolo de la API, y quien porta una vista recibe su porción del contenido, por props desde su adaptador, en lugar de leer `window.*`. Ninguno rehace la compuerta ni el arranque.

**Why this priority**: A2 es un puente. Si A3 o el port tienen que reescribirlo, A2 fue trabajo perdido.

**Independent Test**: con una fuente de prueba que devuelve las 17 porciones por su nombre y una versión, correr los checks de la compuerta y revisar que la compuerta, la publicación y el arranque de las vistas quedan iguales.

**Acceptance Scenarios**:

1. **Dada** una fuente alternativa con la forma que tendrá la de A3, **cuando** reemplaza a la fuente estática, **entonces** la compuerta, la publicación de los globals y el arranque de las vistas no cambian, y los checks de la compuerta pasan.
2. **Dado** el módulo de arranque, **cuando** se revisa, **entonces** es una secuencia ordenada de etapas con nombre, y agregar una etapa antes (la sesión de A3) o después (el shell del port) no toca la etapa de la compuerta.

*Cubre: FR-006, FR-012 y FR-013.*

---

### Edge Cases

- **Contenido parcial:** es peor que ninguno. `lab.js` y `campaign.js` tratan un catálogo ausente como vacío (`|| []`) y no fallan: sólo se nota cuando el almacén descarta los registros de los ejercicios que faltan. Por eso la compuerta publica todo o nada (FR-001).
- **Una respuesta que no es el contenido:** un portal cautivo o un proxy pueden responder 200 con HTML. Es contenido que no llegó (FR-007).
- **Contenido de otro build:** después de un despliegue, la caché del navegador puede dejar un HTML nuevo con contenido viejo, o al revés. Se evita por construcción: el nombre del archivo lleva la versión, así que un HTML nuevo nunca encuentra en la caché el contenido de otro build, y uno viejo recibe un 404 con el aviso de que recargue (FR-011). La vista previa monta `dist/` entero y no tiene ese riesgo (FR-016).
- **Despliegue con la pestaña abierta:** no pasa nada. El contenido ya se evaluó y no se vuelve a pedir.
- **Recargas completas como navegación:** el menú «Laboratorio» es `?#laboratorio` y, según el estándar, recarga el documento, como otros enlaces con query (F1 lo mide en un navegador real). Cada recarga vuelve a pasar por la compuerta. El estado de carga no parpadea (FR-010), y el contenido se puede revalidar con el navegador sin volver a bajarlo.
- **El menú antes de las vistas:** los conteos del menú (4, 25, 274 y 15), «Exportar mi progreso» y los botones de idioma están en el HTML antes de que existan las vistas. Durante la espera y el error no hacen nada, y el mensaje de error dice que el progreso sigue guardado. La exportación vuelve con el reintento.
- **Cambio de URL durante la espera:** un clic en el menú cambia el hash y las vistas todavía no existen. Al evaluarse, `app.js` lee la URL de ese momento. La compuerta no reescribe ni envía la URL, tampoco un `#invitacion=<token>`: lo borra la etapa de acceso de F11, que va antes.
- **Reintentos simultáneos:** hay un pedido por vez. Un segundo clic mientras espera no abre otro.
- **Dos pestañas:** cada una pasa la compuerta por su cuenta. La compuerta no escribe, así que no hay fusión que arbitrar.
- **Compresión:** Nginx comprime `application/json`. El contenido descomprimido es idéntico al generado.
- **Sin JavaScript:** el aviso `noscript` de hoy sigue igual.
- **Idioma:** el idioma del recorrido lo fija `app.js` después de la compuerta. Los mensajes de la compuerta van en español, el único idioma de la interfaz.
- **Movimiento reducido:** los estados de carga y de error no animan.

## Requirements *(mandatory)*

### Functional Requirements

**La compuerta**

- **FR-001**: Todo o nada. El arranque NO DEBE publicar ningún catálogo ni evaluar ninguna vista legacy (`app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js`) hasta tener las 17 porciones completas y válidas. Una parte del contenido es peor que ninguna (Riesgos, 1).
- **FR-002**: Con el contenido completo, el arranque DEBE publicar los mismos globals que hoy publican los adaptadores (`GUIDE_DATA`, `RUST_LAB`, `GO_LAB`, `RUST_QUESTS`, `GO_QUESTS`, `RUST_CAMPAIGN`, `GO_CAMPAIGN`, los cuatro `SYSTEMS_*` con sus modelos y sus `SYSTEMS_*_LABS`) y el catálogo del Atlas, con los mismos valores y el mismo orden de claves, y recién después evaluar las vistas.
- **FR-003**: El orden de evaluación de hoy DEBE conservarse: las restricciones de orden de `qa/load-order-check.ts` de la base (16 al 2026-10-05; F2 y los ports editan la tabla, y T001 las vuelve a contar), más «`app.js` último» y «`styles.css` primera». El check las sigue comprobando sobre la secuencia de arranque en lugar de los imports estáticos, sin relajar ninguna.
- **FR-004**: El contenido DEBE salir del HTML y llegar como un artefacto aparte, que sirve el mismo Nginx desde el mismo origen. El artefacto es el `curriculum.json` que genera `tools/content`, sin reescribirlo (la copia servida lleva la versión en el nombre: FR-011), y es transitorio: A3 lo retira. *(Q1 y Q6, decididos por el usuario)*
- **FR-005**: Los seis importadores estáticos de `build/curriculum.json` (`register-catalogs.ts`, los cuatro `register-systems-*.ts` y `pages/atlas/model/atlas-catalog.ts`) DEBEN dejar de importarlo. Ningún camino estático conserva el contenido en el bundle.
- **FR-006**: DEBE haber un único punto de acceso al contenido cargado, tipado con los tipos de las entidades, del que leen los adaptadores de `frontend/src/app/legacy/` que publican los globals y montan las vistas portadas. Una página no puede importarlo, porque las dependencias van de `app` hacia abajo: recibe su porción por props desde su adaptador, como el Atlas con `entries`. A2 no arma sobre él lo derivado que usan el laboratorio y la campaña (el catálogo `exercises`, `byId` y los selectores), que es del port.

**Si el contenido no llega**

- **FR-007**: El contenido NO llegó cuando el pedido falla o no responde dentro de un tope de espera (20 s; research.md, R6); la respuesta no tiene un estado de éxito; el cuerpo no es JSON; falta alguna de las 17 porciones o alguna no tiene la forma que corresponde a su nombre; o la versión no es la que espera el HTML (FR-011). En ese caso la compuerta DEBE mostrar en `#main` un mensaje en español que dice que el contenido no se pudo cargar y que el progreso sigue guardado, con un control «Reintentar». *(Q2, decidido por el usuario)*
- **FR-008**: Mientras el contenido no está, el arranque NO DEBE abrir, leer ni escribir ninguna clave de almacenamiento del taller (las cuatro de progreso, sus respaldos ni otra), ni mostrar avisos de datos descartados, ni reescribir ni enviar la URL (el hash y la query quedan intactos). Se conserva «arrancar con el progreso de master no escribe, no respalda ni avisa».
- **FR-009** *(Q2)*: «Reintentar» DEBE volver a pedir el contenido sin recargar la página, con un pedido por vez, y si llega completo, seguir el arranque como si hubiera llegado a la primera. No hay reintentos automáticos ni copia local del contenido (A3).
- **FR-010** *(propuesta de la spec)*: La compuerta DEBE mostrar un estado de carga sólo si la espera pasa de un umbral corto (400 ms; research.md, R6), para no parpadear en las recargas completas que hoy provocan algunos enlaces; después de «Reintentar», que responde a un clic, lo muestra al instante. Los estados de carga y de error DEBEN ser accesibles: su texto llega a los lectores de pantalla (región viva), «Reintentar» se opera con el teclado y muestra el foco, y no hay movimiento. Usan los estilos del shell, que no se difieren, y el español de la interfaz. *(Constitución, principio VI)*
- **FR-011** *(propuesta de la spec; el usuario decidió su mecanismo en Q6)*: La compuerta NUNCA DEBE evaluar las vistas con contenido de otro build que el del HTML que lo pidió. El HTML identifica el contenido que espera por su versión (los primeros 32 hexadecimales del `documentHash`, la forma que C2 publica como `Content-Version`), y otra versión se trata como contenido que no llegó, con un mensaje que sugiere recargar. El documento no lleva su propia huella, así que la versión viaja fuera de sus bytes: en el nombre del archivo servido (`curriculum.<versión>.json`), que es lo único que la compuerta puede observar de lo que recibió. Una página de otro build pide un nombre que el servidor no tiene y recibe un 404 (research.md, R3); la fuente de la API de A3 devolverá la versión de cada respuesta.

**Diseño que admite A3 y el port**

- **FR-012**: La compuerta DEBE leer el contenido a través de una fuente intercambiable que, dada la lista de las 17 porciones por su nombre (los de `portions` del meta), devuelve cada una con una versión del contenido, o falla. Reemplazar la fuente estática por la de A3 no cambia la compuerta, la publicación ni el arranque de las vistas. A2 NO implementa sesión, validadores por porción, comparación de `Content-Version` entre respuestas, reintento con tope ni caché de la última copia.
- **FR-013**: El arranque DEBE ser una secuencia ordenada de etapas con nombre en `frontend/src/app/`, que `main.tsx` recorre y `qa/load-order-check.ts` lee. Las pantallas de acceso (F11) y la sesión de A3 se suman como etapas previas, y el shell de F10 como una posterior, sin tocar la compuerta. A2 no construye esas etapas.
- **FR-025**: La compuerta DEBE avisar cuando publicó el contenido, con una señal que observan el arnés de los checks, el check del bundle construido y el spike (la marca de orden de P1), y que no es un global `window.*` ni un contrato de las vistas legacy (research.md, R7).

**El documento y el build**

- **FR-014**: `dist/index.html` NO DEBE contener el currículo ni un fragmento de él, y DEBE seguir siendo un solo documento con el código y los estilos: un `<script>` y un `<style>`, sin archivos ni enlaces externos. `vite-plugin-singlefile` se conserva hasta C4. *(Q4, decidido por el usuario)*
- **FR-015** *(Q4 y Q8)*: `qa/build-check.ts` DEBE parsear el script del dist como módulo; bajar el tope de tamaño a un valor medido, con un margen de a lo sumo el 10 %; fallar si aparece en el HTML un marcador del currículo (oráculo de ausencia); y exigir el artefacto de contenido junto al HTML, con el sha256 del `documentHash` del meta.
- **FR-016**: `npm run dev` y `docker/compose.preview.yaml` DEBEN servir el contenido junto al HTML sin API ni Docker de la API. `dist/` pasa a ser la raíz web completa: el build deja en él el HTML, el contenido y los dos avisos de licencia (`EDITOR-LICENSES.txt` y `THIRD-PARTY-NOTICES.txt`, que hoy copia el `Dockerfile`); `frontend/Dockerfile` copia `dist/` entero a la imagen y la vista previa lo monta entero. Así el HTML y el contenido salen siempre del mismo build y los avisos siguen en las mismas URL. La CSP no cambia: `connect-src 'self'` cubre un pedido al mismo origen. *(Q7, decidido por el usuario)*

**Oráculos y checks**

- **FR-017**: `node tools/content/dump-globals.ts <raíz>` DEBE seguir dando el mismo volcado, byte a byte, con el mismo uso y también sobre la raíz de un commit anterior a A2. Es la vara que ya usan A1, C2 (SC-006) y el criterio de C2 de la hoja de ruta. La línea base se toma sobre la base de la rama de implementación, antes del primer cambio de código, y se registra con el `documentHash` del documento para el que se calculó, para que no salga del código que se prueba (constitución, principio II). El 2026-10-05, sobre `master`, el volcado empieza con `cd1f9e62…` para un documento que empieza con `ef8f5715…` (plan de C2). Si el contenido cambia mientras dura la feature, la línea base se vuelve a tomar con el código de la base de la rama, nunca con el de A2.
- **FR-018** *(Q3)*: Un check en `npm test` DEBE arrancar el bundle construido con un `fetch` simulado que sirve el contenido de `dist/`, volcar los globals que publica la compuerta y exigir que (1) igualen a los de `dump-globals`, (2) los bytes servidos tengan el `documentHash` del meta y (3) cada una de las 17 porciones, como la publica la compuerta (la señal de FR-025 entrega el contenido) y serializada en JSON compacto, tenga la huella de `portions`. Los valores esperados salen del generador y de la línea base, nunca de la compuerta (constitución, principio II). `tools/content/dump-dist-globals.ts` se retira en el mismo cambio.
- **FR-019**: Los checks que hoy cargan los catálogos DEBEN seguir cargándolos sin red, sin Laravel y sin cambiar sus valores esperados. Son los 15 que pasan por `qa/lib/legacy-sources.ts` evaluando los adaptadores, y los que importan `atlasByLanguage` (`atlas-check`, `curriculum-ids-check`, el fixture `qa/fixtures/atlas-page-render.tsx` y `dump-globals`). `qa/lib/legacy-sources.ts` sigue siendo el único lugar que sabe cómo se cargan los adaptadores.
- **FR-020**: `qa/boot-check.ts` DEBE conservar los casos de la base (10 al 2026-10-05: ocho escenarios y la importación, que corre con dos exportaciones congeladas) sin cambiar sus valores esperados, con el contenido provisto por un `fetch` simulado. Además DEBE cubrir: que ninguna vista ni catálogo existe antes de que el contenido se publique; cada modo de falla de SC-004 que se ve por el transporte (todos menos «versión distinta», que prueba la compuerta con una fuente de prueba, porque la fuente estática la ve como un 404), con las vistas sin evaluar y el almacenamiento intacto (sin claves `:respaldo` ni avisos); el reintento que arranca; y una porción ausente, que no publica nada.

**Documentación, dependencias y verificación**

- **FR-021**: La documentación que hoy llama «autónomo» al HTML o dice cómo se carga el contenido DEBE decir lo que pasa, en el mismo cambio: `README.md` (la frase que dice que se puede abrir `dist/index.html`, la del build, la de los checks («paquete autónomo»), la del mapa de archivos y la de la vista previa), `AGENTS.md` (la introducción, el mapa de archivos, el párrafo de `vite-plugin-singlefile` y la vista previa), `docs/architecture.md` (las filas del mapa de documento, catálogos, Atlas, Sistemas, construcción y servicio, la regla de `main.tsx` y el contrato de la salida autónoma, que pide definir el cambio de entrega y actualizar Docker, Nginx, QA y README al reemplazar el build), `qa/AGENTS.md` (los oráculos, el build, `boot-check` y `load-order-check`) y la cifra de tamaño de `docs/refactor-roadmap.md`. El plan lista cada pasaje.
- **FR-022**: NO DEBE agregarse ninguna dependencia: `dependencies` y `devDependencies` de `package.json` no suman paquetes, y el lockfile sigue sincronizado.
- **FR-023**: A2 NO DEBE editar las seis vistas legacy. Si el spike obliga a hacerlo (regla de decisión), se decide con el usuario antes.
- **FR-024** *(Q5)*: DEBEN pasar `npm run build`, `npm test` (los checks de `qa/` de la base, 30 al 2026-10-05, más el nuevo, y las specs de Vitest de F1), `npm run test:e2e`, `npm run lint`, `npm run format:check` y `git diff --check`. Los E2E de F1 verifican A2 en un navegador real (Chromium, ADR 0008) con los escenarios que suma A2: carga normal, los cinco enlaces profundos de la User Story 1, la recarga completa, sin red, el pedido de contenido bloqueado o devolviendo basura, «Reintentar» con el teclado y un viewport móvil. No hay lista manual. Se informa el tiempo hasta la primera vista antes y después, con y sin el contenido en la caché del navegador; es un dato, sin umbral.

### Key Entities *(include if feature involves data)*

- **Compuerta de arranque:** la etapa del arranque que pide el contenido, lo valida, lo publica y recién entonces deja que se evalúen las vistas legacy.
- **Contenido:** el currículo completo como lo genera `tools/content`: siete grupos (`lab`, `quests`, `cores`, `campaign`, `workshops`, `atlas` y `guide`) que se parten en 17 porciones.
- **Porción:** la unidad con nombre que viaja por la API en A3: `lab.rust`, `lab.go`, `quests.rust`, `quests.go`, `cores.lowlevel`, `cores.infra`, `cores.play`, `cores.pc`, `campaign.rust`, `campaign.go`, `workshops.lowlevel`, `workshops.infra`, `workshops.play`, `workshops.pc`, `atlas.rust`, `atlas.go` y `guide`. Su huella es la de `portions` en `curriculum.meta.json`, el sha256 de su JSON compacto.
- **Fuente de contenido:** de dónde lee la compuerta. En A2, un documento estático (Q1); en A3, la API.
- **Versión del contenido:** los primeros 32 hexadecimales del `documentHash`, lo que C2 publica como `Content-Version`.
- **Contenido publicado:** los globals `window.*` que leen las vistas legacy y el acceso tipado al contenido cargado.
- **Señal de publicación:** el aviso que da la compuerta cuando publicó el contenido (FR-025).
- **Estados de espera y de error:** lo que ve el alumno mientras el contenido no está.
- **Oráculos:** el `documentHash` y `portions` del meta del generador, y la línea base del volcado de `dump-globals`. Los tres salen de código anterior a A2, no de la compuerta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el contenido de `dist/`, el volcado de los globals que publica el bundle construido y el de `dump-globals` son idénticos, y el de `dump-globals` es el de la línea base de FR-017: 0 diferencias.
- **SC-002**: Los bytes del contenido que sirve Nginx, también descomprimidos, tienen el `documentHash` del meta, y las 17 porciones que publica la compuerta tienen la huella de `portions`: 17 de 17.
- **SC-003**: `dist/index.html` no contiene ninguno de los marcadores del currículo que fije el plan (por familia de contenido, dos textos largos de una entrada y, si no es una palabra común del código, su ID; la regla es `curriculumMarkers()`, la fijó el plan, la aceptó el usuario en Q8 y la comparte C4: research.md, R11) y pesa menos que el tope nuevo, que queda a lo sumo un 10 % sobre lo medido. Hoy el tope es 2.500.000 y el HTML pesa unos 2,2 MB (2.202.074 bytes al cerrar A1).
- **SC-004**: En cada uno de los 8 modos de falla (red caída, estado 404, estado 500, tope de espera, cuerpo que no es JSON, porción ausente, porción con otra forma y versión distinta) hay 0 vistas evaluadas, 0 lecturas y escrituras en el almacenamiento, 0 avisos de datos descartados y 0 claves `:respaldo` nuevas, y «Reintentar» recupera el arranque en un intento, sin recargar la página. La fuente estática ve la «versión distinta» como un 404, así que ese modo se prueba además en la compuerta, con una fuente de prueba que devuelve otra versión.
- **SC-005**: Los casos de `boot-check` (10 al 2026-10-05) y los demás checks de `npm test` (28 al 2026-10-05, sin contar `boot-check` ni `build-check`), más las specs de Vitest de F1, pasan sin cambiar sus valores esperados. `build-check` pasa con las comprobaciones nuevas de FR-015, y `load-order-check` sigue comprobando las restricciones de orden de la base y las dos reglas de los extremos.
- **SC-006**: `package.json` y `package-lock.json` no suman ningún paquete: 0 dependencias nuevas.
- **SC-007**: En un navegador real, los E2E de F1 con los escenarios de A2 pasan (los de FR-024), y se informa el tiempo hasta la primera vista antes y después.
- **SC-008**: El spike deja registradas las respuestas de P1 a P4, con versiones, comandos y cifras, en el mensaje del commit de T001 y en `research.md`, antes de que arranque la implementación (T002 en adelante). P5 la cubren los E2E de A2 (SC-007).

## Riesgos

1. **El progreso, el principal.** Evaluar una vista con un catálogo vacío o parcial. `lab.js` arma su catálogo con `|| []`; al cargar, su almacén cuenta cada registro de un ID desconocido como descartado, deja una copia de respaldo y avisa de datos descartados, y el primer guardado del alumno persiste el estado reducido. `app.js` lanza si falta `GUIDE_DATA`. *Mitigación:* todo o nada (FR-001 y FR-008) y los escenarios de `boot-check` (FR-020).
2. **Que el diferimiento no se evalúe como se espera.** La documentación de Rollup dice que un `import()` incorporado al mismo archivo se ejecuta enseguida, y la sonda de Rolldown mostró lo contrario, pero con módulos triviales. *Mitigación:* P1 con la cadena real, medido ejecutando, y la regla de decisión: si falla, la decisión vuelve al usuario.
3. **El script del dist deja de parsear como script clásico.** El ayudante de precarga de Vite usa `import.meta`. *Mitigación:* FR-015 (parseo como módulo) y el retiro de `dump-dist-globals`.
4. **Que el contenido vuelva al HTML sin que nadie lo note.** Hoy quedan unos 300 KB bajo el tope. El contenido pesa del orden de 1 MB (el ADR 0004 estimó 1,07 MB, y un `curriculum.json` generado el 2026-10-04 pesaba 1.357.065 bytes, con sangría; el spike lo mide), así que sin él el margen sería de más de 1 MB y un import estático del JSON pasaría. *Mitigación:* el oráculo de ausencia y el tope medido (FR-015).
5. **El costo está en los checks, no en la compuerta.** 15 checks cargan los catálogos evaluando los adaptadores, y otros consumidores importan el Atlas. *Mitigación:* un solo lugar que sabe cargarlos (`qa/lib/legacy-sources.ts`), `dump-globals` idéntico (FR-017) y ningún valor esperado cambia (FR-019).
6. **Coherencia entre el HTML y el contenido.** Son dos archivos con su propia caché, y Nginx no fija `Cache-Control` para los estáticos. Antes de FR-016, la vista previa montaba un HTML del host sobre una imagen con su propio contenido. *Mitigación:* la versión en el nombre del archivo (FR-011) y `dist/` entero en la imagen y en la vista previa (FR-016).
7. **Dependencia de la red en cada carga.** Es una regresión frente a hoy, que el ADR 0004 aceptó. Los enlaces con query recargan el documento (según el estándar; F1 lo mide, FR-004 de su spec) y vuelven a pedir el contenido. *Mitigación:* el estado de carga sin parpadeo (FR-010), la revalidación del navegador y la última copia de A3.
8. **Trabajo descartable.** El lector transitorio y el artefacto estático los retira A3. Es poco, y la compuerta, los estados de espera y de error y los oráculos se conservan.
9. **Integración con el épico del front.** A2 convierte la lista de imports de `frontend/src/app/main.tsx` en una secuencia de arranque, y cada vista portada seguirá editándola (la cadena legacy y `load-order-check`); F2 también toca los almacenes, los motores y el catálogo que A2 hace asíncrono. A2 va después de F1 y de las unidades 1 a 4 de F2 y antes de F3, y `main.tsx`, `package.json`, las configuraciones y la documentación las integra el agente principal. *Mitigación:* el plan lista qué supone de F2 y se replanifica antes de implementar si F2 entrega otra cosa.
10. **La red de E2E es de F1.** Los E2E que verifican A2 en un navegador real viven en la red de F1, que todavía no existe: si F1 se demora, A2 no empieza. *Mitigación:* A2 espera a F1; el plan nombra lo que A2 necesita de ella (los errores de consola y un viewport móvil).
11. **Contenido sin sesión.** Mientras exista el documento estático, el contenido se sirve sin sesión, igual que la API hasta C3 con el puerto sólo en `127.0.0.1`. El ADR 0004 (§1) exige autenticación para el contenido. C4 depende de A3, que retira el documento, así que el taller no se expone a Internet con él. *Mitigación:* A3 retira el documento también de la imagen web (plan, «Contrato de salida hacia A3 y C4»). La hoja de ruta todavía no lo anota en el alcance de A3: A2 sólo toca su propia fila, y el coordinador lo suma al integrar.
12. **Docker no se corrió al escribir esta spec.** Los caminos de la imagen, la vista previa y Nginx se prueban al implementar. `docker/compose.preview.yaml` fija el nombre de proyecto y el puerto 8765: correrlo desde otro worktree pisa la vista previa del checkout principal.

## Relación con el épico del front, A3, C3 y C2

- **Con el port del front** (`specs/front-react/roadmap.md`, en la rama del PR #16): A2 va después de F1 y de las unidades 1 a 4 de F2 y antes de F3, y no porta ninguna vista. Deja el arranque que después aloja el shell (FR-013) y el acceso tipado al contenido (FR-006), que es el catálogo asíncrono que el port necesita. El port no planifica un segundo cargador: cada vista portada recibe su porción del acceso tipado, por props desde su adaptador, en lugar de leer `window.*`. `load-order-check` cambia con cada port; A2 lo deja leyendo la secuencia de arranque.
- **Con A3:** A3 cambia la fuente y suma el protocolo completo del ADR 0006 §7 (la sesión primero, los validadores por porción, la comparación de `Content-Version`, el reintento con tope, la última copia y el aviso sin backend), y retira el documento estático y su lector. La hoja de ruta todavía no lo anota en el alcance de A3: A2 sólo toca su propia fila, y el coordinador lo suma al integrar. Lo que A3 retira, también de la imagen web, está en el plan («Contrato de salida hacia A3 y C4»).
- **Con C3:** mientras el front lea el documento estático, poner el contenido de la API detrás de la sesión no lo rompe. Las pantallas de acceso e invitación (F11) entran como una etapa previa del arranque (FR-013), que además borra `#invitacion=` de la URL antes de evaluar las vistas.
- **Con C2:** A2 usa sus huellas (`portions` y `documentHash`) y su versión (`Content-Version`) sin cambiarlas. C2 sigue entregada e inmutable.
- **Con los ADR:** A2 hace la mitad de «Entrega» del ADR 0004 (la compuerta y el HTML sin currículo) con las 17 porciones del ADR 0006, que reemplazan a `GET /api/content`.

## Assumptions

- A1 y C2 están entregados en `master`. A2 depende de A1, de F1 y de las unidades 1 a 4 de F2 (decisión del usuario del 2026-10-05) y no usa la API. F1 y F2 todavía no están entregadas: esta spec describe el código de `master` y lo que el épico del front promete de ellas, y el plan lo contrasta con la base de implementación en T001.
- El ADR 0006 está en estado «propuesta»: esta spec lo usa como base del protocolo de arranque (§7) y de las dependencias (§10), como pide la hoja de ruta, y lo dice acá.
- Las versiones son las de `package.json` y del lockfile: Vite 8.3.2 (Rolldown 1.2.12), `vite-plugin-singlefile` 2.3.3 y esbuild 0.28.2, con `target: 'es2020'`.
- Ni las seis vistas legacy ni `frontend/src/` escuchan `DOMContentLoaded`, `load`, `pageshow`, `visibilitychange` ni `beforeunload` (se buscó con `grep`), así que una evaluación tardía no pierde esos eventos. Las vistas leen `window.*` y la URL en el momento de evaluarse.
- No hay un requisito de funcionar sin conexión en una carga nueva: el ADR 0004 ya aceptó que el HTML no funcione solo ni con `file://`.
- Los mensajes de la compuerta van en español rioplatense, con voseo (constitución, principio VI).
- El port conserva aspecto, comportamiento, progreso, IDs y URLs: es un supuesto del épico que el usuario no corrigió. Si A2 lo contradijera, se corrige A2.
- La lista de 17 porciones es la de hoy. E1 la va a ampliar y A3 la va a tomar de `GET /api/session`.
- Esta spec se escribió sin Docker, sin descargas y sin correr `npm run build`. Lo que cita del spike sale de una sonda aparte, descrita arriba: corrió `vite build` sobre tres módulos de prueba, fuera del repositorio y con las dependencias ya instaladas.
- Playwright lo instala F1 (ADR 0008, sólo Chromium) y A2 corre sobre esa red. El ADR 0008 está en la rama del PR #16, con estado «propuesta» ahí; el usuario dio por aprobado Playwright el 2026-10-05. Esta spec lo usa como base y lo dice.
- El coordinador decide si servir un documento estático como puente necesita una enmienda al ADR 0004, cuyas «Alternativas» lo descartaron como destino. Esta spec lo trata como puente y no agrega un ADR.
- No vienen del pedido y son propuestas de la spec que el usuario no objetó: la coherencia de versión entre el HTML y el contenido (FR-011; su mecanismo, el nombre versionado del archivo, lo decidió el usuario el 2026-10-06 en Q6) y el estado de carga con umbral (FR-010). El oráculo de ausencia, el tope medido y el retiro de `dump-dist-globals` quedaron decididos en Q3 y Q4, y los marcadores del oráculo, en Q8.
- Dependencias de la hoja de ruta: A1 (entregado), F1 y F2 (unidades 1 a 4). A2 desbloquea A3 y, en el épico del front, F10 (aloja el shell en su arranque) y F11 (acceso, como etapa previa).

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q5 quedaron, con su decisión, en «Clarifications».

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se difiere la evaluación de las vistas legacy | Top-level await; `import()` encadenados desde un arranque asíncrono; una función de arranque exportada por cada vista; la salida estándar de Vite en chunks | `import()` encadenados, sujeto al spike. El top-level await lo rechaza el arnés de los checks (esbuild en IIFE). Una función por vista toca seis archivos legacy y los checks que los evalúan. Los chunks adelantan parte de C4 |
| Qué se difiere | Toda la cadena legacy; sólo los módulos que leen contenido al evaluarse | Toda la cadena, en el orden de hoy: no hay que demostrar qué módulo lee qué, y las restricciones de orden de la base se conservan |
| Forma del contenido estático | El documento tal cual; 17 archivos espejo de la API; el documento minificado | El documento tal cual: no cambia el generador, es un solo pedido y su sha256 es el `documentHash`. Las huellas de las porciones se comprueban proyectándolas. Los 17 archivos suman un cambio al generador y 17 pedidos para una fuente que A3 retira, y minificar rompe la igualdad de bytes |
| Cómo se detecta el contenido de otro build | No comprobarlo; una constante del build o una query; la versión en el nombre del archivo; verificar el hash de cada porción en el navegador | La versión en el nombre del archivo (Q6, decidido por el usuario): el servidor no tiene el de otro build y responde 404, y no exige un contexto seguro (el hash en el navegador sí lo exige). La compuerta compara además la versión que devuelve la fuente con la esperada, que es lo que hará A3 con `Content-Version` |
| Dónde se muestra el error | Dentro de `#main`; en una pantalla aparte | Dentro de `#main`: conserva el shell, el idioma y el foco |
| Qué pasa con los conteos fijos del menú | Dejarlos; derivarlos del contenido en la compuerta | Dejarlos: cambia un elemento visible con su propio oráculo, y E1 o el port lo resuelven al derivarlos del catálogo |
| Dónde vive el acceso tipado | Un `Content` en `shared`; una entidad `curriculum`; un almacén sin tipos en `shared` y el tipo `Content` en `app` | El almacén en `shared` y el tipo en `app`: `shared` no puede importar las entidades, una página no puede importar de `app` y el tipo del Atlas vive en una página (research.md, R5) |
| Qué se copia a la imagen y a la vista previa | Sólo el contenido, con el HTML aparte; `dist/` entero | `dist/` entero (Q7, decidido por el usuario), con los avisos de licencia que emite el build: el HTML y el contenido salen siempre del mismo build y C4 no tiene que reescribir nada (research.md, R4) |
