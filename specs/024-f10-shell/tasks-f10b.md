---
description: "Tareas de F10b, la raíz única, el shell y el router: un registro liviano; el detalle está en plan-f10b.md"
---

# Tasks: F10b · La raíz única, el shell y el router

**Input**: `specs/024-f10-shell/` (`spec.md`, `plan-f10b.md`, `research-f10b.md`, `quickstart-f10b.md` y `contracts/f10b-shell-router.md`). F10a va en `tasks.md` (T001 a T014), y la numeración sigue.

## Phase 1: Setup

- [ ] T015 Inventario de la base y línea base: los `window.*`, los adaptadores, el marcado estático, la cadena, las hojas, los nombres de `qa/` y si F12a está, en `specs/024-f10-shell/research-f10b.md` (plan §0.1; FR-048)

## Phase 2: Foundational (las piezas puras, sin montar)

- [ ] T016 [P] [US5] `routeFromHash` y la ruta de la administración en `frontend/src/shared/config/url-grammar.ts`, con su spec primero (plan §1.1; FR-012)
- [ ] T017 [P] [US2] `linkedLanguage` en `frontend/src/app/router/linked-language.ts`, con su spec primero (plan §1.2; FR-021)
- [ ] T018 [P] [US3] Los conteos del menú y el resumen del recorrido en `frontend/src/app/shell/menu-counts.ts` y `route-summary.ts`, con sus specs primero (plan §1.3; FR-025 y FR-032)
- [ ] T019 [P] [US3] El toast en `frontend/src/app/shell/toast.ts`, con su spec primero (plan §1.4; FR-028)
- [ ] T020 [P] [US1] El router propio en `frontend/src/app/router/navigator.ts`, con su spec primero (plan §1.5; FR-016 a FR-018 y FR-030)

## Phase 3: User Story 4 - Las vistas del arranque y el shell, sin montar (Priority: P1)

- [ ] T021 [P] [US4] Las vistas de la compuerta y de la sesión como componentes, en `frontend/src/app/boot/boot-screens.ts`, `ContentGateScreen.tsx` y `SessionStatus.tsx` (plan §2; FR-038)
- [ ] T022 [P] [US3] El shell en React en `frontend/src/app/shell/` (`NavigationMenu`, `RouteProgress`, `Sidebar`, `LanguageSwitch`, `SkipLink` y `ToastRegion`), con sus specs primero (plan §3; FR-019, FR-022 y FR-024)

## Phase 4: User Story 7 - La composición sin `window` (Priority: P2)

- [ ] T023 [US7] `frontend/src/app/shell/shell-state.ts` y, en `frontend/src/app/routes/`, `page-engines.ts`, `page-entries.tsx`, las sesiones, `campaign-missions.ts` y `project-kit.ts`, sin montar, con los dueños nuevos de R4 en `qa/lib/seams-guard.ts` (plan §4.1; FR-050 y FR-051)
- [ ] T024 [US7] El armado de `progress-backup` arma su fuente con imports, sin `window`, en `frontend/src/app/progress-backup/app-progress-backup.ts` (plan §4.2; FR-027 y FR-051)
- [ ] T025 [US7] `frontend/src/app/legacy/lab-api.ts` sin `window`, `qa/lib/app-modules.ts` y los checks de `legacy-sources.ts` leyendo un solo paquete, en un commit (plan §4.3; FR-049)

## Phase 5: User Story 1, 2, 3, 4 y 7 - El corte (Priority: P1)

- [ ] T026 [US1] `qa/e2e/specs/shell-edges.spec.ts` en verde; el rojo y el arreglo de F10-A1 en `qa/e2e/specs/views.spec.ts` y `frontend/app.js`; el rojo de `qa/e2e/specs/shell-changes.spec.ts` (plan §5.1; FR-033 y FR-046)
- [ ] T027 [US4] Las specs rojas de la raíz: `shell-stage.spec.ts`, `boot-stages.spec.tsx`, `boot-modules.spec.tsx`, `start-taller.spec.tsx` y `frontend/src/app/main-entry.spec.ts` (plan §5.2; FR-040 y FR-052)
- [ ] T028 [US7] El corte en un commit: la raíz única, `index.html`, las etapas, el movimiento de `lab-api.ts` a `app/lab/`, el retiro de `app.js`, de `legacyViews`, de `app/legacy/`, de la raíz de la cuenta, de los tres checks y sus arneses, `dist-content-check`, `seams-guard` y `dump-globals` (plan §5.3; FR-034 a FR-037, FR-047 a FR-053; SC-003)

## Phase 6: User Story 5 - La administración como ruta (Priority: P2)

- [ ] T029 [US5] El rojo: `AdminPage.open()` en `qa/e2e/pages/admin.ts`, los cinco escenarios de F12a, `qa/e2e/specs/admin-route.spec.ts` y las specs de `pages/account` (plan §6.1; FR-043)
- [ ] T030 [US5] `#administracion` en `frontend/src/app/routes/page-entries.tsx` y `router/app-navigator.ts`, el enlace en «Tu cuenta» y el retiro de `AdminDialog` y `.admin-dialog` (plan §6.2; FR-041 a FR-044; SC-011)

## Phase 7: User Story 6 - La devolución de la lección queda montada (Priority: P3)

- [ ] T031 [US6] La comprobación con lector de pantalla sobre la base (acción del usuario) y el rojo de `qa/e2e/specs/route-lesson-feedback.spec.ts` (plan §7.1; FR-045)
- [ ] T032 [US6] `#quiz-feedback` montada en `frontend/src/pages/route/ui/LessonDialog.tsx` y su regla `:empty` en `route.css`, y la comprobación sobre F10b (plan §7.2; FR-045)

## Phase 8: Polish

- [ ] T033 Las comparaciones únicas del DOM del shell, el estilo computado, el multiconjunto, el tamaño e `import.meta`, en `specs/024-f10-shell/research-f10b.md` (plan §8.1; quickstart-f10b §4; SC-004, SC-005 y SC-008)
- [ ] T034 La documentación: `AGENTS.md`, `docs/architecture.md` y `qa/AGENTS.md` (plan §8.2; FR-060)
- [ ] T035 Compuerta y PR de F10b (plan §0.2 y §8.3; SC-001 y SC-012)
