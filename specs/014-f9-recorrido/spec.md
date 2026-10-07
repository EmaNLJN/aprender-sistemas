# Feature Specification: F9 · Port de Recorrido a React

**Feature Branch**: `014-f9-recorrido` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-07

**Status**: Draft: especificada, con cuatro preguntas abiertas para el clarify (Q1 a Q4) y sin plan

**Input**: Ítem **F9** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Recorrido»: portar a React los pasos, el temporizador, las notas y la lección sin que el alumno note el cambio. Encargo del coordinador del 2026-10-07 (ver «Lo que pidió el usuario»). Depende sólo de F2a ([spec](../009-f2-seams/spec.md), [plan](../009-f2-seams/plan.md)), implementada en el PR #40, aunque la hoja de ruta lo ubique en el tramo 4. **Describe el código de `f2a` (`2ffbbc6`: `master` más F2a y A2), no el de `master` (`e87772d`), que todavía no los tiene.** Lo que toma de F2b (unidades 5 a 8, con su [plan](../009-f2-seams/plan-f2b.md), en implementación) es un supuesto. Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** El Recorrido es la vista de entrada del taller (`#recorrido`, y lo que muestra cualquier hash desconocido). Hoy lo dibuja `frontend/app.js` con cadenas de HTML (`renderRoute`, `timerMarkup` y `openLesson`) y lo mueven tres delegados de eventos sobre `#main`, dos oyentes del `<dialog id="lesson-dialog">` estático de `index.html` y un `setInterval` de 500 ms que corre en todas las vistas desde el arranque. F9 lo lleva a una página de React que conserva el aspecto, los textos, el teclado, las URL y el progreso guardado. Tres cosas hay que cuidar, porque la red de F1 no las fija (o las fija sólo en parte) y un port ingenuo las rompe: el temporizador sigue corriendo, y avisa al terminar, aunque el alumno esté en otra vista; la barra lateral y la etiqueta de guardado las actualiza `app.js` después de cada escritura, y la página nueva ya no pasa por ahí; y el foco vuelve por tres caminos distintos según cómo se cierre la lección. Además, el encargo y la hoja de ruta ponen las «notas» en F9, pero en el código el Recorrido no dibuja ni escribe ninguna: viven en Método (Q1). Es para quien porta vistas y para quien revisa el PR; para el alumno no cambia nada. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. La red de F1 (106 E2E) y los 17 de A2 pasan sin editarse con el build del port, incluido el E2E que fija que el temporizador sobrevive a una navegación por hash y se pierde al recargar.
2. Los E2E nuevos del Recorrido (pasos, lección, temporizador, idioma y «Borrar todo») pasan contra el legacy antes de portar y, sin editarse, contra la página nueva.
3. La página produce el mismo DOM que `renderRoute` y `openLesson` (salvo los `data-*` de delegación, que se retiran con sus ramas) y las hojas de estilo no cambian (Q2, opción A): el alumno no ve nada distinto.
4. Cada acción que cambia el progreso hace una escritura; montar la página, contar el tiempo y abrir o cerrar la lección sin responder no escriben nada. Las fixtures congeladas de progreso arrancan sin escribir, sin respaldar y sin avisar.
5. `app.js` pierde todo lo del Recorrido (`renderRoute`, el intervalo, `#lesson-dialog` y sus ramas) y el shell conserva un adaptador de tres métodos.
6. Con el temporizador detenido no queda ningún intervalo vivo, y el aviso de fin sale aunque el alumno esté en otra vista.

**Entra:**

- La página del Recorrido y la lección, con el modelo puro que necesitan (los selectores de pasos, las acciones de escritura y el temporizador), en una página nueva de `frontend/src/pages/`.
- El adaptador mínimo de `frontend/src/app/legacy/` y el corte de `app.js`, de `index.html` y de los arneses de `qa/` que lo cargan.
- Los E2E de comportamiento con su Page Object, las specs de Vitest (modelo y componentes) y la documentación que cambia con ellos (`docs/architecture.md` y `qa/AGENTS.md`).

**Queda fuera:**

- La bitácora de notas, `#note-state`, el pedido al tutor y su botón de copiar: están en `renderMethod`, que porta F8 (Q1).
- Biblioteca, Proyecto y Método (F3, F4 y F8); el shell, el router, la barra lateral y `syncShell` (F10); el contenido de `content/guide/`; cualquier cambio de IDs, de formas guardadas o de URL.
- Guardar el temporizador (en `localStorage`, en `sessionStorage` o en el servidor) y la sincronización de la cuenta (D1c).
- Mover o editar reglas de CSS (Q2, opción A) y el `aria-pressed` que `syncShell` pone en `<body>`, defecto que F1 fija y corrige quien porte el shell.

**Sin hacer a propósito (YAGNI):** un temporizador por lenguaje, otras duraciones, sonido o notificaciones del navegador; recordar los módulos que el alumno abrió; un contexto o un provider del progreso; memoización; una librería de animación o de diálogos; capturas de pantalla y pruebas con axe; E2E con dos pestañas; el debounce de la escritura (el Recorrido no tiene campos de texto).

**Actores:** quien porta una vista (el usuario y los agentes que implementan); quien revisa el PR; el agente principal, que integra `main.tsx`, `legacy-views.ts`, `package.json`, las configuraciones y la documentación; y el alumno, que no debe notar nada.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta del clarify.

| Pedido | Fuente |
| --- | --- |
| Port y no rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso guardado, los IDs y las URL | Usuario, 2026-10-05 (supuesto que no corrigió) |
| Las vistas una por una, las hojas primero y cada raíz de React dentro del shell legacy, como el Atlas | Usuario, 2026-10-05 |
| Antes de portar, E2E con Playwright y Page Objects contra la versión actual; las piezas nuevas llevan Vitest, Testing Library y fishery | Usuario, 2026-10-05; clarify de F1, Q1 |
| La suscripción al progreso con Zustand: `useStore` con un selector chico, nunca con el store entero | Usuario, clarify de F2, 2026-10-06 (Q3); `AGENTS.md` |
| F9: pasos, temporizador (sin el `setInterval` global), notas y el diálogo de la lección, que devuelve el foco a quien lo abrió | Hoja de ruta, F9 (la parte de las «notas» choca con el código: Q1) |
| Con la recarga se pierde el temporizador | Hoja de ruta, «Estado y evidencia», 2026-10-05; E2E de F1 |
| Pasos, minutos y notas se leen y se escriben por `routeStore`, sin otra instancia ni otra clave; D1 los sincroniza, así que los IDs y las formas no cambian | Coordinador, 2026-10-07 |
| F9 depende sólo de F2a y se integra de a uno con F2b, F3 y F4, que comparten `app.js` | Coordinador, 2026-10-07 |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla | Coordinador, 2026-10-07 |
| La documentación va en español; el código y las pruebas, en inglés | `AGENTS.md` |

## Preguntas para el clarify

Cuatro, con su opción recomendada. Los requisitos de abajo asumen la recomendada y llevan el marcador `[NEEDS CLARIFICATION]` donde la respuesta los cambia (FR-008, FR-017, FR-037 y FR-041).

### Q1 · ¿Dónde van las notas, el estado de la nota y el pedido al tutor?

**Qué encontramos.** En `f2a`, `#recorrido` no dibuja ni escribe ninguna nota. La bitácora (`#note-learned` y `#note-next`), `#note-state`, `#tutor-prompt` y «Copiar pedido para mi tutor» son de `renderMethod`; la entrada del menú que los aloja se llama «Método y notas» y el README las lista aparte del recorrido. Las guarda la rama `data-note` del delegado de entrada, que F8 retira con la página. Del Recorrido sólo dependen por los `minutes` (el pedido dice «Tengo N minutos», y los elige la tarjeta del temporizador) y por el aviso «Dejá una nota…» que muestra la lección. La hoja de ruta pone «notas» en F9 y no las nombra en F8.

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Son de F8, con la página de Método. F9 porta lo que dibuja `#recorrido` y la lección; las notas siguen en `renderMethod` y se siguen escribiendo por `routeStore`, sin cambios | La hoja de ruta cambia: F9 pierde «notas» y F8 suma la bitácora, su estado y el pedido al tutor (escritura en cada tecla y el `execCommand` de respaldo del portapapeles). F9 queda más chico |
| B | F9 porta la bitácora y el pedido al tutor como un componente y lo monta dentro del HTML de Método hasta F8 | Una raíz anidada en una vista que se redibuja entera: se pierde en cada `render()`, que es la razón por la que los exploradores migran con el laboratorio. F9 toca una vista que no es suya y F8 lo vuelve a portar |
| C | F9 sólo extrae `tutorPrompt` como modelo puro, con su spec | Código sin consumidor hasta F8 (YAGNI); el resto queda como en A |

**Recomendada: A.** F9 no tendría qué dibujar ni qué probar para las notas, y B repite el patrón que la hoja de ruta ya descartó para los exploradores.

### Q2 · ¿Se mueven a otra hoja las reglas de `styles.css` que sólo usa el Recorrido?

**Qué encontramos.** El Recorrido no tiene hoja propia. Una lectura con `postcss` de `styles.css` en `f2a` da unas 114 reglas de las 336 cuyos selectores nombran una clase que sólo usa el Recorrido (71 en el bloque base y 43 repartidas en cinco `@media`: 1 550, 1 150, 850 y 590 px, y `print`). La hoja de ruta dice que los ports «borran las reglas que ninguna otra vista usa» y que F10 borra «las reglas de `styles.css` que ya nadie use». Ningún E2E de F1 mide el aspecto propio del Recorrido: `css-contract.spec.ts` lo usa como pantalla neutra para medir el menú y la barra lateral.

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Ninguna hoja cambia en F9: la página usa las mismas clases y el `<style>` del dist queda idéntico (se compara por hash). Las reglas exclusivas del Recorrido siguen en `styles.css` hasta que F10, que ya borra las reglas sin uso, las reubique con la raíz única | La convención de la hoja de ruta no se cumple en este port: `styles.css` conserva unas 114 reglas del Recorrido hasta F10, y F10 hereda ese traslado |
| B | Mover las reglas exclusivas a la hoja de la página, como `atlas.css`, cada una entera y en el orden de hoy | Un barrido de estilo computado como el de la unidad 8 de F2b (981, 850, 650 y 590 px, más 1 280 y 375, con el movimiento reducido encendido y apagado) y la comparación del conjunto de reglas del dist; riesgo de cascada, porque `styles.css` se evalúa primero; el `<style>` cambia de orden |

**Recomendada: A.** Es lo único que protege el aspecto sin construir una protección que hoy no existe. La decisión vale para F3, F4 y F8: conviene que las cuatro specs digan lo mismo.

### Q3 · ¿Qué hacemos con la región viva de la lección (`#quiz-feedback`)?

**Qué encontramos.** Es la pregunta abierta de F9 en la hoja de ruta («si se anuncian las regiones vivas que hoy se recrean»). `openLesson` reescribe el contenido del diálogo en cada apertura, así que `#quiz-feedback` (`role="status"`, `aria-live="polite"`, con `hidden` hasta que hay respuesta) se recrea cada vez, y al responder se muestra con su texto. Es la única región viva del Recorrido que se recrea: `#toast` es estático y los dígitos del temporizador (`role="timer"`) no anuncian por omisión. Nadie verificó qué anuncia un lector de pantalla, y esta spec tampoco pudo. React reutiliza el nodo entre aperturas salvo que se lo remonte a propósito.

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Conservar: el contenido de la lección se remonta en cada apertura, como hoy, y la región se muestra al responder. La comprobación con un lector de pantalla queda como acción manual del usuario, antes sobre el legacy y después sobre la página | El «no verificado» sigue: sin lector de pantalla no se puede asegurar que la devolución se anuncie |
| B | Mantener la región montada y siempre visible (vacía hasta que haya respuesta), para que el cambio de texto se anuncie de forma fiable | Cambia el comportamiento (mejora de accesibilidad): va en su propio commit, con TDD y con aprobación. Una región vacía visible dibuja el borde y el relleno de `.quiz-feedback`, así que exige una regla de CSS (`:empty`), lo que choca con Q2 opción A |

**Recomendada: A.** Un port conserva lo que se anuncia hoy; mejorarlo pide un lector de pantalla para medirlo, y B además toca el CSS.

### Q4 · ¿Dónde vive el diálogo de la lección?

**Qué encontramos.** `#lesson-dialog` es un `<dialog>` estático de `index.html`, fuera de `#main`, y `render()` nunca lo toca. Si el alumno usa Atrás o Adelante con la lección abierta, la lección sigue abierta sobre la vista nueva con el contenido de la anterior, y «Marcar como hecho» redibuja la vista nueva. La hoja de ruta dice «Borra: `#lesson-dialog`».

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Dentro de la raíz de la página: sale de `index.html` y, si el alumno navega con la lección abierta, se cierra con la página. Es la única diferencia visible con hoy en este flujo | Un comportamiento distinto en un caso borde, y ese caso queda sin E2E (uno que fije «sigue abierta» tendría que editarse) |
| B | En una raíz propia sobre un contenedor estable del shell (un `<div>` en `index.html` en lugar del `<dialog>`): la lección sigue abierta como hoy | Un segundo `createRoot` y un host nuevo en el marcado estático, que F10 mueve a la raíz única; conserva un comportamiento que es un defecto, no un contrato |

**Recomendada: A.** Una lección abierta sobre otra vista, con contenido viejo, no es algo que el alumno use.

## El Recorrido de hoy, en `f2a@2ffbbc6`

Es el contrato que el port conserva. Las funciones son las de `frontend/app.js`.

**Lo que dibuja `renderRoute`, en orden:** (1) el encabezado (`section.hero`, «Bienvenida»): «TU TALLER DE RUST» o «GO», el título, la descripción, la meta («Rust · recomendado para vos» o «Go · construir y experimentar», «4 etapas» y «N sesiones a tu ritmo») y la ilustración de código (`main.rs` o `main.go`); (2) el aviso «Completaste tu recorrido inicial…», sólo con todos los pasos completos; (3) la tarjeta «Sesión de hoy»: «TU PRÓXIMO PASO · NN / MM» con el título y el objetivo del primer paso sin completar y el botón «Empezar esta sesión» (o, sin pasos pendientes, «TU SIGUIENTE EXPERIMENTO» y el enlace «Continuar mi proyecto» a `#proyecto`), con el temporizador al lado; (4) «Un camino, paso a paso.»: el contador «N DE MM COMPLETADOS» y los módulos (`details.module`, con el primero que tiene un paso pendiente abierto, o el último si no queda ninguno), cada uno con su número, su título, su conteo `n/3` y sus pasos (casilla, título con «Una sesión orientativa · 25 min» y un botón «↗»); (5) la franja con los recursos recomendados. El contenido sale de `GUIDE_DATA`: 12 pasos por lenguaje, en 4 módulos de 3, de 25 minutos y con una pregunta de 3 opciones.

**El temporizador de hoy.** Lo guarda un objeto del cierre de `startApp()` (si corre, cuánto resta, cuándo vence) y lo mueve el intervalo de 500 ms, que no se cancela nunca y actúa sobre los `.timer-digits` y `.timer-toggle` que haya en el documento. Los estados observables son estos:

| Estado | Cómo se llega | Dígitos | Botón principal |
| --- | --- | --- | --- |
| Reposo | al arrancar, al elegir una duración, con «↺» y con «Borrar todo» | `mm:00` con los minutos guardados (15, 25 o 45) | «Iniciar foco» |
| En marcha | «Iniciar foco» o «Continuar» | `mm:ss`: el techo de los segundos que faltan para el vencimiento | «Pausar» |
| En pausa | «Pausar» | el restante al pausar | «Continuar» (o «Iniciar foco» si el restante es la duración completa) |
| Terminado | el restante llega a 0: se detiene y avisa por `#toast` | `00:00` | «Iniciar foco» (al iniciar parte de la duración elegida) |

Las duraciones son un grupo («Duración de la sesión») de botones con `aria-pressed`; los dígitos tienen `role="timer"` y «Tiempo restante»; «↺» se llama «Reiniciar temporizador». Navegar por hash no lo toca; recargar o seguir un enlace que cambia la query lo pierde.

**La lección de hoy.** `openLesson(id, opener)` recuerda al elemento que la abrió, reescribe `#lesson-content` y abre el `<dialog>` con `showModal()`. Contiene la etiqueta («RUST · UNA SESIÓN ORIENTATIVA»), el botón «×» («Cerrar sesión»), el título (`#lesson-title`), el objetivo, «Tu desafío», «LO LOGRASTE CUANDO», los recursos como enlaces, la pregunta con sus opciones A, B y C (`aria-pressed`), la devolución (`#quiz-feedback`) y dos acciones: «Seguir después» y «Marcar como hecho ✓» (o «Volver a practicar ✓» si el paso ya estaba completo). Responder guarda la respuesta y muestra «Bien pensado. » o «Revisemos la idea. » más la explicación. Completar alterna el paso, guarda, cierra, redibuja la página, devuelve el foco y avisa («Un paso más. Dejá una nota para tu próxima sesión.» o «Paso disponible para volver a practicar.»).

**El foco, por tres caminos.** (a) «×», «Seguir después» y Esc: el evento `close` enfoca al elemento que abrió la lección, si sigue en el documento (`preventScroll`). (b) «Marcar como hecho» y «Volver a practicar»: la página se redibuja y `restoreStepFocus` enfoca el primer botón de lección de ese paso en el orden del documento, abriendo su módulo; el `close` posterior ya no encuentra al abridor conectado (inferido de la especificación de `<dialog>`, sin verificar en un navegador: lo fija el E2E). El primer botón es el de la tarjeta si el paso vuelve a ser el próximo. (c) Una casilla: tras guardar y redibujar, el foco vuelve a esa casilla con su módulo abierto.

**Lo que comparte con el shell.** `save()` guarda por `routeStore` y llama a `updateSaveLabel()`; `render()` desmonta las otras vistas, llama a `syncShell()` (idioma, `aria-current`, «N de 12», el porcentaje, la barra de progreso y la etiqueta de guardado) y dibuja la vista. La barra lateral sólo se entera de un cambio del recorrido porque `save()` y `render()` son de `app.js`.

**Rarezas que el port conserva** (cambiarlas es otro commit, con TDD y con aprobación; cada una lleva `KNOWN DEFECT` en el nombre de su E2E):

| Rareza | Dónde se ve | Requisito |
| --- | --- | --- |
| Los módulos vuelven a su estado por omisión con cada redibujo (casilla, lección completada, idioma, importar y «Borrar todo»), también los que el alumno abrió a mano | `render()` reescribe `#main` | FR-025 |
| Elegir la duración ya elegida guarda de nuevo y detiene y reinicia el temporizador en marcha | `duration` | FR-020 y FR-028 |
| «Volver a practicar ✓» no repasa nada: pasa el paso a incompleto | `complete` | FR-035 |
| Al completar o reabrir, el foco va al primer botón de lección del paso, que puede ser el de la tarjeta | `restoreStepFocus` | FR-036 |
| El aviso de fin sale en cualquier vista, también con una lección abierta (el toast está fuera del diálogo) | el intervalo global | FR-029 |
| La etiqueta de la lección usa el idioma activo, no el del paso | `openLesson` | FR-033 |
| El `div` de la ilustración lleva `aria-label` sin rol | `renderRoute` | FR-040 |

## El corte en `app.js`

**Se retira** (todo en el commit que monta la página, por la regla de los delegados):

| Qué | Por qué |
| --- | --- |
| `renderRoute`, `routeCode` y `timerMarkup` | los reemplaza la página |
| `updateTimer`, el objeto `timer` y `setInterval(updateTimer, 500)` | el temporizador pasa a su dueño, sin intervalo global (FR-013) |
| `openLesson`, `showQuizFeedback`, `currentStepId`, `lessonOpener`, `allSteps` y los oyentes `click` y `close` de `#lesson-dialog` | la lección es de la página |
| `restoreStepFocus` | el foco lo devuelve la página |
| En el delegado de clic, las ramas `lesson`, `duration`, `timer` y `timer-reset`; en el de cambio, `stepCheck` | para no manejar un evento dos veces |
| En `render()`: la rama `recorrido: renderRoute` (pasa a un `mount`, con su `unmount` junto a los otros) y la llamada final a `updateTimer()` | el despacho de la vista |
| En `#confirm-reset`: las dos líneas del temporizador (o, si la unidad 6 de F2b ya llegó, el cierre de `sessionResets` que usa `timer`) | pasan a `window.TallerRoute?.resetTimer()` |
| De `frontend/src/index.html`: `<dialog id="lesson-dialog">` | la lección es parte de la página (Q4) |
| De los arneses de `qa/lib/` (`app-shell-harness.ts` y `boot-harness.ts`): los ids `lesson-dialog` y `lesson-content` | ya no existen |

**Queda en el shell, con quién lo retira:**

| Qué | Lo retira |
| --- | --- |
| `routeState`, `save`, `updateSaveLabel`, `toast`, `syncShell` (la barra lateral), `stepsFor`, `completedCount` y `languageName` | F10 (los usan la barra lateral, Proyecto y Método) |
| `render()` (el despacho y los desmontajes), `navigateFromLocation`, `hashchange` y `popstate`, el manejador de `[data-language]`, `.skip-link` y `syncLinkedLanguage`; el `'recorrido'` por omisión y el aterrizaje de `#invitacion=` | F10 (la unidad 5 de F2b cambia cómo leen la URL, no qué hacen) |
| `toggleItem` | el último de F3, F4 y F9 en integrarse: Biblioteca y Proyecto lo usan hasta entonces |
| `renderLibrary`, `renderProject`, `renderMethod` (con las notas, el pedido al tutor y `copyPrompt`, Q1), la exportación, la importación y «Borrar todo» | F3, F4 y F8 |

**El adaptador mínimo.** `window.TallerRoute` (nombre provisional), publicado por `frontend/src/app/legacy/register-route.tsx`, con sólo `mount(host, language, toast)`, `unmount()` y `resetTimer()`. `mount` y `unmount` los retira F10; `resetTimer`, F8 (la spec de F8 lo confirma, como la de F7 con `TallerLab`). Lee `getContent().guide` al montar y se lo pasa a la página por props; recibe el `toast` del shell, que es el único `notify`; no importa `routeStore` (R4 de `seams-guard-check`: lo importa la página). Se evalúa antes que `app.js` en `legacy-views.ts` y en la tabla de `load-order-check`, y entra en `qa/lib/app-adapters.ts`, de donde salen los fakes de `app-shell-check` y lo que exige `boot-check`.

**Qué toca de lo que F2b mueve:**

| Unidad de F2b | Qué cambia en `app.js` | Qué hace F9 |
| --- | --- | --- |
| 5 (URL y puentes) | la lista `views` pasa a `viewFromHash`, `syncLinkedLanguage` usa `readLinkQuery` y el manejador de idioma usa `withLanguageQuery` | No toca esas líneas. `viewFromHash` sigue dando `recorrido` para `''`, `#` y `#invitacion=abc`. Las dos editan el bloque de imports y `startApp()`: la que llega después rebasa |
| 6 (respaldo) | `#confirm-reset` y `#import-file` pasan a `progressBackup`; `sessionResets` registra el reinicio de las simulaciones y un cierre sobre `timer` | Reemplaza ese cierre por `window.TallerRoute?.resetTimer()`, en el orden de hoy (después de los cuatro almacenes y de las simulaciones, antes del `save()`). Si la unidad 6 todavía no llegó, reemplaza las dos líneas del manejador |
| 7 y 8 | los exploradores y 26 reglas de CSS, ninguna del Recorrido | Nada |

## Qué cambia en `dist/index.html`

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `dist/content/curriculum.<versión>.json` | No | `content/` y el generador no cambian: `dump-globals`, `dump-dist-globals` y `dist-content-check` dan los mismos bytes |
| El marcado de `frontend/src/index.html` | Sí, una línea | sale `<dialog id="lesson-dialog">` (Q4); el resto (ids, menú, conteos, `#confirm-dialog`, `#toast` e `#import-file`) queda igual |
| `<style>` | No (Q2, opción A) | ninguna hoja se edita: 102 229 caracteres en el `dist` construido de `f2a`. Con la opción B cambiaría de orden, no de conjunto |
| `<script type="module">` | Sí | sale código de `app.js`; entran la página, su modelo, el temporizador, el adaptador y `useStore` de Zustand (el paquete ya está instalado desde F2a) |
| El tamaño | Se informa | el HTML de `f2a` mide 1 136 702 caracteres (`dist/index.html` ya construido, sin reconstruir) y el tope de `qa/build-check` es de 1 250 000 |
| Los avisos de licencia | No | ninguna dependencia de ejecución nueva |

## Cómo se demuestra que nada cambió

| Qué se afirma | Cómo se demuestra | Requisitos |
| --- | --- | --- |
| Los enlaces, las recargas, el arranque, las ocho vistas por hash y las seis formas de URL siguen igual | Los 106 E2E de F1 y los 17 de A2, sin editar | FR-002 y FR-016 |
| El temporizador sobrevive a una navegación por hash y se pierde al recargar | `reload.spec.ts` (F1), sin editar | FR-002 y FR-026 |
| Los flujos del Recorrido (pasos, lección, temporizador, idioma y «Borrar todo») | E2E nuevos con un Page Object, en verde contra el legacy antes de portar y sin editar después | FR-001 y FR-043 |
| La lógica y los componentes | Specs de Vitest (modelo en `node`, componentes en `jsdom`) con valores escritos a mano desde `content/guide/` y las fixtures | FR-042 |
| El DOM y los textos | Una comparación única del HTML del legacy contra la página, sobre una grilla de estados | FR-040 |
| El aspecto | Mismo DOM y `<style>` idéntico por hash (Q2, opción A) | FR-040 y FR-041 |
| Lo guardado | Las fixtures congeladas arrancan sin escribir; `storage.watchWrites()` cuenta 0 y 1 escrituras; `route-progress-check`, `versioned-storage-check` y `curriculum-ids-check` en verde | FR-020 y FR-021 |
| El retiro de `app.js` | `grep` en 0 y los checks adaptados, con la correspondencia de cada escenario; `seams-guard-check` en 0 violaciones | FR-011, FR-018 y FR-044 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno recorre sus pasos como hoy (Priority: P1)

Un alumno abre el taller, ve el siguiente paso, marca lo que hizo y encuentra su avance en la tarjeta, en los contadores y en la barra lateral. Con la página nueva no nota ninguna diferencia.

**Why this priority**: es la vista de entrada y la que más se usa; cualquier diferencia se ve en el primer segundo.

**Independent Test**: con el build servido, abrir `#recorrido` desde un navegador vacío y desde el progreso congelado de master, marcar y desmarcar casillas, cambiar de idioma y recargar.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío, **cuando** se abre `#recorrido`, **entonces** se ve «Entendé lo que pasa por dentro.», la tarjeta «TU PRÓXIMO PASO · 01 / 12» con «Tu primer cambio comprobable», «0 DE 12 COMPLETADOS», el módulo «Ganá confianza con el compilador» abierto con «0/3» y los otros tres cerrados, y la barra lateral dice «0 de 12».
2. **Dado** lo anterior, **cuando** se marca la casilla del primer paso, **entonces** los contadores pasan a «1 DE 12» y «1/3», la tarjeta pasa a «02 / 12» con «Seguí el recorrido de un valor», la barra lateral dice «1 de 12» y «8%», el foco queda en la casilla, `taller-learning-v1` guarda `completed: ["rust-first-session"]` con una sola escritura y, al recargar, la casilla sigue marcada.
3. **Dado** el progreso congelado de master (idioma Go, con los dos primeros pasos de Rust completos), **cuando** se abre `#recorrido`, **entonces** muestra el recorrido de Go con «TU PRÓXIMO PASO · 01 / 12» y «Modificá tu primer ejemplo» sin escribir ni avisar, y al pasar a Rust, «2 DE 12», «03 / 12» y «Tratamiento de entradas inválidas», con el aviso «Recorrido de Rust. Tu otro avance sigue guardado.».
4. **Dado** un recorrido con los 12 pasos completos, **cuando** se abre `#recorrido`, **entonces** aparece «Completaste tu recorrido inicial…», la tarjeta dice «TU SIGUIENTE EXPERIMENTO» y «Continuar mi proyecto» lleva a `#proyecto`.
5. **Dado** un módulo cerrado que el alumno abrió a mano, **cuando** marca una casilla de otro módulo, **entonces** los módulos vuelven al estado por omisión, como hoy (rareza, FR-025).
6. **Dado** una navegación por hash a otra vista y de vuelta, **cuando** vuelve el Recorrido, **entonces** se muestra con el avance guardado y el menú marca «Mi recorrido» con `aria-current`.

*Cubre: FR-007 a FR-010, FR-018 a FR-025 y FR-040; SC-001 a SC-004.*

---

### User Story 2 - La lección se abre, se responde y se cierra como hoy (Priority: P1)

El alumno abre la lección de un paso, lee, responde la pregunta y la cierra o la completa. El teclado, el foco y los avisos son los de hoy.

**Why this priority**: es lo más delicado del port: un diálogo modal, tres caminos de foco y dos escrituras, que ninguna prueba de hoy cubre.

**Independent Test**: en un navegador real, abrir la lección desde la tarjeta, desde el título de un paso y desde «↗»; responder; cerrarla por «×», «Seguir después» y Esc; y completarla.

**Acceptance Scenarios**:

1. **Dado** `#recorrido`, **cuando** se abre la lección de «Tu primer cambio comprobable», **entonces** el diálogo está nombrado por su título, muestra el objetivo, «Tu desafío», «LO LOGRASTE CUANDO», los recursos como enlaces a otra pestaña y la pregunta «Un test acaba de pasar. ¿Qué conclusión está justificada?» con tres opciones, y el foco está en «×».
2. **Dado** la lección abierta, **cuando** se elige la opción B, **entonces** queda con `aria-pressed="true"`, aparece «Bien pensado. Un test verifica un caso y sus condiciones. Todavía pueden faltar entradas, propiedades y comportamientos por cubrir.» y `quizAnswers` guarda `{"rust-first-session": 1}` con una sola escritura. Con la opción A, aparece «Revisemos la idea. » con la misma explicación.
3. **Dado** el progreso congelado de master con el idioma en Rust, **cuando** se abre esa misma lección, **entonces** la opción B ya está marcada, la devolución ya se ve y el botón dice «Volver a practicar ✓».
4. **Dado** cualquiera de las tres formas de abrirla, **cuando** se cierra con «×», con «Seguir después» o con Esc, **entonces** el foco vuelve al elemento que la abrió, sin desplazar la página, y no se escribe nada.
5. **Dado** la lección abierta desde «Empezar esta sesión», **cuando** se elige «Marcar como hecho ✓», **entonces** se cierra, el paso queda completo, el aviso dice «Un paso más. Dejá una nota para tu próxima sesión.», la tarjeta pasa al paso siguiente y el foco queda en el título de ese paso, dentro de su módulo abierto.
6. **Dado** un paso completo que vuelve a ser el próximo, **cuando** se abre su lección y se elige «Volver a practicar ✓», **entonces** el paso queda sin completar, el aviso dice «Paso disponible para volver a practicar.» y el foco va al botón de la tarjeta.
7. **Dado** la lección abierta, **cuando** el alumno usa Tab y Mayús+Tab, **entonces** el foco no sale del diálogo.

*Cubre: FR-033 a FR-039; SC-001, SC-002 y SC-004.*

---

### User Story 3 - El temporizador cuenta, avisa y sobrevive a la navegación como hoy (Priority: P1)

El alumno elige una duración, inicia el foco y sigue en otra vista. Al terminar, el taller le avisa. Si recarga, el temporizador se pierde.

**Why this priority**: es la parte con estado propio y el único lugar donde el port cambia de dueño (del cierre de `app.js` a un módulo de sesión), con un E2E de F1 que ya lo fija.

**Independent Test**: con `page.clock`, iniciar el temporizador, correr el tiempo, cambiar de vista y de idioma, dejar que termine y recargar.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío, **cuando** se abre `#recorrido`, **entonces** los dígitos dicen «25:00», el botón «Iniciar foco» y «25 min» está presionado; al elegir «45 min» dicen «45:00», `minutes` guarda 45 con una sola escritura y el temporizador queda detenido.
2. **Dado** el temporizador en 25:00, **cuando** se inicia y pasa un minuto, **entonces** dicen «24:00» y el botón dice «Pausar»; al pausar, el restante queda congelado y el botón dice «Continuar»; al continuar sigue; con «↺» vuelve a «25:00» y «Iniciar foco» sin escribir.
3. **Dado** el temporizador en marcha, **cuando** el alumno va a Biblioteca y vuelve por el menú, **entonces** sigue corriendo y muestra el restante correcto; si en cambio sigue el enlace «Laboratorio» (`?#laboratorio`), el documento se recarga y vuelve a «25:00» (el E2E de F1, sin editar).
4. **Dado** el temporizador en marcha en la vista de Biblioteca, **cuando** llega a cero, **entonces** el aviso «Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.» aparece en `#toast` una sola vez y, al volver al Recorrido, dice «00:00» y «Iniciar foco».
5. **Dado** el temporizador en marcha, **cuando** se cambia de idioma, **entonces** sigue corriendo y el aviso del cambio de idioma aparece como hoy.
6. **Dado** el temporizador en marcha con 45 min elegidos, **cuando** se confirma «Borrar todo» en `#metodo` y se vuelve al Recorrido, **entonces** dice «25:00», está detenido y el botón dice «Iniciar foco».
7. **Dado** el temporizador detenido (en reposo, en pausa, terminado o tras «↺»), **cuando** se mira qué quedó vivo, **entonces** no hay ningún intervalo ni temporizador de la página.

*Cubre: FR-013, FR-026 a FR-032; SC-001, SC-002, SC-004 y SC-007.*

---

### User Story 4 - Lo guardado no cambia, y D1 puede sincronizarlo (Priority: P1)

El progreso del recorrido se guarda como hoy y se puede importar, exportar y sincronizar sin que la página lo note.

**Why this priority**: es el contrato del ADR 0003 y lo que D1c va a sincronizar campo por campo; una escritura de más o de menos, o una copia del estado, hace perder avances.

**Independent Test**: con `storage.watchWrites()`, abrir el Recorrido con las fixtures congeladas, mover el temporizador, abrir y cerrar una lección sin responder y repetir cada acción de FR-020.

**Acceptance Scenarios**:

1. **Dado** las cuatro claves del progreso real de master, **cuando** se abre el Recorrido, se inicia y se pausa el temporizador y se abre y se cierra una lección sin responder, **entonces** no hay escrituras, ni claves `:respaldo`, ni avisos.
2. **Dada** cada acción de FR-020 desde un navegador vacío, **cuando** se hace, **entonces** `taller-learning-v1` se escribe exactamente una vez, con las mismas claves y en el mismo orden de hoy, y se relee sin pérdida.
3. **Dado** el almacenamiento bloqueado, **cuando** se abre el Recorrido y se marca un paso, **entonces** la página funciona, el pie dice «Exportá para conservar tu avance» y el aviso de arranque es el de hoy.
4. **Dado** un paso marcado desde la página, **cuando** se exporta el progreso desde la barra lateral, **entonces** la copia lleva el paso en `completed` y el resto de la forma de hoy (el recorrido en la raíz, más `lab`, `campaign`, `systems` y `exportedAt`).

*Cubre: FR-018 a FR-022; SC-004.*

---

### User Story 5 - `app.js` pierde el Recorrido y los ports se integran de a uno (Priority: P2)

Quien mantiene el front encuentra el Recorrido en una página con su modelo y sus pruebas, y `app.js` sin lo suyo. Quien integra F2b, F3 y F4 sabe qué regiones de `app.js` toca cada uno.

**Why this priority**: es lo que deja el camino libre a F10, pero no cambia nada para el alumno.

**Independent Test**: `grep` sobre `frontend/app.js`, `seams-guard-check`, `load-order-check`, `boot-check` y `app-shell-check` con el adaptador nuevo, y la tabla de correspondencia de escenarios.

**Acceptance Scenarios**:

1. **Dado** `frontend/app.js` después del port, **cuando** se busca `renderRoute`, `timerMarkup`, `updateTimer`, `setInterval`, `openLesson`, `lesson-dialog`, `data-step-check` y `data-dialog-action`, **entonces** no hay ninguna aparición.
2. **Dado** el adaptador, **cuando** se evalúa sin llamar a `startApp()`, **entonces** no toca el almacenamiento, no registra oyentes ni intervalos y publica sólo `mount`, `unmount` y `resetTimer`.
3. **Dado** `boot-check`, **cuando** monta el Recorrido sobre el DOM falso, **entonces** verifica sus nodos en `#main` (como hace con el Atlas) y que `startApp()` deja 0 intervalos.
4. **Dado** cada escenario de `app-shell-check` o de `boot-check` que cambia, **cuando** se lee la tabla del PR, **entonces** figura cubierto por una spec o un E2E, o descartado con su motivo.

*Cubre: FR-011 a FR-017 y FR-044 a FR-046; SC-006, SC-007 y SC-010.*

---

### Edge Cases

- **Almacenamiento bloqueado o lleno:** la página funciona, la etiqueta de guardado cambia a «Exportá para conservar tu avance» cuando una escritura falla y los avisos son los de hoy.
- **Progreso con pasos de los dos lenguajes:** sólo cuentan los pasos del lenguaje activo; `completed` los guarda juntos.
- **Contenido con HTML:** los títulos y los textos de la guía se muestran como texto, nunca como marcado (hoy los escapa `escapeHtml`).
- **Otra pestaña guardó entre dos escrituras:** `save()` fusiona, el estado vivo puede cambiar de objeto y la página lo vuelve a leer en cada render y en cada manejador; la página no escucha el evento `storage`, como hoy.
- **`syncLinkedLanguage` cambia el idioma sin guardar:** como el estado se lee vivo, la página muestra el idioma que ve `app.js`.
- **Recurso de un paso que ya no existe en la guía:** se omite de la lista, como hoy.
- **El temporizador termina con la lección abierta:** el aviso se muestra en `#toast`, que está fuera del diálogo modal; no cambia.
- **Lección abierta y Atrás o Adelante:** hoy sigue abierta sobre la vista nueva; con Q4, opción A, se cierra con la página.
- **Doble clic en «Iniciar foco»:** el primer clic inicia y el segundo pausa; no se duplican oyentes ni intervalos.
- **Desmontaje con el temporizador en marcha:** la página libera su suscripción; el dueño del temporizador sigue contando y avisando.
- **Importar una copia con el temporizador en marcha:** no lo toca (la importación conserva los `minutes` locales y el temporizador no forma parte del respaldo).
- **Hash desconocido o `#invitacion=<token>`:** caen en `#recorrido`, como hoy; el contrato de URL no cambia y el token es de F11.
- **Contenido que no llega (A2):** la página no se monta; la compuerta muestra su error.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de todo port** *(salen de la hoja de ruta y de la spec de F2)*

- **FR-001**: El PR DEBE abrir con los E2E de comportamiento del Recorrido (US1 a US4), escritos con un Page Object contra la vista legacy y en verde antes de portar, y esos E2E DEBEN pasar sin editarse sobre la página nueva. Si hay que editar uno, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, «E2E primero»; ADR 0008, §3; clarify de F1, Q1)*
- **FR-002**: Los 106 E2E de F1 y los 17 de A2 DEBEN pasar sin editarse con el build de F9. Entre ellos, `reload.spec.ts` («the focus timer survives a hash navigation and is lost on a reload») es el contrato del dueño del temporizador (FR-026 a FR-030). *(Hoja de ruta, criterios de aceptación globales)*
- **FR-003**: F9 NO DEBE agregar dependencias de ejecución ni ningún estilo en línea (`style=`, `setAttribute('style', …)` ni `style.cssText`) a los que C4 cuenta. Las de desarrollo que piden la primera spec de componente (`jsdom` y Testing Library) y la primera factory (`fishery`) entran sólo con el permiso del usuario, con su peso medido, y sólo si ningún ítem anterior las instaló. *(`AGENTS.md`; hoja de ruta, «Acciones del usuario»; C4)*
- **FR-004**: `dist/index.html` DEBE conservar la forma que fija A2 (un solo documento con un script y un estilo en línea, y el contenido en su propio archivo) y quedar bajo el tope de `qa/build-check` (`BOOT_SIZE_LIMIT`, 1 250 000 caracteres), con su tamaño antes y después informado en el PR. El tope de 2 500 000 de la hoja de ruta quedó viejo con A2.
- **FR-005**: El aviso de complejidad de `renderRoute` (12) DEBE desaparecer con la función, y ninguna función nueva DEBE superar 10 sin justificarlo en la revisión; el total de avisos de `npm run lint` no sube. *(Hoja de ruta, criterios globales; `docs/architecture.md`)*
- **FR-006**: F9 DEBE entregarse como un solo PR que se puede revertir entero y devuelve la vista legacy (`renderRoute`, el intervalo, los oyentes y `#lesson-dialog`) con la red de F1 en verde. Cada cambio de comportamiento DEBE empezar con una spec que falla por la razón esperada. *(Hoja de ruta, «Un PR por vista»; constitución, principio II)*

**Alcance y retiro**

- **FR-007**: La página DEBE dibujar lo que hoy dibujan `renderRoute` y `openLesson` (ver «El Recorrido de hoy»): el encabezado con su ilustración, el aviso de recorrido completo, la tarjeta de la sesión de hoy con el temporizador, la lista de módulos con sus pasos, la franja de recomendación y el diálogo de la lección.
- **FR-008**: La página NO DEBE dibujar ni escribir las notas de la bitácora, `#note-state`, el pedido al tutor ni su botón de copiar: siguen en `renderMethod` hasta F8. [NEEDS CLARIFICATION: Q1, ¿de F8 (A), de F9 dentro de Método (B) o sólo `tutorPrompt` (C)?]
- **FR-009**: La página DEBE montarse con una raíz de React sobre `#main`, como el Atlas: `app.js` la desmonta junto con las otras vistas antes de escribir `#main` y la monta cuando la vista es `recorrido`, y cuando `mount` vuelve la página ya está dibujada, para que el arranque y el foco que siguen no dependan de un cuadro posterior. Si la página lanza al dibujarse, el adaptador lo registra con `console.error` y un mensaje en español, como el del Atlas.
- **FR-010**: La página DEBE recibir su contenido (el recorrido del idioma y sus pasos) por props desde su adaptador, que lo lee de `getContent().guide` al montar; NO DEBE leer `window` ni importar `getContent()`. *(Spec de F2, FR-015; A2, F2-I6)*
- **FR-011**: DEBE salir de `app.js` todo lo que dice «Se retira» en «El corte en `app.js`», y `frontend/app.js` NO DEBE contener `renderRoute`, `timerMarkup`, `updateTimer`, `setInterval`, `openLesson`, `lesson-dialog`, `data-step-check` ni `data-dialog-action`. Lo que dice «Queda en el shell» se conserva.
- **FR-012**: Las ramas del Recorrido de los tres delegados de `#main` (`lesson`, `duration`, `timer`, `timer-reset` y `stepCheck`) y los dos oyentes de `#lesson-dialog` DEBEN salir en el mismo commit que monta la página, para no manejar un evento dos veces. *(Hoja de ruta, reglas de todo port)*
- **FR-013**: `startApp()` NO DEBE registrar ningún intervalo: el `setInterval` de 500 ms desaparece, y el que cuenta el tiempo existe sólo mientras el temporizador corre (FR-032).
- **FR-014**: El adaptador mínimo DEBE ser `window.TallerRoute` (nombre provisional), publicado desde `frontend/src/app/legacy/`, con sólo `mount(host, language, toast)`, `unmount()` y `resetTimer()`. `mount` y `unmount` los retira F10 y `resetTimer`, F8. NO DEBE importar `routeStore` (R4 de `seams-guard-check`): lo importa la página.
- **FR-015**: El adaptador DEBE evaluarse antes que `app.js` en `legacy-views.ts` y quedar fijado en la tabla de `load-order-check`; `qa/lib/app-adapters.ts` DEBE sumar sus tres métodos; y evaluarlo NO DEBE tocar el almacenamiento, abrir el almacén, registrar oyentes ni crear intervalos. *(Spec de F2, FR-021; A2, F2-I1 y F2-I4)*
- **FR-016**: El idioma activo y la URL son del shell. La página NO DEBE leer ni escribir `location`; sus únicos enlaces internos son anclas de hash (`#proyecto` y `#biblioteca`); el cambio de idioma lo hace el shell, con su aviso («Recorrido de Go. Tu otro avance sigue guardado.») y su `history.replaceState`, y vuelve a montar la página como cualquier `render()` (idioma, navegación, importar y «Borrar todo»), con el idioma vivo de `routeStore` como el que se muestra. Las ocho vistas por hash y las seis formas de URL siguen llevando adonde llevan (`url-contract` y `views`, sin editar).
- **FR-017**: `<dialog id="lesson-dialog">` DEBE salir de `frontend/src/index.html`, y el resto del marcado estático NO DEBE cambiar. [NEEDS CLARIFICATION: Q4, ¿dentro de la raíz de la página (A) o en una raíz propia (B)?]

**Datos y progreso**

- **FR-018**: La página DEBE leer y escribir los pasos completados (`completed`), las respuestas (`quizAnswers`) y los minutos (`minutes`) por `routeStore`, el singleton de F2a: sin abrir otra instancia ni otra clave, con `seams-guard-check` en 0 violaciones. Lo mismo vale para las notas (`notes`), que escribe `renderMethod` y portará F8 (Q1). *(Spec de F2, FR-020 y FR-029)*
- **FR-019**: El progreso DEBE leerse con `routeStore.getProgress()` en cada render y en cada manejador, nunca de una copia (`useState`, una ref, un contexto o un cierre), y nada DEBE memoizarse sobre la identidad del progreso: el estado vivo se muta en el lugar, puede cambiar de objeto al fusionar con otra pestaña y `syncLinkedLanguage` cambia el idioma sin guardar. Un componente DEBE leer la revisión con `useStore(routeStore.changes, (state) => state.revision)` y nunca con el store entero. *(Spec de F2, FR-026; plan de F2a, §3.0)*
- **FR-020**: Cada acción del alumno que cambia el progreso (marcar o desmarcar un paso, elegir una duración, responder la pregunta, completar o reabrir una lección) DEBE hacer una sola llamada a `routeStore.save()`, con el estado ya cambiado, aunque el valor no cambie (elegir la duración ya elegida también guarda, como hoy). Montar, desmontar, correr el temporizador y abrir o cerrar la lección sin responder NO DEBEN escribir ni subir la revisión.
- **FR-021**: El formato guardado NO DEBE cambiar: las claves de `taller-learning-v1`, `version: 1`, el orden de las claves del JSON, los IDs de los pasos de `content/guide/` y la forma de la exportación. Las tres fixtures congeladas DEBEN arrancar sin escribir, sin respaldar y sin avisar (ADR 0003), y lo que escribe la página DEBE releerse sin pérdida. D1 sincroniza campo por campo `route.mark.step`, `route.quiz` y `preference.focusMinutes`: la página no agrega campos ni cambia la forma de los que escribe, y el temporizador en marcha no se guarda ni se sincroniza.
- **FR-022**: Después de cada escritura de la página, el shell (la barra lateral con «N de 12», el porcentaje y la barra de progreso, y la etiqueta de guardado) DEBE mostrar el estado nuevo, sin que la página conozca al shell. Hoy lo hace `save()` más `render()`, de `app.js`, que la página ya no llama. El mecanismo lo elige el plan y lo comparten F3, F4 y F9.

**Los pasos**

- **FR-023**: La tarjeta, los contadores y el aviso DEBEN derivarse en cada render del progreso y del recorrido del idioma activo, con los textos de hoy: el próximo paso es el primero sin completar de ese idioma, «TU PRÓXIMO PASO · NN / MM», «N DE MM COMPLETADOS», el conteo por módulo y, con todos completos, el aviso, «TU SIGUIENTE EXPERIMENTO» y «Continuar mi proyecto». Los literales que coinciden con los datos («4 etapas») DEBEN salir de los datos y dar el mismo texto. Los selectores de pasos (los del lenguaje, los completados y el próximo) DEBEN ser una sola fuente para la página y para la barra lateral, y no dos copias que puedan divergir.
- **FR-024**: Marcar o desmarcar una casilla DEBE escribir una vez, actualizar la tarjeta y los contadores, y dejar el foco en esa casilla con su módulo abierto, sin desplazar la página.
- **FR-025**: Los módulos DEBEN abrirse al montar como hoy (sólo el primero con un paso pendiente, o el último si no queda ninguno) y volver a ese estado después de cada acción que hoy redibuja la página (casilla, lección completada, idioma, importar y «Borrar todo»), más el módulo del paso que recupera el foco. Es una rareza de hoy que el port conserva: su E2E lleva `KNOWN DEFECT` y mejorarla es otro commit con aprobación.

**El temporizador**

- **FR-026**: El estado del temporizador (si corre, cuánto resta y cuándo vence) DEBE tener un dueño que no es un componente ni la raíz: un módulo de sesión (el plan decide su forma) que sobrevive al desmontaje de la página y se pierde al recargar. NO DEBE guardarse en `localStorage` ni en `sessionStorage`. *(Hoja de ruta, «la recarga se confirmó»; E2E de F1)*
- **FR-027**: El restante DEBE salir de la hora de vencimiento (el techo de los segundos que faltan) y no de contar ticks, y el temporizador DEBE comportarse como la tabla de «El temporizador de hoy»: sus cuatro estados, sus dígitos y el texto de su botón.
- **FR-028**: Elegir una duración (15, 25 o 45 min) DEBE detener el temporizador, dejarlo en esa duración, marcar la opción con `aria-pressed` y guardar `minutes` una vez; «↺» DEBE detenerlo y dejarlo en la duración elegida, sin escribir.
- **FR-029**: Al llegar a cero, esté montada o no la página, el temporizador DEBE detenerse y mostrar una sola vez, en `#toast`, «Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.». El toast es el del shell, que el adaptador recibe en `mount`.
- **FR-030**: Con el temporizador en marcha, navegar por hash, cambiar de idioma o importar una copia NO DEBEN detenerlo ni reiniciarlo. Recargar y seguir un enlace que cambia la query (`?#laboratorio`) lo pierden, como hoy.
- **FR-031**: «Borrar todo» DEBE reiniciar el temporizador (detenido, en los 25 min del progreso en blanco) por el paso de sesión que registra su dueño (`sessionResets` de la unidad 6 de F2b), en el orden de hoy: después de los cuatro almacenes y de las simulaciones, y antes del `save()`.
- **FR-032**: Con el temporizador detenido NO DEBE quedar ningún intervalo ni temporizador de la página vivo. El que corre en marcha DEBE cancelarse al pausar, reiniciar, terminar, cambiar la duración y en «Borrar todo»; la suscripción de la página DEBE cancelarse al desmontar, y no DEBE haber actualizaciones de estado de React después del desmontaje.

**La lección**

- **FR-033**: La lección DEBE seguir siendo un `<dialog>` nativo y modal (`showModal()`), nombrado por su título (`aria-labelledby`), con el contenido y los textos de hoy (la etiqueta con el idioma activo, el título, el objetivo, «Tu desafío», «LO LOGRASTE CUANDO», los recursos como enlaces a otra pestaña con `rel="noopener noreferrer"`, la pregunta con sus opciones y las dos acciones). DEBE cerrarse con «×», «Seguir después» o Esc, y el clic en el fondo NO DEBE cerrarla. El estado de React NO DEBE desincronizarse del diálogo nativo (Esc lo cierra y el estado queda cerrado).
- **FR-034**: Responder DEBE marcar la opción con `aria-pressed`, escribir una vez y mostrar la devolución («Bien pensado. » o «Revisemos la idea. », más la explicación del paso); al reabrir una lección ya respondida, la opción y la devolución ya están.
- **FR-035**: «Marcar como hecho» y «Volver a practicar» DEBEN alternar el paso, escribir una vez, cerrar el diálogo y avisar por el toast («Un paso más. Dejá una nota para tu próxima sesión.» o «Paso disponible para volver a practicar.»); el rótulo del botón depende de si el paso ya estaba completo.
- **FR-036**: El foco DEBE ir como hoy, sin desplazar la página en ningún caso: al abrir, al primer elemento enfocable del diálogo («×»); al cerrar sin completar, al elemento que la abrió; al completar o reabrir, al primer botón de lección de ese paso en el orden del documento (el de la tarjeta si es el próximo paso; si no, el título del paso), con su módulo abierto; y al usar una casilla, a la casilla (FR-024). Los tres caminos DEBEN tener su E2E, escrito antes contra el legacy.
- **FR-037**: La devolución de la pregunta DEBE ser una región `role="status"` con `aria-live="polite"`, oculta hasta que hay respuesta, y recrearse en cada apertura de la lección, como hoy. [NEEDS CLARIFICATION: Q3, ¿se conserva (A) o se mantiene montada y visible (B)?]
- **FR-038**: Mientras la lección está abierta, Tab y Mayús+Tab DEBEN quedarse dentro del diálogo; Enter y Espacio DEBEN operar los botones, las casillas y los `summary` de los módulos; y el orden de tabulación de la página DEBE ser el de hoy.
- **FR-039**: La página NO DEBE sumar animaciones ni transiciones ni una librería de animación: las que hay (el botón, el chevron del módulo y el toast) siguen bajo la regla global de `prefers-reduced-motion` de `styles.css`.

**El aspecto**

- **FR-040**: Salvo los atributos `data-*` de delegación que se retiran con sus ramas (`data-action`, `data-id`, `data-minutes`, `data-step-check`, `data-dialog-action` y `data-answer`), la página y la lección DEBEN producir el mismo DOM que `renderRoute` y `openLesson`: etiquetas, clases, ids (`route-title`, `lesson-title` y `quiz-feedback`), roles, `aria-*`, textos y orden, con las diferencias de serialización de React listadas. Una comparación única del HTML contra el legacy lo mide en el PR (SC-003). El contenido de la guía se muestra como texto, nunca como HTML.
- **FR-041**: Ninguna hoja de estilo DEBE cambiar: la página usa las mismas clases y el `<style>` del dist DEBE quedar idéntico (por hash). [NEEDS CLARIFICATION: Q2, ¿se deja todo en `styles.css` hasta F10 (A) o se mueven las reglas exclusivas (B)?]

**Las pruebas**

- **FR-042**: Las specs nuevas DEBEN ser de Vitest: de modelo (proyecto `node`: los selectores del recorrido, el temporizador con `vi.useFakeTimers()` y las acciones de escritura) y de componente (proyecto `jsdom`, con Testing Library, `userEvent` y consultas por rol y nombre accesible). Los valores esperados DEBEN escribirse a mano desde `content/guide/` y las fixtures congeladas. Como jsdom no trae `showModal()` ni `close()` (ADR 0008), una spec que sólo necesita el diálogo define un stub, y el foco y Esc se prueban en E2E. Las entradas repetidas usan fábricas de fishery sólo si hacen falta, y antes se reutiliza `buildGuide()`.
- **FR-043**: Los E2E nuevos DEBEN usar un Page Object del Recorrido (`qa/e2e/pages/route.ts` y su fixture `route`, provisionales) con localizadores por rol y nombre accesible, y cubrir US1 a US4: los pasos, los tres caminos del foco, la lección, el temporizador con `page.clock` (incluido el aviso de fin desde otra vista y «Borrar todo»), la barra lateral, el idioma y las escrituras con `storage.watchWrites()`. Cada rareza de «El Recorrido de hoy» lleva `KNOWN DEFECT` en el nombre de su prueba.
- **FR-044**: Los checks de `qa/` que cargan `app.js` DEBEN cambiar sólo cómo cargan o qué observan, no sus valores esperados: `app-shell-check` (el escenario «almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar» lo comparten F3, F8 y F9), `boot-check` (cuatro escenarios leen `#main.innerHTML` como señal de que se dibujó y, con el Recorrido en React, pasan a leer sus nodos, como ya hace el Atlas; el orden de «Borrar todo» incluye el paso del temporizador), `load-order-check`, `app-adapters.ts` y los ids de los dos arneses. El PR DEBE listar la correspondencia de cada escenario que cambia o se retira (cubierto por una spec o un E2E, o descartado con su motivo). *(ADR 0008, §5)*

**La integración**

- **FR-045**: F9 DEBE integrarse de a uno con F2b (unidades 5 y 6), F3, F4, F8 y F10, que comparten `app.js`, `legacy-views.ts` y los arneses; el que llega después rebasa. *(Hoja de ruta, «Orden y paralelismo»)*
- **FR-046**: En el mismo PR, `docs/architecture.md` (la fila del recorrido, la página y el módulo del temporizador) y `qa/AGENTS.md` DEBEN reflejar el cambio; los integra el agente principal. *(`AGENTS.md`)*

### Key Entities *(include if feature involves data)*

- **Recorrido:** dos cosas con el mismo nombre. La vista `#recorrido` y la pista de un lenguaje (`GuideTrack`: 4 módulos de 3 pasos). El código dice `route` para las dos (`routeStore`, `renderRoute`).
- **Paso:** una sesión orientativa de la pista (`rust-first-session`), con título, 25 minutos, objetivo, desafío, criterio de logro, recursos y una pregunta de tres opciones. La interfaz dice «sesión» y «paso» según el lugar. Su ID es estable: indexa el progreso.
- **Módulo (etapa):** un grupo de tres pasos; la interfaz lo llama «etapa» («4 etapas») y el código, `module`.
- **Lección:** el diálogo de un paso. Se abre desde la tarjeta, el título o el «↗» de un paso.
- **Respuesta:** la opción que el alumno eligió en la pregunta de un paso (`quizAnswers[id]`); se guarda.
- **Temporizador de foco:** la cuenta regresiva de la tarjeta («un rato para vos»). No se guarda; vive en memoria y se pierde al recargar.
- **Duración:** los minutos del temporizador (15, 25 o 45), que sí se guardan (`minutes`).
- **Revisión:** el contador local y en memoria de los cambios de `routeStore`, que sube una vez por escritura. No es la revisión de la cuenta del servidor.
- **Adaptador mínimo:** el `window.TallerRoute` que `app.js` todavía lee hasta F10 (y F8, para `resetTimer`).
- **Comparación única:** la corrida, una vez en el PR, que compara el HTML del legacy con el de la página sobre la misma grilla de estados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los 106 E2E de F1 y los 17 de A2 pasan con el build de F9: 0 escenarios editados y 0 fallas.
- **SC-002**: Cada escenario de aceptación de US1 a US4 tiene una prueba que lo ejerce, y los E2E nuevos pasan contra el legacy antes del port y sin editarse después: 100 %.
- **SC-003**: La comparación única del HTML da 0 diferencias, salvo las listadas, sobre una grilla que cubre como mínimo los 24 pasos con cada respuesta posible y sin respuesta, completos y sin completar, y los dos lenguajes con ningún paso, algunos y todos completos, con las tres duraciones y los cuatro estados del temporizador.
- **SC-004**: Con las fixtures congeladas, montar el Recorrido, mover el temporizador y abrir y cerrar una lección sin responder dan 0 escrituras, 0 claves `:respaldo` y 0 avisos; cada acción de FR-020 da exactamente 1 escritura de `taller-learning-v1`.
- **SC-005**: El `<style>` del dist tiene el mismo hash que el de la base (Q2, opción A); `build/curriculum.json`, `dump-globals` y los catálogos del dist tienen los mismos bytes; el marcado de `index.html` cambia en 1 línea.
- **SC-006**: `frontend/app.js` tiene 0 apariciones de los términos de FR-011, el adaptador publica 3 métodos y `seams-guard-check` da 0 violaciones.
- **SC-007**: `startApp()` y la evaluación del adaptador dejan 0 intervalos, 0 oyentes de más y 0 accesos al almacenamiento; con el temporizador detenido hay 0 temporizadores de la página vivos.
- **SC-008**: `dist/index.html` queda bajo 1 250 000 caracteres, con su tamaño antes (1 136 702 en `f2a`) y después informados.
- **SC-009**: El total de avisos de complejidad no sube de 35 (la cuenta del plan de F2b) y `renderRoute` sale de la lista.
- **SC-010**: El 100 % de los escenarios de `app-shell-check` y de `boot-check` que cambian figura en la tabla de correspondencia.
- **SC-011**: Hay 0 llamadas a `useStore` sin selector en el código nuevo (una regla de lint o una revisión explícita).
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, y la imagen web sigue construyendo.

## Riesgos

1. **El temporizador cambia de dueño.** Un temporizador atado al montaje de la página pierde el aviso de fin fuera de la vista y el restante al navegar. *Mitigación:* FR-026 a FR-032, `reload.spec.ts` sin editar y un E2E del aviso de fin desde otra vista con `page.clock`.
2. **El foco, en tres caminos que ninguna prueba de hoy ejerce.** El orden exacto del `close` y del redibujo se infirió de la especificación de `<dialog>` y no se verificó en un navegador. *Mitigación:* los E2E de FR-036 se escriben primero contra el legacy.
3. **La barra lateral y la etiqueta quedan viejas.** La página ya no pasa por `save()` ni por `render()` de `app.js`. *Mitigación:* FR-022 y un E2E de la barra lateral; F3 y F4 tienen el mismo problema, y lo resuelve el primero en integrarse.
4. **React conserva lo que hoy se redibuja.** Los módulos que el alumno abrió a mano dejarían de cerrarse. *Mitigación:* FR-025 lo conserva a propósito y la tabla de rarezas lo lista.
5. **El aspecto del Recorrido no tiene protección propia.** `css-contract.spec.ts` no mide ninguna regla suya. *Mitigación:* Q2 opción A (las hojas no cambian, el `<style>` se compara por hash) y la comparación del DOM; con B, un barrido de estilo computado.
6. **Lo que jsdom no hace.** No trae `showModal()` ni `close()`: el foco y Esc se prueban sólo en E2E (FR-042).
7. **El DOM falso de `boot-check`.** Tiene que aguantar elementos que el Atlas no usa (`details`, `dialog`, casillas) y los cuatro escenarios que leen `innerHTML`. *Mitigación:* FR-044; el plan lo verifica antes de implementar.
8. **Conflictos en `app.js`.** F2b (unidades 5 y 6), F3, F4, F8 y F10 tocan las mismas regiones. *Mitigación:* FR-045 y la tabla de «Relación con otros ítems».
9. **Las notas.** Si el usuario las deja en F9 (Q1, B o C), F9 toca Método y F8 se superpone. *Mitigación:* la pregunta, con A como recomendada.
10. **Nada se ejecutó al especificar.** Sin `npm`, sin Docker y sin navegador: las cuentas salen de leer el código, del `dist` ya construido de `f2a` y de `postcss` y `node` sobre sus fuentes. *Mitigación:* el plan las vuelve a medir sobre la base de implementación.

## Relación con otros ítems

| Ítem | Qué comparte con F9 | Qué hace F9 y en qué orden |
| --- | --- | --- |
| F2a (entregada, PR #40) | `routeStore` y su `changes`, `startApp()`, `getContent()` y el guard | Los usa; no los cambia |
| [A2](../006-a2-compuerta-arranque/spec.md) | `legacy-views.ts`, `load-order-check` y `getContent().guide` | Suma una línea a la cadena, antes de `app.js`, y su restricción; el agente principal las integra |
| F2b, unidades 5 y 6 | las regiones de `app.js` de la tabla «Qué toca de lo que F2b mueve» | Rebasa sobre la que llegue antes y re-apunta el reinicio del temporizador |
| F3 y F4 | los delegados, `render()`, `toggleItem`, `startApp()`, el escenario «almacén» de `app-shell-check`, la suscripción del shell a `routeStore.changes` y la pila de DOM de las specs | Se integran de a uno; el primero suma la suscripción del shell y el último borra `toggleItem`; el que llegue primero a una spec de componente pide `jsdom`, Testing Library y `fishery` y pasa la configuración de Vitest a dos proyectos |
| F8 | «Borrar todo» y `resetTimer`; las notas si Q1 es A | `resetTimer` queda hasta F8; las notas pasan a F8 |
| F10 | `mount`, `unmount`, `syncShell` y `viewFromHash` | Los retira F10 |
| [D1](../007-d1-progreso-sincronizacion/spec.md) y D1c | `routeStore.changes` y los campos `route.mark.step`, `route.quiz` y `preference.focusMinutes` | Una revisión por acción y las formas intactas (FR-020 y FR-021) |
| [C4](../008-c4-exposicion/spec.md) | los estilos en línea | Ninguno nuevo (FR-003) |
| E1 | los literales que cuentan el contenido | «4 etapas» sale de los datos (FR-023) |

**Hoja de ruta (enmiendas que integra el coordinador):** F9 pasa de «Pendiente» a «En especificación», con el enlace a esta spec; su «Entra: notas» se corrige según Q1, y su «Borra» suma `routeCode`, `showQuizFeedback`, `restoreStepFocus`, las ramas de los delegados, los oyentes del diálogo y el reinicio del temporizador de «Borrar todo»; su decisión abierta («regiones vivas») queda en Q3; el criterio global de tamaño pasa de 2 500 000 a 1 250 000 caracteres (A2); la fila «Primera spec de componente» de «Acciones del usuario» se vuelve «el primero que llegue: F3 o F9»; y F9 puede salir del tramo 4, porque depende sólo de F2a.

## Assumptions

- Esta spec describe `f2a` (`2ffbbc6`, PR #40 abierto). Los nombres (`pages/route`, `register-route.tsx`, `window.TallerRoute`, `qa/e2e/pages/route.ts`) son provisionales y los confirma el plan.
- Lo que toma de F2b sale de `plan-f2b.md` (unidades 5 y 6). Si cambia, esta spec ajusta «Qué toca de lo que F2b mueve».
- Los requisitos asumen la opción recomendada de Q1 a Q4. Si el usuario responde otra, cambian FR-008 (Q1), FR-041 (Q2), FR-037 (Q3) y FR-017 (Q4), y con ellos el alcance de la página, el `<style>`, la región viva y `index.html`.
- Hoy Vitest corre sólo en `node` y sólo para `*.spec.ts`; `jsdom`, Testing Library y `fishery` no están instalados (`package.json` de `f2a`). El primer ítem que escriba una spec de componente los pide con permiso (hoja de ruta, «Acciones del usuario»; unos 26,3 MB y 5,0 MB comprimidos la pila de DOM y 0,19 MB `fishery`, según el ADR 0008) y pasa la configuración a dos proyectos. Si F9 llega antes que F3, le toca a F9.
- El contenido de `build/curriculum.json` es el de `f2a`: 12 pasos por lenguaje, 4 módulos de 3, 25 minutos y 3 opciones por pregunta. Los textos esperados de los escenarios salen de `content/guide/` y de `qa/fixtures/progress-master-2a278ad-storage.json` (idioma Go; `rust-first-session` y `rust-ownership` completos; `quizAnswers` con `rust-first-session: 1`; `minutes: 25`).
- Se leyó el código de `f2a` y de los checks de `qa/`, y se midió sin reconstruir: el tamaño del `dist/index.html` ya construido (1 136 702 caracteres, con 102 229 de `<style>`), las 114 reglas de `styles.css` (con `postcss`, sin modificar nada) y la composición de la guía. Nada se ejecutó: sin `npm`, sin Docker, sin navegador y sin descargas.
- Sin verificar en un navegador: el orden del foco al cerrar el diálogo, lo que anuncia un lector de pantalla y cómo serializa React el DOM respecto de `innerHTML`. Los E2E escritos primero contra el legacy los fijan.
- Los avisos de complejidad (35) son los del plan de F2b; `npm run lint` no se corrió.
- Los mensajes que lee el alumno van en español rioplatense, como hoy; el código y las pruebas, en inglés.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q4 están en sus preguntas.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dueño del temporizador | Estado local del componente; guardarlo en `sessionStorage`; un módulo de sesión | Un módulo de sesión. El estado local se pierde al navegar y rompe `reload.spec.ts`; `sessionStorage` lo conservaría al recargar, pero cambia un contrato que F1 fija y es una función nueva |
| Cómo cuenta | Un intervalo siempre activo (hoy); un intervalo sólo mientras corre; un `setTimeout` al vencimiento más un intervalo de los dígitos sólo con la página montada | Cualquiera de los dos últimos cumple FR-032; lo decide el plan. El primero lo retira la hoja de ruta |
| El aviso de fin | Siempre (hoy); sólo con la página montada | Siempre: lo contrario cambia el comportamiento, y el alumno que sigue en la Biblioteca no se entera |
| Cómo se entera el shell de un cambio | `app.js` se suscribe a `routeStore.changes`; un callback que el adaptador pasa a `mount`; la página llama a `syncShell` | Lo decide el plan. La tercera acopla la página al shell que F10 reemplaza |
| El diálogo | El `<dialog>` nativo con `showModal()`; una librería de diálogos | El nativo: es lo que hay, trae el foco y Esc, y no suma una dependencia al bundle |
| Cómo se demuestra que el DOM no cambió | Sólo E2E; una comparación única del HTML; la equivalencia por árbol de accesibilidad | Los E2E y la comparación única, como en F2 (FR-011): los E2E miran lo visible y la comparación detecta lo que ninguno mira (una clase, un orden, un texto) |
| Los módulos abiertos a mano | Conservar la rareza de hoy; recordar lo que el alumno abrió | Conservar: un port no cambia comportamiento, y mejorarlo es un commit aparte con aprobación |

## Partición

Esta spec tiene 46 requisitos, contra los 52 de C3a, la mayor del épico (F2 midió 60 y se partió). No se propone cortarla. No hay un corte natural: la página, el temporizador y la lección comparten la tarjeta, el estado y el foco, y partirlas obligaría a un puente temporal por `window` entre una página de React y el diálogo legacy, código que se tira. Si el plan la encuentra grande, el corte menos malo es sacar los E2E nuevos a un PR previo, en verde contra el legacy: deja la red lista antes del port, a costa de un PR más y de apartarse de «el PR de un port abre con sus E2E».
