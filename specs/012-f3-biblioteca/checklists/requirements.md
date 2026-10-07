# Specification Quality Checklist: F3 · Biblioteca

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

- **El único ítem sin marcar es deliberado.** Quedan tres marcadores `[NEEDS CLARIFICATION]`, uno por pregunta del clarify: FR-021 (Q1, dónde viven los filtros), FR-026 (Q2, el CSS de la Biblioteca) y FR-022 (Q3, las diferencias que nadie ve). Cada requisito ya está escrito con la opción recomendada, así que el texto se puede probar tal cual; si el usuario elige otra, cambia ese requisito y lo que cuelga de él (Q1 B: FR-006, FR-021 y las alternativas; Q2 B: FR-026, la tabla del dist y SC-006; Q3 B: FR-022, la lista de FR-036 y un E2E `KNOWN DEFECT`). «Requirements are testable and unambiguous» se marcó con esa lectura.
- **Las tres preguntas, con su recomendación:** Q1, en memoria de módulo como hoy, y no en la URL con nuqs; Q2, las reglas de CSS quedan en `styles.css` hasta F10, y no pasan a una hoja de la página; Q3, se acepta que las tarjetas con `key` conserven su detalle abierto y se conserva la pérdida de foco al quitar un favorito con «Solo mis favoritos», y no se reconstruyen las tarjetas a propósito. Lo que no es una pregunta (los permisos de descarga, la guarda de `useStore`, fishery y cuántos PR) está en «Acciones del usuario y descargas» y en las decisiones del plan.
- **El conteo es de esta spec:** 41 requisitos (FR-001 a FR-041), 12 criterios de éxito y 5 historias, contra los 52 de C3a, la mayor spec del épico. No se propone partirla; si el plan la crece, el corte natural es el orden de FR-001: la red y el arnés, y la página y el corte.
- **Excepciones deliberadas en «implementation details»:** F3 es un port y su objeto son una página, un adaptador y los archivos que se mueven. La spec nombra el slice de Feature-Sliced Design, los ids, las clases y los textos del DOM de hoy, las funciones de `app.js` que se retiran y las herramientas (Vitest, Testing Library, Playwright, Zustand, nuqs, ESLint) porque las fijan el ADR 0008, `AGENTS.md` y F2a, y porque el criterio de un port es el DOM, el texto y el progreso de hoy. Los nombres de módulos son provisionales; la spec fija la capa, la responsabilidad y el contrato. No hay código.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones del épico y conoce el mapa del front legacy. Los términos técnicos son los suyos. Para el alumno, el resultado es que no cambia nada.
- **«Technology-agnostic»:** SC-001, SC-006, SC-008, SC-010 y SC-011 nombran los checks y los comandos de verificación del proyecto porque son lo que se ejecuta. Los demás hablan de recursos, escrituras, estados y diferencias, no de cómo se construyen.
- **Hallazgos de esta spec que afectan a otros ítems** (el informe del coordinador los lista con su destino): el pie de guardado (`#save-label`) lo actualiza `save()` de `app.js`, que una página React no pasa, y lo heredan F4, F8 y F9; la prueba R5 de `css-contract` de F1 usa como único `.sr-only` el span vacío de las tarjetas de la Biblioteca, y R4, su campo de búsqueda; la búsqueda de la Biblioteca es una subcadena entera que también mira los identificadores de lenguaje, no la búsqueda por palabras del Atlas; dos escenarios de `app-shell-check` usan la acción `favorite` como disparador de un guardado; el criterio global de tamaño de la hoja de ruta (2 500 000) quedó viejo desde A2 (1 250 000); y la convención «un port borra las reglas que ninguna otra vista usa» choca con que `.search-wrap` y `.empty-state` son compartidas y con que F3, F4 y F9 editarían los mismos `@media`.
- **Nada se ejecutó:** sin `npm`, Docker ni navegador. Los conteos (15 recursos, 123 E2E, siete ramas de los delegados, 3 escenarios de `qa/`, unas 45 reglas de CSS) salen de leer el código de `f2a/base` y de `master`. Los ejemplos resueltos de «Qué se conserva» salen de correr con `node`, en un directorio temporal y en modo de sólo lectura, una copia del predicado de `renderResourceResults` sobre `build/curriculum.json` de la copia principal (generado el 2026-10-04). El plan los vuelve a medir sobre la base de implementación.
- **Código que no está en `master`:** `routeStore`, `startApp()`, `getContent()`, la compuerta de A2 y la regla R5 del guard de F2b existen sólo en `f2a/base` y `f2b/base`. La spec los cita como código, sin enlace, y los toma como supuesto. Sus 8 enlaces relativos (hoja de ruta, mapa, specs de F1 y F2, plan de F2, ADR 0003 y 0008 y constitución) apuntan a archivos que existen en `master` y se comprobaron uno por uno.
- La documentación oficial de Zustand (`useStore`, consultada el 2026-10-07) confirma que el selector es opcional y que sin él se suscribe al estado completo; Context7 no estaba disponible.
