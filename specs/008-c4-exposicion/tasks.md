# Tasks: C4 · Exposición

**Input**: `specs/008-c4-exposicion/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S3) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, sus firmas y sus comandos. Las verificaciones V1 a V5 van primero: cada una decide algo que las tareas siguientes dan por hecho. Como en C3a, cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec.

## Phase 1: Setup — Línea de base y descargas (coordinador, onda 0)

- [ ] T001 [US7] Línea de base: C3a, A3, C3b y C3c integrados, las suites y los checks de hoy en verde, y las tablas, los servicios y los volúmenes anotados (FR-002, FR-046; plan 0.1)
- [ ] T002 [US2] Lote 1 de descargas, con permiso: el módulo ACME de Nginx y Pebble 2.10.1 (FR-047; plan 0.2)

## Phase 2: Foundational — Verificaciones previas (onda 1; V5, en la onda 2)

*N, F, K y D parten de S0 y corren a la vez. Cada uno deja su resultado en `research.md` por T008.*

- [ ] T003 [P] [US2] V1 (N): el módulo ACME en la imagen sin privilegios, con Pebble, y `backend/api/scripts/acme-check.sh` (FR-006 a FR-010; SC-002; plan 1.1)
- [ ] T004 [P] [US3] V2 (F): la CSP con nonce y el editor, sin `vite-plugin-singlefile` (FR-016 a FR-019; SC-004; plan 1.2)
- [ ] T005 [P] [US4] V3a (K): la publicación en IPv4 explícito, sin `[::]` (FR-001, FR-027; plan 1.3)
- [ ] T006 [P] [US5] V4 (D): los privilegios de `taller_backup` y el tiempo de restauración (FR-031, FR-034, FR-042; plan 1.4)
- [ ] T007 [US6] V5 (B con el usuario): el destino de los respaldos, después de T016 (FR-036; SC-009, SC-010; plan 1.5)
- [ ] T008 [US3] S1: los resultados de V1 a V4 en `specs/008-c4-exposicion/research.md` y las decisiones de Q1 y Q3 (FR-006, FR-016; plan 1.6)

## Phase 3: Foundational — Nginx, front y MySQL (dueños N, F y D; onda 2)

*Parten de S1. Dentro de la onda: T014 antes de la verificación de T018, y T018 antes de T015.*

- [ ] T009 [P] [US3] Cabeceras, nonce, caché, cierre por CSRF y límites en `docker/nginx/` y `qa/nginx-headers-check.ts` (FR-013, FR-015, FR-016, FR-021, FR-025, FR-028; plan 2.1)
- [ ] T010 [US1] La configuración pública y la imagen: plantillas, entrypoint y módulo ACME en `docker/nginx/public/` y `frontend/Dockerfile` (FR-004 a FR-009, FR-012; plan 2.2)
- [ ] T011 [P] [US3] Sin `vite-plugin-singlefile`: `frontend/vite.config.ts`, `qa/build-check.ts` y `qa/lib/built-page.ts` (FR-020, FR-023; SC-013; plan 3.1)
- [ ] T012 [US3] El nonce en el editor: `frontend/src/shared/lib/csp-nonce.ts` y `mount-code-editor.ts` (FR-018; plan 3.2)
- [ ] T013 [US3] La guardia de regresión de la política en `qa/csp-guard-check.ts` (FR-017, FR-019; SC-005; plan 3.3)
- [ ] T014 [P] [US5] `docker/mysql/db-grants.sql` por rol en dos fases, `apply-grants.sh`, el inicio de MySQL y el aviso de `backend/api/docker/migrate.sh` (FR-030, FR-031, FR-032; plan 4.1)
- [ ] T015 [US5] La prueba de la matriz: `qa/api-grants-check.ts` y `qa/fixtures/mysql-roles.json` (FR-033; SC-007; plan 4.2)

## Phase 4: User Story 6 - Un respaldo cifrado fuera del host que se restaura (Priority: P1) — dueño B (onda 2)

*T016 espera el lote 2 de descargas y el servicio `backup` de T019.*

- [ ] T016 [P] [US6] La imagen y el script de respaldo con su check contra un S3 local en `docker/backup/` y `backend/api/scripts/backup-check.sh` (FR-011, FR-034 a FR-037, FR-039 a FR-041, FR-047; SC-009; plan 5.1)
- [ ] T017 [US6] La restauración completa y el simulacro de recuperación a un punto en el tiempo en `backend/api/scripts/restore-check.sh` (FR-037, FR-038, FR-042; SC-008; plan 5.2)

## Phase 5: User Story 1 y 7 - Compose y operación (Priority: P1 y P2) — dueño K (onda 2)

- [ ] T018 [P] [US7] La base de Compose con los roles y `grants`, `init-env.sh`, `deploy.sh` y `backend/api/scripts/compose-check.sh` (FR-002, FR-024, FR-030, FR-032, FR-038, FR-040; SC-012; plan 6.1)
- [ ] T019 [P] [US1] `docker/compose.public.yaml` y `docker/public.sh` con su check y sus costuras de prueba, `TALLER_ENV_FILE` y `TALLER_DEPLOY_SCRIPT` (FR-001 a FR-003, FR-011, FR-014, FR-024, FR-029, FR-039 a FR-041; plan 6.2)

## Phase 6: User Story 1, 3 y 4 - Verificación de punta a punta (dueño Q; onda 3)

*Parten de S2.*

- [ ] T020 [P] [US1] `backend/api/scripts/public-check.sh` y `docker/compose.public-test.yaml`: las clases, el nombre único, las cookies, la IP real, los límites y TLS (FR-001, FR-004, FR-005, FR-010, FR-012, FR-015, FR-022, FR-024 a FR-028, FR-043; SC-001, SC-003, SC-006, SC-011; plan 7.1)
- [ ] T021 [P] [US3] El recorrido en Chromium y el cierre de sesión por CSRF en un navegador real: `qa/e2e/specs/csp-walk.spec.ts` (FR-018, FR-023, FR-025; SC-004; plan 7.2)
- [ ] T022 [US7] El job `public` de la CI en `.github/workflows/ci.yml` (FR-046; plan 7.3)
- [ ] T023 [US4] La rotación de registros comprobada en los contenedores, y su medición una semana después de G2 (FR-029; plan 7.4)

## Phase 7: Polish — Documentación, compuertas y cierre (coordinador y el usuario; onda 4)

- [ ] T024 [US7] La documentación, la guía `docs/operacion-publica.md` y el ADR que enmienda el 0004 §1 (FR-045; plan 8.1)
- [ ] T025 [US6] La compuerta G1: los checks, la restauración presenciada, V5 y C3 entregado (FR-042, FR-044; plan 8.2)
- [ ] T026 [US1] G2: abrir con el entorno de pruebas de la autoridad, la prueba desde datos móviles, producción y la rampa de HSTS (FR-014, FR-043, FR-044; SC-001, SC-011; plan 8.3)
- [ ] T027 [US7] El cierre y la evidencia, con SC-010 como evidencia pendiente (FR-044, FR-046; SC-010, SC-012, SC-013; plan 8.4)
