# Specification Quality Checklist: D1 · Progreso y sincronización

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

- Clarify del 2026-10-06: no quedan marcadores `[NEEDS CLARIFICATION]`. El usuario respondió Q1 a Q4 con la opción recomendada y aceptó la partición en tres (D1a, D1b y D1c). Las respuestas quedaron en «Clarifications», con las opciones que no se eligieron: FR-027, FR-042 y FR-068 perdieron su marcador, y FR-079 y el escenario 7 de la historia 4 dejaron de ser propuestas. Q1 a Q3 son las tres partes de la pregunta 17 del ADR 0006 §13, la única de D1 en la hoja de ruta, y quedan cerradas. Siguen como propuestas las demás marcas «(propuesta)» de la spec, la tabla «Ajustes al ADR 0006 que propone esta spec» y lo que el plan de D1a decide por su cuenta. El `/speckit-analyze` de D1a corrió antes de este clarify (ver más abajo) y ninguna respuesta lo cambia: D1a no depende de Q1 a Q4.
- Excepciones deliberadas en «implementation details»: el ADR 0006 y la hoja de ruta ya decidieron la técnica (cola con UUID, `/api/sync`, época y revisión, espacios por cuenta, sesión de Laravel), y el entregable de D1 es un contrato HTTP y el comportamiento de un cliente, así que los requisitos nombran rutas, cabeceras, códigos de error, estados de operación y columnas de las tablas que ya existen en el ADR. FR-051 y FR-052 nombran el `CREATE TABLE` y los CHECK porque son decisiones del ADR (D07 y D35) que el plan no reabre. No nombran clases ni archivos nuevos; el diseño del cliente y de las operaciones queda para el plan, y los tipos de columna, para el ADR.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del ADR y conoce el proyecto. Los términos técnicos son los suyos.
- «Technology-agnostic»: los criterios usan códigos HTTP, `isLosslessNormalization`, el sha256 de los bytes publicados y los comandos de verificación del proyecto, porque D1 no tiene otro resultado observable: su valor es qué guarda el servidor, qué responde la API y qué conserva el navegador. SC-010 es una medición sin objetivo todavía.
- «Scope is clearly bounded»: trae sus listas de lo que entra, lo que queda fuera (C5, las vistas del front, B2, A3, A4, C3b) y lo que no se hace a propósito. La partición está justificada con datos en «Partición de D1», con su alternativa de dos partes y la de no partir.
- Lo que hay que confirmar y no viene del ADR está en la tabla «Ajustes al ADR 0006 que propone esta spec» (siete filas), en Assumptions y en las marcas «(propuesta)». Los ajustes que más pesan: la idempotencia de la importación dentro de la época (FR-028), el `userId` en las lecturas (FR-020 y FR-066), quién estampa la revisión y que sólo «Borrar todo» borre (FR-010 y FR-011), y que los CHECK que tocan fechas queden en el escritor (FR-052).
- Dependencias: B2, C3a y el épico del front son borradores sin clarify y viven en otras ramas, así que se citan por ruta y rama y no como enlaces; sus aportes están en tablas de supuestos, cada una con lo que se rompe si cambia. El ADR 0006 sigue en propuesta: su base está separada de lo decidido. La tabla de contraste de columnas con B2 responde a su Riesgo 7: no falta ninguna columna, y quedan dos hallazgos para B2 (la revisión de cada fila que cambia el cierre, y la poda de payloads después de un reset).
- Lo que se midió y cómo (2026-10-05, sin Docker ni descargas): las 12 tablas, sus 108 columnas y sus 21 FK, y las 38 viñetas de las decisiones, se contaron sobre el ADR 0006; las cuatro porciones de talleres y sus 100 etapas, sobre `tools/content/` y `qa/fixtures/workshop-steps-v1.json`; y las claves de las tres fixtures de progreso se recorrieron una por una (12 secciones, 1.150 rutas de clave y 44 distintas): todas tienen una columna o una tabla de destino, salvo `exportedAt` y los marcadores `version`, que FR-038 nombra como exclusiones. No se ejecutó ninguna prueba: la spec no cambia código.
- `/speckit-analyze` (2026-10-06) corrió con el `plan.md` y el `tasks.md` de D1a, la primera parte provisional de D1 (el clarify sigue pendiente y esta spec no se tocó): los 44 requisitos de D1a (los 42 de su rango más FR-087 y FR-088) y sus 8 criterios tienen tarea y compuerta, cada archivo tiene un solo dueño y los enlaces locales resuelven. Sus hallazgos y cómo se corrigieron están en el mensaje del commit de cierre del análisis.
