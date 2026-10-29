# Specification Quality Checklist: F15 · La adopción de Tailwind CSS v4 en el front React

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

**Lo que falta para el plan**

- **Los marcadores.** Quedan ocho `[NEEDS CLARIFICATION]`, de cinco preguntas:
  - Q1: el alcance, en la User Story 4 y FR-027;
  - Q2: quién crea la escala de tokens, en FR-015;
  - Q3: la forma de los valores que no son tokens, en la User Story 4 y FR-031;
  - Q4: el prefijo o las colisiones una por una, en FR-018;
  - Q5: la regla para lo nuevo, en la User Story 3 y FR-025.

  Cada pregunta tiene sus opciones, la recomendada, su motivo y su costo, en «Preguntas para el clarify».
- **«Requirements are testable and unambiguous»** queda sin marcar hasta el clarify: FR-015, FR-018, FR-025, FR-027 y FR-031 dependen de una respuesta.
- **La partición (P5)** se propone sin aplicar. Cada requisito lleva ya la marca de la parte que le tocaría, para que el clarify la confirme o la borre.

**Excepciones deliberadas**

- **«Implementation details».** F15 es la adopción de una herramienta que eligió el usuario, y su contrato es que nada visible cambie. Por eso la spec nombra:
  - Tailwind, su plugin de Vite, las capas de la cascada, el preflight y el `:hover`;
  - las hojas de hoy, los checks y las herramientas de paridad (el barrido y el multiconjunto).

  Son lo que se decide, lo que se prueba o una trampa medida con Context7, no un diseño de esta spec. Los nombres de la entrada, de la capa heredada y de los checks son provisionales, y no hay código de producción.
- **«Non-technical stakeholders».** El lector es el dueño del taller, que decidió la herramienta y conoce las hojas del épico. Para el alumno, el resultado es que nada cambia, y la spec lo dice en su intención.
- **«Technology-agnostic».** SC-003, SC-005, SC-008 y SC-009 nombran comandos, capas y dependencias, porque son lo que se mide o se revisa. Los demás criterios hablan de pruebas, diferencias, hojas y tamaños.

**El tamaño**

- **37 requisitos y 10 criterios,** bajo los 52 de C3a. La partición se propone por la forma del trabajo, no por el tamaño:
  - F15a: 27 (14 propios);
  - F15b: 20 (7 propios);
  - F15c: 17 (3 propios y FR-033, que comparte con F15b).
- **La cobertura.** Los 35 requisitos que no son transversales están en el «Cubre» de alguna historia, y también los 10 criterios. Lo comprobó un script. FR-006 (reversibilidad) y FR-007 (integración de a uno) valen para todos los PR y no tienen una historia propia.

**Qué se midió, sin ejecutar el proyecto**

- **No se ejecutó** `npm ci`, el build, Docker ni un navegador. Sólo `npm view`, para los metadatos del registro, como pidió el encargo.
- **Los conteos** de colores, tamaños, espaciados, condiciones de `@media`, `!important` y `:hover` salen de las siete hojas de `master` (`bb480677`), con `grep`.
- **Las colisiones** (`sr-only` y `visible`) salen de cruzar las 481 clases de esas hojas con los nombres de utilidades de Tailwind. F15a las confirma con la salida real.
- **Lo que deja F10** sale de su spec y del plan de F10c, que todavía no está en `master`.
- **La documentación de Tailwind** se consultó con la segunda instancia de Context7 (`/tailwindlabs/tailwindcss.com`), que es la del sitio y no está fijada a 4.3.3.
