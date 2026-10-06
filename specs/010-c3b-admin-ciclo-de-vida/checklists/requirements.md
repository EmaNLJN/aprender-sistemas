# Specification Quality Checklist: C3b · Correo, invitaciones y administración

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

- El clarify del 2026-10-06 cerró las cinco preguntas y ya no queda ningún marcador `[NEEDS CLARIFICATION]`: Q1 (Brevo por SMTP, FR-006), Q2 (el cambio de email sólo por consola, FR-023), Q3 (restricción por dominios, FR-019), Q4 (la partición) y Q5 (un admin recupera su contraseña por consola, FR-013). Están registradas en `## Clarifications`.
- Lo que depende de la casa, del proveedor o del dominio del usuario no es una pregunta: está en «Acciones del usuario», aparte (la vía de la transferencia internacional, el dominio con DNS editable, el proveedor con su remitente y su credencial, SPF, DKIM y DMARC, los permisos de descarga, un `APP_URL` público, el aviso de privacidad y un envío real a tres buzones).
- Excepciones deliberadas en «implementation details»: el ADR 0006 y la hoja de ruta ya decidieron la técnica (cola `mail`, `worker-mail` aislado, `password.confirm`, `UserData`, `account_deletions`, `db-grants`, `scheduler`), y el entregable de C3b es un contrato HTTP más comandos y un servicio, así que los requisitos nombran rutas, códigos de error, tablas, comandos y usuarios de MySQL. No nombran clases ni archivos nuevos; cómo se arman es del plan. Los proveedores y los paquetes aparecen sólo en las opciones de Q1 y en «Descargas previstas».
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del ADR, abre la cuenta del proveedor y guarda las credenciales. Los términos técnicos son los suyos.
- «Technology-agnostic»: los criterios usan códigos HTTP, tablas y el nivel de PHPStan porque la feature no tiene otro resultado observable: su valor es qué responde la API, qué sale por correo y qué queda en la base. Cada criterio se mide sin mirar la implementación.
- «Scope is clearly bounded»: la spec trae sus listas de lo que entra, lo que queda fuera (lo de C3a, TLS y el dominio, las pantallas, el progreso, las ejecuciones y las estadísticas) y lo que no se hace a propósito. La partición está medida (55 requisitos contra 52, 33 y 23 por mitad, 46 y 10 si se corta el ciclo de vida) y su propuesta de corte, con su costo, está en «Partición» y en Q4, sin aplicarse. Los grupos de requisitos llevan rotulada su mitad para poder contarlos.
- Lo que se toma de borradores sin clarify (el plan de C3a, B2, D1, C4, el épico del front y el ADR 0006) está marcado como supuesto en «Relación con C3a, B2, D1, C4 y el front» y en Assumptions. No se editó ninguna hoja de ruta ni la spec de C3a. Los únicos enlaces relativos son los de esta rama (la spec 004, la hoja de ruta y el ADR 0006); lo demás se cita por ruta y rama, sin enlace.
- Hallazgos que ninguna spec anterior tenía y que cambian lo que otros ítems construyen: `docker/mysql/db-grants.sql` es un archivo estático que no puede llevar la contraseña del usuario de MySQL del correo (ni las de los cinco usuarios de C4) sin un mecanismo que la tome de `.env` (FR-028); B2 supone que C3b llama a su operación de cancelar ejecuciones, y el contrato de C3a dice que C3b trae el punto de extensión: se resuelve con un evento que C3b dispara y B2 consume (FR-035); la prueba de DNS de C3a necesita una excepción para `worker-mail` (FR-026); `worker-mail` no es el único contenedor con salida a Internet, porque `taller` conserva su red `edge`, pero sí el único de la aplicación con `APP_KEY` y credenciales (FR-001); la regla del ADR de que ninguna respuesta de `/api/admin/*` lleve `code` choca con el `code` de los errores (FR-041); los dos plazos del barrido de cuentas en `deleting` del ADR (5 y 15 minutos) se concilian en FR-046; la spec de C3a cuenta «uno o dos» paquetes para los drivers de API, que son 1, 3 o 4 con sus dependencias directas (Q1); y la rama del front que se pudo leer (commit `cca5fdf`) no tiene F12 y define F11 sólo como login e invitación.
- Sin mediciones propias: no se corrió Docker ni PHP, y no se descargó nada. Las cifras de «Descargas previstas» y de Q1 salen de metadatos del 2026-10-05: Packagist, la API de árboles de GitHub, la API de Docker Hub y las páginas de precios y de documentación de Resend, Amazon SES y Google. Lo marcado «a confirmar» (Brevo, Mailgun, Postmark y el límite de un Gmail personal) sale de buscadores o de sitios de terceros, y la lista de países adecuados de la AAIP, de su página y de un resumen legal. Los tamaños de los paquetes son cotas leídas del árbol de Git, no el tamaño instalado ni una resolución de Composer. Nada de esto es asesoramiento legal.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen: el plan viene después de que el usuario responda el clarify.
