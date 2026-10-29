# Specification Quality Checklist: E1 · La sesión Esenciales

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

- **El clarify está pendiente.** La spec no usa marcadores `[NEEDS CLARIFICATION]`: las cinco dudas son Q1 a Q5 de «Preguntas del clarify». Cada una trae opciones, la recomendada, su motivo y su costo, como en las specs 016, 017 y 020. Los requisitos que dependen de una pregunta llevan «(Q*n*)» y están escritos con la opción recomendada. Por eso queda sin marcar «No [NEEDS CLARIFICATION] markers remain», hasta que el usuario responda.
- **Qué cambia según la respuesta:**
  - Q1 cambia los temas, *N* y FR-043 y FR-044;
  - Q2 cambia FR-001, FR-004, FR-012, FR-026 y FR-033, y quita la migración si no es A;
  - Q3 cambia FR-026 a FR-033, FR-037 y FR-040, y con C suma la campaña y su riesgo 8;
  - Q4 cambia FR-005, FR-021 y FR-029;
  - Q5 cambia FR-043 y FR-044, y con A suma un ítem a la hoja de ruta.
- **Excepciones deliberadas en «implementation details».** E1 suma un catálogo a un sistema entregado (C2, C3a, B2, D1a, D1b y A2) y a contratos ya fijados (A3, B3, F6, F7, F10). Por eso los requisitos nombran el resultado observable: los recursos y sus reglas, las tablas que no se crean, las columnas `level`, los archivos de `content/`, los checks y las E2E que cambian o no, y los comandos del proyecto. No nombran clases, funciones nuevas ni el diseño del laboratorio, que quedan para el plan. FR-002 sí fija dónde vive el contenido, porque es una decisión de la hoja de ruta y del ADR 0006 («numerar al final») y el encargo pide decirlo.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que decide el contenido y conoce el sistema. «Qué es Esenciales para el alumno» y Q1 están escritos para la decisión pedagógica, sin jerga de código.
- **«Technology-agnostic»:** los criterios usan conteos de porciones, de ejercicios y de programas, las huellas del generador y los comandos del proyecto, porque el valor de E1 es sumar sin cambiar un byte de lo que existe. SC-009 es una medición sin objetivo.
- **«Scope is clearly bounded»:** la spec trae lo que entra, lo que queda fuera y lo que no se hace a propósito. La tabla «Qué cambia en cada capa» dice qué cambia y qué no en el contenido, la base, la API, el progreso, la auditoría, el front y los conteos.
- **Los conteos:** la tabla «Los conteos visibles» dice de cada uno cuánto vale hoy, cuánto con E1, quién lo deriva del catálogo y quién lo edita a mano si no se deriva.
- **Dependencias:** A1, D1a y D1b están entregados. E1 se apoya en C2, C3a, B2 y A2, que están en `master`, y en las specs 016 (A3), 020 (B3), 019 (F6), 021 (F7) y 024 (F10), con clarify y sin entregar. La spec cubre los dos estados de F10 y de A3 (FR-024, FR-025 y FR-032) y propone que E1 espere a F7b (FR-035).
- **Partición:** 44 requisitos, por debajo de los 52 de C3a. No se propone partir; Q5 sólo separa el contenido.
- **Lo que se midió al especificar** (2026-10-28, sin Docker, sin `npm` y sin descargas; sólo lectura):
  - las 49 etapas de cada manifiesto (20 de `lab`, 4 de `quests` y 25 de `systems`), así que Esenciales empezaría en la 50;
  - que el motor de la campaña recibe todos los ejercicios del laboratorio (`getExercises`) y su validador exige `^(rust|go)-\d+$`;
  - que `findPortionProblem` rechaza una porción vacía, y que la forma de ID de la API es `[a-z0-9][a-z0-9-]{0,63}`;
  - que la admisión de `/api/runs` lee el ejercicio por ID sin mirar el catálogo;
  - que `Portion` de la API fija hoy 18 casos y tres catálogos;
  - las cuatro columnas `level` de la base;
  - las E2E de F1 que esperan `rust-01` y las de `impl-f7a` que fijan 137 y 49 temas;
  - que el recorrido libre sigue el mismo orden que el mapa (`navigationList()`): las E2E que usan «anterior» y «siguiente» lo hacen dentro de un mundo o de un taller, o vuelven al mismo ejercicio, y la de F7a sobre el último ejercicio (`rust-137`) sólo sigue en verde si Esenciales va primero;
  - que las 17 E2E de A2 (`content-gate.spec.ts`) alteran el documento construido y no fijan cuántas porciones tiene.

  No se ejecutó ninguna prueba del proyecto: la spec no cambia código.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
