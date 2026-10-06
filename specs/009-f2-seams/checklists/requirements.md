# Specification Quality Checklist: F2 · Seams sin cambio visible

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-05

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

- Los cuatro marcadores `[NEEDS CLARIFICATION]` que quedaban (Q1 a Q4: FR-055, FR-030, FR-023 y FR-052) se resolvieron en el clarify del 2026-10-06 y ya no están en la spec: las respuestas figuran en `## Clarifications` y las opciones que no se eligieron, en «Alternativas consideradas». La partición de F2 también se aceptó ese día.
- «Requirements are testable and unambiguous» se marcó al responder el clarify: los seis requisitos que dependían de una respuesta ya la tienen: FR-023 (Q3), FR-030 y FR-040 (Q2, la inversión de las dos pruebas de riesgo, las dos en la unidad 1), FR-029 (el mecanismo del guard, también de Q2), FR-052 (Q4) y FR-055 (Q1).
- Excepciones deliberadas en «implementation details»: F2 es un refactor y su objeto son módulos, capas y archivos. La spec nombra la capa y el slice de Feature-Sliced Design, los exports provisionales y las rutas de los archivos legacy porque son lo que se mueve, y las herramientas (Vitest, Playwright, Zustand) porque las fijan el ADR 0008, `AGENTS.md` y el clarify (Q3), no el diseño de esta spec. Los nombres de módulos y de exports son provisionales y los confirma el plan; la spec fija la capa, la responsabilidad y el contrato. No hay código.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del épico y conoce el mapa del front legacy. Los términos técnicos son los suyos. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- «Technology-agnostic»: SC-002, SC-009 y SC-012 nombran los comandos y los checks de verificación del proyecto porque son lo que se ejecuta. Los demás criterios hablan de bytes, de escrituras, de reglas y de pruebas, no de cómo se construyen.
- El conteo es de esta spec: 60 requisitos, con una obligación comprobable por requisito, contra los 52 de C3a, la mayor del épico. Por eso el usuario aceptó partirla en F2a (unidades 1 a 4, 42 requisitos) y F2b (unidades 5 a 8, 36, con las 18 reglas de toda unidad repetidas en cada una); la spec no se corta en dos archivos todavía. El coordinador pidió además que las unidades 1 a 4 se entreguen primero y por separado (FR-019).
- Los seis contratos de A2 (F2-I1 a F2-I6, plan en `spec/a2-compuerta`) están recogidos como requisitos: la tabla de «Relación con otros ítems» los lleva a FR-035, FR-032, FR-021, FR-017, FR-003 y FR-015. La suscripción de los cuatro y la interfaz de respaldo salen de la spec de D1, y los seis sitios de estilo, de la de C4: las tres son borradores y entran como supuestos.
- Discrepancias que la spec registra y no corrige: el ADR 0008 todavía dice «propuesta» en esta rama; la spec de F1 en `spec/front-react` todavía muestra Q1 a Q5 abiertas, y su historia 6 mide el CSS a 1 200 px donde su Q2 y el pedido dicen 981 px.
- Las cuentas de Q1 (61 ejercicios con explorador de canal, genérico o puntero y 12 de robot y paquete) salen de leer con `node` el `build/curriculum.json` de la copia principal, generado el 2026-10-04. Nada más se ejecutó: sin `npm`, sin Docker y sin navegador. El plan las vuelve a medir sobre la base.
- F2a (las unidades 1 a 4) tiene plan, tareas y análisis (`plan.md`, `tasks.md`, `research.md` y `quickstart.md`). La spec ya está clarificada; el plan y las tareas se ajustan a las respuestas en el cambio siguiente.
