# Specification Quality Checklist: F13 · La sincronización en la interfaz

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

**Lo que queda abierto hasta el clarify**

- **Los marcadores.** Quedan siete `[NEEDS CLARIFICATION]`, uno o dos por pregunta: Q1 en FR-003 y FR-007, Q2 en FR-004, Q3 en FR-036, Q4 en FR-019 y Q5 en FR-015. Cada pregunta tiene sus opciones, la recomendada, su motivo y su costo, en «Preguntas abiertas para el clarify». Hasta el clarify, esos requisitos usan la opción recomendada como borrador.
- **«Requirements are testable and unambiguous»** queda sin marcar por esos siete requisitos. Los otros 40 se pueden probar como están.
- **Las lecturas L1 a L8** no son preguntas: son cómo la spec aplica lo ya decidido (por ejemplo, que «atrasado» del FR-077 de D1 es el 409 `client_outdated`, o que los cambios rechazados se muestran). El usuario las corrige si no está de acuerdo.

**Excepciones deliberadas**

- **«Implementation details».** F13 dibuja el estado de un protocolo que ya tiene contrato (D1a y D1b) y vive dentro de un shell que ya tiene spec (F10). Por eso la spec nombra:
  - los códigos de error del contrato (`account_mismatch`, `epoch_mismatch`, `client_outdated`) y las rutas `POST /api/sync`, `GET /api/progress` y `POST /api/auth/logout`;
  - los elementos del shell que existen (`#save-label`, `.save-status`, `#toast`, `#main`) y el bloque de 850 px que oculta el pie;
  - `beforeunload`, porque es la única confirmación posible al cerrar, y `aria-live` sin `role`, porque los E2E de la compuerta y del toast ubican esas regiones por su rol;
  - el doble de la API de F11a y `page.close({ runBeforeUnload: true })`, porque el encargo pide E2E con un doble de `/api/sync` y `/api/progress`.

  Los nombres de módulos no aparecen: los decide el plan, después del de D1c.
- **«Non-technical stakeholders».** El lector es el dueño del taller, que tomó las decisiones de D1, de F11 y de F8. Para el alumno, la spec habla en sus términos: qué ve, qué se pierde y qué puede hacer.
- **«Technology-agnostic».** SC-002, SC-005, SC-008 y SC-010 nombran respuestas del contrato, el diálogo `beforeunload`, consultas por rol y comandos, porque son lo que se ejecuta. Los demás criterios hablan de textos, avisos, pedidos, escrituras y pasos de teclado.

**El tamaño**

- **47 requisitos y 10 criterios,** contra los 52 de C3a, la mayor del épico. No se propone partir: el corte natural (F13a, la línea, el toast y la franja; F13b, la cuenta distinta, «Salir» y la confirmación al cerrar) comparte la franja, el modo y la copia de D1c, y ninguna de las dos partes destraba nada.
- **La cobertura.** Los 37 requisitos que no son transversales (FR-001 a FR-037) están en el «Cubre» de alguna historia; lo comprobó un script. Los transversales (FR-038 a FR-047) valen para todas.
- **Las dependencias.** Cada requisito lleva entre paréntesis los ítems de los que depende (D1c, F10b, F11a, F11b, F8 o A3); los transversales dependen de lo mismo que la superficie a la que se aplican.

**Qué se midió, sin ejecutar nada**

- **No se ejecutó nada:** ni `npm`, ni Docker, ni un navegador.
- **El código** se leyó en `master` (`24ba9d3d`): el pie y `#toast` de `frontend/src/index.html`, sus reglas en `frontend/styles.css` (con el `display: none` de `.sidebar-bottom` desde 850 px), `updateSaveLabel` y `toast` de `frontend/app.js`, los E2E de F1 que fijan los textos del pie y los mensajes de `backend/api/lang/es/api.php`. El doble de la API, en `impl-f11a` (`a7b3c71d`).
- **Lo que hace D1c** sale de la spec de D1 y de sus contratos: D1c no tiene plan. Lo que F13 le pide va en «Lo que F13 supone de D1c».
- **Playwright** se consultó con Context7 (segunda instancia, versión 1.63.0): `beforeunload` con `page.close({ runBeforeUnload: true })`, `setOffline` y `clock.setSystemTime`. Lo que no confirmó (si `page.route` responde sin red y la interacción previa que exige Chromium) queda para el plan.
