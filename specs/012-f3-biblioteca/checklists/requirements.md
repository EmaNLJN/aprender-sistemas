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

- **El clarify del 2026-10-28 cerró las tres preguntas** y sus marcadores salieron de FR-021, FR-022 y FR-026: las respuestas están en `## Clarifications`, bajo `### Session 2026-10-28`, y las opciones que no se eligieron, o se eligieron con otro alcance, en «Alternativas consideradas». Dos no eran la recomendada: Q1 (los filtros van a la URL con nuqs, no a la memoria) y Q2 (el CSS se muda con el port, no queda en `styles.css`). Q3 sí lo era, con más alcance: el detalle abierto queda abierto y el foco no se pierde. El ruling C2 del coordinador extiende el criterio de Q3 a todo port.
- **Cómo cambió la spec:** FR-006, FR-019, FR-021, FR-022 y FR-026 se reescribieron con la respuesta; FR-001, FR-003, FR-005, FR-009 a FR-011, FR-018, FR-025, FR-028, FR-031 a FR-033 y FR-035 a FR-038 se ajustaron; se sumaron FR-042 (nuqs), FR-043 (la forma de URL en la gramática de F2b y su caso en `url-contract`) y FR-044 (el cambio de idioma, que decide el plan); SC-013 mide la URL. Los E2E de los tres cambios se escriben en rojo antes de cada cambio, con el clarify como aprobación.
- **Lo que queda para el plan, a propósito:** si el cambio de idioma conserva los filtros (FR-044; la spec lo recomienda), el nombre del parámetro de lenguaje (`lenguaje` choca con el de Sistemas), si el corte lleva una sesión transitoria de filtros, si el foco va a otro destino que el de FR-019, cuántos PR hay y quién instala nuqs entre F3 y F5.
- **El conteo es de esta spec:** 44 requisitos (FR-001 a FR-044), 13 criterios de éxito y 5 historias, contra los 52 de C3a, la mayor spec del épico. No se propone partirla; si el plan la crece, el corte natural es el orden de FR-001: la red y el arnés, y la página, el corte y los cambios a propósito.
- **Excepciones deliberadas en «implementation details»:** F3 es un port y su objeto son una página, un adaptador y los archivos que se mueven. La spec nombra el slice de Feature-Sliced Design, los ids, las clases y los textos del DOM de hoy, las funciones de `app.js` que se retiran y las herramientas (Vitest, Testing Library, Playwright, Zustand, nuqs, ESLint) porque las fijan el ADR 0008, `AGENTS.md` y F2a, y porque el criterio de un port es el DOM, el texto y el progreso de hoy. Los nombres de módulos son provisionales; la spec fija la capa, la responsabilidad y el contrato. No hay código.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones del épico y conoce el mapa del front legacy. Los términos técnicos son los suyos. Para el alumno, el resultado es que no cambia nada.
- **«Technology-agnostic»:** SC-001, SC-006, SC-008, SC-010 y SC-011 nombran los checks y los comandos de verificación del proyecto porque son lo que se ejecuta. Los demás hablan de recursos, escrituras, estados y diferencias, no de cómo se construyen.
- **Hallazgos de esta spec que afectan a otros ítems** (el informe del coordinador los lista con su destino): el pie de guardado (`#save-label`) lo actualiza `save()` de `app.js`, que una página React no pasa, y lo heredan F4, F8 y F9; la prueba R5 de `css-contract` de F1 usa como único `.sr-only` el span vacío de las tarjetas de la Biblioteca, y R4, su campo de búsqueda; la búsqueda de la Biblioteca es una subcadena entera que también mira los identificadores de lenguaje, no la búsqueda por palabras del Atlas; dos escenarios de `app-shell-check` usan la acción `favorite` como disparador de un guardado; la página es un segundo importador de `routeStore` además de `app.js`, y FR-018 de F2 (un singleton por contexto de check) obliga a probar que `boot-check` ve una sola instancia (FR-009); el criterio global de tamaño de la hoja de ruta (2 500 000) quedó viejo desde A2 (1 250 000); y la convención «un port borra las reglas que ninguna otra vista usa» choca con que `.search-wrap` y `.empty-state` son compartidas y con que F3, F4 y F9 editarían los mismos `@media`.
- **Nada se ejecutó:** sin `npm`, Docker ni navegador. Los conteos (15 recursos, 123 E2E, siete ramas de los delegados, 3 escenarios de `qa/`, unas 45 reglas de CSS) salen de leer el código de `f2a/base` y de `master`. Los ejemplos resueltos de «Qué se conserva» salen de correr con `node`, en un directorio temporal y en modo de sólo lectura, una copia del predicado de `renderResourceResults` sobre `build/curriculum.json` de la copia principal (generado el 2026-10-04). El plan los vuelve a medir sobre la base de implementación.
- **Código que no está en `master`:** `routeStore`, `startApp()`, `getContent()`, la compuerta de A2 y la regla R5 del guard de F2b existen sólo en `f2a/base` y `f2b/base`, igual que la gramática de URL y las dos comparaciones de CSS de F2b. La spec los cita como código, sin enlace, y los toma como supuesto. Sus 8 enlaces relativos (hoja de ruta, mapa, specs de F1 y F2, plan de F2, ADR 0003 y 0008 y constitución) apuntan a archivos que existen en `master` y se comprobaron uno por uno.
- La documentación oficial de Zustand (`useStore`, consultada el 2026-10-07) confirma que el selector es opcional y que sin él se suscribe al estado completo. La de nuqs (adaptadores y opciones, consultada el 2026-10-28) confirma que el adaptador de React lee `location.search`, que escribe con `replace` por omisión y que borra el valor por omisión; no dice si ve las escrituras ajenas de `history.replaceState` ni si sirve con rutas por hash. El coordinador confirmó en el código fuente (rama `next`) que el adaptador de React exporta `enableHistorySync()` para las escrituras ajenas; falta saber en qué versión publicada está y si conserva el `location.hash`. La spec lo deja como riesgo 14, con una verificación corta del plan y dos E2E. Context7 no estaba disponible.
