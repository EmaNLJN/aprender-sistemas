# Tasks: F15c · El cierre

**Input**: `specs/030-f15-tailwind/` (`spec.md`, `plan-f15c.md`, `research.md`, `quickstart-f15c.md` y `contracts/stylesheets-f15.md`)

Cada línea remite al plan. La cola es secuencial y empieza con el último PR de F15b integrado. K es el agente principal. La numeración sigue a la de F15b (T014 a T031).

## Phase 1: Setup — La línea base (K)

- [ ] T032 K · La base de F15c, la búsqueda de alias, la evidencia de `frontend/styles.css`, el conteo de `!important` de las globales y las ediciones `SAMPLES` y `HERITAGE_LAYERS` de `qa/e2e/style-compare/`; el control de determinismo (FR-001, FR-036; plan-f15c 0; quickstart-f15c §1)

## Phase 2: User Story 6 - El taller termina con una sola manera de estilar (Priority: P3)

- [ ] T033 [US6] Lo que el preflight toca y el barrido no lee, en `qa/e2e/specs/preflight-style.spec.ts`, en verde contra la base (FR-039; plan-f15c 1, T033)
- [ ] T034 [US6] Las reglas de clase base sin usuarios, fuera de `frontend/styles.css`, con su evidencia (FR-036; plan-f15c 1, T034)
- [ ] T035 [US6] El estado final de `main-entry.spec.ts`, `qa/style-output-check.ts` y `qa/stylesheets-check.ts`, sin capa heredada, en rojo (FR-006, FR-037; SC-004; plan-f15c 2, T035)
- [ ] T036 [US6] Las globales y el bloque de Go en `@layer base` de `frontend/src/app/main.css`, sin `frontend/styles.css` ni los 13 alias; `var(--font-mono)` en `code-editor.css` (FR-033, FR-035, FR-036; plan-f15c 2, T036)
- [ ] T037 [US6] El preflight en `base`, con sus reglas compensatorias contadas y listadas, los estados del editor en `grid.ts` y el conteo de `!important` en `qa/style-output-check.ts` (FR-039; SC-005, SC-011; plan-f15c 3, T037)

## Phase 3: Polish — El cierre (K)

- [ ] T038 K · `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` y las consecuencias del ADR 0010 con el estado final (FR-008, FR-037; plan-f15c 4, T038)
- [ ] T039 K · Los checks de cierre, las comparaciones finales, el tamaño, la imagen web y el PR (FR-001 a FR-006; SC-001, SC-002, SC-007, SC-009, SC-011; plan-f15c 4, T039; quickstart-f15c §3)
