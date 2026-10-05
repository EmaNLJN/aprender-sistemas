# Specification Quality Checklist: C4 · Exposición

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-05

**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`: FR-006 (Q1, cómo se obtiene y se renueva el certificado), FR-016 (Q3, cómo cumplen el editor y los estilos en línea una CSP sin `'unsafe-inline'`) y FR-036 (Q2, a dónde van los respaldos). FR-011 y FR-041 (Q4, cómo se entera quien opera de un fallo) y FR-031 (Q5, cuántos usuarios de MySQL) llevan su opción recomendada como «(propuesta)». Las cinco preguntas están en «Preguntas abiertas», cada una con sus opciones, lo que cuesta cada una y la recomendada con su motivo; el clarify las cierra antes del plan.
- Lo que depende de la casa, del proveedor o del dominio del usuario no es una pregunta: está en «Acciones del usuario», aparte (comprobar que la conexión admite la entrada, el dominio, el DNS, el router, los permisos de descarga, el destino y las claves de los respaldos, la restauración presenciada y la prueba desde otra red).
- Excepciones deliberadas en «implementation details»: el ADR 0004 y la hoja de ruta ya decidieron la técnica (Nginx, Let's Encrypt, HSTS, `__Host-`, usuarios de MySQL con `db-grants`, volcado con la posición del binlog), y el entregable de C4 es lo que se ve desde afuera (puertos, cabeceras, cookies, permisos de la base y copias). Por eso los requisitos nombran cabeceras con su valor exacto, puertos, comandos de verificación y privilegios. No nombran clases ni archivos nuevos. Las herramientas candidatas (el módulo ACME de Nginx, `age`, `rclone`, Pebble…) aparecen sólo en las opciones de las preguntas y en «Descargas previstas».
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del ADR, abre el router y guarda las claves. Los términos técnicos son los suyos.
- «Technology-agnostic»: los criterios usan los puertos TCP 80 y 443, las cabeceras, la IP de origen y los privilegios de MySQL porque la feature no tiene otro resultado observable: su valor es qué se ve y qué se puede hacer desde afuera. Cada criterio se mide sin mirar la implementación.
- «Scope is clearly bounded»: la spec trae sus listas de lo que entra, lo que queda fuera (un tercero delante, IPv6 y HTTP/3, HSTS con `preload`, defensas de otro orden, el binlog fuera del host) y lo que no se hace a propósito. Las alternativas que cambian lo que se construye están en «Alternativas consideradas».
- Lo que se toma de borradores sin clarify (C3a y C3b, A2, el épico del front) está marcado como supuesto en «Relación con C3, A3 y el front» y en Assumptions. No se editó ninguna spec hermana ni la hoja de ruta.
- Hallazgos que ninguna spec anterior tenía y que cambian lo que C4 construye: hay seis sitios de estilo en línea y no cuatro (cuatro `style=` y dos asignaciones a `style.cssText`), y CodeMirror 6 crea un `<style>` al montarse (Q3, FR-017 y FR-018); Docker, sin una dirección explícita, publica también en IPv6 con su proxy de usuario, que puede ocultar la IP real (FR-001, FR-027 y V3); el firewall del host no filtra lo que Docker publica (FR-001); y el binlog local no sirve si el host se pierde (Q2 y FR-038).
- Sin mediciones propias: no se corrió Docker, ni el build, ni se descargó nada. Los tamaños y las licencias salen de metadatos del 2026-10-05 (Docker Hub, GitHub y el listado del repositorio Alpine de nginx.org), y las afirmaciones técnicas, de la documentación oficial de MDN, Vite, CodeMirror, NGINX, Let's Encrypt, Docker y MySQL. Lo que esa lectura no prueba queda en las verificaciones V1 a V4 del plan.
- SC-010 (retención de 35 días) sólo se puede verificar 35 días después de entregar: se anota como evidencia pendiente, no como entregado.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen: el plan viene después de que el usuario responda el clarify.
