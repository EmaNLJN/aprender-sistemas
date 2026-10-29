# Implementation Plan: F15a · La base de Tailwind CSS v4

**Branch**: `030-f15-tailwind` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F15, en su primera parte: los requisitos *(F15a)* (FR-009 a FR-013, FR-015 a FR-018, FR-022 a FR-026 y FR-038), FR-014 (con F15b) y los transversales (FR-001 a FR-008, FR-019 a FR-021 y FR-034), con SC-003, SC-006, SC-008 y los transversales (SC-001, SC-002, SC-005, SC-007 y SC-009). Decisiones y mediciones: [research.md](./research.md) (R1 a R15). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). Contrato: [contracts/stylesheets-f15.md](./contracts/stylesheets-f15.md). Las otras dos partes: [plan-f15b.md](./plan-f15b.md) y [plan-f15c.md](./plan-f15c.md).

**El objetivo:** que Tailwind CSS v4 entre como herramienta de build con un theme hecho de los tokens del taller, y que todo el CSS de hoy siga dibujando exactamente lo mismo, en su propia capa, sin ninguna utilidad todavía.

**La arquitectura:** `main.tsx` importa una sola entrada, `frontend/src/app/main.css`, que declara `@layer theme, base, legacy, utilities;`, importa las hojas de hoy en `legacy` en el orden de la base y las utilidades de Tailwind encima, sin preflight. Los 61 tokens de F10c pasan al `@theme static` de la entrada; las siete reglas que compiten con el `<style>` de CodeMirror quedan sin capa, en la hoja del editor. Unos checks nuevos sobre el CSS construido fijan los tokens, las capas, las condiciones de `@media`, el `:hover`, las colisiones y la lista cerrada de hojas.

**El stack:** Tailwind CSS 4.3.3 y `@tailwindcss/vite` 4.3.3 (nuevas, en `devDependencies`, con permiso), Vite 8.3.2 con Lightning CSS 1.33.0 y `vite-plugin-singlefile` 2.3.3, Vitest 5.0.3, Playwright 1.63.0 y los checks de `qa/` en TypeScript con Node 24.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», las «Reglas para todos los agentes», la «Review Focus» y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T013) y remite acá.
> - **La base.** F15a corre sobre `master` con F10c entregado: `frontend/styles.css` con los 61 tokens y los 13 alias, la hoja del shell segunda y `main-entry.spec.ts` con `BASE_SHEETS` (research.md, R15). Lo verifica T001; sin F10c, F15a no empieza.
> - **Lo que no se midió.** Tailwind no estaba instalado al planificar: lo que la documentación no fija para 4.3.3 lo mide la sonda de T007, con su alternativa escrita (research.md, R10).

## Summary

F15a pone la herramienta sin tocar el aspecto:

- **Una entrada con capas** (FR-011, FR-012): `main.css` declara el orden y trae las hojas de hoy en `legacy`, en el orden de `BASE_SHEETS`. Debajo de las utilidades, una regla heredada nunca le gana a una utilidad de un slice migrado; dentro de la capa, la cascada entre hojas es la de hoy (research.md, R2).
- **El editor fuera de la capa** (FR-013): las siete reglas `.cm-enhanced …` que nombran el DOM de CodeMirror pasan sin cambios a `shared/ui/code-editor/code-editor.css`, importada sin capa. Así siguen compitiendo con el theme inyectado como hoy (R3).
- **Los tokens en el theme** (FR-015, FR-016, FR-038): los 61 tokens pasan a `@theme static`, con `--*: initial` y `--spacing: 4px`. Los alias y el bloque de Go quedan en `styles.css` (R4).
- **Sin preflight, con las fuentes acotadas y sin colisiones** (FR-014, FR-017, FR-018): sólo `theme.css` y `utilities.css`; `source('..')` lee `frontend/src`; `sr-only` y `visible` no generan utilidad (R5, R6).
- **Los anchos y el `:hover` de hoy** (FR-019, FR-020): `@custom-variant hover (&:hover)` y una variante por condición de hoy, `upto-<px>` y `from-<px>` (R7).
- **Los checks** (FR-023, FR-038 y los demás): `qa/style-output-check.ts` y `qa/stylesheets-check.ts`, sobre un lector de CSS propio (R8), y las herramientas de comparación de F10c promovidas a `qa/e2e/style-compare/` (R9).
- **El ADR 0010, el piso de navegadores y la regla para lo nuevo** (FR-008, FR-025, FR-026).

La compuerta (FR-022, SC-003): ninguna utilidad en el código, el barrido en 0, el multiconjunto resuelto de las hojas heredadas en 0 y 0, y el HTML a +2 000 caracteres como mucho.

## Technical Context

**Language/Version**: CSS (la entrada y las hojas heredadas, sin cambiar sus declaraciones); TypeScript como ES modules en los checks de `qa/`, en la spec de Vitest y en las herramientas de comparación. Node 24, Vite 8.3.2, Lightning CSS 1.33.0, Vitest 5.0.3 y `@playwright/test` 1.63.0, como fija `package-lock.json`.

**Primary Dependencies**: `tailwindcss` 4.3.3 y `@tailwindcss/vite` 4.3.3, exactas, en `devDependencies` (FR-009). Ninguna de runtime.

**Storage**: no aplica.

**Testing**: la red de la base sin editar (FR-002); `main-entry.spec.ts` (Vitest, proyecto `node`) con el orden nuevo; dos checks nuevos de `qa/`; el barrido de estilo computado y el multiconjunto resuelto, promovidos; la sonda, sin commit.

**Target Platform**: navegador con `@layer` (Chrome 99, Firefox 97, Safari 15.4); Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript). Es un cambio de build y de CSS.

**Performance Goals**: ninguna. Se informa `html.length` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: archivos nuevos: `frontend/src/app/main.css`, `frontend/src/shared/ui/code-editor/code-editor.css`, `qa/style-output-check.ts`, `qa/stylesheets-check.ts`, `qa/lib/css-blocks.ts`, `qa/fixtures/theme-tokens-f10c.json`, las cuatro herramientas de `qa/e2e/style-compare/` y `docs/adr/0010-tailwind-css-v4.md`. Cambian: `main.tsx`, `main-entry.spec.ts`, `frontend/vite.config.ts`, `frontend/styles.css` (el `:root`), la hoja del laboratorio (siete reglas), `qa/run-checks.ts`, `qa/e2e/tsconfig.json`, `package.json`, `package-lock.json` y la documentación.

## Restricciones globales

- **Las versiones:** `tailwindcss` y `@tailwindcss/vite` **4.3.3**, exactas (sin `^`), en `devDependencies`. Ninguna otra dependencia nueva (SC-008).
- **El tope del HTML:** bajo `BOOT_SIZE_LIMIT` de `qa/build-check.ts`, **1 500 000** caracteres, y como mucho **+2 000** sobre T001 (FR-004). Por encima, la tarea se para y lo aprueba el usuario.
- **Ninguna utilidad en el código** (FR-022): ningún `className` cambia. La lista de utilidades de la salida de F15a está vacía, o cada una tiene su motivo en el PR.
- **El orden de capas:** `@layer theme, base, legacy, utilities;`, la primera línea de `main.css`.
- **Las hojas heredadas**, en `legacy`, en el orden de `BASE_SHEETS` de la base y sin cambiar una declaración. Las únicas excepciones: el bloque de 61 tokens del `:root` de `styles.css`, que pasa al theme (T009), y las siete reglas del editor, que pasan sin cambios a `code-editor.css` (T008).
- **El theme:** `@theme static`, con `--*: initial;`, `--spacing: 4px;` y los 61 tokens de T042 de F10c con sus valores. Medidas en píxeles y colores en el hexadecimal de hoy.
- **Las fuentes:** `source('..')` en el import de `utilities.css`; `@source not` para `../**/*.spec.ts`, `../**/*.spec.tsx` y `../vitest.setup.ts`; `@source not inline('sr-only')` e `('visible')`.
- **Las variantes:** `@custom-variant hover (&:hover);` y una variante por condición de `@media` de la base, `upto-<px>` y `from-<px>`, de la más ancha a la más angosta. Ninguna `max-*`, `min-*` ni `--breakpoint-*`.
- **Las comparaciones,** contra la copia de la base de T001 (quickstart.md §3):
  - **el control de determinismo** primero: la base contra sí misma, `differences: 0`, `newTokens: []`, `removedTokens: []` y `unhandled: []`;
  - **el barrido** sobre la grilla entera (los 35 estados de F10c, el estado `editor` y los que sumaron los ítems después) en siete anchos, con el movimiento reducido apagado y encendido, más la impresión: `differences: 0`, `removedTokens: []` y `newTokens` dentro de la lista cerrada (`[]` hasta T008; `['--spacing']` desde T009);
  - **el multiconjunto resuelto** de las hojas heredadas: `onlyBase: 0` y `onlyUnit: 0`.
- **La red:** todos los E2E y las specs de la base pasan sin editarse (FR-002). La única spec de la base que cambia es `main-entry.spec.ts`, la prueba del orden de las hojas, que FR-012 pide fijar con el orden nuevo y en rojo.
- **Sin estilos en línea** (FR-003): ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` nuevo.
- **Los checks de cierre** (SC-009): `npm run build`, `npm test`, `npm run lint` (con el mismo total de avisos de complejidad que en T001), `npm run format:check`, `E2E_PORT=<puerto> npm run test:e2e` y `git diff --check`; la imagen web, con permiso (`docker compose build taller`).
- **Commits y PR:** commits en español, `tipo(alcance): asunto`, con `git diff --check` limpio y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Un solo PR que se revierte entero (FR-006), con título en inglés: `build(front): adopt Tailwind CSS v4 with the current CSS in a legacy layer`.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | La regla nueva (cómo se estila desde F15a) entra en `AGENTS.md` en el mismo PR (T012); el plan no la duplica. |
| II. TDD y pruebas útiles | Sí | Cada restricción nueva abre en rojo (el orden en T005, la lista de hojas con su control en T004, las colisiones con su control en T008). Los tokens se fijan antes de moverlos (T003), contra una fixture copiada del contrato de F10c. Los valores esperados salen del texto de las hojas de la base, nunca de la salida que se prueba. |
| III. Código entendible | Sí | El lector de CSS es una función por responsabilidad, sin pasar de 10 de complejidad; los checks son funciones con nombre por requisito. |
| IV. Contenido en Git, IDs estables | Sí | No cambian clases, ids ni contenido. |
| V. Capas y contratos explícitos | Sí | La entrada es el contrato del orden ([contracts/stylesheets-f15.md](./contracts/stylesheets-f15.md)), con su prueba; las excepciones del editor viven en su slice. |
| VI. Español, accesibilidad y portabilidad | Sí | No cambian textos, foco, teclado, diseño móvil ni movimiento reducido: los prueban el barrido y la red. Los scripts usan `node`; el lockfile trae los binarios de glibc, musl y darwin. |
| VII. Salidas generadas fuera de Git | Sí | El dist, las copias de la base y las salidas de las comparaciones viven en `$TMPDIR`. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. |

## Decisiones del usuario

Están en `## Clarifications` de la [spec](./spec.md) y en `.coordinador/clarify-decisiones.md`. Este plan aplica:

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **Q1-A con P5-A:** la base sin utilidades, la migración por slice y el cierre | F15a deja el código sin utilidades y la compuerta en 0 | Todo el plan |
| **Q2-B:** el preflight entra en F15c | `main.css` no importa `preflight.css`; `style-output-check` lo prohíbe | T003, T008 |
| **Q3-A:** `--spacing: 4px`, tokens y arbitrarios | `--spacing: 4px` en el theme; el contrato lo dice para lo nuevo | T009, T012 |
| **Q4-A:** sin prefijo | `@source not inline('sr-only')` e `('visible')`, y el check de colisiones | T008 |
| **Q5-A:** lo nuevo usa utilidades | `stylesheets-check` y la regla en `AGENTS.md` y en el contrato | T004, T012 |
| **El ADR 0010** (el coordinador, a confirmar) | T001 confirma el número libre con `ls docs/adr` | T001, T012 |
| **Los tokens en `@theme static`** (el coordinador, FR-038) | El check de los tokens antes de mover el bloque, y su control sin `static` | T003, T009 |
| **El puntero del barrido en `(-1, -1)`** y los `<details>` cerrados sin comparar (TR-13) | Las herramientas promovidas lo conservan | T002 |

## Project Structure

### Documentation (this feature)

```text
specs/030-f15-tailwind/
├── spec.md                       (no se toca)
├── research.md                   decisiones de las tres partes (R, B y C), Context7 y mediciones
├── plan.md, quickstart.md, tasks.md                     F15a (T001 a T013)
├── plan-f15b.md, quickstart-f15b.md, tasks-f15b.md      F15b (T014 a T031)
├── plan-f15c.md, quickstart-f15c.md, tasks-f15c.md      F15c (T032 a T039)
└── contracts/
    └── stylesheets-f15.md        la entrada, las capas, las hojas permitidas y cómo se estila lo nuevo
```

### Source Code (repository root)

```text
frontend/
├── vite.config.ts                          (T008, K) el plugin tailwindcss()
├── styles.css                              (T009) el :root queda con los 13 alias
└── src/
    ├── app/
    │   ├── main.tsx                        (T008, K) importa sólo ./main.css
    │   ├── main.css                        (T008) nueva: la entrada; (T009) el theme; (T010) las variantes
    │   └── main-entry.spec.ts              (T005) la entrada y su lista de @import, en rojo
    ├── pages/lab/ui/lab.css                (T008) pierde las siete reglas del editor
    └── shared/ui/code-editor/code-editor.css   (T008) nueva: las siete reglas, sin capa
qa/
├── lib/css-blocks.ts                       (T003) nuevo: el lector de CSS
├── fixtures/theme-tokens-f10c.json         (T003) nueva y congelada: los 61 tokens de F10c
├── style-output-check.ts                   (T003, T005, T008) nuevo: lo que sale en el CSS construido
├── stylesheets-check.ts                    (T004, T008) nuevo: la lista cerrada de hojas
├── run-checks.ts                           (T003, T004) suma los dos checks
└── e2e/
    ├── tsconfig.json                       (T002) allowImportingTsExtensions
    └── style-compare/                      (T002) nuevas: grid.ts, style-sweep.ts, rule-evidence.ts y resolved-multiset.ts
package.json, package-lock.json             (T006, K) las dos dependencias, con permiso
frontend/THIRD-PARTY-NOTICES.txt            (T011) sólo si la salida lleva el aviso de Tailwind
docs/adr/0010-tailwind-css-v4.md            (T012, K) nuevo, en estado «propuesta»
AGENTS.md, README.md, docs/architecture.md, qa/AGENTS.md   (T012, K)
```

| Archivo | De qué se encarga |
| --- | --- |
| `frontend/src/app/main.css` | El orden de capas, las hojas heredadas en `legacy`, las utilidades, las excepciones sin capa, las fuentes, las variantes y el theme |
| `frontend/src/shared/ui/code-editor/code-editor.css` | Las siete reglas que compiten con el theme de CodeMirror (FR-013) |
| `frontend/src/app/main-entry.spec.ts` | Que `main.tsx` importe sólo la entrada, y la lista entera de `@import` de la entrada |
| `qa/lib/css-blocks.ts` | Leer CSS plano: reglas con su contexto, declaraciones, grupos, sentencias y orden de capas |
| `qa/style-output-check.ts` | Los tokens, el theme sin valores por omisión, el preflight, los `!`, el interlineado de `text-*`, las condiciones de `@media`, el `:hover`, el orden de capas y las colisiones, sobre el CSS construido |
| `qa/stylesheets-check.ts` | Que en `frontend/` existan exactamente las hojas de la lista cerrada |
| `qa/fixtures/theme-tokens-f10c.json` | El contrato de los 61 tokens de F10c, congelado |
| `qa/e2e/style-compare/*` | El barrido, la grilla, la evidencia de reglas y el multiconjunto resuelto, para cada PR de F15 |

## Review Focus

Lo que el revisor mira primero:

- **La entrada contra la base.** `ENTRY_IMPORTS` de `main-entry.spec.ts` y `main.css` tienen las hojas de `BASE_SHEETS` de T001, en su orden, todas con `layer(legacy)`; `utilities.css` con `source('..')`; `code-editor.css` sin capa y al final.
- **Las siete reglas del editor**, idénticas a las de la base, y las dos de `.cm-enhanced` que quedan en la capa; el control que las vuelve a la capa con las diferencias que predice research.md, R3.
- **El theme:** los 61 tokens con los valores de la fixture, `--*: initial`, `--spacing: 4px`, y el `:root` de `styles.css` con los 13 alias y nada más.
- **Las comparaciones:** el control de determinismo en 0, el barrido en 0 con `newTokens` en la lista cerrada y `removedTokens` vacía, el multiconjunto resuelto en 0 y 0, y la lista de utilidades de la salida vacía o explicada.
- **La sonda:** cada fila de research.md, R10, con su resultado y, si no dio lo esperado, la alternativa aplicada.

**Lo que la spec implica y ninguna prueba de una tarea ejercita**, cada caso con la prueba que lo fija y su tarea:

1. **Tailwind tira los tokens que ninguna utilidad usa** y la capa heredada se queda sin colores: el barrido lo vería, pero sólo después de mover el bloque. Lo fija `style-output-check`, escrito antes (T003), y su control: con `@theme` sin `static` tiene que dar rojo (T009).
2. **Una regla del editor pierde contra el theme de CodeMirror** al entrar en la capa (la altura de 320 px a 700 px o menos): el multiconjunto no lo ve. Lo fijan el estado `editor` del barrido en los siete anchos y el control que vuelve las siete reglas a la capa y tiene que dar diferencias (T008).
3. **Una utilidad con el nombre de una clase heredada o de un marcador de la red** cambia el estilo computado (`sr-only` cambiaría el `clip`). Lo fija la aserción de colisiones de `style-output-check`, y su control saca `@source not inline('visible')` y tiene que dar rojo (T008).
4. **Tailwind escanea fuera de `frontend/src`** y genera utilidades de `specs/` o `docs/`: la compuerta pide la lista de utilidades vacía, y la sonda usa el centinela `bg-[#dedfcc]`, que sólo está en la spec de F15 (T007, S9); `main-entry.spec.ts` fija `source('..')` (T005).
5. **El paso de Lightning CSS de Tailwind reescribe las hojas heredadas** (una condición de `@media` en sintaxis de rango, un prefijo, dos reglas juntadas) aunque el estilo computado no cambie: el multiconjunto resuelto con los contextos en forma canónica (T002) y la aserción de `@media` de `style-output-check` (T003) lo ven; la sonda lo mide antes (T007, S14).

## Unidades y orden

Una sola cola: cada tarea parte de la compuerta de la anterior. K es el agente principal; integra `package.json`, `vite.config.ts`, `main.tsx` y la documentación.

| Unidad | Tareas | Quién | Compuerta |
| --- | --- | --- | --- |
| 0 · La línea base | T001 | K | La red en verde, los supuestos de R15 verificados, la copia de la base |
| 1 · Las herramientas | T002 | implementador | Las cuatro herramientas en `qa/e2e/style-compare/`, `npm run typecheck` y `npm run lint` sin avisos nuevos, el control de determinismo en 0 |
| 2 · Los checks primero | T003, T004 y T005 | implementador | Los dos checks en verde contra la base, con sus controles; `main-entry.spec.ts` y el orden de capas en rojo por la razón esperada |
| 3 · Las dependencias y la sonda | T006 y T007 | K | El permiso, `npm ci` en verde y la sonda escrita en research |
| 4 · La base | T008, T009 y T010 | implementador; K en `main.tsx` y `vite.config.ts` | Las rojas de T005 en verde; el barrido en 0; el multiconjunto resuelto en 0 y 0; los controles con las diferencias que predicen |
| 5 · El cierre | T011, T012 y T013 | K | Los avisos (si hace falta), la documentación, los checks de cierre, el tamaño, la imagen y el PR |

**Vuelta atrás:** el PR se revierte con un `git revert` de su merge. Dentro de la rama, T008 a T010 se revierten juntos con T005 (las rojas vuelven a rojo) y con T006.

**Integración de a uno** (FR-007): si F11b a F11d, F12b, F13, F14, C4 o A4 entran mientras F15a está abierto, F15a rebasa, repite T001 (la base nueva y el control de determinismo) y las comparaciones de T008 a T010. Una hoja nueva de la base se suma a `main.css`, a `ENTRY_IMPORTS` y a `ALLOWED_SHEETS` en su lugar.

## Reglas para todos los agentes

- **Comentarios:** ninguno nuevo en el código, salvo la línea que dice por qué una hoja va sin capa (`code-editor.css`) y la referencia al ADR en las dos exclusiones de `@source not inline`.
- **Nada se edita para que pase una comparación.** Una diferencia del barrido o del multiconjunto se explica con sus propiedades y se corrige en su causa, nunca en el script ni en una declaración.
- **Las copias y las salidas** viven en `$TMPDIR/f15a/` (la base, las copias de los controles y la sonda); no se commitean. Antes de borrar una copia, se borra su enlace a `node_modules` (quickstart.md §1).
- **Los puertos:** el barrido usa 4701 y 4702 y la evidencia, 4703; antes de correrlos, `ss -ltn | grep -E ':470[123]\b'` no imprime nada. Las E2E corren con `E2E_PORT=4193`, u otro libre si dos worktrees corren a la vez.
- **Sin descargas** salvo la de T006, con permiso.

## 0. Unidad 0 · La línea base (K)

### Tarea 0.1 · La línea base y los supuestos (T001)

**Archivos:** `specs/030-f15-tailwind/research.md` («Mediciones de la implementación»). Nada más.

1. **La base** (research.md, R15):
   - `git log --oneline` muestra el merge de F10c. Si no está, se para.
   - `grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts` imprime `1500000`.
   - `ls docs/adr` da el número libre siguiente; se espera `0010`. Si es otro, el ADR y este plan usan ese.
   - `sed -n '1,90p' frontend/styles.css` muestra el `:root` con los 61 tokens y los 13 alias, y el bloque de Go con tres y tres. Se compara cada token con `qa/fixtures/theme-tokens-f10c.json` de T003 (el bloque de T042 de F10c).
   - `frontend/src/app/main-entry.spec.ts` existe y su `BASE_SHEETS` tiene `'./shell/shell.css'` segunda. Se copia la lista entera: es la que usan `main.css`, `ENTRY_IMPORTS` y `ALLOWED_SHEETS`, en ese orden.
   - `grep -rn '\.cm-' frontend --include=*.css` encuentra sólo las nueve reglas `.cm-enhanced …` de la hoja del laboratorio (S4). Se anota su archivo y sus líneas.
   - `grep -rn "locator('\.sr-only')\|toHaveClass(/\\\\bvisible" qa/e2e` encuentra la R5 de `css-contract` y el toast de F10a (S5).
   - `grep -c '<style' dist/index.html` después del build da 1 (S8; sin C4).
2. **La red y las medidas** (quickstart.md §1): `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4193 npm run test:e2e`, en verde. Se anotan las E2E, las pruebas de Vitest, los avisos de complejidad (`npm run lint 2>&1 | grep -c complexity`) y las medidas del dist: `chars`, los hashes del script, del estilo y del marcado, y la cantidad de `<style>` y `<script>`.
3. **Las condiciones de `@media` de la base:** el comando de quickstart.md §1, paso 3, imprime el conjunto de condiciones del dist en forma canónica. Se espera el de research.md, «Línea base de planificación» (18); si la base trae otro, `BASE_MEDIA` de T003 y las variantes de T010 usan el de la base.
4. **La copia de la base:** `git worktree add --detach "$TMPDIR/f15a/base" HEAD`, el enlace a `node_modules` y `npm run build` en la copia (quickstart.md §1, paso 4).
5. **El commit:** `docs(specs): la línea base de la implementación de F15a`, con lo anotado.

**Compuerta:** la red en verde y cada supuesto de R15 verificado o resuelto.

## 1. Unidad 1 · Las herramientas de comparación (FR-001, FR-022)

### Tarea 1.1 · El barrido, la grilla, la evidencia y el multiconjunto resuelto, en el repositorio (T002)

**Archivos:** `qa/e2e/style-compare/grid.ts`, `style-sweep.ts`, `rule-evidence.ts` y `resolved-multiset.ts` (nuevos), `qa/lib/css-blocks.ts` (sólo `canonicalMedia`, que T003 completa) y `qa/e2e/tsconfig.json`.

**Consume:** los bloques de código de `specs/024-f10-shell/quickstart-f10c.md` en `master`: §3.2 (`grid.mjs`), §3.3 (`style-sweep.mjs`), §3.4 (`rule-evidence.mjs`) y §3.7 (`resolved-multiset.mjs`).

**Produce:** cuatro herramientas que se corren con `node qa/e2e/style-compare/<herramienta>.ts <raíz base> <raíz comparada>`, con la misma salida que en F10c más `newTokens` y `removedTokens` por nombre.

1. **`qa/e2e/tsconfig.json`:** en `compilerOptions`, `"allowImportingTsExtensions": true` (Node exige la extensión en los imports relativos; `noEmit` ya viene de la raíz).
2. **La copia.** Cada bloque se copia sin cambios a su archivo `.ts`; los imports entre ellos pasan de `'./grid.mjs'` a `'./grid.ts'`. Después se agregan los tipos mínimos que pide el modo estricto (los parámetros de cada función y los `Record<string, string>` de los estilos), sin cambiar la lógica. Toda llamada a `createRequire(…)` se asigna a `load`, no a `require`, y se usa como `load('postcss')` (la regla `no-require-imports`).
3. **`grid.ts`:** el estado nuevo, al final de `ALL_STATES`:

   ```ts
   {
     name: 'editor',
     path: '/?ejercicio=rust-02&paso=code#laboratorio',
     main: 'lab',
     ready: () => document.querySelector('.cm-editor') !== null,
   },
   ```

4. **`style-sweep.ts`:**
   - `readStyles` lee también los pseudoelementos con contenido. Dentro del `for` de los elementos, después de `out[keyOf(element)] = properties;`:

     ```ts
     for (const pseudo of ['::before', '::after']) {
       const pseudoStyle = getComputedStyle(element, pseudo);
       if (pseudoStyle.getPropertyValue('content') === 'none') continue;
       const pseudoProperties: Record<string, string> = {};
       for (let index = 0; index < pseudoStyle.length; index++)
         pseudoProperties[pseudoStyle[index]] = pseudoStyle.getPropertyValue(pseudoStyle[index]);
       out[keyOf(element) + pseudo] = pseudoProperties;
     }
     ```

   - El conteo de propiedades separa las que aparecen y las que desaparecen. El bloque del `for (const property …)` queda así, con `const removedTokens = new Set<string>();` junto a `newTokens`:

     ```ts
     if (first[property] === second[property]) continue;
     if (property.startsWith('--') && !(property in first)) {
       newTokens.add(property);
       continue;
     }
     if (property.startsWith('--') && !(property in second)) {
       removedTokens.add(property);
       continue;
     }
     differences++;
     ```

   - La salida informa los nombres:

     ```ts
     console.log(
       JSON.stringify({
         snapshots,
         elements,
         differences,
         byState,
         newTokens: [...newTokens].sort(),
         removedTokens: [...removedTokens].sort(),
         unhandled: [...unhandled],
       }),
     );
     ```

   - Si `readStyles` pasa de 10 de complejidad con el agregado, el bloque de los pseudoelementos va a una función `readPseudo(element: Element, pseudo: string): Record<string, string> | undefined` dentro de `readStyles` (las funciones que se pasan a `page.evaluate` no pueden usar nada de afuera).
5. **`resolved-multiset.ts`:**
   - **Los tokens:** se leen de toda regla cuyo selector incluye `:root`, fuera de un `@media`, en cualquier capa. El `walkRules` de los tokens queda así:

     ```ts
     parsed.walkRules((rule) => {
       if (!rule.selectors.includes(':root') || insideMedia(rule)) return;
       for (const decl of rule.nodes)
         if (decl.type === 'decl' && decl.prop.startsWith('--')) tokens.set(decl.prop, decl.value.trim());
     });
     ```

   - **Las reglas que se comparan:** sólo las heredadas, con el contexto en forma canónica y sin la capa. Al principio de `tuples()`, antes de los dos `walkRules`:

     ```ts
     const insideMedia = (node) => {
       for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent)
         if (parent.type === 'atrule' && parent.name === 'media') return true;
       return false;
     };
     const layerOf = (node) => {
       for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent)
         if (parent.type === 'atrule' && parent.name === 'layer') return parent.params.trim();
       return undefined;
     };
     ```

     y en el `walkRules` de las tuplas, primero `const layer = layerOf(rule); if (layer !== undefined && layer !== 'legacy') return;`, y el contexto se arma sólo con las at-rules que no son `@layer`, cada `@media` con `canonicalMedia` de `qa/lib/css-blocks.ts`:

     ```ts
     for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent)
       if (parent.type === 'atrule' && parent.name !== 'layer')
         context.unshift(parent.name === 'media' ? '@media ' + canonicalMedia(parent.params) : '@' + parent.name + ' ' + parent.params);
     ```

   - `insideMedia` y `layerOf` reciben el nodo de `postcss` (sin tipos: `load('postcss')` es `any`), así que sus parámetros van tipados como `{ parent?: unknown }` o se anotan con el tipo que exporte la copia; lo que pida `tsc` sin cambiar la lógica.
6. **`qa/lib/css-blocks.ts`** nace con la función que comparten la herramienta y el check (T003 suma el lector):

   ```ts
   export function canonicalMedia(prelude: string): string {
     return prelude
       .toLowerCase()
       .replace(/^@media/, '')
       .replace(/\s+/g, '')
       .replaceAll('(max-width:', '(width<=')
       .replaceAll('(min-width:', '(width>=');
   }
   ```

   `resolved-multiset.ts` la importa con `import { canonicalMedia } from '../../lib/css-blocks.ts';`.
7. **Correr:** `npm run typecheck` y `npm run lint`, con el mismo total de avisos de complejidad que en T001. El control de determinismo con la herramienta promovida (quickstart.md §3.1 a): `differences: 0`, `newTokens: []`, `removedTokens: []` y `unhandled: []`, en la grilla entera. `PAGES=editor WIDTHS=375 node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15a/base" "$TMPDIR/f15a/base"` llega a la condición de listo del estado `editor`.
8. **Checks:** `npx prettier --check qa/e2e/style-compare qa/lib/css-blocks.ts qa/e2e/tsconfig.json` y `git diff --check`.
9. **Commit:** `test(qa): las herramientas de comparación de estilo de F10c, en el repositorio`.

**Compuerta:** las cuatro herramientas tipadas y sin avisos nuevos; el control de determinismo en 0 con el estado `editor`.

## 2. Unidad 2 · Los checks primero

### Tarea 2.1 · El lector de CSS, la fixture de los tokens y lo que sale en el CSS construido (T003)

**Archivos:** `qa/lib/css-blocks.ts` (completa), `qa/fixtures/theme-tokens-f10c.json` (nueva, congelada), `qa/style-output-check.ts` (nuevo) y `qa/run-checks.ts`.

**Produce:** `readCss(css: string): CssSheet` y `classesOf(selector: string): string[]` en `qa/lib/css-blocks.ts`; el check en la suite web.

1. **`qa/lib/css-blocks.ts`**, entero (con `canonicalMedia` de T002):

   ```ts
   export interface CssDeclaration {
     readonly property: string;
     readonly value: string;
     readonly important: boolean;
   }

   export interface CssRule {
     readonly context: readonly string[];
     readonly prelude: string;
     readonly declarations: readonly CssDeclaration[];
   }

   export interface CssSheet {
     readonly rules: readonly CssRule[];
     readonly groups: readonly string[];
     readonly statements: readonly string[];
     readonly layerNames: readonly string[];
   }

   interface ReaderState {
     readonly rules: CssRule[];
     readonly groups: string[];
     readonly statements: string[];
     readonly layerNames: string[];
     readonly context: string[];
     buffer: string;
     openRule: string | undefined;
   }

   const GROUP_AT_RULES = new Set([
     'media',
     'supports',
     'layer',
     'container',
     'keyframes',
     'scope',
     'starting-style',
   ]);

   export function canonicalMedia(prelude: string): string {
     return prelude
       .toLowerCase()
       .replace(/^@media/, '')
       .replace(/\s+/g, '')
       .replaceAll('(max-width:', '(width<=')
       .replaceAll('(min-width:', '(width>=');
   }

   export function classesOf(selector: string): string[] {
     return [...selector.matchAll(/\.((?:\\.|[\w-])+)/g)].map((match) =>
       (match[1] ?? '').replace(/\\(.)/g, '$1'),
     );
   }

   function isGroup(prelude: string): boolean {
     const name = /^@(?:-\w+-)?([\w-]+)/.exec(prelude)?.[1]?.toLowerCase();
     return name !== undefined && GROUP_AT_RULES.has(name);
   }

   function declareLayers(state: ReaderState, prelude: string): void {
     if (!/^@layer\b/.test(prelude)) return;
     for (const name of prelude.replace(/^@layer/, '').split(',')) {
       const trimmed = name.trim();
       if (trimmed !== '' && !state.layerNames.includes(trimmed)) state.layerNames.push(trimmed);
     }
   }

   function splitDeclarations(block: string): string[] {
     const parts: string[] = [];
     let depth = 0;
     let current = '';
     for (const char of block) {
       if (char === '(') depth++;
       if (char === ')') depth--;
       if (char === ';' && depth === 0) {
         parts.push(current);
         current = '';
       } else current += char;
     }
     return [...parts, current];
   }

   function parseDeclarations(block: string): CssDeclaration[] {
     return splitDeclarations(block)
       .map((part) => part.trim())
       .filter((part) => part !== '')
       .map((part) => {
         const colon = part.indexOf(':');
         if (colon < 0) throw new Error(`a declaration without a colon: ${part}`);
         const raw = part.slice(colon + 1).trim();
         const important = /!\s*important$/i.test(raw);
         return {
           property: part.slice(0, colon).trim(),
           value: important ? raw.replace(/!\s*important$/i, '').trim() : raw,
           important,
         };
       });
   }

   function openBlock(state: ReaderState): void {
     const prelude = state.buffer.trim();
     state.buffer = '';
     if (state.openRule !== undefined)
       throw new Error(`a block inside ${state.openRule}: the reader expects flat CSS`);
     if (!isGroup(prelude)) {
       state.openRule = prelude;
       return;
     }
     state.context.push(prelude);
     state.groups.push(prelude);
     declareLayers(state, prelude);
   }

   function closeBlock(state: ReaderState): void {
     if (state.openRule === undefined) state.context.pop();
     else
       state.rules.push({
         context: [...state.context],
         prelude: state.openRule,
         declarations: parseDeclarations(state.buffer),
       });
     state.openRule = undefined;
     state.buffer = '';
   }

   function endStatement(state: ReaderState): void {
     if (state.openRule !== undefined) {
       state.buffer += ';';
       return;
     }
     const statement = state.buffer.trim();
     state.buffer = '';
     if (statement === '') return;
     state.statements.push(statement);
     declareLayers(state, statement);
   }

   const HANDLERS: Readonly<Record<string, (state: ReaderState) => void>> = {
     '{': openBlock,
     '}': closeBlock,
     ';': endStatement,
   };

   function closingQuote(css: string, start: number): number {
     for (let index = start + 1; index < css.length; index++) {
       if (css[index] === '\\') index++;
       else if (css[index] === css[start]) return index;
     }
     return css.length - 1;
   }

   function step(css: string, index: number, state: ReaderState): number {
     const char = css[index] ?? '';
     if (css.startsWith('/*', index)) {
       const end = css.indexOf('*/', index + 2);
       return end < 0 ? css.length : end + 2;
     }
     if (char === '\\' || char === '"' || char === "'") {
       const end = char === '\\' ? index + 1 : closingQuote(css, index);
       state.buffer += css.slice(index, end + 1);
       return end + 1;
     }
     const handler = HANDLERS[char];
     if (handler === undefined) state.buffer += char;
     else handler(state);
     return index + 1;
   }

   export function readCss(css: string): CssSheet {
     const state: ReaderState = {
       rules: [],
       groups: [],
       statements: [],
       layerNames: [],
       context: [],
       buffer: '',
       openRule: undefined,
     };
     let index = 0;
     while (index < css.length) index = step(css, index, state);
     return state;
   }
   ```

   `splitDeclarations` no mira comillas: el lector ya copió cada cadena entera al `buffer`, y un `;` dentro de una cadena de una declaración (como `content: ';'`) no aparece en las hojas del taller ni en las utilidades del plan. Si aparece, el error de `parseDeclarations` lo dice.

2. **`qa/fixtures/theme-tokens-f10c.json`**, los 61 tokens del bloque de T042 de F10c (`specs/024-f10-shell/plan-f10c.md`, Tarea 3.2), en ese orden:

   ```json
   {
     "--color-paper": "#f6f3ed",
     "--color-surface": "#fffdf8",
     "--color-ink": "#272c28",
     "--color-muted": "#656b60",
     "--color-line": "#dddcd2",
     "--color-accent": "#ac4829",
     "--color-accent-dark": "#86341d",
     "--color-accent-soft": "#f1e3d8",
     "--color-sage": "#e8ecdf",
     "--color-green": "#38614a",
     "--color-white": "white",
     "--color-sidebar": "#eeeee5",
     "--color-nav-hover": "#e4e6dc",
     "--color-switch-line": "#cccfc2",
     "--color-recommended": "#e69a70",
     "--color-count-ink": "#fff9ef",
     "--color-count-current": "#d4a280",
     "--color-count-current-ink": "#222b23",
     "--color-track": "#d7dace",
     "--color-line-strong": "#bdc4b3",
     "--color-check-line": "#b9bfae",
     "--color-backdrop": "#20282088",
     "--font-serif": "Georgia, 'Times New Roman', serif",
     "--font-sans": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
     "--font-mono": "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
     "--text-8": "8px",
     "--text-9": "9px",
     "--text-10": "10px",
     "--text-11": "11px",
     "--text-12": "12px",
     "--text-13": "13px",
     "--text-14": "14px",
     "--text-15": "15px",
     "--text-16": "16px",
     "--text-20": "20px",
     "--text-21": "21px",
     "--text-22": "22px",
     "--text-23": "23px",
     "--text-24": "24px",
     "--text-26": "26px",
     "--text-29": "29px",
     "--text-30": "30px",
     "--text-31": "31px",
     "--text-35": "35px",
     "--text-40": "40px",
     "--text-48": "48px",
     "--font-weight-400": "400",
     "--font-weight-500": "500",
     "--font-weight-550": "550",
     "--font-weight-650": "650",
     "--container-main": "1330px",
     "--spacing-sidebar": "240px",
     "--spacing-sidebar-compact": "205px",
     "--spacing-topbar": "88px",
     "--spacing-topbar-compact": "68px",
     "--spacing-topbar-phone": "61px",
     "--spacing-gutter": "52px",
     "--spacing-gutter-compact": "32px",
     "--spacing-gutter-phone": "20px",
     "--shadow-dialog": "0 20px 90px #20282033",
     "--shadow-toast": "0 5px 25px #0002"
   }
   ```

   Si T001 encontró otro valor en la base, manda el de la base, con la línea en research. Está congelada: no se regenera desde el dist (`qa/AGENTS.md`, «Red de seguridad»).

3. **`qa/style-output-check.ts`** (esta versión; T005 y T008 le suman una función cada una):

   ```ts
   import assert from 'node:assert/strict';
   import fs from 'node:fs';
   import path from 'node:path';
   import { readBuiltPage } from './lib/built-page.ts';
   import { canonicalMedia, type CssRule, type CssSheet, readCss } from './lib/css-blocks.ts';
   import { repoRoot as root } from './lib/sources.ts';

   type ThemeTokens = Readonly<Record<string, string>>;

   const BASE_MEDIA: readonly string[] = [
     '(max-width: 1200px)',
     '(max-width: 1150px)',
     '(max-width: 1100px)',
     '(max-width: 1050px)',
     '(max-width: 1000px)',
     '(max-width: 970px)',
     '(max-width: 850px)',
     '(max-width: 700px)',
     '(max-width: 680px)',
     '(max-width: 650px)',
     '(max-width: 590px)',
     '(max-width: 460px)',
     '(min-width: 981px)',
     '(min-width: 1500px)',
     '(min-width: 1550px)',
     'print',
     '(prefers-reduced-motion: reduce)',
     '(prefers-reduced-motion: no-preference)',
   ];

   function builtStyle(): string {
     const styles = [...readBuiltPage().html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
     assert.equal(styles.length, 1, 'the dist carries one <style>: run npm run build first');
     return styles[0]?.[1] ?? '';
   }

   function canonicalValue(value: string): string {
     return value.replace(/\s+/g, '').replaceAll("'", '"').toLowerCase();
   }

   function inLayer(rule: CssRule, name: string): boolean {
     return rule.context.some((group) => group.replace(/\s+/g, ' ') === `@layer ${name}`);
   }

   function utilities(sheet: CssSheet): CssRule[] {
     return sheet.rules.filter((rule) => inLayer(rule, 'utilities'));
   }

   function rootDeclarations(sheet: CssSheet): Map<string, string> {
     const values = new Map<string, string>();
     for (const rule of sheet.rules)
       if (rule.prelude.split(',').some((selector) => selector.trim() === ':root'))
         for (const declaration of rule.declarations)
           values.set(declaration.property, declaration.value);
     return values;
   }

   function assertTokens(sheet: CssSheet, tokens: ThemeTokens): void {
     const declared = rootDeclarations(sheet);
     const wrong = Object.entries(tokens)
       .filter(([name, value]) => canonicalValue(declared.get(name) ?? '') !== canonicalValue(value))
       .map(([name, value]) => `${name}: expected ${value}, found ${declared.get(name) ?? 'nothing'}`);
     assert.deepEqual(wrong, [], 'every token of F10c reaches the output with its value (FR-038)');
   }

   function assertThemeWithoutDefaults(sheet: CssSheet, tokens: ThemeTokens): void {
     const allowed = new Set([...Object.keys(tokens), '--spacing']);
     const declarations = sheet.rules
       .filter((rule) => inLayer(rule, 'theme'))
       .flatMap((rule) => rule.declarations);
     const strangers = declarations
       .map((declaration) => declaration.property)
       .filter((property) => !allowed.has(property));
     assert.deepEqual(strangers, [], 'the theme carries only the tokens and --spacing (FR-015)');
     const spacing = declarations.find((declaration) => declaration.property === '--spacing');
     if (spacing !== undefined) assert.equal(spacing.value, '4px', '--spacing is 4px (Q3-A)');
   }

   function assertNoPreflight(sheet: CssSheet): void {
     const preflight = sheet.rules.filter((rule) => rule.prelude.includes('::file-selector-button'));
     assert.deepEqual(
       preflight.map((rule) => rule.prelude),
       [],
       'no preflight rule reaches the output before F15c (FR-014)',
     );
   }

   function assertUtilitiesWithoutImportant(sheet: CssSheet): void {
     const important = utilities(sheet)
       .filter((rule) => rule.declarations.some((declaration) => declaration.important))
       .map((rule) => rule.prelude);
     assert.deepEqual(important, [], 'no utility uses the ! modifier (FR-005)');
   }

   function assertFontSizesKeepLineHeight(sheet: CssSheet): void {
     const offenders = utilities(sheet)
       .filter((rule) =>
         rule.declarations.some((declaration) => /--text-[\w-]+--line-height/.test(declaration.value)),
       )
       .map((rule) => rule.prelude);
     assert.deepEqual(
       offenders,
       [],
       'a font size utility keeps the line height: use text-(length:--text-N) (FR-015)',
     );
   }

   function mediaOf(sheet: CssSheet): string[] {
     return [
       ...new Set(sheet.groups.filter((group) => /^@media\b/i.test(group)).map(canonicalMedia)),
     ];
   }

   function assertHoverWithAnyPointer(sheet: CssSheet): void {
     const hover = mediaOf(sheet).filter((condition) => condition.includes('(hover:hover)'));
     assert.deepEqual(hover, [], ':hover applies with any pointer, as today (FR-020)');
   }

   function assertMediaOfTheBase(sheet: CssSheet): void {
     const known = new Set(BASE_MEDIA.map(canonicalMedia));
     const added = mediaOf(sheet).filter((condition) => !known.has(condition));
     assert.deepEqual(added, [], 'the output keeps the @media conditions of the base (FR-019)');
   }

   const tokens = JSON.parse(
     fs.readFileSync(path.join(root, 'qa', 'fixtures', 'theme-tokens-f10c.json'), 'utf8'),
   ) as ThemeTokens;
   const sheet = readCss(builtStyle());

   assertTokens(sheet, tokens);
   assertThemeWithoutDefaults(sheet, tokens);
   assertNoPreflight(sheet);
   assertUtilitiesWithoutImportant(sheet);
   assertFontSizesKeepLineHeight(sheet);
   assertHoverWithAnyPointer(sheet);
   assertMediaOfTheBase(sheet);

   const rules = utilities(sheet);
   const arbitrary = rules.filter((rule) => rule.prelude.includes('\\[')).length;
   console.log(
     `${rules.length} utility rules (${arbitrary} with an arbitrary value); tokens, theme, media and hover as in the base. PASS`,
   );
   ```

   `BASE_MEDIA` es la lista de T001, paso 3; la de arriba es la de `master` (`bb480677`).
4. **`qa/run-checks.ts`:** `'style-output-check.ts',` en `webChecks`, justo después de `'build-check.ts',`.
5. **Correr contra la base:** `npm run build` y `node qa/style-output-check.ts` → `0 utility rules (0 with an arbitrary value); … PASS`. Si un token sólo difiere en la forma (por ejemplo, `white` contra `#fff`), se escribe en la fixture en la forma del dist y se anota en research, con el color que es; cualquier otra diferencia se para y se informa: es un token que la base no tiene.
6. **Los controles, una vez y sin commitear.** El check lee el dist de la raíz donde corre, así que van en una copia de la rama (`git worktree add --detach "$TMPDIR/f15a/control" HEAD`, el enlace a `node_modules` y `npm run build`), editando a mano su `dist/index.html` y corriendo `node qa/style-output-check.ts` desde la copia:
   - sin `--color-sage:#e8ecdf;` en el `<style>`, tiene que fallar con `--color-sage: expected #e8ecdf, found nothing`;
   - con `@media (width<590px){a{color:red}}` agregado al `<style>`, tiene que fallar con `the output keeps the @media conditions of the base (FR-019)` y el `(width<590px)`.
7. **Checks:** `npm run typecheck`, `npm run lint` (sin avisos nuevos), `npx prettier --check qa/lib/css-blocks.ts qa/style-output-check.ts qa/fixtures/theme-tokens-f10c.json qa/run-checks.ts` y `npm test`.
8. **Commit:** `test(qa): el CSS construido conserva los tokens, las condiciones y el hover de la base`.

### Tarea 2.2 · La lista cerrada de hojas (T004)

**Archivos:** `qa/stylesheets-check.ts` (nuevo) y `qa/run-checks.ts`.

1. **`qa/stylesheets-check.ts`.** `ALLOWED_SHEETS` es la lista de T001, con la ruta desde la raíz del repositorio, en el orden de `BASE_SHEETS`; la de abajo es la que deja el plan de F10c:

   ```ts
   import assert from 'node:assert/strict';
   import fs from 'node:fs';
   import path from 'node:path';
   import { repoRoot as root } from './lib/sources.ts';

   const ALLOWED_SHEETS: readonly string[] = [
     'frontend/styles.css',
     'frontend/src/app/shell/shell.css',
     'frontend/src/pages/route/ui/route.css',
     'frontend/src/pages/library/ui/library.css',
     'frontend/src/pages/project/ui/project.css',
     'frontend/src/pages/method/ui/method.css',
     'frontend/src/pages/lab/ui/lab.css',
     'frontend/src/pages/lab/ui/lab-page.css',
     'frontend/src/pages/atlas/ui/atlas.css',
     'frontend/src/pages/campaign/ui/campaign-page.css',
     'frontend/src/pages/lab/ui/quest-explorers.css',
     'frontend/src/pages/systems/ui/systems.css',
     'frontend/src/shared/ui/form/form.css',
     'frontend/src/entities/privacy-notice/ui/privacy-notice.css',
     'frontend/src/features/sign-in/ui/access.css',
     'frontend/src/pages/account/ui/account.css',
     'frontend/src/pages/admin/ui/admin.css',
   ];

   const found = fs
     .readdirSync(path.join(root, 'frontend'), { recursive: true, encoding: 'utf8' })
     .filter((file) => file.endsWith('.css'))
     .map((file) => ['frontend', ...file.split(path.sep)].join('/'))
     .sort();

   const unexpected = found.filter((file) => !ALLOWED_SHEETS.includes(file));
   const missing = ALLOWED_SHEETS.filter((file) => !found.includes(file));

   assert.deepEqual(
     unexpected,
     [],
     'a stylesheet outside the closed list: new interface uses utilities and tokens (ADR 0010, FR-023)',
   );
   assert.deepEqual(missing, [], 'the closed list names a sheet that no longer exists: drop it (FR-023)');
   console.log(`${found.length} stylesheets, all in the closed list (FR-023). PASS`);
   ```

2. **`qa/run-checks.ts`:** `'stylesheets-check.ts',` en `webChecks`, justo después de `'style-output-check.ts',`.
3. **Correr contra la base:** `node qa/stylesheets-check.ts` → `17 stylesheets, all in the closed list (FR-023). PASS`.
4. **Los controles, una vez y sin commitear:**
   - `touch frontend/src/pages/project/ui/extra.css`: falla con `extra.css` en `unexpected`; se borra el archivo;
   - `mv frontend/src/pages/admin/ui/admin.css frontend/src/pages/admin/ui/admin.txt`: falla con `admin.css` en `missing`; se vuelve a renombrar.
5. **Checks:** `npm run typecheck`, `npm run lint`, `npx prettier --check qa/stylesheets-check.ts qa/run-checks.ts` y `npm test`.
6. **Commit:** `test(qa): las hojas de frontend son una lista cerrada`.

### Tarea 2.3 · La entrada y su orden de capas, en rojo (T005)

**Archivos:** `frontend/src/app/main-entry.spec.ts` (de F10b y F10c) y `qa/style-output-check.ts`.

**Consume:** la lista de T001 (`BASE_SHEETS` de la base).

1. **`main-entry.spec.ts`**, entero. Cada línea de `ENTRY_IMPORTS` es una hoja de `BASE_SHEETS`, en su orden, con `layer(legacy)`:

   ```ts
   import { readFileSync } from 'node:fs';
   import { fileURLToPath } from 'node:url';
   import { describe, expect, it } from 'vitest';

   const LAYER_ORDER = '@layer theme, base, legacy, utilities;';

   const ENTRY_IMPORTS: readonly string[] = [
     "'tailwindcss/theme.css' layer(theme)",
     "'../../styles.css' layer(legacy)",
     "'./shell/shell.css' layer(legacy)",
     "'../pages/route/ui/route.css' layer(legacy)",
     "'../pages/library/ui/library.css' layer(legacy)",
     "'../pages/project/ui/project.css' layer(legacy)",
     "'../pages/method/ui/method.css' layer(legacy)",
     "'../pages/lab/ui/lab.css' layer(legacy)",
     "'../pages/lab/ui/lab-page.css' layer(legacy)",
     "'../pages/atlas/ui/atlas.css' layer(legacy)",
     "'../pages/campaign/ui/campaign-page.css' layer(legacy)",
     "'../pages/lab/ui/quest-explorers.css' layer(legacy)",
     "'../pages/systems/ui/systems.css' layer(legacy)",
     "'../shared/ui/form/form.css' layer(legacy)",
     "'../entities/privacy-notice/ui/privacy-notice.css' layer(legacy)",
     "'../features/sign-in/ui/access.css' layer(legacy)",
     "'../pages/account/ui/account.css' layer(legacy)",
     "'../pages/admin/ui/admin.css' layer(legacy)",
     "'tailwindcss/utilities.css' layer(utilities) source('..')",
     "'../shared/ui/code-editor/code-editor.css'",
   ];

   function read(file: string): string {
     return readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
   }

   function sheetsOf(source: string): string[] {
     return [...source.matchAll(/^import '([^']+\.css)';$/gm)].map((match) => match[1] ?? '');
   }

   function importsOf(css: string): string[] {
     return [...css.matchAll(/^@import (.+);$/gm)].map((match) => match[1] ?? '');
   }

   describe('the entry module', () => {
     it('main.tsx imports the CSS entry and no other sheet', () => {
       expect(sheetsOf(read('./main.tsx'))).toEqual(['./main.css']);
     });

     it('main.css declares the layers first and imports the sheets of the base in their order', () => {
       const css = read('./main.css');
       expect(css.split('\n')[0]).toBe(LAYER_ORDER);
       expect(importsOf(css)).toEqual(ENTRY_IMPORTS);
     });
   });
   ```

2. **`qa/style-output-check.ts`:** la función del orden de capas, antes de las llamadas, y su llamada después de `assertNoPreflight(sheet);`:

   ```ts
   const LAYERS: readonly string[] = ['theme', 'base', 'legacy', 'utilities'];

   function assertLayerOrder(sheet: CssSheet): void {
     const ours = sheet.layerNames.filter((name) => name !== 'properties');
     assert.deepEqual(ours, LAYERS, 'the output orders theme, base, legacy and utilities (FR-011)');
     assert(
       sheet.layerNames.indexOf('properties') <= 0,
       "Tailwind's properties layer, if any, goes before theme",
     );
   }
   ```

   ```ts
   assertLayerOrder(sheet);
   ```

3. **Correr y ver el fallo esperado:**
   - `npx vitest run --config frontend/vitest.config.ts --project node main-entry`: la primera prueba falla porque `main.tsx` importa las 17 hojas; la segunda, porque `main.css` no existe (`ENOENT`).
   - `node qa/style-output-check.ts`: falla en `assertLayerOrder` con `[]` contra `['theme', 'base', 'legacy', 'utilities']`, porque el CSS de la base no tiene capas.
4. **Checks:** `npm run lint` y `npx prettier --check frontend/src/app/main-entry.spec.ts qa/style-output-check.ts`.
5. **Commit:** `test(front): la entrada de CSS con sus capas y el orden de la base (roja)`.

## 3. Unidad 3 · Las dependencias y la sonda (K)

### Tarea 3.1 · Las dependencias, con permiso (T006)

**Archivos:** `package.json` y `package-lock.json`.

1. **El permiso.** K pide al usuario, en el chat, la descarga con la tabla de research.md, R12: `tailwindcss` 4.3.3 y `@tailwindcss/vite` 4.3.3, del registro de npm (`https://registry.npmjs.org/`), MIT, con sus dependencias (unos 15,6 MB en Linux con glibc; `lightningcss` 1.32.0, MPL-2.0, como copia anidada; `graceful-fs`, ISC). Sin el sí, se para.
2. **La instalación:** `npm install --save-dev --save-exact --no-audit --no-fund tailwindcss@4.3.3 @tailwindcss/vite@4.3.3`.
3. **Verificar:**
   - `git diff package.json` muestra exactamente dos líneas nuevas en `devDependencies`, sin `^`;
   - `node -e 'const l=require("./package-lock.json").packages; for (const k of Object.keys(l)) if (/oxide-linux-x64-(gnu|musl)|oxide-darwin-arm64|lightningcss-linux-x64-musl/.test(k)) console.log(k, l[k].version)'` imprime las variantes de Linux con glibc y musl y la de macOS, para que `npm ci` funcione en la CI, en la imagen y en macOS (FR-009);
   - `rm -rf node_modules && npm ci --no-audit --no-fund` termina en verde;
   - `npm run build` y `npm test`, en verde: el dist no cambia todavía (el plugin no está en `vite.config.ts`), así que los hashes son los de T001.
4. **Commit:** `build(deps): tailwindcss y @tailwindcss/vite 4.3.3, exactas, de desarrollo`.

### Tarea 3.2 · La sonda (T007, sin commit de código)

**Archivos:** `specs/030-f15-tailwind/research.md` («Mediciones de la implementación», la tabla de R10 con su resultado).

1. **La copia:** `git worktree add --detach "$TMPDIR/f15a/probe" HEAD`, el enlace a `node_modules`.
2. **En la copia:** `vite.config.ts` con el plugin (T008, paso 1), `main.tsx` con `import './main.css';`, y `main.css` con el texto completo que deja T010 (las tres tareas de la unidad 4), más estas líneas después de las de `@source not inline`:

   ```css
   @source inline('text-12 text-(length:--text-12) text-[28px] leading-[1.8] tracking-[1.4px] font-500 font-mono italic');
   @source inline('p-5 p-[30px] m-0 ml-8 gap-3 w-[18px] h-px max-w-[750px] grid-cols-[1fr_1fr]');
   @source inline('print:block motion-safe:block motion-reduce:block upto-850:block upto-590:block hover:bg-ink');
   @source inline('bg-ink bg-current bg-transparent text-white border border-line border-t rounded-[7px]');
   @source inline("checked:bg-green checked:after:content-['✓'] shadow-(--shadow-dialog) rounded-[50%]");
   @source inline('[transform:translateY(-3px)] [transition:opacity_0.2s,transform_0.2s]');
   ```

   Y una spec de prueba, `frontend/src/probe.spec.ts`, con `const probe = 'zzprobe-spec-only';`, para S10.
3. **El build y la lectura:** `npm run build` en la copia, y el script de quickstart.md §4, que imprime con `css-blocks` cada regla de `@layer utilities`, las capas en orden, las condiciones de `@media`, el comienzo del `<style>` (S13) y si aparecen `bg-[#dedfcc]` (S9) o `zzprobe-spec-only` (S10).
4. **El multiconjunto resuelto (S14):** en la copia, `main.css` sin las líneas de `@source inline`, `npm run build`, y `node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15a/base" "$TMPDIR/f15a/probe"`.
5. **El control de los tokens sin `static` (S11):** en la copia, `@theme static` pasa a `@theme`, `npm run build` y `node qa/style-output-check.ts` (desde la copia).
6. **Lo que se anota:** el resultado de cada fila de R10 y, si no dio lo esperado, la alternativa que se aplica en T008 a T010 o en la receta de F15b. Las filas con «se para» detienen F15a hasta que K decida con el usuario.
7. **El commit:** `docs(specs): la sonda de Tailwind 4.3.3 de F15a`. La copia se borra (quickstart.md §1, paso 6).

## 4. Unidad 4 · La base

### Tarea 4.1 · La entrada con la capa heredada, el editor fuera y las colisiones resueltas (T008, con K en `vite.config.ts` y `main.tsx`)

**Archivos:** `frontend/vite.config.ts` (K), `frontend/src/app/main.tsx` (K), `frontend/src/app/main.css` (nueva), `frontend/src/shared/ui/code-editor/code-editor.css` (nueva), la hoja del laboratorio de T001 (`frontend/src/pages/lab/ui/lab.css` según el plan de F7b), `qa/style-output-check.ts` y `qa/stylesheets-check.ts`.

1. **`vite.config.ts` (K):** `import tailwindcss from '@tailwindcss/vite';` junto a los demás imports de plugins, y la lista de plugins queda `[react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true }), webRootFiles()]`.
2. **`main.tsx` (K):** las 17 líneas `import '….css';` se reemplazan por una sola, `import './main.css';`, en el mismo lugar.
3. **`code-editor.css`**, con las siete reglas cortadas de la hoja del laboratorio, con su texto exacto (si la base trae otro, manda el de la base):

   ```css
   .cm-enhanced .cm-editor {
     min-width: 0;
     height: 390px;
     width: 100%;
   }
   .cm-enhanced .cm-scroller {
     overflow: auto;
     font-family: var(--mono);
     font-size: 13px;
     line-height: 1.8;
   }
   .cm-enhanced .cm-content {
     padding: 20px 0;
   }
   .cm-enhanced .cm-search input {
     max-width: 170px;
   }
   .cm-enhanced .cm-tooltip-autocomplete {
     max-width: min(450px, 80vw);
   }
   @media (max-width: 700px) {
     .cm-enhanced .cm-editor {
       height: 320px;
     }
     .cm-enhanced .cm-scroller {
       font-size: 12px;
     }
   }
   ```

   En la hoja del laboratorio quedan `.editor-wrapper.cm-enhanced`, `.cm-enhanced > .editor-lines` y `.lab-exercise-heading h1:focus`, en su lugar; el `@media (max-width: 700px)` que queda vacío se borra.
4. **`main.css`:**

   ```css
   @layer theme, base, legacy, utilities;

   @import 'tailwindcss/theme.css' layer(theme);
   @import '../../styles.css' layer(legacy);
   @import './shell/shell.css' layer(legacy);
   @import '../pages/route/ui/route.css' layer(legacy);
   @import '../pages/library/ui/library.css' layer(legacy);
   @import '../pages/project/ui/project.css' layer(legacy);
   @import '../pages/method/ui/method.css' layer(legacy);
   @import '../pages/lab/ui/lab.css' layer(legacy);
   @import '../pages/lab/ui/lab-page.css' layer(legacy);
   @import '../pages/atlas/ui/atlas.css' layer(legacy);
   @import '../pages/campaign/ui/campaign-page.css' layer(legacy);
   @import '../pages/lab/ui/quest-explorers.css' layer(legacy);
   @import '../pages/systems/ui/systems.css' layer(legacy);
   @import '../shared/ui/form/form.css' layer(legacy);
   @import '../entities/privacy-notice/ui/privacy-notice.css' layer(legacy);
   @import '../features/sign-in/ui/access.css' layer(legacy);
   @import '../pages/account/ui/account.css' layer(legacy);
   @import '../pages/admin/ui/admin.css' layer(legacy);
   @import 'tailwindcss/utilities.css' layer(utilities) source('..');
   /* Without a layer: these rules compete with the unlayered theme that CodeMirror injects (ADR 0010). */
   @import '../shared/ui/code-editor/code-editor.css';

   @source not '../**/*.spec.ts';
   @source not '../**/*.spec.tsx';
   @source not '../vitest.setup.ts';
   /* The frozen E2E locate these classes (ADR 0010): their utilities would change the computed style. */
   @source not inline('sr-only');
   @source not inline('visible');
   ```

   Si la sonda (S10) dijo que `@source not` no acepta globs, van sólo las dos líneas de `inline`.
5. **`qa/stylesheets-check.ts`:** `ALLOWED_SHEETS` suma `'frontend/src/app/main.css',` primera y `'frontend/src/shared/ui/code-editor/code-editor.css',` última.
6. **`qa/style-output-check.ts`:** las colisiones, antes de las llamadas, y su llamada al final de las aserciones:

   ```ts
   const ENTRY = path.join(root, 'frontend', 'src', 'app', 'main.css');

   function legacySheets(): string[] {
     const entry = fs.readFileSync(ENTRY, 'utf8');
     return [...entry.matchAll(/^@import '([^']+)' layer\(legacy\);$/gm)].map((match) =>
       path.join(path.dirname(ENTRY), match[1] ?? ''),
     );
   }

   function markerClasses(): Set<string> {
     const markers = new Set<string>();
     const directory = path.join(root, 'qa', 'e2e');
     const files = fs
       .readdirSync(directory, { recursive: true, encoding: 'utf8' })
       .filter((file) => file.endsWith('.ts'));
     for (const file of files) {
       const source = fs.readFileSync(path.join(directory, file), 'utf8');
       for (const match of source.matchAll(/locator\(\s*(['"`])(.*?)\1/g))
         for (const name of classesOf(match[2] ?? '')) markers.add(name);
       for (const match of source.matchAll(/toHaveClass\(\s*(['"`/])(.*?)\1/g))
         for (const name of (match[2] ?? '').replaceAll('\\b', ' ').match(/[A-Za-z][\w-]*/g) ?? [])
           markers.add(name);
     }
     return markers;
   }

   function assertNoCollisions(sheet: CssSheet): void {
     const heritage = markerClasses();
     for (const file of legacySheets())
       for (const rule of readCss(fs.readFileSync(file, 'utf8')).rules)
         for (const name of classesOf(rule.prelude)) heritage.add(name);
     const generated = new Set(utilities(sheet).flatMap((rule) => classesOf(rule.prelude)));
     const collisions = [...generated].filter((name) => heritage.has(name));
     assert.deepEqual(
       collisions,
       [],
       'a utility shares its name with a legacy class or a marker of the frozen E2E: block it with @source not inline (FR-018)',
     );
   }
   ```

   ```ts
   assertNoCollisions(sheet);
   ```

   El import de `css-blocks` suma `classesOf`.
7. **Correr:**
   - `npm run build`, `npm test` (con `main-entry.spec.ts` y `style-output-check` en verde: las rojas de T005), `npm run lint` y `npm run format:check`;
   - las medidas del dist: el script y el marcado iguales a los de T001; el estilo distinto; `chars` como mucho T001 + 2 000;
   - la lista de utilidades: `node qa/style-output-check.ts` imprime `0 utility rules`. Si imprime otra cosa, cada utilidad se explica (de qué archivo de `frontend/src` sale) en la línea base del PR; una que cambie el estilo computado es una colisión y se excluye con `@source not inline`;
   - **el barrido**, la grilla entera contra la base: `differences: 0`, `newTokens: []`, `removedTokens: []` y `unhandled: []`;
   - **el multiconjunto resuelto:** `onlyBase: 0` y `onlyUnit: 0`. Una diferencia que sólo sea una declaración pisada que Lightning CSS descartó al juntar dos reglas que el corte dejó contiguas en la hoja del laboratorio (research-f10c.md, R4) se acepta con el barrido en 0 y se lista en el PR; cualquier otra se para;
   - `E2E_PORT=4193 npm run test:e2e`: la red entera.
8. **Los controles, una vez y sin commitear** (quickstart.md §3.3):
   - **el editor:** en una copia de la rama, las siete reglas vuelven a `lab.css` (al final, dentro de la capa) y `code-editor.css` queda vacía. `PAGES=editor node qa/e2e/style-compare/style-sweep.ts . <copia>` tiene que dar diferencias en `editor`: `height` de `.cm-editor` a 650, 590 y 375 px y `padding-top` de `.cm-content` en todos los anchos. Si da 0, el estado `editor` no monta el editor: se para;
   - **la colisión:** en otra copia, sin `@source not inline('visible');`, `npm run build` y `node qa/style-output-check.ts` tienen que fallar con `visible` en `collisions`.
9. **Commit:** `build(front): Tailwind CSS v4 con el CSS de hoy en la capa legacy`.

**Compuerta:** las rojas de T005 en verde, la lista de utilidades vacía o explicada, el barrido en 0, el multiconjunto resuelto en 0 y 0, los dos controles con lo que predicen y la red en verde.

### Tarea 4.2 · Los tokens en `@theme static` (T009)

**Archivos:** `frontend/src/app/main.css` y `frontend/styles.css`.

1. **`styles.css`:** del `:root` salen los 61 tokens (las líneas `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--container-*`, `--spacing-*` y `--shadow-*`). Quedan los 13 alias, en su orden:

   ```css
   :root {
     --paper: var(--color-paper);
     --surface: var(--color-surface);
     --ink: var(--color-ink);
     --muted: var(--color-muted);
     --line: var(--color-line);
     --accent: var(--color-accent);
     --accent-dark: var(--color-accent-dark);
     --accent-soft: var(--color-accent-soft);
     --sage: var(--color-sage);
     --green: var(--color-green);
     --serif: var(--font-serif);
     --sans: var(--font-sans);
     --mono: var(--font-mono);
   }
   ```

   El bloque `body[data-language='go']` no cambia.
2. **`main.css`:** al final, el theme. Los valores son los de la fixture de T003:

   ```css
   @theme static {
     --*: initial;
     --spacing: 4px;
     --color-paper: #f6f3ed;
     --color-surface: #fffdf8;
     --color-ink: #272c28;
     --color-muted: #656b60;
     --color-line: #dddcd2;
     --color-accent: #ac4829;
     --color-accent-dark: #86341d;
     --color-accent-soft: #f1e3d8;
     --color-sage: #e8ecdf;
     --color-green: #38614a;
     --color-white: white;
     --color-sidebar: #eeeee5;
     --color-nav-hover: #e4e6dc;
     --color-switch-line: #cccfc2;
     --color-recommended: #e69a70;
     --color-count-ink: #fff9ef;
     --color-count-current: #d4a280;
     --color-count-current-ink: #222b23;
     --color-track: #d7dace;
     --color-line-strong: #bdc4b3;
     --color-check-line: #b9bfae;
     --color-backdrop: #20282088;
     --font-serif: Georgia, 'Times New Roman', serif;
     --font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
     --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
     --text-8: 8px;
     --text-9: 9px;
     --text-10: 10px;
     --text-11: 11px;
     --text-12: 12px;
     --text-13: 13px;
     --text-14: 14px;
     --text-15: 15px;
     --text-16: 16px;
     --text-20: 20px;
     --text-21: 21px;
     --text-22: 22px;
     --text-23: 23px;
     --text-24: 24px;
     --text-26: 26px;
     --text-29: 29px;
     --text-30: 30px;
     --text-31: 31px;
     --text-35: 35px;
     --text-40: 40px;
     --text-48: 48px;
     --font-weight-400: 400;
     --font-weight-500: 500;
     --font-weight-550: 550;
     --font-weight-650: 650;
     --container-main: 1330px;
     --spacing-sidebar: 240px;
     --spacing-sidebar-compact: 205px;
     --spacing-topbar: 88px;
     --spacing-topbar-compact: 68px;
     --spacing-topbar-phone: 61px;
     --spacing-gutter: 52px;
     --spacing-gutter-compact: 32px;
     --spacing-gutter-phone: 20px;
     --shadow-dialog: 0 20px 90px #20282033;
     --shadow-toast: 0 5px 25px #0002;
   }
   ```

3. **Correr:** `npm run build`, `npm test` (`style-output-check` en verde: cada token con su valor y el theme sin valores por omisión), `npm run lint` y `npm run format:check`; el barrido, la grilla entera: `differences: 0`, `newTokens: ['--spacing']` y `removedTokens: []`; el multiconjunto resuelto en 0 y 0; `chars` como mucho T001 + 2 000; la red entera.
4. **El control, una vez y sin commitear:** en una copia de la rama, `@theme static` pasa a `@theme`, `npm run build` y `node qa/style-output-check.ts`. Lo esperado (S11) es rojo en `assertTokens`, con los tokens que ninguna utilidad usa; el resultado va al PR. Si da verde, se anota que Tailwind cuenta los `var()` de la capa heredada, y `static` se queda igual (FR-038).
5. **Commit:** `build(front): los tokens de F10c son el theme de Tailwind, en @theme static`.

**Compuerta:** cada token en la salida con su valor, el barrido en 0 con `--spacing` como único token nuevo, el multiconjunto resuelto en 0 y 0, y el control documentado.

### Tarea 4.3 · El `:hover` y los anchos de hoy (T010)

**Archivos:** `frontend/src/app/main.css`.

1. **`main.css`:** después de las líneas de `@source`, antes del `@theme`. Una variante por cada condición de `max-width` y de `min-width` de la lista de T001, paso 3; la lista de abajo es la de `master`:

   ```css
   @custom-variant hover (&:hover);

   @custom-variant upto-1200 {
     @media (max-width: 1200px) {
       @slot;
     }
   }
   @custom-variant upto-1150 {
     @media (max-width: 1150px) {
       @slot;
     }
   }
   @custom-variant upto-1100 {
     @media (max-width: 1100px) {
       @slot;
     }
   }
   @custom-variant upto-1050 {
     @media (max-width: 1050px) {
       @slot;
     }
   }
   @custom-variant upto-1000 {
     @media (max-width: 1000px) {
       @slot;
     }
   }
   @custom-variant upto-970 {
     @media (max-width: 970px) {
       @slot;
     }
   }
   @custom-variant upto-850 {
     @media (max-width: 850px) {
       @slot;
     }
   }
   @custom-variant upto-700 {
     @media (max-width: 700px) {
       @slot;
     }
   }
   @custom-variant upto-680 {
     @media (max-width: 680px) {
       @slot;
     }
   }
   @custom-variant upto-650 {
     @media (max-width: 650px) {
       @slot;
     }
   }
   @custom-variant upto-590 {
     @media (max-width: 590px) {
       @slot;
     }
   }
   @custom-variant upto-460 {
     @media (max-width: 460px) {
       @slot;
     }
   }
   @custom-variant from-981 {
     @media (min-width: 981px) {
       @slot;
     }
   }
   @custom-variant from-1500 {
     @media (min-width: 1500px) {
       @slot;
     }
   }
   @custom-variant from-1550 {
     @media (min-width: 1550px) {
       @slot;
     }
   }
   ```

   `print:`, `motion-safe:` y `motion-reduce:` son de Tailwind (S5). Si la sonda dijo otra cosa, se definen igual que las de ancho, con la condición literal.

   Después de `npx prettier --write frontend/src/app/main.css`, la línea de `hover` tiene que seguir igual. Si Prettier la reescribe (por ejemplo, a `(&: hover)`), se usa la forma de bloque, que la documentación muestra para las variantes anidadas: `@custom-variant hover { &:hover { @slot; } }`, y la sonda S7 se repite con esa forma.
2. **Correr:** `npm run build`; el `style` del dist es el mismo de T009 (las variantes no generan nada sin utilidades); `npm test`, `npm run lint` y `npm run format:check`.
3. **La prueba de que hacen lo que dicen:** la sonda de T007 ya leyó la salida de `hover:bg-ink`, `upto-850:block` y `upto-590:block` con este mismo bloque (S6 y S7). Si T010 cambió algo respecto de lo que corrió la sonda, se repite S6 y S7 en una copia.
4. **Commit:** `build(front): el hover con cualquier puntero y los anchos de hoy como variantes`.

## 5. Unidad 5 · El cierre (K)

### Tarea 5.1 · Los avisos de terceros (T011, si la sonda lo pide)

**Archivos:** `frontend/THIRD-PARTY-NOTICES.txt`.

- **Si S13 dio que el `<style>` lleva el aviso de Tailwind** (`/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */`), se agrega una entrada con el formato de las demás: `tailwindcss 4.3.3`, `https://github.com/tailwindlabs/tailwindcss`, y el texto de `node_modules/tailwindcss/LICENSE`. `npm run build` copia el archivo al dist, y `node qa/build-check.ts` sigue en verde (compara los bytes). Commit: `docs(front): el aviso MIT de Tailwind CSS en los avisos de terceros`.
- **Si no lo lleva:** sin commit, con la línea «sin aviso de Tailwind en la salida (T007, S13)» en `tasks.md`. Tailwind no agrega código de runtime al JavaScript (FR-024 sólo pide la entrada si la salida lleva su aviso o su código).

### Tarea 5.2 · El ADR y la documentación (T012, K)

FR-008, FR-025 y FR-026, en el mismo PR:

- **`docs/adr/0010-tailwind-css-v4.md`** (con el número de T001), en estado «propuesta», con la estructura del ADR 0008 (estado, contexto de la decisión, relacionado, «Contexto», «Decisión», «Alternativas», «Consecuencias»). Copia el contenido de la sección «El ADR» de la spec: las diez decisiones, las alternativas descartadas y las consecuencias, más lo que fijó este plan: el nombre de la capa (`legacy`), la entrada (`frontend/src/app/main.css`), las variantes `upto-*` y `from-*`, la hoja del editor sin capa y las clases marcador. Enlaza la spec, este plan y el contrato.
- **`README.md`:** una sección «Navegadores», antes de «Desarrollo»: el taller necesita un navegador con capas de cascada (Chrome 99, Firefox 97 o Safari 15.4 en adelante) y está pensado para Chrome 111, Firefox 128 y Safari 16.4; un navegador anterior muestra el taller sin estilos (R13).
- **`AGENTS.md`:** en «Módulos y frameworks JavaScript», un párrafo nuevo después del de React y Vite: desde F15a, la interfaz nueva se estila con utilidades de Tailwind y los tokens del theme, sin hojas nuevas (`qa/stylesheets-check.ts`); las reglas de valores, tamaños de letra, anchos, `:hover`, marcadores y lo que no se usa (`!`, estilos en línea, concatenar clases, CVA, `clsx`, `tailwind-merge`) están en el contrato de la spec 030; de la skill `tailwind-design-system` no aplican OKLCH, el modo oscuro, los anillos de foco, CVA ni `tailwind-merge`. En «Skills y documentación», la mención de `tailwind-design-system` remite a ese párrafo.
- **`docs/architecture.md`:** el mapa de hojas (la fila del shell y la de estilos) dice que `main.tsx` importa `main.css`, que declara las capas `theme`, `base`, `legacy` y `utilities`; que las hojas de hoy viven en `legacy` hasta que F15b migre su slice; y que `shared/ui/code-editor/code-editor.css` va sin capa. Enlaza el contrato.
- **`qa/AGENTS.md`:** en la tabla «Elegir comprobaciones», la fila «Empaquetado, assets u orden de arranque» suma `node qa/style-output-check.ts` y `node qa/stylesheets-check.ts`; una fila nueva, «Estilos, la entrada de CSS o el theme»: esos dos checks, `main-entry.spec.ts` y las herramientas de `qa/e2e/style-compare/` (quickstart.md §3), que no corren en `npm test`.
- **`specs/024-f10-shell/contracts/stylesheets-f10c.md`:** al principio, una línea que dice que desde F15a manda `specs/030-f15-tailwind/contracts/stylesheets-f15.md`. Es la única edición de otra spec, y la pide el hallazgo F15-5.
- **Comprobar** rutas, comandos y enlaces locales (`git diff --check` y los enlaces relativos).
- **Commit:** `docs(front): el ADR 0010 y cómo se estila con Tailwind desde F15a`.

### Tarea 5.3 · La compuerta y el PR (T013, K)

1. **Los checks de cierre:** `npm run build`, `npm test`, `npm run lint` (con el mismo total de avisos de complejidad que en T001), `npm run format:check`, `E2E_PORT=4193 npm run test:e2e` y `git diff --check`, todo en verde.
2. **Las comparaciones finales,** de la base de T001 contra la rama: el barrido en 0 (`newTokens: ['--spacing']`, `removedTokens: []`), el multiconjunto resuelto en 0 y 0, y la lista de utilidades de la salida (`node qa/style-output-check.ts`).
3. **El tamaño:** `chars` antes y después, bajo 1 500 000 y como mucho **+2 000**.
4. **Sin estilos en línea ni más dependencias:** `git diff <base> -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'` no imprime nada, y `git diff <base> -- package.json` muestra sólo las dos líneas de T006.
5. **La imagen web:** con permiso del usuario, `docker compose build taller` (el `npm ci` de Alpine con musl y `QA_CHECKS=web npm test`, con los dos checks nuevos).
6. **Las copias descartables:** se borran (quickstart.md §1, paso 6).
7. **El PR** (título y descripción en inglés, quickstart.md §5): el problema; la entrada y sus capas; el editor fuera de la capa con su tabla; los tokens en `@theme static` y el control sin `static`; las fuentes; las colisiones y los marcadores; las variantes; los checks y sus controles; la sonda (la tabla de R10 con los resultados); las comparaciones con sus números; el tamaño; el ADR 0010 en «propuesta», que el usuario acepta antes de integrar (FR-026); y lo que sigue (F15b con el piloto).

## Cobertura de requisitos

| Requisito | Tareas | Cómo |
| --- | --- | --- |
| FR-001 | T002, T008, T009 y T013 | El barrido promovido, con `newTokens` y `removedTokens` por nombre, en 0 sobre la grilla con el estado `editor` |
| FR-002 | T005, T008 y T013 | La red sin editar; la única spec que cambia es la del orden (FR-012) |
| FR-003 | T013 | El `grep` de estilos en línea vacío; Tailwind genera el CSS en el build |
| FR-004 | T001, T008, T009 y T013 | Un `<style>`, bajo 1 500 000 y a +2 000 como mucho |
| FR-005 | T003 y T013 | Ninguna utilidad con `!`; `[hidden]` y el movimiento reducido siguen en la capa heredada; el barrido con el movimiento reducido |
| FR-006 | T005 y T013 | Las restricciones abren en rojo; un PR que se revierte entero |
| FR-007 | «Unidades y orden» | Rebasar y repetir T001 y las comparaciones |
| FR-008 | T012 | `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` y el README |
| FR-009 | T006 y T013 | Las dos dependencias exactas, el lockfile con glibc, musl y darwin, `npm ci` y la imagen |
| FR-010 | T007 (S1) y T008 | El CSS de Tailwind en el único `<style>`; `build-check` en verde |
| FR-011 | T005 y T008 | `main.css` y su primera línea; el orden de capas sobre el CSS construido |
| FR-012 | T005 y T008 | Las hojas en `legacy`, en el orden de la base, y la prueba del orden en rojo primero |
| FR-013 | T008 | Las siete reglas en `code-editor.css` sin capa, el estado `editor` y su control |
| FR-014 | T003 y T008 | Sin `preflight.css`; ninguna regla con `::file-selector-button` |
| FR-015 | T003 y T009 | El theme sólo con los tokens y `--spacing: 4px`; ningún interlineado de `text-*` |
| FR-016 | T009 | El bloque de Go sin cambios; los estados en Go del barrido y el E2E de la marca de F10c |
| FR-017 | T005, T007 (S9, S10) y T008 | `source('..')` fijado en `ENTRY_IMPORTS`; el centinela de la spec |
| FR-018 | T008 | `@source not inline` y la aserción de colisiones con su control |
| FR-019 | T003 y T010 | Las condiciones de la base; las variantes `upto-*` y `from-*` |
| FR-020 | T003, T007 (S7) y T010 | `@custom-variant hover (&:hover)` y ningún `(hover: hover)` |
| FR-021 | T012 | La regla en `AGENTS.md` y en el contrato |
| FR-022 | T008, T009 y T013 | El barrido en 0, el multiconjunto resuelto en 0 y 0, el tamaño |
| FR-023 | T004 y T008 | `qa/stylesheets-check.ts` con su control |
| FR-024 | T007 (S13) y T011 | La entrada en los avisos, si la salida lleva el de Tailwind |
| FR-025 | T012 | `AGENTS.md`, el contrato y lo que no aplica de la skill |
| FR-026 | T012 y T013 | El ADR 0010 en «propuesta», aceptado antes de integrar |
| FR-034 | T006 y T013 | Sólo las dos dependencias |
| FR-038 | T003 y T009 | El check de los tokens antes de mover el bloque, y su control sin `static` |
| SC-001, SC-002 | T008, T009 y T013 | La red y el barrido, con el control de determinismo de T002 |
| SC-003 | T008, T009 y T013 | Sin utilidades, el barrido y el multiconjunto en 0, +2 000 como mucho, cada token con su valor |
| SC-005 | T003 y T013 | `style-output-check` |
| SC-006 | T004 | `stylesheets-check` hace cumplir la regla al primer ítem que llegue después |
| SC-007 | T013 | El tamaño antes y después |
| SC-008 | T006 y T013 | Dos dependencias de desarrollo exactas; `npm ci` en la CI y en la imagen |
| SC-009 | T013 | Los checks de cierre y la imagen |

## Descargas y permisos

- **La descarga de T006**, con el permiso del usuario y la tabla de research.md, R12.
- **`docker compose build taller`** en T013, con permiso, como en cada port.
- **Aceptar el ADR 0010** y su piso de navegadores, antes de integrar (FR-026).

## Riesgos

1. **Algo de la sonda no da lo esperado** (el plugin con el single file, el `:hover`, el escaneo, las capas). *Mitigación:* cada fila de R10 tiene su alternativa o su «se para», y la sonda corre antes de tocar la base.
2. **El optimizador de Tailwind reescribe las hojas heredadas.** *Mitigación:* la forma canónica en el multiconjunto y en el check, S14, y el barrido como oráculo.
3. **El estado `editor` no monta el editor** en la base (otro paso, otra ruta). *Mitigación:* su condición de listo espera `.cm-editor`, y el control de T008 da 0 si no lo monta: se para.
4. **Un ítem entra en medio** y trae una hoja o una condición nueva. *Mitigación:* FR-007, T001 repetido; la hoja se suma en su lugar y la condición, a `BASE_MEDIA` y a las variantes.
5. **C4 entra antes** y cambia la forma de entrega. *Mitigación:* `style-output-check` lee el `<style>` en línea; con C4, lee la hoja enlazada, y el tamaño se mide por archivo (R15, S8).

## Complexity Tracking

| Decisión | Por qué | La alternativa más simple, descartada |
| --- | --- | --- |
| Un lector de CSS propio en `qa/lib` | SC-008 no deja sumar `postcss` a `package.json`, y los checks permanentes no deben depender de una dependencia transitiva | `postcss` importado desde `node_modules`, como en los scripts de F10c: válido para herramientas manuales (R9), no para la suite |
| Las herramientas de F10c en el repositorio | F15 las corre en quince PR; copiarlas cada vez desde un quickstart es frágil | Dejarlas en `$TMPDIR`, como en F10c |
| Una variante por condición de ancho | Las variantes de Tailwind cambian los límites (FR-019) | `max-[590px]:`, que da `(width < 590px)` |
