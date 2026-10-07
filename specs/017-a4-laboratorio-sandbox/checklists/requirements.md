# Specification Quality Checklist: A4 · Laboratorio con el sandbox propio

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-07

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

- **Quedan cinco preguntas abiertas** (Q1 a Q5), en «Preguntas abiertas», cada una con sus opciones, su costo, la recomendada y su motivo; el clarify las cierra antes del plan. Siguen la forma de la spec de D1 y no usan el marcador literal: los requisitos que dependen de una pregunta llevan «(Q*n*)» y usan la opción recomendada como borrador (FR-010, FR-019, FR-024, FR-031, FR-032, FR-036, FR-038 y FR-041, entre otros). Por eso el ítem de los marcadores queda sin tildar. Q1 (el id del intento) y Q5 (si A4 espera a B3) cambian el alcance y las dependencias; Q2 a Q4, lo que ve el alumno.
- **Excepciones deliberadas en «implementation details».** A4 cambia un transporte contra contratos HTTP entregados (B2, C3a y D1b), así que los requisitos nombran las rutas, los campos, los estados, los códigos de error, el fixture compartido, los E2E y los checks que cambian: son el resultado observable. No nombran clases, archivos ni módulos nuevos; dónde viven el cliente y el adaptador (FSD) queda para el plan. Los supuestos sobre F7 hablan del puerto por los datos que entran y salen, no por su firma.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones de los ADR 0005 y 0006 y conoce el laboratorio. Los términos técnicos son los suyos.
- **«Technology-agnostic»:** los criterios usan los textos que ve el alumno, `hasPassingEvidence` (la regla única del ADR 0003), el fixture compartido, la cantidad de pedidos y los comandos del proyecto, porque el valor de A4 es qué ve el alumno y qué se guarda. SC-007 incluye una medición sin objetivo, como la SC-012 de B2.
- **«Testable and unambiguous»:** los números de la espera (15 s, 30 s, 2 minutos y 12 minutos) son propuestas que el plan confirma con las mediciones de B2, y los textos son propuestas que el usuario corrige; con eso fijado, cada requisito se verifica.
- **«Scope is clearly bounded»:** trae lo que entra, lo que queda fuera, lo que no se hace a propósito y la lista de cambios visibles. «El seam de hoy y lo que A4 supone de F7» explica por qué A4 es más que el adaptador, y «Qué se puede planificar antes de F7», qué parte depende de F7.
- **Dependencias:** B2 está entregado; A3 (spec 016) y F11 (spec 015) se especifican en paralelo y se citan sin enlace; F7 no tiene spec y entra como los supuestos F7-S1 a F7-S9; B3 es Q5.
- **Partición:** 48 requisitos, por debajo de los 52 de C3a; no se propone partir. El corte natural, si el plan crece, está en «Qué se puede planificar antes de F7».
- **Lo que se midió al especificar** (2026-10-07, sin Docker, sin `npm` y sin descargas):
  - la expresión de `interpretRun` sobre una salida de la plantilla nueva: 0 coincidencias (`node -e`);
  - dónde publica el backend el id del intento: sólo en la foto de `GET /api/progress` y en la exportación de la cuenta, no en la ejecución (búsqueda en `backend/api/app`);
  - los 11 casos de `qa/fixtures/shared/harness-cases.json`;
  - las pruebas E2E que usan el doble del compilador: 11 de las 106 de F1 (8 de `cycle.spec.ts`, 2 de `css-contract.spec.ts` y 1 de `guards.spec.ts`), y ninguna de las 17 de A2 (en el worktree de F2a);
  - los 12 escenarios de `runner-check`;
  - los textos citados, tomados de `frontend/lab.js` y de `frontend/src/shared/api/playground/`.

  No se ejecutó ninguna prueba: la spec no cambia código.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
