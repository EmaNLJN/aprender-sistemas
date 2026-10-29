# Implementation Plan: F15c · El cierre

**Branch**: `030-f15-tailwind` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F15, en su tercera parte: los requisitos *(F15c)* (FR-035 a FR-037 y FR-039), FR-033 (con F15b) y los transversales (FR-001 a FR-008, FR-019 a FR-021 y FR-034), con SC-004, SC-011 y los transversales (SC-001, SC-002, SC-005, SC-007 y SC-009). Decisiones: [research.md](./research.md) (C1 a C5). Validación: [quickstart-f15c.md](./quickstart-f15c.md). Tareas: [tasks-f15c.md](./tasks-f15c.md). Contrato: [contracts/stylesheets-f15.md](./contracts/stylesheets-f15.md). Las otras partes: [plan.md](./plan.md) (F15a) y [plan-f15b.md](./plan-f15b.md).

**El objetivo:** que el taller termine con una sola manera de estilar: las reglas globales en la capa `base` de la entrada, los tokens sólo en el theme, sin capa heredada, sin `styles.css` ni alias, y con el preflight de Tailwind compensado para que nada visible cambie.

**La arquitectura:** cuatro pasos, cada uno con el barrido contra la base de F15c en 0: se borran las reglas de clase base sin usuarios; las globales y el bloque de Go pasan, sin cambios y en su orden, a `@layer base` de `main.css`, y se van `styles.css`, los 13 alias y la capa `legacy`; entra `preflight.css` en `base`, con las reglas que lo compensan entre él y las globales, sin `!important`; y la documentación queda en el estado final.

**El stack:** el de F15a y F15b, sin dependencias nuevas.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», la «Review Focus» y la sección de tu tarea. `tasks-f15c.md` tiene una línea por tarea (T032 a T039).
> - **La base.** F15c corre sobre `master` con el último PR de F15b: `main.css` importa en `legacy` sólo `styles.css`, y `ALLOWED_SHEETS` tiene `main.css`, `styles.css` y `code-editor.css`. T032 lo verifica; si queda una hoja de slice, F15c no empieza.
> - **El riesgo.** Las reglas que compensan el preflight son código que anula otro (Q2-B, decidido por el usuario). Su cantidad tiene tope: 40 reglas o los 10 000 caracteres del subpresupuesto. Por encima, se para y decide el usuario.

## Summary

- **Las clases base sin usuarios se borran** (FR-036): con la evidencia de `rule-evidence`, cada regla de clase base de `styles.css` que ningún elemento usa, o que sólo alcanza a marcadores cuyos componentes ya fijan todas sus propiedades. Va primero porque, si no, al pasar las globales a una capa más baja, una base les ganaría por capa (research.md, C2).
- **Las globales a la capa `base`** (FR-035): el documento, la tipografía, los controles, `[hidden]`, el foco, el movimiento reducido, la impresión y el bloque de Go, en un `@layer base { … }` de `main.css`, en el orden de `styles.css` y sin cambiar una declaración. Se borran `styles.css`, los 13 alias (y su redeclaración en Go) y la capa `legacy` de la declaración de capas; `code-editor.css` pasa de `var(--mono)` a `var(--font-mono)`.
- **El preflight compensado** (FR-039): `@import 'tailwindcss/preflight.css' layer(base);`, y en `@layer base`, antes de las globales, las reglas mínimas que devuelven lo que el preflight cambia y ninguna global fija. Se cuentan y se listan, con el selector, las propiedades y el estado de la grilla que las pide.
- **Las hojas finales** (FR-037, SC-004): `main.css` y `code-editor.css`, más las excepciones de la entrada, cada una con su motivo.
- **El barrido de F15c** compara contra la base de F15c, con el control de determinismo en 0. `removedTokens` tiene que ser exactamente los 13 alias: FR-001 dice que se conservan y FR-036 los borra (research.md, C3; hallazgo del analyze).

## Technical Context

**Language/Version**: CSS en `main.css` y `code-editor.css`; TypeScript en los checks, la spec del orden y los E2E. Las versiones del lockfile.

**Primary Dependencies**: ninguna nueva.

**Storage**: no aplica.

**Testing**: la red sin editar; E2E nuevos de lo que el preflight toca y el barrido no lee (`::placeholder` y `::backdrop`); `main-entry.spec.ts`, `style-output-check` y `stylesheets-check` con el estado final, en rojo primero; el barrido y el multiconjunto resuelto.

**Target Platform**: la de F15a.

**Project Type**: aplicación web (front React/TypeScript). Cambio de CSS y de checks.

**Performance Goals**: ninguna. Se informa `html.length` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: `main.css` suma las globales (unas 50 reglas en la proyección de F10c) y las compensatorias; se borran `frontend/styles.css` y sus reglas base; cambian `code-editor.css`, los tres checks, la spec del orden, dos herramientas de comparación y la documentación.

## Restricciones globales

- **Nada visible cambia** (FR-001, SC-011): el barrido contra la base de F15c (T032) da `differences: 0`, con el control de determinismo en 0; `newTokens` sólo con las `--tw-*` que declara el dist; `removedTokens` vacía hasta T036 y, desde T036, exactamente los 13 alias: `--paper`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-dark`, `--accent-soft`, `--sage`, `--green`, `--serif`, `--sans` y `--mono`.
- **Las globales sin cambios** (FR-035): cada regla con su texto exacto de la base, en el orden de `styles.css`, dentro de `@layer base`.
- **El orden en la capa `base`:** el preflight (por su `@import`), después las compensatorias y después las globales.
- **Las compensatorias** (FR-039): en `@layer base`, después del preflight, sin `!important`; cada una con el valor que el barrido muestra en la base para ese elemento y esa propiedad. **El tope:** 40 reglas; por encima, se para y decide el usuario.
- **El tamaño:** bajo 1 500 000 y como mucho **+10 000** sobre T032 (FR-004).
- **Lo que queda** (FR-037): `ALLOWED_SHEETS` con `main.css` y `code-editor.css`; ningún `var(--paper)` ni otro alias en `frontend/`.
- **Sin** utilidades con `!`, estilos en línea, dependencias nuevas ni E2E de la base editados.
- **Los checks de cierre** (SC-009) y la imagen web con permiso, como en F15a.
- **Commits y PR:** en español, con el trailer; el PR en inglés: `refactor(front): close the Tailwind migration with a compensated preflight and no legacy layer`.

## Constitution Check

*Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | `AGENTS.md` describe el estado final en el mismo PR (T038). |
| II. TDD y pruebas útiles | Sí | El estado final de la entrada, del orden de capas y de la lista de hojas abre en rojo (T035, T037); los E2E del preflight van en verde contra la base primero (T033). |
| III. Código entendible | Sí | Cada compensatoria es una regla mínima con su motivo en la lista del PR, no un reseteo general. |
| IV. Contenido en Git, IDs estables | Sí | No cambian clases, ids ni textos; los marcadores quedan. |
| V. Capas y contratos explícitos | Sí | Tres capas (`theme`, `base`, `utilities`) y una hoja sin capa, en el contrato. |
| VI. Español, accesibilidad y portabilidad | Sí | El foco, el movimiento reducido y la impresión siguen en las globales; los prueban el barrido y la red. |
| VII. Salidas generadas fuera de Git | Sí | Las copias y las salidas en `$TMPDIR/f15c/`. |
| VIII. Flow-forward | Sí | Una línea por tarea. |

## Decisiones del usuario

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **Q2-B:** el preflight entra al cerrar, compensado, con las reglas contadas y listadas | T037, con el tope de 40 reglas | T037 |
| **Q1-A:** línea de llegada | `styles.css` y la capa `legacy` desaparecen | T036 |
| **Las clases marcador** (decisión 1 del informe) | `@source not inline('sr-only')` e `('visible')` quedan como excepciones | T036, T038 |
| **SC-005 y las familias del preflight** (decisión 2 del informe, recomendación: el preflight tal cual) | El check de las fuentes mira el theme y las utilidades; las familias del preflight se listan en el PR | T037 |

## Project Structure

### Source Code (repository root)

```text
frontend/
├── styles.css                              (T034) pierde las reglas base sin usuarios; (T036) se borra
└── src/
    ├── app/
    │   ├── main.css                        (T036) @layer base con las globales y el bloque de Go, sin legacy; (T037) el preflight y las compensatorias
    │   └── main-entry.spec.ts              (T035, T037) el estado final, en rojo
    └── shared/ui/code-editor/code-editor.css   (T036) var(--font-mono)
qa/
├── style-output-check.ts                   (T035, T037) las capas sin legacy; el preflight con sus compensatorias
├── stylesheets-check.ts                    (T035) main.css y code-editor.css
└── e2e/
    ├── style-compare/style-sweep.ts        (T032) SAMPLES para listar todas las diferencias
    ├── style-compare/resolved-multiset.ts  (T032) HERITAGE_LAYERS
    └── specs/preflight-style.spec.ts       (T033) nuevo
docs/adr/0010-tailwind-css-v4.md, AGENTS.md, docs/architecture.md, qa/AGENTS.md   (T038, K)
```

## Review Focus

- **La evidencia de las bases borradas** (T034): cada regla con 0 estados, o sólo con marcadores, y el componente que fija sus propiedades.
- **Las globales:** su texto igual al de la base, en su orden, en `@layer base`, y el bloque de Go con sus tres tokens.
- **La lista de compensatorias:** cada una con su selector, sus propiedades, el valor de la base y el estado que la pide; ninguna con `!important`; menos de 40.
- **Las comparaciones:** el barrido en 0 con `removedTokens` igual a los 13 alias, y el multiconjunto resuelto de T036 en 0 y 0 con la capa `base` contada.

**Lo que la spec implica y ninguna prueba de una tarea ejercita**, cada caso con la prueba que lo fija:

1. **Una regla base que todavía gana sobre una global por capa** cuando las globales bajan a `base` (`.button` contra `button:disabled`): el barrido de T036 la vería, pero T034 la borra antes, con su evidencia, y el barrido de T034 en 0 prueba que no tenía efecto.
2. **El preflight cambia lo que el barrido no lee:** el color del `::placeholder` y el borde del `::backdrop` de un diálogo. Lo fijan los E2E de T033, en verde contra la base.
3. **Una compensatoria con `!important`** le ganaría a cualquier utilidad. Lo fija `style-output-check` en T037: la cantidad de `!important` de la capa `base` es la de las globales más la del preflight, contadas en sus textos.
4. **Un alias que alguien todavía usa** quedaría sin valor al borrarlo: la búsqueda de T032 y la de T036 en `frontend/`, y el barrido, que vería la propiedad sin resolver.
5. **El DOM de CodeMirror bajo el preflight** (las listas del autocompletado, los botones del buscador): el estado `editor` del barrido ve el editor montado; el buscador y el autocompletado no están en la grilla, así que T037 suma dos estados (`editor-search` y `editor-complete`) antes de comparar.

## Unidades y orden

| Unidad | Tareas | Quién | Compuerta |
| --- | --- | --- | --- |
| 0 · La línea base | T032 | K | La base de F15c verificada, el control de determinismo, la evidencia y las herramientas listas |
| 1 · Los E2E y las bases | T033 y T034 | implementador | Los E2E en verde contra la base; las bases borradas con el barrido en 0 |
| 2 · Sin capa heredada | T035 y T036 | implementador; K en `main.css` | Las rojas de T035 en verde; el barrido en 0 con los 13 alias en `removedTokens` |
| 3 · El preflight | T037 | implementador, con la lista aprobada por K | El barrido en 0; la lista contada y bajo el tope |
| 4 · El cierre | T038 y T039 | K | La documentación, los checks, el tamaño, la imagen y el PR |

**Vuelta atrás:** el PR entero con un `git revert`. T036 se revierte junto con T035, y T037 con su paso rojo.

## 0. Unidad 0 · La línea base (K)

### T032 · La base de F15c, la evidencia y las herramientas

**Archivos:** `specs/030-f15-tailwind/research.md` («Mediciones de la implementación»), `qa/e2e/style-compare/style-sweep.ts` y `resolved-multiset.ts`.

1. **La base:**
   - `grep -c "layer(legacy)" frontend/src/app/main.css` da 1 (`styles.css`); `node qa/stylesheets-check.ts` lista tres hojas. Si queda una hoja de slice, se para.
   - **Los alias:** `grep -rnE "var\(--(paper|surface|ink|muted|line|accent|accent-dark|accent-soft|sage|green|serif|sans|mono)\)" frontend` encuentra sólo el `:root` y el bloque de Go de `styles.css` y `var(--mono)` en `code-editor.css`. Otro uso se para: es un slice sin migrar del todo.
   - La red y las medidas (quickstart.md §1, pasos 1 y 2), y la copia de la base en `$TMPDIR/f15c/base`.
2. **Las herramientas** (dos ediciones, en un commit `test(qa): el barrido lista todas sus diferencias y el multiconjunto cuenta otras capas`):
   - **`style-sweep.ts`:** `const SAMPLES = Number(process.env.SAMPLES ?? 20);` y `samples.length < SAMPLES` en lugar de `samples.length < 20`.
   - **`resolved-multiset.ts`:** `const HERITAGE_LAYERS = (process.env.HERITAGE_LAYERS ?? 'legacy').split(',');`, y la condición del filtro pasa a `if (layer !== undefined && !HERITAGE_LAYERS.includes(layer)) return;`; el contexto deja fuera cualquier `@layer` como hasta ahora.
3. **El control de determinismo** con la grilla entera: `differences: 0`, `newTokens: []`, `removedTokens: []`.
4. **La evidencia de `styles.css`:** `node qa/e2e/style-compare/rule-evidence.ts . frontend/styles.css > "$TMPDIR/f15c/evidence.tsv"`. Cada fila queda en una de tres clases:
   - **`global` o `token`:** pasa a `@layer base` en T036;
   - **`base` sin elementos** (`states` 0) o sólo con marcadores: se borra en T034;
   - **`base` con un elemento que no es marcador:** se para, porque es un slice sin migrar.
5. **Los `!important` de las globales:** `grep -c '!important'` sobre el texto de las reglas `global` de la evidencia; es el número `GLOBAL_IMPORTANT` de T037.
6. **El commit de documentación:** `docs(specs): la línea base de la implementación de F15c`.

## 1. Unidad 1 · Los E2E y las clases base

### T033 · Lo que el preflight toca y el barrido no lee, en verde contra la base

**Archivos:** `qa/e2e/specs/preflight-style.spec.ts` (nuevo).

```ts
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

test.describe('what the preflight would change and the style sweep does not read', () => {
  test('the search box keeps the placeholder colour of the browser', async ({ shell, page }) => {
    await shell.goto(urls.view('biblioteca'));
    const search = page.getByRole('searchbox').first();

    const placeholder = await search.evaluate((element) => {
      const style = getComputedStyle(element, '::placeholder');
      return { color: style.color, opacity: style.opacity };
    });

    expect(placeholder).toEqual({ color: 'rgb(117, 117, 117)', opacity: '1' });
  });

  test('an open dialog keeps a backdrop without a border', async ({ shell, page }) => {
    await shell.goto(urls.view('metodo'));
    await page.getByRole('button', { name: 'Borrar mi progreso' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const backdrop = await dialog.evaluate((element) => {
      const style = getComputedStyle(element, '::backdrop');
      return { borderTopStyle: style.borderTopStyle, margin: style.margin };
    });

    expect(backdrop).toEqual({ borderTopStyle: 'none', margin: '0px' });
  });
});
```

- **Los valores** son los de la hoja de estilos del navegador de Chromium (`::placeholder` en `#757575`, el `::backdrop` sin borde), que ninguna regla del taller cambia. Si la base da otro valor, una regla de la base lo fija: se usa el de la base y se cita la regla.
- **Correr:** `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/preflight-style.spec.ts`: 2 de 2 en verde contra la base; después, la red entera.
- **Commit:** `test(e2e): el placeholder y el fondo de los diálogos, antes del preflight`.

### T034 · Las reglas de clase base sin usuarios se van (FR-036)

**Archivos:** `frontend/styles.css`.

1. **La lista:** las filas de T032, paso 4, de la segunda clase, cada una con su selector, sus estados en 0 o sus marcadores, y el componente de `shared/ui` que fija sus propiedades. La aprueba K.
2. **El borrado:** cada regla por texto, y el bloque `@media` que quede vacío.
3. **Correr:** `npm run build`, `npm test`, la red entera; el barrido contra la base en 0 (`removedTokens: []`); `HERITAGE_LAYERS=legacy node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15c/base" .` con `onlyBase` igual a las tuplas borradas y `onlyUnit: 0`.
4. **Commit:** `refactor(front): fuera las reglas de clase base que ya no usa nadie`, con la lista en el cuerpo.

## 2. Unidad 2 · Sin capa heredada

### T035 · El estado final de la entrada, sin preflight todavía, en rojo

**Archivos:** `frontend/src/app/main-entry.spec.ts`, `qa/style-output-check.ts` y `qa/stylesheets-check.ts`.

1. **`main-entry.spec.ts`:** `LAYER_ORDER` y `ENTRY_IMPORTS` pasan a:

   ```ts
   const LAYER_ORDER = '@layer theme, base, utilities;';

   const ENTRY_IMPORTS: readonly string[] = [
     "'tailwindcss/theme.css' layer(theme)",
     "'tailwindcss/utilities.css' layer(utilities) source('..')",
     "'../shared/ui/code-editor/code-editor.css'",
   ];
   ```

   El título de la segunda prueba pasa a `'main.css declares the layers first and imports the theme, the utilities and the editor exceptions'`.
2. **`style-output-check.ts`:** `const LAYERS: readonly string[] = ['theme', 'base', 'utilities'];` y el mensaje de `assertLayerOrder` pasa a `'the output orders theme, base and utilities (FR-011, FR-036)'`. `legacySheets()` devuelve `[]` cuando `main.css` no importa nada en `legacy`, sin cambiar su código (la expresión no encuentra líneas).
3. **`stylesheets-check.ts`:** `ALLOWED_SHEETS` queda con `'frontend/src/app/main.css'` y `'frontend/src/shared/ui/code-editor/code-editor.css'`.
4. **Correr y ver el fallo esperado:** `main-entry.spec.ts` falla porque la entrada todavía importa `styles.css` y declara `legacy`; `style-output-check`, en `assertLayerOrder`, con `legacy` de más; `stylesheets-check`, con `frontend/styles.css` en `unexpected`.
5. **Commit:** `test(front): la entrada sin capa heredada (roja)`.

### T036 · Las globales a `base`, sin `styles.css` ni alias (FR-035, FR-036)

**Archivos:** `frontend/src/app/main.css` (K), `frontend/styles.css` (se borra) y `frontend/src/shared/ui/code-editor/code-editor.css`.

1. **`main.css`:**
   - la primera línea pasa a `@layer theme, base, utilities;`;
   - sale `@import '../../styles.css' layer(legacy);`;
   - al final, después del `@theme` y de los `@keyframes` que sumó F15b, un bloque `@layer base { … }` con, en el orden de `styles.css`:
     1. el bloque de Go, sin los tres alias:

        ```css
        body[data-language='go'] {
          --color-accent: #22626b;
          --color-accent-dark: #174a52;
          --color-accent-soft: #e1ebea;
        }
        ```

     2. cada regla de la clase `global` de la evidencia de T032, con su texto exacto, dentro de su `@media` si lo tenía (un bloque por cada bloque de origen). Según la proyección de F10c (research-f10c.md, R3): `*`; `html`; `body`; `button, input, select, textarea`; `button, a, input, select, textarea`; `button`; `button:disabled`; `a`; los siete `:focus-visible`; el segundo `button`; `button:active`; `[hidden]`; `h1, h2, h3, p`; `h1, h2, h3`; `p`; `progress` y sus tres pseudoelementos; `input[type='checkbox']:not(.step-check)`; `dialog`; `dialog::backdrop`; en 590 px, `body`; en el movimiento reducido, `*`; en impresión, `body` y `a`; y `button, a, input, select, summary` (`touch-action`);
     3. lo que F15b ya puso en `@layer base` (el `.noscript` del shell), que se queda donde está, y se une al bloque.
2. **`code-editor.css`:** `font-family: var(--mono);` pasa a `font-family: var(--font-mono);` (el mismo valor resuelto).
3. **`git rm frontend/styles.css`.**
4. **Correr:**
   - `npm run build`, `npm test` (las rojas de T035 en verde), `npm run lint`, `npm run format:check` y la red entera;
   - la búsqueda de alias de T032, paso 1, no encuentra nada;
   - **el barrido:** `differences: 0` y `removedTokens` igual a los 13 alias;
   - **el multiconjunto resuelto con la capa `base`:** `HERITAGE_LAYERS=legacy,base node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15c/base" .` → `onlyBase` igual a las tuplas de T034, `onlyUnit: 0`.
5. **Commit:** `refactor(front): las reglas globales viven en la capa base y styles.css se va`.

## 3. Unidad 3 · El preflight compensado (FR-039)

### T037 · El preflight y sus reglas compensatorias

**Archivos:** `frontend/src/app/main.css`, `main-entry.spec.ts`, `qa/style-output-check.ts` y `qa/e2e/style-compare/grid.ts`.

1. **Los estados del editor** que el preflight puede alcanzar (Review Focus, 5), en `grid.ts`, en el commit rojo:

   ```ts
   {
     name: 'editor-search',
     path: '/?ejercicio=rust-02&paso=code#laboratorio',
     main: 'lab',
     ready: () => document.querySelector('.cm-editor') !== null,
     setup: async (page) => {
       await page.locator('.cm-content').click();
       await page.keyboard.press('Control+f');
       await page.waitForSelector('.cm-search');
     },
   },
   {
     name: 'editor-complete',
     path: '/?ejercicio=rust-02&paso=code#laboratorio',
     main: 'lab',
     ready: () => document.querySelector('.cm-editor') !== null,
     setup: async (page) => {
       await page.locator('.cm-content').click();
       await page.keyboard.press('Control+Space');
       await page.waitForSelector('.cm-tooltip-autocomplete');
     },
   },
   ```

   Corren primero contra la base con el control de determinismo de esos dos estados (`PAGES=editor-search,editor-complete`).
2. **En rojo:**
   - `main-entry.spec.ts`: `ENTRY_IMPORTS` suma `"'tailwindcss/preflight.css' layer(base)",` en el segundo lugar, después del theme;
   - `style-output-check.ts`: `assertNoPreflight` se reemplaza por esta función, con `GLOBAL_IMPORTANT` de T032, paso 5, y `PREFLIGHT_IMPORTANT` igual a la cantidad de `!important` de `node_modules/tailwindcss/preflight.css` (`grep -c '!important'`):

     ```ts
     const GLOBAL_IMPORTANT = 0; // T032, step 5: the !important declarations of the global rules
     const PREFLIGHT_IMPORTANT = 0; // grep -c '!important' node_modules/tailwindcss/preflight.css

     function assertCompensatedPreflight(sheet: CssSheet): void {
       const base = sheet.rules.filter((rule) => inLayer(rule, 'base'));
       assert(
         base.some((rule) => rule.prelude.includes('::file-selector-button')),
         'the preflight lives in the base layer (FR-039)',
       );
       const important = base
         .flatMap((rule) => rule.declarations)
         .filter((declaration) => declaration.important).length;
       assert.equal(
         important,
         GLOBAL_IMPORTANT + PREFLIGHT_IMPORTANT,
         'no compensating rule uses !important (FR-039)',
       );
     }
     ```

     Los dos `0` se reemplazan por los números medidos; las dos líneas son las únicas con comentario, y dicen de dónde sale cada número.
   - Correr: la spec falla porque la entrada no importa el preflight, y el check, en `assertCompensatedPreflight`. Commit: `test(front): el preflight en la capa base, compensado (roja)`.
3. **El preflight:** `@import 'tailwindcss/preflight.css' layer(base);` justo después del import del theme, y `npm run build`.
4. **Lo que cambia,** sin compensar: `SAMPLES=100000 node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15c/base" . > "$TMPDIR/f15c/preflight.txt"`. Cada línea es un estado, una captura, un elemento, una propiedad, el valor de la base y el de la rama.
5. **Las compensatorias:** se agrupan las líneas por selector de elemento y propiedad, y cada grupo se compensa con una regla al principio del bloque `@layer base { … }` de `main.css`, antes del bloque de Go: el selector más general que alcanza a todos los elementos del grupo y a ningún otro, y el valor de la base. Lo esperado, por lo que hace el preflight (research.md, C1), y a confirmar con el barrido:

   | Lo que cambia el preflight | Dónde se ve | Compensatoria esperada |
   | --- | --- | --- |
   | `border: 0 solid` en todo elemento | `border-*-style` de `none` a `solid` | `*, ::before, ::after, ::backdrop { border-style: none; }` |
   | `margin: 0; padding: 0` en todo elemento | los márgenes del navegador en `p`, `ul`, `ol`, `blockquote`, `pre`, `dialog`, los títulos y los rellenos de los controles que ninguna global fija | una regla por elemento, con el valor de la base |
   | `html`: familia, interlineado, `tab-size`, `-webkit-text-size-adjust` y `-webkit-tap-highlight-color` | el elemento `html` | `html { … }` con los valores de la base |
   | Títulos con `font-size` y `font-weight` heredados | `h4` a `h6` y los títulos que las globales no fijan | `h4, h5, h6 { … }` con los de la base |
   | Listas sin viñetas | `list-style-type` de `ul`, `ol` y sus `li` | `ul { list-style: disc; } ol { list-style: decimal; }`, si la base las tiene |
   | `img, svg, video, canvas { display: block; vertical-align: middle; }` | los SVG de Sistemas y los íconos | `svg { display: inline; vertical-align: baseline; }` con los de la base |
   | `code, pre` con otra familia y `font-size: 1em` | el editor (sin capa) no, el `pre` de Proyecto sí | la familia y el tamaño de la base |
   | `::placeholder` con `color-mix()` | T033 | `::placeholder { color: …; opacity: 1; }` con el valor de T033 |
   | `button` y controles: fondo, borde y radio | los controles que ninguna global ni utilidad fija | una regla por control, con la base |

   Cada vuelta: `npm run build` y el barrido acotado a los estados de las líneas que quedan (`PAGES=…`), hasta 0; después, la grilla entera.
6. **La lista y el tope:** una fila por compensatoria (el selector, las propiedades que restituye, el valor y el estado de la grilla que la pide), en la descripción del PR (FR-039, SC-011). Si pasa de **40 reglas**, o el tamaño pasa de **+10 000** sobre T032, se para y lo decide el usuario.
7. **Las familias del preflight** (research.md, C5): las tres pilas de fuentes por omisión que el preflight escribe como respaldo se listan en el PR, con la decisión 2 del informe.
8. **Correr:** `npm run build`, `npm test` (las rojas del paso 2 en verde), `npm run lint`, `npm run format:check`, la red entera (con los E2E de T033 sin editar), y el barrido de la grilla entera, con los dos estados nuevos: `differences: 0`, `removedTokens` igual a los 13 alias.
9. **Commit:** `refactor(front): el preflight de Tailwind en la capa base, con sus reglas compensatorias`.

## 4. Unidad 4 · El cierre (K)

### T038 · La documentación del estado final

- **`AGENTS.md`:** el párrafo de F15a pasa al estado final: sin `styles.css`, las tres capas y lo que vive en `base` (el preflight, sus compensatorias y las globales); una regla global nueva va al bloque `@layer base` de `main.css`, después de las compensatorias.
- **`docs/architecture.md`:** el mapa de hojas con `main.css` y `code-editor.css`, y las excepciones.
- **`qa/AGENTS.md`:** la fila de estilos nombra `preflight-style.spec.ts` y el estado final de los checks.
- **`docs/adr/0010-tailwind-css-v4.md`:** en «Consecuencias», la cantidad de compensatorias y la lista de excepciones; si el usuario ya lo aceptó, sin cambiar su estado.
- **`contracts/stylesheets-f15.md`** no se edita (flow-forward): ya describe el estado final.
- **Comprobar** rutas, comandos y enlaces.
- **Commit:** `docs(front): el estilo del taller después de F15`.

### T039 · La compuerta y el PR

1. Los checks de cierre, con el mismo total de avisos de complejidad que en T032.
2. Las comparaciones finales contra la base de T032: el control de determinismo, el barrido (`differences: 0`, los 13 alias en `removedTokens`) y el multiconjunto resuelto con la capa `base`.
3. El tamaño, bajo 1 500 000 y a +10 000 como mucho.
4. La imagen web, con permiso.
5. El PR (quickstart-f15c.md §3).

## Cobertura de requisitos

| Requisito | Tareas | Cómo |
| --- | --- | --- |
| FR-001 | T032, T034, T036, T037 y T039 | El barrido contra la base de F15c en 0, con los 13 alias como única propiedad que se va (C3) |
| FR-002 | T033 a T039 | La red sin editar |
| FR-003, FR-034 | T039 | Sin estilos en línea ni dependencias |
| FR-004 | T039 | +10 000 como mucho |
| FR-005 | T037 | Ninguna compensatoria con `!important`; las globales del foco y del movimiento reducido sin cambios |
| FR-006 | T035, T037 y T039 | Las restricciones en rojo primero; un PR revertible |
| FR-007 | — | F15c es el último; un ítem que entre antes rebasa y repite T032 |
| FR-008, FR-037 | T038 | La documentación del estado final |
| FR-019, FR-020 | T037 | `style-output-check` sigue con las condiciones y el `:hover` |
| FR-033 | T036 | El `.noscript` y lo que React no dibuja en `@layer base` |
| FR-035 | T036 | Las globales y el bloque de Go en `base`, sin cambios |
| FR-036 | T034 y T036 | Las bases sin usuarios, `styles.css`, los alias y la capa `legacy` |
| FR-039 | T033 y T037 | El preflight, las compensatorias contadas y listadas, sin `!important` |
| SC-004 | T035 y T036 | `ALLOWED_SHEETS` con `main.css` y `code-editor.css` |
| SC-005 | T037 | El theme y las utilidades sin valores por omisión; las familias del preflight, según la decisión 2 |
| SC-011 | T037 y T039 | El barrido en 0 contra la base de F15c y la lista de compensatorias |
| SC-001, SC-002, SC-007, SC-009 | T039 | La red, el barrido, el tamaño y los checks |

## Descargas y permisos

Ninguna descarga. `docker compose build taller`, con permiso. Si la lista de compensatorias pasa de 40 o el tamaño de +10 000, el permiso del usuario.

## Riesgos

1. **La lista de compensatorias crece.** *Mitigación:* el tope de 40 y la decisión del usuario; la alternativa sería volver a Q2-A (sin preflight), que el ADR registra.
2. **Un estado de la grilla no ve un cambio del preflight** (un control que sólo aparece en una pantalla rara). *Mitigación:* los estados que sumó cada slice de F15b, los dos del editor y los E2E de T033.
3. **Una global no pasa igual a `base`** porque una base que quedó le ganaba. *Mitigación:* T034 primero, y el barrido de T036.
4. **El navegador cambia sus valores por omisión** entre la base y la rama. *Mitigación:* las dos corren con el mismo Chrome Headless Shell de Playwright 1.63.

## Complexity Tracking

| Decisión | Por qué | La alternativa más simple, descartada |
| --- | --- | --- |
| Reglas compensatorias del preflight | Q2-B, del usuario: el preflight entra y nada visible cambia | No importar el preflight (Q2-A), la recomendada en la spec |
| Borrar las bases antes de mover las globales | Una base en `legacy` le ganaría por capa a una global en `base` | Mover todo a la vez: una diferencia del barrido mezclaría dos causas |
