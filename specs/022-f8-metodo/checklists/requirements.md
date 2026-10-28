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

- **El clarify del 2026-10-28 cerró Q1 a Q4.** Los cinco marcadores que había (FR-015, FR-018, FR-024, FR-025 y FR-028) se resolvieron y ya no están: las respuestas figuran en `## Clarifications`, y las opciones que no se eligieron, en «Alternativas consideradas».
  - Tres respuestas no eran la recomendada: Q1 (el reset del servidor ya), Q2 (el armado en `src/app/`) y Q4 (lo que haga React).
  - Cambiaron, con ellas, la intención, las historias 2, 3 y 6, los riesgos, la relación con otros ítems y la partición.
  - Los IDs no se renumeraron: FR-045 a FR-049 son nuevos.
- **Lecturas a confirmar (L1 a L12):** son decisiones que las respuestas obligan a tomar y que el usuario no contestó. Van con su recomendación, no como marcadores, y se revisan en el PR. Están en «“Borrar todo” con el reset del servidor» y en «El armado en `src/app/`»:
  - la época, la contraseña, el 401 y el tope de tres por día;
  - el `epoch_mismatch`, sin servidor y el FR-074 de D1;
  - los textos de la confirmación, la espera y R4;
  - la regla de orden generalizada y el foco al abrir.

  Los requisitos están escritos con la recomendación, así que se pueden probar tal como están.
- **Las lecturas de las reglas del clarify** (X1, X2, X3 y F9-Q4) quedan como estaban y el usuario las revisa en el PR. Sólo se sumó a X2 la referencia al error del formulario de la contraseña, que trae Q1.
- **El foco al cerrar la confirmación** se escribe con lo que se espera del navegador, y lo fija el E2E contra el legacy. Si el navegador no lo devuelve después de confirmar, la página lo devuelve (FR-021 y FR-023).
- **Excepciones deliberadas a «implementation details»,** con el precedente de las specs de F2 y F9. F8 es un port, y su contrato es el comportamiento del código de hoy y los contratos HTTP ya entregados. La spec nombra lo que se retira, lo que se usa y lo que se verifica:
  - las funciones de `frontend/app.js`;
  - `features/progress-backup`, `routeStore` y `useStore`;
  - el `<dialog>` nativo y React Hook Form, que instala F11a;
  - las rutas de C3a, D1a y D1b con sus códigos;
  - los checks de `qa/`.

  Esos nombres los fijan `AGENTS.md`, el ADR 0008, los planes de F2a y F2b, las specs de F11 y de D1 y los contratos de la API, no el diseño de esta spec. Los nombres de módulos (`pages/method`, `register-method.tsx`, `window.TallerMethod`, el armado en `src/app/` y `qa/e2e/pages/method.ts`) son provisionales y los confirma el plan. No hay código de producción.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que conoce el mapa del front legacy y tomó las decisiones del épico. Para el alumno, sólo cambia «Borrar todo», y la spec lo dice en su intención.
- **«Technology-agnostic»:** SC-005, SC-006, SC-009, SC-010, SC-011, SC-012 y SC-013 nombran comandos, checks, `useStore` y pedidos HTTP, porque son lo que se ejecuta o se revisa. Los demás criterios hablan de bytes, escrituras, apariciones y pruebas.
- **El conteo:** 49 requisitos, con una obligación comprobable por requisito. La mayor del épico es C3a, con 52, así que no se propone un corte obligatorio. «Partición» describe un corte opcional (F8a, el port; F8b, «Borrar todo» con el servidor), para que el port no espere a F11a.
- **Discrepancias que la spec registra y no corrige,** para el coordinador:
  - la hoja de ruta pone el manejador de `#export-progress` en el «Borra» de F8, y es del shell;
  - las dependencias de F8 pasan a F2b, F11a, D1a y D1b;
  - F5, F7 y F9 pasan a la regla de orden de Q2;
  - el contrato de `startApp()` cambia para A2 y F10;
  - la cláusula de las claves v1 del FR-074 de D1 rige desde D1c (L7);
  - el texto de F11 sobre «Borrar todo» queda viejo;
  - la fila de C4 y el tope de 2 500 000 caracteres quedaron viejos.

  Están en «Relación con otros ítems».
- **Qué se midió, sin ejecutar nada:**
  - en `f2b-acum`, el código de `frontend/app.js`, `frontend/src/index.html`, `features/progress-backup`, `entities/guide`, `shared/lib/download-file.ts`, `frontend/styles.css` (las reglas, con `grep`) y `qa/lib/seams-guard.ts`;
  - los 58 escenarios de `app-shell-check` y los de `boot-check`;
  - en `master`, el backend del reset, de la lectura del progreso y de la confirmación de contraseña, con los contratos de C3a, D1a y D1b;
  - las specs de F3, F4, F5, F7, F9 y F11 en sus ramas.

  No corrieron `npm`, Docker ni un navegador, y `f2b-acum` no tiene `dist/`. Sin verificar: el foco de la confirmación, el portapapeles en Chromium headless y la serialización del DOM de React. Los E2E escritos primero contra el legacy los fijan.
