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

**El clarify (2026-10-28)**

- **Sin marcadores.** El usuario respondió las cuatro preguntas y la partición, y la spec las registra en «Clarifications»:
  - Q1-A, la columna «Uso» antes de «Acciones»: FR-028 y FR-061 sin marcador. FR-061 y SC-007 no tienen excepciones, porque F12a (PR #84) y F12b (PR #85) cuentan los botones de fila dentro del grupo «Acciones sobre {nombre}»;
  - Q2-B, uPlot 1.6.32 (no era la recomendada): FR-045 y FR-056 sin marcador, FR-046 a FR-048 y FR-055 ajustados, FR-057 y SC-007 con el subpresupuesto de +95 000, y FR-063 nuevo, que dice qué se prueba de lo que dibuja uPlot (no cómo);
  - Q3-A: FR-041 y FR-042 sin marcador, con el riesgo 2 declarado y el hallazgo para C5;
  - Q4-A: «Dependencias reales» sin marcador;
  - P1-A: «La partición en F14a y F14b», con la parte de cada historia, cada requisito y cada criterio.
- **«Requirements are testable and unambiguous»** queda marcado: ningún requisito depende ya de una pregunta abierta.
- **Las lecturas L1 a L10** siguen como lecturas: el usuario las corrige si no está de acuerdo.

**El conteo**

- **63 requisitos,** con una sola obligación comprobable cada uno, y 10 criterios. Son los 62 del borrador y FR-063, que suma el clarify. La partición está aplicada (P1-A), y cada requisito lleva la marca de su parte:

| Parte | Requisitos propios | Con los 26 transversales (FR-038 a FR-063) |
| --- | --- | --- |
| F14a · Los agregados y la operación | 24 (FR-001 a FR-024) | 50 |
| F14b · Por cuenta (espera a F14a) | 13 (FR-025 a FR-037) | 39 |

- **Las dos partes quedan bajo los 52 de C3a.**
- **La cobertura:** cada requisito propio (FR-001 a FR-037) está en el «Cubre» de alguna historia, y los 63 llevan su marca de parte (se comprobó con un script). Los transversales valen para todas, y sus criterios son SC-003 a SC-010; FR-038 a FR-055 y FR-063 figuran además en las historias 5, 7 y 8.

**Excepciones deliberadas en «implementation details»**

F14 consume un contrato HTTP ya planificado, se monta dentro de una página que ya tiene plan y usa una librería que eligió el usuario, así que nombra lo que consume y dónde entra. Son cuatro grupos:

1. **Las rutas, los parámetros y los campos de C5** (`stats/overview`, `meta.period`, `nextCursor`, `stats_timeout`), porque son el contrato que la pantalla dibuja y lo que los E2E responden con el doble.
2. **Las piezas de F12a y F11a que se reutilizan** (`AdminPage`, `ACTION_SLOTS`, el grupo «Acciones sobre {nombre}», `reactionTo`, el doble de la API, React Hook Form), porque Q1 y varias reglas dependen de cómo están escritas sus pruebas.
3. **uPlot y las primitivas nativas** (`uplot@1.6.32`, `<meter>`, `<progress>`, el canvas y los estilos que uPlot escribe con el CSSOM), porque son la decisión de Q2-B y lo que la regla sin estilos en línea y C4 tienen que contrastar.
4. **Las herramientas de prueba y los comandos de cierre,** que fija el ADR 0008 y que la hoja de ruta pide a todo ítem.

**Verificación**

- Los enlaces relativos de la spec resuelven (script). C5, las correcciones de F12a y F12b y el código de F11a están fuera de `master`: se citan por rama, PR, commit y ruta, sin enlace.
- `git diff --check` limpio.
