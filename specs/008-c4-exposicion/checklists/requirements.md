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

- El clarify del 2026-10-06 respondió las cinco preguntas con la opción recomendada (Q1 a Q5) y las registra en `## Clarifications`, bajo `### Session 2026-10-06`. Los tres marcadores `[NEEDS CLARIFICATION]` (FR-006, FR-016 y FR-036) se resolvieron en el texto de esos requisitos; FR-011, FR-031 y FR-041 dejaron de ser «propuesta». Siguen como propuestas FR-003, FR-014, FR-028, FR-029 y el prefijo de las cookies de FR-024, que no estaban en las preguntas: el plan las toma como base y se confirman en la compuerta.
- Lo que depende de la casa, del proveedor o del dominio del usuario no es una pregunta: está en «Acciones del usuario», aparte, con su momento (comprobar que la conexión admite la entrada, el dominio, el DNS, el router, los permisos de descarga, el destino y las claves de los respaldos, el monitor, la restauración presenciada y la prueba desde otra red).
- Excepciones deliberadas en «implementation details»: el ADR 0004 y la hoja de ruta ya decidieron la técnica (Nginx, Let's Encrypt, HSTS, `__Host-`, usuarios de MySQL con `db-grants`, volcado con la posición del binlog), y el entregable de C4 es lo que se ve desde afuera (puertos, cabeceras, cookies, permisos de la base y copias). Por eso los requisitos nombran cabeceras con su valor exacto, puertos, comandos de verificación y privilegios. No nombran clases ni archivos nuevos. Las herramientas candidatas (el módulo ACME de Nginx, `age`, `rclone`, Pebble…) aparecen sólo en las opciones de las preguntas y en «Descargas previstas».
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del ADR, abre el router y guarda las claves. Los términos técnicos son los suyos.
- «Technology-agnostic»: los criterios usan los puertos TCP 80 y 443, las cabeceras, la IP de origen y los privilegios de MySQL porque la feature no tiene otro resultado observable: su valor es qué se ve y qué se puede hacer desde afuera. Cada criterio se mide sin mirar la implementación.
- «Scope is clearly bounded»: la spec trae sus listas de lo que entra, lo que queda fuera (un tercero delante, IPv6 y HTTP/3, HSTS con `preload`, defensas de otro orden, el binlog fuera del host) y lo que no se hace a propósito. Las alternativas que cambian lo que se construye están en «Alternativas consideradas».
- Lo que ya está implementado (C3a) se toma como hecho y lo que sólo está planificado o en borrador (A2, B2, C3b, C3c, el épico del front) está marcado como supuesto en «Relación con C3, A3 y el front» y en Assumptions. No se editó ninguna spec hermana ni la hoja de ruta.
- Hallazgos que ninguna spec anterior tenía y que cambian lo que C4 construye: en el código propio hay seis sitios de estilo en línea y no cuatro (cuatro `style=` y dos asignaciones a `style.cssText`); CodeMirror 6 crea un `<style>` al montarse y su numeración de líneas asigna `style.cssText`, que un nonce no cubre, así que una CSP sin `'unsafe-inline'` ni en atributos exige cambiar el editor (Q3, FR-017 y FR-018; leído en el `node_modules` instalado, sin ejecutar); el módulo ACME de Nginx 0.4.1 soporta TLS-ALPN-01 además de HTTP-01, así que el puerto 80 puede cerrarse (Q1 y FR-001); Docker, sin una dirección explícita, publica también en IPv6 con su proxy de usuario, que puede ocultar la IP real (FR-001, FR-027 y V3); el firewall del host no filtra lo que Docker publica (FR-001); y el binlog local no sirve si el host se pierde (Q2 y FR-038).
- Sin mediciones propias: no se corrió Docker, ni el build, ni se descargó nada. Los tamaños y las licencias salen de metadatos del 2026-10-05 (Docker Hub, GitHub y el listado del repositorio Alpine de nginx.org), y las afirmaciones técnicas, de la documentación oficial de MDN, Vite, CodeMirror, NGINX, Let's Encrypt, Docker y MySQL. Lo que esa lectura no prueba queda en las verificaciones V1 a V4 del plan.
- SC-010 (retención de 35 días) sólo se puede verificar 35 días después de entregar: se anota como evidencia pendiente, no como entregado.
- `/speckit-analyze` corrió el 2026-10-06 con `plan.md` y `tasks.md`, y sus hallazgos se corrigieron el mismo día. El inventario: 47 requisitos, 13 criterios, 7 historias y 27 tareas, con cobertura total (los 60 requisitos y criterios tienen al menos una tarea), dueños sin archivos compartidos y ningún ciclo entre tareas. Sin conflictos con la constitución ni hallazgos críticos. Se corrigió: FR-044 (la autoridad sólo valida el dominio con el router abierto: se parte en G1 y G2), FR-042 (la clave privada no entra en el host y el binlog no sale: se parte en la restauración completa y el simulacro de punto en el tiempo) y FR-031 (el respaldo no necesita `TRIGGER`, `EVENT` ni `PROCESS`); el plan suma la comprobación de `npm run dev` y de la vista previa (US7), el límite de Laravel que depende de `trustProxies` (T020), qué hacer si el 301 del puerto 80 pisa el desafío (V1) y que la imagen no traiga estado ni claves (FR-009), se ajustó `deploy.sh` para que los pasos de `db-grants` sean condicionales y no cambien el escenario 3 de `deploy-check.sh` de C3a, y `public.sh` pasó a `docker/` porque `.dockerignore` excluye `backend/api` y el check que lo prueba corre dentro del build de la imagen web.
