# Specification Quality Checklist: E2 · El contenido de Esenciales

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

- **El clarify está pendiente.** La spec no usa marcadores `[NEEDS CLARIFICATION]`: las cinco dudas son Q1 a Q5 de «Preguntas del clarify». Cada una trae opciones, la recomendada, su motivo y su costo. Los requisitos que dependen de una pregunta llevan «(Q*n*)» y están escritos con la opción recomendada. Por eso queda sin marcar «No [NEEDS CLARIFICATION] markers remain», hasta que el usuario responda.
- **Qué cambia según la respuesta:**
  - Q1 cambia las tablas de «El contenido de cada etapa» (dónde va `bool`, o el tema de la etapa 4), FR-001 y FR-002;
  - Q2 cambia FR-013, la cantidad de PRs de SC-001 y la tabla de conteos (con B, los conteos avanzan de a un lenguaje);
  - Q3 cambia FR-011 y FR-014;
  - Q4 cambia el paso 1 de «El recorrido de una etapa» y FR-008, no FR-006: el merge va en orden con cualquier respuesta;
  - Q5 cambia FR-010, FR-015 y FR-017 (con B, la comparación necesita excepciones declaradas).
- **E2 es contenido, no código.** Por eso casi todos los requisitos describen un proceso con compuertas comprobables (comandos del proyecto, la comparación del meta, el resumen de B3 y la aprobación registrada) en lugar de un comportamiento nuevo del sistema. El comportamiento del alumno ya lo fija E1; las historias 1 y 2 lo comprueban con el contenido completo.
- **Excepciones deliberadas en «implementation details».** Los requisitos nombran archivos de `content/`, comandos, checks y el formato del resumen de B3, porque son los contratos que E1 y B3 ya fijaron y los que un PR de etapa tiene que respetar. No nombran clases ni funciones nuevas: E2 no trae código.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que decide la pedagogía. «El contenido de cada etapa» y «Criterios de la revisión pedagógica» están escritos para esa decisión y para que el usuario los corrija.
- **«Technology-agnostic»:** los criterios usan conteos de ejercicios, de diferencias, de archivos y de programas, y la aprobación del usuario. Los conteos de la tabla son los esperados con el plan de E1 de hoy, no literales para copiar.
- **«Scope is clearly bounded»:** la spec trae lo que entra, lo que queda fuera, lo que no se hace a propósito y la lista exacta de lo que puede tocar un PR de etapa (FR-017).
- **Dependencias:** E1 (spec 026, en el PR #81) entregado en `master`, con la piloto aprobada, y B3 (spec 020) con su check del resumen en la CI. La spec usa el plan de E1 del worktree `spec-e1` (cabfdb67) y lo dice en Assumptions.
- **Partición:** 18 requisitos, muy por debajo de los 52 de C3a. No se propone partir.
- **Lo que se midió al especificar** (2026-10-28, sin Docker, sin `npm` y sin descargas; sólo lectura de `master` bb480677, de `spec-e1` cabfdb67 y de `impl-b3` 72574433):
  - las dos primeras etapas de Inicial de cada lenguaje (`rust-01` a `rust-10` y `go-01` a `go-10`), para la columna «Deja para Inicial»; `rust-08`, `rust-09` y `go-07` ya enseñan bucles;
  - que el `content-check` del plan de E1 ata los IDs y las etapas de Esenciales a la posición, en etapas de cinco (T009), y que sus E2E nuevas fijan «5 desafíos visibles.» y `rust-142` (T015);
  - que B3 da como «falla como corresponde» cualquier error de compilación de un inicial `reparar`, sin mirar cuál;
  - que el resumen de B3 lleva `documentHash` y `harnessHash`, y que la CI los recalcula desde la cabeza del PR;
  - que la plantilla del harness de Rust corre cada prueba en `catch_unwind` y espera un `bool`;
  - que las imágenes del sandbox son Rust 1.99 y Go 1.27.

  No se ejecutó ninguna prueba del proyecto: la spec no cambia código.
- **Enlaces:** los de `../026-e1-esenciales/` resuelven cuando se integre el PR #81. El resto se comprobó en este árbol.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
