# Specification Quality Checklist: C3b · Administración y ciclo de vida de la cuenta

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-05

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

- El clarify del 2026-10-06 cerró las cinco preguntas y ya no queda ningún marcador `[NEEDS CLARIFICATION]`: Q1 (Brevo por SMTP), Q2 (el cambio de email sólo por consola), Q3 (restricción por dominios), Q4 (la partición) y Q5 (un admin recupera su contraseña por consola). Están registradas en `## Clarifications`; Q1, Q2, Q3 y Q5 aplican a requisitos que pasaron a C3c.
- La partición (Q4, opción B) dejó en esta spec la administración y el ciclo de vida, con 23 requisitos heredados (FR-031 a FR-050, FR-053, FR-054 y el FR-055 compartido) y uno nuevo, FR-056 (sin correo hasta C3c), y llevó el correo a la [spec 011](../../011-c3c-correo/spec.md) con 33. Los IDs se conservan para que las citas de B2, D1 y C4 sigan valiendo, y la tabla de equivalencias está en la sección «Partición». FR-035, FR-036, FR-038, FR-039 y FR-045 perdieron su cláusula de correo, que C3c completa con su FR-057.
- Lo que depende de la casa o del usuario no es una pregunta: está en «Acciones del usuario» (el aviso de privacidad, la copia del libro de supresiones junto a cada respaldo y la aprobación del ADR). C3b no descarga nada y no suma servicios, secretos ni privilegios de MySQL.
- Excepciones deliberadas en «implementation details»: el ADR 0006 y la hoja de ruta ya decidieron la técnica (`password.confirm`, `UserData`, `account_deletions`, `scheduler`, la guardia del último admin), y el entregable de C3b es un contrato HTTP más comandos, así que los requisitos nombran rutas, códigos de error, tablas y comandos. No nombran clases ni archivos nuevos; cómo se arman es del plan.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del ADR y opera por consola. Los términos técnicos son los suyos.
- «Technology-agnostic»: los criterios usan códigos HTTP, tablas y el nivel de PHPStan porque la feature no tiene otro resultado observable: su valor es qué responde la API y qué queda en la base. Cada criterio se mide sin mirar la implementación.
- «Scope is clearly bounded»: la spec trae lo que entra, lo que queda fuera (el correo, que es de C3c, lo de C3a, TLS y el dominio, las pantallas, el progreso y las ejecuciones) y lo que no se hace a propósito.
- Lo que se toma de borradores sin clarify (D1, C4, el épico del front y el ADR 0006) está marcado como supuesto en «Relación con C3a, B2, D1, C3c, C4 y el front» y en Assumptions. Lo de C3a y B2 se verificó en su código (`feat/c3a-identidad`, `656b14e`, y `feat/b2-ejecuciones`). No se editó ninguna hoja de ruta ni la spec de C3a.
- Hallazgos que cambian lo que otros ítems construyen: la prueba de esquema de C3a exige una clave foránea en cascada para toda columna `user_id` y `account_deletions` no la tiene a propósito (FR-047); `Invitations::issue` renueva también la invitación vigente, así que la administración necesita otra semántica (FR-038); el borrador de C4 atribuye `worker-mail` y el usuario `mail` a C3b y son de C3c; y `php` corre con el disco de sólo lectura, así que el libro de supresiones entra por la entrada estándar.
- Sin mediciones propias: no se corrió Docker ni PHP, y no se descargó nada.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
