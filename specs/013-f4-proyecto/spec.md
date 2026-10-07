# Feature Specification: F4 · Proyecto, el port de la página y de sus hitos

**Feature Branch**: `013-f4-proyecto` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-07

**Status**: Borrador, con cuatro preguntas abiertas para el clarify (Q1 a Q4). Todavía sin plan, tareas ni análisis.

**Input**: Ítem **F4** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Proyecto»: portar la página de Proyecto y sus hitos a React, con los 10 IDs de hitos fijados y sin que el alumno note el cambio. Pedido del coordinador del 2026-10-07 (ver «Lo que pidió el usuario»). Depende de F2a, que ya está implementada en el PR #40 (rama `f2a/base`, todavía fuera de `master`): esta spec lee de ahí los almacenes con suscripción y la lista de IDs, y de `master` (`e87772d`) todo lo demás. Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md) (los dos aceptados), el [mapa del front legacy](../front-react/legacy-map.md), la [spec de F2](../009-f2-seams/spec.md) con los planes de [F2a](../009-f2-seams/plan.md) y de [F2b](../009-f2-seams/plan-f2b.md), y la [constitución](../../.specify/memory/constitution.md) 1.4.1. F2b se está implementando: lo que esta spec toma de ahí es un supuesto.

## Intención y alcance

**Lo que entendemos.** Hoy la página de Proyecto es una función de `frontend/app.js` (`renderProject`) que arma un texto HTML con el encabezado, un bloque con el contador «PROYECTO PERSONAL · n / 5 HITOS» y una terminal de ejemplo, cinco hitos con su casilla, su tarea, su criterio y su pista, y un enlace a la biblioteca. Los cinco hitos y sus textos son un arreglo del mismo archivo. Marcar una casilla lo atiende un delegado de `change` sobre `#main`, que alterna el ID del hito (`<idioma>-<sufijo>`, por ejemplo `rust-memory`) en el recorrido (`taller-learning-v1`), guarda y redibuja toda la vista. F4 la lleva a una página de React (`frontend/src/pages/project/`) que lee y escribe los hitos por `routeStore`, el almacén del recorrido que deja F2a, recibe el idioma por su adaptador y deja a `app.js` sin la página, sin el catálogo de hitos y sin la rama del delegado. Es un port: se conservan el aspecto, los textos, el teclado, las URL y el progreso guardado, y los 10 IDs de hitos, su orden y su texto no cambian. Lo último importa por D1: el servidor guarda cada hito como una marca de ruta (`route_marks`, tipo `milestone`), y un ID que cambie rompe esa sincronización, porque el servidor rechaza la marca con un ID que no conoce y rechaza entera la importación que lo trae. Es para el alumno, que no debe notar nada; para quien implementa el cliente de D1c; y para quien porta F3 y F9, que usan el mismo almacén. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el build del port servido, los 123 E2E que deja F2a (106 de F1 y 17 de A2) pasan completos y sin editarse, y los E2E nuevos de Proyecto, escritos antes contra el legacy, pasan sin editarse.
2. Marcar cada uno de los 10 hitos por la interfaz guarda el ID que fija el fixture compartido con el backend; la lista de F2a, el catálogo y ese fixture coinciden, y el backend no se toca.
3. Una comparación única entre el build de la base y el del port da 0 diferencias de DOM (salvo dos atributos que nadie lee) y 0 de estilo computado, en 7 estados de la página, 4 anchos y en impresión.
4. Las fixtures congeladas de progreso arrancan sin escribir, sin respaldar y sin avisar con la página abierta; cada alternancia escribe una vez; y el pie de la barra lateral dice lo que dice hoy, también cuando el guardado falla.
5. `app.js` ya no tiene `renderProject`, el arreglo de hitos ni la rama `data-milestone`; queda un adaptador con `mount` y `unmount`; y nada más cambia fuera de eso.
6. `build/curriculum.json`, `dist/content/` y el volcado de `dump-globals` conservan sus bytes, el HTML queda bajo el tope y su tamaño se informa.
7. Cada rotura deliberada de la lista de FR-031 la detecta la prueba prevista.

**Entra:**

- La página de Proyecto en `frontend/src/pages/project/`, con su modelo y su interfaz, y su adaptador mínimo en `frontend/src/app/legacy/`.
- El catálogo de los cinco hitos (sufijo, título, tarea, criterio y pista) en `entities/guide`, junto a la lista de IDs de F2a (Q1).
- El retiro de `app.js` de `renderProject`, del arreglo de hitos, de la entrada `proyecto` de `renderers` y de la rama `data-milestone` del delegado de `change`, en el mismo commit que el port; y el montaje y desmontaje de la página en `render()`.
- Los E2E de los flujos de Proyecto, con su Page Object en `qa/e2e/pages/` y su registro como fixture, escritos primero contra el legacy.
- Las specs de Vitest con Testing Library de la página y de su modelo.
- Las adaptaciones de los checks de `qa/` que cargan lo que se mueve: `route-milestones-check`, `app-shell-check` y su arnés, `boot-check`, `load-order-check`, `qa/lib/app-adapters.ts` y la lista de `legacy-views.ts`.
- Las reglas de CSS que sólo usa Proyecto (Q2) y la documentación que cambia con el port (`docs/architecture.md` y `qa/AGENTS.md`).

**Queda fuera:**

- **Los kits ZIP.** La página de Proyecto no descarga ninguno: su único consumidor es `systems.js`, en la parte «Llevátelo a un proyecto» de Sistemas (F5). `frontend/src/features/download-project-kit/` y su adaptador `register-project-kit.ts` no cambian. El pedido del coordinador los daba por parte de F4; se verificó en el código que no lo son (ver «Lo que pidió el usuario»).
- Cambiar un ID, el orden o el texto de un hito, incluida la pista del primero, que nombra a Rust también en la página de Go (Q4).
- Mover los textos de los hitos a `content/` y cualquier cambio de `build/curriculum.json` o de la API (Q1, opción B).
- Llevar algo de la página a la URL, rediseñarla, sumarle regiones vivas, animaciones o formularios.
- El shell: la barra lateral, el menú, el idioma, el toast y los diálogos son de `app.js` hasta F10; el router también.
- Las otras páginas de `app.js` (F3, F9 y F8) y lo que escriben sobre el mismo almacén: favoritos, pasos, notas, respuestas y temporizador.
- El cliente de sincronización (D1c): F4 sólo deja los hitos en el almacén sobre el que D1c se monta.
- Un debounce: la página no escribe por tecla.

**Sin hacer a propósito (YAGNI):** un store propio de la página (el estado es el del almacén); un hook o una feature genérica de «marcas del recorrido» antes de que F3 o F9 la pidan; una capa o un slice nuevos; un barrel; memoización; CSS Modules, Tailwind o estilos en línea; `dangerouslySetInnerHTML`; una raíz de React que persista entre vistas; un snapshot permanente del HTML o del estilo; un E2E de la importación o del borrado desde Método, que son de F8.

**Actores:** el alumno; quien porta (el usuario y los agentes que implementan); quien revisa el PR; el agente principal, que integra `frontend/src/app/main.tsx`, `package.json`, las configuraciones y la documentación; quien implementa D1c, que se monta sobre el mismo almacén; y quienes portan F2b, F3 y F9, con los que F4 comparte archivos.

## Cómo se demuestra que nada cambió

| Qué se demuestra | Con qué | Permanente |
| --- | --- | --- |
| La navegación, las recargas, las URL, el cambio de idioma y el arranque con progreso real | La red de F1 y los 17 E2E de A2, sin editar | Sí |
| El flujo de los hitos: marcar, teclado, recarga, idioma, almacenamiento bloqueado o con escritura fallida | E2E nuevos de Proyecto con su Page Object, escritos contra el legacy y en verde antes de portar | Sí |
| Los 10 IDs | La spec de F2a con los diez literales a mano, la spec del catálogo, `route-milestones-check` contra el fixture compartido, el E2E de los diez IDs y, del lado del backend, Pest | Sí |
| Qué muestra la página y cómo reacciona al almacén | Vitest con Testing Library, valores a mano | Sí |
| Que el DOM, el texto y el aspecto no cambiaron | La comparación única de FR-030, en el PR | No |
| Que cada prueba detecta algo | Las roturas deliberadas de FR-031, en el PR | No |
| Que el dist no cambió fuera del script | Los oráculos de bytes y el tope de tamaño (FR-032 y FR-033) | Sí |

## La página hoy, y lo que el port decide

Lo que sigue sale de leer `frontend/app.js` y los checks de `qa/`; nada se ejecutó (ver Assumptions).

| Hoy | En el port |
| --- | --- |
| El idioma activo elige el conjunto de cinco hitos y sus claves (`<idioma>-<sufijo>`). El contador cuenta sólo los del idioma activo. Los textos son los mismos para los dos idiomas | Igual. El adaptador pasa el idioma al montar, como el del Atlas (FR-008) |
| Alternar una casilla: alterna el ID en el recorrido, guarda (una escritura) y redibuja toda la vista; después devuelve el foco a la casilla sin mover el scroll | Una sola operación sobre `routeStore` que alterna y guarda una vez. La casilla sigue montada y conserva el foco (FR-009 y FR-012) |
| El `save()` de `app.js` refresca el pie `#save-label` («Guardado en este navegador» o «Exportá para conservar tu avance»); el redibujo lo repite | La página guarda por el almacén y no por el `save()` de `app.js`: el pie tiene que seguir diciendo lo mismo (FR-011) |
| Redibujar `#main` recrea los `<details>`: las pistas que el alumno abrió se cierran al marcar un hito (por lectura del código, no probado en un navegador) | Q3: reproducirlo o aceptar la diferencia (FR-014) |
| La rama `data-milestone` está en el delegado de **`change`** de `#main` (la hoja de ruta y el mapa la ubican en el de clic). El delegado resuelve contra todo el documento | Se retira en el mismo commit. Si quedara, el `change` nativo de la casilla llegaría a `#main` y alternaría una segunda vez (FR-022) |
| `render()` también desmonta las demás vistas, refresca campaña, sincroniza la barra lateral y actualiza el temporizador | Una alternancia ya no lo dispara. No cambia nada observable: los hitos no entran en la barra lateral ni en campaña, y esas funciones corren en cada navegación |
| `renderProject` trae los textos con `escapeHtml`; el bloque de la terminal depende de saltos de línea y de espacios exactos (`white-space: pre-wrap`) | React escapa; los saltos y los espacios de la terminal se conservan (FR-004) |
| `data-project-library` está en el enlace a la biblioteca y ningún código lo lee (`docs/refactor-roadmap.md` lo cuenta entre los restos) | Puede quedar fuera, igual que `data-milestone` (FR-004) |
| Los hitos y sus textos están dentro de `app.js`; los 10 IDs ya salieron: F2a los dejó en `entities/guide` (FR-027 de F2) | El catálogo pasa junto a esa lista (Q1) y las dos se atan por una spec (FR-017) |
| F1 cubre de Proyecto: que `#proyecto` abre y marca el menú, el arranque con el progreso real en las ocho vistas, el cambio de idioma desde `?basura=1#proyecto` y Atrás en el historial. **Ningún E2E marca un hito** (el plan de F2a lo dice: los hitos de las páginas de `app.js` los cubren `app-shell-check`, `boot-check` y las specs de cada almacén, y «ningún E2E se suscribe») | Los E2E nuevos de FR-027 |

## Preguntas abiertas para el clarify

Son cuatro, cada una con sus opciones y una recomendada. Se cierran en `/speckit-clarify` y la respuesta pasa a una sección Clarifications. Cada pregunta deja un marcador en el requisito que afecta (FR-018, FR-034, FR-014 y FR-015), y esos cuatro son los únicos; la plantilla de `/speckit-specify` dice tres y el coordinador permitió hasta cinco. Hasta que se respondan, los requisitos usan la opción recomendada como borrador.

### Q1. Dónde viven los textos de los hitos

**Contexto:** los cinco hitos (sufijo, título, tarea, criterio de «listo» y pista) están en el arreglo `milestones` de `app.js`, no en `content/guide/` ni en `GuideData`, y la página no lee hoy nada del currículo. F2a movió los 10 IDs a `entities/guide` y dejó los textos para F4. La hoja de ruta los manda a «la configuración de `entities/guide`»; el mapa (§6) deja abierta también `content/guide`. (FR-018)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Configuración de TypeScript en `entities/guide`, junto a la lista de IDs: cinco entradas y una función que arma la clave `<idioma>-<sufijo>`. `content/` no cambia | Es lo que dice la hoja de ruta. F4 sigue siendo un port del front: `build/curriculum.json`, `dump-globals`, `dist/content/` y la API conservan sus bytes, y no hay porción del contenido que pasar por el adaptador. Costo: los textos siguen en código y no en `content/`; pasarlos al contenido (con E1) queda para un ítem aparte |
| B | `content/guide/` (YAML), publicados en la porción `guide` y leídos con `getContent()`; el adaptador los pasa a la página por props | Los textos pasan a ser contenido como el resto, y la API los serviría. Costo: cambia el generador y su validación, los bytes de `curriculum.json` y de `dump-globals`, las huellas de las porciones y la versión del contenido, `GuideData`, el recurso `guide` de la API y su importación a MySQL con sus pruebas (C2 y C6). Deja de ser un port del front, rompe el criterio de bytes de FR-032 y sería un ítem propio, coordinado con el backend |
| Otra | Decir cuál | |

### Q2. Qué pasa con las reglas de CSS que sólo usa Proyecto

**Contexto:** están en `frontend/styles.css`: 14 reglas base (`.project-hero`, `.project-hero p`, `.project-hero h2`, `.project-hero .small-label`, `.terminal`, `.terminal .prompt`, `.milestones`, `.milestone`, `.milestone-head`, `.milestone-head h2`, `.milestone p`, `.milestone details`, `.milestone summary` y `.milestone details p`), cinco dentro de un bloque `@media (max-width: 590px)` (`.project-hero`, `.project-hero h2`, `.terminal`, `.milestone` y `.milestone-head h2`) y `.milestone` dentro de una regla de impresión que comparte con `.resource-card` y `.module`. Ninguna otra vista las usa (se buscó en las cinco hojas y en las fuentes). Las que comparte siguen en `styles.css` pase lo que pase: `.step-check` y `.recommendation-strip` (Recorrido), `.page-heading` (Biblioteca y Método), `.small-label` y `.eyebrow`. La hoja de ruta dice que estos ports «borran […] las reglas que ninguna otra vista usa», que el PR de un port «borra el JS y el CSS de su vista», y que F10 deja en `styles.css` sólo los tokens y las clases base; el Atlas ya tiene su hoja. F2b agrega bloques al final de `styles.css`. (FR-034)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Mover las reglas exclusivas, con las de 590 px y la de `.milestone` en impresión (que se parte de las otras dos), a una hoja de la página, sin cambiar un valor ni el orden relativo, e importarla donde ninguna regla cambie de lado respecto de lo que pisa | Cumple la hoja de ruta y reparte los movimientos entre los ports en lugar de dejarlos todos para F10. Se prueba como la unidad 8 de F2b: el mismo multiconjunto de reglas en el dist y el mismo estilo computado a 981, 850, 650 y 590 px y en impresión. Costo: el `<style>` del dist se reordena (su hash deja de ser un oráculo y lo reemplaza esa comparación), se parte una regla de impresión compartida y hay riesgo de cascada, que la comparación mide. F3 y F9 harían lo mismo con las suyas |
| B | Dejarlas en `styles.css` hasta F10, que mueve todas juntas | Costo cero ahora: el `<style>` del dist queda idéntico y no hay riesgo de cascada. Pero el PR no cumple «borra el […] CSS de su vista», y F10 hereda de golpe los movimientos de todas las páginas de `app.js` |
| Otra | Decir cuál | |

### Q3. Qué pasa con las pistas abiertas al marcar un hito

**Contexto:** hoy marcar una casilla redibuja toda la vista, así que las pistas que el alumno abrió («Necesito una pista», un `<details>`) se cierran, y el foco vuelve a la casilla. Una página de React no recrea los hitos: sin código extra, las pistas abiertas seguirían abiertas. Es una diferencia visible que ningún E2E de F1 fija. Se infiere de leer el código, no se probó en un navegador. (FR-014)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | El port reproduce el cierre y lo fija como `KNOWN DEFECT`, con su E2E escrito contra el legacy. No se corrige en F4: si después querés que las pistas sigan abiertas, es un cambio de comportamiento en su propio commit, con TDD y tu aprobación | Respeta «un port no cambia el comportamiento» y el precedente de `<body aria-pressed>` (F1 lo fija y quien lo arregle lo hace en su commit con TDD). Costo: unas líneas que reproducen un accidente para borrarlas después |
| B | El port deja abiertas las pistas abiertas y aprobás ahora esa diferencia: va en un commit propio, después del port, con TDD, y el PR la declara. No se escribe el E2E que fija el cierre | El código más simple. Costo: el port deja de ser «sin cambio observable» en este detalle, y la prueba nueva fija lo que pasa de ahí en adelante, no lo que había |
| Otra | Decir cuál | |

### Q4. La pista del primer hito en la página de Go

**Contexto:** los cinco hitos son los mismos para Rust y para Go, y la pista del primero dice «En Rust podés empezar con datos propios (String); explicá cada copia que hagas.». Un alumno de Go la lee en su página. Es un defecto de contenido que ya está en `master`; el port conserva los textos. (FR-015)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Conservarla tal cual y anotarla como hallazgo para quien edite el contenido (E1 o un cambio de contenido aparte) | Un port no cambia textos. Costo: el defecto sigue hasta entonces. Si se resuelve con textos por idioma, el catálogo cambia de forma y es un ítem propio |
| B | Corregirla en F4, en su propio commit con TDD: una frase neutral o un texto por idioma | Costo: es texto del curso, que redacta el dueño del taller; deja de valer «los textos no cambian» para esa pista; y un texto por idioma suma un campo al catálogo y a sus specs |
| Otra | Decir cuál | |

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta. Las fuentes «Coordinador» son el encargo de esta spec.

| Pedido | Fuente |
| --- | --- |
| Portar la página de Proyecto y sus hitos, con los 10 IDs de hitos fijados | Hoja de ruta, F4 |
| Es un port y no un rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso guardado, los IDs y las URL | Usuario, 2026-10-05; constitución, «El front no se rediseña» |
| El PR de un port abre con los E2E de su vista, escritos contra el legacy y en verde antes de portar; pasan sin editarse después | Usuario, 2026-10-05 (Q1 del clarify de F1); ADR 0008 |
| La red de F1 (106 E2E) y los 17 de A2 siguen en verde sin editar | Coordinador, 2026-10-07 |
| Los hitos se leen y se escriben por `routeStore`; los 10 IDs, su orden y su texto no cambian; D1 sincroniza los hitos en `route_marks`, así que un ID que cambie rompe la sincronización | Coordinador, 2026-10-07 |
| El contenido que use la página sale de `getContent()`, que sólo `app/` puede importar (F2-I6); la página lo recibe por su adaptador | Coordinador, 2026-10-07; plan de F2a, «Lo que A2, D1 y F3 a F9 toman de F2a» |
| Los kits siguen usando `features/download-project-kit`, sin reescribirla | Coordinador, 2026-10-07. **Verificado: la página de Proyecto no usa kits** (los usa Sistemas); FR-026 lo deja dicho |
| Qué se retira del legacy, qué adaptador mínimo queda y qué bytes del dist pueden cambiar | Coordinador, 2026-10-07 |
| Specs nuevas de Vitest con Testing Library, y fishery si hay fábricas; E2E con Page Object de los flujos de Proyecto | Coordinador, 2026-10-07; ADR 0008 |
| F4 hereda de F2a la spec de los 10 IDs de hitos y consume `routeStore` con un selector chico sobre la revisión | Plan de F2a, «Lo que A2, D1 y F3 a F9 toman de F2a» |
| F2b, F3 y F9 comparten `app.js` con F4 y se integran de a uno | Hoja de ruta, «Convenciones» y «Orden y paralelismo» |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición medida | Coordinador, 2026-10-07 |

## Acciones del usuario

| Cuándo | Acción |
| --- | --- |
| Antes del plan | Responder Q1 a Q4. El borrador usa la opción recomendada de cada una |
| Si F4 se integra antes que F3 y F9 | Permiso para la pila de DOM de la primera spec de componente: `jsdom` 30.1.2 y Testing Library (`@testing-library/react`, `dom`, `user-event` y `jest-dom`), 56 paquetes, unos 26,3 MB desempaquetados y 5,0 MB comprimidos (estimación del ADR 0008). Si F3 ya la instaló, F4 no pide nada |
| Si F4 necesita una fábrica y `fishery` no está instalada | Permiso para `fishery` 2.4.0: 2 paquetes, unos 0,19 MB (estimación del ADR 0008) |
| Con Q3, opción B | Aprobar la diferencia visible antes de que se implemente |

**Descargas previstas:** ninguna propia. React, react-dom y Zustand 5.0.15 ya están en el lockfile (F2a).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno marca y desmarca sus hitos y su avance queda guardado (Priority: P1)

Una alumna que estudia Rust abre «Mi proyecto», lee el primer hito y marca su casilla con el mouse o con la barra espaciadora: el contador pasa de «0 / 5» a «1 / 5». Recarga la página y la casilla sigue marcada; la desmarca y el contador vuelve a «0 / 5». Con el teclado, el foco queda en la casilla después de cada cambio.

**Why this priority**: es lo único que el alumno hace en la página y lo único que persiste: si falla, la página no sirve.

**Independent Test**: servir el build, abrir `#proyecto` con un navegador vacío, marcar, recargar y desmarcar, mirando el contador, el foco y el almacenamiento.

**Acceptance Scenarios**:

1. **Dado** `#proyecto` en Rust sin progreso, **cuando** se abre, **entonces** se ven los cinco hitos, numerados «01.» a «05.» con los títulos de hoy, y el contador «PROYECTO PERSONAL · 0 / 5 HITOS».
2. **Dado** lo anterior, **cuando** se marca «Un lugar para guardar cosas», **entonces** el contador dice «1 / 5», la casilla está marcada, `taller-learning-v1` tiene `rust-memory` en `milestones` y se hizo exactamente una escritura.
3. **Dado** un hito marcado, **cuando** se recarga la página, **entonces** sigue marcado (esto también descarta que el delegado de `app.js` alterne una segunda vez).
4. **Dado** un hito marcado, **cuando** se desmarca, **entonces** el contador baja y su ID sale de `milestones`.
5. **Dado** el foco en una casilla, **cuando** se pulsa la barra espaciadora, **entonces** se alterna, el foco sigue en esa casilla y la página no salta.
6. **Dado** «Necesito una pista», **cuando** se abre y se cierra con Enter, **entonces** el texto de la pista aparece y desaparece.
7. **Dado** el enlace «Encontralos en la biblioteca», **cuando** se activa, **entonces** la vista pasa a `#biblioteca` sin recargar el documento.

*Cubre: FR-008 a FR-013 y FR-027; SC-001, SC-002 y SC-006.*

---

### User Story 2 - Los 10 IDs de hitos quedan fijados y D1 puede sincronizarlos (Priority: P1)

Quien mantiene el backend y quien implementa el cliente de D1c necesitan que los diez IDs que se guardan (`rust-memory` a `go-network`) sean siempre los mismos: el servidor los guarda como marcas de ruta, rechaza la operación de sincronización con un hito que no conoce y rechaza entera (422) la importación que trae uno. F4 mueve el catálogo y deja que tres fuentes independientes y una prueba de punta a punta lo fijen.

**Why this priority**: un ID distinto no falla en el front: las marcas del alumno siguen en su navegador. Falla en el servidor, que rechaza cada operación y cada importación con ese ID, así que el avance no se sincroniza ni se importa y nadie lo nota hasta que alguien mira los rechazos.

**Independent Test**: correr la spec del catálogo, la de la lista de F2a, `route-milestones-check` y el E2E que marca los diez hitos; después, una rotura deliberada de un sufijo.

**Acceptance Scenarios**:

1. **Dado** el catálogo, **cuando** se arman las claves de los dos idiomas, **entonces** son, en este orden, las diez de `qa/fixtures/shared/route-milestones.json`: `rust-memory`, `rust-commands`, `rust-files`, `rust-measure`, `rust-network`, `go-memory`, `go-commands`, `go-files`, `go-measure` y `go-network`.
2. **Dado** `route-milestones-check`, **cuando** corre, **entonces** lee la definición real por import (no el texto de `app.js`), la compara con el fixture compartido y pasa.
3. **Dado** cada uno de los diez hitos, **cuando** se marca por la interfaz, **entonces** `milestones` guarda exactamente el ID del fixture compartido.
4. **Dada** una rotura deliberada (un sufijo renombrado o dos hitos intercambiados), **cuando** corren las pruebas, **entonces** falla al menos la spec del catálogo y el E2E de los diez IDs.
5. **Dado** el backend, **cuando** corre Pest, **entonces** `RouteMilestones::KEYS` y el fixture compartido siguen siendo los mismos: F4 no los edita.

*Cubre: FR-016 a FR-021; SC-003 y SC-007.*

---

### User Story 3 - Cada idioma lleva su avance y el progreso guardado arranca intacto (Priority: P1)

Un alumno que estudia Rust y Go ve en cada idioma sus propios hitos. Con el progreso real que escribió `master` (idioma Go y un hito `rust-memory` marcado), la página abre sin escribir nada y muestra Go con «0 / 5»; al pasar a Rust, el primer hito aparece marcado.

**Why this priority**: el progreso guardado es contrato (ADR 0003) y este caso mezcla idiomas, que es donde un port se equivoca de prefijo.

**Independent Test**: sembrar la fixture congelada de almacenamiento, abrir `#proyecto`, mirar las escrituras y cambiar de idioma; y repetirlo con el almacenamiento bloqueado y con un `setItem` que falla.

**Acceptance Scenarios**:

1. **Dada** la fixture `qa/fixtures/progress-master-2a278ad-storage.json` (Go activo y `rust-memory` marcado), **cuando** se abre `#proyecto`, **entonces** dice «0 / 5», ninguna casilla está marcada y no hubo una escritura, un respaldo ni un aviso.
2. **Dado** lo anterior, **cuando** se cambia a Rust, **entonces** dice «1 / 5» y el primer hito está marcado.
3. **Dado** un hito marcado en Rust, **cuando** se cambia a Go y se marca `go-memory`, **entonces** el almacenamiento tiene los dos IDs y al volver a Rust el contador sigue en «1 / 5».
4. **Dado** el almacenamiento bloqueado, **cuando** se marca un hito, **entonces** la casilla y el contador cambian (en memoria) y el pie sigue pidiendo exportar.
5. **Dado** un `setItem` que falla a mitad de sesión, **cuando** se marca un hito, **entonces** la casilla y el contador cambian y el pie pasa de «Guardado en este navegador» a «Exportá para conservar tu avance».
6. **Dado** un progreso guardado con un ID que el catálogo no tiene, **cuando** se abre la página, **entonces** ese ID no aparece ni se cuenta (lo descartó la lectura, con su respaldo y su aviso de hoy).

*Cubre: FR-003, FR-008, FR-011 y FR-027; SC-005 y SC-006.*

---

### User Story 4 - La página se ve, se lee y se maneja igual (Priority: P1)

Un alumno que usaba la página antes del port no nota diferencia: los mismos textos, el mismo aspecto en escritorio, en móvil y al imprimir, el mismo teclado y las mismas URL.

**Why this priority**: es el criterio de todo port. Si algo se ve distinto, F4 dejó de ser un port y pasó a ser un rediseño.

**Independent Test**: la comparación única entre el build de la base y el del port, en siete estados de la página, cuatro anchos y en impresión.

**Acceptance Scenarios**:

1. **Dado** cada uno de los siete estados, **cuando** se compara el árbol de `#main` entre la base y el port, **entonces** es el mismo salvo `data-milestone` y `data-project-library`.
2. **Dados** los cuatro anchos y la impresión, **cuando** se compara el estilo computado de cada elemento, **entonces** no hay diferencias.
3. **Dado** el bloque de la terminal, **cuando** se lee su texto, **entonces** conserva los saltos de línea y los espacios de hoy.
4. **Dadas** pistas abiertas, **cuando** se marca un hito, **entonces** pasa lo que decida Q3 (con el borrador, se cierran, como hoy).
5. **Dado** el hash `#proyecto`, **cuando** se entra por el menú, por el historial o por un enlace, **entonces** la vista, el foco de `#main` y las URL son las de hoy.

*Cubre: FR-004, FR-012 a FR-015, FR-030 y FR-034; SC-004.*

---

### User Story 5 - El legacy se retira sin doble manejo y queda un adaptador mínimo (Priority: P2)

Quien revisa el PR ve que `app.js` perdió la página, el catálogo y la rama del delegado en el mismo commit, y que queda un adaptador con dos métodos que sólo monta y desmonta.

**Why this priority**: una página portada en su lugar, con atributos y clases iguales, sufre doble manejo (mapa, §3.1): el clic se anula o el estado se pisa sin que nadie lo vea.

**Independent Test**: buscar en `app.js` los nombres retirados, correr «marcar, recargar y seguir marcado» y correr los checks de `qa/` adaptados.

**Acceptance Scenarios**:

1. **Dado** `app.js`, **cuando** se buscan `renderProject`, el arreglo de hitos y `data-milestone`, **entonces** no aparecen.
2. **Dado** un clic en una casilla, **cuando** el evento llega a `#main`, **entonces** ningún delegado de `app.js` lo atiende y el hito se alterna una sola vez.
3. **Dado** el adaptador, **cuando** se lee, **entonces** publica `mount` y `unmount`, no importa `getContent()` ni valores de `entities/guide`, y no crea otro global.
4. **Dados** los checks de `qa/`, **cuando** corren, **entonces** los escenarios retirados de `app-shell-check` tienen su correspondencia y `route-milestones-check`, `boot-check` y `load-order-check` pasan.
5. **Dados** los kits ZIP, **cuando** se mira el diff, **entonces** `features/download-project-kit` y `register-project-kit.ts` no cambian.

*Cubre: FR-022 a FR-026 y FR-029; SC-008 y SC-010.*

---

### User Story 6 - Quien porta tiene la red y las specs, y el PR se integra de a uno (Priority: P2)

Los E2E nuevos pasan primero contra el legacy; las specs de Vitest con Testing Library fijan qué muestra la página y cómo reacciona al almacén; y el PR entra antes o después de F2b, F3 y F9 sin pisarlos.

**Why this priority**: sin esa red, el port no demuestra que no cambió nada, y cuatro ítems tocan `app.js`.

**Independent Test**: correr los E2E contra el commit anterior al port y contra el port; montar la página con un almacén en memoria y cambiarlo desde afuera; aplicar cada rotura deliberada; rebasar sobre lo que ya entró.

**Acceptance Scenarios**:

1. **Dado** el commit con los E2E y su Page Object, **cuando** corren contra el legacy, **entonces** pasan; y después del port pasan sin editarse.
2. **Dada** la página montada con el almacén abierto sobre un almacenamiento en memoria, **cuando** el almacén cambia por otra vía (importar o «Borrar todo»), **entonces** la página muestra el cambio; y al desmontarla no queda una suscripción.
3. **Dado** el árbol integrado, **cuando** se aplica cada rotura deliberada de FR-031, **entonces** falla la prueba prevista.
4. **Dado** el dist, **cuando** se compara con el de la base, **entonces** sólo cambió el script (y, según Q2, el orden de las reglas del `<style>`), y `html.length` queda bajo el tope.
5. **Dados** F2b, F3 o F9 integrados antes, **cuando** F4 se rebasa, **entonces** sus cambios en `app.js` son sólo los suyos y la suite sigue en verde.

*Cubre: FR-001, FR-027 a FR-033 y FR-035 a FR-037; SC-001, SC-002, SC-007, SC-009, SC-011 y SC-012.*

---

### Edge Cases

- **Almacenamiento bloqueado:** la página abre, alterna en memoria y el pie pide exportar, como hoy (F1 fija el arranque; F4 suma la alternancia).
- **Un `setItem` que falla a mitad de sesión:** la carga no escribe, así que el pie arranca en «Guardado en este navegador» y cambia en el primer guardado que falla. Es el caso que distingue un pie que se actualiza de uno que no (FR-011).
- **Otra pestaña guardó entre dos escrituras:** la fusión es la de hoy (ADR 0003, decisión 9): une los conjuntos, así que un hito que se desmarcó acá puede volver si la otra pestaña lo tenía marcado. D1 lo cambia con lápidas; F4 no.
- **Un ID guardado que el catálogo no tiene** (por ejemplo `go-inexistente`): la lectura lo descarta al cargar, con su respaldo y su aviso; la página nunca lo ve ni lo cuenta.
- **Hitos de un idioma con el otro activo:** no cuentan ni se muestran marcados (la fixture de master: Go activo y `rust-memory`).
- **Cambiar de idioma con la página abierta:** el shell la remonta con el otro conjunto, y desde `?basura=1#proyecto` deja `#proyecto` sin query (F1 lo fija; no cambia).
- **Dos clics seguidos sobre la misma casilla:** dos alternancias, dos escrituras y el estado final de hoy.
- **Volver con Atrás a `#proyecto`:** la página se monta de nuevo y lee del almacén; no guarda estado propio, salvo las pistas abiertas (Q3).
- **El almacén cambia con la página montada** (importar, «Borrar todo» o, con D1c, un cambio remoto): la página lo muestra, porque lee el progreso en cada render y se suscribe a la revisión.
- **Imprimir:** cada hito evita cortarse entre páginas, por la regla de impresión que comparte con la biblioteca y el recorrido.
- **Montar la página antes de `startApp()`:** no ocurre, porque sólo la monta `render()` de `app.js`; con el almacén sin abrir, `routeStore` lanza (F2a).
- **La pista del primer hito nombra a Rust en la página de Go:** se conserva (Q4).

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de todo port**

- **FR-001**: El port DEBE entregarse como un PR revertible entero, que devuelve la página legacy, con los commits en este orden: (1) los E2E de Proyecto y su Page Object, contra el legacy y en verde; (2) las specs nuevas de Vitest, en rojo y por la razón esperada; (3) la implementación mínima y el retiro del legacy, con las adaptaciones de los checks de `qa/` y las ramas de `app.js` en el mismo commit, para que cada commit deje la suite en verde; (4) la documentación. Un cambio de comportamiento (Q3, opción B; Q4, opción B) va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, «Convenciones»; ADR 0008; constitución, principio II)*
- **FR-002**: Los 123 E2E que deja F2a (106 de F1 y 17 de A2) DEBEN pasar antes de empezar y después de portar, contra el build servido y sin editar ninguno de sus escenarios. Si el port obliga a editar uno, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, criterios de aceptación globales)*
- **FR-003**: El progreso guardado, los IDs y las URL NO DEBEN cambiar (ADR 0003): las cuatro claves, el campo `version: 1`, las ranuras de respaldo y la forma de la exportación quedan como están. Con las fixtures congeladas de `qa/fixtures/progress-*.json`, el arranque con la página abierta no escribe, no respalda ni avisa. `#proyecto` y el enlace a `#biblioteca` llevan adonde llevaban, sin recargar el documento. *(Hoja de ruta; `qa/AGENTS.md`)*
- **FR-004**: El alumno NO DEBE ver nada distinto. La página DEBE producir el mismo árbol que `renderProject`: los mismos elementos en el mismo orden, con las mismas clases, roles, nombres accesibles, textos y espacios (incluidos los de la terminal), para los dos idiomas y para cualquier conjunto de hitos marcados; las casillas se comparan por su estado y no por su atributo. Las únicas diferencias admitidas son `data-milestone` y `data-project-library`, porque ningún código las lee tras el port. Cualquier otra es un defecto del port o un cambio de comportamiento (FR-001). *(Constitución, «El front no se rediseña»)*
- **FR-005**: F4 NO DEBE agregar dependencias de runtime ni estilos en línea (`style=`, `setAttribute('style', …)` ni `cssText`, los seis sitios que cuenta C4), ni usar `dangerouslySetInnerHTML`; NO DEBE sumar funciones de complejidad ciclomática mayor que 10 sin justificarlo en la revisión (`render()` de `app.js` ya tiene 11 según el mapa: sumarle el montaje de la página la empeora, y el plan lo justifica o lo evita sin reescribir el resto); y los avisos de complejidad de hoy no suben. *(AGENTS.md; `docs/architecture.md`; C4, borrador)*
- **FR-006**: Nada por debajo de `app` DEBE importar `getContent()` (F2-I6): la página, su modelo y sus specs reciben lo que necesiten del contenido por props, desde su adaptador de `frontend/src/app/legacy/`, como el Atlas. Hoy la página no lee ninguna porción del currículo: con Q1 = A, el adaptador sólo le pasa el idioma. *(Plan de F2a, F2-I6; R5 del guard de F2b)*

**La página**

- **FR-007**: La página DEBE vivir en `frontend/src/pages/project/` (modelo e interfaz), exponer una API pública pequeña (el componente de la página), importar sólo de su slice y de capas inferiores (`entities/guide` y `shared`) y no atravesar los internals de otro slice. No suma capas, barrels ni carpetas por anticipado. Los nombres de módulos y de exports son provisionales y los confirma el plan. *(`docs/architecture.md`, «Feature-Sliced Design incremental»)*
- **FR-008**: La página DEBE mostrar los cinco hitos del idioma activo, que el shell le pasa al montar (como el Atlas), con la clave `<idioma>-<sufijo>`. Cambiar de idioma la remonta (lo hace el shell) con el otro conjunto y su propio avance, sin tocar el del otro idioma. El número del contador cuenta sólo los hitos marcados del idioma activo: con la fixture de master, Go activo y `rust-memory` marcado dan «0 / 5».
- **FR-009**: Alternar un hito DEBE ser una sola operación sobre `routeStore`: alterna el ID en `milestones`, guarda una vez (una escritura de `taller-learning-v1` y una revisión) y NO DEBE cambiar ningún otro campo ni otra clave. Nunca se muta el progreso sin guardar, porque el cliente de D1c se entera de un cambio por la revisión. *(F2a, FR-023 y FR-026 de F2)*
- **FR-010**: La página DEBE leer el progreso con `routeStore.getProgress()` en cada render y suscribirse sólo a la revisión, con `useStore(routeStore.changes, (state) => state.revision)` o un selector igual de chico, nunca al store completo ni a un valor derivado. NO DEBE conservar una copia del progreso que pueda divergir: un guardado puede reemplazar el estado por la fusión con lo que escribió otra pestaña. Un cambio hecho por otra vía (importar, «Borrar todo» o, con D1c, un cambio que llega del servidor) DEBE verse en la página montada, y al desmontarla DEBE liberarse la suscripción. El compilador no impide `useStore(store)` sin selector: lo vigila la revisión de código (o la regla de lint que F3 agregue). *(Plan de F2a, «Lo que A2, D1 y F3 a F9 toman de F2a»; `AGENTS.md`)*
- **FR-011**: Después de que la página guarda, el pie de la barra lateral (`#save-label`) DEBE mostrar lo mismo que hoy: «Guardado en este navegador» si la escritura funcionó y «Exportá para conservar tu avance» si falló. Hoy lo refresca el `save()` de `app.js`, que la página ya no llama. El mecanismo lo elige el plan y lo comparte con F3 y F9, que guardan igual (FR-036).
- **FR-012**: La casilla DEBE seguir siendo una casilla nativa: la barra espaciadora la alterna, el foco queda en ella después de alternar y la página no se desplaza, como hoy. El enlace, la casilla y el resumen de cada pista siguen en el orden de tabulación de hoy, y «Necesito una pista» se abre y se cierra con Enter o con la barra espaciadora. Al entrar a `#proyecto`, el foco de `#main` y el scroll son los de hoy.
- **FR-013**: La página NO DEBE sumar regiones vivas, roles ni cambiar el nivel de ningún encabezado: hoy el contador no se anuncia. El diseño móvil (el bloque de 590 px), la impresión y el movimiento reducido NO DEBEN cambiar: la página no suma animaciones ni transiciones.
- **FR-014**: Las pistas que el alumno abrió DEBEN comportarse al marcar un hito como decida Q3. **[NEEDS CLARIFICATION: Q3, si el port reproduce el cierre de hoy o acepta que sigan abiertas]** Con el borrador (opción A), se cierran, y un E2E llamado `KNOWN DEFECT` lo fija contra el legacy.
- **FR-015**: Los textos de la página (el encabezado, el bloque del contador, la terminal, los cuatro textos de cada hito y el enlace) DEBEN ser los de hoy, carácter por carácter, incluida la pista del primer hito, que nombra a Rust también en Go. **[NEEDS CLARIFICATION: Q4, si la pista del primer hito se corrige en F4 o se conserva]** Con el borrador (opción A), se conserva y se registra como hallazgo.

**Los hitos y sus IDs**

- **FR-016**: Los 10 IDs, su orden y la forma de la clave (`<idioma>-<sufijo>`) NO DEBEN cambiar: Rust primero y después Go, y en cada idioma `memory`, `commands`, `files`, `measure` y `network`. Cambiar uno es una migración del progreso (ADR 0003) y un ítem aparte, nunca parte de F4. Tampoco cambia el texto de ningún hito (FR-015).
- **FR-017**: Los sufijos y su orden DEBEN tener una sola definición en el código, atada por una spec con los diez literales escritos a mano a la lista `MILESTONE_IDS` de `entities/guide`. La spec de F2a que ya la fija (`milestone-ids.spec.ts`) no se edita y sigue pasando; el plan elige si la lista se deriva del catálogo o al revés. Dos listas que pueden divergir no se aceptan. *(FR-027 de F2)*
- **FR-018**: El catálogo de los cinco hitos (sufijo, título, tarea, criterio y pista) DEBE vivir en `entities/guide`, junto a esa lista, y la página lo importa de ahí. **[NEEDS CLARIFICATION: Q1, si los textos quedan como configuración de `entities/guide` o pasan a `content/guide`]** Con el borrador (opción A), no es contenido de `getContent()` y `content/` no cambia.
- **FR-019**: `qa/route-milestones-check.ts` DEBE leer la definición real por import (`importModule` de `qa/lib/sources.ts`) y no el texto de `app.js`: hoy busca ahí `const milestones = [` y las líneas `id:`, y al mover el arreglo dejaría de encontrarlo; DEBE seguir comparándola con `qa/fixtures/shared/route-milestones.json`, que queda idéntico byte a byte (Pest lo lee con `MergeFixture::routeMilestones()`); y NO DEBE retirarse (ADR 0008, §5). Cambia cómo carga, no qué espera. *(`qa/AGENTS.md`, fila de hitos del recorrido)*
- **FR-020**: La spec DEBE dejar dicho qué rompería un ID que cambie, y F4 NO DEBE editar ninguno de esos lugares: `RouteMilestones::KEYS` y su prueba (`RouteMilestonesTest`); `ContentLookup`, que rechaza (`UnknownReference`) la operación de sincronización con un hito que no está en esa lista; `LegacyDecoder::knownIds`, que rechaza con 422 (`unknown_id`) una importación que trae uno; `route.mark.milestone` en `FieldKinds.php` y en `frontend/src/features/progress-sync/model/field-kinds.ts`; la columna `route_marks.item_key`; `parseRouteProgress` de `entities/guide`, que descarta lo que no está en la lista del front; y las fixtures congeladas que traen `rust-memory`. *(D1a y D1b)*
- **FR-021**: Un E2E DEBE marcar por la interfaz cada uno de los diez hitos y verificar que `milestones` de `taller-learning-v1` guarda exactamente el ID que lista el fixture compartido, que el E2E lee como contrato congelado (no el catálogo ni la lista del código), y que ninguna de las otras tres claves cambia.

**Qué sale de `app.js` y qué adaptador queda**

- **FR-022**: `app.js` DEBE perder, en el mismo commit que el port: `renderProject`, el arreglo de hitos, la entrada `proyecto` de `renderers` (pasa a `() => ''`, como las otras vistas que se montan) y la rama `data-milestone` del delegado de **`change`** de `#main` (la hoja de ruta y el mapa la ubican en el de clic; está en el de `change`). Si quedara, el `change` nativo de la casilla llegaría a `#main` y alternaría el hito dos veces. Proyecto no tiene ramas en los delegados de clic y de `input` ni en el intervalo del temporizador.
- **FR-023**: `render()` DEBE desmontar la página junto con las otras vistas y montarla, con el idioma activo, cuando la vista es `proyecto`. `app.js` NO DEBE conservar nada más de la página. `toggleItem` y `escapeHtml` siguen en `app.js`: otras páginas legacy los usan hasta F3, F8 y F9.
- **FR-024**: El adaptador mínimo DEBE ser un `window.Taller*` publicado por un módulo de `frontend/src/app/legacy/`, con sólo `mount` y `unmount`, hasta que F10 retire `app.js`. Recibe el idioma y no el `toast` (la página no avisa), crea una raíz de React sobre `#main` en cada montaje y la desmonta, como el del Atlas, y no guarda estado de módulo. NO DEBE importar valores de `entities/guide` (R4 del guard: su dueño es `app.js`) ni `getContent()`; importa sólo el índice de la página (R6). El nombre del global y del módulo es provisional: no debe confundirse con `register-project-kit.ts` ni con `TallerProjectKit`.
- **FR-025**: La lista de `frontend/src/app/boot/legacy-views.ts` DEBE cargar el adaptador antes de `app.js`; `qa/load-order-check.ts` DEBE sumar esa restricción, con su motivo (`render()` llama a `mount()` sin guarda opcional en la vista `proyecto`, como con el Atlas), sin relajar ninguna otra; y `qa/lib/app-adapters.ts` DEBE sumar el global con sus dos métodos, de donde salen los fakes de `app-shell-check` y lo que `boot-check` exige a los adaptadores reales; el arnés `qa/lib/app-shell-harness.ts` suma su entrada de comportamientos, vacía como la del Atlas, porque sus fakes se tipan por esa lista. *(A2, F2-I4)*
- **FR-026**: F4 NO DEBE tocar `features/download-project-kit` ni `register-project-kit.ts`: la página de Proyecto no ofrece kits y su único consumidor es `systems.js`. Si una versión futura de la página los usara, usaría esa feature como está.

**Pruebas**

- **FR-027**: Los E2E de Proyecto DEBEN vivir en una spec de `qa/e2e/specs/`, con un Page Object en `qa/e2e/pages/` registrado como fixture en `qa/e2e/fixtures/index.ts`, con localizadores por nombre accesible. Los valores esperados salen del contrato: los títulos de hoy, el fixture compartido y las fixtures congeladas. DEBEN cubrir, como mínimo, estos 13 escenarios: (1) los cinco hitos de Rust, en orden, con su contador; (2) los de Go; (3) marcar un hito: contador, ID guardado y una sola escritura; (4) desmarcar; (5) recargar con un hito marcado; (6) la barra espaciadora y el foco que queda; (7) Enter sobre «Necesito una pista», que abre y cierra; (8) las pistas abiertas al marcar un hito, según Q3; (9) Rust y Go con avance separado; (10) la fixture congelada de master, con «0 / 5» en Go y «1 / 5» en Rust, sin escribir al abrir; (11) los diez IDs, uno por hito, contra el fixture compartido; (12) el almacenamiento bloqueado y un `setItem` que falla a mitad de sesión, con el pie; (13) el enlace a la biblioteca, sin recargar el documento. Pueden sumar a las fixtures y a los Page Objects de F1 lo que necesiten (por ejemplo, un control de escrituras que fallan), sin cambiar lo que hacen las specs de F1 y de A2.
- **FR-028**: Las specs nuevas DEBEN ser de Vitest con Testing Library (los componentes) y de Vitest en `node` (el modelo), con nombres y código en inglés y valores escritos a mano. El almacén se abre sobre un almacenamiento en memoria (la interfaz `StorageLike`); los modelos puros son los reales. Cubren como mínimo: el orden y los títulos de los cinco hitos y las diez claves; el contador por idioma y con marcas del otro idioma; alternar, que guarda una vez y deja el almacenamiento con el ID; que la página refleja un cambio que llega por otra vía; que al desmontarla no queda una suscripción; que una escritura que falla deja el estado en memoria; y el texto exacto de la terminal. Se usa `fishery` sólo si hace falta una fábrica del progreso del recorrido, y esa fábrica la comparten F3, F4 y F9 (FR-036). Cada spec falla antes de la implementación por la razón esperada, y ninguna se vale del mismo algoritmo que prueba. *(ADR 0008; `qa/AGENTS.md`)*
- **FR-029**: Cada check de `qa/` que F4 adapte DEBE cambiar sólo cómo carga el código, no sus valores esperados, y el PR DEBE listar la correspondencia de lo que retira (ADR 0008, §5). `app-shell-check` retira sus dos escenarios «g) hitos» (los cinco hitos del idioma activo y el contador con los marcados, que quedan cubiertos por la spec de la página y por los E2E 1 a 3 y 9); los demás escenarios, incluidos los que usan `#proyecto` sólo como vista inicial, pasan sin editarse. `boot-check` pasa `proyecto` de la comprobación por `innerHTML` a la de nodos montados, como el Atlas, sin cambiar sus otros valores esperados. Ningún check se retira por adelantado.
- **FR-030**: El PR DEBE informar una comparación única, no permanente, entre el build de la base y el del port: el árbol de `#main` de `#proyecto` en siete estados (cada idioma sin hitos, con el primero marcado y con los cinco marcados, más el de la fixture congelada de master: Go activo y `rust-memory`) y el estilo computado de cada elemento de la página en cada estado a 981, 850, 650 y 590 px y en impresión (35 capturas), con los textos de los cuatro campos de cada hito. Se corre con un script descartable fuera del repositorio, sobre un worktree del commit base, como las comparaciones únicas de F2, y las cantidades van en la descripción del PR. Se espera 0 diferencias, salvo los dos atributos de FR-004. *(FR-011 de F2; F1 mide a 981, 850, 650 y 590 px)*
- **FR-031**: Sobre el árbol integrado, cada una de estas roturas deliberadas DEBE hacer fallar la prueba prevista, y el PR las informa con su resultado: (1) renombrar un sufijo del catálogo; (2) intercambiar dos hitos; (3) fijar el prefijo `rust-` al alternar; (4) dejar la rama `data-milestone` en `app.js` junto con el atributo en la página; (5) alternar sin guardar; (6) guardar dos veces por alternancia; (7) no actualizar el pie tras un guardado que falla; (8) perder los saltos de línea de la terminal; (9) con Q3 = A, no cerrar las pistas.

**Bytes, tamaño y CSS**

- **FR-032**: Respecto de la base, `dist/` DEBE cambiar sólo en el script en línea (la página, su adaptador, el catálogo y lo que sale de `app.js`) y, si Q2 = A, en el orden de las reglas del `<style>`. DEBEN conservar sus bytes: `build/curriculum.json` y `dist/content/curriculum.<versión>.json` (con Q1 = A), el volcado de `node tools/content/dump-globals.ts .` y lo que comprueba `qa/dist-content-check.ts`, el marcado del documento (el HTML con los scripts y el estilo vaciados) y `frontend/src/index.html`. El script sigue siendo uno solo y no suma `import(` ni `import.meta` respecto de la base. *(A2; plan de F2a, §0.2)*
- **FR-033**: `dist/index.html` DEBE quedar bajo el tope vigente de `qa/build-check` y su tamaño (`html.length`) DEBE informarse antes y después. Con A2, el tope es de 1 250 000 caracteres y el HTML pesa unos 1 136 700; la hoja de ruta todavía dice 2 500 000, que quedó viejo. El único código nuevo de librería que entra es el binding de React de Zustand, por `useStore`, y se mide; el tope propio de F4 lo fija el plan con la medida de su base.
- **FR-034**: Las reglas de CSS que sólo usa Proyecto DEBEN tratarse como decida Q2. **[NEEDS CLARIFICATION: Q2, si las reglas exclusivas se mueven a una hoja de la página o quedan en `styles.css` hasta F10]** Con el borrador (opción A), se mueven sin cambiar un valor ni el orden relativo, junto con sus reglas de 590 px y la de impresión (que se parte de las compartidas); `.step-check`, `.recommendation-strip`, `.page-heading`, `.small-label` y `.eyebrow` se quedan; el dist conserva el mismo multiconjunto de reglas (ninguna perdida ni duplicada); y el estilo computado de FR-030 no cambia. Con la opción B, nada de esto aplica.

**Integración y documentación**

- **FR-035**: F4 DEBE integrarse de a uno con F2b, F3 y F9, que comparten `frontend/app.js`, `frontend/src/app/main.tsx`, `frontend/src/app/boot/legacy-views.ts`, `qa/lib/app-adapters.ts`, `qa/load-order-check.ts`, `qa/boot-check.ts`, `qa/e2e/fixtures/index.ts` y, según Q2, `frontend/styles.css`. Cada PR rebasa sobre lo que ya entró y toca sólo los cambios de su ítem. En `app.js`, la rama `data-milestone` queda al lado de la rama del paso (`stepCheck`) y de las de los filtros de F3 dentro del mismo delegado de `change`: el conflicto de texto lo resuelve quien integra, sin cambiar lo que hace el delegado para las otras páginas. *(Hoja de ruta, «Convenciones» y «Orden y paralelismo»)*
- **FR-036**: Lo que comparten F3, F4 y F9 DEBE crearlo el primero que se integre y los otros DEBEN reutilizarlo, sin duplicarlo ni reescribirlo: la operación de alternar un elemento de un conjunto del recorrido (hitos, favoritos y pasos); el mecanismo que mantiene el pie `#save-label` (FR-011); la pila de DOM de Vitest (`jsdom` y Testing Library, con su configuración de proyectos); y la fábrica de `fishery` del progreso del recorrido, si hace falta. Si F4 es el primero, deja la parte común con su spec y sin implementar los flujos de los otros.
- **FR-037**: El PR DEBE actualizar, en el mismo cambio, `docs/architecture.md` (la fila de la navegación y el recorrido, la de las páginas migradas y la lista de adaptadores) y la fila de hitos del recorrido de `qa/AGENTS.md`, y su título y su descripción van en inglés, con el problema completo (`AGENTS.md`). La hoja de ruta la edita el coordinador, no F4.

### Key Entities *(include if feature involves data)*

- **Hito:** una entrada del catálogo: sufijo, título, tarea, criterio de «listo» y pista. Los textos son los mismos para los dos idiomas.
- **Clave de hito:** `<idioma>-<sufijo>`, el ID que se guarda en `milestones` del recorrido y que el servidor guarda como marca de ruta de tipo hito. Son diez.
- **Lista de IDs (`MILESTONE_IDS`):** la que lee el almacén del recorrido para descartar lo desconocido; F2a la escribió a mano y la fijó con una spec.
- **Recorrido (`routeStore`):** el almacén singleton de `taller-learning-v1`, con la revisión de sus cambios. El progreso está en el almacén; el store de Zustand sólo lleva la revisión.
- **Revisión:** el contador local de cambios del almacén; vuelve a 0 al recargar. No es la revisión de la cuenta de D1.
- **Página de Proyecto:** el componente de `pages/project`, que lee el progreso del almacén y lo escribe por la operación de alternar.
- **Adaptador mínimo:** el `window.Taller*` con `mount` y `unmount` que `app.js` llama hasta F10.
- **Comparación única:** la corrida, una vez, que compara el build de la base con el del port sobre las mismas entradas; se informa en el PR.
- **Diferencias admitidas:** `data-milestone` y `data-project-library`, los dos atributos que ningún código lee tras el port.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el port servido, los 123 E2E que deja F2a (106 de F1 y 17 de A2) pasan: 0 escenarios editados y 0 fallas, antes y después.
- **SC-002**: Los E2E nuevos de Proyecto (los 13 escenarios de FR-027) pasan contra el legacy antes del port y contra el port después, con 0 escenarios editados.
- **SC-003**: Los 10 IDs: marcar cada hito por la interfaz guarda el ID del fixture compartido (10 de 10); la lista de F2a, el catálogo y el fixture coinciden (3 de 3); `qa/fixtures/shared/route-milestones.json` conserva su hash; y Pest no cambia.
- **SC-004**: La comparación única da 0 diferencias de árbol (salvo los 2 atributos admitidos) en los 7 estados y 0 de estilo computado en las 35 capturas, con los 20 textos de los hitos idénticos.
- **SC-005**: Con la fixture congelada de almacenamiento, abrir `#proyecto` da 0 escrituras, 0 respaldos y 0 avisos, y muestra «0 / 5» en Go y «1 / 5» en Rust; las 2 exportaciones congeladas se siguen importando con 0 omisiones.
- **SC-006**: Cada alternancia hace 1 escritura de `taller-learning-v1` y 1 cambio de revisión; 0 alternancias dobles (marcar, recargar y seguir marcado); y con un `setItem` que falla, el pie cambia a «Exportá para conservar tu avance».
- **SC-007**: Cada rotura deliberada de FR-031 (9, u 8 si Q3 = B) la detecta la prueba prevista: 9 de 9, u 8 de 8.
- **SC-008**: En `app.js` quedan 0 apariciones de `renderProject`, del arreglo de hitos y de `data-milestone`; hay 1 adaptador nuevo con 2 métodos y 0 globals más; y `features/download-project-kit` y `register-project-kit.ts` tienen 0 líneas de diff.
- **SC-009**: Los bytes: `build/curriculum.json`, `dist/content/curriculum.<versión>.json` y `dump-globals` son idénticos (3 de 3, con Q1 = A); el marcado del dist, también; y el `<style>` es idéntico o, con Q2 = A, tiene el mismo multiconjunto de reglas: 0 perdidas y 0 duplicadas.
- **SC-010**: El 100 % de los escenarios que se retiran de `app-shell-check` (2) figura en la correspondencia, y los demás pasan sin editarse; `route-milestones-check`, `boot-check` y `load-order-check` pasan.
- **SC-011**: `html.length` queda bajo el tope vigente de `qa/build-check` y su medida antes y después consta en el PR.
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, la imagen web sigue construyendo, y hay 0 avisos de complejidad nuevos, 0 estilos en línea nuevos y 0 dependencias de runtime nuevas.

## Riesgos

1. **Doble manejo del `change`.** La página vive dentro de `#main`, donde el delegado de `app.js` sigue escuchando: si queda la rama `data-milestone` junto con el atributo, un clic alterna dos veces y el hito queda como estaba. *Mitigación:* FR-022, el E2E de «marcar, recargar y seguir marcado» y la rotura 4 de FR-031.
2. **El pie de la barra lateral queda desactualizado.** Lo refresca el `save()` de `app.js`, no el almacén; una página que guarda por el almacén no lo toca. *Mitigación:* FR-011, el E2E con un `setItem` que falla y la rotura 7. Cuidado con cómo se prueba: la carga no escribe, así que un contexto donde `setItem` falla ya arranca en «Guardado…» y cambia recién en el primer guardado.
3. **Un ID cambia y D1 lo rechaza sin que falle nada en el front.** *Mitigación:* FR-016 a FR-021: tres fuentes independientes, un E2E de punta a punta y las roturas 1 a 3.
4. **`route-milestones-check` deja de encontrar los hitos.** Lee el texto de `app.js`; al mover el arreglo falla, o peor, un cambio de formato lo hace pasar en vacío. *Mitigación:* FR-019.
5. **Pistas abiertas.** Sin código extra, el port cambia el comportamiento visible (Q3). *Mitigación:* la pregunta, el E2E contra el legacy y FR-014.
6. **La cascada de CSS (Q2, opción A).** Mover una regla de lugar cambia qué pisa a qué. *Mitigación:* la comparación de estilo computado en cuatro anchos y en impresión, y el multiconjunto de reglas (FR-030 y FR-034).
7. **Un singleton en las specs de componente.** La página importa `routeStore`, que se abre una sola vez: una spec no puede abrirlo dos veces. *Mitigación para el plan:* un almacenamiento en memoria abierto una vez por archivo de spec y un `reset()` entre pruebas, o un reinicio de módulos; la fábrica `createRouteStore()` está permitida en las specs pero no en producción (R3).
8. **Conflictos de integración en `app.js`, `legacy-views.ts`, `app-adapters.ts` y los E2E compartidos.** *Mitigación:* FR-035 y FR-036; los PR entran de a uno.
9. **La pila de DOM llega con el primer port que la necesita.** Si F4 es ese port, hay permisos (jsdom y Testing Library; `fishery`). *Mitigación:* «Acciones del usuario» y FR-036.
10. **Un componente que se suscribe al store completo.** El compilador no lo impide. *Mitigación:* FR-010, la revisión de código y la regla de lint de F3, si la hay.
11. **El montaje de React es asíncrono.** Tras `render()` puede haber un cuadro con `#main` vacío, como con el Atlas, y los checks sobre el DOM falso tienen que esperar. *Mitigación:* el plan decide si el adaptador monta de forma síncrona; `boot-check` ya hace `flush()` con el Atlas.
12. **Nada se ejecutó al especificar.** Sin `npm`, Docker ni navegador: lo que dice esta spec del comportamiento (incluido el cierre de las pistas) sale de leer el código. *Mitigación:* los E2E contra el legacy son lo primero que corre, y confirman o desmienten cada fila de «La página hoy».
13. **El texto del curso.** La pista del primer hito nombra a Rust en la página de Go (Q4): un alumno de Go ve un defecto que el port no corrige. *Mitigación:* se registra como hallazgo.

## Relación con otros ítems

- **F1.** F4 arranca con la red de F1 en verde y la usa sin editarla (FR-002). F1 cubre de Proyecto el encabezado y el menú (`views.spec.ts`), el arranque con el progreso real en las ocho vistas (`startup-storage.spec.ts`), el cambio de idioma desde `?basura=1#proyecto` (`url-contract.spec.ts`) y el historial; ningún E2E marca un hito.
- **F2a** (PR #40, rama `f2a/base`). F4 toma de ahí lo que el plan de F2a promete a F3, F4 y F9:

  | Qué | Cómo lo usa F4 |
  | --- | --- |
  | `routeStore` (`getProgress`, `save`, `changes`) | Lee con `getProgress()` en el render, se suscribe a la revisión con un selector chico y guarda con `save()` (FR-009 y FR-010) |
  | `MILESTONE_IDS` y su spec (FR-027 de F2) | La lista de los 10 IDs, fijada a mano; F4 la ata al catálogo y no edita su spec (FR-017) |
  | `startApp()` y la cadena de `legacy-views.ts` (A2) | El adaptador entra en la cadena antes de `app.js` y se monta desde `render()` (FR-025) |
  | El guard de los singletons (R1 a R4) | La página importa `routeStore`; el adaptador no importa valores de `entities/guide` (FR-024) |
  | F2-I6 | Nada por debajo de `app` importa `getContent()` (FR-006) |

  La decisión abierta de F4 de la hoja de ruta («dónde vive el fixture de los 10 IDs de hitos y quién lo fija») la cerró FR-027 de F2.
- **F2b** (en implementación; lo que sigue es un supuesto). La unidad 5 saca de `app.js` la lista `views` y las lecturas de `location.hash` por `viewFromHash`, y deja como están las anclas que sólo llevan hash, como `#biblioteca`; la unidad 6 mueve el respaldo fuera de `app.js`, lejos de los cambios de F4; la unidad 8 agrega bloques al final de `styles.css`, mientras F4 (Q2 = A) saca reglas de la mitad; el guard R5 (nada por debajo de `app` importa `getContent()`) condiciona a la página y a su modelo, y el R6 (las fuentes legacy y `app/` sólo importan el índice de un slice), al adaptador.
- **F3 y F9.** Comparten con F4 los archivos de FR-035 y lo común de FR-036. F3 es la primera en importar `useStore` y en traer la pila de DOM; F9 usa el mismo almacén para los pasos, las notas y el temporizador.
- **F5.** Dueño del kit ZIP: su parte «Llevátelo a un proyecto» usa `features/download-project-kit`. F4 no la toca (FR-026).
- **F8.** Método importa, exporta y borra el progreso: lo que escriba en el recorrido se ve en Proyecto porque la página lee del almacén (FR-010). Los E2E de esos flujos son de F8.
- **F10.** Retira `app.js`, el adaptador de F4 y el `window.Taller*` de esta página; deja en `styles.css` sólo los tokens y las clases base.
- **D1 y D1c** (spec en [`specs/007-d1-progreso-sincronizacion`](../007-d1-progreso-sincronizacion/spec.md); su FR-061 pide el cliente sobre los almacenes con suscripción y que las vistas sigan leyendo lo mismo). El servidor guarda los hitos como `route_marks` de tipo `milestone` y valida los IDs al importar. F4 no toca el backend ni el cliente: deja los diez IDs fijos y escribe por el almacén.
- **A2 y A3.** F4 usa la cadena y la compuerta de A2 como están. La página no lee contenido de la API, así que A3 no la afecta mientras Q1 sea A.
- **C4.** F4 no suma ningún estilo en línea (FR-005).
- **E1.** Si el curso suma contenido, los textos de los hitos (Q1) y la pista de Q4 serían candidatos a pasar al catálogo de contenido.
- **Hoja de ruta (enmiendas que integra el coordinador).** F4 pasa de «Pendiente» a «En especificación», con el enlace a esta spec; la decisión abierta de F4 queda cerrada (FR-027 de F2); su línea «Borra» menciona `milestoneIds`, que F2a ya reemplazó por `MILESTONE_IDS`, y ubica la rama `data-milestone` en el delegado de clic, cuando está en el de `change`; el tope de 2 500 000 caracteres del HTML (criterios globales) quedó viejo con A2: ahora es 1 250 000; y el pedido original daba por parte de F4 los kits ZIP, que son de Sistemas.

## Assumptions

- **F2a está integrada antes de implementar F4** (PR #40). Esta spec describe `master` en `e87772d` y lee `f2a/base` (`2ffbbc6`) en modo de sólo lectura para `routeStore`, `MILESTONE_IDS`, `startApp()`, `legacy-views.ts` y el guard. Si F2a cambia al integrarse, esta spec se ajusta.
- **Lo que se toma de F2b** (la unidad 5, el movimiento del respaldo, los bloques de CSS y los guards R5 y R6) sale de su plan, que se está implementando: es un supuesto. Lo que se toma de F3 (la pila de DOM, la operación de alternar y el pie de la barra lateral) también.
- **La red con F2a integrada son 123 E2E** (106 de F1 y 17 de A2), 39 checks y 252 pruebas de Vitest, según la descripción del PR #40. El HTML pesa 1 136 702 caracteres tras A2 y el tope de `build-check` es 1 250 000.
- **ADR 0008 y ADR 0003 están aceptados** y la constitución vigente es la 1.4.1.
- **Nada se ejecutó.** Esta spec se escribió sin `npm`, sin Docker, sin navegador y sin descargas. Lo que dice del comportamiento sale de leer `frontend/app.js`, `frontend/styles.css`, los checks de `qa/`, los E2E de F1 y de A2 y el código de `f2a/base`; el contenido de las fixtures congeladas, de leerlas con `node` en modo de sólo lectura. En particular, el cierre de las pistas al marcar un hito (Q3) es una inferencia de que `render()` reemplaza `#main`, no una observación en un navegador.
- **Las tres fixtures congeladas** traen `milestones: ["rust-memory"]` en el recorrido. La de almacenamiento y la exportación de `master` tienen `language: go`; la exportación de `d0e1b49`, `rust`. Se leyeron con `node`, en modo de sólo lectura.
- **El catálogo de los cinco hitos no tiene más consumidores** que `renderProject` y `qa/route-milestones-check.ts` (se buscó en el código del front y del backend).
- **Los textos de la página están en español rioplatense** y no se tocan; el código, los nombres de las pruebas y los identificadores van en inglés.
- **`data-project-library` y `data-milestone` no tienen lector** tras el port: el primero ya figura entre los restos de `docs/refactor-roadmap.md`, y la rama que leía el segundo se retira.
- **El tamaño de F4:** 37 requisitos, contra los 52 de C3a, la mayor spec del épico. No hace falta partirla.
- Las dependencias de la hoja de ruta de F4 son F2a (y, para integrar, las de «Relación con otros ítems»). La referencia de 52 requisitos es la de C3a, según la tabla de la spec de D1.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q4 son las opciones que se ofrecen en las preguntas abiertas.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde viven los textos de los hitos (Q1) | `content/guide/`, leídos con `getContent()` | Borrador: configuración de `entities/guide`. La alternativa cambia bytes publicados, el generador y la API, y no es un port |
| El CSS exclusivo de Proyecto (Q2) | Dejarlo en `styles.css` hasta F10 | Borrador: moverlo con la página, como el Atlas y como pide la hoja de ruta. La alternativa tiene costo cero ahora y deja a F10 todos los movimientos juntos |
| Las pistas abiertas (Q3) | Que sigan abiertas, con la diferencia aprobada | Borrador: reproducir el cierre y fijarlo como `KNOWN DEFECT`. Un port no cambia el comportamiento sin aprobación |
| La pista de Rust en la página de Go (Q4) | Corregirla en F4 | Borrador: conservarla y registrarla como hallazgo. Es texto del curso |
| Cómo recibe el idioma la página | Leerlo de `routeStore.getProgress().language` | El adaptador se lo pasa al montar, como al Atlas: el shell ya remonta la vista al cambiar de idioma, y leerlo del almacén sumaría una segunda fuente del mismo dato |
| Dónde vive el estado de la página | Un `useState` con una copia del progreso, o un store propio | El progreso se lee del almacén en cada render y la revisión dispara el redibujo: una copia sería la segunda fuente de verdad que F2 evita. No hay otro estado, salvo las pistas abiertas (Q3) |
| `data-milestone` y `data-project-library` | Conservarlos en el DOM | Se admite quitarlos: ninguno tiene lector tras el port. Conservar `data-milestone` exige retirar la rama del delegado igual, y no aporta nada |
| Cómo se prueba el aspecto | Una spec permanente de estilo computado de la página, como la de F1 para las reglas que cruzan hojas | Una comparación única: F1 la hizo permanente porque F2 mueve muchas reglas a lo largo de ocho unidades; acá el movimiento ocurre una vez, en este PR, y un cambio de diseño posterior no es una regresión que proteger |
| Cómo se fija el ID de un hito | Sólo la spec de F2a, o sólo el fixture compartido | Las tres fuentes más un E2E de punta a punta: cada una falla por una razón distinta, y un ID roto no falla en el front, lo descarta el servidor |
| Dónde corre la comparación de bytes | En un check permanente | Los oráculos de bytes y el tope ya son checks permanentes (`dist-content-check`, `build-check`); la comparación del DOM y del estilo es única |
