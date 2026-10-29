# Tasks: E1 · La sesión Esenciales

**Input**: `specs/026-e1-esenciales/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/essentials.md` y `quickstart.md`)

Las ondas, los dueños, las interfaces y las compuertas están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a su paso del plan, con sus archivos, su código y sus comandos. `[P]` marca lo que corre a la vez que otras tareas `[P]` de su fase, con archivos disjuntos. La cola de cada dueño es secuencial. `npm test` de `e1/base` queda en rojo a propósito desde T003 hasta S2 (T016), como en B2: `e1/base` no va sola a `master`.

## Phase 1: Setup — La base (onda 0, K)

- [ ] T001 Precondiciones (F7a, F7b y B3 en `master`), variantes de A3 y F10, rama `e1/base`, la base congelada `qa/fixtures/content-baseline-e1.json` y los conteos de la base (FR-009, FR-035, FR-039; plan 0.1)

## Phase 2: Foundational — El generador y la etapa piloto (onda 1: G, después C; U desde T004)

- [ ] T002 [US2] Las pruebas del generador en rojo y la guarda `qa/content-baseline-check.ts`: `qa/content-exercises-check.ts` y `qa/curriculum-meta-check.ts` (FR-002 a FR-009, FR-012, FR-039; SC-001; plan 1.1)
- [ ] T003 [US2] El generador: `tools/content/{catalogs,exercises,load-curriculum,meta}.ts` y `frontend/src/shared/config/levels.ts` (FR-001 a FR-008, FR-012, FR-043; plan 1.2)
- [ ] T004 [US4] La etapa piloto, redactada por el agente C: la sección `essentials` de `content/{rust,go}/manifest.yaml` y `content/{rust,go}/exercises/{lenguaje}-138…142/` (FR-005, FR-043, FR-044; plan 1.3)
- [ ] T005 [US4] La revisión pedagógica del usuario, compuerta antes de la auditoría (T017) y del PR (T019) (FR-044; plan 1.4)

## Phase 3: User Story 3 - La API sirve Esenciales (Priority: P1) — onda 2, A

- [ ] T006 [P] [US3] Las pruebas de la API en rojo: `PortionTest`, `SessionEndpointTest`, `ContentMetaTest`, `EssentialsContentTest`, `EssentialsLevelTest` y los conteos de Pest (FR-011 a FR-016, FR-036, FR-038; SC-002, SC-007; plan 2.1)
- [ ] T007 [US3] La API: `Portion`, `ContentReader`, `PortionAssembler` y la migración de `exercises.level` (FR-011 a FR-016, FR-018; plan 2.2)
- [ ] T008 [US4] El orden de la auditoría: `AuditCatalogReader` y su prueba (FR-022; plan 2.3)

## Phase 4: User Story 5 - Los conteos dicen la verdad (Priority: P2) — onda 2, Q

- [ ] T009 [P] [US5] Los contratos de conteo de `qa/`: `content-document`, `content-check`, `curriculum-ids-check` y su fixture, `systems-check`, `campaign-content-check`, `project-kit-check`, `api-sync-check` y `api-import-check` (FR-005, FR-036; SC-008; plan 2.4)

## Phase 5: User Story 1 - Empezar por Esenciales (Priority: P1) — onda 2, F y E

- [ ] T010 [P] [US1] Las specs del modelo en rojo: `levels`, `levelOf`, el orden del catálogo, `todayChallenge`, `topicNumber`, `assembleContent`, `PORTION_NAMES`, la importación en `lab-store` y, si A3 entró, `COPY_FORMAT` (FR-004, FR-020, FR-024, FR-028 a FR-030, FR-033; SC-004; plan 2.5)
- [ ] T011 [US1] El modelo: `entities/exercise`, `pages/lab/model/map-selectors.ts`, `app/content` y `shared/api/content`, con la variante de A3 (FR-024, FR-028 a FR-030; plan 2.6)
- [ ] T012 [US1] Las specs de componentes en rojo: `LevelTabs.spec.tsx` y `TopicGrid.spec.tsx` (FR-026, FR-029; plan 2.7)
- [ ] T013 [US1] Los componentes, la lectura del catálogo sin globales, `dist-content-check` y el menú si F10 no entró (FR-025, FR-026, FR-029, FR-031, FR-032; plan 2.8)
- [ ] T014 [P] [US1] Las dos E2E de F1 que esperan `rust-01`, en rojo y en un commit propio (FR-040; SC-006; plan 2.9)
- [ ] T015 [US1] `lab-essentials.spec.ts` y `qa/e2e/lib/built-curriculum.ts`, y los conteos de `lab-map.spec.ts` leídos del documento construido, sin conteos ni IDs que E2 vaya a cambiar (FR-019, FR-027, FR-028, FR-031, FR-040; SC-004; plan 2.10)

## Phase 6: User Story 2 - Nada de lo que ya tenía cambia (Priority: P1) — S2, K

- [ ] T016 [US2] La integración y la compuerta completa: quickstart §1 a §4 y §6, conteos contra T001 y barrido de literales (FR-020, FR-021, FR-033, FR-034, FR-037, FR-041, FR-042; SC-001, SC-002, SC-005, SC-006, SC-009; plan 3.1)

## Phase 7: Polish — La auditoría, la documentación y el cierre (onda 3, K y U)

- [ ] T017 [US4] La auditoría de B3 con runsc, después de T005, sobre la versión aprobada y el último commit, y su resumen; un cambio posterior la repite (FR-017, FR-022, FR-023, FR-044; SC-003; plan 4.1)
- [ ] T018 La documentación: `README.md`, `backend/api/AGENTS.md` y `docs/adr/0009-esenciales-ids-y-etapas.md`, con la regla de una etapa nueva en otra sección (FR-010, FR-036; plan 4.2)
- [ ] T019 El cierre: T005 aprobada, la compuerta final y el PR de `e1/base` a `master` (FR-042; plan 4.3)
