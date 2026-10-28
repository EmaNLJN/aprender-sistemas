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

**Lo que queda abierto**

- **Los marcadores.** Quedan cinco `[NEEDS CLARIFICATION]`, uno por pregunta:
  - FR-010, por Q1 (la regla del spike y su umbral de peso);
  - FR-034, por Q2 (la raíz única con el acceso de F11a y la compuerta de A2);
  - FR-049, por Q3 (los globals de catálogos y su oráculo);
  - FR-041, por Q4 (la forma de la ruta de administración y qué ve quien no es admin; FR-042 y FR-043 la siguen);
  - FR-033, por Q5 (qué muestra el shell antes del contenido).

  Hasta el clarify, cada uno usa como borrador la opción recomendada.
- **«Requirements are testable and unambiguous»** queda sin marcar por esos cinco. El resto de los requisitos tiene una obligación comprobable cada uno, con su prueba en «Cómo se demuestra que nada cambió».
- **Una aprobación pendiente que no es pregunta:** que `<body>` deje de llevar `aria-pressed` (FR-046). La red de F1 lo fija como `KNOWN DEFECT`, y la regla de la hoja de ruta pide la aprobación del usuario para editar ese E2E. Está en «Acciones del usuario».
- **Lecturas que el usuario puede corregir:**
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

**El tamaño y la partición**

- **60 requisitos** (6 transversales y 54 propios) y 12 criterios, contra los 52 de C3a. La spec propone, sin aplicarlo, un corte en tres:
  - F10a, el spike y la red: 13 requisitos con los transversales;
  - F10b, la raíz única, el shell y el router: 51;
  - F10c, la limpieza de `styles.css`: 8.

  El detalle está en «Partición propuesta».
- **La cobertura.** Los 54 requisitos propios están en el «Cubre» de alguna historia; lo comprobó un script.

**Qué se midió, sin ejecutar nada**

- **No se ejecutó nada:** ni `npm`, ni Docker, ni un navegador.
- **El código** se leyó en la integración `f2b-acum` (`2b37caf4`): `app.js`, `main.tsx`, `legacy-views.ts`, la compuerta, la gramática de URL, `build-check`, `load-order-check`, `boot-check`, `app-shell-check` y los E2E de F1 y A2.
- **Lo que dejan F3 a F9, F11a y F12a** sale de sus specs, que tienen clarify y no tienen plan. Por eso FR-048 pide un inventario al empezar.
- **Las cifras de peso** son del registro de npm y de bundlephobia, del 2026-10-28, sobre el paquete entero. El margen bajo el tope (108 663 caracteres) sale de la medida del coordinador con F2b.
- **La documentación de los routers y de nuqs** se consultó con Context7, con la segunda instancia, porque la primera agotó su cuota. Lo que la documentación no confirmó (que los routers por hash escriban `#/vista` y lean la query dentro del hash) queda como criterio del spike.
- **Los hallazgos** que afectan a otros ítems (la hoja de ruta, A2, F3, F5, F11a, F12a, C4 y E1) están en «Relación con otros ítems» y en el informe del coordinador.
