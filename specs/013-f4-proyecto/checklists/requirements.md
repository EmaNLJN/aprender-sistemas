# Specification Quality Checklist: F4 · Proyecto, el port de la página y de sus hitos

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

- Quedan cuatro marcadores `[NEEDS CLARIFICATION]`, uno por pregunta abierta (Q1 a Q4): FR-018, FR-034, FR-014 y FR-015. Cada pregunta trae sus opciones, una recomendada y su costo. Quedan uno de margen sobre el límite de cinco que fijó el coordinador (la plantilla de `/speckit-specify` dice tres). La partición no es una pregunta: no hace falta (ver más abajo).
- «Requirements are testable and unambiguous» queda sin marcar porque cuatro requisitos dependen de una respuesta: FR-018 (Q1, dónde viven los textos de los hitos), FR-034 (Q2, el CSS exclusivo), FR-014 (Q3, las pistas abiertas) y FR-015 (Q4, la pista del primer hito). Cada uno es comprobable con su respuesta recomendada; los otros 33 ya lo son.
- Excepciones deliberadas en «implementation details»: F4 es un port y su objeto son páginas, módulos, adaptadores y checks. La spec nombra la capa y el slice de Feature-Sliced Design, los archivos legacy que se retiran, los identificadores del DOM y los checks de `qa/` porque son lo que se mueve o lo que protege, y las herramientas (Vitest, Testing Library, Playwright, Zustand) porque las fijan el ADR 0008 y `AGENTS.md`, no esta spec. Los nombres de módulos y de exports, y el del global del adaptador, son provisionales y los confirma el plan. No hay código.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del épico y conoce el mapa del front legacy. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- «Technology-agnostic»: SC-012 nombra los comandos de verificación del proyecto, y SC-003, SC-008 y SC-009 nombran los archivos y los checks que fijan los IDs y los bytes, porque son lo que se ejecuta. Los demás criterios hablan de IDs, de escrituras, de diferencias y de pruebas, no de cómo se construyen.
- El conteo es de esta spec: 37 requisitos, con una obligación comprobable por requisito, contra los 52 de C3a, la mayor del épico. No hace falta partirla: es un solo port de una sola página, y las reglas de todo port (FR-001 a FR-006) son las que repite cada ítem de la hoja de ruta.
- Hallazgos que la spec registra y no corrige (los lleva el informe al coordinador):
  - La página de Proyecto no usa los kits ZIP: los usa `systems.js`. El pedido los daba por parte de F4 (FR-026).
  - La decisión abierta de F4 de la hoja de ruta sobre el fixture de los 10 IDs la cerró FR-027 de F2 (`MILESTONE_IDS` y su spec ya están en `entities/guide`, en `f2a/base`).
  - La rama `data-milestone` está en el delegado de `change` de `app.js`, no en el de clic (FR-022).
  - `qa/route-milestones-check.ts` lee el texto de `app.js` y se rompe al mover el arreglo de hitos (FR-019).
  - El pie `#save-label` lo refresca el `save()` de `app.js`: una página que guarda por `routeStore` lo deja desactualizado (FR-011).
  - Marcar un hito cierra hoy las pistas abiertas, porque `render()` rehace `#main`; React no lo haría solo (Q3).
  - La pista del primer hito nombra a Rust también en la página de Go (Q4).
  - El tope de 2 500 000 caracteres del HTML, en los criterios globales de la hoja de ruta, quedó viejo con A2: ahora es 1 250 000.
  - `render()` de `app.js` ya tiene complejidad 11 y cada port le suma un `if` (FR-005).
  - El backend rechaza un hito desconocido: `ContentLookup` en la sincronización y `LegacyDecoder::knownIds` (422) en la importación; no lo descarta como pérdida (FR-020).
- Lo que se toma de F2b, de F3 y de A2 en `f2a/base` es un supuesto y está marcado en Assumptions: F2a (PR #40) todavía no está en `master`, así que los enlaces de la spec apuntan sólo a archivos de `master` y lo demás se cita con su rama.
- Sin mediciones propias: sin `npm`, Docker ni navegador. El comportamiento de la página sale de leer `frontend/app.js` y los checks; el contenido de las tres fixtures congeladas, de leerlas con `node` en modo de sólo lectura. Lo que se infiere sin probarlo (el cierre de las pistas, que `render()` ya no corre en cada alternancia sin efecto observable) lo confirman o desmienten los E2E contra el legacy, que son lo primero que corre.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen. El usuario revisa esta spec y responde el clarify antes del plan.
