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

- **Los marcadores.** Los ocho `[NEEDS CLARIFICATION]` de las cinco preguntas se resolvieron en el clarify del 2026-10-28 y ya no están en la spec:
  - Q1-A, el alcance: la User Story 4 y FR-027;
  - Q2-B, el preflight al cerrar, compensado, que no era la recomendada: FR-014 y el FR-039 nuevo;
  - Q3-A, `--spacing: 4px` y arbitrarios: la User Story 4, FR-015 y FR-031;
  - Q4-A, sin prefijo: FR-018;
  - Q5-A, utilidades desde F15a: la User Story 3 y FR-025.

  Las respuestas figuran en `## Clarifications`, y las opciones que no se eligieron, en «Preguntas del clarify» y en «Alternativas consideradas».
- **Lo que fijó el coordinador:** el ADR es el 0010, a confirmar al escribirlo. Los tokens van en `@theme static`, consultado con Context7, y lo prueba primero el FR-038 nuevo.
- **«Requirements are testable and unambiguous»** se marcó al responder el clarify: los cinco requisitos que dependían de una respuesta ya la tienen.
- **La partición (P5-A).** El usuario aceptó F15a, F15b y F15c. Cada historia, cada requisito y cada criterio llevan la marca de su parte, y «La partición en F15a, F15b y F15c» tiene las tablas. Los planes serán `plan.md`, `plan-f15b.md` y `plan-f15c.md`.

**Excepciones deliberadas**

- **«Implementation details».** F15 es la adopción de una herramienta que eligió el usuario, y su contrato es que nada visible cambie. Por eso la spec nombra:
  - Tailwind, su plugin de Vite, las capas de la cascada, el preflight y el `:hover`;
  - las hojas de hoy, los checks y las herramientas de paridad (el barrido y el multiconjunto).

  Son lo que se decide, lo que se prueba o una trampa medida con Context7, no un diseño de esta spec. Los nombres de la entrada, de la capa heredada y de los checks son provisionales, y no hay código de producción.
- **«Non-technical stakeholders».** El lector es el dueño del taller, que decidió la herramienta y conoce las hojas del épico. Para el alumno, el resultado es que nada cambia, y la spec lo dice en su intención.
- **«Technology-agnostic».** SC-003, SC-005, SC-008, SC-009 y SC-011 nombran comandos, capas y dependencias, porque son lo que se mide o se revisa. Los demás criterios hablan de pruebas, diferencias, hojas y tamaños.

**El tamaño**

- **39 requisitos y 11 criterios,** bajo los 52 de C3a. El clarify sumó FR-038 (los tokens en `@theme static`), FR-039 (el preflight de F15c) y SC-011. La partición responde a la forma del trabajo, no al tamaño:
  - F15a: 28 requisitos (15 propios, FR-014 compartido con F15b y 12 transversales);
  - F15b: 20 (6 propios, FR-014 y FR-033 compartidos y 12 transversales);
  - F15c: 17 (4 propios, FR-033 compartido con F15b y 12 transversales).
- **La cobertura.** Los 37 requisitos que no son transversales a todos los PR están en el «Cubre» de alguna historia, y también los 11 criterios. Cada requisito y cada criterio tiene la marca de su parte. Lo comprobó un script. FR-006 (reversibilidad) y FR-007 (integración de a uno) valen para todos los PR y no tienen una historia propia.

**Qué se midió, sin ejecutar el proyecto**

- **No se ejecutó** `npm ci`, el build, Docker ni un navegador. Sólo `npm view`, para los metadatos del registro, como pidió el encargo.
- **Los conteos** de colores, tamaños, espaciados, condiciones de `@media`, `!important` y `:hover` salen de las siete hojas de `master` (`bb480677`), con `grep`.
- **Las colisiones** (`sr-only` y `visible`) salen de cruzar las 481 clases de esas hojas con los nombres de utilidades de Tailwind. F15a las confirma con la salida real.
- **Lo que deja F10** sale de su spec y del plan de F10c (rama `plan/f10c-estilos`, `1150db65`, PR #91), que todavía no está en `master`. De ahí salen los 61 tokens con nombres de v4, sus alias y la lista de «Qué toma F15» (R12).
- **La documentación de Tailwind** se consultó con la segunda instancia de Context7 (`/tailwindlabs/tailwindcss.com`), que es la del sitio y no está fijada a 4.3.3. En el clarify sumé una consulta: qué variables del theme se emiten y cuándo usar `@theme static`.
