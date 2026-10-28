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

- [x] No [NEEDS CLARIFICATION] markers remain
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

- **Clarify del 2026-10-28:** el usuario respondió Q1 a Q5 con la opción recomendada, y quedaron en «Clarifications», con las descartadas; la sección «Preguntas abiertas» se retiró. Se registraron también tres decisiones de otras specs que cambian lo que A4 construye: la Q2 de F7 (un canal de progreso con una unión ampliable), P2 (F7 se parte y A4 espera a F7a) y que A3 no pide la plantilla del arnés al arrancar (la pide A4). Los requisitos que llevaban «(Q*n*)» como borrador aplican la respuesta (FR-010, FR-019, FR-024, FR-028, FR-029, FR-031 a FR-036, FR-038, FR-041, FR-043, FR-044 y FR-047), y los supuestos F7-S1 a F7-S9 pasaron a la tabla de lo que decidió F7. Ya no quedan preguntas abiertas: el ítem de los marcadores queda tildado.
- **Excepciones deliberadas en «implementation details».** A4 cambia un transporte contra contratos HTTP entregados (B2, C3a y D1b), así que los requisitos nombran las rutas, los campos, los estados, los códigos de error, el fixture compartido, los E2E y los checks que cambian: son el resultado observable. No nombran clases, archivos ni módulos nuevos; dónde viven el cliente y el adaptador (FSD) queda para el plan. Los supuestos sobre F7 hablan del puerto por los datos que entran y salen, no por su firma.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones de los ADR 0005 y 0006 y conoce el laboratorio. Los términos técnicos son los suyos.
- **«Technology-agnostic»:** los criterios usan los textos que ve el alumno, `hasPassingEvidence` (la regla única del ADR 0003), el fixture compartido, la cantidad de pedidos y los comandos del proyecto, porque el valor de A4 es qué ve el alumno y qué se guarda. SC-007 incluye una medición sin objetivo, como la SC-012 de B2.
- **«Testable and unambiguous»:** los números de la espera (15 s, 30 s, 2 minutos y 12 minutos) son propuestas que el plan confirma con las mediciones de B2, y los textos son propuestas que el usuario corrige; con eso fijado, cada requisito se verifica.
- **«Scope is clearly bounded»:** trae lo que entra, lo que queda fuera, lo que no se hace a propósito y la lista de cambios visibles. «El seam de hoy y lo que F7 decidió» explica por qué A4 era más que el adaptador y qué contrato recibe de F7a, y «Qué se puede planificar antes de F7a», qué parte depende de F7a.
- **Dependencias:** B2 está entregado; A3 (016), F11a (015), F7a (021) y B3 (020) están clarificadas en sus ramas y se citan sin enlace hasta que se integren.
- **Partición:** 48 requisitos, por debajo de los 52 de C3a; no se parte. El corte natural, si el plan crece, es la frontera de F7a («Qué se puede planificar antes de F7a»).
- **Lo que se midió al especificar** (2026-10-07, sin Docker, sin `npm` y sin descargas):
  - la expresión de `interpretRun` sobre una salida de la plantilla nueva: 0 coincidencias (`node -e`);
  - dónde publica el backend el id del intento: sólo en la foto de `GET /api/progress` y en la exportación de la cuenta, no en la ejecución (búsqueda en `backend/api/app`);
  - los 11 casos de `qa/fixtures/shared/harness-cases.json`;
  - las pruebas E2E que usan el doble del compilador: 11 de las 106 de F1 (8 de `cycle.spec.ts`, 2 de `css-contract.spec.ts` y 1 de `guards.spec.ts`), y ninguna de las 17 de A2 (en el worktree de F2a);
  - los 12 escenarios de `runner-check`;
  - los textos citados, tomados de `frontend/lab.js` y de `frontend/src/shared/api/playground/`.

  No se ejecutó ninguna prueba: la spec no cambia código.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
