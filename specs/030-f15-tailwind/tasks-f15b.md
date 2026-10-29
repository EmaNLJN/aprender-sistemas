# Tasks: F15b · La migración por slice

**Input**: `specs/030-f15-tailwind/` (`spec.md`, `plan-f15b.md`, `research.md`, `quickstart-f15b.md` y `contracts/stylesheets-f15.md`)

Cada línea remite al plan. Cada slice es un PR, en este orden, con la base de la línea anterior integrada; cada uno aplica la receta entera (plan-f15b.md §1, R1 a R6). K es el agente principal. La numeración sigue a la de F15a (T001 a T013).

## Phase 1: User Story 4 - El piloto: Proyecto (Priority: P2)

- [ ] T014 [US4] K · El inventario de `frontend/src/pages/project/ui/project.css`: reglas, clases base, marcadores, `!important`, lo que el barrido no ve, condiciones (FR-027, FR-030; plan-f15b §2, T014; R1)
- [ ] T015 [US4] Los E2E del piloto en `qa/e2e/specs/project-style.spec.ts`, en verde contra la base (FR-028; SC-010; plan-f15b §2, T015; R2)
- [ ] T016 [US4] `Eyebrow`, `PageHeading`, `SmallLabel`, `RecommendationStrip` y `StepCheck` en `frontend/src/shared/ui/`, Proyecto con utilidades, `project.css` borrada de `main.css`, `ENTRY_IMPORTS` y `ALLOWED_SHEETS` (FR-029 a FR-031; plan-f15b §2, T016; R3, R4)
- [ ] T017 [US4] K · Las comparaciones, el peso del piloto con el tope de cada slice en `research.md`, la documentación y el PR (FR-001, FR-004, FR-032; SC-007; plan-f15b §2, T017; R5, R6; quickstart-f15b §2, §3)

## Phase 2: User Story 4 - Los slices restantes (Priority: P2)

- [ ] T018 [US4] `shared/ui/form` sin `form.css`, con `FieldLabel` (plan-f15b §3)
- [ ] T019 [US4] `entities/privacy-notice` sin `privacy-notice.css` (plan-f15b §3)
- [ ] T020 [US4] `features/sign-in` sin `access.css`, con `Button` y el marcador `button` (plan-f15b §3)
- [ ] T021 [US4] `pages/account` sin `account.css` (plan-f15b §3)
- [ ] T022 [US4] `pages/admin` sin `admin.css` (plan-f15b §3)
- [ ] T023 [US4] Método sin `method.css`, con `TextButton`, `NoteState`, `DialogContent` y `DialogActions`, y el control del toque (plan-f15b §3)
- [ ] T024 [US4] Biblioteca sin `library.css`, con `Pill`, `SearchField`, `EmptyState` y `VisuallyHidden` (plan-f15b §3)
- [ ] T025 [US4] Recorrido sin `route.css` (plan-f15b §3)
- [ ] T026 [US4] Atlas sin `atlas.css` (plan-f15b §3)
- [ ] T027 [US4] Sistemas sin `systems.css`, con `LabEmpty` (plan-f15b §3)
- [ ] T028 [US4] Campaña sin `campaign-page.css` (plan-f15b §3)
- [ ] T029 [US4] Laboratorio sin `quest-explorers.css`, `lab-page.css` ni `lab.css` (plan-f15b §3)
- [ ] T030 [US4] Shell sin `shell.css`, con `.noscript` en `@layer base` de `main.css` (FR-033; plan-f15b §3)
- [ ] T031 [US4] Cada pantalla que haya entrado antes de F15a, sin su hoja, en su lugar según el tamaño (plan-f15b §3)
