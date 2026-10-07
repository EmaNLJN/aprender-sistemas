# Specification Quality Checklist: C3c · Correo, recuperación por email y registro abierto

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-06

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

- Esta spec nace de la partición de C3b (su Q4, opción B, del 2026-10-06): lleva el correo, con los requisitos, las historias y los criterios que la spec original de C3b agrupaba como «mitad del correo». Los requisitos se movieron textualmente, con seis cambios de redacción por la partición (FR-004, FR-005, FR-008, FR-022, FR-024 y FR-055) y los cuatro que aplican el clarify (FR-006, FR-013, FR-019 y FR-023). Los IDs se conservan para que las citas de B2, D1 y C4 sigan valiendo: FR-001 a FR-030, FR-051, FR-052 y el FR-055 compartido (33 requisitos), más el nuevo FR-057, que completa los ganchos que C3b deja.
- Ningún marcador `[NEEDS CLARIFICATION]`: Q1 (Brevo por SMTP), Q2 (el email se cambia sólo por consola), Q3 (el registro se restringe a una lista de dominios) y Q5 (un admin recupera su contraseña por consola) están en `## Clarifications`, junto con Q4 (la partición). Siguen marcadas «propuesta» las que no se preguntaron (los reintentos de FR-007, el tope global de FR-020 y el 503 del registro en modo sólo link de FR-017), y están en Assumptions.
- Lo que depende de la casa, del proveedor o del dominio del usuario no es una pregunta: está en «Acciones del usuario» (el dominio con DNS editable, la vía de la transferencia internacional, la cuenta de Brevo con su remitente y su credencial, SPF, DKIM y DMARC, el permiso de Mailpit, un `APP_URL` público, el aviso de privacidad, la lista de dominios y un envío real a tres buzones).
- Excepciones deliberadas en «implementation details»: el ADR 0006 y la hoja de ruta ya decidieron la técnica (cola `mail`, `worker-mail` aislado, `mail_jobs`, `db-grants`), y el entregable de C3c es un contrato HTTP más un comando y un servicio, así que los requisitos nombran rutas, códigos de error, tablas, comandos y usuarios de MySQL. No nombran clases ni archivos nuevos; cómo se arman es del plan. El proveedor aparece sólo en FR-006, en Q1 y en «Alternativas consideradas».
- «Technology-agnostic»: los criterios usan códigos HTTP, tablas y el nivel de PHPStan porque la feature no tiene otro resultado observable: su valor es qué responde la API, qué sale por correo y qué queda en la base. Cada criterio se mide sin mirar la implementación.
- «Scope is clearly bounded»: la spec trae lo que entra, lo que queda fuera (lo de C3a y de C3b, TLS y el dominio, las pantallas, el progreso y las ejecuciones) y lo que no se hace a propósito, con la tabla de la partición.
- Lo que se toma de borradores sin clarify (el plan de C3b, C4, el épico del front y el ADR 0006) está marcado como supuesto en «Relación con C3a, C3b, C4 y el front» y en Assumptions. No se editó ninguna hoja de ruta ni otra spec.
- Hallazgos para otros ítems: el borrador de C4 atribuye `worker-mail` y el usuario `mail` a C3b y habrá que corregirlo a C3c; el dominio que elija el usuario para C4 es lo que frena el plan de C3c; `docker/mysql/db-grants.sql` es estático y no puede llevar la contraseña del usuario de MySQL del correo sin un mecanismo que la tome de `.env` (FR-028), el mismo problema de los cinco usuarios de C4.
- Sin mediciones propias: no se corrió Docker ni PHP, y no se descargó nada. Las cifras del proveedor salen de buscadores o de sitios de terceros y están marcadas «a confirmar» en la fuente antes de contratar; la lista de países adecuados de la AAIP, de su página y de un resumen legal. Nada de esto es asesoramiento legal.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen: el plan espera el dominio que se elija para C4.
