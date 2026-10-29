# Specification Quality Checklist: F14 · Las estadísticas del admin en la interfaz

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

**El clarify (pendiente)**

- **Ocho marcadores, por cuatro preguntas y la partición:** Q1 en FR-028 y FR-061, Q2 en FR-045 y FR-056, Q3 en FR-041 y FR-042, Q4 en «Dependencias reales» y P1 en «La partición propuesta». Cada pregunta tiene sus opciones, una recomendada, su motivo y su costo.
- **«No [NEEDS CLARIFICATION] markers remain»** y **«Requirements are testable and unambiguous»** quedan sin marcar hasta el clarify. Mientras tanto, cada requisito marcado usa como borrador la opción recomendada, y es comprobable con ella.
- **Las lecturas L1 a L10** no son preguntas: el usuario las corrige si no está de acuerdo.

**El conteo**

- **62 requisitos,** con una sola obligación comprobable cada uno, y 10 criterios. Supera los 52 de C3a, así que la spec propone un corte sin aplicarlo (P1):

| Parte propuesta | Requisitos propios | Con los 25 transversales (FR-038 a FR-062) |
| --- | --- | --- |
| F14a · Los agregados y la operación | 24 (FR-001 a FR-024) | 49 |
| F14b · Por cuenta | 13 (FR-025 a FR-037) | 38 |

- **La cobertura:** cada requisito propio (FR-001 a FR-037) está en el «Cubre» de alguna historia (se comprobó con un script). Los transversales valen para todas, y sus criterios son SC-003 a SC-010; FR-038 a FR-055 figuran además en las historias 5, 7 y 8.

**Excepciones deliberadas en «implementation details»**

F14 consume un contrato HTTP ya planificado y se monta dentro de una página que ya tiene plan, así que nombra lo que consume y dónde entra. Son cuatro grupos:

1. **Las rutas, los parámetros y los campos de C5** (`stats/overview`, `meta.period`, `nextCursor`, `stats_timeout`), porque son el contrato que la pantalla dibuja y lo que los E2E responden con el doble.
2. **Las piezas de F12a y F11a que se reutilizan** (`AdminPage`, `ACTION_SLOTS`, `reactionTo`, el doble de la API, React Hook Form), porque Q1 y varias reglas dependen de cómo están escritas sus pruebas.
3. **Las primitivas de dibujo** (SVG con atributos de geometría, `<meter>`, `<progress>`), porque la regla de F12a sin estilos en línea decide qué se puede usar, y es lo que pregunta Q2.
4. **Las herramientas de prueba y los comandos de cierre,** que fija el ADR 0008 y que la hoja de ruta pide a todo ítem.

**Verificación**

- Los enlaces relativos de la spec resuelven (script). C5, las correcciones de F12a y el código de F11a están fuera de `master`: se citan por rama, commit y ruta, sin enlace.
- `git diff --check` limpio.
