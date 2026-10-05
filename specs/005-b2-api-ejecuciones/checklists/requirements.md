# Specification Quality Checklist: B2 · API de ejecuciones

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-05

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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`: FR-007 (Q1, cuotas), FR-020 (Q2, fase en vivo) y FR-037 (Q3, composición del `grading_hash`). Son las decisiones que el ADR 0006 y la spec de C2 dejaron abiertas para B2. FR-034 (Q4, historial de intentos) y FR-044 (Q5, retenciones) llevan su opción recomendada como «(propuesta)», y FR-010 (qué gasta cuota) es un supuesto de esta spec que se confirma con Q1. Las cinco preguntas están en «Preguntas abiertas», cada una con sus opciones y su costo, la recomendada y su motivo; el clarify las cierra antes del plan. Q1 y Q2 son las preguntas 16 y 18 del ADR 0006 §13.
- Excepciones deliberadas en «implementation details»: lo que pidió el usuario nombra la técnica (cola propia, workers, 503 con `Retry-After`, plantilla del harness, `test_key`), así que la spec la nombra como restricción. Los FR describen contratos HTTP (rutas, estados y códigos de error) porque son el entregable de una API y no una elección de implementación; ninguno nombra clases, archivos nuevos ni bibliotecas. Los archivos y componentes de hoy aparecen sólo donde la spec dice qué cambia (el generador, el importador, `frontend/lab.js`), y los tipos de columna quedan en el ADR 0006.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó estas decisiones y conoce los ADR 0005 y 0006. Los términos técnicos son los suyos.
- «Technology-agnostic»: SC-009 (el sha256 de las porciones) y SC-013 (los comandos de verificación) nombran lo que el proyecto ya usa para comprobar un cambio. El resto de los criterios se expresa en estados, respuestas y conteos, y SC-012 es una medición sin objetivo todavía.
- «Scope is clearly bounded»: el alcance tiene sus listas de lo que entra, lo que queda fuera (D1, A4, C5, B3, C3, C4 y E1) y lo que no se hace a propósito. Q4 deja a elección el único ítem que la hoja de ruta no nombra, los endpoints de historial.
- Dependencias: C3 todavía no tiene spec, así que sus aportes están en una tabla de supuestos, cada uno con lo que se rompe si C3 lo resuelve distinto. El ADR 0006 sigue en propuesta: su tabla «Base del ADR 0006» separa lo decidido de lo que cambia si el usuario lo enmienda.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
