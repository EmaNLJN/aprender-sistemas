# Tasks: E2 · El contenido de Esenciales

**Input**: `specs/029-e2-contenido-esenciales/` (`spec.md`, `plan.md`, `research.md` y `quickstart.md`)

La cadena, los dueños (C, el agente redactor; K, el coordinador; U, el usuario) y los valores de cada etapa están en [plan.md](./plan.md). Cada línea remite a su paso del plan, con sus archivos, sus comandos y lo esperado. `[P]` marca el borrador que corre mientras el usuario revisa la etapa anterior (Q4-A). Las etapas se integran en orden (FR-006): un PR por etapa, con los dos lenguajes (Q2-A).

## Phase 1: Setup — La base (K)

- [ ] T001 Precondiciones (E1 y B3 en `master`), el worktree `e2/etapa-2`, los valores de la base, los contratos de conteo que quedan a mano y los errores de la piloto (FR-007, FR-018; plan 0.1)

## Phase 2: La etapa 2, «Valores y tipos» (US1 a US4)

- [ ] T002 [US3] El borrador de la etapa 2: `content/{rust,go}/manifest.yaml`, `content/{rust,go}/exercises/{lenguaje}-143…147/` y los contratos de conteo, primero en rojo (FR-001 a FR-005, FR-008, FR-018; plan 1.1)
- [ ] T003 [US3] Las compuertas automáticas de la etapa 2 y el rojo de los procedimientos de `quickstart.md` (FR-003, FR-009, FR-010, FR-015 a FR-017; SC-002, SC-005 a SC-008; plan 1.2)
- [ ] T004 [US4] La revisión del usuario de la etapa 2 (FR-011; SC-004; plan 1.3)
- [ ] T005 [US2] B3 de registro, el PR y el merge de la etapa 2 (FR-012 a FR-014; SC-003; plan 1.4)

## Phase 3: La etapa 3, «Decidir» (US1 a US4)

- [ ] T006 [P] [US3] El borrador de la etapa 3 sobre `e2/etapa-2`: `content/{rust,go}/exercises/{lenguaje}-148…152/`, los manifiestos y los contratos (FR-001 a FR-005, FR-008, FR-018; plan 2.1)
- [ ] T007 [US3] El rebase sobre la etapa 2 integrada, el contraste con su texto final y las compuertas de la etapa 3 (FR-006, FR-008 a FR-010, FR-015 a FR-017; plan 2.2)
- [ ] T008 [US4] La revisión del usuario de la etapa 3 (FR-011; SC-004; plan 2.3)
- [ ] T009 [US2] B3 de registro, el PR y el merge de la etapa 3 (FR-012 a FR-014; SC-003; plan 2.4)

## Phase 4: La etapa 4, «Repetir» (US1 a US4)

- [ ] T010 [P] [US3] El borrador de la etapa 4 sobre `e2/etapa-3`: `content/{rust,go}/exercises/{lenguaje}-153…157/`, los manifiestos y los contratos (FR-001 a FR-005, FR-008, FR-018; plan 3.1)
- [ ] T011 [US3] El rebase sobre la etapa 3 integrada, el contraste con su texto final y las compuertas de la etapa 4 (FR-006, FR-008 a FR-010, FR-015 a FR-017; plan 3.2)
- [ ] T012 [US4] La revisión del usuario de la etapa 4 (FR-011; SC-004; plan 3.3)
- [ ] T013 [US2] B3 de registro, el PR y el merge de la etapa 4 (FR-012 a FR-014; SC-003; plan 3.4)

## Phase 5: Polish — El cierre (K)

- [ ] T014 [US1] Esenciales completo: 20 por lenguaje en las etapas 50 a 53, la superposición y los errores de las cuatro etapas, la suite, el navegador y la fila de la hoja de ruta (FR-001, FR-003; SC-001, SC-006; plan 4.1)
