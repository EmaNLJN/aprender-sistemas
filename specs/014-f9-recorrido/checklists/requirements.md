# Specification Quality Checklist: F9 · Port de Recorrido a React

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
- [ ] Requirements are testable and unambiguous
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

- Quedan cuatro marcadores `[NEEDS CLARIFICATION]`, uno por pregunta: Q1 (las notas, FR-008), Q2 (el CSS, FR-041), Q3 (la región viva, FR-037) y Q4 (el diálogo, FR-017). Las cuatro tienen opciones, una recomendada con su motivo y su costo, en «Preguntas para el clarify», y los requisitos asumen la recomendada. Es el límite de cinco que fijó el coordinador.
- «Requirements are testable and unambiguous» se marca al responder el clarify: los cuatro requisitos con marcador dependen de una respuesta. Los otros 42 se pueden probar con lo que hay: cada uno cita su escenario o su criterio de éxito.
- Excepciones deliberadas en «implementation details», con el precedente de la spec de F2: F9 es un port, y su contrato es el comportamiento del código de hoy. La spec nombra las funciones de `frontend/app.js`, el singleton `routeStore`, `useStore`, el `<dialog>` nativo y los checks de `qa/` porque son lo que se retira, lo que se usa y lo que se verifica, y los fijan `AGENTS.md`, el ADR 0008 y el plan de F2a, no el diseño de esta spec. Los nombres de módulos (`pages/route`, `register-route.tsx`, `window.TallerRoute`, `qa/e2e/pages/route.ts`) son provisionales y los confirma el plan. No hay código de producción.
- «Non-technical stakeholders»: el lector es el dueño del taller, que conoce el mapa del front legacy y tomó las decisiones del épico. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- «Technology-agnostic»: SC-006, SC-009, SC-011 y SC-012 nombran comandos, checks y `useStore` porque son lo que se ejecuta o se revisa. Los demás criterios hablan de bytes, de escrituras, de apariciones y de pruebas.
- El conteo es de esta spec: 46 requisitos, con una obligación comprobable por requisito, contra los 52 de C3a, la mayor del épico. No se propone cortarla; el motivo y el corte menos malo están en «Partición».
- Discrepancias que la spec registra y no corrige, para el coordinador: la hoja de ruta pone «notas» en F9 y en el código viven en Método, que porta F8 (Q1); el tope de 2 500 000 caracteres de los criterios globales quedó viejo con A2 (hoy 1 250 000); `master` (`e87772d`) todavía no tiene F2a ni A2, así que la spec describe `f2a` (`2ffbbc6`); y lo que toma de F2b sale de `plan-f2b.md`.
- Qué se midió, sin ejecutar nada: el tamaño del `dist/index.html` ya construido en `f2a` (1 136 702 caracteres, 102 229 de `<style>`) y las 114 reglas de `styles.css` con `postcss`, ambos de sólo lectura; los pasos, los módulos y las respuestas de la guía, con `node` sobre `build/curriculum.json`. No corrió `npm`, Docker ni un navegador. Sin verificar: el orden del foco al cerrar el diálogo, lo que anuncia un lector de pantalla y la serialización del DOM de React. Los E2E escritos primero contra el legacy los fijan.
- Los hallazgos que afectan a otros ítems (F2b, F3, F4, F8, F10, A2, D1 y la hoja de ruta) están en «Relación con otros ítems» y en el informe del coordinador, no acá.
