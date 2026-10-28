# Specification Quality Checklist: F8 · Port de Método a React

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

- **Marcadores `[NEEDS CLARIFICATION]`:** quedan tres, a propósito. Son Q1 (FR-024), Q2 (FR-015) y Q3 (FR-025), y van al clarify con su opción recomendada.
  - Los requisitos están escritos con la recomendada, así que se pueden probar tal como están.
  - Si el usuario elige otra opción, cambian esos tres requisitos y, en Q2, la tabla «Qué queda en `window.Taller*`».
- **Las lecturas de las reglas del clarify:** X1, C2, X2, X3 y F9-Q4 ya están aplicadas, y quedan a la vista del usuario en «Lecturas». Dos pueden corregirse:
  - que `#note-state` vuelva a su texto inicial después de importar y de «Borrar todo» (FR-018 y FR-028);
  - que la confirmación viva en un portal, por analogía con F9-Q4 (FR-021).
- **Excepciones deliberadas a «implementation details»,** con el precedente de las specs de F2 y F9. F8 es un port, y su contrato es el comportamiento del código de hoy. La spec nombra lo que se retira, lo que se usa y lo que se verifica:
  - las funciones de `frontend/app.js`;
  - `features/progress-backup`, `routeStore` y `useStore`;
  - el `<dialog>` nativo;
  - los checks de `qa/`.

  Esos nombres los fijan `AGENTS.md`, el ADR 0008 y los planes de F2a y F2b, no el diseño de esta spec. Los nombres de módulos (`pages/method`, `register-method.tsx`, `window.TallerMethod` y `qa/e2e/pages/method.ts`) son provisionales y los confirma el plan. No hay código de producción.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que conoce el mapa del front legacy y tomó las decisiones del épico. Para el alumno el resultado es que no cambia nada, y la spec lo dice en su intención.
- **«Technology-agnostic»:** SC-005, SC-006, SC-009, SC-010, SC-011 y SC-012 nombran comandos, checks y `useStore`, porque son lo que se ejecuta o se revisa. Los demás criterios hablan de bytes, escrituras, apariciones y pruebas.
- **El conteo:** 44 requisitos, con una obligación comprobable por requisito. La mayor del épico es C3a, con 52. No se propone cortarla; el corte menos malo y su costo están en «Partición».
- **Discrepancias que la spec registra y no corrige,** para el coordinador:
  - la hoja de ruta pone el manejador de `#export-progress` en el «Borra» de F8, y es del shell;
  - F8 depende sólo de F2b, no de F5 ni de F7;
  - la superficie 4 de D1 pasa a D1c (Q1);
  - F9 dice que F8 retira `resetTimer` (Q2);
  - la fila de C4 y el tope de 2 500 000 caracteres quedaron viejos.

  Están en «Relación con otros ítems».
- **Qué se midió, sin ejecutar nada:**
  - en `f2b-acum`, el código de `frontend/app.js`, `frontend/src/index.html`, `features/progress-backup`, `entities/guide`, `shared/lib/download-file.ts` y `frontend/styles.css` (las reglas, con `grep`);
  - los 58 escenarios de `app-shell-check` y los de `boot-check`;
  - en `master`, el backend del reset;
  - las specs de F3, F4, F5, F7, F9 y F11 en sus ramas.

  No corrieron `npm`, Docker ni un navegador, y `f2b-acum` no tiene `dist/`. Sin verificar: el foco de la confirmación, el portapapeles en Chromium headless y la serialización del DOM de React. Los E2E escritos primero contra el legacy los fijan.
