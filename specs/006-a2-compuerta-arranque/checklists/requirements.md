# Specification Quality Checklist: A2 · Compuerta de arranque

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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`: FR-004 (Q1, la fuente del contenido entre A2 y A3), FR-007 (Q2, qué ve el alumno si el contenido no llega) y FR-014 (Q4, el «HTML autónomo» y `build-check`). FR-009 (Q2), FR-015 (Q4), FR-018 (Q3) y FR-024 (Q5) llevan su opción recomendada como «(propuesta)». FR-010 y FR-011 son propuestas de la spec sin pregunta propia, y las lista «Assumptions». Las cinco preguntas están en «Preguntas abiertas», cada una con sus opciones, su costo y su opción recomendada; el clarify las cierra antes del plan. El mecanismo para diferir las vistas legacy no es una pregunta: lo decide el spike.
- Excepciones deliberadas en «implementation details»: la feature es un cambio del build y del arranque del front, así que nombrar la herramienta de build, los checks de `qa/` y los artefactos es parte del requisito. Los FR piden resultados (todo o nada, el progreso intacto, el HTML sin currículo, el mismo volcado de globals). La técnica para diferir la evaluación (`import()` encadenados, top-level await, una función por vista, chunks) aparece sólo en el spike y en «Alternativas consideradas», como hipótesis con su regla de decisión. FR-018 y FR-020 nombran un `fetch` simulado porque es la forma de probar la compuerta sin red (ADR 0004, §5).
- «Non-technical stakeholders»: el lector es el dueño del taller, que conoce los ADR 0004 y 0006 y el mapa del front. Los términos técnicos son los suyos.
- «Technology-agnostic»: el sha256 del documento y de las porciones, el volcado de `dump-globals` y los checks de `qa/` son los criterios que ya usan C2 y A1 para probar que el contenido no cambió. La feature no tiene otro resultado observable: su valor es que nada cambia cuando el contenido llega y que nada se rompe cuando no llega.
- «Testable and unambiguous»: el tope de espera de FR-007 y el umbral del estado de carga de FR-010 los fija el plan con su motivo, y el tope de tamaño de FR-015 sale de la medida del spike (P3). El criterio es verificable una vez fijados.
- «Scope is clearly bounded»: la spec lista lo que entra, lo que queda fuera y lo que no se hace a propósito. No toca las seis vistas legacy (FR-023), la API ni el generador, y deja a A3 el protocolo completo.
- El spike (P1 a P5) está definido con su pregunta, su medida y su regla de decisión; todavía no corrió sobre el `main.tsx` real. La observación preliminar salió de una sonda fuera del repositorio (`vite build` sobre tres módulos de prueba), sin correr `npm run build` ni Docker.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
