# Specification Quality Checklist: A3 · El front lee el contenido de la API

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

- **Preguntas abiertas.** No hay marcadores `[NEEDS CLARIFICATION]`, pero el clarify está pendiente. Las cuatro preguntas abiertas están en «Preguntas abiertas», cada una con sus opciones, lo que cuesta cada una y la recomendada con su motivo:
  - Q1, si A3 espera todo F11 o sólo el acceso: afecta a FR-002, FR-003 y FR-040 y a la dependencia de la hoja de ruta;
  - Q2, quién puede usar la copia sin servidor: FR-021, y el «quién» de FR-023;
  - Q3, la vista previa: FR-033;
  - Q4, dónde se guarda la copia: FR-015 a FR-020.

  FR-015, FR-021 y FR-033 llevan la opción recomendada como «(propuesta, Qn)». FR-003 es una propuesta de interfaz que se acuerda con la spec 015 (F11), que se escribe a la vez. El plan espera el clarify.
- **Excepciones deliberadas en «implementation details».** La feature es el transporte y el arranque del front, y la técnica ya la decidieron el ADR 0004, el ADR 0006 §7 y A2. Por eso los requisitos nombran los recursos de la API, las cabeceras (`ETag`, `If-None-Match`, `Content-Version` y `Retry-After`), los checks de `qa/`, la red E2E, Vite, Nginx y Compose. Lo que piden son resultados observables: los pedidos por arranque, el todo o nada, el progreso intacto, el texto del aviso y el 404 de las rutas del puente. IndexedDB y la Cache API aparecen sólo como opciones de Q4.
- **«Non-technical stakeholders».** El lector es el dueño del taller, que tomó las decisiones de los ADR 0004 y 0006 y de A2. Los términos técnicos son los suyos.
- **«Technology-agnostic».** Los criterios cuentan pedidos, comparan el volcado de los globals y las huellas del generador, y cuentan escrituras, respaldos y avisos del progreso. Son los resultados observables de una feature cuyo valor es que nada cambie con servidor y que nada se rompa sin él. Los mismos criterios ya los usan A1, C2 y A2.
- **«Testable and unambiguous».** El tope de 3 rondas y el reparto del tiempo del intento son propuestas que el plan fija con una medición. Una vez fijados, el criterio se verifica.
- **«Scope is clearly bounded».** La spec trae sus listas de lo que entra, lo que queda fuera y lo que no se hace a propósito. No cambia el backend ni las seis vistas legacy, y deja la plantilla del harness para A4 (propuesta).
- **Tamaño.** Tiene 43 requisitos, 10 criterios y 6 historias, por debajo de los 52 requisitos de C3a, así que no se propone partirla.
- **Verificación al escribirla.**
  - Las afirmaciones sobre el navegador salen de MDN (las cuotas de almacenamiento y `CacheStorage`) y del estándar Fetch (un `If-None-Match` explícito cambia el modo de caché a `no-store`).
  - Las rutas, las cabeceras y los `Retry-After` de la API se leyeron en el código de esta rama.
  - El código de A2 y los 17 E2E se leyeron en el worktree del PR #40.
  - Que el repositorio es público se comprobó con `gh repo view`.
  - No se corrieron Docker, `npm` ni el build, y no se descargó nada.
- **Hallazgos para otros ítems.** Están en «Relación con otros ítems» y en el informe al coordinador: el ciclo A3 → F11 → D1c → A4 → A3, la interfaz de la etapa de sesión con F11, la vista previa que el contrato de salida de A2 no contemplaba, la ráfaga de un aula contra los límites de Nginx y la plantilla del harness para A4.
- **`/speckit-analyze`** corre con `plan.md` y `tasks.md`, que todavía no existen: el plan viene después de que el usuario responda el clarify.
