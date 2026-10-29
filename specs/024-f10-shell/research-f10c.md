# Research: F10c · La limpieza de `styles.css`

Las decisiones técnicas de [plan-f10c.md](./plan-f10c.md), con sus alternativas, la proyección de la base, las consultas de Context7 y lo que se midió al planificar. Los comandos y los scripts están en [quickstart-f10c.md](./quickstart-f10c.md).

## Cómo se verificó

Todo corrió fuera del repositorio, sin descargar nada, desde scripts en el scratchpad:

- **Las copias:** tres worktrees descartables de `master` en `431c9d90` (F2a, F2b, A2, #67, #76 y F4), con un enlace al `node_modules` de otra copia del mismo `package-lock.json` (las 31 dependencias con la versión exacta del lockfile) y el Chrome Headless Shell de F1. Una es la base, otra el prototipo y la tercera, la de los dos controles negativos. Se borraron al terminar.
- **El prototipo de la mudanza sobre `master`:** las mismas reglas del shell que el plan muda, cortadas de `styles.css` de `master` con el mismo criterio y pegadas en `frontend/src/app/shell/shell.css`, importada justo después de `styles.css`.
- **Lo que corrió sobre las dos copias:** el build, las medidas del dist, el multiconjunto de F2b, el barrido de quickstart-f10c.md §3.3 en la grilla que `master` tiene, el control de determinismo, el control negativo del orden, la evidencia de quickstart-f10c.md §3.4, el control de borrado y los siete E2E de T037.
- **Los tokens (T042):** el codemod de quickstart-f10c.md §3.6 sobre el prototipo, con el multiconjunto resuelto, el barrido y el control negativo de los alias, y sobre la proyección de la base, para comprobar que las 21 entradas del armado se aplican una vez cada una. La trampa de los alias se midió antes en Chromium con una página mínima.
- **La proyección de la base de F10c:** `styles.css` de `master` menos lo que sacan los planes mergeados de F3 (43 selectores), F9 (116) y F8 (25), más las cuatro reglas que F11a suma al final (`impl-f11a`, `a7b3c71d`), medida con `postcss` 8.5.28 y minificada con `lightningcss` 1.33.0, los dos de `node_modules`.
- **Lo que no corrió:** la base real de F10c (F3, F5 a F9, F11a completo, F12a, F10a y F10b no están en `master`); los estados de «Tu cuenta», la administración, el ingreso y el error de la sesión, que en `master` no existen; Docker, la CI y macOS.

## Línea base de planificación

Medida en `master` (`431c9d90`):

| Medida | Valor |
| --- | --- |
| `frontend/styles.css` | 1 721 líneas, 335 reglas |
| `dist/index.html` | 1 144 218 caracteres, 1 146 738 bytes |
| El `<style>` del dist | 102 392 caracteres, `17e95d57…`; un solo elemento |
| El script y el marcado | `e5697262…` y `562c5364…` |
| El multiconjunto | 4 319 tuplas, 4 315 distintas |
| El orden de las hojas en `main.tsx` | `styles.css`, `project.css`, `lab.css`, `atlas.css`, `campaign.css`, `quest-explorers.css` y `systems.css` |

## Línea base de la implementación

La escribe T036 con los valores de quickstart-f10c.md §1 y la evidencia de §3.4. Hasta entonces, valen la proyección de R3 y los supuestos de R11.

## R1. Dónde viven los archivos de F10c y cómo se numeran sus tareas

- **Decisión:** `plan-f10c.md`, `research-f10c.md`, `quickstart-f10c.md`, `tasks-f10c.md` y `contracts/stylesheets-f10c.md`, en `specs/024-f10-shell/`. Las tareas van de T036 a T044.
- **Por qué:** F10 se partió en tres (P4), y los tres planes viven en la misma carpeta. F10a numera T001 a T014 y F10b, T015 a T035 (dato del coordinador, 2026-10-28). Seguir desde T036 evita que un commit que nombra una tarea sea ambiguo en la carpeta, como hizo F2b al seguir la numeración de F2a.

## R2. Qué es cada regla y cómo se decide

Cada selector de `styles.css`, en su contexto `@media`, cae en una clase:

| Clase | Qué es | Destino |
| --- | --- | --- |
| `token` | `:root` y `body[data-language='go']` | `styles.css` |
| `global` | Un selector sin clase ni id, fuera de un `:not()`: `*`, `html`, `body`, los controles, `a`, los encabezados, `[hidden]`, `progress`, `dialog`, la regla de casillas y el `touch-action` | `styles.css` |
| `shell` | Lo usa sólo el shell, o es `main` (el contenedor de la página que dibuja el shell) | La hoja del shell |
| `base` | Lo usan dos o más dueños, o el shell y una página | `styles.css` |
| `single:<página>` | Lo usa sólo una página | La hoja de esa página (T040) |
| `orphan` | No lo usa ningún elemento de la grilla | Se borra, si la guarda lo permite (T041) |

**El dueño se mide en el DOM.** Para cada estado de la grilla y cada captura, el script evalúa el contexto del selector con `matchMedia` y, si aplica, busca los elementos con `querySelectorAll` sobre el selector sin pseudoclases de interacción ni pseudoelementos (`:hover`, `:focus`, `:active`, `:checked`, `:disabled`, `::backdrop`, `::-webkit-…`, `::-moz-…`, `:after`). Cada elemento tiene un dueño:

- **la página del estado,** si está dentro de `#main` (y no es `#main`);
- **la página del diálogo,** si está dentro de un `<dialog>` que una página lleva a `<body>`: `#lesson-dialog` (el Recorrido), `#confirm-dialog` (Método) y `#lab-confirm-dialog` (el laboratorio);
- **el shell,** en otro caso: la barra lateral, la barra superior, el pie, el toast, «Tu cuenta», el aviso sin JavaScript y lo que la raíz dibuja en el ingreso o en el error de la sesión.

**La búsqueda en las fuentes es la guarda.** Por cada selector, `rule-evidence.mjs` busca las clases y los ids que nombra en `frontend/src` (sin specs) y da el dueño de cada archivo por su ruta: `index.html`, `app/`, `pages/account/` y `features/sign-in/` son del shell; `pages/<slice>/` es de su slice; el resto se informa como `other:<ruta>`. La columna `staticOnly` lista los dueños que la búsqueda encuentra y la grilla no. Un falso positivo de la búsqueda sólo conserva una regla de más, nunca borra una.

**Alternativas descartadas:**

- **Sólo `grep`.** Es lo primero que se probó, sobre `master`, y falló dos veces: dio `#toast` como base, porque `toast(` aparece en todas las vistas, y dio los tres selectores de `.small-label, .eyebrow, .topbar-label` como huérfanos, porque cruzaba los dueños de los selectores de una misma regla. Tampoco ve qué página dibuja un componente compartido de `entities/` o `shared/`.
- **Sólo la cobertura de CSS de Chromium** (el ejemplo de FR-055). Lightning CSS junta listas de selectores al minificar, así que la cobertura dice si una regla del dist se usó, no cuál de sus selectores; tampoco ve `progress::-moz-progress-bar`, que Chromium nunca aplica. Queda como control cruzado (R5).

## R3. La proyección de la base de F10c

**Cómo se calculó.** `styles.css` de `master`, sin los selectores que sacan los planes mergeados de los ports (F3, «R9 · La mudanza del CSS»; F9, «Mediciones de sólo lectura»; F8, «R9. El CSS») y con las cuatro reglas de `.session-status` que F11a suma al final. F4 ya está en `master`. F5, F6 y F7b no sacan nada de `styles.css`: F5 muda `systems.css`, F6 muda `campaign.css` y lleva `.quest-direct-lock` a `lab.css`, y F7b muda `lab.css` y `quest-explorers.css` sin tocarlas. F12a sólo suma `admin.css`. Las cuentas coinciden con las de cada plan: 43 selectores de F3, 116 de F9 (114 reglas y dos selectores de impresión) y 25 de F8 (23 reglas y `.data-actions` de impresión).

**El resultado:** 162 reglas con 189 selectores. Se reparten así:

| Clase | Selectores | Reglas después de F10c |
| --- | --- | --- |
| `token` | 2 | en `styles.css` |
| `global` | 48 | en `styles.css` |
| `base` | 49 | en `styles.css` |
| `shell` | 90 (84 con clase o id y 6 de `main`) | 86 en la hoja del shell |
| `single:<página>` | 0 | — |
| `orphan` | 0 | — |

`styles.css` queda con 77 reglas y 265 tuplas del multiconjunto, y la hoja del shell, con 86 reglas y 252 tuplas. Minificadas por Lightning CSS, las dos juntas tienen las mismas 516 tuplas que la proyección de la base: `onlyBase` 0 y `onlyUnit` 0.

**Las reglas del shell**, en el orden de `styles.css` (el texto entero está en el plan, T039):

| Bloque | Selectores |
| --- | --- |
| Sin `@media` | `.app-shell`, `.sidebar`, `.brand`, `.brand-mark`, `.brand-dot`, `.sidebar-tagline`, `.navigation`, `.navigation a`, `.navigation a:hover`, `.navigation a[aria-current='page']`, `.nav-symbol`, `.nav-count`, `.sidebar-bottom`, `.topbar-label` (partido de `.small-label, .eyebrow, .topbar-label`), `.progress-caption`, `.progress-caption strong`, `.save-status`, `.status-dot`, `.export-button`, `.sidebar-footnote`, `.workspace`, `.topbar`, `.topbar-label`, `.language-switch`, `.language-switch button`, `.language-switch button[aria-pressed='true']`, `.recommended-dot`, `main`, `.button.dark`, `.main-footer`, `.skip-link`, `.skip-link:focus`, `#toast`, `#toast.visible` y `.noscript` |
| `@media (min-width: 1550px)` | `main` |
| `@media (max-width: 1150px)` | `.app-shell`, `.sidebar`, `.topbar`, `main` y `.main-footer` |
| `@media (max-width: 850px)`, el primero | `.app-shell`, `.sidebar`, `.brand`, `.brand-mark`, `.sidebar-tagline, .sidebar-bottom`, `.navigation`, `.navigation a`, `.nav-count`, `.nav-symbol` y `.topbar` |
| `@media (max-width: 590px)`, el primero | `.sidebar`, `.brand`, `.navigation`, `.navigation a`, `.navigation a:last-child .nav-symbol`, `.topbar`, `.topbar-label`, `.language-switch button`, `.language-switch`, `main` y `.main-footer` |
| Sin `@media` | `main:focus` |
| `@media (max-width: 590px)`, el segundo | `.navigation`, `.navigation a` y `.navigation a:last-child .nav-symbol` |
| `@media print` | `.sidebar, .topbar, .main-footer, #toast` (lo que queda de la lista que ocultaba, después de F3, F8 y F9), `.app-shell` y `main` |
| Sin `@media` | `.lab-nav-count` y `.navigation a[aria-current='page'] .lab-nav-count` |
| `@media (max-width: 850px)`, el segundo | `.navigation`, `.navigation a` y `.navigation .nav-count` |
| `@media (max-width: 590px)`, el tercero | `.navigation`, `.navigation a`, `.navigation a:last-child` y `.navigation .nav-symbol` |
| `@media (min-width: 981px)` | `.sidebar`, `.navigation` y `.sidebar-bottom` |
| `@media (max-width: 650px)` | `.navigation a:last-child` |
| Sin `@media`, de F11a | `.session-status` y `.session-status:empty` |
| `@media (max-width: 1150px)` y `(max-width: 590px)`, de F11a | `.session-status` |

**Lo que queda en `styles.css`:**

| Clase | Selectores | Sus dueños en la base |
| --- | --- | --- |
| `token` | `:root`, `body[data-language='go']` | — |
| `global` | `*`; `html`; `body`; `button, input, select, textarea`; `button, a, input, select, textarea`; `button`; `button:disabled`; `a`; los siete `:focus-visible`; `button` (el segundo); `button:active`; `[hidden]`; `h1, h2, h3, p`; `h1, h2, h3`; `p`; `progress` y sus tres pseudoelementos; `input[type='checkbox']:not(.step-check)`; `dialog`; `dialog::backdrop`; en 590 px, `body`; en movimiento reducido, `*`; en impresión, `body` y `a`; y `button, a, input, select, summary` (`touch-action`) | — |
| `base` | `.small-label`, `.eyebrow` (la regla partida) y `.small-label` | el shell, el Recorrido, la campaña, el laboratorio, Proyecto y Sistemas |
| `base` | `.text-button` | el shell (exportar), el Recorrido, Método, el laboratorio y Sistemas |
| `base` | `.eyebrow`, `.eyebrow-line` | todas las páginas |
| `base` | `.pill`, `.pill.accent` | la Biblioteca y el Recorrido |
| `base` | `.button`, `.button:hover`, `.button.secondary`, `.button.secondary:hover`, y en 590 px `.button` | el shell (la compuerta y «Tu cuenta») y todas las páginas |
| `base` | `.button.small` | la campaña, el laboratorio, Sistemas y el Atlas |
| `base` | `.step-check`, `.step-check:checked`, `.step-check:checked:after` | el Recorrido y Proyecto |
| `base` | `.recommendation-strip` y sus tres hijas, y en 590 px `.recommendation-strip` y `.recommendation-strip p` | el Recorrido y Proyecto |
| `base` | `.page-heading` y sus tres hijas, y en 590 px `.page-heading h1` y `.page-heading p` | la Biblioteca, Método y Proyecto |
| `base` | `.search-wrap`, `.search-wrap span`, `.search-wrap input`, y en 1 150 px `.search-wrap` | la Biblioteca y el laboratorio |
| `base` | `.empty-state`, `.empty-state h2`, `.empty-state p` | el shell (el error de la compuerta) y la Biblioteca |
| `base` | `.field-label` | Método, el laboratorio y los formularios de F11a |
| `base` | `.note-state` | Método, el laboratorio y Sistemas |
| `base` | `.dialog-content`, `.dialog-content h2`, `.dialog-content p`, `.dialog-actions`, y en 590 px `.dialog-content`, `.dialog-content h2` y `.dialog-actions .button` | el Recorrido, Método y el laboratorio |
| `base` | `.lab-empty`, `.lab-empty h2`, `.lab-empty p` | el laboratorio y Sistemas |
| `base` | `.sr-only` | la Biblioteca y el laboratorio (y R5 de `css-contract`) |

Cada dueño de las dos tablas es un supuesto con su verificación en R11.

## R4. La hoja del shell: dónde, en qué orden y por qué la cascada no cambia

**Dónde.** `frontend/src/app/shell/shell.css`, en la carpeta del componente del shell que deja el plan de F10b (`Shell.tsx`, junto a `shell-state.ts`, `toast.ts` y `menu-counts.ts`); `app/` es la única capa que compone páginas (spec, «Assumptions»). Se importa en `main.tsx`, no desde el componente: Vite separa el CSS de un chunk asíncrono (Context7, `build.cssCodeSplit`) y el lugar de la hoja en el `<style>` único dejaría de depender de `main.tsx`, que es donde el arranque fija el orden de hoy (spec, «El arranque después de F10»).

**El orden de las hojas.** `styles.css` primero (FR-052), la del shell segunda y las de página después. Con eso:

- **frente a las hojas de página,** ninguna regla del shell cambia de lugar: antes estaban en `styles.css`, que va antes que todas, y ahora en una hoja que también va antes que todas;
- **frente a lo que queda en `styles.css`,** las reglas del shell pasan a estar después de todo. El orden cambia sólo para un elemento al que le apliquen una regla del shell y una de `styles.css` que antes venía después, con la misma especificidad y la misma propiedad. Se revisaron los elementos del shell que llevan clases base o que alcanzan las reglas globales:
  - `#export-progress` lleva `.text-button` (base) y `.export-button` (shell): la del shell ya venía después;
  - el rótulo de la barra lateral lleva `.small-label`: ninguna regla del shell lo nombra;
  - `.topbar-label` (la parte partida): ninguna regla base posterior fija su tipografía;
  - los enlaces y botones del shell: las reglas globales que vienen después (`touch-action`, movimiento reducido, impresión de `a`) tienen menos especificidad o `!important`, y no cambian de orden con nada;
  - `.button.dark` («Tu cuenta») y `@media (max-width: 590px) .dialog-actions .button`: no comparten propiedades.

  El barrido es la prueba; la revisión sólo dice qué mirar si da diferencias.

**Dentro de la hoja,** el orden de `styles.css` y un bloque `@media` por cada bloque de origen. Así:

- los tres bloques de 590 px del shell no quedan contiguos (los separan `main:focus` y la impresión, las reglas de `.lab-nav-count` y el segundo bloque de 850 px), y Lightning CSS no los junta;
- `.topbar-label` partida va donde estaba la regla compartida, antes de `.progress-caption`, y no queda contigua a la otra regla de `.topbar-label`.

**La regla partida.** `.small-label, .eyebrow, .topbar-label` es la única regla de la proyección con selectores de dos clases: `.topbar-label` es del shell y las otras dos, base. FR-054 pide mudar las reglas del shell «enteras»; se lee como cada selector con todas sus declaraciones, que es lo que hicieron F3, F4 y F9 con las reglas de impresión compartidas. El multiconjunto cuenta por selector, así que la partición no da diferencias. La alternativa, dejar la regla entera en `styles.css`, deja un selector del shell en la hoja de la base, contra FR-054. **Decidido:** el usuario eligió partirla el 2026-10-28 (spec, `## Clarifications`, «Session 2026-10-28 (F10c, al planificar)»).

**Lightning CSS** (Context7): junta reglas contiguas con el mismo selector o las mismas declaraciones, y bloques `@media` contiguos con la misma condición; nunca junta lo que no es contiguo. Al juntar dos reglas con el mismo selector, descarta la declaración que la otra pisa, y el multiconjunto la pierde aunque el estilo computado no cambie (lo encontró F3 con `.favorite-button`).

- **En `master` pasa:** el prototipo saca `main:focus` de entre los dos primeros bloques de 590 px de `styles.css`; los bloques quedan contiguos, se juntan y `.favorite-button` pierde `min-width: 36px` y `min-height: 36px`, pisadas por las de 44 px. El multiconjunto da `onlyBase: 2` y el barrido, 0.
- **En la base de F10c no pasa:** F3 ya se llevó `.favorite-button`, y el segundo bloque de 590 px queda vacío. La proyección minificada da `onlyBase: 0`.
- **Qué hace el plan:** T039 corre el multiconjunto, y la única diferencia aceptada es ésa, listada con su par de bloques y con el barrido en 0.

## R5. Las huérfanas: qué se borra y con qué evidencia

**Qué cuenta como huérfana** (FR-055): un selector de `styles.css`, o de las reglas del shell que salieron de ella, que ningún elemento de la grilla encuentra en ninguna captura (`states` en 0) y cuyas clases no nombra ninguna fuente de `frontend/src` (`static` en `-`). La cobertura de Chromium es el control cruzado: si la medición dice 0 y la cobertura dice `used`, se investiga antes de borrar.

**La proyección da 0.** Cada regla de R3 tiene un dueño en la base:

- **`.button.dark`** no la usa nadie en `master`: la evidencia del prototipo la da como huérfana, que es la prueba de que el script las encuentra. En la base la usa «Salir», en «Tu cuenta» (el plan de F11a, `AccountMenu`, `className="button dark"`), y por eso es del shell.
- **`.session-status`** la dibuja la etapa de la sesión de F11a; F10b la lleva a la raíz sin cambiar el DOM (FR-024).

**Lo que no es huérfano aunque no tenga efecto.** `.navigation a:last-child { grid-column: auto }`, en 650 y en 590 px, repite el valor inicial: F1 lo marcó como código muerto (R8 de `css-contract`). Y `.navigation a:last-child .nav-symbol { display: none }`, del primer bloque de 590 px, lo pisa el segundo con `inline-block`. Las tres reglas tienen un elemento que las usa, así que FR-055 no las alcanza: se mudan a la hoja del shell como están y se informan como hallazgo.

**El alcance.** Sólo `styles.css` y lo que salió de ella. Las hojas de página son de su dueño: si la evidencia, corrida sobre ellas, encuentra reglas sin uso, van como hallazgo en el PR.

**Una lista vacía cumple FR-055 y SC-005** si trae la evidencia: el conteo de filas por clase, los centinelas, la cobertura y el barrido en 0.

## R6. El barrido de estilo computado y la grilla

**El script** es el de quickstart-f2b.md §3.1 b, con lo que le sumaron F4 (la semilla y la impresión), F5 (la preparación por estado) y F9 (la clave de cada elemento desde el ancestro más cercano con `id`), más cuatro cambios de F10c:

1. **Las trampas de TR-13.**
   - **Los nodos de texto partidos** no aparecen: el DOM de la base y el de la rama es el mismo, porque F10c sólo mueve CSS.
   - **El `:hover`:** después de cada preparación, `page.mouse.move(0, 0)`.
   - **El primer salto de línea de `<pre>` y `<textarea>`** no aplica, por lo mismo que los nodos partidos.
   - **Los `<details>`:** el barrido no compara lo de adentro de un `<details>` cerrado, salvo su `<summary>`: su tamaño computado depende de si alguna vez se midió. El prototipo lo encontró en el estado `lesson`, con 6 diferencias de `block-size` (0 contra 204,562 px, en un sentido a 1 600 px y en el otro a 981 px) en una corrida y ninguna en otra; con el salto, 0.
2. **El doble de la API.** El barrido corre fuera de los fixtures de Playwright, así que instala su propio `context.route('**/api/**')` con las respuestas por omisión del doble de F11a (`installDefaults()`): la sesión con `STUDENT`, o con `ADMIN`, o sin cuenta, o con un 503, según el estado, y la lista de cuentas del E2E de F12a para la administración. Cada pedido sin respuesta se cuenta en `unhandled`, que tiene que quedar vacío.
3. **La grilla:** 35 estados.
   - **Las ocho vistas en Rust y en Go** (16), con el idioma sembrado en `taller-learning-v1`;
   - **los seis estados profundos de F2b:** la misión, el bloqueo, el núcleo, el taller y los dos vacíos, más tres que dibujan clases base fuera de su página principal: la Biblioteca vacía (`.empty-state`), el paso «reflect» de un ejercicio (`.field-label` y `.note-state` en el laboratorio) y la parte «ship» de un taller (`.note-state` en Sistemas);
   - **los diálogos de las páginas:** la lección y la confirmación de «Borrar mi progreso»;
   - **los del shell:** el toast, el salto al contenido con el foco, el aviso sin JavaScript, «Tu cuenta» abierta, la administración (`#administracion` con `ADMIN`), el ingreso (`user: null`), el error de la sesión y el error de la compuerta (el contenido responde 500), que también dibuja `.empty-state`.

   Esos cuatro estados los sumó el prototipo. Sin la Biblioteca vacía ni el error de la compuerta, la evidencia daba `.empty-state` como huérfana, y la guarda de las fuentes (`staticOnly`: el shell, por `gate-view.ts`) avisaba que faltaba un estado. Sin «reflect» ni «ship», daba `.field-label` y `.note-state` como de Método solamente: en `master` la guarda no lo veía, porque `lab.js` y `systems.js` están fuera de `frontend/src`, pero en la base de F10c el laboratorio y Sistemas ya son React y la guarda lo vería. Es el uso para el que está.

   Cada estado se captura en 1 600, 1 280, 981, 850, 650, 590 y 375 px, con el movimiento reducido apagado y encendido, más la impresión a 1 280 px: 15 capturas, 525 en total. Es más que lo que pide FR-054 (los cuatro anchos de F1, 1 280, 375 y las dos preferencias): 1 600 px porque `@media (min-width: 1550px) main` es una regla del shell, y la impresión porque tiene cuatro.
4. **El aviso sin JavaScript** se arma insertando el texto del `<noscript>` como HTML a su lado, con JavaScript activo. Un contexto con `javaScriptEnabled: false` no arranca la raíz, y el barrido quiere el mismo documento de los dos lados.

**El control de determinismo.** El barrido de la base contra sí misma tiene que dar 0 antes de comparar nada: si da otra cosa, el script tiene ruido (una transición, el puntero o una fuente). El toast se captura 400 ms después de tener `.visible`: su transición dura 0,2 s y se esconde a los 4,5 s.

**Los dos controles negativos** (quickstart-f10c.md §3.5):

- **el orden** (b): en una copia de la rama, el primer bloque de 590 px de la hoja del shell pasa antes del primero de 850 px. El multiconjunto da 0; el barrido tiene que dar diferencias a 590 y 375 px: `.sidebar` pasa de `display: flex` a `grid` y la barra superior, de 61 a 68 px de alto;
- **el borrado** (c): en una copia de la rama, se borra `#toast.visible`. La evidencia tiene que dar esa regla como usada sólo en el estado `toast`, y el barrido, diferencias sólo en ese estado (la opacidad del toast, de 1 a 0).

**Alternativa descartada:** el control de F2b, poner la hoja del shell antes de `styles.css`. F3 y F4 ya encontraron que ninguna regla de `styles.css` compite con las que se mudan, así que podría dar 0 y no probaría nada.

## R7. Los E2E primero (FR-001)

- **Decisión:** `qa/e2e/specs/shell-style.spec.ts`, con siete pruebas del aspecto del shell que `css-contract.spec.ts` no cubre: la impresión, `main` desde 1 550 px, la barra lateral, la superior y el pie a 1 150 px, la barra superior y el pie a 590 px, el salto al contenido con el foco, el toast visible y el acento de la marca en cada idioma. Van en verde contra la base y no se editan después.
- **Los localizadores:** por rol y nombre accesible, en el Page Object del shell (`complementary` con el menú, `banner`, `contentinfo`, `main` y el enlace «Ir al contenido»), salvo la marca, que es `aria-hidden` y entra por su clase dentro del Page Object, como pide `qa/AGENTS.md`.
- **Los valores:** los del texto de las reglas de la base; `toHaveCSS` reintenta, así que no hace falta esperar la transición del toast (con el movimiento reducido, además, no hay transición).
- **Por qué no se edita `css-contract`:** sus títulos nombran hojas viejas (`lab.css`, `campaign.css`), pero editarlo es editar un E2E de la base (FR-002). Las reglas que fija (R1 a R5 y R8) se mudan a la hoja del shell y sus pruebas siguen en verde sin tocarlas.
- **Probado en el prototipo:** las siete en verde contra la base y contra la rama, y las siete en rojo sin `styles.css` ni la hoja del shell.

## R8. La prueba del orden de las hojas

- **Decisión:** F10c amplía la spec que deja F10b para FR-052, `frontend/src/app/main-entry.spec.ts` (proyecto `node`), que compara la lista entera de imports `.css` de `main.tsx` con `BASE_SHEETS`: suma `'./shell/shell.css'` en el segundo lugar y ajusta el título de la prueba. No hace falta otra spec.
- **Por qué ampliarla y no sumar otra:** la de F10b compara la lista entera con `toEqual`, así que la hoja nueva la rompe igual; con una sola lista, el orden de todas las hojas sigue en un lugar.
- **Por qué una prueba que lee el código:** lo que se protege es el orden de los imports, que define la cascada. Es lo que hacía `load-order-check` hasta F10b.
- **El rojo:** con la entrada nueva y sin el import, la lista recibida no tiene la hoja del shell en el segundo lugar.
- **Si F10b no dejó esa spec** (T036 lo comprueba), F10c crea `frontend/src/app/stylesheet-order.spec.ts`, que exige los dos primeros imports (plan 2.1, paso 3).

## R9. El tamaño

- **El tope:** `BOOT_SIZE_LIMIT`, 1 500 000 en `qa/build-check.ts` (decisión del 2026-10-28, noche). FR-004 y SC-008 todavía dicen 1 250 000: es un hallazgo para el coordinador.
- **Lo que suma F10c:** los envoltorios de los bloques `@media` repetidos y la regla partida, menos los bloques que quedan vacíos en `styles.css`. La proyección minificada da **+137** caracteres, y el prototipo sobre `master`, +161 (incluye las dos declaraciones que Lightning CSS juntó, R4).
- **Lo que suman los tokens** (T042): el `:root` con 61 tokens y 13 alias, y cada `var(--…)` en lugar de un valor corto. La proyección minificada da **+3 349**; el prototipo sobre `master`, +4 525, porque ahí el codemod también reescribe los tamaños de letra de las reglas que los ports todavía no se llevaron.
- **El subpresupuesto:** como mucho +1 000 sobre T036 después de la mudanza (T039) y +5 000 al cerrar (T044). El script y el marcado del dist no cambian.

## R10. Lo que no se hace (YAGNI)

- Renombrar clases o reescribir declaraciones más allá de los tokens de R12.
- Instalar Tailwind o escribir un `@theme`: es F15, con su ADR (el usuario, 2026-10-28).
- Borrar las reglas sin efecto de `.navigation a:last-child` (R5) o las de las hojas de página.
- Mudar a la hoja del shell las reglas de «Tu cuenta» que viven en `pages/account/ui/account.css` (`.topbar-actions` y `.account-entry*`): esa hoja es la de su slice (X3). **Decidido:** el usuario eligió dejarlas en su hoja el 2026-10-28.
- Dejar el barrido o la evidencia como checks permanentes: las pruebas permanentes son los E2E y la spec del orden.
- Partir `styles.css` en más hojas (tokens aparte, por ejemplo).

## R11. Los supuestos «sin dueño» y su verificación al empezar

Lo que este plan supone de la base, con lo que lo confirma en T036 (paso entre paréntesis). La columna «Si no se cumple» dice qué cambia.

| # | Supuesto | Verificación | Si no se cumple |
| --- | --- | --- | --- |
| S1 | F3, F8 y F9 sacaron de `styles.css` exactamente sus listas (43, 25 y 116 selectores) | La evidencia no da `single:library`, `single:method` ni `single:route` (7) | T040 muda lo que quedó |
| S2 | F10b no edita `styles.css` y conserva las clases y los ids del shell (FR-024). Su plan lo dice: no mueve CSS, salvo `.quiz-feedback:empty`, que suma a `route.css`, y `.admin-dialog`, que saca de `admin.css` | `git log --oneline <merge de F10b>^..<merge de F10b> -- frontend/styles.css` vacío; la evidencia da `shell` a cada regla de la tabla del shell (7) | Una regla nueva del shell se muda con las demás; una clase que cambió de nombre es un hallazgo para F10b |
| S3 | `.button.dark` sólo la usa «Salir», en «Tu cuenta» (F11a) | La evidencia, estado `account` (6 y 7) | Sin «Salir» con `button dark`, es huérfana: T041 |
| S4 | `.session-status` sigue en la raíz, vacía salvo en el error (el `Shell.tsx` del plan de F10b la dibuja siempre) | La evidencia, estados `recorrido-rust` y `session-error` (6) | Si F10b la quitó, sus cuatro reglas son huérfanas: T041 |
| S5 | `.empty-state` la usan el error de la compuerta y la Biblioteca vacía | La evidencia, estados `gate-error` y `library-empty` (6 y 7) | Con un solo dueño, T040 |
| S6 | `.pill` y `.pill.accent` las usan la Biblioteca y el Recorrido | La evidencia (6) | Con un solo dueño, T040 |
| S7 | `.step-check` y `.recommendation-strip` las usan el Recorrido y Proyecto | La evidencia (6) | Con un solo dueño, T040 |
| S8 | `.search-wrap` la usan la Biblioteca y el laboratorio | La evidencia, estados `biblioteca-*`, `laboratorio-*` y `lab-empty` (6) | Con un solo dueño, T040 |
| S9 | `.field-label` la usan Método, el laboratorio y los formularios de F11a; `.note-state`, Método, el laboratorio y Sistemas | La evidencia, estados `metodo-*`, `reflect`, `workshop-ship` y `sign-in` (6) | Con un solo dueño, T040 |
| S10 | `.dialog-content`, `.dialog-actions` y `dialog` los usan la lección, la confirmación de Método y la del laboratorio | `grep` de los tres ids (4.3) y la evidencia, estados `lesson` y `reset-confirm` (6) | Con un solo dueño, T040 |
| S11 | `.lab-empty` la usan el laboratorio y Sistemas, y `.sr-only`, la Biblioteca y el laboratorio | La evidencia, estados `lab-empty`, `sys-empty` y `biblioteca-*` (6) | Con un solo dueño, T040 |
| S12 | `progress` lo usan la barra lateral y la campaña | La evidencia (6); es `global` por sintaxis | — (queda en `styles.css`) |
| S13 | La carpeta del shell es `frontend/src/app/shell/`, como dice el plan de F10b | `grep -rln 'className="app-shell"' frontend/src` (8) | La hoja va en la carpeta real |
| S14 | La restricción del primer lugar de `styles.css` es `frontend/src/app/main-entry.spec.ts`, con la lista entera en `BASE_SHEETS` (plan de F10b, T027) | `ls frontend/src/app/main-entry.spec.ts` (8) | T038 crea `stylesheet-order.spec.ts` (plan 2.1, paso 3) |
| S15 | Los slices de página son `account`, `admin`, `atlas`, `campaign`, `lab`, `library`, `method`, `project`, `route` y `systems` | `ls frontend/src/pages` (4.4) | Se cambian los nombres en `grid.mjs` |
| S16 | El doble de la API responde la sesión con `user`, `features`, `contentVersion` y `catalogs`, y la administración pide `GET /api/admin/users` | Lectura de `api-double.ts` y del E2E de F12a (4.1); `unhandled` vacío (5) | Se copia la respuesta real a `grid.mjs` |
| S17 | `#administracion` abre la administración para `ADMIN` | El estado `admin` llega a su condición de listo (5) | Si F12a no entró, el estado se quita de la grilla y se anota |

**Verificado al planificar contra los planes de F10a y F10b** (worktree `plan-f10ab`, rama `plan/f10ab-shell-router`, `6b8352e1`). No son supuestos, salvo que la base traiga otra cosa:

- **La carpeta del shell** es `frontend/src/app/shell/` (`Shell.tsx`, `shell-state.ts`, `toast.ts` y `menu-counts.ts`; plan de F10b, U5).
- **La restricción del primer lugar** es `frontend/src/app/main-entry.spec.ts`, del proyecto `node`, que compara con `toEqual` la lista entera de imports `.css` de `main.tsx` contra `BASE_SHEETS` (plan de F10b, T027). La lista que deriva F10b pone `route.css`, `library.css`, `project.css` y `method.css` justo después de `styles.css`.
- **F10b no mueve CSS,** salvo `.quiz-feedback:empty`, que suma al final de `route.css` (T032), y `.admin-dialog`, que saca de `admin.css`.
- **F10b dibuja** `.session-status` siempre en `Shell.tsx`, `.empty-state` en las pantallas de la compuerta y de la sesión (`boot-screens`, en `app/boot/`), y deja el `<noscript>` en `index.html`.
- **El Page Object del shell:** F10a (T007) suma `main` (`page.locator('#main')`), `skipLink`, `sidebar` (el `complementary` que contiene el menú), `progressBar` y `exportButton`. T037 usa esos tres primeros y suma sólo `topBar`, `footer` y `brandMark`.
- **Las E2E de F10a** que tocan lo mismo fijan comportamiento, no CSS: el salto al contenido mueve el foco a `#main` (`shell-navigation.spec.ts`) y el toast muestra su texto y la clase `visible` (`shell-sidebar.spec.ts`). Las siete de T037 fijan valores de las reglas: no se duplican.
- **La numeración:** F10a usa T001 a T014 y F10b, T015 a T035.

## R12. Los tokens para el `@theme` de Tailwind v4

**La decisión** (el usuario, 2026-10-28): Tailwind es un ítem propio, F15, después de F10 y con su ADR. F10c termina la limpieza en CSS común y sin cambio visible, y deja los colores, la tipografía y los espacios del shell y de la base como variables CSS con los nombres que espera el `@theme` de v4. Extiende las variables de `:root` en lugar de inventar otras, y la paridad sigue en 0.

**Lo que dice Tailwind v4** (Context7, `/tailwindlabs/tailwindcss.com`):

- un token es una variable de un espacio de nombres del `@theme`, y cada espacio genera utilidades: `--color-*` (`bg-*`, `text-*`), `--font-*` (`font-sans`), `--text-*` (`text-xl`), `--font-weight-*`, `--tracking-*`, `--leading-*`, `--breakpoint-*`, `--container-*` (`max-w-*`), `--spacing-*` y la base `--spacing`, `--radius-*`, `--shadow-*` y otros;
- los nombres dentro de cada espacio son libres;
- el `@theme` va en el nivel superior, nunca dentro de un selector ni de un `@media`; para cambiar un valor en tiempo de ejecución (el tono de Go) se redefine la variable con CSS común, y las utilidades la siguen, porque usan `var(--color-accent)`;
- un `text-*` también fija el interlineado con `--text-*--line-height`.

**Los tokens,** en el `:root` de `styles.css` (el bloque entero está en el plan, T042):

| Espacio | Tokens | De dónde salen |
| --- | --- | --- |
| `--color-*` (22) | `paper`, `surface`, `ink`, `muted`, `line`, `accent`, `accent-dark`, `accent-soft`, `sage` y `green` | Los diez colores de hoy, renombrados |
| | `white` (`white`), `sidebar` (`#eeeee5`), `nav-hover` (`#e4e6dc`), `switch-line` (`#cccfc2`), `recommended` (`#e69a70`), `count-ink` (`#fff9ef`), `count-current` (`#d4a280`), `count-current-ink` (`#222b23`), `track` (`#d7dace`), `line-strong` (`#bdc4b3`), `check-line` (`#b9bfae`) y `backdrop` (`#20282088`) | Los colores literales del shell y de la base. `#fffdf8`, el color del texto de `.button`, es el valor de `surface` y usa ese token: el tono de Go no lo cambia |
| `--font-*` (3) | `serif`, `sans` y `mono` | Las tres familias de hoy, renombradas |
| `--text-*` (21) | `8`, `9`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `20`, `21`, `22`, `23`, `24`, `26`, `29`, `30`, `31`, `35`, `40` y `48`, en px | Cada `font-size` del shell y de la base |
| `--font-weight-*` (4) | `400`, `500`, `550` y `650` | Cada `font-weight` del shell y de la base |
| `--container-*` (1) | `main`: 1 330 px | El ancho máximo de `main`, del pie y del estado de la sesión |
| `--spacing-*` (8) | `sidebar` (240 px) y `sidebar-compact` (205 px); `topbar` (88), `topbar-compact` (68) y `topbar-phone` (61); `gutter` (52), `gutter-compact` (32) y `gutter-phone` (20) | Las medidas del armado del shell en cada ancho: las columnas, los altos de la barra superior y los márgenes laterales de la barra superior, `main`, el pie y el estado de la sesión |
| `--shadow-*` (2) | `dialog` y `toast` | Las dos sombras, que llevan color |

Son 61 tokens: 13 renombrados y 48 nuevos. Los nombres por medida (`--text-12`, `--font-weight-550`) no inventan una escala que el diseño de hoy no tiene: hay 21 tamaños sueltos, y la escala es decisión de F15.

**Lo que queda literal,** para F15: los demás rellenos y márgenes (43 valores distintos, casi ninguno múltiplo de 4), los radios, el interletrado, el interlineado y las medidas sueltas. Llevarlos a tokens ahora obligaría a elegir una escala o nombres con decimales y negativos (`--tracking-1.4px` no es un nombre válido sin escaparlo).

**Los alias.** Las hojas de página usan `var(--accent)`, `var(--ink)` y los demás nombres de hoy, y renombrarlos es trabajo de F15. Por eso los trece nombres de hoy quedan en `:root` como alias (`--accent: var(--color-accent)`), y sólo `styles.css` y la hoja del shell usan los nuevos.

**La trampa de los alias, medida en Chromium al planificar:** un alias declarado en `:root` se resuelve en `:root` y se hereda ya resuelto. Con `body[data-language='go'] { --color-accent: #22626b }` solamente, `--accent` sigue en `#ac4829` dentro de `<body>`, y todo lo que lo usa queda en el tono de Rust. Por eso el bloque de Go vuelve a declarar los tres alias de color. El multiconjunto resuelto no lo ve (resuelve con `:root`); el barrido sí, y su control negativo lo prueba (quickstart-f10c.md §3.5 d).

**Las pruebas:**

- **el multiconjunto resuelto** (quickstart-f10c.md §3.7): cada `var()` resuelto con los tokens de `:root` del dist y cada valor normalizado por Lightning CSS, sin las propiedades personalizadas. Tiene que dar lo mismo antes y después;
- **el barrido:** Chromium enumera las propiedades personalizadas en el estilo computado, así que cada token nuevo aparece en cada elemento. El barrido cuenta aparte las propiedades `--*` que la base no tiene (`newTokens`, 61) y compara todo lo demás, también los alias;
- **la búsqueda de T042:** ningún color literal ni nombre viejo en las declaraciones de las dos hojas, fuera de los bloques de tokens.

**El prototipo sobre `master`** (el codemod sobre la mudanza): el multiconjunto resuelto da las mismas 4 301 tuplas que la base, salvo las dos de `.favorite-button` que Lightning CSS juntó con la mudanza (R4). El codemod sobre la proyección de la base aplica las 21 entradas del armado exactamente una vez. El barrido está en «Mediciones de sólo lectura».

**Qué toma F15 de acá:**

1. **El bloque de tokens** pasa del `:root` al `@theme`, tal cual: los nombres ya son de v4. Lo que no tiene que generar utilidades, si lo hay, queda en `:root`.
2. **El tono de Go** queda como CSS común sobre `body[data-language='go']`, redefiniendo `--color-accent`, `--color-accent-dark` y `--color-accent-soft`; las utilidades lo siguen solas.
3. **Los alias** se borran cuando las hojas de página usen los nombres nuevos.
4. **Los tamaños:** `text-12` también fija el interlineado con `--text-12--line-height`. Hoy las reglas fijan el tamaño solo, así que F15 define esos interlineados o usa `text-[length:var(--text-12)]` para no cambiar el aspecto.
5. **Los espacios:** elige la base (`--spacing: 1px` reproduce los píxeles de hoy con `p-34`) o una escala; los nombres del armado (`gutter`, `topbar`, `sidebar`) ya están.
6. **Los anchos:** el CSS de hoy es de escritorio primero (`max-width`: 1 150, 850, 650 y 590 px) con dos de `min-width` (981 y 1 550 px). Los `--breakpoint-*` de v4 son de móvil primero, así que F15 decide cómo los traduce (las variantes `max-*` o la inversión).
7. **`--color-white`:** vale `white`, el mismo color que el `#fff` del tema por omisión de v4.
8. **Lo literal:** los radios, el interletrado, el interlineado y los demás espacios.
9. **El preflight de Tailwind** cambia los estilos base del documento: es parte del ADR de F15, con su propio barrido.

## Context7

El servidor `mcp__context7__*` agotó la cuota del mes; se usó el segundo (`mcp__44441c24-…`), el 2026-10-28.

| Librería | Versión (lockfile) | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Vite | 8.3.2 | `/vitejs/vite/v8.0.10` (la más cercana) | El CSS de los chunks asíncronos (`build.cssCodeSplit`) y el minificador (`build.cssMinify`) | El CSS de un chunk asíncrono se extrae aparte; Lightning CSS minifica por omisión | Sí: la hoja del shell se importa en `main.tsx`, no desde el componente (R4) |
| Lightning CSS | 1.33.0 | `/parcel-bundler/lightningcss` (sin versión) | Qué junta al minificar | Junta reglas contiguas con el mismo selector o las mismas declaraciones, y bloques `@media` contiguos con la misma condición; nunca lo que no es contiguo | Sí: un bloque por bloque de origen y la diferencia aceptada del multiconjunto (R4) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `page.coverage.startCSSCoverage` y `stopCSSCoverage` | Sólo en Chromium; `resetOnNavigation` por omisión `true`; no incluye `<style>` inyectados sin `sourceURL` | Sí: la cobertura es el control cruzado, y el script verifica que ve el `<style>` del dist (en el prototipo, sí) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `reducedMotion`, `emulateMedia({ media: 'print' })`, `javaScriptEnabled` y `BrowserContext.route` | Las tres opciones existen; `route.fulfill` responde un pedido | Sí: el doble propio del barrido, la impresión como captura y el aviso sin JavaScript insertado (R6) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `toHaveCSS`, `mouse.move` y `waitForURL` | `toHaveCSS` reintenta sobre el estilo computado | Sí: los E2E usan `toHaveCSS`; ninguno recarga, así que no hace falta `waitForURL` |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | Correr un proyecto con `--project` | `--project <nombre>` filtra los proyectos de `test.projects` | No: la spec del orden corre en el proyecto `node` de `frontend/vitest.config.ts` |
| PostCSS | 8.5.28 | `/postcss/postcss` (8.5.31, la única que tiene) | `walkRules`, `rule.selectors` y las posiciones | `walkRules` recorre las reglas anidadas; cada nodo tiene `source.start` y `source.end` con `offset` | No; la diferencia de versión es de parche y no cambia esas API |

| Tailwind CSS | v4 (no está instalado: lo instala F15) | `/tailwindlabs/tailwindcss.com` | Los espacios de nombres del `@theme` | `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`, `--breakpoint-*`, `--container-*`, `--spacing-*` (y la base `--spacing`), `--radius-*`, `--shadow-*` y otros; los nombres dentro de cada uno son libres | Sí: los nombres de los tokens de T042 (R12) |
| Tailwind CSS | v4 | `/tailwindlabs/tailwindcss.com` | `@theme` contra `:root`, `@theme inline` y `--text-*--line-height` | El `@theme` va en el nivel superior y no se anida; un valor que cambia en tiempo de ejecución se redefine con CSS común; `text-*` fija también el interlineado | Sí: el bloque de Go queda como CSS común, y las notas para F15 (R12) |

También se leyó `.agents/skills/tailwind-design-system/SKILL.md` (la jerarquía de tokens y la configuración en CSS de v4). No aplican, porque F10c no los usa: React 19, Testing Library, jsdom, fishery, Zustand, nuqs y React Hook Form.

## Mediciones de sólo lectura

Sobre las copias descartables de `431c9d90`:

| Medida | Base | Prototipo |
| --- | --- | --- |
| `styles.css` | 1 721 líneas | 1 308 líneas, más 432 de `shell.css` |
| `chars` del dist | 1 144 218 | 1 144 379 (+161) |
| El `<style>` | `17e95d57…`, 102 392 caracteres | `d96968fd…`, 102 553 caracteres |
| El script y el marcado | `e5697262…` y `562c5364…` | iguales |
| El multiconjunto | 4 319 tuplas | 4 317: `onlyBase` 2 (las de `.favorite-button` que Lightning CSS juntó, R4), `onlyUnit` 0 |

**Las comparaciones del prototipo** (la grilla que `master` tiene: los 35 estados menos «Tu cuenta», la administración, el ingreso y el error de la sesión, que llegan con F11a y F12a):

| Comparación | Resultado |
| --- | --- |
| El barrido, la base contra sí misma (8 estados, 1 280 y 590 px) | 40 capturas, 0 diferencias, ningún pedido sin respuesta |
| El barrido, la base contra el prototipo | 465 capturas (31 estados por 15), 0 diferencias, ningún pedido sin respuesta |
| El control negativo del orden (§3.5 b) | El multiconjunto en 0 y 0. El barrido, 342 diferencias a 590 y 375 px y 0 a 850 px: `.sidebar` pasa de `display: flex` a `grid` (y de 204 a 163 px de alto) y la barra superior, de 61 a 68 px |
| El control de borrado (§3.5 c) | 5 diferencias, todas en el estado `toast`: `opacity` 1 → 0 y el `transform`, en pantalla y en impresión. La evidencia da `#toast.visible` usada en las 15 capturas de ese estado y en ninguna otra |
| Los siete E2E de T037 | 7 de 7 en verde contra la base y contra el prototipo; 7 de 7 en rojo sin el import de `styles.css` |
| Los tokens (T042, el codemod sobre la mudanza) | El multiconjunto resuelto: 4 303 tuplas en la base y 4 301 en el prototipo, con las mismas dos de `.favorite-button` de R4 como única diferencia. El barrido: 403 capturas (31 estados, seis anchos y la impresión), `newTokens` 61 y 6 diferencias, todas de lo de adentro de los `<details>` cerrados del estado `lesson`; con el salto de R6, 0. El HTML sube 4 525 caracteres más (R9) |
| El control negativo de los alias (§3.5 d) | El multiconjunto resuelto en 0 y 0; el barrido, 3 198 diferencias, todas en `campana-go`: `--accent` vuelve a `#ac4829` y lo que la hoja de la campaña pinta con él, al tono de Rust |
| La cobertura de Chromium | Una entrada, con el texto exacto del `<style>` del dist (`coverageMatchesStyle: true`) |

**La evidencia sobre el prototipo** (369 selectores de las dos hojas): en la hoja del shell, 85 `shell` y `.button.dark` como `orphan`, porque en `master` no la usa nadie (S3). En `styles.css`, 2 `token`, 48 `global`, 47 `base`, 42 `single:library`, 27 `single:method`, 112 `single:route` y 5 `orphan`. Las cuentas cierran con los planes de los ports:

- **F3:** 42 selectores de la Biblioteca más `.favorite-button[aria-pressed='true']`, que la grilla no ve porque ningún estado guarda un favorito: 43, los de su plan.
- **F9:** 112 del Recorrido más cuatro sin estado en la grilla (`.quiz-option[aria-pressed='true']`, `.quiz-feedback.correct`, `.completion-banner` y `.section-heading p`): 116, los de su plan.
- **F8:** 25 de Método, más `.field-label` y `.note-state`, que con «reflect» y «ship» pasan a `base`.

**Un hallazgo para F9:** `.section-heading p` no la usa ningún elemento, ni en `master` ni en el port: el `.section-heading` del Recorrido tiene un `<div>` con el `<h2>` y el rótulo, sin `<p>` (`app.js`, `renderRoute`). F9 la muda a `route.css`; borrarla le toca al dueño de esa hoja, no a F10c.
