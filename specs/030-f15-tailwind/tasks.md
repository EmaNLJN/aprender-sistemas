# Tasks: F15a · La base de Tailwind CSS v4

**Input**: `specs/030-f15-tailwind/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/stylesheets-f15.md`)

Cada línea remite a la tarea del plan con sus archivos, sus interfaces y sus comandos. La cola es secuencial: cada tarea parte de la compuerta de la anterior. K es el agente principal. F15b sigue en `tasks-f15b.md` (T014 a T031) y F15c, en `tasks-f15c.md` (T032 a T039).

## Phase 1: Setup — La línea base y las herramientas

- [ ] T001 K · La línea base: F10c en `master`, los supuestos de research.md R15, el número del ADR, las condiciones de `@media`, la red, las medidas del dist y la copia de la base, en `specs/030-f15-tailwind/research.md` (FR-004, FR-007; plan 0.1; quickstart §1)
- [ ] T002 Las herramientas de F10c en `qa/e2e/style-compare/` (`grid.ts` con el estado `editor`, `style-sweep.ts` con los pseudoelementos, `newTokens` y `removedTokens`, `rule-evidence.ts` y `resolved-multiset.ts` con las capas), `canonicalMedia` en `qa/lib/css-blocks.ts` y `allowImportingTsExtensions` en `qa/e2e/tsconfig.json`; el control de determinismo en 0 (FR-001, FR-022; plan 1.1; quickstart §3.3 a)

## Phase 2: Foundational — Los checks primero

- [ ] T003 [US2] El lector `qa/lib/css-blocks.ts`, la fixture congelada `qa/fixtures/theme-tokens-f10c.json` y `qa/style-output-check.ts` (tokens, theme, preflight, `!`, interlineado, `@media` y `:hover`), en verde contra la base y con sus controles (FR-005, FR-014, FR-015, FR-019, FR-020, FR-038; plan 2.1)
- [ ] T004 [US3] La lista cerrada de hojas en `qa/stylesheets-check.ts`, en verde contra la base y con sus controles (FR-023; SC-006; plan 2.2)
- [ ] T005 [US2] La entrada en `frontend/src/app/main-entry.spec.ts` y el orden de capas en `qa/style-output-check.ts`, en rojo (FR-006, FR-011, FR-012, FR-017; plan 2.3)

## Phase 3: User Story 5 - Las dependencias entran con permiso (Priority: P2)

- [ ] T006 [US5] K · El permiso y `tailwindcss` 4.3.3 y `@tailwindcss/vite` 4.3.3, exactas, en `package.json` y `package-lock.json`; `npm ci` en verde (FR-009; SC-008; plan 3.1)
- [ ] T007 [US2] K · La sonda de Tailwind 4.3.3 en una copia descartable, con el resultado de cada fila de research.md R10 (FR-010, FR-017, FR-024; plan 3.2; quickstart §4)

## Phase 4: User Story 2 - La base entra sin cambiar un píxel (Priority: P1)

- [ ] T008 [US2] La entrada `frontend/src/app/main.css` con la capa heredada, las siete reglas del editor en `frontend/src/shared/ui/code-editor/code-editor.css`, las exclusiones de `sr-only` y `visible`, el plugin en `frontend/vite.config.ts` (K) y `main.tsx` (K); las colisiones en `qa/style-output-check.ts`; el barrido en 0 y sus controles (FR-010 a FR-014, FR-017, FR-018, FR-022; plan 4.1; quickstart §3.3 b y c)
- [ ] T009 [US2] Los 61 tokens en el `@theme static` de `frontend/src/app/main.css` y los 13 alias en `frontend/styles.css`; el barrido con `--spacing` y el control sin `static` (FR-015, FR-016, FR-038; plan 4.2; quickstart §3.3 d)
- [ ] T010 [US1] El `:hover` con cualquier puntero y las variantes `upto-*` y `from-*` en `frontend/src/app/main.css` (FR-019, FR-020; plan 4.3)

## Phase 5: Polish — El cierre (K)

- [ ] T011 K · El aviso de Tailwind en `frontend/THIRD-PARTY-NOTICES.txt`, si la salida lo lleva (FR-024; plan 5.1)
- [ ] T012 [US3] K · El ADR `docs/adr/0010-tailwind-css-v4.md` en «propuesta», el README, `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` y la línea en el contrato de F10c (FR-008, FR-021, FR-025, FR-026; plan 5.2)
- [ ] T013 K · Los checks de cierre, las comparaciones finales, el tamaño, la imagen web y el PR (FR-001 a FR-006, FR-022; SC-001 a SC-003, SC-005, SC-007 a SC-009; plan 5.3; quickstart §5)
