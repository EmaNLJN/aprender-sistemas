# Tasks: F10c · La limpieza de `styles.css`

**Input**: `specs/024-f10-shell/` (`spec.md`, `plan-f10c.md`, `research-f10c.md`, `quickstart-f10c.md` y `contracts/stylesheets-f10c.md`)

Cada línea remite a la tarea del plan con sus archivos, sus interfaces y sus comandos. La numeración sigue a la de F10a (T001 a T014) y F10b (T015 a T035) en la misma carpeta (research-f10c.md, R1). La cola es secuencial: cada tarea parte de la compuerta de la anterior. K es el agente principal.

## Phase 1: Setup — La línea base (K)

- [ ] T036 [US7] K · La línea base y el inventario: la red, las medidas del dist, la copia de la base, el control de determinismo en 0, la evidencia de `frontend/styles.css` contra la proyección y las ubicaciones de F10b, en `specs/024-f10-shell/research-f10c.md` (FR-004, FR-005, FR-059; plan 0.1; quickstart-f10c §1, §3.5 a)

## Phase 2: User Story 7 - Lo legacy desaparece y `qa/` se queda con lo que sirve (Priority: P2)

- [ ] T037 [US7] Los E2E del aspecto del shell, en verde contra la base: `qa/e2e/pages/shell.ts` y `qa/e2e/specs/shell-style.spec.ts` (FR-001, FR-002; SC-001; plan 1.1)
- [ ] T038 [US7] La hoja del shell va segunda, en rojo: `BASE_SHEETS` de `frontend/src/app/main-entry.spec.ts`, la spec de F10b (FR-006, FR-054; plan 2.1)
- [ ] T039 [US7] Las reglas del shell a `frontend/src/app/shell/shell.css`, cortadas de `frontend/styles.css`, y el import en `frontend/src/app/main.tsx` (K); el multiconjunto y el barrido en 0, y el control negativo del orden (FR-054; SC-005; plan 2.2; quickstart-f10c §3.5 b)
- [ ] T040 [US7] Las reglas de una sola página a la hoja de su página, si T036 encontró alguna (FR-054; plan 2.3)
- [ ] T041 [US7] La evidencia de las huérfanas, la lista aprobada por K y su borrado de `frontend/styles.css` y de la hoja del shell, si la lista no está vacía; el control de borrado (FR-055; SC-005; plan 3.1; quickstart-f10c §3.4, §3.5 c)

## Phase 3: Polish — El cierre (K)

- [ ] T042 K · La documentación: `docs/architecture.md` y, si nombra `styles.css` como dueña del shell, `AGENTS.md` (FR-060; plan 4.1)
- [ ] T043 K · Los checks de cierre, las comparaciones finales, el tamaño, la imagen web y el PR (FR-002 a FR-006; SC-001, SC-005, SC-008 y SC-012; plan 4.2; quickstart-f10c §4)
