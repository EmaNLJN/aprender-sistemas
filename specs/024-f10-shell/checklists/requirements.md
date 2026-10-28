# Specification Quality Checklist: F10 · El shell y el router en una sola raíz de React

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

**El clarify del 2026-10-28**

- **Los marcadores.** Los cinco `[NEEDS CLARIFICATION]` que había (Q1 a Q5: FR-010, FR-034, FR-049, FR-041 y FR-033) se resolvieron en el clarify del 2026-10-28, todos con la opción recomendada, y ya no están en la spec. Las respuestas figuran en `## Clarifications`, y las opciones que no se eligieron, en «Alternativas consideradas».
- **La partición (P4).** El usuario aceptó el corte en F10a, F10b y F10c. Cada requisito y cada criterio llevan la marca de su parte, y «La partición en F10a, F10b y F10c» tiene la tabla de las partes y la de sus requisitos.
- **La aprobación de F10-A1.** El usuario aprobó que `<body>` deje de llevar `aria-pressed` y que `views.spec.ts`, de F1, se edite en un commit propio con TDD (FR-046). Salió de «Acciones del usuario» y está en «Clarifications».
- **«Requirements are testable and unambiguous»** se marcó al responder el clarify: los cinco requisitos que dependían de una respuesta ya la tienen.
- **Lecturas que el usuario puede corregir** (en «Clarifications», «Lecturas»):
  - qué cuenta cada número del menú (FR-032: Campaña, los mundos del idioma activo; Laboratorio, los ejercicios de los dos idiomas);
  - que el router conserve los remontajes de hoy en cada navegación y en cada cambio de idioma (FR-030);
  - que «Cerrar» la administración vuelva a la vista de la que vino (FR-043).

**Excepciones deliberadas**

- **«Implementation details».** F10 es un port, y su contrato es el comportamiento del código de hoy, con el precedente de las specs de F2 y de F9. Por eso la spec nombra lo que se retira, lo que se conserva y lo que se verifica:
  - las funciones de `frontend/app.js`, los `window.Taller*` y los `register-*`;
  - `runBoot` y sus etapas, `url-grammar` y nuqs con `enableHistorySync()`;
  - los checks de `qa/` y los E2E de la red.

  Los fijan `AGENTS.md`, el ADR 0008, A2 y las decisiones del clarify, no el diseño de esta spec. Los candidatos del spike (React Router y TanStack Router) se nombran porque la hoja de ruta pide el spike, y el coordinador pidió consultarlos. Los nombres de módulos y de hojas son provisionales, y no hay código de producción.
- **«Non-technical stakeholders».** El lector es el dueño del taller, que conoce el mapa del front legacy y tomó las decisiones del épico. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- **«Technology-agnostic».** SC-002, SC-003, SC-005, SC-007, SC-008 y SC-012 nombran comandos, checks y búsquedas porque son lo que se ejecuta o se revisa. Los demás criterios hablan de pruebas, escrituras, montajes y diferencias.

**El tamaño y las partes**

- **60 requisitos** y 12 criterios, contra los 52 de C3a. Partida por P4, cada parte queda bajo ese tope, contando los requisitos que comparte:
  - F10a, el spike y la red: 14 (7 propios);
  - F10b, la raíz única, el shell y el router: 51 (43 propios);
  - F10c, la limpieza de `styles.css`: 10 (2 propios).

  El clarify no sumó ni quitó requisitos.
- **La cobertura.** Los 54 requisitos que no son transversales están en el «Cubre» de alguna historia; lo comprobó un script.

**Qué se midió, sin ejecutar nada**

- **No se ejecutó nada:** ni `npm`, ni Docker, ni un navegador.
- **El código** se leyó en la integración `f2b-acum` (`2b37caf4`): `app.js`, `main.tsx`, `legacy-views.ts`, la compuerta, la gramática de URL, `build-check`, `load-order-check`, `boot-check`, `app-shell-check` y los E2E de F1 y A2.
- **Lo que dejan F3 a F9, F11a y F12a** sale de sus specs, que tienen clarify y no tienen plan. Por eso FR-048 pide un inventario al empezar.
- **Las cifras de peso** son del registro de npm y de bundlephobia, del 2026-10-28, sobre el paquete entero. El margen bajo el tope (108 663 caracteres) sale de la medida del coordinador con F2b.
- **La documentación de los routers y de nuqs** se consultó con Context7, con la segunda instancia, porque la primera agotó su cuota. Lo que la documentación no confirmó (que los routers por hash escriban `#/vista` y lean la query dentro del hash) queda como criterio del spike.
- **Los hallazgos** que afectan a otros ítems (la hoja de ruta, A2, F3, F5, F11a, F12a, C4 y E1) están en «Relación con otros ítems» y en el informe del coordinador.
