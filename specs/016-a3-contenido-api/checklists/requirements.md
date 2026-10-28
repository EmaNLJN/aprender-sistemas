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

- **Clarify del 2026-10-28.** No quedan marcadores `[NEEDS CLARIFICATION]` ni requisitos «(propuesta, Qn)». El usuario respondió Q1 a Q4 con la opción recomendada, y quedaron en «Clarifications»:
  - Q1: A3 espera sólo a F11a;
  - Q2: la copia la usa sólo quien no cerró su sesión;
  - Q3: la vista previa pasa `/api/` al stack;
  - Q4: la copia vive en IndexedDB.

  De esa ronda cambian la spec además la interfaz con F11 (R1, «pedir el ingreso») y la sesión obligatoria desde F11a (F11-Q1), con el ruling C1 del coordinador. La etapa de sesión, el doble de la API de los E2E y el proxy de `/api/` de `npm run dev` y de la vista previa pasan a F11a. FR-032 y FR-033 quedan marcados «pasa a F11a» y conservan su número. Por R1 se corrigieron FR-001 a FR-003, FR-010, FR-012, FR-038, FR-040 y la User Story 4. Siguen como propuestas de la spec, sin pregunta propia, la plantilla del harness para A4 y el tope de 3 rondas.
- **Excepciones deliberadas en «implementation details».** La feature es el transporte y el arranque del front, y la técnica ya la decidieron el ADR 0004, el ADR 0006 §7 y A2. Por eso los requisitos nombran los recursos de la API, las cabeceras (`ETag`, `If-None-Match`, `Content-Version` y `Retry-After`), los checks de `qa/`, la red E2E, Vite, Nginx y Compose. Lo que piden son resultados observables: los pedidos por arranque, el todo o nada, el progreso intacto, el texto del aviso y el 404 de las rutas del puente. IndexedDB la decidió el usuario en Q4.
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
- **Hallazgos para otros ítems.** Están en «Relación con otros ítems» y en el informe al coordinador: la interfaz con F11a (ya decidida por el clarify), la ráfaga de un aula contra los límites de Nginx, la plantilla del harness para A4 y que F11d borre la copia al activar el modo «computadora compartida». El ciclo A3 → F11 → D1c → A4 → A3 desapareció con la partición de F11.
- **`/speckit-analyze`** corre con `plan.md` y `tasks.md`, que todavía no existen. El plan sigue al clarify del 2026-10-28 y parte de lo que entregue F11a.
