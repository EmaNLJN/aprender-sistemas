# Implementation Plan: F15b · La migración por slice

**Branch**: `030-f15-tailwind` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F15, en su segunda parte: los requisitos *(F15b)* (FR-027 a FR-032), FR-014 (con F15a), FR-033 (con F15c) y los transversales (FR-001 a FR-008, FR-019 a FR-021 y FR-034), con SC-010 y los transversales (SC-001, SC-002, SC-005, SC-007 y SC-009). Decisiones: [research.md](./research.md) (B1 a B7, y R7 a R9 de F15a). Validación: [quickstart-f15b.md](./quickstart-f15b.md). Tareas: [tasks-f15b.md](./tasks-f15b.md). Contrato: [contracts/stylesheets-f15.md](./contracts/stylesheets-f15.md). Las otras partes: [plan.md](./plan.md) (F15a) y [plan-f15c.md](./plan-f15c.md).

**El objetivo:** que cada slice pase, en su propio PR, de su hoja a utilidades en sus componentes, con las clases base convertidas en componentes de `shared/ui` y su hoja borrada, sin que cambie lo que ve el alumno.

**La arquitectura:** una receta de seis pasos, igual para todos los slices, que abre con los E2E de lo que el barrido no ve y cierra con la hoja borrada de `main.css`, de `ENTRY_IMPORTS` y de `ALLOWED_SHEETS`. Proyecto es el piloto: su PR es el ejemplo entero de la receta y mide la relación de peso que fija el tope de los demás. Las reglas heredadas de las clases base quedan en `styles.css` hasta F15c; los elementos migrados conservan sólo las clases que la red congelada localiza, sin regla.

**El stack:** el de F15a: Tailwind CSS 4.3.3 con las variantes y el theme de `main.css`, React 19 con TSX, Vitest 5.0.3, Playwright 1.63.0 y las herramientas de `qa/e2e/style-compare/`.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», la receta (§1) entera, la «Review Focus» y la fila de tu slice (§3). El piloto (§2) es el ejemplo completo: cada paso de la receta tiene ahí su código.
> - **La base.** Cada PR corre sobre `master` con F15a y los slices anteriores de la tabla ya integrados. Las clases, las hojas y los marcadores de tu slice salen de su inventario (R1), no de este plan: el plan los proyecta sobre `master` (`bb480677`) y los planes de los ports.
> - **Un slice, un implementador.** El agente principal corre el barrido y la compuerta, integra `main.css`, `main-entry.spec.ts` y `qa/stylesheets-check.ts`, y abre el PR.

## Summary

- **Un PR por slice** (FR-027), en el orden de §3: el piloto, los tres slices de F11a, las páginas de menor a mayor hoja, el laboratorio y el shell.
- **Los E2E primero** (FR-028): `:hover`, el toque, `:focus-visible`, `:active`, `:checked`, las transiciones, los pseudoelementos y lo de adentro de un `<details>` abierto. En verde contra la base, con el Page Object, y no se editan después.
- **Las clases base a componentes** (FR-030): `PageHeading`, `Eyebrow`, `SmallLabel`, `RecommendationStrip`, `StepCheck` y los que siguen, en `shared/ui`, idénticos a la vista. El primer slice que usa una clase crea el componente; la regla heredada queda en `styles.css` hasta F15c (research.md, B4).
- **Las utilidades** (FR-029, FR-031): el token si existe; si no, la escala de `--spacing: 4px` cuando da el valor exacto; si no, el literal como valor arbitrario, contado como deuda. Las utilidades que Tailwind compone van como propiedad arbitraria (B3).
- **La hoja borrada,** con su `@import`, su línea de `ENTRY_IMPORTS` y la de `ALLOWED_SHEETS`, en el mismo commit.
- **Los marcadores** (B2): una clase que la red congelada localiza queda en el elemento, sin regla.
- **La compuerta de cada PR:** el barrido en 0 contra su base, el multiconjunto resuelto de lo que queda igual al de la base menos la hoja borrada, `style-output-check` en verde (con las colisiones) y el tamaño bajo el tope del slice.

## Technical Context

**Language/Version**: TSX (React 19) en los componentes; TypeScript en los E2E; CSS sólo en `main.css` (para lo que React no dibuja, FR-033). Node 24 y las versiones del lockfile.

**Primary Dependencies**: ninguna nueva (FR-034).

**Storage**: no aplica. Los E2E siembran y leen `localStorage` como los de la base.

**Testing**: los E2E nuevos de cada slice (`qa/e2e/specs/<slice>-style.spec.ts`), la red sin editar, `style-output-check`, `stylesheets-check`, `main-entry.spec.ts`, el barrido y el multiconjunto resuelto. Las specs de componente prueban comportamiento (el `onChange` de `StepCheck`, por ejemplo), no las cadenas de clases.

**Target Platform**: la de F15a.

**Project Type**: aplicación web (front React/TypeScript). Es un refactor de estilo por slice.

**Performance Goals**: ninguna. Cada PR informa `html.length` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: catorce PR más los de las pantallas que hayan entrado antes de F15a. El piloto toca `pages/project/ui/` (dos componentes y la hoja), crea cinco componentes en `shared/ui/` y un E2E.

## Restricciones globales

Valen para cada PR de F15b.

- **Nada visible cambia** (FR-001): el barrido contra la base del PR da `differences: 0` y `removedTokens: []`, con el control de determinismo en 0 antes; `newTokens` sólo con `--spacing` y las `--tw-*` que declara el dist de la rama.
- **La red sin editar** (FR-002), con los E2E nuevos del slice en verde contra la base primero (FR-028).
- **Los valores** (FR-031, Q3-A): token, escala de 4 px exacta o arbitrario con el literal de hoy. Cada PR cuenta sus valores arbitrarios (la cifra de `style-output-check`).
- **Las utilidades seguras** (B3): la propiedad de hoy con el valor de hoy y, como mucho, una `--tw-*` propia. Los tamaños de letra con `text-(length:--text-N)` o `text-[Npx]`, nunca `text-N`. Un color de borde de un solo lado con `border-t-<color>`, no `border-<color>`. Sombras, `transform`, transiciones y animaciones con la propiedad arbitraria.
- **Los anchos y el `:hover`** (FR-019, FR-020): las variantes `upto-*`, `from-*`, `print:`, `motion-safe:` y `motion-reduce:`, y `hover:` (con cualquier puntero). Ninguna condición nueva.
- **Las clases** (FR-021): completas en el código; las variantes de un componente, mapas de cadenas completas; una sola utilidad por propiedad en cada elemento.
- **Un elemento migrado** (FR-029) no lleva clases con regla heredada de su slice; conserva sólo los marcadores de su inventario.
- **Sin** `!`, estilos en línea, `clsx`, `tailwind-merge` ni CVA (FR-003, FR-005, FR-034).
- **`styles.css` no se edita en F15b**: las reglas de las clases base se borran en F15c (FR-036).
- **El tamaño** (FR-004): bajo `BOOT_SIZE_LIMIT` (1 500 000) y bajo el tope del slice que T017 escribe en research (`ceil(r × bytes de la hoja × 1,25)`, con piso de 500), y nunca más de **5 000** sin el permiso del usuario.
- **Los checks de cierre** (SC-009): `npm run build`, `npm test`, `npm run lint` (con el mismo total de avisos de complejidad que la base del PR), `npm run format:check`, `E2E_PORT=<puerto> npm run test:e2e` y `git diff --check`; la imagen web, con permiso.
- **Commits y PR:** en español los commits, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; el PR en inglés, con el título `refactor(<slice>): style the <slice> with Tailwind utilities and drop <hoja>` y la forma de quickstart-f15b.md §4.

## Constitution Check

*Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | La regla de cómo se estila la puso F15a en `AGENTS.md`; F15b la aplica. |
| II. TDD y pruebas útiles | Sí | Cada PR abre con los E2E de lo que el barrido no ve, en verde contra la base; los valores salen del texto de la hoja que se borra. |
| III. Código entendible | Sí | Un componente por clase base, con variantes en mapas de cadenas completas; ningún wrapper sin responsabilidad. |
| IV. Contenido en Git, IDs estables | Sí | No cambian ids ni textos; las clases que la red usa quedan como marcadores. |
| V. Capas y contratos explícitos | Sí | Los componentes de las clases base viven en `shared/ui`, con su `index.ts`; las páginas los importan por ahí. |
| VI. Español, accesibilidad y portabilidad | Sí | El foco, el teclado, el toque, el diseño móvil y el movimiento reducido los prueban el barrido y los E2E. |
| VII. Salidas generadas fuera de Git | Sí | Las copias y las salidas de las comparaciones viven en `$TMPDIR`. |
| VIII. Flow-forward | Sí | Una línea por tarea en `tasks-f15b.md`; los topes medidos van a research, no al plan. |

## Decisiones del usuario

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **Q1-A:** un PR por slice, con Proyecto de piloto | El orden de §3 y el piloto de §2 | §2, §3 |
| **Q3-A:** `--spacing: 4px`, tokens y arbitrarios contados | R4 de la receta y la cifra de `style-output-check` | §1 |
| **Q4-A:** sin prefijo | Las colisiones que aparezcan se resuelven con `@source not inline`, como en F15a | §1, R5 |
| **Q5-A:** sin hojas nuevas | Ningún PR suma un `.css`; `stylesheets-check` | Todo |
| **TR-13:** el texto en un nodo, el puntero fuera, los `<details>` cerrados sin comparar | R4 de la receta (template literals) y las herramientas de F15a | §1 |

## Project Structure

### Documentation (this feature)

Ver [plan.md](./plan.md). F15b escribe `plan-f15b.md`, `quickstart-f15b.md` y `tasks-f15b.md`; sus mediciones (el peso del piloto y los topes) van a research.md, «Mediciones de la implementación».

### Source Code (repository root), el piloto

```text
frontend/src/
├── app/
│   ├── main.css                                (T016) sin el @import de project.css
│   └── main-entry.spec.ts                      (T016) ENTRY_IMPORTS sin project.css
├── pages/project/ui/
│   ├── ProjectPage.tsx                         (T016) utilidades y los componentes de shared/ui
│   ├── MilestoneCard.tsx                       (T016) utilidades y StepCheck
│   └── project.css                             (T016) se borra
└── shared/ui/
    ├── eyebrow/Eyebrow.tsx + index.ts          (T016) nuevo
    ├── page-heading/PageHeading.tsx + index.ts (T016) nuevo
    ├── small-label/SmallLabel.tsx + index.ts   (T016) nuevo
    ├── recommendation-strip/RecommendationStrip.tsx + index.ts   (T016) nuevo
    └── step-check/StepCheck.tsx + StepCheck.spec.tsx + index.ts  (T016) nuevo
qa/
├── stylesheets-check.ts                        (T016) ALLOWED_SHEETS sin project.css
└── e2e/specs/project-style.spec.ts             (T015) nuevo
docs/architecture.md                            (T017, K) la fila de Proyecto
```

| Archivo | De qué se encarga |
| --- | --- |
| `shared/ui/eyebrow/Eyebrow.tsx` | El rótulo con la línea de las cabeceras (`.eyebrow`, `.eyebrow-line`) |
| `shared/ui/page-heading/PageHeading.tsx` | La cabecera de página: el rótulo, el título con su énfasis y la bajada (`.page-heading`) |
| `shared/ui/small-label/SmallLabel.tsx` | El rótulo chico en mayúsculas (`.small-label`), con su tono |
| `shared/ui/recommendation-strip/RecommendationStrip.tsx` | La franja de recomendación con su ícono (`.recommendation-strip`) |
| `shared/ui/step-check/StepCheck.tsx` | La casilla de un paso o un hito (`.step-check`), con el marcador `step-check` |
| `qa/e2e/specs/project-style.spec.ts` | El foco, la casilla marcada con su `::after` y la pista abierta de Proyecto |

## Review Focus

Lo que el revisor mira primero en cada PR:

- **El inventario del slice** (R1) contra el código: cada regla de la hoja tiene su utilidad o su motivo para no tenerla; cada clase base usada pasa por su componente; cada marcador queda.
- **Las utilidades seguras:** ningún `text-N`, ninguna sombra, `transform` o transición con la utilidad compuesta, ningún color de un lado con `border-<color>`, ninguna condición fuera de las variantes.
- **Las comparaciones:** el barrido en 0, con `newTokens` en la lista cerrada y `removedTokens` vacía; el multiconjunto resuelto igual a la base menos las tuplas de la hoja; las colisiones en 0.
- **El tamaño** contra el tope del slice.

**Lo que la spec implica y ninguna prueba de una tarea ejercita**, cada caso con la prueba que lo fija:

1. **Un estado que el barrido no ve cambia de aspecto:** la casilla marcada, su `::after` o una pista abierta en el piloto; un `:hover` o un foco en los demás. Lo fijan los E2E del slice, en verde contra la base antes de migrar (R2; T015 en el piloto).
2. **Una utilidad escribe una propiedad de más** (el interlineado de `text-N`, el color de los cuatro bordes con `border-<color>`, un `transform` partido en `translate`): el barrido la ve sólo en los estados de la grilla. Lo fijan `style-output-check` (el interlineado) y el barrido de la grilla entera, con los E2E del slice para el resto (R4, B3).
3. **Un marcador que se pierde rompe la red congelada** (`pre.terminal` en Proyecto, `.sr-only` en la Biblioteca): lo fija la red sin editar, que se corre entera en cada PR; el inventario los lista antes (R1).
4. **Una clase base migrada por un slice pierde su regla heredada para otro slice sin migrar:** F15b no edita `styles.css`, y el barrido de cada PR corre sobre la grilla entera, con todas las páginas (R5).
5. **El `:hover` deja de aplicar al tocar** si alguien quita la variante: el check estático de F15a lo fija; el primer slice con `:hover` corre una vez el control del toque (B7, R2).

## 1. La receta de un slice

Seis pasos, en tres commits: los E2E (R2), la migración (R3 y R4) y el cierre (R6). R1 y R5 no se commitean: van a la descripción del PR.

### R1 · El inventario (K, sin commit)

Sobre la base del PR, con su copia en `$TMPDIR/f15b-<slice>/base` (quickstart-f15b.md §1):

1. **Las reglas de la hoja,** con sus dueños: `node qa/e2e/style-compare/rule-evidence.ts . <hoja> > "$TMPDIR/f15b-<slice>/sheet.tsv"`. Cada fila es una regla que el slice tiene que reproducir con utilidades. Una fila `orphan` (ningún estado la usa y ninguna fuente nombra sus clases) no se migra: se lista en el PR con su evidencia.
2. **Las clases base que usa el slice:** `node qa/e2e/style-compare/rule-evidence.ts . frontend/styles.css > "$TMPDIR/f15b-<slice>/base.tsv"` y las filas `base` cuyo dueño medido incluye el slice. Cada una pasa por su componente de `shared/ui` (B4): se reusa si existe, o se crea.
3. **Los marcadores:** `grep -rnoE "locator\(['\"\`][^'\"\`]*|toHaveClass\([^)]*" qa/e2e | grep -oE '\.[A-Za-z][\w-]*'` y las clases que nombra cada resultado; los del slice son las clases que aparecen en sus componentes. Cada uno queda en su elemento.
4. **Los `!important` que tocan el slice:** `grep -n '!important' <hoja> frontend/styles.css`. Uno de la hoja del slice pasa a una utilidad sin `!` (después de migrar, ninguna regla heredada compite con ella); uno de `styles.css` que alcanza al elemento migrado sigue alcanzándolo y no se toca.
5. **Lo que el barrido no ve:** las reglas de la hoja con `:hover`, `:focus`, `:focus-visible`, `:focus-within`, `:active`, `:checked`, `:disabled`, `transition`, `animation`, `::before`, `::after`, `::placeholder`, y las que estilan lo de adentro de un `<details>`. Cada una tiene su E2E en R2.
6. **Las condiciones de `@media`** de la hoja: cada una tiene su variante (F15a, T010). Una condición sin variante se para: es una condición nueva.
7. **Lo que React no dibuja** (FR-033): una regla cuyo sujeto está en `index.html` (el `<noscript>`), en el `<canvas>` de la celebración o en el DOM de CodeMirror. Las del editor ya están en `code-editor.css` (F15a); las otras pasan a un bloque `@layer base { … }` de `main.css`, sin cambios.
8. **Los estados de la grilla:** si una regla de la hoja no tiene ningún estado en la grilla que la use (la columna `states` en 0) pero alguna fuente la dibuja, se suma el estado a `qa/e2e/style-compare/grid.ts` antes de comparar, en el commit de R2.

### R2 · Los E2E primero (FR-028)

**Archivos:** `qa/e2e/specs/<slice>-style.spec.ts` (nuevo), el Page Object del slice si le falta un localizador, y `grid.ts` si R1 sumó un estado.

- **Uno por cada estado de R1, paso 5,** con `toHaveCSS` y el valor del texto de la hoja (o de `styles.css`, si la regla es global o base). Los localizadores, por rol y nombre en la spec; una clase sólo dentro del Page Object.
- **Las formas:**
  - **`:hover`:** `await locator.hover();` y `toHaveCSS`. Ejemplo del shell, contra `.navigation a:hover { background: #e4e6dc }`:

    ```ts
    test('a menu link that is not the current page takes the hover background', async ({ shell, page }) => {
      await shell.goto(urls.view('recorrido'));
      const link = page.getByRole('navigation').getByRole('link', { name: /Biblioteca/ });
      await link.hover();
      await expect(link).toHaveCSS('background-color', 'rgb(228, 230, 220)');
    });
    ```

  - **El toque:** un `describe` con `test.use({ hasTouch: true, isMobile: true });` y `await locator.tap();`, sobre un elemento cuyo toque no navega ni dispara una acción externa (si todos lo hacen, la prueba intercepta la acción con `page.route`). Va en verde contra la base: si no, el elemento no sirve y se elige otro.
  - **`:focus-visible`:** el foco con el teclado (`locator.focus()` en el elemento anterior y `page.keyboard.press('Tab')`), y el contorno de hoy: `outline-style: solid`, `outline-width: 3px`, `outline-color: rgb(172, 72, 41)` (el acento de Rust) y `outline-offset: 4px`.
  - **`:checked` y los pseudoelementos:** la acción y `toHaveCSS(…, { pseudo: 'after' })`.
  - **Las transiciones:** `transition-property` y `transition-duration` del elemento, con el movimiento reducido apagado (`test.use({ reducedMotion: 'no-preference' })`) y encendido (`'reduce'`, donde la regla global da `none`).
  - **Lo de adentro de un `<details>`:** abrirlo con un clic en su `<summary>` y medir.
- **Correr:** `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/<slice>-style.spec.ts`, en verde contra la base. Después, la red entera.
- **El control del toque,** una vez, en el primer slice de la tabla con `:hover` (B7): en una copia de la rama, sin `@custom-variant hover (&:hover);`, `npm run build` y la prueba del toque: tiene que dar rojo. Si da verde, el check estático de F15a es la única guarda, y se anota en el PR.
- **Commit:** `test(e2e): lo que el barrido no ve de <slice>, en verde contra la base`.

### R3 · Las clases base a componentes (FR-030)

- **Si el componente no existe,** el slice lo crea en `frontend/src/shared/ui/<nombre>/<Nombre>.tsx`, con `const`, `export default` al final y un `index.ts` con `export { default as <Nombre> } from './<Nombre>';`. Sus utilidades reproducen la regla base y sus variantes de `@media` (la regla de `styles.css` y las de los bloques de 1 150 y 590 px que la nombran).
- **Las variantes** son mapas de cadenas completas (`const TONES = { muted: 'text-muted', … } as const`), y `className` suma sólo propiedades que el componente no fija. Una variante que necesita otro slice la suma ese slice, en su PR.
- **Si el componente necesita un marcador** (la red localiza la clase base, como `.button` o `.sr-only`, o un `:not()` global la nombra, como `.step-check`), lo lleva siempre. Mientras la regla heredada exista, también alcanza al elemento migrado, debajo de sus utilidades: el componente fija con utilidades todas las propiedades de la regla, así que la regla no agrega nada (B2).
- **Una spec de componente** sólo si tiene comportamiento (un `onChange`, un estado); no se prueban las cadenas de clases.

### R4 · Las utilidades y la hoja borrada (FR-029, FR-031, FR-032)

- **Por cada elemento,** las utilidades reproducen las declaraciones de la hoja del slice que hoy ganan en ese elemento, en cada contexto (cada ancho, la impresión, cada estado), y nada más. Una declaración del slice que hoy pierde contra otra hoja no se copia.
- **Los valores:** token (`bg-ink`, `text-accent`, `font-mono`, `font-500`, `border-check-line`); si no, la escala cuando es exacta (`p-5`, `gap-3`, `ml-8`); si no, el literal (`p-[30px]`, `rounded-[7px]`, `text-[#c2cabc]`). Un atajo con valores mezclados (`margin: 10px 0 0 32px`) se parte en sus lados (`mt-[10px] mr-0 mb-0 ml-8`).
- **Las trampas** (research.md, B3), con la forma que se usa:

  | Hoy | No | Sí |
  | --- | --- | --- |
  | `font-size: 12px` | `text-12` | `text-(length:--text-12)` |
  | `font-size: 28px` (sin token) | — | `text-[28px]` |
  | `border-top: 1px solid var(--line)` | `border-t border-line` | `border-t border-t-line` |
  | `box-shadow: 0 20px 90px #20282033` | `shadow-dialog` | `shadow-(--shadow-dialog)` |
  | `transform: translateY(-3px)` | `-translate-y-[3px]` | `[transform:translateY(-3px)]` |
  | `transition: opacity 0.2s, transform 0.2s` | `transition`, `duration-200` | `[transition:opacity_0.2s,transform_0.2s]` |
  | `animation: lab-spin 0.8s linear infinite` | `animate-spin` | `[animation:lab-spin_0.8s_linear_infinite]`, con el `@keyframes` en `main.css` |
  | `grid-template-columns: 1fr 1fr` | `grid-cols-2` | `grid-cols-[1fr_1fr]` |
  | `border-radius: 50%` | `rounded-full` | `rounded-[50%]` |
  | `.parent strong { … }` | otra clase en cada hijo de otro dueño | `[&_strong]:…` en el padre |
  | `a[aria-current='page']` | — | `aria-[current=page]:…` |
  | `@media (max-width: 590px)` | `max-[590px]:`, `sm:` | `upto-590:` |

  Un `@keyframes` del slice pasa sin cambios a `main.css`, después del `@theme`, y el elemento usa `[animation:…]`.
- **El texto de un elemento en un solo nodo** (TR-13): un template literal, como hoy.
- **La hoja:**
  - se borra el archivo;
  - en `main.css`, su línea `@import '…' layer(legacy);`;
  - en `main-entry.spec.ts`, su línea de `ENTRY_IMPORTS`;
  - en `qa/stylesheets-check.ts`, su línea de `ALLOWED_SHEETS`.
- **Una colisión nueva** (`style-output-check` en rojo en `assertNoCollisions`): una utilidad del slice comparte nombre con una clase de otra hoja heredada o con un marcador. Se usa otra forma de la utilidad o, si no hay, se excluye con `@source not inline('<clase>')` en `main.css`, con su motivo.
- **Commit:** `refactor(<slice>): <slice> se estila con utilidades y su hoja se va`.

### R5 · Las comparaciones (K, sin commit)

Contra la copia de la base del PR (quickstart-f15b.md §2):

1. el control de determinismo de la base, en 0;
2. el barrido, la grilla entera: `differences: 0`, `removedTokens: []`, `newTokens` en la lista cerrada;
3. el multiconjunto resuelto: `onlyBase` igual a las tuplas de la hoja borrada (las de la base con el selector en esa hoja) y `onlyUnit: 0`. El conteo de las tuplas de la hoja sale de quickstart-f15b.md §2, paso 3;
4. `node qa/style-output-check.ts`: verde, con la cantidad de utilidades y de valores arbitrarios;
5. el tamaño: `chars` antes y después, bajo el tope del slice.

Una diferencia del barrido se explica con sus propiedades y se corrige en la utilidad del elemento, nunca en el script.

### R6 · El cierre del PR (K)

- **La documentación** (FR-008): la fila del slice en `docs/architecture.md` deja de nombrar su hoja y nombra los componentes de `shared/ui` que creó.
- **La deuda:** la cantidad de valores arbitrarios que suma el PR (la cifra de `style-output-check` contra la de su base).
- **Los checks de cierre** y la imagen web, con permiso.
- **Commit** (si hubo documentación): `docs(front): <slice> sin hoja propia`.
- **El PR**, con la forma de quickstart-f15b.md §4.

## 2. El piloto: Proyecto (T014 a T017)

La hoja más chica (97 líneas en `master`, 22 reglas, sin `:hover`, foco, `:active` ni transiciones propias). Usa las clases base `page-heading`, `eyebrow`, `eyebrow-line`, `small-label`, `recommendation-strip` y `step-check`, y su Page Object localiza `pre.terminal`.

### T014 · El inventario del piloto (K)

R1 sobre `frontend/src/pages/project/ui/project.css`. Lo esperado, medido en `master`:

| Qué | Resultado esperado |
| --- | --- |
| Reglas de la hoja | Las 22, todas del slice; ninguna `orphan` |
| Clases base | `.page-heading` (y `h1`, `h1 em`, `p`, con 590 px), `.eyebrow` y `.eyebrow-line` (con la regla compartida de `.small-label, .eyebrow`), `.small-label`, `.recommendation-strip` (y `.strip-icon`, `p` y `strong`, con 590 px) y `.step-check` (con `:checked` y `:checked:after`) |
| Marcadores | `terminal` (`#main pre.terminal`); `step-check` (lo nombra `input[type='checkbox']:not(.step-check)`) |
| `!important` | Ninguno que alcance al slice |
| Lo que el barrido no ve | El foco de la casilla y del `<summary>` (reglas globales), la casilla marcada con su `::after`, y la pista abierta (`.milestone details p`) |
| Condiciones | `(max-width: 590px)` y `print`: `upto-590:` y `print:` |
| Lo que React no dibuja | Nada |

Si la base trae otra cosa, mandan sus resultados. Se anota en la descripción del PR.

### T015 · Los E2E del piloto (R2)

**Archivos:** `qa/e2e/specs/project-style.spec.ts` (nuevo).

**Consume:** los fixtures `shell` y `project` de `qa/e2e/fixtures`, `ProjectPage.milestone(title)`, `hintToggle(title)`, `hint(title)` y `hintText(title)`, y `urls.view`.

```ts
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

const FIRST = 'Un lugar para guardar cosas';
const ACCENT = 'rgb(172, 72, 41)';
const GREEN = 'rgb(56, 97, 74)';
const CHECK_LINE = 'rgb(185, 191, 174)';

test.describe('the project page, where the style sweep does not look', () => {
  test('a milestone check shows the focus ring when the keyboard reaches it', async ({
    shell,
    project,
    page,
  }) => {
    await shell.goto(urls.view('proyecto'));
    const check = project.milestone(FIRST);
    await check.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(check).toBeFocused();
    await expect(check).toHaveCSS('outline-style', 'solid');
    await expect(check).toHaveCSS('outline-width', '3px');
    await expect(check).toHaveCSS('outline-color', ACCENT);
    await expect(check).toHaveCSS('outline-offset', '4px');
  });

  test('a completed milestone fills its check and draws the tick', async ({ shell, project }) => {
    await shell.goto(urls.view('proyecto'));
    const check = project.milestone(FIRST);
    await expect(check).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(check).toHaveCSS('border-top-color', CHECK_LINE);

    await check.check();

    await expect(check).toHaveCSS('background-color', GREEN);
    await expect(check).toHaveCSS('border-top-color', GREEN);
    await expect(check).toHaveCSS('content', '"✓"', { pseudo: 'after' });
    await expect(check).toHaveCSS('color', 'rgb(255, 255, 255)', { pseudo: 'after' });
    await expect(check).toHaveCSS('font-size', '12px', { pseudo: 'after' });
    await expect(check).toHaveCSS('line-height', '16px', { pseudo: 'after' });
    await expect(check).toHaveCSS('text-align', 'center', { pseudo: 'after' });
  });

  test('an open hint lines its text up with the card', async ({ shell, project }) => {
    await shell.goto(urls.view('proyecto'));
    await project.hintToggle(FIRST).click();

    await expect(project.hint(FIRST)).toHaveAttribute('open', '');
    await expect(project.hintText(FIRST)).toHaveCSS('margin-top', '10px');
    await expect(project.hintText(FIRST)).toHaveCSS('margin-left', '0px');
    await expect(project.hintText(FIRST)).toHaveCSS('font-size', '12px');
  });

  test('the hint toggle keeps the accent and shows the focus ring', async ({
    shell,
    project,
    page,
  }) => {
    await shell.goto(urls.view('proyecto'));
    const toggle = project.hintToggle(FIRST);
    await expect(toggle).toHaveCSS('color', ACCENT);
    await expect(toggle).toHaveCSS('cursor', 'pointer');

    await project.milestone(FIRST).focus();
    await page.keyboard.press('Tab');

    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS('outline-width', '3px');
    await expect(toggle).toHaveCSS('outline-color', ACCENT);
  });
});
```

1. **Correr:** `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/project-style.spec.ts`: 4 de 4 en verde contra la base. Después, la red entera.
2. **La prueba de que detectan algo,** una vez y sin commitear: en una copia, se borra `.step-check:checked:after` de `styles.css`, `npm run build` y la spec: tiene que fallar la segunda.
3. **Checks:** `npx prettier --check qa/e2e/specs/project-style.spec.ts`, `npm run lint` y `git diff --check`.
4. **Commit:** `test(e2e): el foco, la casilla marcada y la pista abierta de Proyecto, en verde contra la base`.

### T016 · Los componentes, las utilidades y la hoja borrada (R3 y R4)

**Archivos:** los cinco componentes de `frontend/src/shared/ui/` con su `index.ts`, `StepCheck.spec.tsx`, `ProjectPage.tsx`, `MilestoneCard.tsx`, `project.css` (se borra), `main.css`, `main-entry.spec.ts` y `qa/stylesheets-check.ts`.

**Produce:** `Eyebrow({ children })`, `PageHeading({ eyebrow, title, lead })`, `SmallLabel({ children, tone?, className? })`, `RecommendationStrip({ icon, children })` y `StepCheck({ label, checked, onChange })`, cada uno con su `index.ts`.

1. **`shared/ui/eyebrow/Eyebrow.tsx`** (`.small-label, .eyebrow`, `.eyebrow` y `.eyebrow-line`):

   ```tsx
   import type { ReactNode } from 'react';

   interface EyebrowProps {
     children: ReactNode;
   }

   const Eyebrow = ({ children }: EyebrowProps) => (
     <div className="mb-[18px] flex items-center gap-[9px] font-mono text-(length:--text-10) font-500 tracking-[1.4px] text-accent">
       <span className="h-px w-[22px] bg-current"></span>
       {children}
     </div>
   );

   export default Eyebrow;
   ```

2. **`shared/ui/page-heading/PageHeading.tsx`** (`.page-heading`, `h1`, `h1 em` y `p`, con sus reglas de 590 px):

   ```tsx
   import type { ReactNode } from 'react';
   import { Eyebrow } from '../eyebrow';

   interface PageHeadingProps {
     eyebrow: string;
     title: ReactNode;
     lead: ReactNode;
   }

   const PageHeading = ({ eyebrow, title, lead }: PageHeadingProps) => (
     <div className="mb-[30px] max-w-[750px]">
       <Eyebrow>{eyebrow}</Eyebrow>
       <h1 className="mx-0 mt-0 mb-4 text-(length:--text-48) tracking-[-2px] upto-590:text-(length:--text-40) [&_em]:font-serif [&_em]:font-400 [&_em]:text-accent">
         {title}
       </h1>
       <p className="max-w-[590px] text-(length:--text-13) leading-[1.8] upto-590:text-(length:--text-12)">
         {lead}
       </p>
     </div>
   );

   export default PageHeading;
   ```

3. **`shared/ui/small-label/SmallLabel.tsx`** (`.small-label, .eyebrow` y `.small-label`). `tone="none"` deja el color a quien lo usa, por `className`:

   ```tsx
   import type { ReactNode } from 'react';

   const TONES = {
     muted: 'text-muted',
     accent: 'text-accent',
     green: 'text-green',
     none: '',
   } as const;

   interface SmallLabelProps {
     children: ReactNode;
     tone?: keyof typeof TONES;
     className?: string;
   }

   const SmallLabel = ({ children, tone = 'muted', className = '' }: SmallLabelProps) => (
     <span
       className={['font-mono text-(length:--text-10) font-500 tracking-[1.4px]', TONES[tone], className]
         .filter((part) => part !== '')
         .join(' ')}
     >
       {children}
     </span>
   );

   export default SmallLabel;
   ```

4. **`shared/ui/recommendation-strip/RecommendationStrip.tsx`** (`.recommendation-strip`, `.strip-icon`, `p` y `strong`, con 590 px):

   ```tsx
   import type { ReactNode } from 'react';

   interface RecommendationStripProps {
     icon: string;
     children: ReactNode;
   }

   const RecommendationStrip = ({ icon, children }: RecommendationStripProps) => (
     <div className="mt-[26px] flex items-start gap-5 border-t border-t-line px-0 py-5 upto-590:gap-[13px]">
       <span
         className="font-serif text-(length:--text-31) leading-[1] text-accent italic"
         aria-hidden="true"
       >
         {icon}
       </span>
       <p className="m-0 text-(length:--text-12) leading-[1.8] upto-590:text-(length:--text-11) [&_strong]:font-550 [&_strong]:text-ink">
         {children}
       </p>
     </div>
   );

   export default RecommendationStrip;
   ```

5. **`shared/ui/step-check/StepCheck.tsx`** (`.step-check`, `:checked` y `:checked:after`). Lleva el marcador `step-check`: la regla global `input[type='checkbox']:not(.step-check)` le daría el `accent-color` sin él:

   ```tsx
   interface StepCheckProps {
     label: string;
     checked: boolean;
     onChange: () => void;
   }

   const StepCheck = ({ label, checked, onChange }: StepCheckProps) => (
     <input
       className="step-check m-0 h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-[4px] border border-check-line bg-transparent checked:border-green checked:bg-green checked:after:block checked:after:text-center checked:after:text-(length:--text-12) checked:after:leading-[16px] checked:after:text-white checked:after:content-['✓']"
       type="checkbox"
       aria-label={label}
       checked={checked}
       onChange={onChange}
     />
   );

   export default StepCheck;
   ```

6. **Los `index.ts`**, uno por carpeta, con esta forma:

   ```ts
   export { default as StepCheck } from './StepCheck';
   ```

7. **`StepCheck.spec.tsx`** (proyecto `dom`), lo único con comportamiento:

   ```tsx
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { describe, expect, it, vi } from 'vitest';
   import StepCheck from './StepCheck';

   describe('StepCheck', () => {
     it('is a checkbox named by its label that reports a click', async () => {
       const user = userEvent.setup();
       const onChange = vi.fn();
       render(<StepCheck label="Completar hito: Uno" checked={false} onChange={onChange} />);

       await user.click(screen.getByRole('checkbox', { name: 'Completar hito: Uno' }));

       expect(onChange).toHaveBeenCalledTimes(1);
     });

     it('shows the state it receives', () => {
       render(<StepCheck label="Completar hito: Uno" checked onChange={() => {}} />);

       expect(screen.getByRole('checkbox', { name: 'Completar hito: Uno' })).toBeChecked();
     });
   });
   ```

   Primero en rojo: con `const StepCheck: FunctionComponent<StepCheckProps> = () => { throw new Error('not implemented'); };` (TR-2), `npx vitest run --config frontend/vitest.config.ts --project dom StepCheck` falla con `not implemented`; después, el componente del paso 5.
8. **`MilestoneCard.tsx`** (`.milestone`, `.milestone-head`, `.milestone-head h2`, `.milestone p`, `.milestone details`, `.milestone summary` y `.milestone details p`, con 590 px e impresión):

   ```tsx
   import { StepCheck } from '../../../shared/ui/step-check';
   import type { MilestoneView } from '../model/project-progress';

   interface MilestoneCardProps {
     milestone: MilestoneView;
     onToggle: () => void;
   }

   const MilestoneCard = ({ milestone, onToggle }: MilestoneCardProps) => (
     <article className="rounded-[6px] border border-line bg-surface p-[22px] upto-590:p-[19px] print:break-inside-avoid">
       <div className="flex items-center gap-[14px]">
         <StepCheck
           label={`Completar hito: ${milestone.title}`}
           checked={milestone.completed}
           onChange={onToggle}
         />
         <h2 className="m-0 text-[19px] tracking-[-0.5px] upto-590:text-[17px]">{milestone.heading}</h2>
       </div>
       <p className="mt-[10px] mr-0 mb-0 ml-8 text-(length:--text-12)">{milestone.task}</p>
       <p className="mt-[10px] mr-0 mb-0 ml-8 text-(length:--text-12)">
         <strong>Está listo cuando:</strong>
         {` ${milestone.doneWhen}`}
       </p>
       <details className="mt-3 mr-0 mb-0 ml-8 text-(length:--text-12)">
         <summary className="cursor-pointer text-accent">Necesito una pista</summary>
         <p className="mt-[10px] mr-0 mb-0 ml-0 text-(length:--text-12)">{milestone.hint}</p>
       </details>
     </article>
   );

   export default MilestoneCard;
   ```

9. **`ProjectPage.tsx`:** los imports de `PageHeading`, `RecommendationStrip` y `SmallLabel` desde sus `index.ts`, y el `return` (la lógica de arriba no cambia):

   ```tsx
   return (
     <>
       <PageHeading
         eyebrow=" UNA IDEA QUE CRECE CON VOS"
         title={
           <>
             {'De una función'}
             <br />
             {'a '}
             <em>tu propio sistema.</em>
           </>
         }
         lead={`Un pequeño almacén clave-valor en ${languageName}. Cada capacidad te da una razón para aprender el siguiente concepto. El proyecto tiene su propio avance: los ejercicios del recorrido lo preparan.`}
       />
       <div className="mb-[30px] grid grid-cols-[1fr_1fr] gap-[30px] rounded-[7px] bg-ink p-[30px] text-surface upto-590:grid-cols-[1fr] upto-590:gap-[5px] upto-590:p-6">
         <div>
           <SmallLabel tone="none" className="mb-[15px] block text-[#c2cabc]">
             {`PROYECTO PERSONAL · ${completedCount} / ${milestones.length} HITOS`}
           </SmallLabel>
           <h2 className="mb-[14px] text-[28px] upto-590:text-[25px]">Tu primer taller de datos.</h2>
           <p className="text-(length:--text-13) text-[#c2cabc]">
             {
               'Empezá en memoria. Sumá comandos, archivos, mediciones y, cuando estés listo, una conexión por red.'
             }
           </p>
         </div>
         <pre className="terminal m-0 self-center rounded-[5px] bg-[#1d241f] p-5 font-mono text-(length:--text-12) leading-[2] whitespace-pre-wrap text-[#c9d5c0] upto-590:text-(length:--text-11)">
           <span className="text-[#e5b07d]">&gt;</span>
           {' SET curiosidad encendida\nOK\n'}
           <span className="text-[#e5b07d]">&gt;</span>
           {' GET curiosidad\nencendida\n'}
           <span className="text-[#e5b07d]">&gt;</span>
           {' _'}
         </pre>
       </div>
       <div className="grid gap-3">
         {milestones.map((milestone) => (
           <MilestoneCard
             key={milestone.id}
             milestone={milestone}
             onToggle={() => routeStore.toggleMark('milestones', milestone.id)}
           />
         ))}
       </div>
       <RecommendationStrip icon="↗">
         <strong>¿Preferís un reto con tests externos?</strong>
         <br />
         {
           'CodeCrafters propone construir una shell o un servidor HTTP. Protohackers prueba tus servidores de protocolos. '
         }
         <a href="#biblioteca">Encontralos en la biblioteca</a>
         {'.'}
       </RecommendationStrip>
     </>
   );
   ```

   Si la base trae otro marcado o otros textos, se conservan los de la base y sólo cambian las clases.
10. **La hoja:** `git rm frontend/src/pages/project/ui/project.css`; en `main.css`, la línea `@import '../pages/project/ui/project.css' layer(legacy);`; en `main-entry.spec.ts`, `"'../pages/project/ui/project.css' layer(legacy)",`; en `qa/stylesheets-check.ts`, `'frontend/src/pages/project/ui/project.css',`.
11. **Correr:** `npm run build`, `npm test` (`style-output-check`, `stylesheets-check` y `main-entry.spec.ts` en verde), `npm run lint`, `npm run format:check` y `E2E_PORT=4193 npm run test:e2e` (la red entera, con las cuatro de T015 sin editar).
12. **Commit:** `refactor(project): Proyecto se estila con utilidades y project.css se va`.

### T017 · Las comparaciones, el peso y el PR del piloto (K)

1. **R5:** el control de determinismo; el barrido de la grilla entera (con `newTokens` en la lista cerrada; se esperan `--tw-border-style`, `--tw-leading`, `--tw-tracking`, `--tw-font-weight` y `--tw-content`, según lo que declare el dist); el multiconjunto resuelto con `onlyBase` igual a las tuplas de `project.css`; `style-output-check`.
2. **El peso** (research.md, B5; quickstart-f15b.md §3): los bytes de `project.css` en el `<style>` de la base, el `Δchars` del PR y `r`. Con `r`, el tope de cada fila de §3: `ceil(r × bytes de su hoja × 1,25)`, con piso de 500 y techo de 5 000 sin permiso. Los bytes de cada hoja se miden en la base del piloto con el mismo comando. La tabla va a research.md, «Mediciones de la implementación», en un commit `docs(specs): el peso del piloto de F15b y el tope de cada slice`.
3. **R6:** `docs/architecture.md` (la fila de Proyecto deja de nombrar `project.css` y nombra los cinco componentes de `shared/ui`), los checks de cierre, la imagen web con permiso, y el PR: `refactor(project): style the Project page with Tailwind utilities and drop project.css`.

**Compuerta del piloto:** los E2E de T015 sin editar, la red en verde, el barrido en 0, el multiconjunto resuelto igual a la base menos `project.css`, las colisiones en 0 y el peso medido, con los topes escritos.

## 3. Los slices restantes (T018 a T031)

Cada fila aplica la receta entera (R1 a R6) en su PR, con la base de la fila anterior ya integrada. El tope de tamaño de cada una es el que escribió T017; si prevé más de 5 000, el PR pide permiso antes de empezar (B5). Los marcadores y las clases base son los de `master` y los planes de los ports: manda el inventario.

| Orden | Tarea | Slice | Hoja (ruta de la base) | Lo particular | Clases base (crea · reusa) | Marcadores conocidos |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | T018 | `shared/ui/form` | `shared/ui/form/form.css` | Los formularios de F11a (ingreso, alta, restablecimiento); los estados `sign-in` y `session-error` de la grilla | Crea `FieldLabel` (`.field-label`) | Los del inventario |
| 3 | T019 | `entities/privacy-notice` | `entities/privacy-notice/ui/privacy-notice.css` | El aviso de privacidad; si la grilla no lo dibuja, R1 suma su estado | — | Los del inventario |
| 4 | T020 | `features/sign-in` | `features/sign-in/ui/access.css` | La pantalla de ingreso; se espera el primer `.button` | Crea `Button` (`.button`, `.secondary`, `.small` y `.dark`, con sus `:hover`), con el marcador `button` | `button` (`css-contract`) |
| 5 | T021 | `pages/account` | `pages/account/ui/account.css` | «Tu cuenta» (`.topbar-actions`, `.account-entry*`); «Salir» usa `.button.dark`, que vive en la hoja del shell hasta T030 | Reusa `Button` (`dark`) | Los del inventario |
| 6 | T022 | `pages/admin` | `pages/admin/ui/admin.css` | La administración (estado `admin`); las tablas y el grupo «Acciones sobre {nombre}» | Reusa `Button` | Los del inventario |
| 7 | T023 | Método | `pages/method/ui/method.css` | El diálogo de confirmación; las notas; el primer slice con `:hover` (`.button.secondary:hover`) corre el control del toque (R2) | Crea `TextButton`, `NoteState`, `DialogContent` y `DialogActions`; reusa `PageHeading`, `FieldLabel` y `Button` | Los del inventario |
| 8 | T024 | Biblioteca | `pages/library/ui/library.css` | Los filtros con nuqs; `.resource-link:hover`; el estado `library-empty` | Crea `Pill`, `SearchField`, `EmptyState` y `VisuallyHidden` (marcador `sr-only`); reusa `PageHeading` | `sr-only` (`css-contract`, R5) |
| 9 | T025 | Recorrido | `pages/route/ui/route.css` | Los módulos en `<details>` (E2E con un módulo abierto); `.step-check:checked + .step-title` (`StepCheck` suma `peer` y el título, `peer-checked:text-green`); `#quiz-feedback:empty` (`empty:`); el diálogo de la lección; `.hero .eyebrow` y los `.small-label` en contexto (variantes nuevas) | Reusa `StepCheck`, `RecommendationStrip`, `SmallLabel`, `Eyebrow`, `Pill`, `TextButton` y los del diálogo | Los del inventario |
| 10 | T026 | Atlas | `pages/atlas/ui/atlas.css` | Cinco `:hover`; siete bloques de `@media` | Reusa `Eyebrow` | Los del inventario |
| 11 | T027 | Sistemas | `pages/systems/ui/systems.css` | El `style` de React del SVG queda (F5-Q2); `.sys-trace li` | Crea `LabEmpty` (marcador `lab-empty`); reusa `NoteState`, `SmallLabel` y `Button` (`small`) | `sys-trace`, `lab-empty` (`css-contract`, R9) |
| 12 | T028 | Campaña | `pages/campaign/ui/campaign-page.css` | `.world-node` con su transición (E2E con el movimiento reducido); el `<canvas>` de la celebración (FR-033) | Reusa `SmallLabel` y `Button` (`small`) | `world-node`, `button` |
| 13 | T029 | Laboratorio | `pages/lab/ui/quest-explorers.css`, `lab-page.css` y `lab.css` | La hoja más grande; las dos reglas de `.cm-enhanced` que quedaron en la capa (el envoltorio) migran, y `code-editor.css` no se toca; `.editor-shell:focus-within`; `@keyframes` del spinner a `main.css`; si prevé más de 5 000, el permiso ofrece partirlo por hoja | Reusa `SearchField`, `FieldLabel`, `NoteState`, `TextButton`, los del diálogo, `LabEmpty`, `VisuallyHidden`, `SmallLabel` y `Button` | `quest-banner`, `quest-lab-context`, `quest-direct-lock`, `lab-spinner`, `button` |
| 14 | T030 | Shell | `app/shell/shell.css` | Aparece en todos los estados; `.noscript` (en `index.html`) pasa a `@layer base` de `main.css` (FR-033); el toast conserva `visible` y su `id`; `aria-[current=page]:`; el ejemplo de `:hover` de R2 | Reusa `SmallLabel`, `Button` (`dark`) y `TextButton` | `lab-nav-count`, `navigation`, `nav-count`, `nav-symbol`, `sidebar`, `sidebar-bottom`, `visible` |
| — | T031 | Las pantallas que entraron antes de F15a (F11b, F11c, F12b, F13 o F14) | La hoja de cada una | Cada una en su lugar de la tabla según el tamaño de su hoja, con su propia tarea `T031` y el nombre de la pantalla | Las del inventario | Los del inventario |

**La compuerta de cada fila:** la del piloto (T017), con el tope de su fila. **Al terminar la tabla,** `qa/stylesheets-check.ts` lista `main.css`, `styles.css` y `code-editor.css`, y `main.css` importa en `legacy` sólo `styles.css`: es la base de F15c.

## Cobertura de requisitos

| Requisito | Tareas | Cómo |
| --- | --- | --- |
| FR-001 | T017 y cada fila (R5) | El barrido en 0 sobre la grilla entera, con `newTokens` en la lista cerrada y `removedTokens` vacía |
| FR-002 | T015, T016 y cada fila | La red entera sin editar; los marcadores |
| FR-003 | Cada fila | Sin estilos en línea; el `style` de F5 queda (fuera de alcance) |
| FR-004 | T017 y cada fila | El tamaño bajo el tope del slice, derivado del piloto, y bajo 5 000 sin permiso |
| FR-005 | Cada fila | Ninguna utilidad con `!` (`style-output-check`); el foco con los E2E; el movimiento reducido con el barrido y los E2E de transición |
| FR-006 | Cada fila | Un PR que se revierte entero |
| FR-007 | Cada fila | Se integra de a uno y la siguiente rebasa |
| FR-008 | T017 y cada fila (R6) | La fila del slice en `docs/architecture.md` |
| FR-014 | Cada fila | `style-output-check` sigue sin preflight |
| FR-019, FR-020 | Cada fila | Las variantes de F15a y `style-output-check` |
| FR-021 | T016 y cada fila | Clases completas y mapas de cadenas |
| FR-027 | §2 y §3 | Un PR por slice, con el piloto primero |
| FR-028 | T015 y cada fila (R2) | Los E2E en verde contra la base antes de migrar |
| FR-029 | T016 y cada fila (R4) | Las utilidades, la hoja borrada y los marcadores |
| FR-030 | T016 y cada fila (R3) | Los componentes de `shared/ui` y su ciclo (research.md, B4) |
| FR-031 | T016 y cada fila (R4, R6) | Token, escala exacta o arbitrario; la cifra de valores arbitrarios |
| FR-032 | T017 y cada fila (R5) | El multiconjunto resuelto igual a la base menos la hoja |
| FR-033 | R1 y T030 | Lo que React no dibuja a `@layer base` de `main.css` |
| FR-034 | Cada fila | Sin dependencias |
| SC-001, SC-002, SC-005, SC-007, SC-009 | Cada fila | La red, el barrido, `style-output-check`, el tamaño y los checks de cierre |
| SC-010 | T015 y cada fila (R2) | El toque, el foco, el acento de Go y el movimiento reducido en los E2E |

## Descargas y permisos

Ninguna descarga. Por PR: `docker compose build taller`, con permiso; y el permiso del tamaño si un slice prevé más de 5 000.

## Riesgos

1. **Un slice pesa más que su tope.** *Mitigación:* el tope sale del piloto; el PR pide el permiso antes de empezar y puede partirse por hoja.
2. **La regla heredada de una clase base y el componente difieren en una propiedad** y, al borrar la regla en F15c, cambia algo. *Mitigación:* el componente fija todas las propiedades de la regla (R3), y el barrido de F15c lo prueba.
3. **La grilla no ve un estado del slice.** *Mitigación:* R1, paso 8, suma el estado antes de comparar; R2 cubre lo que el barrido no ve.
4. **Un ítem entra en medio** con una hoja o una pantalla nuevas (FR-007). *Mitigación:* con Q5-A no trae hojas; si las trajera, `stylesheets-check` lo para.
5. **Un marcador se pierde** y la red falla. *Mitigación:* el inventario los lista y la red corre entera en cada PR.

## Complexity Tracking

| Decisión | Por qué | La alternativa más simple, descartada |
| --- | --- | --- |
| Clases marcador sin regla | La red congelada localiza por clase y no se edita (FR-002) | Quitar la clase, como pide la letra de FR-029: rompe la red |
| Componentes con `tone` y `className` acotado | Sin `tailwind-merge`, dos utilidades de la misma propiedad dependen del orden de salida | Pasar cualquier `className`: un color o un margen repetidos ganarían al azar |
| `F15b` no edita `styles.css` | Las reglas base tienen usuarios hasta el último slice; borrarlas en F15c con su evidencia es una sola operación | Borrar cada regla en el PR de su último usuario: un orden más que vigilar en cada PR |
