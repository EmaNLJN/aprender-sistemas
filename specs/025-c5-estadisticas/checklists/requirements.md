# Specification Quality Checklist: C5 · Estadísticas del admin

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-28

**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Antes del clarify.** La spec no usa marcadores `[NEEDS CLARIFICATION]`: las cinco preguntas están en «Preguntas abiertas», cada una con sus opciones, la recomendada y su costo, y los requisitos están escritos con la opción recomendada y llevan «(Q*n*)», como hizo B3 antes de su clarify. El ítem «No [NEEDS CLARIFICATION] markers remain» queda sin marcar hasta que el usuario responda: entonces la sección «Clarifications» recibe una línea por pregunta y «Preguntas abiertas» pasa a «Preguntas del clarify».
- **Qué cambia con cada alternativa** (con la recomendada no cambia nada):
  - **Q1-B** (la opción elegida por cuenta): FR-009 deja salir la opción por cuenta; FR-030 la suma a la grilla, a la campaña, a los talleres y al recorrido; la fila «La opción que eligió una cuenta» sale de «Nunca sale»; la historia 3, escenario 5, se invierte; SC-002 suma esas claves a las permitidas.
  - **Q1-C** (textos para tutoría): no cabe en C5. La spec queda como está y la tutoría es un ítem nuevo, con su ADR, que enmienda D31 y D33, el FR-041 de C3b y FR-006, FR-013 y FR-014 de esta spec.
  - **Q1-D** (sólo agregados con umbral): FR-011 pasa a exigir un umbral (por ejemplo, 5 alumnos) con el agregado vacío por debajo; salen FR-015, FR-017, FR-029, FR-030, FR-031, FR-035 y FR-037, la historia 4, SC-004 (su segunda mitad) y SC-005; Q2 y Q3 dejan de tener objeto; FR-002 pierde tres rutas, y la hoja de ruta, «el resumen en la ficha». Además, FR-032 pierde el filtro por cuenta y la cuenta de cada ejecución, y FR-010 queda sin rutas que lleven identificadores: si no, la lista de ejecuciones seguiría siendo una vista por cuenta.
  - **Q2-B** (sin lista): sale FR-029; FR-002 pierde `stats/students`; sale el escenario 1 de la historia 4; el hallazgo 3 pierde esa ruta.
  - **Q2-C** (la lista de C3b suma la última actividad): FR-029 pasa a ser un cambio aditivo de `GET /api/admin/users` (la última actividad y su orden), que F12a ya consume; el escenario 1 de la historia 4 cambia; la prueba de esa lista en C3b cambia con él.
  - **Q3-B** (sin registro): salen FR-015 y SC-005, y el escenario 5 de la historia 4; el hallazgo 7 pierde la mención del registro.
  - **Q4-B** (F12c): el hallazgo 1 propone una parte de F12 y una enmienda de la spec 023, cuyo «Queda fuera» nombra las estadísticas. **Q4-C** (C5 trae pantallas): entran requisitos de interfaz, Vitest y Playwright, y la dependencia de F11a y F12a; la spec pasaría de 52 requisitos y habría que partirla (C5a la API, C5b las pantallas). **Q4-D** (sin pantallas): sale el hallazgo 1.
  - **Q5-B** (sólo `active`): FR-016 excluye a `disabled`; cambian los dos primeros casos de Edge Cases. **Q5-C** (filtro para los admins): FR-016 suma el parámetro y FR-034 lo suma a la clave de la caché.
- **Excepciones deliberadas en «implementation details».** C5 lee tablas entregadas (B2, D1, C3a y C3b), y su límite de privacidad sólo es verificable si nombra qué columnas no salen: por eso «El límite de privacidad» y «De dónde salen los datos» nombran tablas y columnas, y FR-006, FR-007, FR-009 y FR-013 las citan. Las rutas salen del §7 del ADR 0006 y de la hoja de ruta, y son el contrato que espera el ítem del front. Los criterios de verificación nombran los comandos del proyecto, como en B2 y B3. No se nombran clases nuevas, la forma exacta de los JSON (salvo las claves que la matriz prohíbe o permite) ni dónde vive el código: eso queda para el plan.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones de los ADR 0005 y 0006 y conoce las tablas por su nombre. Los términos técnicos son los suyos.
- **«Technology-agnostic»:** los criterios cuentan cifras, testigos, claves, líneas de log, filas y candados, porque el valor de C5 es justamente qué sale de esas tablas y qué no. SC-008 es una medición sin objetivo, como la SC-012 de B2: con los rollups fuera de C5, un objetivo de 2 s que fallara no tendría arreglo dentro del ítem (FR-040).
- **«Testable and unambiguous»:** cada métrica dice su fuente (FR-020 y la tabla de «De dónde salen los datos»), y SC-001 las compara con una población contada a mano, que incluye un alumno sin cabecera de progreso (nunca practicó) para que una consulta que lo pierda falle. El tope de tiempo, el período por omisión y la escala de la población sintética son supuestos que el plan confirma con la medición.
- **«Scope is clearly bounded»:** trae lo que entra, lo que queda fuera (las pantallas, los rollups, la exportación, la tutoría con textos, los rechazos y las estadísticas del alumno) y lo que no se hace a propósito.
- **Dependencias:** C3a, C3b, B2, D1a y D1b están entregados y en `master` (24ba9d3d); C5 no espera a A4 ni a D1c para construirse, pero sus datos reales llegan con ellos (hallazgo 2). F12 (spec 023) está especificada y planificada (F12a), sin implementar; F10 (spec 024) está especificada.
- **Partición:** 42 requisitos, 9 criterios y 6 historias, por debajo de los 52 de C3a; no se propone partir. Sólo Q4-C la haría necesaria.
- **Lo que se leyó al especificar** (2026-10-28, sin Docker, sin `npm` y sin descargas, sobre `master` en 24ba9d3d): las migraciones de las tablas que C5 lee (`users`, `invitations`, `progress_heads`, `attempts`, `attempt_tests`, `attempt_payloads`, `runs`, `exercise_progress`, las doce de D1, `exercises`, `catalogs`, `worlds`, `world_exercises`, `workshops` y `guide_steps`), con sus índices: `attempts` ya tiene `(exercise_id, attempted_at, outcome)` y `(user_id, exercise_id, attempted_at)`, y la columna virtual `counted`; `backend/api/tests/Feature/Admin/NoStudentTextsTest.php` (las seis claves prohibidas, los testigos y las 8 rutas recorridas); `app/Admin/PublishedAdminUser.php` (la forma de la ficha); `bootstrap/app.php` (el grupo `admin`); `app/Auth/Limiters.php` (120 por minuto); `config/runs.php` (las retenciones de 14 y 90 días y las cuotas); `config/app.php` y `config/database.php` (UTC); y `docker/compose.yaml` (`EXECUTOR_MAX_CONCURRENT` sólo en `executor` y en las réplicas de `worker-runs`). No se ejecutó ninguna prueba: la spec no cambia código.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
