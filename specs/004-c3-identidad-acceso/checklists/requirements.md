# Specification Quality Checklist: C3a · Identidad y acceso: autenticación

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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`: FR-005 (Q1, montaje de la sesión), FR-017 (Q4, forma de las invitaciones) y FR-033 (Q3, si el admin puede estudiar con su cuenta). FR-023 (Q2, contraseñas) y FR-006, FR-014 y FR-015 (Q5, tiempos de sesión, «recordarme» y cookie de dispositivo) llevan su opción recomendada como «(propuesta)». Las cinco preguntas están en «Preguntas abiertas», cada una con sus opciones, lo que cuesta cada una y la recomendada; el clarify las cierra antes del plan. Las demás preguntas de §13 y las decisiones que salieron de esta spec están en «Para la segunda ronda».
- Excepciones deliberadas en «implementation details»: el ADR 0006 y la hoja de ruta ya decidieron la técnica (sesión de Laravel, Nginx, MySQL, `db-grants`, `scheduler`, PHPStan nivel 9), y el entregable de C3a es un contrato HTTP, así que los requisitos nombran rutas, cabeceras, códigos y comandos. No nombran clases ni archivos nuevos; el montaje con Fortify o sin él queda para el plan.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del ADR y conoce el proyecto. Los términos técnicos son los suyos.
- «Technology-agnostic»: los criterios usan códigos HTTP, el sha256 de los cuerpos y el nivel de PHPStan porque la feature no tiene otro resultado observable: su valor es qué responde la API y qué se ve desde afuera.
- «Scope is clearly bounded»: la spec es C3a, la primera mitad de C3. Trae sus listas de lo que entra, lo que queda fuera (C3b y el resto del épico) y lo que no se hace a propósito. La partición está justificada con datos en «Partición de C3», y su alternativa (el corte de la hoja de ruta, con el correo en C3a) está en «Alternativas consideradas».
- Lo que hay que confirmar y no viene del ADR está agrupado en Assumptions, en «Propuestas que no vienen del ADR» y en «El criterio J»: la renovación por consola, los códigos de 405 y 500, el 404 `invitation_not_found` que falta en §8, los cinco campos del usuario y el texto del criterio J, que no está en el repositorio.
- Las cifras de «Acciones del usuario» se midieron el 2026-10-05 sin instalar nada: Packagist y la API de árboles de GitHub para Fortify y Sanctum, Docker Hub para Mailpit, `npm view` para Playwright y la API de contenidos de GitHub para las listas de contraseñas. No son una resolución real de Composer ni un `pull`.
- `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen.
