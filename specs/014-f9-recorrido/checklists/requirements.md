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

- Los cuatro marcadores `[NEEDS CLARIFICATION]` que había (Q1 a Q4: FR-008, FR-041, FR-037 y FR-017) se resolvieron en el clarify del 2026-10-28 y ya no están en la spec: las respuestas figuran en `## Clarifications` y las opciones que no se eligieron, en «Alternativas consideradas».
- «Requirements are testable and unambiguous» se marcó al responder el clarify: los cuatro requisitos que dependían de una respuesta ya la tienen, y los criterios X1 y C2 (los módulos y el foco adoptan el comportamiento de React) cambiaron FR-001, FR-025 y FR-036. Una lectura de esta spec queda a la vista del usuario: que al cerrar la lección el foco vuelve a quien la abrió (FR-036).
- Excepciones deliberadas en «implementation details», con el precedente de la spec de F2: F9 es un port, y su contrato es el comportamiento del código de hoy. La spec nombra las funciones de `frontend/app.js`, el singleton `routeStore`, `useStore`, el `<dialog>` nativo y los checks de `qa/` porque son lo que se retira, lo que se usa y lo que se verifica, y los fijan `AGENTS.md`, el ADR 0008 y el plan de F2a, no el diseño de esta spec. Los nombres de módulos (`pages/route`, `register-route.tsx`, `window.TallerRoute`, `qa/e2e/pages/route.ts`) son provisionales y los confirma el plan. No hay código de producción.
- «Non-technical stakeholders»: el lector es el dueño del taller, que conoce el mapa del front legacy y tomó las decisiones del épico. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- «Technology-agnostic»: SC-005, SC-006, SC-009, SC-011 y SC-012 nombran comandos, checks y `useStore` porque son lo que se ejecuta o se revisa. Los demás criterios hablan de bytes, de escrituras, de apariciones y de pruebas.
- El conteo es de esta spec: 46 requisitos, con una obligación comprobable por requisito, contra los 52 de C3a, la mayor del épico. El clarify no suma ni quita requisitos. No se propone cortarla; el motivo y el corte menos malo están en «Partición».
- Discrepancias que la spec registra y no corrige, para el coordinador: la hoja de ruta pone «notas» en F9 y en el código viven en Método, que porta F8 (Q1, ya decidido: la hoja de ruta se corrige); el tope de 2 500 000 caracteres de los criterios globales quedó viejo con A2 (hoy 1 250 000); `master` (`e87772d`) todavía no tiene F2a ni A2, así que la spec describe `f2a` (`2ffbbc6`); y lo que toma de F2b sale de `plan-f2b.md`.
- Qué se midió, sin ejecutar nada: el tamaño del `dist/index.html` ya construido en `f2a` (1 136 702 caracteres, 102 229 de `<style>`) y las 114 reglas de `styles.css` con `postcss`, ambos de sólo lectura (las que el port muda a la hoja de la página, Q2); los pasos, los módulos y las respuestas de la guía, con `node` sobre `build/curriculum.json`. No corrió `npm`, Docker ni un navegador. Sin verificar: el orden del foco al cerrar el diálogo, lo que anuncia un lector de pantalla y la serialización del DOM de React. Los E2E escritos primero contra el legacy los fijan.
- Los hallazgos que afectan a otros ítems (F2b, F3, F4, F8, F10, A2, D1 y la hoja de ruta) están en «Relación con otros ítems» y en el informe del coordinador, no acá.
