# Tasks: F11d · Lo de D1

**Input**: `specs/015-f11-acceso-cuenta/` (`spec.md`, `plan-f11d.md`, `research-f11d.md`, `quickstart-f11d.md` y `contracts/front-interfaces.md`)

Las ondas y los dueños de archivos están en «Reparto en paralelo» de [plan-f11d.md](./plan-f11d.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **La numeración** sigue la de F11c (T054 a T059, en [tasks-f11c.md](./tasks-f11c.md)): F11d son las unidades U9 y U10. Una tarea de D1c se nombra con el ítem («T020 de D1c»).
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo.
- **Cuándo:** F11d sale de la punta de D1c U5, y sus dos PR se mergean justo después de D1c U3, U4 y U5, seguidos (research-f11d.md, R43).

## Phase 1: Setup — la línea base (coordinador K, onda 0)

- [ ] T060 K · La línea base sobre `f11d/base`: las detecciones B1 a B16 (D1c U3 a U5, «Tu cuenta» de F11a, A3, F8, F10c y los `seedRaw` con clic), el tamaño, los checks, Vitest, los avisos de lint y los E2E, en `specs/015-f11-acceso-cuenta/research-f11d.md` (FR-073 y FR-076; plan 0.1; quickstart-f11d §1)

## Phase 2: User Story 9 - «¿Este progreso es tuyo?» (Priority: P3) — U9 (onda 1: M y E; onda 2: K y E)

- [ ] T061 [P] [US9] M · Specs en rojo de `frontend/src/pages/account/model/import-question-view.ts` y `ui/local-progress-texts.ts`, con el doble `ui/progress-sync.fixture.ts` (FR-064 y FR-065; Review Focus 2; plan 9.1)
- [ ] T062 [US9] M · `selectOpenQuestion`, `importViewOf`, `outcomeOf`, `questionText`, `writtenText` y `reasonText` (FR-064 y FR-065; plan 9.2)
- [ ] T063 [US9] M · Spec en rojo `frontend/src/pages/account/ui/import-question.spec.tsx` (FR-064, FR-065, FR-066 y FR-074; SC-004; Review Focus 2, 3 y 4; plan 9.3)
- [ ] T064 [US9] M · `use-import-question.ts`, `ImportQuestionDialog`, `ImportQuestionFlow`, `ImportOutcomeView`, `ImportReportSummary`, `account.css` e `index.ts` (FR-064 a FR-069; plan 9.4)
- [ ] T065 [US9] K · `<ImportQuestionDialog />` en `frontend/src/app/account/AccountRoot.tsx`, dentro del contexto de T020 de D1c; `boot-check` en verde (FR-064 y FR-076; plan 9.5)
- [ ] T066 [P] [US9] E · `qa/e2e/pages/progress-question.ts`, `qa/e2e/lib/progress-import.ts`, el fixture `progressQuestion` y el E2E `progress-question.spec.ts` (FR-064 a FR-067 y FR-075; SC-004, SC-007 y SC-010; Review Focus 4; plan 9.6)
- [ ] T067 [US9] E · Con la aprobación del usuario, «No es mío» antes de «Borrar todo» en `qa/e2e/specs/progress-sync.spec.ts`, de D1c (FR-076; plan 9.7)
- [ ] T068 K · Compuerta y PR de U9 contra `f11d/base` (FR-076 y FR-077; plan 9.8; quickstart-f11d §2)

## Phase 3: User Story 9 - «Computadora compartida» (Priority: P3) — U10 (onda 1: A; onda 3: M y E; onda 4: K)

- [ ] T069 [P] [US9] A · `frontend/src/pages/account/model/shared-computer-context.ts` y specs en rojo de `frontend/src/app/account/shared-computer.ts` (FR-062 y F11d-1; Review Focus 1; plan 10.1)
- [ ] T070 [US9] A · `createSharedComputer`, `appSharedComputer`, `keepsNoContentCopy`, el `export` de `browserEnvironment` y la guarda de `afterPublish` en `frontend/src/app/boot/content-stage.ts` (FR-062 y F11d-1; plan 10.2)
- [ ] T071 [US9] M · Spec en rojo `frontend/src/pages/account/ui/shared-computer.spec.tsx` (FR-062, FR-063, FR-066 y FR-074; SC-004; Review Focus 5; plan 10.3)
- [ ] T072 [US9] M · `SharedComputerSection`, `SharedComputerOption`, los textos de la opción, la línea en `AccountDialog.tsx` y `account.css` (FR-062, FR-063 y FR-066 a FR-069; plan 10.4)
- [ ] T073 [US9] K · `SharedComputerContext` con `appSharedComputer()` en `frontend/src/app/account/AccountRoot.tsx` (FR-062; plan 10.5)
- [ ] T074 [P] [US9] E · `sharedComputer()` en `qa/e2e/pages/account.ts` y el E2E `shared-computer.spec.ts` (FR-062, FR-063, FR-066, FR-067 y FR-075; SC-004, SC-007 y SC-010; Review Focus 1; plan 10.6)
- [ ] T075 K · Compuerta y PR de U10, apilado sobre U9 (FR-076 y FR-077; plan 10.7; quickstart-f11d §2)

## Phase 4: Polish — documentación, peso y cierre (onda 5: K)

- [ ] T076 K · `docs/architecture.md`, `qa/AGENTS.md` y `contracts/front-interfaces.md` («`pages/account`» y «`app/boot`») (FR-077; plan 11.1)
- [ ] T077 K · El peso contra T060, la compuerta final con la red cinco veces seguidas, la verificación a mano y la entrega de U9 y U10 justo después de D1c U5 (FR-073 y FR-077; SC-008 y SC-011; plan 11.2; quickstart-f11d §3)
