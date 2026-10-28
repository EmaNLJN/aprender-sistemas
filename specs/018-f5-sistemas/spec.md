# Feature Specification: F5 · Port de Sistemas

**Feature Branch**: `018-f5-sistemas` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Borrador con tres preguntas abiertas para el clarify; falta el plan

**Input**: Ítem **F5** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Sistemas»: portar el catálogo y el taller de Sistemas (explorar, construir y entregar) de `frontend/systems.js` a React con TypeScript, sin que el alumno note el cambio. Pedido del coordinador (ver «Lo que pidió el usuario»). Depende de F2b ([plan](../009-f2-seams/plan-f2b.md)): sus cuatro unidades pasaron sus compuertas y esperan merge (PR #41 a #44). Usa como base el [mapa del front legacy](../front-react/legacy-map.md), el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md) (aceptados), y la [constitución](../../.specify/memory/constitution.md) 1.4.1. Lo que toma de F2a, A2 y F2b se cita como código del ensayo local que las integra (`2b37caf4`, sin merge) y va como hecho; ese código no existe en `master`, por eso sus rutas llevan comillas de código y no enlaces. La spec de A4 (PR #50) y la de C4, D1 y A2 se citan por su ruta.

## Intención y alcance

**Lo que entendemos.** `frontend/systems.js` (unas 380 líneas) dibuja `#sistemas` armando HTML con plantillas, escucha tres eventos sobre su propio host y lleva adentro cuatro cosas que un port tiene que separar: el catálogo con su filtro, el taller en tres partes (explorar, construir y entregar), la sesión de simulaciones, que vive en un cierre y se pierde al recargar, y el saneo de la escena SVG, el único lugar del taller donde un dato llega a un atributo `style=`. Además publica `window.TallerSystems`, que `app.js` y `lab.js` siguen usando. F5 lo pasa a React: una página en `pages/systems`, montada en `#main` por un adaptador de `app/legacy/` como ya hace el Atlas; el filtro, la sesión y el saneo como módulos con su prueba; y un adaptador mínimo con los nueve métodos de hoy, que se retiran cuando se porte el último que los llama. Es un port y no un rediseño: se conservan el aspecto, los textos, el teclado y el movimiento reducido, las URL (`?lenguaje=`, `?taller=` y `?parte=`), el progreso (sellos y objetivos, que D1 sincroniza: los IDs no cambian) y las simulaciones con su sesión. La página lee el progreso del motor con `useStore` y un selector chico, y el contenido, por su adaptador de `app/`. F5 está en el camino crítico: F7 (el laboratorio) espera a F5 y a F6, y A4 espera a F7. Es para quien porta las vistas que siguen, para quien revisa el PR y para el alumno, que no debe notar nada. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Los E2E nuevos de Sistemas, escritos primero contra el legacy y en verde, pasan sin editarse sobre la página portada, junto con los 106 de F1 y los 17 de A2 (`content-gate.spec.ts`), que no se editan.
2. El DOM de `#main` es el mismo antes y después, elemento por elemento, en el catálogo y en los 25 talleres en sus tres partes y los dos lenguajes (comparación única), y el barrido de estilo computado da 0 diferencias, ampliado a las pantallas que hoy no cubre.
3. Las tres fixtures congeladas de progreso arrancan sin escribir, sin respaldar y sin avisar; `taller-systems-v1`, sus IDs y los índices de las etapas no cambian; `systems-check`, los cuatro checks de dominio, `lab-bridge-check` (21 escenarios) y `project-kit-check` pasan sin cambiar un valor esperado, y `dump-globals` da los mismos bytes.
4. La escena SVG se sanea con una función pura probada con valores escritos a mano, se dibuja sin armar HTML y la plantilla ya no tiene un `style="…"`.
5. `window.TallerSystems` conserva sus nueve métodos y el PR dice, por método, quién lo llama y qué ítem lo retira.
6. `frontend/systems.js` y `frontend/systems.css` ya no existen, y un solo `revert` devuelve la vista legacy.

**Entra:**

- La página de Sistemas (catálogo y taller: explorar, construir y entregar) en `pages/systems`, con su filtro, su sesión y sus componentes, y el adaptador de `app/legacy/` que la monta en `#main`.
- La sesión de simulaciones como módulo, alcanzable desde «Borrar todo» (Q1).
- El saneo de la escena SVG en `entities/systems-simulation` y el retiro del `style="…"` de su plantilla (Q2).
- Los E2E de comportamiento de Sistemas con su Page Object, escritos contra el legacy antes de portar.
- La mudanza del CSS de `frontend/systems.css` a la página, sin editar una declaración.
- La adaptación de los checks que cargan `systems.js` (`boot-check`, `lab-bridge-check`, `load-order-check` y `qa/lib/legacy-sources.ts`), con la correspondencia que pide el ADR 0008 (§5).
- La documentación que cambia con la vista (el coordinador la integra).

**Queda fuera:**

- Cambiar el comportamiento, los textos, el contenido, los IDs o el kit ZIP (`features/download-project-kit`).
- Llevar la selección del taller o los filtros a la URL con nuqs, y el router (F10; Q3).
- Editar `app.js` (ver FR-049), portar campaña (F6), el laboratorio (F7), el respaldo y «Borrar todo» (F8) y el shell (F10).
- Retirar `window.TallerSystemsEngine`, `window.SYSTEMS_*` y sus `*_LABS`, `window.TallerProjectKit` y `window.TallerEffects`: ninguno es de F5.
- Cambiar los 25 modelos de `entities/systems-simulation/models/`.
- Corregir los defectos que la vista tiene hoy (ver «Edge Cases»): se conservan y se anotan.

**Sin hacer a propósito (YAGNI):** memoización sin medir; un store de Zustand para la sesión o un contexto si bastan props (Q1); `data-testid` u otro atributo de prueba en producción; un debounce de la nota; virtualizar la lista de 25 talleres; separar `systems.css` por componente o pasarlo a otro sistema de estilos; capturas de pantalla.

**Actores:** el alumno, que no debe notar nada; quien porta las vistas que siguen (F6, F7 y F8) y quien revisa el PR; el agente principal, que integra `frontend/src/app/main.tsx`, `package.json`, las configuraciones y la documentación; y los ítems vecinos que consumen lo que F5 deja (ver «Relación con otros ítems»).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta (Preguntas abiertas).

| Pedido | Fuente |
| --- | --- |
| Portar el catálogo y el taller (explorar, construir y entregar); la sesión de simulaciones como módulo, alcanzable desde «Borrar todo»; el saneo del SVG de `scene` en `entities/systems-simulation`; los E2E | Hoja de ruta, F5 («Entra») |
| Borrar `frontend/systems.js`, `frontend/systems.css` y su `style=` | Hoja de ruta, F5 («Borra») |
| Conservar `window.TallerSystems` con `mount` y `unmount` hasta F10, con `refresh`, `sync`, `missionIDs`, `returnURL` y `exerciseContextHTML` hasta F7, y con `resetSimulations` hasta F8 | Hoja de ruta, F5 («Conserva»). «El adaptador `window.TallerSystems` tras F5» lo completa con lo que el código llama hoy |
| Es un port, no un rediseño: se conservan el aspecto, los textos, el teclado, el movimiento reducido, las URL, el progreso (sellos y objetivos) y las simulaciones con su sesión | Usuario, 2026-10-05 (supuesto que no corrigió); encargo del coordinador |
| La red de F1 (106 E2E) y los 17 E2E de A2, sin editar; `systems-check` y los checks de dominio; specs nuevas con Vitest y Testing Library (y fishery si hay fábricas); E2E con Page Object de los flujos de Sistemas; el barrido de estilo computado de F2b si el CSS se muda | Encargo del coordinador; ADR 0008 |
| El PR abre con los E2E de comportamiento de su vista, escritos contra el legacy y en verde antes de portar, y pasan sin editarse después | Usuario, Q1 del clarify de F1 (2026-10-05); hoja de ruta, «Convenciones» |
| La página lee el progreso con `systemsEngine` y `useStore` con un selector chico, nunca el store entero, y el contenido por su adaptador de `app/` | Encargo del coordinador; clarify de F2, Q3 |
| Un solo almacén por clave y un solo motor por tipo; cada lectura de `window` pasa a ser un import de un singleton; el foco vuelve explícitamente con refs y `flushSync`; las regiones vivas que hoy se recrean quedan montadas; ninguna librería de animación | Hoja de ruta, «Convenciones» (reglas de todo port) |
| F6, F3, F4 y F9 comparten el shell legacy y se integran de a uno | Hoja de ruta, «Orden y paralelismo»; encargo del coordinador |
| Un PR por vista, revertible entero; título y descripción en inglés; el código y las pruebas en inglés, la interfaz y el contenido en español | Hoja de ruta; `AGENTS.md` |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicar si supera los 52 requisitos de C3a | Reglas comunes de las specs del coordinador |

## Lo que F5 toma de F2a, A2 y F2b

Va como hecho. Las rutas son las del ensayo local `2b37caf4` y siguen sin existir en `master` hasta que se integren los PR #41 a #44.

| Qué | Dónde | Cómo lo usa F5 |
| --- | --- | --- |
| Gramática de URL: `readLinkQuery`, `workshopPartOr`, `withWorkshopQuery`, `workshopExerciseHref` y `workshopReturnHref` | `frontend/src/shared/config/url-grammar.ts` (F2b, unidad 5) | La página lee y escribe la URL y arma sus enlaces con ella; ya no los arma a mano |
| Puentes de Sistemas como datos: `workshopMissionIds`, `workshopExerciseRole` y `workshopReturnTarget` | `frontend/src/entities/systems-workshop/bridge.ts`, sobre `model/workshop-bridge.ts` | Los métodos del adaptador que sirven al laboratorio (`missionIDs`, `returnURL`, `exerciseContextHTML`) |
| Motor con suscripción: `systemsEngine` y su `changes` (un store de Zustand que lleva sólo `{ revision }`); sin `init`, el motor lanza «Inicializá Sistemas antes de usarlo.» | `frontend/src/entities/systems-workshop/model/create-systems-engine.ts` (F2a, unidad 1) | La página se suscribe a la revisión y deriva el resto al dibujar |
| Registro de modelos: `mergeModelGroups`, y los modelos `lowlevelModels`, `infraModels`, `playModels` y `pcModel` | `frontend/src/entities/systems-simulation/` (F2a, unidad 4) | El adaptador inicializa el motor con ellos, como hace `systems.js:init` |
| Almacén del laboratorio y catálogo de ejercicios importables | `frontend/src/entities/exercise/` (`labStore`, `exerciseCatalog`) | Los lee el adaptador por `window.TallerLab`, como hoy, mientras `lab.js` exista (regla R4) |
| `.lab-empty` en `styles.css` | F2b, unidad 8 | El estado vacío del catálogo ya no depende de la hoja del laboratorio |
| «Borrar todo» con pasos de sesión: `createProgressBackup({ sessionResets })` | `frontend/src/features/progress-backup/` (F2b, unidad 6) y `frontend/app.js` | Por ahí llega el reinicio de las simulaciones |
| Contenido por `getContent()`, la compuerta y la cadena de módulos legacy | `frontend/src/app/content/content.ts`, `frontend/src/app/boot/legacy-views.ts` (A2); [spec de A2](../006-a2-compuerta-arranque/spec.md) | El adaptador lee el contenido; F5 edita una línea de la cadena. El tope de `dist/index.html` es de A2: `BOOT_SIZE_LIMIT = 1250000` en `qa/build-check.ts` |
| El guard de las seams, reglas R1 a R6 | `qa/lib/seams-guard.ts` | Fija dónde se puede importar el motor, los almacenes y `getContent()`; F5 no lo relaja |
| El Atlas como precedente: una raíz de React sobre `#main` por montaje, con la sesión en el módulo del adaptador | `frontend/src/app/legacy/register-atlas.tsx`, `frontend/src/pages/atlas/` | El mismo patrón de montaje |
| La red: 106 E2E de F1 (incluido el Page Object `SystemsPage`) y los 17 de A2 | `qa/e2e/` | Se conservan sin editar; F5 amplía el Page Object de Sistemas |

## Preguntas abiertas

Son para el clarify. Cada una trae sus opciones con lo que cuesta cada una, la recomendada y su motivo. Al responderlas, el clarify las registra en `## Clarifications`, bajo `### Session`, y reemplaza esta sección. Hasta entonces, los requisitos que señalan una de ellas usan la opción recomendada como borrador.

**Q1. ¿Dónde vive la sesión de simulaciones, y qué más lleva?** *(FR-017; hoja de ruta, «Decisiones abiertas», F5)* Hoy `systems.js` guarda en su cierre tres cosas que sobreviven a `unmount` y `mount` (o sea, a navegar por hash) y se pierden al recargar: `simulations` (un estado por `lenguaje:taller`), `category` y `query`. «Borrar todo» sólo alcanza a la primera, a través de `window.TallerSystems.resetSimulations()` que `app.js` pasa como paso de sesión a `progress-backup`. Una raíz de React que se crea en cada montaje necesita un lugar de módulo para esa sesión. El Atlas la guarda en el módulo de su adaptador y se la pasa a la página (`initialSession` y `onSessionChange`). Hay que decidir dónde y si `category` y `query` van con ella; la lectura de hoy es que sí (mismo ciclo de vida) y que «Borrar todo» no las toca.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Un módulo de la propia página (`pages/systems/model`) con las tres cosas. La página lo lee al montar y lo escribe al cambiar, con su propio estado de React para redibujar. Su API pública exporta el reinicio de las simulaciones; hoy lo cablea el adaptador (`resetSimulations`) y F8 lo cablea directo desde `app/`. | `app/` depende de `pages/systems` sólo para el reinicio (la dirección permitida), y F8 tiene que armar los pasos de sesión en `app/` porque una página no importa a otra. Dos fuentes de verdad mientras la página vive (el módulo y su estado), que se mantienen sincronizadas por una sola función de escritura. |
| B | Como el Atlas: la sesión vive en el módulo del adaptador `register-systems.tsx` y la página recibe `initialSession` y `onSessionChange`. | La página queda pura y es la más fácil de probar. Pero `resetSimulations` pasa a ser lo único que mantiene viva la sesión: F8 no puede retirarlo sin mover la sesión, y F10, que retira los adaptadores, la mueve otra vez. La lógica de crear el estado de un modelo la pone `app/` o se la pasa a la página. |
| C | Un módulo en `entities/systems-simulation` con su propio store de Zustand (revisión), como los motores. | La entidad, hoy sin estado, abre su primer singleton: el guard, `singletons-import.spec.ts` y los adaptadores `register-systems-*`, que importan los modelos de ese mismo índice, lo evaluarían en cada bundle de los checks. Es estado de un solo consumidor con Zustand, lo que `AGENTS.md` desaconseja («no eleves el estado sin consumidores compartidos reales»). |

**Recomendada: A.** Es la más chica, deja la entidad sin estado, se alcanza desde «Borrar todo» por la API pública de la página y no obliga a F8 ni a F10 a mover nada que F5 no haya movido ya. **Costo:** que F8 arme los pasos de sesión en `app/` y que la página lleve su estado local sincronizado con el módulo. Si preferís la página pura, B es defendible, sabiendo que F8 y F10 mueven la sesión.

**Q2. ¿Cómo se retira el `style="…"` del SVG de la escena?** *(FR-025; hoja de ruta, F5; [spec de C4](../008-c4-exposicion/spec.md), Q3 y FR-017)* Hoy `scene()` arma `style="background:<color>"` dentro de la plantilla, con un color que sale del contenido y pasa por una lista blanca (los modelos usan `#14271f`). `.sys-scene` tiene `border`, `border-radius: 4px`, `overflow: hidden` y `max-height: 430px`. La premisa de la hoja de ruta cambió: el clarify de C4 (Q3, opción B) dejó `style-src-attr 'unsafe-inline'`, así que el atributo ya no bloquea a C4 y C4 no espera a F5. El retiro queda por pedido del alcance de F5, no por la CSP.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | La propiedad `style` de React sobre el `<svg>`, con el color saneado. React escribe la propiedad por el modelo de objetos de CSS, no un atributo de la plantilla. | El `background` calculado y el árbol de elementos no cambian. El código fuente contiene `style={{ … }}`: el grep de `style=` de las compuertas de F2b lo marca, así que el PR declara ese único sitio con su spec. En el DOM vivo el atributo `style` se serializa distinto (`rgb(…)` en lugar del hexadecimal), cosa que la comparación del DOM normaliza y el barrido de estilo computado confirma. |
| B | Un `<rect>` de fondo, primer hijo del `<svg>`, con `fill` en el color saneado. Ningún estilo en línea en el DOM. | Cambia el árbol (un elemento más, y el barrido compara por camino) y el `background-color` calculado del `<svg>`. Además cambia lo que se pinta cuando la caja es más grande que la `viewBox` (por el `max-height: 430px` y el `preserveAspectRatio` por omisión) y bajo `border-radius` con `overflow: hidden`: nadie midió si recorta igual. Pide tocar `systems.css`. |
| C | Mantener el atributo, armado fuera de React. | Contradice el pedido de retirarlo. No se recomienda. |

**Recomendada: A.** Es la única que conserva a la vez el árbol y los píxeles, y el atributo ya no frena a C4. **Costo:** un sitio con `style` en el código, declarado y probado. Si querés cero estilos en línea en el DOM, B es posible, pero deja de ser un port puro y se mide antes.

**Q3. ¿La selección del taller y la parte pasan a nuqs en F5?** *(FR-011; `AGENTS.md`; hoja de ruta, F10)* `AGENTS.md` dice que el estado navegable que persiste en la URL (búsqueda, filtros, pestaña o selección enlazable) va con nuqs, con la query como fuente de verdad y sin copia en `useState`. Sistemas es la primera vista portada con esa clase de estado: `taller` y `parte`. La hoja de ruta deja nuqs para el spike de F10, y el contrato de hoy es otro: la URL se lee sólo al montar, se escribe con `replaceState` y un enlace que cambia la query recarga el documento (F1, L7, L8 y L11). Según su [documentación de opciones](https://nuqs.47ng.com/docs/options), nuqs escribe reemplazando el historial y limita la frecuencia de las escrituras (`throttleMs` vale 50 ms por omisión).

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | No. El adaptador lee la URL al montar y le pasa a la página la selección inicial; la página avisa cada cambio y el adaptador escribe con `replaceState` y `withWorkshopQuery`. nuqs lo decide el spike de F10, con su peso medido. | La selección vive en React y en la URL a la vez hasta F10 (lo que `AGENTS.md` desaconseja): una excepción que el plan anota en su «Constitution Check». El código de URL del adaptador se reemplaza en F10. |
| B | Sí: nuqs con `NuqsAdapter` en la raíz de Sistemas, `taller` y `parte` con parsers y defaults explícitos. | Una dependencia de runtime nueva, de peso sin medir y con permiso del usuario; cada raíz de React necesita su adaptador (el Atlas y Sistemas son raíces separadas). Cambia el contrato: nuqs demora las escrituras y reacciona a cambios de la URL, y hoy no se lee después de montar. Pide probarlo contra los E2E de URL y le quita su motivo al spike de F10. |

**Recomendada: A.** Un port no cambia el contrato de URL, y la decisión del router y de nuqs ya tiene su lugar y su medición en F10. **Costo:** la excepción anotada y un código de URL que se reemplaza después.

## El adaptador `window.TallerSystems` tras F5

El adaptador es un archivo nuevo de `frontend/src/app/legacy/` que reemplaza a `systems.js` en la cadena de módulos legacy y publica los mismos nueve métodos, con los mismos nombres y firmas. Los llamadores salen del código del ensayo (`qa/lib/app-adapters.ts` lista los cinco de `app.js`; `lab.js` llama los demás). Ninguno se retira antes de que se porte el último que lo llama.

| Método | Quién lo llama hoy | Lo retira |
| --- | --- | --- |
| `init()` | `app.js:startApp`, después de `TallerCampaign.init()`; devuelve `{ storageAvailable, loadWarning }` y `boot-check` fija el orden | F10 (con `startApp`) |
| `mount(host, lang, toast)` | `app.js:render` | F10 |
| `unmount()` | `app.js:render` | F10 |
| `sync()` | `lab.js:onClick` y `lab.js:runExercise`, vía `syncAfterRun` (`syncSystems`); y `app.js`, como `syncDerivedSeals` del área de Sistemas de `progress-backup`, tras importar | El de `lab.js`: F7. El de `app.js`: F10, o F8 si F8 arma la instancia de `progress-backup` |
| `refresh()` | `lab.js:render` | F7 |
| `missionIDs(id, lang)` | `lab.js:navigationList` | F7 |
| `returnURL(id, lang)` | `lab.js:finishNavigation` | F7 |
| `exerciseContextHTML(id, lang)` | `lab.js:exerciseHTML`, `updateRunUI` y el manejador de la predicción de `onClick` | F7, que lo reemplaza por datos |
| `resetSimulations()` | `app.js`, como paso de sesión de `progress-backup` | F8 si F8 arma los pasos de sesión; si no, F10 |

La hoja de ruta fecha `sync` en F7 y no lista `init`; el código de hoy los llama también desde `app.js`, y la tabla corrige eso (ver «Hallazgos»). Lo demás que `systems.js` tocaba queda como está: `window.TallerSystemsEngine` (lo publica `register-systems-engine.ts`), `window.SYSTEMS_*` y `window.SYSTEMS_*_LABS` (los publican los cuatro `register-systems-*.ts`; los lee `lab.js` y el oráculo `dump-globals`, que tiene que dar los mismos bytes), `window.TallerEffects` (campaña lo usa) y `window.TallerProjectKit`, cuyo único consumidor de producción pasa de `systems.js` al adaptador; lo retira F10 con los demás `register-*`.

## Qué se borra, qué se muda y qué se adapta

| Qué | Hoy | Después |
| --- | --- | --- |
| `frontend/systems.js` | IIFE de 379 líneas, en la cadena de `legacy-views.ts` | Se borra; la cadena apunta al adaptador nuevo |
| `frontend/systems.css` | 1 068 líneas, 204 reglas y 66 clases según el mapa (§7), todas con prefijo `sys-`; importada por `main.tsx` como la última hoja | Se muda tal cual a la página (`frontend/src/pages/systems/ui/systems.css`, como el Atlas con `atlas.css`), sin editar una declaración, y `main.tsx` la importa en el mismo lugar del orden |
| El `style="…"` del SVG | `scene()` | Q2 |
| Los `data-sys*` del HTML | Ganchos del delegado de eventos; ninguna hoja, check ni herramienta los usa | Desaparecen con el delegado |
| `frontend/app.js` | Llama al adaptador; ninguna rama de sus delegados es de Sistemas | No se edita (FR-049) |
| `qa/boot-check.ts` | Lee el encabezado de `#sistemas` en `innerHTML` y lista `frontend/systems.js` en `LEGACY_SOURCES` | `#sistemas` pasa a verificarse por nodos montados, como el Atlas; la lista pierde `systems.js` |
| `qa/lab-bridge-check.ts` y `qa/lib/legacy-sources.ts` | `SYSTEMS_UI_SOURCE` carga `systems.js` con un `TallerLab` falso | Apunta al adaptador; ningún valor esperado cambia, y sus 10 escenarios de Sistemas siguen siendo el contrato de HTML y URL hasta F7 |
| `qa/load-order-check.ts` | Dos restricciones sobre `frontend/systems.js` | Pasan al adaptador nuevo, con su razón |
| `qa/seams-guard-check.ts` | Dos escenarios virtuales usan el nombre `frontend/systems.js` | Siguen valiendo como fuentes virtuales; el plan puede renombrarlas |
| `systems-check`, los cuatro `systems-<dominio>-check`, `project-kit-check`, `campaign-check`, `versioned-storage-check`, `curriculum-ids-check`, `app-shell-check` | Dominio y contratos | No cambian: el adaptador conserva la lista de `qa/lib/app-adapters.ts` |
| Documentación | `AGENTS.md`, `README.md`, `docs/architecture.md` y `qa/AGENTS.md` nombran `systems.js` y `systems.css` | La integra el coordinador; el ADR 0007 y `docs/refactor-roadmap.md` son históricos |

Ningún check se retira: ninguno prueba hoy la interfaz de `systems.js` más allá de que dibuje su encabezado (`boot-check`), así que los flujos de la vista quedan cubiertos por los E2E nuevos y las specs, y los demás checks siguen como pruebas de integración.

## Cómo se demuestra que nada cambió

| Qué | Con qué | Esperado |
| --- | --- | --- |
| La red de F1 y la de A2 | `npm run build && npm run test:e2e` | 106 de F1 y 17 de A2, sin editar una spec |
| Los flujos de Sistemas | E2E nuevos con el Page Object de Sistemas (ampliado, sólo con métodos nuevos): primero sobre el legacy y después sobre la página portada | Los mismos en verde antes y después, sin editarse |
| Dominio y contratos | `npm test` (checks de `qa/` y Vitest), `npm run lint`, `npm run format:check`, `git diff --check` | Verde; los valores esperados de los checks no cambian; `build/curriculum.json`, `dump-globals` y los catálogos del dist con los mismos bytes |
| Código nuevo | Specs de Vitest (proyecto `node` para la lógica, `jsdom` con Testing Library para los componentes) y fishery para las entradas | Rojo primero, verde después; valores escritos a mano o sacados de las fixtures congeladas |
| El DOM | Comparación única entre `master` y la rama: `#main` normalizado (árbol, clases, ids, roles, `aria-*` y textos) en el catálogo de los dos lenguajes, con familias y búsquedas, y en los 25 talleres × 3 partes × 2 lenguajes, más los estados tras una acción del modelo, un checkpoint contestado y los sellos de la fixture | 0 diferencias |
| El estilo | El barrido de estilo computado de F2b ([quickstart-f2b.md](../009-f2-seams/quickstart-f2b.md), §3.1 b), ampliado | 0 diferencias en cada captura |
| La escena | Comparación única de las 9 escenas (`pc` y los 8 talleres de `play`) contra el `scene()` del commit base | 0 diferencias |
| El progreso | Las fixtures `qa/fixtures/progress-*` y `workshop-steps-v1.json` | Arrancan sin escribir, sin respaldar y sin avisar; las dos exportaciones se importan sin omisiones |
| Tamaño y complejidad | `qa/build-check` y `npm run lint` | `dist/index.html` bajo 1 250 000 caracteres, con el aumento medido; los 2 avisos de `systems.js` desaparecen y ninguna función nueva supera 10 sin justificación |
| La imagen web | `docker compose build taller`, con permiso | Construye |

**Lo que el barrido de F2b no cubre hoy.** Sus 14 páginas incluyen tres de Sistemas (el catálogo, un taller en Explorar y el catálogo vacío) y ninguna tiene una escena, las partes Construir y Entregar, un checkpoint contestado, sellos obtenidos ni una familia elegida. F5 lo amplía, como mínimo, con: un taller con escena (`pc` y uno de `play`, por ejemplo `raster`) después de una acción; el mismo taller en Construir y en Entregar; un checkpoint contestado; `pc` con sus tres sellos (la fixture congelada); y el catálogo con «Datos e infraestructura» elegida. Sin esa ampliación, la mudanza de `systems.css` no está protegida donde más reglas tiene.

## Los E2E de comportamiento de Sistemas

Abren el PR y se escriben contra el legacy. Los nombres y la agrupación son provisionales y los confirma el plan; la spec fija qué comportamiento queda fijado. Los valores esperados salen del README, del mapa, de `qa/fixtures/curriculum-ids.json`, de la fixture de progreso congelada y de las reglas de los sellos, nunca del código que se porta. Lo que ya cubre la red de F1 (el taller por URL, las recargas, el puente con el laboratorio, el ciclo con el compilador simulado, `.lab-empty` y la sesión que sobrevive a navegar por hash) no se repite.

| Grupo | Qué fija |
| --- | --- |
| Catálogo | Con el progreso congelado de master: Rust muestra «1 / 25» y `pc` con «✓ Tres sellos conseguidos», Go «0 / 25». Las cuatro familias con `aria-pressed` (9, 8 y 8 tarjetas, 25 en total) y el foco que se queda en el botón elegido. La búsqueda sin tildes ni mayúsculas, por título, subtítulo, qué, por qué e id, con el contador. El estado vacío y «Ver todos los talleres», que limpia familia y búsqueda y lleva el foco al buscador. La familia y la búsqueda sobreviven a navegar por hash, se pierden al recargar y «Borrar todo» no las limpia |
| Abrir y volver | «Explorar →» abre el taller, lleva el foco al título, deja `#main` arriba y escribe `?lenguaje=rust&taller=cache&parte=explore#sistemas` sin sumar una entrada al historial; «← Todos los talleres» vuelve a `?lenguaje=rust#sistemas`. El cambio de idioma del shell con un taller abierto lo deja abierto en la misma parte, con los sellos del otro lenguaje |
| Las partes | Las tres con `aria-pressed`, la URL que sigue a la parte, el foco que va al botón de la parte y la pestaña que queda arriba; `parte` inválida abre Explorar |
| Explorar | Una acción del modelo (por ejemplo, leer A en la caché) suma una línea a la traza, marca el objetivo y el primer sello, avisa con «Nueva situación comprendida: …», guarda en `taller-systems-v1` y deja el foco en el mismo botón. Repetir el clic hace crecer la traza y no suma objetivo, aviso ni escritura («abrir la página o repetir clics no alcanza», README). «Reiniciar modelo ↺» vacía la traza y conserva objetivos y sellos. La traza «Qué cambió y por qué» está abierta después de cada acción. El texto vivo del modelo se actualiza en su lugar |
| Checkpoint | Una respuesta equivocada muestra «Revisemos esa decisión.» y su explicación; la correcta, «Esa es la idea.», el sello de predicción y el aviso; el foco queda en la opción; la respuesta sigue elegida al recargar |
| Tercer sello | Con dos sellos sembrados, obtener el tercero avisa «Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.» y dibuja la celebración; con movimiento reducido no la dibuja; al salir de la vista se quita |
| Construir | El título y el objetivo del núcleo del lenguaje, «3 pruebas reales», el enlace «Entrar al IDE ↗» con su `href` exacto y las herramientas previas con los suyos; el aviso «✓ Este núcleo tiene una ejecución registrada…» sólo con el sello de código |
| Entregar | «Descargar kit Rust ↓» baja un `.zip` con el nombre del kit y avisa «Kit descargado con tu borrador y sus pruebas.». Las cuatro casillas guardan el índice de la etapa (0 a 3) y vuelven tras recargar. La nota se guarda en cada tecla, sin debounce, sin mover el cursor al escribir en el medio y con su mensaje de estado; con el almacenamiento bloqueado, los dos avisos de «no se pudo guardar» |
| Escena | Un taller con escena dibuja un `svg` con `role="img"`, su `aria-label` y el fondo `#14271f` calculado |
| Los 25 talleres | Cada uno abre en Explorar sin errores de consola, con su encabezado; tres talleres representativos recorren además las otras dos partes |
| «Borrar todo» | Con una simulación hecha, Método → «Borrar mi progreso» → «Borrar todo» → volver a Sistemas: la traza está vacía y los sellos en cero, y la familia y la búsqueda siguen. Pide un Page Object mínimo de Método que F8 amplía |

## Integración con F3, F4, F6 y F9

Esos cuatro ports y F5 comparten el shell legacy y se integran de a uno, en el orden en que llegan; el que llega después rebasa sobre `master` y repite su compuerta.

- **Lo que F5 no toca:** `frontend/app.js`. Ninguna rama de sus tres delegados sobre `#main` es de Sistemas (la vista escucha sobre su propio host) y la vista no usa `data-action`. Si el plan descubre lo contrario, el cambio se limita a las líneas de Sistemas.
- **Dónde chocan:** `frontend/src/app/boot/legacy-views.ts` (cada port edita la cadena), `frontend/src/app/main.tsx` (los `import` de hojas), `qa/load-order-check.ts`, `qa/lib/legacy-sources.ts`, `qa/boot-check.ts` (cada port generaliza el caso del Atlas, que hoy está escrito a mano para una sola vista), `qa/lab-bridge-check.ts` (con F6), `docs/architecture.md`, `AGENTS.md` y `qa/AGENTS.md`. `main.tsx`, `package.json`, las configuraciones y la documentación las integra el agente principal.
- **La pila de DOM:** `jsdom`, Testing Library y el proyecto `jsdom` de Vitest estaban previstos para F3 (primera spec de componente), y `fishery` para la primera factory. El que llegue primero los instala, con permiso. Si es F5, lleva esa instalación, la configuración de `projects` y el permiso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno recorre Sistemas y no nota el cambio (Priority: P1)

El alumno entra a `#sistemas`, filtra y busca en el catálogo, abre un taller, manipula su modelo, contesta el checkpoint, mira el núcleo que va a programar, descarga el kit y deja una nota. Todo se ve, se oye con el lector de pantalla y se maneja con el teclado como antes.

**Why this priority**: es el criterio de un port. Si el alumno nota algo, F5 dejó de ser un port.

**Independent Test**: correr los E2E de Sistemas contra el build servido, primero con el legacy y después con la página portada, y comparar el DOM y el estilo calculado.

**Acceptance Scenarios**:

1. **Given** el progreso congelado de master, **When** abre `#sistemas` en Rust, **Then** ve «1 / 25», la tarjeta de `pc` con «✓ Tres sellos conseguidos» y las otras 24 con «0/3 sellos»; en Go ve «0 / 25».
2. **Given** el catálogo, **When** elige «Dentro de la máquina», **Then** quedan 9 tarjetas, el botón conserva el foco y el contador lo dice.
3. **Given** el catálogo, **When** escribe «cache» sin tilde, **Then** aparece «Una caché que aprende tus visitas» y el contador dice «1 talleres para explorar».
4. **Given** un taller en Explorar, **When** lee A en el modelo de la caché, **Then** la traza muestra el fallo, el objetivo y el primer sello quedan marcados, el aviso nombra el objetivo y el foco sigue en el botón; **And** si repite el clic, la traza crece y no se suma objetivo, aviso ni escritura.
5. **Given** el checkpoint, **When** responde la opción correcta, **Then** ve «Esa es la idea.» con la explicación, obtiene el sello de predicción y la respuesta sigue elegida al recargar.
6. **Given** un taller en Construir, **When** mira el núcleo, **Then** ve su título, «3 pruebas reales» y un enlace al IDE que lleva a `?sistema=<taller>&ejercicio=<núcleo>&paso=code#laboratorio`.
7. **Given** un taller en Entregar, **When** escribe una nota, marca una etapa y descarga el kit, **Then** la nota y la etapa quedan guardadas al instante y recargar las conserva, y el kit baja con su aviso.

---

### User Story 2 - El progreso, los IDs y las URL son los de siempre (Priority: P1)

Quien ya tiene progreso de Sistemas lo conserva, y los enlaces guardados y los que escribe el laboratorio y el shell llevan adonde llevaban.

**Why this priority**: el progreso es contrato (ADR 0003) y D1 sincroniza sellos y objetivos por ID: un ID cambiado o una escritura de más sería una pérdida.

**Independent Test**: arrancar con las tres fixtures, recorrer la vista y comparar el almacenamiento; abrir cada forma de URL de Sistemas y recargar.

**Acceptance Scenarios**:

1. **Given** las fixtures congeladas, **When** arranca y recorre las ocho vistas, **Then** no hay escrituras, respaldos ni avisos, y las cuatro claves quedan idénticas.
2. **Given** `?lenguaje=go&taller=cache&parte=ship#sistemas`, **When** abre y recarga, **Then** ve el taller en Entregar, en Go, con un solo pedido de contenido por carga (A2).
3. **Given** un taller abierto, **When** cambia de parte o vuelve al catálogo, **Then** la URL se reescribe sin sumar una entrada al historial y conserva los parámetros ajenos; **And** `?taller=inexistente` abre el catálogo y una `parte` inválida abre Explorar.
4. **Given** «Entrar al IDE ↗» en un taller, **When** hace clic, **Then** el documento se recarga en `?sistema=…&ejercicio=…&paso=code#laboratorio` (L7 de F1), y el regreso desde el laboratorio abre el taller en Construir (L8 y L11).
5. **Given** las dos exportaciones congeladas, **When** se importan, **Then** el progreso de Sistemas queda sin omisiones.

---

### User Story 3 - Las simulaciones tienen una sesión que «Borrar todo» alcanza (Priority: P1)

El estado de cada simulación sobrevive mientras se navega por el menú y se pierde al recargar, y «Borrar todo» lo reinicia.

**Why this priority**: es el único estado que la vista guarda fuera del almacenamiento, y la hoja de ruta lo marca como decisión abierta. Una raíz de React que se crea en cada montaje lo perdería sin un módulo.

**Independent Test**: E2E de navegar por hash, recargar y «Borrar todo»; specs del módulo de sesión.

**Acceptance Scenarios**:

1. **Given** una simulación con acciones hechas, **When** navega a otra vista por el menú de hash y vuelve, **Then** la traza sigue.
2. **Given** la misma simulación, **When** recarga el documento o entra por el menú «Laboratorio» (que recarga), **Then** el taller arranca de cero.
3. **Given** la simulación y una familia elegida, **When** confirma «Borrar todo» en Método y vuelve, **Then** la traza está vacía y los sellos en cero, y la familia y la búsqueda siguen como estaban.
4. **Given** la simulación de Rust, **When** cambia al idioma Go, **Then** el taller de Go arranca con su propio estado.

---

### User Story 4 - Una escena rara no rompe la página ni inyecta estilo (Priority: P1)

La escena SVG que arma un modelo pasa por un saneo antes de dibujarse: números finitos, tamaños que no son negativos, colores de una lista blanca y un tope de formas.

**Why this priority**: es el único dato del contenido que hoy llega a un atributo `style=`. El pedido es sanearlo, probarlo y retirar el atributo de la plantilla.

**Independent Test**: specs de la función pura y del componente con escenas hostiles escritas a mano, y la comparación de las 9 escenas reales con el `scene()` del commit base.

**Acceptance Scenarios**:

1. **Given** una escena con `NaN`, `Infinity`, `undefined` o un tamaño negativo, **When** se dibuja, **Then** los atributos usan los valores de respaldo de hoy y ninguno es inválido.
2. **Given** un color `red`, `url(…)` o `#fff;position:fixed`, **When** se dibuja, **Then** se usa el color de respaldo.
3. **Given** un texto con `<` o `"`, **When** se dibuja, **Then** aparece como texto.
4. **Given** una escena con más de 2 500 formas, **When** se dibuja, **Then** se dibujan las primeras 2 500.
5. **Given** las 9 escenas reales, **When** se comparan con las de hoy, **Then** no hay diferencias.

---

### User Story 5 - El laboratorio, la campaña y «Borrar todo» siguen usando a Sistemas (Priority: P2)

Mientras `lab.js` y `app.js` existan, siguen llamando a `window.TallerSystems` como hoy.

**Why this priority**: F7, F8 y F10 portan a esos llamadores y retiran los métodos de a uno. Si F5 cambia uno antes, rompe el laboratorio o el respaldo.

**Independent Test**: `lab-bridge-check`, `app-shell-check`, `boot-check` y los E2E de puentes y del ciclo, sin cambiar un valor esperado.

**Acceptance Scenarios**:

1. **Given** un núcleo de Sistemas abierto en el laboratorio, **When** aprueba las pruebas, **Then** el sello de código aparece al volver al taller (ciclo de F1).
2. **Given** el laboratorio dentro de un taller, **When** se arma el bloque de contexto, **Then** `exerciseContextHTML`, `missionIDs` y `returnURL` dan lo mismo que hoy.
3. **Given** una importación, **When** `progress-backup` aplica el área de Sistemas, **Then** el sello derivado se sincroniza por `sync`.

---

### User Story 6 - Quien porta la siguiente vista encuentra la red y los módulos (Priority: P2)

F6, F7 y F8 reutilizan el Page Object, el módulo de sesión y la tabla de retiros.

**Why this priority**: F7 espera a F5 y a F6; sin la tabla, no sabe qué métodos puede retirar.

**Independent Test**: leer el PR: el Page Object amplía sin romper, la tabla lista quién llama a cada método y el módulo de sesión se importa por su API pública.

**Acceptance Scenarios**:

1. **Given** el PR de F5, **When** F7 busca qué retirar, **Then** encuentra la tabla de los nueve métodos con sus llamadores y su ítem.
2. **Given** el módulo de sesión, **When** F8 arma los pasos de «Borrar todo», **Then** importa el reinicio por la API pública de la página.

---

### User Story 7 - El CSS se muda y el aspecto es el mismo (Priority: P2)

`systems.css` pasa a la página sin editar una regla y el taller se ve igual a todos los anchos y con o sin movimiento reducido.

**Why this priority**: mover 204 reglas es el riesgo que ninguna prueba funcional detecta. Es P2 porque lo protege el barrido de F2b ampliado.

**Independent Test**: el barrido de estilo computado y `css-contract` de F1.

**Acceptance Scenarios**:

1. **Given** el build de la rama y el de `master`, **When** corre el barrido ampliado a 1 280, 981, 850, 650, 590 y 375 px, con y sin movimiento reducido, **Then** da 0 diferencias.
2. **Given** `css-contract.spec.ts`, **When** corre sin editarse, **Then** pasa completo (incluido R9, `.lab-empty` en el catálogo vacío).

---

### Edge Cases

- **El motor se usa antes de `init`:** lanza. El adaptador monta después de `init` (el orden de `startApp`), y montar antes sigue siendo un error ruidoso.
- **Una acción del modelo que no alcanza un objetivo nuevo:** el motor no avisa (no cambia su revisión), pero la vista tiene que redibujarse igual.
- **Escribir en el medio de la nota o de la búsqueda:** el cursor y el foco no se mueven; la nota se guarda en cada tecla.
- **Una nota de más de 10 000 caracteres:** el `maxlength` la corta en la interfaz y el motor la trunca igual.
- **Almacenamiento bloqueado desde el arranque:** el aviso del shell, el aviso del taller («No se pudo guardar el progreso. Exportá una copia antes de cerrar.») y el de la nota («No se pudo guardar: exportá tu avance antes de cerrar.») salen como hoy. Si el almacenamiento falla a mitad de la sesión, el aviso del taller hoy aparece en el próximo redibujo completo; en React puede aparecer al instante: es la única diferencia observable que se prevé, y el plan la lista o la elimina.
- **Las regiones vivas que hoy se recrean** (el contador del catálogo al cambiar de familia, la explicación del checkpoint, el aviso de código verificado) pasan a quedar montadas, como manda la regla del épico: lo que anuncia un lector de pantalla puede cambiar. El PR lo lista.
- **La traza abierta:** hoy se vuelve a dibujar con `open` después de cada acción, aunque el alumno la haya cerrado. El port lo conserva y lo fijan un E2E y una spec.
- **Volver al catálogo no mueve el foco** (el botón desaparece y el foco cae al documento): defecto conocido que se conserva y se anota; corregirlo es un cambio de comportamiento aparte, con su commit y su prueba.
- **«1 talleres para explorar»:** el contador no pluraliza. Se conserva.
- **El texto de la búsqueda no se recorta**, y se compara contra título, subtítulo, qué, por qué e id unidos por un espacio.
- **`?parte=build` sin `taller`:** abre el catálogo.
- **Cambio de idioma con un taller abierto:** el shell remonta la vista; el taller sigue abierto en la misma parte, y la simulación del otro lenguaje es otra.
- **Un control `disabled`:** ningún modelo lo produce hoy; el código de `systems.js` que lo contemplaba es inalcanzable y no se porta.
- **Dos montajes seguidos** (importar, cambiar de idioma, «Borrar todo»): cada montaje crea una raíz nueva y el desmontaje libera la anterior, sin escuchas ni celebración colgados.
- **Ejecutar el mismo ejercicio en otra pestaña:** el sello de código se deriva de la evidencia del laboratorio en memoria, igual que hoy; no se relee el almacenamiento.

## Requirements *(mandatory)*

### Functional Requirements

**Lo que se conserva**

- **FR-001**: La página DEBE dibujar en `#main`, sin contenedor propio, el mismo árbol de elementos que `systems.js` dibuja hoy: mismas etiquetas y orden, mismas clases, ids, roles y atributos `aria-*`, mismos textos. No cuentan los `data-sys*`, que sólo servían al delegado de eventos, ni los nodos de texto de sólo espacios. El barrido de estilo compara por camino de elementos, así que un contenedor de más rompe cada clave.
- **FR-002**: Ninguna declaración de `systems.css` DEBE cambiar, y la hoja DEBE seguir cargándose última.
- **FR-003**: Los textos de la vista DEBEN ser los de hoy, letra por letra (la presentación, las etiquetas, los avisos, los mensajes de estado y los defectos de redacción que se conservan), en español rioplatense con voseo.
- **FR-004**: El catálogo DEBE conservar su orden (`pc`, `lowlevel`, `infra`, `play`, y dentro de cada uno el del contenido), los conteos («N talleres», «2N núcleos programables» y «hechos / N»), la tarjeta con sus sellos, el filtro por familia (cuatro botones con `aria-pressed`), la búsqueda (sin tildes ni mayúsculas, sin recortar, sobre título, subtítulo, qué, por qué e id), el contador en una región `role="status"` y el estado vacío con «Ver todos los talleres».
- **FR-005**: El taller DEBE conservar sus tres partes con el contenido de hoy. Explorar: el concepto, el modelo, la investigación, el límite, el checkpoint, el pie y las fuentes. Construir: el núcleo del lenguaje con su título, objetivo y pruebas, el puente, el aviso de código verificado, las herramientas previas, el pie y las fuentes. Entregar: el kit, los usos, las etapas, el límite, la nota, el checkpoint y las fuentes.
- **FR-006**: Una acción del modelo DEBE actualizar sólo la vista del modelo, su texto vivo, la lista de objetivos y el primer sello, sin redibujar el taller; DEBE dejar el foco en el mismo control; DEBE mostrar las últimas 8 líneas de la traza, abierta; y «Reiniciar modelo ↺» DEBE conservar objetivos y sellos. La vista DEBE redibujarse aunque la acción no alcance un objetivo nuevo.
- **FR-007**: Los sellos DEBEN seguir las reglas del README: Observación sólo con acciones del modelo (abrir o repetir no alcanza), Código sólo con evidencia del laboratorio, Predicción sólo respondiendo bien; se conservan al volver a practicar; los experimentos de la página no aprueban código (ADR 0003).
- **FR-008**: El foco y el desplazamiento DEBEN ser los de hoy: al abrir un taller, el foco va al título y `#main` queda arriba; al cambiar de parte, el foco va al botón de la parte y las pestañas quedan arriba; al elegir una familia, el foco queda en su botón; en «Ver todos los talleres», va al buscador; tras una acción del modelo, al mismo control; tras responder, a la opción. Volver al catálogo no mueve el foco. El plan no suma ni quita movimientos.
- **FR-009**: Todo DEBE poder operarse con el teclado, con foco visible y el diseño móvil de hoy. Las regiones vivas que hoy se recrean DEBEN quedar montadas (regla del épico), y el PR lista las diferencias de anuncio que eso produce.
- **FR-010**: El movimiento reducido DEBE depender de la regla global de `styles.css` y de las de `systems.css`; la celebración DEBE consultar `matchMedia` en cada llamada y no dibujarse con movimiento reducido; y DEBE quitarse al salir de la vista.
- **FR-011**: *(Q3)* La URL DEBE leerse sólo al montar (`taller` y `parte`; el idioma lo fija el shell) y escribirse con `history.replaceState` al abrir, al volver y al cambiar de parte: `?lenguaje=&taller=&parte=` con un taller, `?lenguaje=` en el catálogo, conservando los parámetros ajenos y sin sumar entradas al historial. Un `taller` desconocido DEBE abrir el catálogo y una `parte` inválida, Explorar. La gramática DEBE ser la de F2b. [NEEDS CLARIFICATION: Q3, si la selección pasa a nuqs en F5. La recomendada: no; el adaptador lee la URL al montar y la escribe con `replaceState`, y nuqs lo decide el spike de F10.]
- **FR-012**: «Entrar al IDE ↗» y las herramientas previas DEBEN ser anclas comunes con `?sistema=<taller>&ejercicio=<id>&paso=code#laboratorio`, que recargan el documento como fija F1 (L7); los enlaces externos DEBEN abrir en una pestaña nueva con `rel="noopener noreferrer"`; y el regreso desde el laboratorio DEBE abrir el taller en Construir (L8 y L11).
- **FR-013**: El progreso DEBE seguir en `taller-systems-v1`, con su formato v1: un registro `<lenguaje>:<taller>` con `observed`, `code`, `predicted`, `answer`, `steps` y `note`. Los IDs de talleres y objetivos, los índices de respuesta y los de etapa (el orden de `qa/fixtures/workshop-steps-v1.json`) NO DEBEN cambiar.
- **FR-014**: Arrancar y navegar a la vista NO DEBEN escribir, respaldar ni avisar (ADR 0003). Sólo escribe una acción del alumno; la nota DEBE escribir en cada tecla, sin debounce, y las casillas al marcarse. El sello de código derivado del laboratorio DEBE calcularse en memoria antes del primer dibujo; sólo `sync`, después de ejecutar un ejercicio, lo guarda.
- **FR-015**: Con el almacenamiento no disponible, la vista DEBE mostrar los avisos de hoy en el taller y en el estado de la nota.
- **FR-016**: Los avisos DEBEN salir por el `toast` del shell, con los textos y el orden de hoy: «Nueva situación comprendida: …», «Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.», «Checkpoint razonado. Contrastá la explicación con tu experimento.», «Revisá el porqué y probá otra explicación.», «Kit descargado con tu borrador y sus pruebas.» y «No se pudo preparar el kit: …». La celebración DEBE dispararse al obtener el tercer sello, por el modelo o por el checkpoint, antes del aviso. El kit DEBE bajar con el mismo contenido y nombre que hoy.
- **FR-017**: *(Q1)* La sesión DEBE ser un módulo que sobrevive a los desmontajes y montajes de la vista y se pierde al recargar: el estado de cada simulación por `lenguaje:taller` (creado al pedirlo, con el estado inicial del modelo), la familia y la búsqueda. «Borrar todo» DEBE reiniciar las simulaciones y NO DEBE tocar la familia ni la búsqueda. El reinicio DEBE ser alcanzable por `window.TallerSystems.resetSimulations()` y por la API pública del módulo. [NEEDS CLARIFICATION: Q1, dónde vive la sesión. La recomendada: un módulo de la propia página, con su reinicio en la API pública.]

**Cómo lee la página**

- **FR-018**: La página DEBE leer el progreso y el catálogo de talleres de `systemsEngine` con `useStore` y un selector que devuelva sólo la revisión, derivar el resto al dibujar (`get` y `list` clonan en cada llamada: nunca son el valor de un selector), y NO DEBE suscribirse al store completo ni guardar una copia del progreso en el estado de React. DEBE reflejar una escritura hecha fuera de la página, como el `sync` posterior a un ejercicio.
- **FR-019**: La vista DEBE redibujarse después de toda acción del alumno aunque el motor no avise, con un estado que no sea un valor derivado guardado.
- **FR-020**: El contenido DEBE llegar por el adaptador de `app/`, el único que puede leer `getContent()` (regla R5). La página y sus módulos NO DEBEN importar `app/content` ni leer `window`, `location` ni `history`; lo que viene de afuera (el aviso, la descarga del kit, la selección inicial y su escritura) lo inyecta el adaptador.
- **FR-021**: Cada contexto de evaluación DEBE tener una sola instancia del motor, de cada almacén y de la sesión: la página usa `systemsEngine` y ninguna fábrica, ninguna clave se abre fuera de su dueño y el guard (R1 a R6) sigue en verde sin relajarse. Si el plan debe cambiarlo, lo hace explícito, con su prueba. En particular, un check que empaqueta el adaptador por separado NO DEBE terminar con dos motores.
- **FR-022**: `init` DEBE correr antes de cualquier montaje, con los mismos insumos que hoy (talleres en el orden de FR-004, modelos y ejercicios), y el catálogo DEBE armarse una sola vez.

**La escena SVG**

- **FR-023**: El saneo DEBE ser una función pura en `entities/systems-simulation` con los valores de hoy: los números pasan por `Number` y, si no son finitos, toman el valor de respaldo (`undefined` y `NaN` toman el respaldo; `null` da 0); los tamaños, radios y el ancho de trazo no son negativos; la `viewBox` vale al menos 1 y por omisión 400 × 260; el trazo vale 1 por omisión, el cuerpo del texto 12 y su relleno `#252c27`; los colores sólo pasan si son `#` con 3 a 8 dígitos hexadecimales, `none`, `currentColor` o `transparent` (sin distinguir mayúsculas), y el resto toma el respaldo (`none`; `#eeeae1` para el fondo); se dibujan como mucho las primeras 2 500 formas; y las formas de un tipo desconocido se descartan.
- **FR-024**: La escena DEBE dibujarse con elementos de React, nunca con HTML armado a mano ni `dangerouslySetInnerHTML`; el texto de una forma DEBE ser un nodo de texto; el `alt` DEBE ir en `aria-label` con `role="img"`.
- **FR-025**: *(Q2)* La plantilla NO DEBE tener un `style="…"`, y el fondo del `<svg>` DEBE seguir teniendo el mismo `background` calculado con el color saneado. [NEEDS CLARIFICATION: Q2, cómo se retira el atributo. La recomendada: la propiedad `style` de React sobre el `<svg>`, con ese único sitio declarado y probado.]
- **FR-026**: Las specs del saneo y del componente DEBEN usar escenas hostiles escritas a mano (`NaN`, `Infinity`, `undefined`, `null`, tamaños negativos, `viewBox` en cero, colores `red`, `url(…)` y `#fff;position:fixed`, un texto con `<` y `"`, más de 2 500 formas y un tipo desconocido), con el valor esperado escrito a mano y no calculado por la misma función.
- **FR-027**: Las 9 escenas reales (`pc` y los 8 talleres de `play`) DEBEN producir el mismo SVG, atributo por atributo, que el `scene()` del commit base (comparación única).

**`window.TallerSystems` y los otros globals**

- **FR-028**: El adaptador DEBE publicar los nueve métodos de la tabla con los mismos nombres y firmas, y cada uno DEBE seguir existiendo hasta que se porte el último que lo llama.
- **FR-029**: `init()` DEBE devolver `{ storageAvailable, loadWarning }` con el mismo texto de aviso, inicializar el motor y quedar después de campaña, como fija `boot-check`.
- **FR-030**: `mount` DEBE crear una raíz nueva en cada montaje, con el idioma que entra sólo al montar, y `unmount` DEBE liberarla y detener la celebración; los dos DEBEN ser idempotentes. Un error de dibujo DEBE registrarse con `console.error`, como el Atlas.
- **FR-031**: `exerciseContextHTML`, `missionIDs`, `returnURL`, `refresh` y `sync` DEBEN devolver y hacer lo mismo que hoy: `lab-bridge-check` (21 escenarios) y los E2E de puentes pasan sin cambiar un valor esperado.
- **FR-032**: `window.TallerSystemsEngine`, `window.SYSTEMS_*` y sus `*_LABS`, `window.TallerProjectKit` y `window.TallerEffects` NO DEBEN cambiar, y `dump-globals` DEBE dar los mismos bytes.
- **FR-033**: La descripción del PR DEBE listar, por método de `window.TallerSystems`, quién lo llama y qué ítem lo retira (la tabla de arriba, verificada contra el código de ese momento).

**Qué se borra y qué se muda**

- **FR-034**: `frontend/systems.js` y `frontend/systems.css` DEBEN borrarse, sin ninguna referencia en el código de producción ni en las configuraciones.
- **FR-035**: El CSS DEBE mudarse a la página sin editar una declaración, y `main.tsx` DEBE importarlo en el mismo lugar del orden de carga.
- **FR-036**: En la cadena de módulos legacy y en `main.tsx` sólo DEBEN cambiar las líneas de Sistemas.
- **FR-037**: La documentación que nombra `systems.js` o `systems.css` DEBE actualizarse en el mismo cambio; la integra el coordinador.

**Cómo se demuestra**

- **FR-038**: El PR DEBE abrir con los E2E de comportamiento de Sistemas escritos contra el legacy, en verde, y esos mismos pasan sin editarse sobre la página portada. Si hay que editar uno, es un cambio de comportamiento y va aparte.
- **FR-039**: Los 106 E2E de F1 y los 17 de A2 DEBEN pasar sin editarse. Las specs existentes de `qa/e2e/specs/` no cambian; el Page Object de Sistemas sólo suma métodos.
- **FR-040**: Los checks de dominio y los oráculos DEBEN seguir verdes sin cambiar un valor esperado.
- **FR-041**: Cada check atado al legacy que se adapte DEBE listar la correspondencia del ADR 0008 (§5) en el PR: qué escenario queda cubierto por qué spec o E2E. Ningún check se retira por adelantado.
- **FR-042**: Cada módulo nuevo con comportamiento propio (el saneo, el filtro, la sesión) y cada componente DEBE empezar con una spec que falla por la razón esperada, en un commit aparte; los valores esperados salen del contrato, de las fixtures o de un ejemplo resuelto a mano, y se prueba comportamiento observable, sin tests tautológicos ni de funciones privadas. Los componentes se prueban con Testing Library por rol y nombre accesible, y las entradas se arman con fishery.
- **FR-043**: Una comparación única DEBE dar 0 diferencias entre `master` y la rama sobre el DOM normalizado de `#main` (ver «Cómo se demuestra»).
- **FR-044**: El barrido de estilo computado DEBE ampliarse como dice «Lo que el barrido de F2b no cubre hoy» y dar 0 diferencias.
- **FR-045**: `dist/index.html` DEBE quedar bajo el tope de `qa/build-check` (1 250 000 caracteres desde A2). El plan DEBE medir antes y después el aumento y, en particular, lo que suma importar `useStore` de `zustand`, la primera vez que se usa su entrada de React. Los 2 avisos de complejidad de `systems.js` (`onClick` 30 y `modelView` 11) DEBEN desaparecer y ninguna función nueva DEBE pasar de 10 sin justificarlo en la revisión.
- **FR-046**: F5 NO DEBE sumar ninguna dependencia de runtime. Las de desarrollo que falten (jsdom, Testing Library, fishery) entran con el primer uso y con permiso del usuario, y las instala el primer ítem que las necesite.

**Integración y entrega**

- **FR-047**: Los cambios DEBEN entregarse en un PR, revertible entero, con título y descripción en inglés (título `type(scope): subject`); el código, los nombres de test y los comentarios, en inglés; sin comentarios salvo que una función compleja o una referencia puntual los pida; la interfaz y los mensajes, en español.
- **FR-048**: F5 DEBE integrarse de a uno con F3, F4, F6 y F9 (ver «Integración»): el que llega después rebasa y repite su compuerta.
- **FR-049**: F5 NO DEBE editar `frontend/app.js`; el plan lo confirma con una búsqueda de `data-sys` y `sys-` y de las ramas de los delegados.
- **FR-050**: El PR DEBE dejar a F6, F7 y F8 el Page Object ampliado, el reinicio de la sesión por su API pública y la tabla de retiros.

### Key Entities *(include if feature involves data)*

- **Taller:** una de las 25 fichas de `content/workshops/` (id, título, familia, nivel, objetivos, predicción, etapas, núcleos Rust y Go, herramientas previas, fuentes y modelo). Es contenido; no se escribe.
- **Registro de progreso del taller:** `<lenguaje>:<taller>` con los objetivos observados, el sello de código, el de predicción, la respuesta, las etapas marcadas y la nota. Es lo único que la vista guarda, en `taller-systems-v1`.
- **Sellos:** Observación (los tres objetivos), Código (evidencia del laboratorio) y Predicción (la respuesta correcta).
- **Simulación:** el estado de un modelo para un `lenguaje:taller`, en memoria.
- **Sesión de Sistemas:** las simulaciones, la familia elegida y la búsqueda; sobrevive a navegar por hash y se pierde al recargar.
- **Escena:** el dibujo SVG que algunos modelos devuelven; sus datos pasan por el saneo.
- **Adaptador `window.TallerSystems`:** los nueve métodos que `app.js` y `lab.js` siguen llamando.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el build servido, los 106 E2E de F1, los 17 de A2 y los E2E nuevos de Sistemas pasan completos; los nuevos pasaron antes sobre el legacy; el diff de `qa/e2e/specs/` existente es vacío.
- **SC-002**: La comparación del DOM da 0 diferencias en, como mínimo, 2 catálogos (Rust y Go), las 4 familias, una búsqueda, los 150 estados iniciales de los 25 talleres × 3 partes × 2 lenguajes, un estado tras una acción del modelo en cada taller, un checkpoint contestado y las tres partes con los sellos de la fixture.
- **SC-003**: El barrido de estilo computado ampliado da 0 diferencias en cada captura de, como mínimo, las 14 páginas de F2b más las de la ampliación, a 1 280, 981, 850, 650, 590 y 375 px y con movimiento reducido apagado y encendido.
- **SC-004**: Las tres fixtures de progreso arrancan con 0 escrituras, 0 respaldos y 0 avisos; `curriculum-ids-check`, `systems-check`, los cuatro `systems-<dominio>-check`, `lab-bridge-check` (21 de 21), `project-kit-check`, `campaign-check` y `versioned-storage-check` pasan sin cambiar un valor esperado; `build/curriculum.json` y `dump-globals` dan los mismos bytes.
- **SC-005**: Las specs del saneo cubren los 12 casos de FR-026 y pasan; las 9 escenas reales dan 0 diferencias contra el commit base; el código de producción de `pages/systems` no contiene `innerHTML`, `dangerouslySetInnerHTML` ni `style="`, y su único `style={…}` es el declarado.
- **SC-006**: `window.TallerSystems` publica sus nueve métodos y el PR trae la tabla de llamadores y retiros; `boot-check` y `app-shell-check` pasan.
- **SC-007**: `dist/index.html` queda bajo 1 250 000 caracteres, con el aumento medido e informado; `npm run lint` pierde los 2 avisos de `systems.js` y no suma ninguno.
- **SC-008**: Una búsqueda en el código de producción y las configuraciones de `systems.js` y `systems.css` no devuelve nada; el PR se revierte con un solo `revert`; `docker compose build taller` construye.
- **SC-009**: El PR informa cuánto suman los E2E nuevos al job `front` de la CI.

## Riesgos

1. **El DOM de React se aparta del legacy.** Un contenedor, un orden de hermanos o una clase de menos cambia la cascada y rompe cada clave del barrido. *Mitigación:* FR-001, la comparación del DOM (FR-043) y el barrido ampliado.
2. **Actualizaciones parciales.** El legacy actualiza partes del DOM sin redibujar (el catálogo y el contador al buscar, el modelo al actuar, el estado de la nota al escribir); un redibujo completo perdería el foco, el cursor y el anuncio de las regiones vivas. *Mitigación:* FR-006, FR-008 y los E2E del cursor y del foco.
3. **El motor no avisa de todo.** Una acción del modelo que no alcanza un objetivo no cambia la revisión; si la vista depende sólo de ella, no se redibuja. *Mitigación:* FR-019 y su E2E.
4. **Dos motores en un check.** Cada fuente que un check empaqueta es un bundle aparte: si el adaptador importa el índice del motor, el contexto termina con dos. *Mitigación:* FR-021 y la verificación V3.
5. **El selector de Zustand.** Un selector que devuelve un objeto nuevo en cada llamada (el resultado de `get` o de `list`) rompe `useSyncExternalStore`. *Mitigación:* FR-018.
6. **Presupuesto de tamaño.** Quedan unos 100 KB bajo el tope de A2 (la última medida que el coordinador hizo del ensayo fue de unos 1,14 millones de caracteres; el plan la vuelve a tomar) y la entrada de React de Zustand se usa por primera vez. *Mitigación:* FR-045 y V1.
7. **Orden con F3.** Si F5 llega antes que la pila de DOM, la instalación, la configuración de Vitest y el permiso se suman a F5. *Mitigación:* «Acciones del usuario».
8. **Colisiones con F6, F3, F4 y F9.** Una cadena, una hoja de estilos y las tablas de los checks compartidas. *Mitigación:* FR-048 y la lista de «Integración».
9. **Límites de jsdom.** No implementa `scrollIntoView` ni `matchMedia`; los movimientos de foco y el desplazamiento se prueban en E2E, y las specs definen un doble mínimo cuando lo necesitan (ADR 0008).
10. **Sin ejecutar.** Esta spec se escribió leyendo el código del ensayo, sin correr `npm`, Docker ni el navegador. Los números de las compuertas del ensayo no se repitieron; el plan los mide sobre la base real.

## Relación con otros ítems

| Ítem | Relación |
| --- | --- |
| F2a y F2b | Se toman como hecho (ver arriba). F5 espera a que se integren los PR #41 a #44 |
| A2 | F5 edita una línea de `legacy-views.ts` y las restricciones de `load-order-check`; hereda un solo pedido de contenido por carga y el tope de 1 250 000 caracteres |
| C4 | Su clarify (Q3, opción B) dejó `style-src-attr 'unsafe-inline'`: C4 no espera a F5. La fila de C4 de la hoja de ruta («espera a F5, F7 y F8») y el motivo del retiro del `style=` quedaron viejos |
| D1 | Sincroniza por ID los sellos (`workshop.objective`, `workshop.predictionCorrect`), la respuesta, las etapas y la nota (`frontend/src/features/progress-sync/model/field-kinds.ts`): F5 no cambia ningún ID ni índice |
| F3, F4, F6 y F9 | Se integran de a uno con F5; la pila de DOM la instala el primero que la necesite |
| F6 | Tiene su propio adaptador y comparte `lab-bridge-check`, `legacy-views.ts` y las tablas de los checks. Retira `window.TallerCampaign`; no toca `window.TallerSystems` |
| F7 | Retira `refresh`, `missionIDs`, `returnURL`, `exerciseContextHTML` y el `sync` de `lab.js` de `window.TallerSystems`. La spec de A4 (PR #50, `specs/017-a4-laboratorio-sandbox/`) exige en su FR-022 que la sincronización de Sistemas al aprobar siga igual |
| F8 | Retira `resetSimulations` si arma los pasos de sesión, y amplía el Page Object mínimo de Método |
| F10 | Retira `init`, `mount`, `unmount`, el `sync` de `app.js`, `window.TallerProjectKit` y los `register-*`, y decide el router y nuqs |
| E1 | Los conteos de la vista («N talleres», «2N núcleos») ya salen del catálogo; los del menú estático (`.nav-count`) son de F10 |

### Hallazgos que afectan a otros ítems

1. **C4 no espera a F5.** Con el clarify de C4 (Q3, B), el `style=` del SVG ya no bloquea la CSP; la hoja de ruta (fila de C4 y «Alcance» de F5) lo dice al revés.
2. **Los retiros de `window.TallerSystems` están incompletos en la hoja de ruta.** `init` no figura y se retira con `startApp` (F10); `sync` lo llama también `app.js` (F10 o F8); `resetSimulations` depende de quién arme `progress-backup` (F8 o F10).
3. **`AGENTS.md` y la hoja de ruta se contradicen sobre nuqs.** Sistemas es la primera vista portada con estado en la URL (Q3).
4. **El tope de tamaño de la hoja de ruta quedó viejo.** Sus criterios globales citan 2 500 000 caracteres y unos 300 KB de margen; desde A2 el tope es 1 250 000.
5. **La pila de DOM tiene dos candidatos a instalarla** (F3 y F5), y `boot-check` tiene el caso del Atlas escrito a mano: cada port lo generaliza.
6. **El grep de `style=` de las compuertas de F2b marca el `style={…}` de JSX** (Q2).
7. **El mapa dice que el motor de Sistemas sin `init` devuelve `[]`**; desde F2a lanza.
8. **Defectos de la vista que se conservan** y pueden ser un seguimiento: el foco que se pierde al volver al catálogo y «1 talleres para explorar».

## Assumptions

- F5 se implementa sobre `master` con F2a, A2 y F2b (PR #41 a #44) integrados; el ensayo `2b37caf4` es esa base. Si A2 no estuviera, la cadena sigue siendo la lista de imports de `main.tsx`.
- El adaptador es un archivo `frontend/src/app/legacy/register-systems.tsx` (o dos, si el plan separa los métodos sin React) que, como el del Atlas, crea una raíz sobre `#main` en cada montaje y registra `onUncaughtError`. La página vive en `frontend/src/pages/systems/` (`ui`, `model`) y expone una API pública chica.
- La página no lee `window`, `location` ni `history`: el adaptador le pasa la selección inicial, el aviso, la descarga del kit y lo que lee de `window.TallerLab`, y escribe la URL (FR-020).
- El sello de código se calcula en el adaptador antes del primer dibujo y no se vuelve a calcular mientras la vista está montada: el estado del laboratorio sólo cambia en la vista del laboratorio o en una importación, y las dos remontan la vista.
- `window.TallerProjectKit` se queda y el adaptador inyecta la descarga del kit; la página no lee `window`. La alternativa (que la página use `features/download-project-kit` y los almacenes) deja al global sin consumidor.
- Los `data-sys*` desaparecen; ninguna hoja, check ni herramienta los usa (se buscó en `qa/`, `tools/`, `frontend/src/` y las hojas).
- El CSS se muda sin editar y sin partir (YAGNI).
- `zustand` 5.0.15 ya está instalado (F2a, sólo `zustand/vanilla`); `useStore` viene de `zustand` ([documentación](https://zustand.docs.pmnd.rs/reference/hooks/use-store)).
- Las fixtures y la documentación citadas son las de `master`; las rutas del ensayo se confirman al integrar F2b.
- Los E2E nuevos suman tiempo al job `front`; el plan lo mide y lo acota (la suite corre con un solo worker en la CI).

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las tres primeras son las preguntas del clarify; sus opciones y costos están en «Preguntas abiertas».

| Decisión | Alternativas | Por qué la elegida |
| --- | --- | --- |
| Dónde vive la sesión (Q1) | Módulo de la página (recomendada); módulo del adaptador, como el Atlas; módulo de la entidad con su store | La más chica; ver Q1 |
| Cómo se retira el `style=` (Q2) | Propiedad `style` de React (recomendada); `<rect>` de fondo; mantener el atributo | Conserva árbol y píxeles; ver Q2 |
| nuqs en F5 (Q3) | No (recomendada); sí | Un port no cambia el contrato de URL; ver Q3 |
| Cómo se porta la plantilla | Componentes de React con la gramática de F2b y el motor por `useStore` (elegida); conservar las plantillas y pasarlas por `dangerouslySetInnerHTML` | Lo segundo no retira el `style=`, mantiene el delegado de eventos y contradice «el código nuevo usa React» |
| El CSS | Mudar el archivo sin editar (elegida); partirlo por componente; CSS Modules o Tailwind | Cero riesgo visual y un diff que se puede verificar; lo demás es otro cambio con su barrido |
| Partir F5 | No partir (elegida, 50 requisitos, bajo los 52 de C3a); F5a (E2E de caracterización, saneo y sesión) y F5b (página y borrados) | Un solo PR revertible entero, como pide la hoja de ruta; partir demora a F7, que espera a F5 |
| Quién lee el estado del laboratorio | El adaptador, por `window.TallerLab`, mientras `lab.js` exista (elegida); la página, con `labStore` | El adaptador ya depende de `window` y la regla R4 le impide importar el índice del laboratorio; la página queda sin saber del laboratorio |

## Acciones del usuario

Los agentes no las hacen. Cada descarga pide permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII).

| Cuándo | Acción |
| --- | --- |
| Antes del plan | Responder las tres preguntas abiertas |
| Al escribir la primera spec de componente, si F3 no llegó antes | Permiso para `jsdom` 30.1.2 y Testing Library (`@testing-library/react`, `dom`, `user-event` y `jest-dom`): 56 paquetes, unos 26,3 MB desempaquetados y 5,0 MB comprimidos, según la estimación del ADR 0008 |
| Al escribir la primera factory, si nadie la instaló | Permiso para `fishery` 2.4.0: 2 paquetes, unos 0,19 MB |
| Sólo si Q3 se responde B | Permiso para `nuqs`, con su peso medido antes |
| Al verificar | Permiso para `docker compose build taller` |

## Verificaciones previas del plan

Supuestos técnicos que esta spec no pudo probar (sólo leyó el código, sin correr nada). El plan los comprueba al empezar.

| ID | Pregunta | Pasa si |
| --- | --- | --- |
| V1 | ¿Cuánto suma importar `useStore` de `zustand` al `dist/index.html`? | El aumento total de F5 deja el HTML bajo el tope, con margen |
| V2 | ¿La propiedad `style` de React sobre el `<svg>` pasa una política con `style-src 'self' 'nonce-…'` y sin `style-src-attr`? | Sirviendo el build con esa cabecera, la escena se ve y la consola no registra violaciones |
| V3 | ¿El adaptador y la página dejan un solo motor en los checks que empaquetan el adaptador por separado? | `lab-bridge-check` pasa con el motor del adaptador y sin otro en el bundle, o el plan cambia el guard con su prueba |
| V4 | ¿El DOM de React coincide con el legacy elemento por elemento, incluido el modo de `<details>`, `checked` y `value`? | La comparación del DOM da 0 diferencias en los estados de SC-002 |
| V5 | ¿Cuánto suman los E2E nuevos al job `front`? | Se informa y queda dentro de lo que el coordinador acepte |
