---
description: "Tareas de F7b, la vista del laboratorio: un registro liviano; el detalle está en plan-f7b.md"
---

# Tasks: F7b · La vista del laboratorio

**Input**: `specs/021-f7-laboratorio/` (`spec.md`, `plan-f7b.md`, `research-f7b.md`, `quickstart-f7b.md` y `contracts/lab-page.md`). F7a va en `tasks.md` (T001 a T017), y la numeración sigue.

## Phase 1: Setup

- [ ] T018 Línea base sobre `master` con F7a, F5 y F6, los predicados (el arnés de #67, la rama de C4, lo de F5 y F6, la forma del resultado) y los diffs de T027 derivados de nuevo, en `specs/021-f7-laboratorio/research-f7b.md` (plan §0.1)

## Phase 2: Foundational (la red que falta, contra el legacy)

- [ ] T019 [P] [US5] Page Object `panel()` y `panelToggle()` en `qa/e2e/pages/lab.ts`, y el foco del paquete en `qa/e2e/specs/lab-explorer-focus.spec.ts` (plan §1.1)

## Phase 3: User Story 1, 2, 3 y 5 - La página, sin montar (Priority: P1)

- [ ] T020 [P] [US1] Specs rojas de la sesión, los puentes, la entrada, el estado del filtro y el `<pre>` en `frontend/src/pages/lab/model/` y `frontend/src/pages/lab/lib/` (plan §2.1)
- [ ] T021 [US1] El modelo de la página: `frontend/src/pages/lab/model/`, `frontend/src/pages/lab/lib/` y `frontend/src/pages/lab/composition.ts` (plan §2.2)
- [ ] T022 [P] [US2] El hook del editor: `frontend/src/shared/ui/code-editor/create-code-editor.ts`, `use-code-editor.ts` e `index.ts` (plan §2.3)
- [ ] T023 [US2] Stubs y specs rojas de componente en `frontend/src/pages/lab/ui/` (plan §2.4)
- [ ] T024 [US2] Los componentes y `frontend/src/pages/lab/ui/lab-page.css`, sin tocar el índice del slice (plan §2.5)
- [ ] T025 [US2] Sólo en la rama B de C4: los estados y los textos de A4 en la página (plan §2.6)

## Phase 4: User Story 4 y 7 - El corte (Priority: P1)

- [ ] T026 [US2] E2E de X1 en rojo contra el legacy, en `qa/e2e/specs/lab-react.spec.ts` (plan §3.1)
- [ ] T027 [US7] El corte en un commit: `frontend/src/app/legacy/lab-api.ts` y `register-lab.tsx`, `frontend/src/pages/lab/index.ts`, la cadena, las hojas, los borrados, los adaptadores de F5 y F6 y los checks de `qa/` (plan §3.2)

## Phase N: Polish

- [ ] T028 Las comparaciones únicas: el DOM, las trazas de los exploradores, el barrido de estilo y el control negativo (plan §4.1 y quickstart-f7b.md §3)
- [ ] T029 Documentación: `docs/architecture.md`, `qa/AGENTS.md` y `AGENTS.md` (plan §4.2)
- [ ] T030 Compuerta final, comprobación con lector de pantalla y PR (plan §4.3 y quickstart-f7b.md §5)
