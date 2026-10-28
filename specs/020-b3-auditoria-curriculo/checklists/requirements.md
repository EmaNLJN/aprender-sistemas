# Specification Quality Checklist: B3 · Auditoría local del currículo

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

- **Quedan cinco preguntas abiertas** (Q1 a Q5), en «Preguntas abiertas», cada una con sus opciones, su costo, la recomendada y su motivo; el clarify las cierra antes del plan. Siguen la forma de las specs de D1 y de A4 y no usan el marcador literal: los requisitos que dependen de una pregunta llevan «(Q*n*)» y usan la opción recomendada como borrador (FR-006, FR-009, FR-022, FR-023, FR-025, FR-032 y FR-034, entre otros). Por eso el ítem de los marcadores queda sin tildar. Q1 decide qué es «fallar» para un código inicial; Q2 y Q3, dónde corre y si bloquea el merge; Q4, los límites y la memoria; Q5, la prueba propia.
- **Excepciones deliberadas en «implementation details».** B3 audita un sandbox entregado contra contratos entregados (B1 y B2), así que los requisitos nombran los estados y los motivos de la clasificación de B2, los límites del ADR 0005, las tablas que no se escriben, el archivo del caché de Go y los comandos del proyecto: son el resultado observable. No nombran clases nuevas, el nombre del comando ni dónde vive su código; eso queda para el plan. FR-009 sí fija que corre dentro de la imagen de la API, porque es la única forma de que el programa auditado sea el que arma B2 (FR-003).
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones de los ADR 0005 y 0006 y conoce el sandbox. Los términos técnicos son los suyos.
- **«Technology-agnostic»:** los criterios usan los conteos de programas, los estados de B2, las filas de las tablas y los comandos del proyecto, porque el valor de B3 es justamente qué pasa en ese sandbox. SC-005 es una medición sin objetivo, como la SC-012 de B2.
- **«Testable and unambiguous»:** «Cómo se decide cada programa» fija el veredicto de cada caso; el umbral del aviso (la mitad de un límite) es una propuesta que el plan confirma con SC-005.
- **«Scope is clearly bounded»:** trae lo que entra, lo que queda fuera (A4, B2, B1, la fuerza de las pruebas, los kits y la CI) y lo que no se hace a propósito.
- **Dependencias:** B2 está entregado (spec 005). A4 (spec 017, PR #50) se cita sin enlace porque todavía no está en `master`; su Q5, sin responder, decide si A4 espera a B3. C4 (spec 008) recibe la recomendación de B3 antes de su G2.
- **Partición:** 37 requisitos, por debajo de los 52 de C3a; no se propone partir.
- **Lo que se midió al especificar** (2026-10-28, sin Docker, sin `npm` y sin descargas, en un directorio temporal fuera del repositorio):
  - el generador de `tools/content` sobre un `git archive` de esta rama, con el `node_modules` del repositorio principal enlazado;
  - los 548 programas (solución e inicial de los 274 ejercicios) armados con un renderizador de la gramática de B2 escrito aparte en JavaScript, compilados con `rustc` 1.97.1 y `go` 1.27.2 del host (`GOTOOLCHAIN=local`, `GOPROXY=off`) y clasificados con la tabla de B2: 274 de 274 soluciones aprueban; los 137 iniciales de Go y 125 de Rust fallan por las pruebas; 11 iniciales de Rust no compilan (diez `reparar` y `rust-63`) y `rust-71` aborta. Los tiempos y la memoria pico están en «Línea de base medida en el host»;
  - los `imports` de los ejercicios de Go, leídos del `curriculum.json` generado, contra `backend/executor/images/go/warm/main.go`: 26 paquetes, 0 diferencias;
  - el uso de `time.Sleep` y de hilos o goroutines en el código del currículo, por búsqueda de texto;
  - que `ExecutorResult::fromPayload` de B2 rechaza un resultado con un campo de más (lectura del código), lo que pesa en el costo de Q4-B.

  No se ejecutó ninguna prueba del proyecto: la spec no cambia código.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
