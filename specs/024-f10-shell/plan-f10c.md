# Implementation Plan: F10c · La limpieza de `styles.css`

**Branch**: `024-f10-shell` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F10, en su tercera parte: los requisitos *(F10c)* (FR-054 y FR-055) y los comunes (FR-001 a FR-006, FR-059 y FR-060), con SC-001, SC-005, SC-008 y SC-012. Decisiones y mediciones: [research-f10c.md](./research-f10c.md). Validación y scripts: [quickstart-f10c.md](./quickstart-f10c.md). Tareas: [tasks-f10c.md](./tasks-f10c.md). Contrato de las hojas: [contracts/stylesheets-f10c.md](./contracts/stylesheets-f10c.md).

**El objetivo:** que `frontend/styles.css` quede con los tokens, las reglas globales y las clases base, con las reglas del shell en su propia hoja, sin reglas que no use ningún elemento y con los colores, la tipografía y los espacios del shell y de la base como variables CSS con los nombres del `@theme` de Tailwind v4, sin que cambie un píxel.

**La arquitectura:** las reglas del shell se cortan de `styles.css`, enteras y en el orden de hoy, y pasan a `shell.css`, junto al componente del shell de F10b, importada en `main.tsx` justo después de `styles.css` y antes de toda hoja de página. Quién usa cada regla se mide en el DOM sobre una grilla de estados: un elemento dentro de `#main`, o de un diálogo que una página lleva a `<body>`, es de la página; el resto, del shell. Las reglas sin ningún elemento en la grilla, y sin ninguna fuente que nombre sus clases, se borran. Al final, un codemod reescribe el `:root` con los nombres de Tailwind v4 (`--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--spacing-*`, `--container-*` y `--shadow-*`), deja los trece nombres de hoy como alias para las hojas de página y hace que `styles.css` y la hoja del shell usen los tokens.

**El stack:** CSS plano, Vite 8.3.2 con Lightning CSS 1.33.0 como minificador, Playwright 1.63.0 para los E2E y el barrido, Vitest 5.0.3 para la prueba del orden de las hojas, y `postcss` 8.5.28 (de `node_modules`, sin entrar en `package.json`) en los scripts de comparación.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», las «Reglas para todos los agentes», la sección 0 y la de tu tarea. `tasks-f10c.md` tiene una línea por tarea (T036 a T044) y remite acá.
> - **Dónde están los archivos.** F10 se partió en tres planes en la misma carpeta (P4). Los de F10c llevan el sufijo `-f10c` y sus tareas siguen a las de F10a (T001 a T014) y F10b (T015 a T035): van de T036 a T044, para que un commit que nombra una tarea no sea ambiguo en la carpeta (research-f10c.md, R1). Los scripts de Spec Kit buscan `plan.md` y `tasks.md` por nombre: cada comando de Spec Kit de F10c recibe los archivos `-f10c`.
> - **La base.** F10c corre sobre `master` con F3 a F9, F11a, F12a, F10a y F10b ya integrados (FR-059; la partición P4). Cada port ya mudó su CSS a la hoja de su página (X3). Lo que este plan dice de esa base es una proyección medida sobre `master` (`431c9d90`) y los planes mergeados (research-f10c.md, R3), y cada supuesto tiene su verificación en T036.
> - **Código verificado.** Se planificó sin tocar el repositorio y sin descargar nada. En dos copias descartables de `431c9d90`, con el `node_modules` de otra copia que tiene el mismo lockfile, corrieron el prototipo de la mudanza, el multiconjunto, el barrido, la evidencia de las huérfanas, sus controles y los E2E nuevos (research-f10c.md, «Cómo se verificó»).

## Summary

`styles.css` arrastra lo que fue de todas las vistas legacy. Cuando F10c empieza, los ports ya se llevaron lo suyo (X3) y F10b ya dibuja el shell desde la raíz única, así que en la hoja quedan tres cosas: lo de todos, lo del shell y, quizás, lo de nadie. F10c separa las tres sin cambiar el aspecto:

- **Las reglas del shell** pasan a `shell.css`, enteras y en el orden de hoy, con sus bloques `@media` repetidos en el mismo orden (FR-054). La única regla que se parte es `.small-label, .eyebrow, .topbar-label`: `.topbar-label` es del shell y las otras dos son base, y el selector del shell se va con las mismas declaraciones (research-f10c.md, R4).
- **La hoja del shell va segunda,** justo después de `styles.css` y antes de toda hoja de página. Así ninguna regla del shell cambia de lugar respecto de las hojas de página, y sólo se corre detrás de las reglas base, que no compiten con ella en ningún elemento del shell (R4). Lo fija la spec del orden de las hojas que deja F10b (`main-entry.spec.ts`), con la hoja del shell sumada en el segundo lugar, en rojo antes de la mudanza.
- **Quién usa cada regla se mide en el DOM**, no con `grep`: un script recorre la grilla (las ocho vistas del menú en los dos idiomas, los estados profundos de F2b, la Biblioteca vacía, el paso «reflect», la parte «ship» de un taller, los diálogos de las páginas, el toast, el salto al contenido, el aviso sin JavaScript, «Tu cuenta», la administración, el ingreso y los errores de la sesión y de la compuerta), en siete anchos, con y sin movimiento reducido y en impresión. La búsqueda en las fuentes queda como guarda: una regla con clases nombradas en alguna fuente no se borra sin explicar por qué la grilla no la ve (R2 y R5).
- **Las huérfanas se borran** sólo en `styles.css` y entre las reglas del shell que salieron de ella. La proyección da 0: cada regla que queda tiene un dueño en la grilla. Una lista vacía, con su evidencia, cumple FR-055 y SC-005 (R5).
- **Los tokens para Tailwind v4** (decisión del usuario del 2026-10-28): Tailwind entra en F15, con su ADR. F10c deja listo el `:root` para pasar a su `@theme`. Los diez colores y las tres familias de hoy pasan a `--color-*` y `--font-*`; los colores sueltos del shell y de la base, los 21 tamaños de letra, los cuatro pesos y las medidas del armado del shell (el contenedor, la barra lateral, la barra superior y los márgenes laterales) suman 48 tokens más. Los nombres viejos quedan como alias de los nuevos, y el bloque de Go los vuelve a declarar, porque un alias se resuelve en `:root` (R12). Lo prueban el multiconjunto de las declaraciones resueltas, igual antes y después, y el barrido en 0, con los tokens nuevos contados aparte.
- **La red no se edita.** Abre un E2E nuevo con las reglas del shell que `css-contract` no cubre, en verde contra la base y sin tocar después (FR-001). El barrido de estilo computado, que reusa el de F2b, F4, F5 y F9 con las trampas de TR-13 resueltas, da 0 diferencias, y un barrido de la base contra sí misma da 0 antes de comparar nada (R6).

## Technical Context

**Language/Version**: CSS en `frontend/styles.css` y en la hoja nueva; TypeScript como ES modules en la spec de Vitest y en los E2E. Node 24.21.0, Vite 8.3.2, Lightning CSS 1.33.0, Vitest 5.0.3 y `@playwright/test` 1.63.0, como fija `package-lock.json`.

**Primary Dependencies**: ninguna nueva (FR-003). Los scripts de comparación usan, fuera del repositorio, `postcss` 8.5.28 y `@playwright/test` del `node_modules` de cada raíz.

**Storage**: no aplica. F10c no lee ni escribe `localStorage`, salvo las semillas de la grilla del barrido, que viven en contextos descartables del navegador.

**Testing**: los E2E de la base sin editar (FR-002), un E2E nuevo del shell (`qa/e2e/specs/shell-style.spec.ts`), la spec del orden de las hojas de F10b (`main-entry.spec.ts`) con una entrada más, el multiconjunto de declaraciones de F2b y el barrido de estilo computado de esta parte. Los valores esperados salen del texto de las hojas de hoy, que es el contrato del aspecto.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript). Es un refactor de CSS.

**Performance Goals**: ninguna. Se informa `html.length` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: un archivo nuevo de CSS (unas 450 líneas), uno de E2E (7 pruebas), y cambios en `frontend/src/app/main-entry.spec.ts` (una entrada y el título de su prueba), `frontend/styles.css` (pierde unas 450 líneas), `frontend/src/app/main.tsx` (una línea), `qa/e2e/pages/shell.ts` (tres localizadores) y la documentación.

## Restricciones globales

Valen para toda tarea. Los valores salen de la spec, de la constitución y de las decisiones del 2026-10-28.

- **El tope del HTML:** `dist/index.html` queda bajo `BOOT_SIZE_LIMIT` de `qa/build-check.ts`, que en `master` es **1 500 000** caracteres (PR #76; decisión del 2026-10-28, noche). La spec todavía dice 1 250 000 en FR-004 y SC-008: manda la decisión, y la corrección de la spec es un hallazgo para el coordinador. **El subpresupuesto de F10c:** `html.length` queda como mucho **5 000** caracteres por encima del de T036, y la mudanza sola (T039), como mucho **1 000**. La proyección da +137 por la mudanza y +3 349 por los tokens (R9).
- **Lo que queda en `styles.css`** (FR-054): los tokens, que son las **13** propiedades de `:root` y las **3** de `body[data-language='go']` hasta T042, y desde T042 el bloque de research-f10c.md, R12 (**61** tokens con nombres de Tailwind v4 y los **13** alias de hoy en `:root`; **3** tokens y **3** alias en el bloque de Go); las reglas globales, que son las que no nombran una clase ni un id fuera de un `:not()` (el documento, la tipografía, los controles, `[hidden]`, `progress`, `dialog`, la regla de casillas, el `touch-action` y el movimiento reducido); y las clases base, que son las que usan dos o más dueños, o el shell y una página.
- **La hoja del shell:** `frontend/src/app/shell/shell.css`, en la carpeta del componente del shell que deja el plan de F10b (`Shell.tsx`); T036 lo confirma. Se importa en `main.tsx` **inmediatamente después** de `import '../../styles.css';`.
- **Cómo se mudan las reglas:** cada regla entera, con sus declaraciones en el mismo orden y sin cambiar un valor; en el orden de `styles.css`; las que estaban dentro de un `@media` van dentro de un `@media` con la misma condición, un bloque por cada bloque de origen. Una regla con selectores de dos dueños se parte: cada selector se va con todas las declaraciones de la regla.
- **Las comparaciones:**
  - **el multiconjunto de declaraciones** (`css-multiset.mjs`, quickstart-f2b.md §3.1 a): en T039, `onlyBase` 0 y `onlyUnit` 0; en T041, `onlyBase` igual a las tuplas de las reglas borradas y `onlyUnit` 0;
  - **el barrido de estilo computado** (quickstart-f10c.md §3.3): 0 diferencias en la grilla entera, que son 35 estados por 15 capturas (siete anchos, 1 600, 1 280, 981, 850, 650, 590 y 375 px, con el movimiento reducido apagado y encendido, más la impresión a 1 280 px);
  - **el control de determinismo:** el barrido de la base contra sí misma da 0 diferencias y ningún pedido a `/api/` sin respuesta, antes de cualquier otra comparación;
  - **desde T042, el multiconjunto resuelto** (quickstart-f10c.md §3.7): cada `var()` resuelto con los tokens de `:root`, igual al de la base menos las reglas borradas; y el barrido cuenta aparte los 61 tokens nuevos (`newTokens`).
- **La red:** todos los E2E de la base pasan sin editarse (FR-002), `css-contract.spec.ts` incluido, con los nombres de hojas viejos que llevan sus títulos. Una E2E nueva que recargue después de una escritura de nuqs espera la URL (decisión del 2026-10-28, noche); las de F10c no recargan.
- **Sin estilos en línea ni dependencias** (FR-003): ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` nuevo, y `package.json` y el lockfile sin cambios.
- **Los checks de cierre** (SC-012): `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `E2E_PORT=<puerto> npm run test:e2e` y `git diff --check`; la imagen web la construye el coordinador con permiso (`docker compose build taller`).
- **Commits y PR:** commits en español con la forma `tipo(alcance): asunto`, cada uno con `git diff --check` limpio y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Un solo PR que se puede revertir entero (FR-006), con título en inglés: `refactor(front): move the shell rules out of styles.css and drop the unused ones`.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | Ninguna regla nueva: la hoja del shell sigue la convención de «la hoja de su dueño» (F2b, X3) y se importa en `main.tsx`, que integra el agente principal. `AGENTS.md` sólo cambia si nombra `styles.css` como dueña del shell (T043). |
| II. TDD y pruebas útiles | Sí | Mover CSS no cambia el comportamiento: la prueba es la red, en verde antes y después, más el E2E nuevo del shell en verde contra la base (FR-001). La única restricción nueva, el orden de las hojas, abre en rojo (T038). Los valores esperados salen del texto de las hojas de la base. |
| III. Código entendible | Sí | Lo que se mueve no se reescribe. No hay funciones nuevas en producción. |
| IV. Contenido en Git, IDs estables | Sí | No cambian clases, ids ni contenido. |
| V. Capas y contratos explícitos | Sí | La hoja del shell vive con el shell, en `app/`, y su lugar en la cascada es un contrato escrito ([contracts/stylesheets-f10c.md](./contracts/stylesheets-f10c.md)) con su prueba. |
| VI. Español, accesibilidad y portabilidad | Sí | No cambian textos, foco, teclado, diseño móvil ni movimiento reducido: lo prueban el barrido, con los dos idiomas y las dos preferencias de movimiento, y los E2E. Los scripts usan `node`. |
| VII. Salidas generadas fuera de Git | Sí | Los scripts de comparación y sus salidas viven en `$TMPDIR/f10c-compare/`. |
| VIII. Flow-forward | Sí | `tasks-f10c.md` tiene una línea por tarea y, como mucho, su commit. |

## Decisiones del usuario

Están en `## Clarifications` de la [spec](./spec.md) y en `.coordinador/clarify-decisiones.md`. Este plan aplica:

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **P4:** F10 en tres partes; F10c es la limpieza de `styles.css` | Este plan cubre FR-054 y FR-055 y los comunes; empieza cuando F10b está en `master` | Todo el plan |
| **X3:** cada port mudó su CSS a la hoja de su página | La base ya no tiene las reglas de la Biblioteca, el Recorrido, Método ni Proyecto; F10c mide lo que queda y lo verifica en T036 | §0 |
| **El tope del HTML** (2026-10-28, noche): 1 500 000 | El tope de `qa/build-check.ts`; la spec se corrige aparte | «Restricciones globales» |
| **nuqs escribe la URL tarde** (D1-bis, 2026-10-28, noche) | Ninguna E2E de F10c recarga después de una escritura de nuqs; si una lo hiciera, espera la URL | §1 |
| **F15, Tailwind con su ADR** (el usuario, 2026-10-28): F10c deja los tokens listos para el `@theme` de v4 y la paridad sigue en 0 | T042: el codemod de los tokens, el multiconjunto resuelto y el barrido con los tokens nuevos contados aparte | §3 y research-f10c.md, R12 |
| **Se parte `.small-label, .eyebrow, .topbar-label`** (el usuario, 2026-10-28) | `.topbar-label` se va a la hoja del shell con sus cuatro declaraciones | T039 |
| **Las reglas de `pages/account/ui/account.css` se quedan en su hoja** (el usuario, 2026-10-28) | F10c no las toca | R10 |
| **El barrido de F5** encontró diferencias por nodos de texto partidos y por el `:hover` que React conserva (TR-13) | El DOM de las dos raíces es el mismo, así que no hay nodos partidos; el barrido mueve el puntero fuera de la página, a `(-1, -1)`, después de cada preparación, y el control de determinismo lo prueba | §0 y quickstart-f10c.md §3 |

## Project Structure

### Documentation (this feature)

```text
specs/024-f10-shell/
├── spec.md                       (no se toca)
├── plan.md, research.md, quickstart.md, tasks.md, plan-f10b.md, *-f10b.md   (F10a y F10b, no se tocan)
├── plan-f10c.md                  este archivo
├── research-f10c.md              decisiones, proyección, Context7 y mediciones
├── quickstart-f10c.md            comandos y scripts de las comparaciones
├── tasks-f10c.md                 una línea por tarea (T036 a T044)
└── contracts/
    └── stylesheets-f10c.md       el orden de las hojas y qué guarda cada una
```

### Source Code (repository root)

```text
frontend/
├── styles.css                              (T039) pierde las reglas del shell; (T040) las de una sola página, si T036 encontró alguna; (T041) las huérfanas, si las hay; (T042) el `:root` y el bloque de Go con los tokens, y las reglas que los usan
└── src/
    └── app/
        ├── main.tsx                        (T039, K) importa shell.css justo después de styles.css
        ├── main-entry.spec.ts              (T038) de F10b: la hoja del shell, segunda en BASE_SHEETS
        └── shell/                          (la carpeta del shell de F10b; T036 confirma el nombre)
            └── shell.css                   (T039) nueva: las reglas del shell, en el orden de styles.css; (T042) usa los tokens
qa/
└── e2e/
    ├── pages/shell.ts                      (T037) suma topBar, footer y brandMark; main, skipLink y sidebar son de F10a
    └── specs/shell-style.spec.ts           (T037) nueva: siete pruebas del aspecto del shell
docs/architecture.md                        (T043, K) la fila del shell nombra la hoja nueva
```

| Archivo | De qué se encarga |
| --- | --- |
| `frontend/styles.css` | Tokens, reglas globales y clases base, nada más |
| `…/shell/shell.css` | Las reglas que sólo dibuja el shell, en el orden en que estaban |
| `frontend/src/app/main.tsx` | El orden de las hojas: `styles.css`, la del shell y después las de página |
| `frontend/src/app/main-entry.spec.ts` (de F10b) | El orden entero de las hojas de `main.tsx`, ahora con la del shell segunda |
| `qa/e2e/specs/shell-style.spec.ts` | El aspecto del shell que `css-contract` no cubre: impresión, 1 550, 1 150 y 590 px, el salto al contenido, el toast y el acento de cada idioma |
| `qa/e2e/pages/shell.ts` | Suma la barra superior y el pie, por rol, y la marca, que no tiene nombre; usa `main`, `skipLink` y `sidebar` de F10a |

## Review Focus

Lo que el revisor mira primero:

- **La lista del shell contra la evidencia.** Cada regla que se mudó tiene, en la salida de `rule-evidence.mjs` de T036, la clase `shell`; cada regla que quedó es `token`, `global` o `base`. Una diferencia con la proyección (research-f10c.md, R3) está explicada en la línea base de la implementación.
- **El orden.** `shell.css` es la segunda hoja, y dentro de ella las reglas siguen el orden de `styles.css`, con un bloque `@media` por cada bloque de origen. Los dos bloques de 590 px del menú siguen separados por `main:focus`, y el de la sesión de F11a sigue al final.
- **La partición de `.small-label, .eyebrow, .topbar-label`.** `.topbar-label` se va con sus cuatro declaraciones, antes de `.progress-caption`, y no se junta con la otra regla de `.topbar-label`.
- **Las comparaciones.** El multiconjunto en 0 y 0, el barrido en 0 sobre 525 capturas, el control de determinismo en 0 y los dos controles negativos con las diferencias que predicen (quickstart-f10c.md §3.5).
- **La lista de FR-055,** aunque esté vacía, con la evidencia de cada regla y el motivo de las que la guarda conserva.
- **Los tokens.** Los nombres de research-f10c.md, R12; los trece alias en `:root` y los tres de color vueltos a declarar en el bloque de Go; ningún color literal ni nombre viejo en las dos hojas; el multiconjunto resuelto igual y el barrido en 0 con `newTokens: 61`.

**Lo que la spec implica y ninguna prueba de una tarea ejercita**, cada caso con la prueba que lo fija y su tarea:

1. **La hoja del shell importada fuera de lugar** (al final de `main.tsx`, o después de una hoja de página): el multiconjunto no lo ve, y el barrido sólo si una hoja de página compite con el shell. Lo fija la spec del orden de las hojas, en rojo antes de la mudanza (T038).
2. **Un bloque `@media` de la hoja del shell en otro orden**, por ejemplo el de 590 px antes que el de 850 px: el multiconjunto da 0. Lo detecta el barrido, y su control negativo lo demuestra: `.sidebar` pasa de `flex` a `grid` y la barra superior, de 61 a 68 px a 590 y 375 px (T039; quickstart-f10c.md §3.5 b).
3. **Una regla borrada porque la grilla no tenía el estado que la usa** (`#toast.visible`, `.noscript`, el `main` de 1 550 px o la impresión): la guarda de las fuentes la conserva, los centinelas de `rule-evidence.mjs` fallan si esos estados no están, y el control de borrado demuestra que el barrido los ve (T041; quickstart-f10c.md §3.5 c).
4. **El tono de Go sobre el shell y los alias de los tokens:** `body[data-language='go']` queda en `styles.css` y las reglas que lo usan pasan a otra hoja; además, desde T042 los nombres viejos (`--accent`) son alias que se resuelven en `:root`, así que en Go seguirían en el tono de Rust si el bloque de Go no los vuelve a declarar. El multiconjunto resuelto no lo ve, porque resuelve con `:root`. Lo fijan el E2E «the brand mark takes the accent of each language» (T037), los estados en Go del barrido y el control negativo de T042, que quita los alias del bloque de Go y tiene que dar diferencias en esos estados (quickstart-f10c.md §3.5 d).
5. **El `:hover` y la transición del toast en el barrido:** un clic deja el puntero sobre un botón, y el toast tarda 0,2 s en aparecer. El barrido mueve el puntero fuera de la página, a `(-1, -1)`, y espera 400 ms después de que el toast tiene `.visible`, y el control de determinismo (la base contra sí misma, en 0) prueba que no queda ruido antes de comparar (T036).

## Unidades y orden

F10c es chico: una sola cola, porque cada tarea parte de la compuerta de la anterior. No hay archivos que dos tareas toquen a la vez.

| Unidad | Tareas | Quién | Compuerta |
| --- | --- | --- | --- |
| 0 · La línea base | T036 | K | La red en verde, el control de determinismo en 0, la evidencia y los supuestos verificados, en un commit de documentación |
| 1 · Los E2E primero | T037 | implementador | Las siete pruebas en verde contra la base; la red entera en verde |
| 2 · La hoja del shell | T038, T039 y T040 | implementador, con K para `main.tsx` | La prueba del orden en rojo (T038) y en verde (T039); el multiconjunto en 0 y 0; el barrido en 0; el control negativo con diferencias |
| 3 · Las huérfanas y los tokens | T041 y T042 | implementador; la lista de T041 la aprueba K | La evidencia de toda regla; las borradas, si las hay, con el multiconjunto igual a la base menos ellas y el barrido en 0. Los tokens con el multiconjunto resuelto igual, el barrido en 0 con 61 tokens nuevos y su control negativo con diferencias |
| 4 · El cierre | T043 y T044 | K | La documentación, los checks de cierre, el tamaño y el PR |

**Vuelta atrás:** el PR entero se revierte con un solo `git revert` de su merge. Dentro de la rama, cada commit se revierte solo: T039 devuelve las reglas a `styles.css` y deja la prueba del orden en rojo, así que se revierte junto con T038.

**Integración de a uno** (FR-059): si A3, A4, D1c, C4, F11b, F11c, F11d, F12b o F13 entran en `master` mientras F10c está abierto, F10c rebasa, repite T036 (la evidencia y el control de determinismo) sobre la base nueva y vuelve a correr las comparaciones de T039 y T041. Una regla nueva del shell que haya entrado en `styles.css` se muda con las demás.

## Reglas para todos los agentes

- **Comentarios:** ninguno nuevo, salvo una referencia puntual. Los localizadores del Page Object sin nombre accesible llevan una línea que dice por qué, como el `toast` de hoy.
- **Nada se edita para que pase una comparación.** Una diferencia del barrido se explica con las propiedades que cambian y se corrige en el lugar de la regla, nunca en una declaración ni en el script.
- **Los scripts de comparación** viven fuera del repositorio, en `$TMPDIR/f10c-compare/`, y resuelven sus dependencias desde el `node_modules` de la raíz que reciben. No se commitean.
- **Los puertos:** el barrido usa 4701 y 4702, y la evidencia, 4703. Antes de correrlos, `ss -ltn | grep -E ':470[123]\b'` no imprime nada.
- **Las E2E** corren con `E2E_PORT=4193`, o con otro puerto libre si dos worktrees corren a la vez.

## 0. Unidad 0 · La línea base (K)

### Tarea 0.1 · La línea base y el inventario (T036)

**Archivos:** `specs/024-f10-shell/research-f10c.md` («Línea base de la implementación»). Nada más.

**Pasos:**

1. **La base.** En el worktree de F10c, sobre `master`:
   - `git log --oneline` muestra los merges de F3, F4, F5, F6, F7a, F7b, F8, F9, F11a (la unidad final), F12a, F10a y F10b. Si F10b no está, se para: F10c depende de F10b.
   - `grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts` imprime `1500000`.
2. **La red y las medidas** (quickstart-f10c.md §1): `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4193 npm run test:e2e`, todo en verde. Se anotan la cantidad de E2E, de pruebas de Vitest y de avisos de complejidad, y las medidas del dist: `chars`, `bytes`, los hashes del script, del estilo y del marcado, y la cantidad de elementos `<style>` y `<script>` (TR-16).
3. **La copia de la base:** `git worktree add --detach "$TMPDIR/f10c-base" HEAD`, el enlace a `node_modules` y `npm run build` en la copia (quickstart-f10c.md §1). Las comparaciones de T039 y T041 la usan como base.
4. **Los scripts:** `grid.mjs`, `style-sweep.mjs` y `rule-evidence.mjs` de quickstart-f10c.md §3, y `css-multiset.mjs` de quickstart-f2b.md §3.1 a, en `$TMPDIR/f10c-compare/`. Antes de correrlos, cuatro verificaciones de la grilla contra la base:
   1. **El doble de la API:** la respuesta por omisión de `GET /api/session` en `installDefaults()` de `qa/e2e/fixtures/api-double.ts` tiene `user`, `features` (`passwordReset` y `registration` en `false`), `contentVersion` y `catalogs: []`, como `installApi` de `grid.mjs`; `STUDENT` y `ADMIN` de `qa/e2e/lib/api-contract.ts` tienen los valores de `grid.mjs`; y `adminUser` y `pageOf` del E2E de F12a dan la respuesta de `ADMIN_USERS`. Si algo cambió (por ejemplo, A3 extendió la sesión), se copia el valor del doble a `grid.mjs`, y se anota.
   2. **Los nombres:** el botón «Tu cuenta», el botón «Empezar esta sesión» del Recorrido, «Borrar mi progreso» de Método, el enlace «Ir al contenido», el grupo «Lenguaje del recorrido» y la ruta `#administracion` existen con esos nombres (`grep -rn` en `frontend/src` y en `qa/e2e/pages`).
   3. **Los diálogos de las páginas:** `grep -rn 'id="lesson-dialog"\|id="confirm-dialog"\|id="lab-confirm-dialog"' frontend/src` encuentra los tres, en `pages/route`, `pages/method` y `pages/lab`. Si otro diálogo de página se lleva a `<body>`, se suma a `PAGE_DIALOGS`.
   4. **Las páginas:** `ls frontend/src/pages` da `account`, `admin`, `atlas`, `campaign`, `lab`, `library`, `method`, `project`, `route` y `systems`, los dueños que usa `grid.mjs`. Si un slice tiene otro nombre, se cambia en `grid.mjs`.
5. **El control de determinismo:** `node style-sweep.mjs "$TMPDIR/f10c-base" "$TMPDIR/f10c-base"` da `differences: 0` y `unhandled: []` en los 35 estados (quickstart-f10c.md §3.5 a). Si da diferencias, el barrido tiene ruido: se busca cuál con las muestras (un `:hover`, una transición, una fuente que no cargó) y se corrige el script antes de seguir.
6. **La evidencia de la base:** `node rule-evidence.mjs "$TMPDIR/f10c-base" frontend/styles.css > base-evidence.tsv`. La salida de error dice `coverageMatchesStyle: true`, ningún centinela falla y `unhandled` está vacío.
7. **La comparación con la proyección.** Se compara la columna `class` de `base-evidence.tsv` con las tablas de research-f10c.md, R3:
   - **cada regla `shell`** de la evidencia está en la tabla del shell, y al revés;
   - **cada regla `base`, `global` o `token`** está en la de lo que queda;
   - **`single:<dueño>`** lista las reglas de una sola página (la proyección dice que no hay ninguna): las muda T040;
   - **`orphan`** lista las candidatas de T041 (la proyección dice que no hay ninguna);
   - **la columna `staticOnly`** lista los dueños que nombran las clases de la regla en sus fuentes y que la grilla no vio. Cada uno se resuelve leyendo la fuente: o falta un estado en la grilla, y se suma a `grid.mjs` con su preparación (y se repite desde el paso 5), o es un falso positivo de la búsqueda (por ejemplo, `toast(`), y se anota el motivo.
8. **Las ubicaciones de F10b:**
   - **la carpeta del shell:** `grep -rln 'className="app-shell"' frontend/src` da el componente; su carpeta es la de `shell.css`. El plan de F10b la deja en `frontend/src/app/shell/`; si la base trae otra, el plan se lee con esa carpeta;
   - **la prueba del primer lugar de `styles.css`** (FR-052): el plan de F10b la deja en `frontend/src/app/main-entry.spec.ts`, con `BASE_SHEETS`. `ls frontend/src/app/main-entry.spec.ts` la confirma; si no está, T038 crea `frontend/src/app/stylesheet-order.spec.ts` (plan 2.1, paso 3);
   - **el orden de las hojas en `main.tsx`:** se copia la lista de imports `.css`.
9. **El commit:** `docs(specs): la línea base de la implementación de F10c`, con lo anotado en «Línea base de la implementación» de research-f10c.md: las medidas, los conteos de clases de la evidencia, las diferencias con la proyección y su resolución, y las ubicaciones.

**Compuerta:** la red en verde, el control de determinismo en 0 y cada diferencia con la proyección resuelta.

## 1. Unidad 1 · Los E2E primero (FR-001)

### Tarea 1.1 · El aspecto del shell, en verde contra la base (T037)

**Archivos:** `qa/e2e/pages/shell.ts` y `qa/e2e/specs/shell-style.spec.ts` (nueva).

**Consume:** el fixture `shell` de `qa/e2e/fixtures` (con el doble de la API de F11a y su sesión simulada), `urls.view` de `qa/e2e/lib/urls.ts` y `expect(locator).toHaveCSS(name, value)` de Playwright 1.63.

**Produce:** tres localizadores más en `ShellPage`. F10a (su T007) ya suma `main` (`page.locator('#main')`), `skipLink`, `sidebar` (el `complementary` que contiene el menú), `progressBar` y `exportButton`; la spec de T037 usa los suyos y no los duplica. Si la base trae otros nombres, se usan los de la base.

1. **`qa/e2e/pages/shell.ts`.** Con la convención de F10a: los campos nuevos al final de la lista de campos y sus asignaciones al final del constructor.

   ```ts
   readonly topBar: Locator;
   readonly footer: Locator;
   readonly brandMark: Locator;
   ```

   ```ts
   this.topBar = page.getByRole('banner');
   this.footer = page.getByRole('contentinfo');
   // The mark is aria-hidden: it has no accessible name.
   this.brandMark = page.getByRole('link', { name: 'Taller, inicio' }).locator('.brand-mark');
   ```

   **Lo que ya prueba F10a y no se repite:** «the skip link moves the focus to #main…» (`shell-navigation.spec.ts`) fija el foco y la URL, y «the toast» (`shell-sidebar.spec.ts`) fija el texto y la clase `visible`. Las pruebas de T037 fijan otra cosa: lo que las reglas de CSS hacen con esos elementos (la posición del salto al contenido y la opacidad del toast), que es lo que F10c muda de hoja.

2. **`qa/e2e/specs/shell-style.spec.ts`.** Los valores son los del texto de las reglas del shell en `styles.css` de la base; ningún selector de CSS sale del Page Object:

   ```ts
   import { expect, test } from '../fixtures';
   import { urls } from '../lib/urls';

   const HEIGHT = 900;

   test.describe('the shell in print', () => {
     test('hides the sidebar, the top bar, the footer and the toast, and gives the page the whole sheet', async ({
       shell,
       page,
     }) => {
       await shell.goto(urls.view('recorrido'));
       await page.emulateMedia({ media: 'print' });

       await expect(shell.sidebar).toBeHidden();
       await expect(shell.topBar).toBeHidden();
       await expect(shell.footer).toBeHidden();
       await expect(shell.toast).toBeHidden();
       await expect(shell.main).toHaveCSS('padding-top', '0px');
       await expect(shell.main).toHaveCSS('max-width', 'none');
     });
   });

   test.describe('the shell from 1 550 px', () => {
     test('leaves 60 px above the page, and 44 px below that width', async ({ shell, page }) => {
       await page.setViewportSize({ width: 1600, height: HEIGHT });
       await shell.goto(urls.view('recorrido'));
       await expect(shell.main).toHaveCSS('padding-top', '60px');

       await page.setViewportSize({ width: 1280, height: HEIGHT });
       await expect(shell.main).toHaveCSS('padding-top', '44px');
     });
   });

   test.describe('the shell at 1 150 px and below', () => {
     test('narrows the sidebar and gives the top bar and the footer 32 px sides', async ({
       shell,
       page,
     }) => {
       await page.setViewportSize({ width: 981, height: HEIGHT });
       await shell.goto(urls.view('recorrido'));

       await expect(shell.sidebar).toHaveCSS('padding-left', '18px');
       await expect(shell.topBar).toHaveCSS('padding-left', '32px');
       await expect(shell.footer).toHaveCSS('padding-left', '32px');
     });
   });

   test.describe('the shell at 590 px', () => {
     test('makes the top bar 61 px high and stacks the two lines of the footer', async ({
       shell,
       page,
     }) => {
       await page.setViewportSize({ width: 590, height: HEIGHT });
       await shell.goto(urls.view('recorrido'));

       await expect(shell.topBar).toHaveCSS('height', '61px');
       await expect(shell.footer).toHaveCSS('flex-direction', 'column');
     });
   });

   test.describe('the skip link', () => {
     test('waits above the page and comes down when it has the focus', async ({ shell, page }) => {
       await shell.goto(urls.view('recorrido'));
       await expect(shell.skipLink).toHaveCSS('top', '-100px');

       await page.keyboard.press('Tab');
       await expect(shell.skipLink).toBeFocused();
       await expect(shell.skipLink).toHaveCSS('top', '10px');
     });
   });

   test.describe('the toast', () => {
     test.use({ reducedMotion: 'reduce' });

     test('stays transparent until switching the language shows it', async ({ shell }) => {
       await shell.goto(urls.view('recorrido'));
       await expect(shell.toast).toHaveCSS('opacity', '0');

       await shell.switchLanguage('go');
       await expect(shell.toast).toHaveCSS('opacity', '1');
     });
   });

   test.describe('the brand mark', () => {
     test('takes the accent of each language', async ({ shell }) => {
       await shell.goto(urls.view('recorrido'));
       await expect(shell.brandMark).toHaveCSS('color', 'rgb(172, 72, 41)');

       await shell.switchLanguage('go');
       await expect(shell.brandMark).toHaveCSS('color', 'rgb(34, 98, 107)');
     });
   });
   ```

3. **Correr:** `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/shell-style.spec.ts`: 7 de 7 en verde contra la base. Después, la red entera, en verde.
4. **La prueba de que detectan algo,** una vez y sin commitear, en una copia descartable: comentar `import '../../styles.css';` en `main.tsx`, `npm run build` y la spec: tienen que fallar las siete. Se restaura.
5. **Checks:** `npx prettier --check qa/e2e/pages/shell.ts qa/e2e/specs/shell-style.spec.ts`, `npm run lint` y `git diff --check`.
6. **Commit:** `test(e2e): el aspecto del shell que F10c muda, en verde contra la base`.

**Compuerta:** 7 de 7 y la red en verde, sin editar ningún E2E existente.

## 2. Unidad 2 · La hoja del shell (FR-054)

### Tarea 2.1 · La hoja del shell va segunda, en rojo (T038)

**Archivos:** `frontend/src/app/main-entry.spec.ts`, la spec que deja F10b (su T027) para la restricción del primer lugar de `styles.css` (FR-052).

**Consume:** `BASE_SHEETS` y el `it` de esa spec, que compara la lista entera de imports `.css` de `main.tsx` con `toEqual`. La lista de F10b es la de la base, copiada en su T015; T036 la anota.

1. **La prueba.** En `BASE_SHEETS` se agrega la hoja del shell en el segundo lugar, justo después de `'../../styles.css'`, y el título del `it` dice el orden nuevo. Con la lista que deriva el plan de F10b, queda así (si la base trae otra, se conservan sus entradas y su orden, y sólo se inserta la segunda):

   ```ts
   const BASE_SHEETS: readonly string[] = [
     '../../styles.css',
     './shell/shell.css',
     '../pages/route/ui/route.css',
     '../pages/library/ui/library.css',
     '../pages/project/ui/project.css',
     '../pages/method/ui/method.css',
     '../pages/lab/ui/lab.css',
     '../pages/lab/ui/lab-page.css',
     '../pages/atlas/ui/atlas.css',
     '../pages/campaign/ui/campaign-page.css',
     '../pages/lab/ui/quest-explorers.css',
     '../pages/systems/ui/systems.css',
     '../shared/ui/form/form.css',
     '../entities/privacy-notice/ui/privacy-notice.css',
     '../features/sign-in/ui/access.css',
     '../pages/account/ui/account.css',
     '../pages/admin/ui/admin.css',
   ];
   ```

   ```ts
   it('main.tsx imports styles.css first, the shell sheet second and the page sheets in the order of the base', () => {
   ```

   El cuerpo del `it` no cambia. Con otra carpeta del shell (T036), la ruta `./shell/shell.css` es la relativa desde `app/`.
2. **Correr y ver el fallo esperado:** `npx vitest run --config frontend/vitest.config.ts --project node main-entry`. Falla porque `main.tsx` todavía no importa la hoja del shell: la lista recibida no tiene `'./shell/shell.css'` en el segundo lugar.
3. **Si F10b no dejó esa spec** (T036, paso 8), T038 crea `frontend/src/app/stylesheet-order.spec.ts` con la misma lectura de los imports y un solo `it`, que exige `sheets.slice(0, 2)` igual a `['../../styles.css', './shell/shell.css']`:

   ```ts
   import { readFileSync } from 'node:fs';
   import { fileURLToPath } from 'node:url';
   import { describe, expect, it } from 'vitest';

   function sheetsOf(source: string): string[] {
     return [...source.matchAll(/^import '([^']+\.css)';$/gm)].map((match) => match[1] ?? '');
   }

   describe('the stylesheets of main.tsx', () => {
     it('loads the shell sheet right after styles.css and before every page sheet', () => {
       const source = readFileSync(fileURLToPath(new URL('./main.tsx', import.meta.url)), 'utf8');
       expect(sheetsOf(source).slice(0, 2)).toEqual(['../../styles.css', './shell/shell.css']);
     });
   });
   ```

4. **Checks:** `npm run lint` y `npx prettier --check` del archivo.
5. **Commit:** `test(front): la hoja del shell va justo después de styles.css (roja)`.

### Tarea 2.2 · Las reglas del shell a su hoja (T039, con K para `main.tsx`)

**Archivos:** `frontend/styles.css`, `…/shell/shell.css` (nueva) y `frontend/src/app/main.tsx` (una línea).

**Consume:** la tabla del shell de research-f10c.md, R3, corregida por T036; la copia de la base de T036.

**Produce:** `shell.css` con 86 reglas y 90 selectores, y `styles.css` con 77 reglas, según la proyección.

1. **`shell.css`.** Las reglas, cortadas de `styles.css` con su texto exacto, en este orden y con estos bloques (el texto de la proyección, que T036 confirma):

   ```css
   .app-shell {
     display: grid;
     grid-template-columns: 240px minmax(0, 1fr);
     min-height: 100vh;
   }
   .sidebar {
     position: sticky;
     top: 0;
     height: 100vh;
     min-height: 650px;
     border-right: 1px solid var(--line);
     padding: 34px 24px;
     display: flex;
     flex-direction: column;
     background: #eeeee5;
   }
   .brand {
     display: flex;
     align-items: center;
     text-decoration: none;
     font-size: 35px;
     font-weight: 650;
     letter-spacing: -2px;
     line-height: 1;
   }
   .brand-mark {
     font-family: var(--mono);
     font-size: 24px;
     letter-spacing: -4px;
     margin-right: 13px;
     color: var(--accent);
   }
   .brand-dot {
     color: var(--accent);
   }
   .sidebar-tagline {
     font-size: 12px;
     margin: 21px 0 44px;
     line-height: 1.7;
   }
   .navigation {
     display: flex;
     flex-direction: column;
     gap: 8px;
   }
   .navigation a {
     display: flex;
     align-items: center;
     gap: 12px;
     padding: 11px 10px;
     text-decoration: none;
     border-radius: 5px;
     font-size: 13px;
     color: var(--muted);
   }
   .navigation a:hover {
     background: #e4e6dc;
   }
   .navigation a[aria-current='page'] {
     background: var(--ink);
     color: var(--surface);
   }
   .nav-symbol {
     font-size: 20px;
     line-height: 1;
     width: 21px;
     text-align: center;
   }
   .nav-count {
     margin-left: auto;
     font-family: var(--mono);
     font-size: 10px;
     opacity: 0.8;
   }
   .sidebar-bottom {
     margin-top: auto;
     padding-top: 42px;
   }
   .topbar-label {
     font-family: var(--mono);
     font-size: 10px;
     letter-spacing: 1.4px;
     font-weight: 500;
   }
   .progress-caption {
     display: flex;
     justify-content: space-between;
     align-items: baseline;
     font-size: 11px;
     margin: 10px 0;
   }
   .progress-caption strong {
     font-weight: 500;
     font-size: 14px;
   }
   .save-status {
     display: flex;
     align-items: center;
     gap: 7px;
     font-size: 10px;
     color: var(--muted);
     margin-top: 24px;
   }
   .status-dot {
     width: 5px;
     height: 5px;
     border-radius: 50%;
     background: var(--green);
   }
   .export-button {
     display: flex;
     justify-content: space-between;
     width: 100%;
     margin-top: 14px;
   }
   .sidebar-footnote {
     font-size: 10px;
     margin: 28px 0 0;
   }
   .workspace {
     min-width: 0;
   }
   .topbar {
     height: 88px;
     padding: 0 52px;
     border-bottom: 1px solid var(--line);
     display: flex;
     justify-content: space-between;
     align-items: center;
     gap: 20px;
   }
   .topbar-label {
     color: var(--muted);
   }
   .language-switch {
     display: flex;
     border: 1px solid #cccfc2;
     padding: 4px;
     border-radius: 30px;
   }
   .language-switch button {
     border: 0;
     background: transparent;
     border-radius: 22px;
     padding: 6px 21px;
     font-size: 12px;
     display: flex;
     align-items: center;
     gap: 7px;
   }
   .language-switch button[aria-pressed='true'] {
     background: var(--ink);
     color: var(--surface);
   }
   .recommended-dot {
     width: 5px;
     height: 5px;
     border-radius: 50%;
     background: #e69a70;
   }
   main {
     max-width: 1330px;
     margin: auto;
     padding: 44px 52px 52px;
   }
   .button.dark {
     background: var(--ink);
     border-color: var(--ink);
     color: var(--surface);
   }
   .main-footer {
     max-width: 1330px;
     margin: auto;
     padding: 20px 52px 26px;
     border-top: 1px solid var(--line);
     display: flex;
     justify-content: space-between;
     gap: 20px;
     font-family: var(--mono);
     font-size: 9px;
     color: var(--muted);
   }
   .skip-link {
     position: fixed;
     top: -100px;
     left: 10px;
     padding: 10px;
     background: var(--ink);
     color: white;
     z-index: 10;
   }
   .skip-link:focus {
     top: 10px;
   }
   #toast {
     position: fixed;
     bottom: 25px;
     left: 50%;
     transform: translate(-50%, 20px);
     background: var(--ink);
     color: var(--surface);
     padding: 11px 20px;
     border-radius: 5px;
     font-size: 12px;
     box-shadow: 0 5px 25px #0002;
     z-index: 20;
     max-width: calc(100% - 30px);
     opacity: 0;
     pointer-events: none;
     transition:
       opacity 0.2s,
       transform 0.2s;
   }
   #toast.visible {
     opacity: 1;
     transform: translate(-50%, 0);
   }
   .noscript {
     position: fixed;
     inset: 20% 10%;
     z-index: 99;
     background: var(--surface);
     padding: 40px;
     border: 2px solid var(--accent);
   }
   @media (min-width: 1550px) {
     main {
       padding-top: 60px;
     }
   }
   @media (max-width: 1150px) {
     .app-shell {
       grid-template-columns: 205px minmax(0, 1fr);
     }
     .sidebar {
       padding: 30px 18px;
     }
     .topbar {
       padding: 0 32px;
     }
     main {
       padding: 34px 32px;
     }
     .main-footer {
       padding-left: 32px;
       padding-right: 32px;
     }
   }
   @media (max-width: 850px) {
     .app-shell {
       grid-template-columns: 1fr;
     }
     .sidebar {
       position: static;
       height: auto;
       min-height: 0;
       padding: 18px 24px;
       border-right: 0;
       border-bottom: 1px solid var(--line);
       display: grid;
       grid-template-columns: 1fr auto;
       align-items: center;
       gap: 15px;
     }
     .brand {
       font-size: 29px;
     }
     .brand-mark {
       font-size: 21px;
     }
     .sidebar-tagline,
     .sidebar-bottom {
       display: none;
     }
     .navigation {
       display: flex;
       flex-direction: row;
       gap: 3px;
       flex-wrap: wrap;
     }
     .navigation a {
       font-size: 11px;
       padding: 8px;
       gap: 6px;
     }
     .nav-count {
       display: none;
     }
     .nav-symbol {
       font-size: 16px;
       width: auto;
     }
     .topbar {
       height: 68px;
     }
   }
   @media (max-width: 590px) {
     .sidebar {
       padding: 17px 20px 13px;
       display: flex;
       flex-wrap: wrap;
     }
     .brand {
       width: 100%;
       margin-bottom: 3px;
     }
     .navigation {
       width: 100%;
       justify-content: space-between;
     }
     .navigation a {
       padding: 8px 6px;
       font-size: 10px;
       gap: 5px;
     }
     .navigation a:last-child .nav-symbol {
       display: none;
     }
     .topbar {
       padding: 0 20px;
       height: 61px;
     }
     .topbar-label {
       font-size: 8px;
       letter-spacing: 1px;
     }
     .language-switch button {
       padding: 4px 13px;
       font-size: 11px;
     }
     .language-switch {
       padding: 3px;
     }
     main {
       padding: 29px 20px 35px;
     }
     .main-footer {
       padding: 19px 20px;
       flex-direction: column;
       gap: 6px;
       font-size: 8px;
     }
   }
   main:focus {
     outline: none;
   }
   @media (max-width: 590px) {
     .navigation {
       display: grid;
       grid-template-columns: repeat(2, minmax(0, 1fr));
       gap: 4px;
     }
     .navigation a {
       min-height: 40px;
       padding: 8px 10px;
       font-size: 11px;
     }
     .navigation a:last-child .nav-symbol {
       display: inline-block;
     }
   }
   @media print {
     .sidebar,
     .topbar,
     .main-footer,
     #toast {
       display: none;
     }
     .app-shell {
       display: block;
     }
     main {
       padding: 0;
       max-width: none;
     }
   }
   .lab-nav-count {
     background: var(--accent);
     color: #fff9ef;
     border-radius: 9px;
     padding: 1px 6px;
     opacity: 1;
   }
   .navigation a[aria-current='page'] .lab-nav-count {
     background: #d4a280;
     color: #222b23;
   }
   @media (max-width: 850px) {
     .navigation {
       gap: 3px;
     }
     .navigation a {
       font-size: 10px;
     }
     .navigation .nav-count {
       display: none;
     }
   }
   @media (max-width: 590px) {
     .navigation {
       grid-template-columns: repeat(3, minmax(0, 1fr));
     }
     .navigation a {
       font-size: 10px;
       padding: 8px 5px;
       gap: 5px;
       min-height: 40px;
     }
     .navigation a:last-child {
       grid-column: auto;
     }
     .navigation .nav-symbol {
       font-size: 14px;
     }
   }
   @media (min-width: 981px) {
     .sidebar {
       overflow-y: auto;
       min-height: 0;
     }
     .navigation {
       flex-shrink: 0;
     }
     .sidebar-bottom {
       padding-top: 30px;
     }
   }
   @media (max-width: 650px) {
     .navigation a:last-child {
       grid-column: auto;
     }
   }
   .session-status {
     max-width: 1330px;
     margin: auto;
     padding: 44px 52px 0;
   }
   .session-status:empty {
     display: none;
   }
   @media (max-width: 1150px) {
     .session-status {
       padding: 34px 32px 0;
     }
   }
   @media (max-width: 590px) {
     .session-status {
       padding: 29px 20px 0;
     }
   }
   ```

   Si T036 encontró otra lista, la hoja sigue la misma regla: cada regla `shell` de la evidencia, en el orden de `styles.css` y con sus bloques. Si la base trae el texto de una regla distinto del de arriba (por ejemplo, un port que la tocó), manda el texto de la base.
2. **`styles.css`.** Se borra, por texto, cada regla que pasó a `shell.css`. En la regla compartida queda:

   ```css
   .small-label,
   .eyebrow {
     font-family: var(--mono);
     font-size: 10px;
     letter-spacing: 1.4px;
     font-weight: 500;
   }
   ```

   Un bloque `@media` que queda vacío se borra entero. Según la proyección, `styles.css` conserva sólo cuatro bloques: `@media (max-width: 1150px)` con `.search-wrap`, el primero de `@media (max-width: 590px)` con `body` y las reglas base, `@media (prefers-reduced-motion: reduce)` y `@media print` con `body` y `a`.
3. **`main.tsx` (K).** Una línea, inmediatamente después de `import '../../styles.css';`:

   ```ts
   import './shell/shell.css';
   ```

4. **Correr:**
   - `npx vitest run --config frontend/vitest.config.ts --project node main-entry`: la prueba de T038 en verde;
   - `npx prettier --check frontend/styles.css <ruta de shell.css> frontend/src/app/main.tsx`, `npm run build`, `npm test` y `npm run lint`;
   - las medidas del dist (quickstart-f10c.md §1): el script y el marcado iguales a los de T036, el estilo distinto, `chars` como mucho 1 000 por encima;
   - **el multiconjunto:** `node css-multiset.mjs "$TMPDIR/f10c-base" .` da `onlyBase: 0` y `onlyUnit: 0`. La única diferencia que se acepta es la de research-f10c.md, R4: una declaración que Lightning CSS descarta porque otra posterior, del mismo selector, propiedad y contexto, la pisa dentro de dos bloques que la mudanza dejó contiguos. Se lista en el PR con el par de bloques, y el barrido en 0 es la prueba de que no tenía efecto. Cualquier otra diferencia es una regla perdida o duplicada: se corrige en el lugar de la regla, nunca en una declaración;
   - **el barrido:** `node style-sweep.mjs "$TMPDIR/f10c-base" .` da `differences: 0` y `unhandled: []`;
   - **el control negativo** (quickstart-f10c.md §3.5 b), una vez y sin commitear;
   - `E2E_PORT=4193 npm run test:e2e`: la red entera, con las siete de T037 sin editar.
5. **Commit:** `refactor(front): las reglas del shell viven en su hoja, segunda después de styles.css`.

**Compuerta:** la prueba del orden en verde, el multiconjunto en 0 y 0, el barrido en 0, el control negativo con diferencias y la red en verde.

### Tarea 2.3 · Las reglas de una sola página (T040)

**Archivos:** `frontend/styles.css` y la hoja de cada página que T036 nombró en `single:<dueño>`.

La proyección dice que la lista está vacía (research-f10c.md, R3). **Si T036 la encontró vacía,** T040 se cierra sin commit, con la línea «sin reglas de una sola página (T036)» en `tasks-f10c.md`. Si no:

1. **Por cada dueño,** sus reglas se cortan de `styles.css` por texto y se pegan **al principio** de la hoja de esa página, en el orden de `styles.css`, con un bloque `@media` por bloque de origen. Al principio, porque así cada regla sigue antes de todo lo de esa hoja, como estaba (research-f10c.md, R4).
2. **Correr** lo mismo que T039, paso 4: el multiconjunto en 0 y 0, el barrido en 0 y la red en verde.
3. **Commit:** `refactor(front): las reglas que sólo usa <página> viven en su hoja`.

## 3. Unidad 3 · Las huérfanas (FR-055) y los tokens

### Tarea 3.1 · La evidencia y el borrado (T041)

**Archivos:** `frontend/styles.css` y `…/shell/shell.css`, sólo si hay reglas para borrar.

**Consume:** `rule-evidence.mjs` y el árbol de T039 (o de T040).

1. **La evidencia,** sobre el árbol con el build hecho: `node rule-evidence.mjs . frontend/styles.css <ruta de shell.css> > evidence.tsv`.
   - **La salida de error:** `coverageMatchesStyle: true`, ningún centinela falla y `unhandled` vacío.
   - **Una candidata** es una fila con `class` igual a `orphan` y `static` igual a `-`: ningún elemento de la grilla la usa y ninguna fuente nombra sus clases. La columna `coverage` dice `unused`; si dice `used`, la regla se conserva y se investiga, porque la cobertura de Chromium y la medición no coinciden.
   - **Una fila `orphan` con `static` distinto de `-`** se conserva: alguna fuente nombra sus clases. Se lee la fuente; si dibuja la clase en un estado que la grilla no tiene, se suma el estado a `grid.mjs` y se repite el paso. Si la fuente no la dibuja (un falso positivo de la búsqueda), la regla pasa a candidata, con ese motivo.
2. **La lista,** con una fila por regla: la hoja, el selector, el contexto, `states` en 0, la cobertura y el motivo. La aprueba K antes de borrar. Según la proyección, la lista está vacía.
3. **Si la lista está vacía:** sin commit de código. La lista vacía, con el conteo de filas por clase de `evidence.tsv`, va a la descripción del PR (T044) y a research-f10c.md («Línea base de la implementación»). Cumple FR-055 y SC-005: el multiconjunto es el de la base menos cero reglas.
4. **Si no está vacía:**
   1. se borra cada regla por texto, y el bloque `@media` que quede vacío;
   2. el multiconjunto da `onlyBase` igual a las tuplas de las reglas borradas (selector por declaración) y `onlyUnit: 0`;
   3. el barrido da `differences: 0`;
   4. el control de borrado (quickstart-f10c.md §3.5 c), una vez y sin commitear;
   5. `npm run build`, `npm test`, `npm run lint` y la red entera, en verde;
   6. commit: `refactor(front): fuera las reglas de styles.css que ningún elemento usa`, con la lista en el cuerpo.
5. **El control de borrado se corre igual** con la lista vacía: demuestra que la grilla tiene los estados especiales.

**Compuerta:** la evidencia de toda regla de las dos hojas, la lista aprobada y, si hubo borrado, el multiconjunto y el barrido como arriba.

**Fuera de alcance:** las reglas de las hojas de página que la evidencia diera sin uso. FR-055 limpia `styles.css` (la hoja de ruta, «Borra»); lo de una página lo decide su dueño. Si T036 corre la evidencia sobre otras hojas y encuentra alguna, va como hallazgo en el PR.

### Tarea 3.2 · Los tokens para el `@theme` de Tailwind v4 (T042)

**La decisión:** el usuario, 2026-10-28 (spec, `## Clarifications`, «Session 2026-10-28 (F10c, al planificar)»). Tailwind entra en F15; F10c deja los tokens listos y sin cambio visible (research-f10c.md, R12).

**Archivos:** `frontend/styles.css` y `frontend/src/app/shell/shell.css`. Ninguna otra hoja: las de página siguen con los nombres de hoy, que quedan como alias.

**Consume:** el árbol de T041 con el build hecho, la copia de la base de T036, y `tokenize.mjs` y `resolved-multiset.mjs` de quickstart-f10c.md §3.6 y §3.7.

1. **Las reglas de los tokens** (las aplica el codemod, para que ninguna se haga a mano):
   - **el `:root`** se reemplaza entero por este bloque, y el de Go, por el que sigue. Si T036 encontró otro valor en un token de hoy, manda el de la base:

     ```css
      :root {
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

     ```css
      body[data-language='go'] {
        --color-accent: #22626b;
        --color-accent-dark: #174a52;
        --color-accent-soft: #e1ebea;
        --accent: var(--color-accent);
        --accent-dark: var(--color-accent-dark);
        --accent-soft: var(--color-accent-soft);
      }
     ```

   - **los nombres de hoy,** dentro de las dos hojas: `var(--paper)` pasa a `var(--color-paper)`, y lo mismo con `surface`, `ink`, `muted`, `line`, `accent`, `accent-dark`, `accent-soft`, `sage` y `green`; `var(--serif)`, `var(--sans)` y `var(--mono)` pasan a `var(--font-serif)`, `var(--font-sans)` y `var(--font-mono)`;
   - **los colores sueltos,** según la tabla de R12: `#fffdf8` es `--color-surface`, `white` es `--color-white`, y cada uno de los otros once tiene su token; las dos sombras con color pasan a `--shadow-dialog` y `--shadow-toast`;
   - **`font-size: Npx`** pasa a `var(--text-N)`, y **`font-weight: N`**, a `var(--font-weight-N)`;
   - **el armado del shell:** las 21 declaraciones de la tabla `LAYOUT` del codemod (el contenedor de 1 330 px, las columnas de 240 y 205 px de la barra lateral, los altos de 88, 68 y 61 px de la barra superior y los márgenes laterales de 52, 32 y 20 px de la barra superior, `main`, el pie y el estado de la sesión). El codemod falla si alguna no se aplica exactamente una vez.

   Lo demás queda literal y lo decide F15: el resto de los rellenos y márgenes, los radios, el interletrado, el interlineado y las medidas sueltas.
2. **Correr el codemod y formatear:**

   ```sh
   node "$TMPDIR/f10c-compare/tokenize.mjs" . frontend/styles.css frontend/src/app/shell/shell.css
   npx prettier --write frontend/styles.css frontend/src/app/shell/shell.css
   ```

   El codemod no imprime nada si cada entrada de `LAYOUT` se aplicó una vez. Después, ningún color literal queda fuera de los dos bloques de tokens, y ningún nombre viejo se usa en las dos hojas:

   ```sh
   node -e '
   const postcss=require("postcss"),fs=require("fs");
   for (const f of ["frontend/styles.css","frontend/src/app/shell/shell.css"]) postcss.parse(fs.readFileSync(f,"utf8")).walkDecls((d)=>{
     if (d.prop.startsWith("--")) return;
     if (/#[0-9a-f]{3,8}\b|(^|[\s(,])white\b|var\(--(paper|surface|ink|muted|line|accent|accent-dark|accent-soft|sage|green|serif|sans|mono)\)/i.test(d.value)) console.log(f, d.parent.selector, d.prop, d.value);
   });'   # no imprime nada
   ```

3. **Correr:** `npm run build`, `npm test`, `npm run lint` y `npx prettier --check` de las dos hojas.
4. **Las comparaciones,** contra la copia de la base de T036:
   - **el multiconjunto resuelto:** `node "$TMPDIR/f10c-compare/resolved-multiset.mjs" "$TMPDIR/f10c-base" .` da `onlyBase` igual a las tuplas que borró T041 (0, según la proyección) y `onlyUnit: 0`. Resuelve cada `var()` con los tokens de `:root` del dist y normaliza cada valor con Lightning CSS, así que `var(--text-12)` y `12px` son la misma tupla. El multiconjunto de `css-multiset.mjs` cambia a propósito en este paso (los tokens nuevos y las declaraciones con `var()`), y no se usa;
   - **el barrido:** `node "$TMPDIR/f10c-compare/style-sweep.mjs" "$TMPDIR/f10c-base" .` da `differences: 0` y `newTokens: 61`. Chromium enumera las propiedades personalizadas en el estilo computado, así que los 61 nombres nuevos aparecen en cada elemento: el script los cuenta aparte, y compara todo lo demás, también los trece alias, que tienen que valer lo mismo que los nombres de hoy;
   - **el control negativo de los alias** (quickstart-f10c.md §3.5 d), una vez y sin commitear: sacar del bloque de Go las tres líneas `--accent: var(--color-accent);`, `--accent-dark: …` y `--accent-soft: …`. El multiconjunto resuelto sigue igual y el barrido tiene que dar diferencias en los estados en Go que usan `var(--accent)` desde una hoja de página (por ejemplo `campana-go`). Si da 0, el barrido no ve el idioma.
5. `E2E_PORT=4193 npm run test:e2e`: la red entera, con las siete de T037 sin editar.
6. **Commit:** `refactor(front): los colores, la tipografía y el armado del shell y de la base son tokens con nombres de Tailwind v4`.

**Compuerta:** el codemod sin avisos, la búsqueda vacía, el multiconjunto resuelto igual, el barrido en 0 con 61 tokens nuevos, el control negativo con diferencias y la red en verde.

## 4. Unidad 4 · El cierre (K)

### Tarea 4.1 · La documentación (T043, K)

FR-060, en el mismo PR:

- **`docs/architecture.md`:** la fila del shell, que F10b reescribió, dice que `frontend/styles.css` guarda los tokens, con los nombres del `@theme` de Tailwind v4 y los alias de hoy hasta F15, las reglas globales y las clases base, y que las reglas del shell viven en `shell.css` (con su ruta), segunda en `main.tsx`; enlaza [contracts/stylesheets-f10c.md](./contracts/stylesheets-f10c.md).
- **`AGENTS.md`:** se busca `styles.css`; si alguna línea la nombra como dueña del shell, se corrige. Hoy no la nombra.
- **`qa/AGENTS.md`:** no cambia: F10c no retira checks.
- **Comprobar** rutas, comandos y enlaces locales (`git diff --check` y los enlaces relativos).
- **Commit:** `docs(front): styles.css guarda la base y los tokens, y el shell tiene su hoja`.

### Tarea 4.2 · La compuerta y el PR (T044, K)

1. **Los checks de cierre:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `E2E_PORT=4193 npm run test:e2e` y `git diff --check`, todo en verde; `npm run lint` con el mismo total de avisos que en T036 (FR-005).
2. **Las comparaciones finales,** de la base de T036 contra la rama: el multiconjunto resuelto (quickstart-f10c.md §3.7: la base menos las borradas) y el barrido en 0, con `newTokens: 61`. El multiconjunto sin resolver ya no sirve después de T042, que cambia las declaraciones a propósito.
3. **El tamaño:** `chars` antes y después y su diferencia, bajo 1 500 000 y como mucho **5 000** por encima (R9). F10c no suma un router, así que «el aumento del router» de FR-004 es 0.
4. **Sin estilos en línea ni dependencias:** `git diff <base> -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'` y `git diff <base> -- package.json package-lock.json` no imprimen nada.
5. **La imagen web:** con permiso del usuario, `docker compose build taller`.
6. **Las copias descartables:** se borran como dice quickstart-f10c.md §1, paso 6: primero el enlace a `node_modules`, después el worktree, y `git worktree prune`.
7. **El PR** (título y descripción en inglés, la forma de quickstart-f10c.md §4): el problema, qué se mudó (la tabla de la evidencia por clase), la partición de `.small-label, .eyebrow, .topbar-label`, la lista de FR-055 (vacía o con sus reglas), los tokens (la tabla de R12 y qué toma F15), las comparaciones con sus números, los controles, el tamaño, los hallazgos para otros ítems (research-f10c.md, R5: las reglas sin efecto de `.navigation a:last-child`) y lo que queda pendiente.

## Cobertura de requisitos

| Requisito | Tareas | Cómo |
| --- | --- | --- |
| FR-001 | T037 | Siete E2E del shell, con el Page Object, en verde contra la base y sin editar después |
| FR-002 | T037, T039, T041, T042 y T044 | La red entera sin editar después de cada tarea de código |
| FR-003 | T044 | El `grep` de estilos en línea y el diff de `package.json` vacíos |
| FR-004 | T036, T039, T042 y T044 | El dist con un script y un estilo en línea, bajo 1 500 000, con el tamaño antes y después |
| FR-005 | T036 y T044 | El total de `npm run lint` igual; F10c no suma funciones |
| FR-006 | T038, T039 y T044 | Un PR que se revierte entero; la restricción nueva abre en rojo |
| FR-054 | T036, T038, T039 y T040 | La evidencia, la hoja del shell, el orden, el multiconjunto y el barrido |
| FR-055 | T041 | La lista con su evidencia, vacía o no, y el barrido en 0 |
| Los tokens (decisión del 2026-10-28) | T042 | El codemod, el multiconjunto resuelto, el barrido con los tokens nuevos aparte y el control de los alias |
| FR-059 | «Unidades y orden» | Rebasar y repetir T036 si entra otro ítem |
| FR-060 | T043 | `docs/architecture.md`, y `AGENTS.md` si nombra `styles.css` |
| SC-001 | T037 a T044 | La red sin fallas ni ediciones |
| SC-005 | T039 y T041 | El barrido en 0 y el multiconjunto igual a la base menos las borradas |
| SC-008 | T044 | El tamaño, bajo 1 500 000 |
| SC-012 | T044 | Los seis checks y la imagen web |

## Descargas y permisos

Ninguna descarga: `postcss`, `@playwright/test` y el Chrome Headless Shell ya están instalados (F1). El único permiso es el de `docker compose build taller` en T044, como en cada port.

## Riesgos

1. **F10b deja otra carpeta para el shell, otra forma de la prueba del primer lugar o reglas nuevas en `styles.css`.** *Mitigación:* T036 las encuentra y el plan se lee con esos nombres; una regla nueva del shell se muda con las demás.
2. **La base tiene una regla de una sola página o una huérfana que la proyección no ve.** *Mitigación:* la evidencia de T036; T040 y T041 tienen el procedimiento entero aunque la proyección dé 0.
3. **Lightning CSS fusiona dos bloques que la mudanza dejó contiguos** y el multiconjunto pierde una declaración pisada. En `master` pasa (research-f10c.md, R4), y en la base no, porque F3 ya se llevó `.favorite-button`. *Mitigación:* el multiconjunto de T039 lo detecta y el paso 4 dice qué hacer.
4. **El barrido tiene ruido** (un `:hover`, la transición del toast, una fuente). *Mitigación:* el control de determinismo de T036, en 0, antes de comparar nada.
5. **La grilla no tiene el estado que usa una regla.** *Mitigación:* la guarda de las fuentes, los centinelas y el control de borrado.
6. **Un alias de token que no sigue al idioma.** Un `--accent: var(--color-accent)` en `:root` se resuelve ahí, y en Go quedaría en el tono de Rust. *Mitigación:* el bloque de Go vuelve a declarar los tres alias de color, y el control negativo de T042 lo prueba (en el prototipo, la medición de Chromium lo confirmó: R12).
7. **Lo que no se ejecutó al planificar:** la base real de F10c (con F3 a F9, F11a, F12a y F10b), los estados de «Tu cuenta», la administración, el ingreso y el error de la sesión, que en `master` no existen, Docker, la CI y macOS.

## Complexity Tracking

| Decisión | Por qué | La alternativa más simple, descartada |
| --- | --- | --- |
| Medir el dueño de cada regla en el DOM, con la búsqueda en las fuentes como guarda | La búsqueda sola confunde `toast(` con `#toast` y no ve qué página dibuja un componente compartido; la medición sola no ve un estado que falte en la grilla | Sólo `grep`: en la proyección marcaba `#toast` como base y tres selectores de `.small-label, .eyebrow, .topbar-label` como huérfanos (research-f10c.md, R2) |
| Trece alias de los nombres viejos en `:root` | Las hojas de página (`lab.css`, `campaign-page.css`, `systems.css`, `atlas.css` y las de F3 a F12a) usan `var(--accent)` y los demás nombres de hoy; renombrarlos en todas es trabajo de F15, que las migra | Renombrar en todas las hojas: un diff en diez archivos fuera del alcance de F10c, sin cambio visible |
| Siete anchos e impresión en lugar de los seis de la spec | El bloque de 1 550 px tiene una regla del shell (`main`), y la impresión, cuatro | Los seis de FR-054: no verían esas cinco reglas |
