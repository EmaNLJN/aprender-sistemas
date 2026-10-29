# Research: F15 · La adopción de Tailwind CSS v4 (F15a, F15b y F15c)

Las decisiones técnicas de los tres planes, con sus alternativas, la tabla de Context7 y lo que se midió al planificar. Las secciones R son de F15a ([plan.md](./plan.md)), las B de F15b ([plan-f15b.md](./plan-f15b.md)) y las C de F15c ([plan-f15c.md](./plan-f15c.md)). Los comandos están en [quickstart.md](./quickstart.md), [quickstart-f15b.md](./quickstart-f15b.md) y [quickstart-f15c.md](./quickstart-f15c.md). El contrato de las hojas, que comparten las tres partes, está en [contracts/stylesheets-f15.md](./contracts/stylesheets-f15.md).

## Cómo se verificó

- **Sin descargas ni prototipo.** Tailwind no está instalado y el encargo no permite bajarlo, así que ninguna salida de Tailwind se midió al planificar. Lo que la documentación no garantiza para 4.3.3 lo mide la sonda de F15a (T007, R10) en una copia descartable, con su resultado esperado y su alternativa escrita de antemano.
- **Lo que sí corrió:** `npm view` para los metadatos del registro (las dos dependencias directas, igual que en la spec), lecturas de `master` (`bb480677`), del plan de F10c (worktree `plan-f10c`, rama `plan/f10c-estilos`, `c11a8d02`, PR #91) y del de F10a y F10b (worktree `plan-f10ab`, PR #88), y las consultas de Context7 de la tabla del final.
- **Lo que no corrió:** la base real de F15a (`master` con F3 a F10c entregados), Docker, la CI y macOS. Cada supuesto sobre esa base tiene su verificación en T001 (R15).

## Línea base de planificación

Medida en `master` (`bb480677`), sin ejecutar nada:

| Medida | Valor |
| --- | --- |
| Hojas | 7, con 7 143 líneas: `styles.css` (1 721), `lab.css` (1 949), `systems.css` (1 068), `atlas.css` (1 028), `campaign.css` (740), `quest-explorers.css` (540) y `project.css` (97) |
| Condiciones de `@media` | 18 distintas en 39 bloques: `max-width` 1 200, 1 150, 1 100, 1 050, 1 000, 970, 850, 700, 680, 650, 590 y 460 px; `min-width` 981, 1 500 y 1 550 px; `print`; `prefers-reduced-motion: reduce` y `no-preference` |
| `:hover`, `:focus`, `:active` | 15, 14 y 1 líneas en las siete hojas |
| Reglas que nombran el DOM de CodeMirror | Las 9 de `.cm-enhanced …` de `lab.css` (líneas 1 660 a 1 697); ninguna otra hoja nombra una clase `.cm-*` |
| El theme del editor | `EditorView.theme` en `shared/ui/code-editor/mount-code-editor.ts`: `&` con `height: 390px` y, a 620 px o menos, `345px`; `.cm-scroller` con `line-height: 1.7`; `.cm-content` con `padding: 19px 0` |
| Quién pone `cm-enhanced` | `mount-code-editor.ts:316`, en el padre del editor |
| Selectores de clase de la red congelada | `css-contract.spec.ts` localiza 20 clases (`.lab-nav-count`, `.navigation`, `.nav-count`, `.nav-symbol`, `.sidebar`, `.sidebar-bottom`, `.sr-only`, `.quest-banner`, `.quest-lab-context`, `.lab-empty`, `.quest-direct-lock`, `.button`, `.world-node`, `.lab-spinner` y otras); los Page Objects, `pre.terminal`, `.sys-trace li` y `.quest-lab-context`; el plan de F10a fija `toHaveClass(/\bvisible\b/)` en el toast |

**La base que recibe F15a** es la del plan de F10c (`c11a8d02`), que todavía no está implementado: `frontend/styles.css` con los 61 tokens con nombres de Tailwind v4 y los 13 alias en `:root`, y el bloque de Go con tres tokens y tres alias (T042 de F10c); la hoja del shell en `frontend/src/app/shell/shell.css`, segunda; y `frontend/src/app/main-entry.spec.ts`, que compara los imports `.css` de `main.tsx` con `BASE_SHEETS` (F10b, T027; F10c, T038). Lo verifica T001.

## R1. Archivos y numeración de las tareas

- **Decisión:** F15a usa `plan.md`, `quickstart.md` y `tasks.md`; F15b, `plan-f15b.md`, `quickstart-f15b.md` y `tasks-f15b.md`; F15c, `plan-f15c.md`, `quickstart-f15c.md` y `tasks-f15c.md`. Este `research.md` y `contracts/` se comparten. Las tareas siguen una sola numeración: F15a, T001 a T013; F15b, T014 a T031; F15c, T032 a T039.
- **Por qué:** es la forma de F10a, F10b y F10c (research-f10c.md, R1). Un commit que nombra una tarea no es ambiguo en la carpeta.

## R2. La entrada de CSS: dónde vive y qué declara (FR-010, FR-011, FR-012)

- **Decisión:** una sola entrada, `frontend/src/app/main.css`, que `main.tsx` importa como única hoja. Declara el orden de capas en su primera línea (`@layer theme, base, legacy, utilities;`), importa `tailwindcss/theme.css` en `theme`, cada hoja de hoy en `legacy` y en el orden de `BASE_SHEETS`, `tailwindcss/utilities.css` en `utilities` con `source('..')`, y al final, sin capa, las excepciones del editor (R3). Después vienen `@source`, `@custom-variant` y el `@theme static`.
- **Por qué `main.css`:** junto a `main.tsx`, en `app/`, la única capa que compone páginas. El nombre dice que es la entrada, y no se confunde con `frontend/styles.css`, que es una hoja heredada.
- **Por qué los imports pasan a CSS:** una hoja importada desde JavaScript no puede entrar en una capa; `@import … layer(legacy)` sí. Tailwind resuelve los `@import` él mismo (Context7, «Built-in `@import` handling») y Vite concatena el resultado en el único `<style>` (A2). Sin preflight, el patrón es el de la documentación: importar sólo `theme.css` y `utilities.css`, con `source()` en el de las utilidades (Context7, «Disabling Preflight»).
- **Por qué `legacy` entre `base` y `utilities`:** cualquier utilidad le gana a cualquier regla heredada, sin importar la especificidad. Sin capa, `p { color }` o `h1, h2, h3 { … }` le ganarían a las utilidades de un elemento migrado (spec, «Cómo conviven»). `base` queda vacía hasta F15c, que pone ahí el preflight y las reglas globales.
- **Sin `components`:** el taller no la usa (YAGNI). Si F15b la necesitara, entra en su PR con el orden de la documentación.
- **La prueba del orden:** `main-entry.spec.ts` deja de leer los imports de `main.tsx` y pasa a fijar dos cosas, en rojo antes del cambio (T005): que `main.tsx` importa sólo `./main.css`, y la lista entera de `@import` de `main.css`, con su capa y su `source()`. El orden de capas también se prueba sobre el CSS construido (R8), porque Tailwind puede sumar su propia capa `properties`.
- **Alternativas descartadas:**
  - **Envolver cada hoja en `@layer legacy { … }`:** diecisiete archivos reescritos de punta a punta, con la sangría de Prettier, y el `git blame` perdido.
  - **Dejar los imports en `main.tsx` y sumar una entrada de Tailwind al final:** las hojas quedarían sin capa y le ganarían a toda utilidad.

## R3. Lo que compite con el `<style>` de CodeMirror (FR-013)

- **El problema.** CodeMirror inyecta su theme sin capa al montarse. Hoy, una regla de `lab.css` le gana por especificidad o por orden; dentro de una capa perdería siempre, porque el CSS sin capa le gana a cualquier capa.
- **El criterio, estructural:** queda fuera de la capa toda regla heredada cuyo sujeto es un elemento del DOM de CodeMirror (una clase `.cm-*` que dibuja el editor), porque es la única que puede competir con un estilo inyectado. Las dos reglas de `.cm-enhanced` que nombran el DOM del taller (`.editor-wrapper.cm-enhanced` y `.cm-enhanced > .editor-lines`) se quedan en la capa: el editor no las estila.
- **La lista cerrada** (siete reglas, en el orden de `lab.css`):

  | Regla | Qué fija | Con qué compite |
  | --- | --- | --- |
  | `.cm-enhanced .cm-editor` | `min-width: 0`, `height: 390px` y `width: 100%` | `&` del theme (`minWidth`, `height` y `width`) |
  | `.cm-enhanced .cm-scroller` | `overflow`, la familia, `13px` e interlineado `1.8` | `.cm-scroller` del theme (familia, `1.7` y `overflow`) |
  | `.cm-enhanced .cm-content` | `padding: 20px 0` | `.cm-content` del theme (`19px 0`) |
  | `.cm-enhanced .cm-search input` | `max-width: 170px` | el theme base de `@codemirror/search` sobre los campos del panel |
  | `.cm-enhanced .cm-tooltip-autocomplete` | `max-width: min(450px, 80vw)` | el theme base de `@codemirror/autocomplete` sobre el tooltip |
  | `@media (max-width: 700px) .cm-enhanced .cm-editor` | `height: 320px` | `&` del theme a 620 px (`345px`) |
  | `@media (max-width: 700px) .cm-enhanced .cm-scroller` | `font-size: 12px` | el tamaño de `&` del theme a 620 px (`13px`) |

  El buscador y el autocompletado no están en la grilla: esas dos reglas entran por el criterio, no por una medición.
- **Dónde:** `frontend/src/shared/ui/code-editor/code-editor.css`, junto a `mount-code-editor.ts`, que es quien pone `cm-enhanced`. Así el slice del laboratorio de F15b nunca las toca, y en F15c la hoja queda como excepción declarada.
- **Por qué su lugar en `main.css` no importa:** sin capa, ganan a toda capa. Frente al `<style>` de CodeMirror siguen como hoy: las dos sin capa, con la misma especificidad y el mismo orden relativo entre el `<style>` del dist y el inyectado.
- **Lo que cambia y hay que mirar:** sin capa, las siete reglas también les ganan a las heredadas que hoy les ganaban por orden o especificidad. En `master` ninguna otra hoja nombra `.cm-*` (búsqueda de la línea base); las globales (`button, input, …`) fijan otras propiedades. T008 lo confirma con la misma búsqueda sobre la base.
- **La prueba:** el barrido con el editor montado (estado nuevo `editor` de la grilla, R9) en los siete anchos. Su control (T008): con las siete reglas de vuelta en la capa, el barrido da diferencias en `editor` al menos a 590 y 375 px (`height` de `.cm-editor`, 320 → 345 px) y en todos los anchos en el `padding` de `.cm-content` (20 → 19 px).

## R4. Los tokens en `@theme static` (FR-015, FR-016, FR-038)

- **Decisión:** el bloque de 61 tokens de F10c sale del `:root` de `styles.css` y pasa al `@theme static` de `main.css`, con `--*: initial;` primero y `--spacing: 4px;` (Q3-A). En el `:root` de `styles.css` quedan los 13 alias; el bloque de Go no cambia (tres tokens y tres alias, como CSS común en la capa heredada).
- **Por qué `static`:** Tailwind emite por omisión sólo las variables del theme que usa alguna utilidad, y en F15a no hay ninguna. La documentación no dice si cuenta como uso un `var()` de una hoja que no genera utilidades; `@theme static` las emite todas (Context7, «Generating all CSS variables»). Con `--*: initial`, `static` emite sólo los del taller (Context7, «Disabling the default theme»).
- **Por qué el bloque de Go sigue igual:** el theme pone los tokens en `:root, :host`, dentro de `@layer theme`. `body[data-language='go']` es otro elemento, así que no compite: redefine `--color-accent*` en `<body>` y todo lo de adentro, utilidades incluidas, lo sigue (research-f10c.md, R12, «La trampa de los alias»). Los alias se vuelven a declarar en el bloque de Go mientras existan.
- **La prueba, escrita antes de mover el bloque (FR-038):** `qa/style-output-check.ts` exige cada token de `qa/fixtures/theme-tokens-f10c.json`, con su valor, en una regla `:root` del CSS construido, en cualquier capa. La fixture es el bloque de T042 de F10c, copiado del plan, congelada y nunca regenerada desde el dist. Contra la base pasa (los tokens están en `:root`, sin capa). Su control (T009): con `@theme` sin `static`, el check tiene que dar rojo; si da verde, Tailwind cuenta los `var()` de la capa heredada, y se anota, pero `static` se queda por FR-038.
- **La serialización.** Lightning CSS minifica el dist, y puede escribir un valor distinto del bloque (por ejemplo, las comillas o `white`). El check compara sin espacios y con un solo tipo de comilla. Si un valor sólo cambia de forma (`white` contra `#fff`), T003 lo escribe en la fixture en la forma del dist, con la línea en research («Mediciones de la implementación»): el color es el mismo, y la fixture sigue siendo el contrato del bloque.
- **Sin valores por omisión (FR-015):** el mismo check exige que las variables declaradas en `@layer theme` sean las de la fixture más `--spacing`, que vale `4px`. Una variable de la paleta, de las fuentes o de la escala por omisión lo pone en rojo.

## R5. Las fuentes de clases (FR-017)

- **Decisión:** `source('..')` en el import de `utilities.css` (relativo a `main.css`: `frontend/src`, con `index.html`), y `@source not` para las specs (`../**/*.spec.ts`, `../**/*.spec.tsx`) y `../vitest.setup.ts`.
- **Por qué:** por omisión Tailwind escanea desde el directorio de trabajo todo lo que Git no ignora (Context7, «Which files are scanned»), y el build corre desde la raíz: leería `content/`, `specs/`, `docs/` y `backend/`. Las specs del front no son interfaz: sus cadenas (`'visible'`, `'hidden'`) sólo sumarían utilidades sueltas.
- **Lo que la documentación no confirma:** que `@source not` acepte un glob (los ejemplos son carpetas). La sonda lo mide (R10, S10); si no lo acepta, se sacan las tres líneas y las utilidades que salgan de las specs se listan como palabras sueltas.
- **La prueba:** la lista de `@import` de `main-entry.spec.ts` fija `source('..')`; la sonda usa un centinela real, `bg-[#dedfcc]`, que sólo aparece en `specs/030-f15-tailwind/spec.md` (R10, S9); y la compuerta de F15a exige la lista de utilidades vacía o explicada una por una.

## R6. Las colisiones y las clases marcador (FR-018, Q4-A)

- **Las dos colisiones de hoy:** `sr-only` (la Biblioteca y el laboratorio) y `visible` (el toast). Con Tailwind escaneando el front, las dos generarían su utilidad en la capa `utilities`, que le gana a la regla heredada.
- **Decisión:** no se genera la utilidad: `@source not inline('sr-only');` y `@source not inline('visible');` (Context7, v4.1, «Block specific classes from generation»). Renombrar la clase heredada no sirve: la red congelada las localiza por clase (`css-contract.spec.ts`, R5, con `page.locator('.sr-only')` y su `clip`; el plan de F10a, `toHaveClass(/\bvisible\b/)` en el toast), y FR-002 no deja editarla.
- **Las clases marcador.** Lo mismo vale para F15b: la red congelada localiza unas veinte clases de los slices. Un elemento migrado conserva, sin regla propia, la clase que la red usa para encontrarlo (`terminal` en Proyecto, por ejemplo). Es un marcador, no una clase heredada con estilo. Ver B2 y la decisión 1 del informe.
- **El check (permanente):** `style-output-check` calcula las clases de las reglas de `@layer utilities` del CSS construido y las cruza con dos conjuntos: las clases que nombran los selectores de las hojas que `main.css` importa en `legacy`, y las clases marcador de la red (las de los `locator('…')` y los `toHaveClass(…)` de `qa/e2e`). La intersección tiene que estar vacía. Una colisión nueva (un slice migrado que usa `hidden` mientras otra hoja define `.hidden`) lo pone en rojo. El control de T008 saca `@source not inline('visible')` y tiene que dar rojo con `visible`.
- **El inventario de una sola vez:** la lista de todas las utilidades de la salida de F15a, cada una con su motivo, va en el PR (FR-018). Es evidencia, no un check.

## R7. Los anchos y el `:hover` (FR-019, FR-020)

- **El `:hover`:** `@custom-variant hover (&:hover);` devuelve la semántica de antes: aplica con cualquier puntero (Context7, «Restoring legacy hover behavior»).
- **Los anchos:** una variante por condición de hoy, con la condición literal y en la forma de bloque que muestra la documentación (`@custom-variant upto-590 { @media (max-width: 590px) { @slot; } }`). Los nombres son `upto-<px>` para `max-width` (incluye el límite) y `from-<px>` para `min-width`. Se registran de la más ancha a la más angosta, como hoy los bloques de 850 px van antes que los de 590 px, para que la más angosta gane cuando las dos aplican (la sonda confirma que el orden de registro es el de salida, R10, S6). `print:`, `motion-safe:` y `motion-reduce:` son de Tailwind y escriben `@media print` y `(prefers-reduced-motion: …)`, las de hoy (S5).
- **Lo que no se usa:** `max-*` y `min-*` de Tailwind. `max-*` escribe `(width < X)`, que excluye el límite (Context7), y Tailwind baja la sintaxis de rango a otra forma (Context7, «Syntax transforms»): las dos dan condiciones que la base no tiene.
- **Por qué no `max-590`:** el nombre se superpondría con la variante funcional `max-*` de Tailwind. `upto-` y `from-` no son raíces de ninguna variante.
- **La prueba:** `style-output-check` exige que cada condición de `@media` de la salida esté en la lista de la base, después de llevar las dos a una forma canónica (sin espacios, en minúsculas, y `max-width: N` y `width <= N` como la misma condición), y que no haya `(hover: hover)`. Una utilidad con `max-[590px]:` da `(width<590px)` y lo pone en rojo.

## R8. Los checks nuevos y por qué no usan `postcss` (FR-005, FR-011, FR-014, FR-015, FR-018 a FR-020, FR-023 y FR-038)

- **`qa/style-output-check.ts`** lee el `<style>` de `dist/index.html` y fija: los tokens con su valor (FR-038); las variables de `@layer theme` (FR-015); ningún interlineado de `text-*` (FR-015, R10, S2); ninguna regla del preflight antes de F15c (FR-014, por la firma `::file-selector-button`, que sólo usa el preflight); ningún `!important` en `@layer utilities` (FR-005); las condiciones de `@media` y el `:hover` (R7); el orden de capas sobre el CSS construido (FR-011), con `properties` de Tailwind permitida sólo antes de `theme`; y las colisiones (R6).
- **`qa/stylesheets-check.ts`** fija la lista cerrada de hojas de `frontend/` (FR-023): la entrada, las heredadas que faltan migrar y las excepciones declaradas. Exige igualdad, así que una hoja nueva lo pone en rojo y una borrada que sigue en la lista, también. Cada PR de F15b saca su hoja de la lista.
- **`qa/lib/css-blocks.ts`** es un lector de CSS de unas noventa líneas: reglas planas con su contexto de at-rules, declaraciones y orden de capas. No usa `postcss`: es una dependencia de Vite, no del proyecto, y sumarla a `package.json` rompería SC-008 (exactamente dos dependencias nuevas). El dist sale plano de Lightning CSS; el lector falla con un mensaje si encuentra un bloque anidado, en lugar de leerlo mal.
- **Dónde corren:** los dos en `qa/run-checks.ts`, en el grupo web (la imagen los corre con `QA_CHECKS=web`). `style-output-check` lee el dist, como `build-check`: corre después de `npm run build`.

## R9. Las herramientas de comparación promovidas (FR-001, FR-022, FR-032)

F10c deja su barrido, su evidencia y su multiconjunto resuelto como scripts de una sola vez, copiados de `quickstart-f10c.md` a `$TMPDIR` (research-f10c.md, R10). F15 los necesita en cada uno de sus quince PR, así que F15a los promueve con el menor cambio posible (T002):

- **Dónde:** `qa/e2e/style-compare/` (`grid.ts`, `style-sweep.ts`, `rule-evidence.ts` y `resolved-multiset.ts`). Ahí el `tsconfig` de `qa/e2e` tiene los tipos del DOM, que piden las funciones de `page.evaluate`. No son specs ni checks: no corren en `npm test` ni en `npm run test:e2e`, y se ejecutan con `node` (Node 24 quita los tipos). `qa/e2e/tsconfig.json` suma `allowImportingTsExtensions`, porque Node exige la extensión en los imports relativos.
- **Cómo:** el código sale de los bloques de `quickstart-f10c.md` §3.2, §3.3, §3.4 y §3.7, copiado sin cambios, más los tipos mínimos para el modo estricto y estas ediciones:
  1. **`grid`:** el estado `editor` (`/?ejercicio=rust-02&paso=code#laboratorio`, listo cuando hay `.cm-editor`), para FR-013.
  2. **`style-sweep`:**
     - compara también `::before` y `::after` de cada elemento cuyo `content` no es `none`. El preflight de F15c y el `::after` de `.step-check` del piloto viven ahí;
     - informa `newTokens` y `removedTokens` por nombre, no por cantidad. Las propiedades `--*` que aparecen se aceptan sólo en la lista cerrada de FR-001 (`--spacing` y las `--tw-*` que declara el dist comparado); las que desaparecen, sólo los 13 alias en F15c (C3).
  3. **`resolved-multiset`:**
     - lee los tokens de `:root` en cualquier capa (`:root, :host` dentro de `@layer theme`), no sólo del nivel superior;
     - compara sólo las reglas heredadas: las de `@layer legacy` y las sin capa, sin el `@layer legacy` en el contexto;
     - lleva cada condición de `@media` del contexto a la forma canónica de R7.
  4. **Todos:** `createRequire(…)` se asigna a `load`, no a `require` (la regla `no-require-imports` de typescript-eslint), y una función que pase de 10 de complejidad se parte por un ayudante con nombre (SC-009 pide el mismo total de avisos).
- **Lo que no se promueve:** `css-multiset.mjs`, porque después de T042 de F10c no se usa (research-f10c.md, R12), y `tokenize.mjs`, que fue un codemod de una vez.
- **La limitación:** `resolved-multiset` y `rule-evidence` resuelven `postcss` y `lightningcss` desde el `node_modules` de la raíz que reciben, como en F10c. Las dos son dependencias de Vite 8.3.2. Si Vite las dejara, las herramientas fallan con el error de la resolución, no en silencio.
- **El control de determinismo** (la base contra sí misma da 0) se repite con la herramienta promovida antes de cualquier comparación (T002).

## R10. La sonda de Tailwind 4.3.3 (T007)

Lo que la documentación no fija para 4.3.3, o que depende de la combinación con Vite 8.3.2 y `vite-plugin-singlefile` 2.3.3, se mide una vez en una copia descartable con las dependencias instaladas: un `main.css` igual al de T008, más `@source inline('…')` con las clases de la tabla, y el CSS del dist leído con `css-blocks`. No se commitea; el resultado va a research, «Mediciones de la implementación».

| # | Qué se mide | Lo esperado | Si no da lo esperado |
| --- | --- | --- | --- |
| S1 | El build con el plugin y el single file | Un `<style>`, un `<script>`; `build-check` en verde | Se para: es un hallazgo de C4 y de F15a; se informa sin seguir |
| S2 | `text-12` | `font-size: var(--text-12)` y, según Context7, también `line-height: var(--tw-leading, var(--text-12--line-height))`, que con la variable sin definir anula el interlineado heredado | Con o sin esa línea, la receta de F15b usa siempre `text-(length:--text-12)`, que escribe sólo `font-size` (Context7, tabla de `font-size`), y el check de R8 prohíbe el interlineado de `text-*` |
| S3 | `text-(length:--text-12)`, `text-[28px]`, `leading-[1.8]`, `tracking-[1.4px]`, `font-500`, `font-mono`, `italic` | Cada una escribe su propiedad con el valor y, como mucho, una `--tw-*` propia | La que escriba otra cosa pasa a la tabla de trampas de B3 y se usa la propiedad arbitraria |
| S4 | `p-5`, `p-[30px]`, `m-0`, `ml-8`, `gap-3`, `w-[18px]`, `h-px`, `max-w-[750px]`, `grid-cols-[1fr_1fr]` | `calc(var(--spacing) * n)` con `--spacing: 4px`, o el literal | Como S3 |
| S5 | `print:block`, `motion-safe:block`, `motion-reduce:block` | `@media print` y `(prefers-reduced-motion: no-preference)` y `(…: reduce)`, sin otra forma | Se definen como variantes propias, con la condición literal, como las de R7 |
| S6 | `upto-850:block` y `upto-590:block` | `@media (max-width: 850px)` y `(max-width: 590px)`, en el orden de registro | Si el orden de salida no es el de registro, la receta de F15b no apila dos anchos sobre la misma propiedad: el barrido lo detecta y se usa la condición más angosta sola |
| S7 | `hover:bg-ink` con `@custom-variant hover (&:hover)` | `.hover\:bg-ink:hover { … }` sin `(hover: hover)` | Se para: FR-020 no se cumple con la variante de la documentación |
| S8 | `bg-ink`, `bg-current`, `bg-transparent`, `text-white`, `border`, `border-line`, `border-t`, `rounded-[7px]`, `checked:bg-green`, `checked:after:content-['✓']` | La propiedad de hoy; `border` agrega `--tw-border-style`, con `solid` como inicial | Como S3 |
| S9 | El centinela `bg-[#dedfcc]` (sólo en `specs/030-f15-tailwind/spec.md`) | No aparece en la salida | Se para: `source('..')` no acota |
| S10 | `@source not '../**/*.spec.ts'` | Una clase que sólo está en una spec del front no aparece | Se sacan las líneas de `@source not` de las specs (R5) |
| S11 | Las variables del theme con `@theme` sin `static` | Faltan los tokens que ninguna utilidad usa | Se anota; `static` queda igual (FR-038) |
| S12 | Las capas del CSS construido | `theme, base, legacy, utilities`, quizás con `properties` delante | Si `properties` va después de `theme`, se para: sus `--tw-*` pisarían las de las utilidades en los navegadores sin `@property` |
| S13 | El aviso de Tailwind (`/*! tailwindcss v4.3.3 …`) | Presente o no en el `<style>` | Si está, T011 suma la entrada a `THIRD-PARTY-NOTICES.txt` (FR-024) y cuenta en el subpresupuesto |
| S14 | Lo que el optimizador de Tailwind hace con las hojas heredadas | El multiconjunto resuelto en 0 y 0 contra la base | Una diferencia sólo de forma (un prefijo, una condición reescrita) se lista con el barrido en 0; cualquier otra se para (FR-022) |
| S15 | `shadow-(--shadow-dialog)`, `[transform:translateY(-3px)]`, `[transition:opacity_0.2s,transform_0.2s]`, `rounded-[50%]` | La propiedad de hoy, sin componer con `--tw-*` | Pasan a B3 como trampas y la receta usa la forma que sí la da |

## R11. El tamaño (FR-004)

- **El tope:** `BOOT_SIZE_LIMIT`, 1 500 000 en `qa/build-check.ts` (PR #76).
- **El subpresupuesto de F15a:** +2 000 caracteres sobre T001. Lo que suma: la declaración de capas, los envoltorios `@layer legacy{…}` (Lightning CSS puede juntar los contiguos), el `@layer theme{:root,:host{…}}` en lugar del `:root` de hoy, `--spacing:4px`, el bloque de las excepciones del editor sin capa y, si S13 lo confirma, el aviso de Tailwind (unos 60 caracteres). Ninguna utilidad. El JavaScript no cambia.
- **Si se pasa:** la tarea se para y lo aprueba el usuario (FR-004).

## R12. Las dependencias (FR-009, SC-008)

Del registro de npm, consultado otra vez el 2026-10-28 con `npm view`, sin descargar: las mismas de la spec, «Descargas previstas».

| Paquete | Versión | Licencia | Desempaquetado (bytes) |
| --- | --- | --- | --- |
| `tailwindcss` (directa) | 4.3.3 | MIT | 772 893 |
| `@tailwindcss/vite` (directa; pide `vite` `^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8`) | 4.3.3 | MIT | 13 509 |
| `@tailwindcss/node`, `@tailwindcss/oxide` y su binario (`-linux-x64-gnu`, `-linux-x64-musl` o `-darwin-arm64`) | 4.3.3 | MIT | 130 939, 29 502 y unos 3 000 000 |
| `lightningcss` (copia anidada) y su binario | 1.32.0 | MPL-2.0 | 510 515 y unos 10 050 000 |
| `magic-string` (anidada), `enhanced-resolve`, `tapable` y `graceful-fs` | 0.30.21, 5.26.0, 2.3.3 y 4.2.11 | MIT, MIT, MIT e ISC | 459 761, 543 900, 73 418 y 32 535 |

Unos 15,6 MB en Linux con glibc. `npm install --save-dev --save-exact` escribe en el lockfile las variantes opcionales de cada plataforma, como ya pasa con Lightning CSS y Rolldown. El permiso lo pide T006 con esta tabla.

## R13. El piso de navegadores (consecuencia del ADR)

- **Con la capa heredada,** todo el CSS depende de `@layer`: Chrome 99, Firefox 97 y Safari 15.4. Un navegador anterior ignora todos los estilos.
- **Tailwind v4** está diseñado para Safari 16.4, Chrome 111 y Firefox 128 (`@property` y `color-mix()`); desde la 4.1 degrada mejor en Safari 15 (Context7).
- **Va en** las consecuencias del ADR 0010 y en una sección nueva del README (FR-008). Hoy el README no declara navegadores; el taller compila a ES2020.

## R14. Lo que no se hace (YAGNI)

- La capa `components`, `tailwind.config`, prefijos, plugins de Prettier o ESLint, CVA, `clsx` y `tailwind-merge` (FR-034).
- OKLCH, el modo oscuro y los anillos de foco de la skill `tailwind-design-system` (spec, «Fuentes consultadas»).
- Variantes `max-*`, `min-*` o `--breakpoint-*` (R7).
- Normalizar valores a una escala (Q3-A: se conserva el literal, contado como deuda).
- Componentes de `shared/ui` antes de su primer uso: los crea el slice de F15b que los usa primero (B4).

## R15. Los supuestos de la base y su verificación en T001

| # | Supuesto | Verificación | Si no se cumple |
| --- | --- | --- | --- |
| S1 | F10c está en `master`: `styles.css` con 61 tokens y 13 alias en `:root`, y el bloque de Go con 3 y 3 | `git log --oneline` muestra su merge; la lectura del `:root` | F15a no empieza: depende de F10c |
| S2 | La hoja del shell es `frontend/src/app/shell/shell.css`, segunda | `main-entry.spec.ts` con `'./shell/shell.css'` segunda en `BASE_SHEETS` | Se usa la ruta real |
| S3 | `BASE_SHEETS` tiene las 17 hojas del plan de F10c, o las que trajo cada ítem | Se copia la lista de la base | `main.css`, `ENTRY_IMPORTS` y `ALLOWED_SHEETS` se escriben con la de la base, en su orden |
| S4 | Ninguna hoja fuera de `lab.css` nombra una clase `.cm-*` | `grep -rn '\.cm-' frontend --include=*.css` | La regla nueva se mide con el criterio de R3 |
| S5 | La red congelada sigue localizando `.sr-only` y el toast con `visible` | `grep -rn` en `qa/e2e` | Si ya no los localiza, la exclusión de esa utilidad igual se queda: la clase heredada sigue con estilo |
| S6 | `BOOT_SIZE_LIMIT` es 1 500 000 | `grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts` | Se usa el vigente |
| S7 | El número de ADR libre es 0010 | `ls docs/adr` | Se usa el siguiente libre y se corrige en el plan con el ADR |
| S8 | C4 no entró (un `<style>` en línea) | `qa/build-check.ts` exige un solo `<style>` | Con C4, `style-output-check` lee la hoja enlazada y el tamaño se mide por archivo (FR-004) |

## B1. F15b: un slice por PR y la receta

- **La forma:** un PR por slice, en el orden de la tabla de `plan-f15b.md`, con Proyecto como piloto. Cada PR es una sola cola de tres commits (los E2E en verde contra la base, la migración y el cierre), y se revierte entero.
- **La receta** (R1 a R6 en `plan-f15b.md`): el inventario, los E2E primero, los componentes de las clases base, las utilidades con la hoja borrada, las comparaciones y la deuda. Se escribe una vez, completa, con el piloto como ejemplo; cada fila de la tabla dice sólo lo particular.

## B2. Las clases marcador (FR-002 contra FR-029)

- **El conflicto.** FR-029 pide que un elemento migrado no lleve clases heredadas de su slice. Pero la red congelada localiza elementos por clase (R6), y FR-002 no deja editarla: sin la clase, la prueba no encuentra el elemento.
- **La lectura del plan:** una clase que la red usa para localizar queda en el elemento como marcador, sin regla en ninguna hoja después de la migración. FR-029 se cumple sobre las clases con estilo. La lista cerrada de marcadores de cada slice sale de su inventario (R1), y el check de colisiones la cruza con las utilidades (R6).
- **Un marcador que es también una clase base** (`button`, `step-check`, `sr-only`, `lab-empty`): mientras otro slice sin migrar use la regla, la regla heredada también alcanza al elemento migrado, debajo de sus utilidades. El componente fija con utilidades todas las propiedades de esa regla, así que la regla no agrega nada, y F15c la borra con el barrido en 0.
- **Un marcador que nombra un `:not()` global** (`input[type='checkbox']:not(.step-check)`): queda, porque sin él la regla global alcanzaría al elemento.
- Es la decisión 1 del informe al usuario.

## B3. Las trampas de las utilidades

Una utilidad es segura si escribe la propiedad de hoy con el valor de hoy y, como mucho, una variable `--tw-*` propia. Si escribe otra propiedad, una de más, o compone con otras variables, va la propiedad arbitraria (`[prop:value]`), contada como deuda. Las conocidas al planificar (la sonda S2, S3, S8 y S15 confirma o amplía la lista):

| Utilidad | Lo que hace en v4 | Qué se usa |
| --- | --- | --- |
| `text-12` (un tamaño del theme) | También escribe `line-height` con `--text-12--line-height`, sin definir (Context7) | `text-(length:--text-12)` |
| `shadow-dialog` | Compone `--tw-shadow` con los anillos | `shadow-(--shadow-dialog)` |
| `translate-*`, `scale-*`, `rotate-*` | Escriben `translate`, `scale` y `rotate`, no `transform` | `[transform:…]` con el literal de hoy |
| `transition`, `duration-*`, `ease-*` | Usan `--default-transition-*`, que el theme borra | `[transition:…]` con el literal de hoy |
| `grid-cols-2` | `repeat(2, minmax(0, 1fr))` | `grid-cols-[1fr_1fr]` si hoy es `1fr 1fr` |
| `rounded-full` | `calc(infinity * 1px)` | `rounded-[50%]` si hoy es `50%` |
| `border-line` con un borde de un solo lado | Fija el color de los cuatro lados, y el barrido ve `border-left-color` | `border-t-line` (el color del lado que tiene borde) |
| Un color con `/50` | `color-mix()` | El hexadecimal de hoy con su alfa (`bg-[#0002]`) |
| `max-*`, `min-*`, `sm:` y demás anchos | Otras condiciones | Las variantes `upto-*` y `from-*` (R7) |
| Dos utilidades de la misma propiedad en un elemento | Gana la que Tailwind emite después, no la que va última en la clase | Una sola por propiedad; las variantes de un componente son mapas de cadenas completas (FR-021) |

Y las del barrido (TR-13): el texto de un elemento en un solo nodo (un template literal), el puntero en `(-1, -1)` y lo de adentro de un `<details>` cerrado sin comparar.

## B4. Los componentes de las clases base (FR-030)

- **Dónde:** `frontend/src/shared/ui/<nombre>/`, con su `index.ts`, como `code-editor`. Las clases base las comparten páginas de slices distintos, y `shared` es la capa más baja.
- **La forma:** un componente por clase base, con `const` y `export default`. Sus variantes son mapas de cadenas completas (`tone`, `size`), y `className` sólo suma propiedades que el componente no fija. Sin `clsx` ni `tailwind-merge` (FR-034).
- **El ciclo:** el primer slice de la tabla que usa la clase crea el componente; los demás lo reusan y le suman la variante que les falte; la regla heredada queda en `styles.css` hasta F15c, que la borra con su evidencia (FR-036). F15b nunca edita `styles.css`.

| Clase base | Usuarios (research-f10c.md, R3) | La crea |
| --- | --- | --- |
| `.eyebrow`, `.eyebrow-line` | Todas las páginas | Proyecto (`Eyebrow`) |
| `.page-heading` | Biblioteca, Método y Proyecto | Proyecto (`PageHeading`) |
| `.small-label` | Shell, Recorrido, campaña, laboratorio, Proyecto y Sistemas | Proyecto (`SmallLabel`) |
| `.recommendation-strip` | Recorrido y Proyecto | Proyecto (`RecommendationStrip`) |
| `.step-check` | Recorrido y Proyecto | Proyecto (`StepCheck`) |
| `.field-label` | Método, laboratorio y formularios de F11a | `shared/ui/form` (`FieldLabel`) |
| `.button` y sus variantes | El shell y todas las páginas | El primer slice de la tabla que la use según su inventario (se espera `features/sign-in`) |
| `.text-button` | Shell, Recorrido, Método, laboratorio y Sistemas | Método (`TextButton`) |
| `.note-state` | Método, laboratorio y Sistemas | Método (`NoteState`) |
| `.dialog-content`, `.dialog-actions` | Recorrido, Método y laboratorio | Método (`DialogContent`, `DialogActions`) |
| `.pill`, `.pill.accent` | Biblioteca y Recorrido | Biblioteca (`Pill`) |
| `.search-wrap` | Biblioteca y laboratorio | Biblioteca (`SearchField`) |
| `.empty-state` | Shell (el error de la compuerta) y Biblioteca | Biblioteca (`EmptyState`) |
| `.sr-only` | Biblioteca y laboratorio | Biblioteca (`VisuallyHidden`, con el marcador `sr-only`) |
| `.lab-empty` | Laboratorio y Sistemas | Sistemas (`LabEmpty`, con el marcador `lab-empty`) |

## B5. El peso de cada slice (FR-004, SC-007)

- **El piloto mide** `r = Δchars del dist / bytes de la hoja en el dist base`. Los bytes de la hoja son la diferencia de largo del `<style>` de la base con y sin su `@import`, medida en una copia descartable (quickstart-f15b.md §2).
- **El tope de cada slice:** `ceil(r × bytes de su hoja × 1,25)`, con un piso de 500 caracteres, y nunca más de 5 000 sin el permiso del usuario (FR-004). La tabla de `plan-f15b.md` lo calcula en el PR del piloto y lo escribe en cada fila.
- **Por qué:** el piloto mide la relación real entre el CSS que se va y las cadenas que crecen en el JavaScript. Las utilidades se generan una sola vez para todo el dist, así que `r` tiende a bajar con cada slice; el 25 % cubre la variación entre slices.
- **Si un slice prevé más de 5 000:** su PR pide el permiso antes de empezar, con dos opciones: aceptar el tope, o partir el slice por hoja (el laboratorio tiene tres).

## B6. El orden de los slices

De menor a mayor riesgo: el piloto, los tres slices de F11a (chicos y sin vistas en el menú), las páginas de menor a mayor hoja, el laboratorio (el más grande, con el editor) y el shell al final, porque aparece en todos los estados de la grilla y su barrido es el más amplio. Las pantallas que hayan entrado antes de F15a (F11b, F11c, F12b, F13 o F14) van en su lugar según el tamaño de su hoja.

## B7. Lo que el barrido no ve (FR-028)

El barrido saca el puntero, no da foco, no hace clic ni toca, no compara lo de adentro de un `<details>` cerrado, y sus estados en Go siembran el idioma antes de cargar. Cada slice abre con E2E de eso, y del acento de Go al cambiar de idioma sin recargar si usa una utilidad `*-accent*`: `:hover` (con `locator.hover()`), el toque (con un contexto `hasTouch` e `isMobile`, y `locator.tap()`), `:focus-visible` (con el teclado), `:active`, `:checked`, las transiciones (su `transition-property`) y el contenido de los `<details>` abiertos. `toHaveCSS` lee también `::before` y `::after` (Context7, Playwright 1.63). El control del toque, una vez en el primer PR que suma una utilidad `hover:` (se espera `features/sign-in`, T020, que crea `Button` con `.button:hover`), saca `@custom-variant hover` en una copia y tiene que dar rojo; si no da rojo, el check estático de R7 es la única guarda y se anota.

## C1. F15c: el preflight compensado (FR-039, Q2-B)

- **El orden en `main.css`:** `@import 'tailwindcss/preflight.css' layer(base);` y, en `@layer base`, primero las reglas compensatorias y después las globales del taller, sin cambiar sus declaraciones ni su orden (FR-035). Las globales siguen ganando donde fijan algo, y las compensatorias devuelven lo que el preflight cambia y ninguna global fija.
- **Lo que el preflight cambia** (Context7, «Preflight»): márgenes y rellenos en 0 en todo elemento; `border: 0 solid` (el estilo de borde de todo elemento pasa de `none` a `solid`, con ancho 0); títulos sin tamaño ni peso; listas sin viñetas ni sangría; botones sin fondo; `img`, `svg`, `video` y `canvas` en `display: block`; `html` con su familia, su interlineado y `tab-size`; `code`, `pre` con otra familia; el color de los `::placeholder`.
- **El procedimiento:** el barrido de F15c contra su base, con el preflight y sin compensaciones, da la lista de selectores y propiedades que cambian; cada una se compensa con la regla mínima (el valor del navegador o `revert-layer` no sirve, porque el preflight está en la misma capa); el barrido se repite hasta dar 0. Lo que el barrido no lee (`::placeholder`, `::marker`, `::backdrop`) lo fijan los E2E de T033.
- **El tope:** si la lista pasa de 40 reglas o el subpresupuesto de 10 000 caracteres, se para y decide el usuario (riesgo 10 de la spec).

## C2. Las reglas globales a la capa base (FR-035)

En el orden de `styles.css`: el documento, la tipografía, los controles, `[hidden]`, el foco, el movimiento reducido, la impresión y el bloque de Go. Pasan a una capa más baja que la heredada, así que antes se borran las reglas de clase base sin usuarios (FR-036, con la evidencia de `rule-evidence`): con ellas todavía en `legacy`, una base con menos especificidad que una global le ganaría por capa (por ejemplo, `.button` contra `button:disabled`).

## C3. Los alias y FR-001

- **El conflicto.** FR-001 dice que las variables de la base, «los tokens de F10c y sus alias», conservan su valor; FR-036 borra los 13 alias en F15c. Chromium enumera las propiedades personalizadas, así que el barrido vería 13 propiedades menos en cada elemento.
- **Cómo lo resuelve el plan:** el barrido informa `removedTokens` por nombre (R9). En F15a y F15b tiene que estar vacía; en F15c, ser exactamente los 13 alias de F10c, y nada más. Va como hallazgo del analyze: la spec debería decir «salvo los alias que FR-036 borra».

## C4. Las excepciones al cerrar (FR-037, SC-004)

Quedan `frontend/src/app/main.css` y `frontend/src/shared/ui/code-editor/code-editor.css` (R3), más dentro de la entrada: `@source not inline('sr-only')` y `('visible')` (marcadores de la red congelada, R6), el bloque `<noscript>` de `index.html` y lo que React no dibuja (FR-033), cada uno con su motivo en el contrato.

## C5. SC-005 contra las familias del preflight

El preflight escribe las familias por omisión de Tailwind como respaldo literal (`ui-sans-serif, system-ui, …` en `html`, y `ui-monospace, …` en `code`), aunque el theme borre sus variables. SC-005 pide 0 valores de las fuentes por omisión en el CSS construido. Con Q2-B, el preflight trae ese texto. Es la decisión 2 del informe: el plan recomienda leer SC-005 sobre el theme y las utilidades, y dejar el preflight importado tal cual, con su texto contado en la lista del PR.

## Context7

El servidor `mcp__context7__*` agotó la cuota del mes; se usó el segundo (`mcp__44441c24-…`), el 2026-10-28. Ninguna librería tenía la documentación fijada a la versión del lockfile o de la spec, salvo Vite (8.0.10, la más cercana a 8.3.2) y Playwright (1.63.0).

| Librería | Versión | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Tailwind CSS | 4.3.3 (no instalada) | `/tailwindlabs/tailwindcss.com` (v4 del sitio, sin fijar) | El plugin de Vite | `tailwindcss()` en los plugins de `vite.config.ts`; Tailwind trae su propio `@import`, prefijos y transformación de sintaxis | Sí: los imports de las hojas pasan a CSS (R2) |
| Tailwind CSS | 4.3.3 | ídem | `@import` por partes, sin preflight | `@layer theme, base, components, utilities;` con `theme.css` y `utilities.css` en su capa; `source()` va en el de las utilidades y `theme(static)` en el del theme | Sí: la entrada de R2, con `legacy` y sin `components` |
| Tailwind CSS | 4.3.3 | ídem | `@layer` y el orden | El CSS sin capa le gana a toda capa; `@layer base` para lo base | Sí: la capa heredada y las excepciones del editor (R2, R3) |
| Tailwind CSS | 4.3.3 | ídem | `@theme static` y `--*: initial` | Por omisión sólo se emiten las variables usadas; `static` las emite todas; `--*: initial` borra el theme por omisión; el ejemplo de la documentación usa `--spacing: 4px` | Sí: R4 |
| Tailwind CSS | 4.3.3 | ídem | `source()` y `@source` | `source()` fija la base del escaneo; `@source` y `@source not` son relativos a la hoja; `@source not inline()` (v4.1) bloquea una utilidad | Sí: R5 y R6. La documentación no muestra globs en `@source not`: lo mide la sonda (S10) |
| Tailwind CSS | 4.3.3 | ídem | `@custom-variant hover` | `@custom-variant hover (&:hover);` devuelve el `:hover` con cualquier puntero; las variantes con `@media` van en forma de bloque con `@slot` | Sí: R7 |
| Tailwind CSS | 4.3.3 | ídem | `max-*` | `max-[600px]` y `max-sm` escriben `(width < X)` | Sí: no se usan (R7) |
| Tailwind CSS | 4.3.3 | ídem | `@reference` y `@apply` en hojas aparte | Una hoja procesada aparte necesita `@reference` para ver el theme; se recomienda usar las variables directamente | No: ninguna hoja usa `@apply` (las utilidades van en los componentes) |
| Tailwind CSS | 4.3.3 | ídem | `text-*` y el interlineado | `text-*` escribe `line-height: var(--text-*--line-height)` aunque la variable no exista; `text-(length:<var>)` y `text-[<valor>]` escriben sólo `font-size` | Sí: B3 y el check de R8. Contradice la spec (que suponía el interlineado sólo con la variable definida): hallazgo |
| Tailwind CSS | 4.3.3 | ídem | Los espacios de nombres | `--spacing-*`, `--container-*` (`max-w-*`), `--shadow-*`, `--font-weight-*`; `shadow-(<var>)` escribe `box-shadow: var(…)` | Sí: B3 |
| Vite | 8.3.2 | `/vitejs/vite/v8.0.10` | El CSS: `@import`, el minificador y su target | Vite inlinea `@import` con `postcss-import`; Lightning CSS minifica por omisión con `build.cssTarget` | No: el orden y la minificación final siguen siendo de Vite; S14 mide el paso de Tailwind |
| vite-plugin-singlefile | 2.3.3 | `/richardtallent/vite-plugin-singlefile` | Convivir con otro plugin de CSS | Corre con `enforce: 'post'` en `generateBundle` y reemplaza el `<link>` del CSS emitido por un `<style>`; fuerza `cssCodeSplit: false` | No: cualquier CSS que Vite emita viaja en el único `<style>` (S1 lo confirma) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `tap`, `hasTouch`, `hover` y `toHaveCSS` | `tap()` pide `hasTouch`; `toHaveCSS` acepta `pseudo: 'before' \| 'after'` | Sí: los E2E de B7 y el `::after` de `.step-check` del piloto |

Lo que no aplica, porque F15 no lo usa: React 19, Vitest (salvo la spec del orden, que ya existe), Testing Library, jsdom, fishery, Zustand, nuqs y React Hook Form.

## Mediciones de sólo lectura

- **`npm view`**, 2026-10-28: `tailwindcss` 4.3.3, MIT, 772 893 bytes; `@tailwindcss/vite` 4.3.3, MIT, 13 509 bytes, con `tailwindcss`, `@tailwindcss/node` y `@tailwindcss/oxide` 4.3.3 como dependencias. Iguales a la spec.
- **El lockfile:** `postcss` 8.5.28 y `lightningcss` 1.33.0 son dependencias de `vite` 8.3.2, no del proyecto (R8, R9).
- **`qa/lib/sources.ts`** empaqueta las fuentes con `loader: { '.css': 'empty' }`: los checks que empaquetan `main.tsx` no leen `main.css`.
- **`frontend/vitest.config.ts`** fusiona la configuración de Vite, así que Vitest también carga el plugin; Vitest no procesa CSS por omisión. T008 lo confirma con `npm test`.
- **El piloto** (`project.css`, 97 líneas, 22 reglas): sin `:hover`, `:focus`, `:active` ni transiciones propias; usa las clases base `page-heading`, `eyebrow`, `eyebrow-line`, `small-label`, `recommendation-strip`, `strip-icon` y `step-check`; su Page Object localiza `pre.terminal`.

## Mediciones de la implementación

Las escriben T001 (la línea base de F15a), T007 (la sonda), T017 (el peso del piloto) y T032 (la línea base de F15c). Hasta entonces valen la línea base de planificación y R15.
