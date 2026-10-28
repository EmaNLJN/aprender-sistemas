# Specification Quality Checklist: F5 · Port de Sistemas

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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`: FR-017 (Q1, dónde vive la sesión de simulaciones y si lleva la familia y la búsqueda), FR-025 (Q2, cómo se retira el `style="…"` del SVG) y FR-011 (Q3, si la selección del taller pasa a nuqs en F5). Cada pregunta está en «Preguntas abiertas» con sus opciones, lo que cuesta cada una y la recomendada con su motivo (A en las tres); hasta que el usuario responda, los requisitos usan la recomendada como borrador. «Requirements are testable and unambiguous» se marcó porque cada uno de esos tres requisitos se puede probar con la opción recomendada.
- El conteo es de esta spec: 50 requisitos, con una obligación comprobable por requisito, contra los 52 de C3a, la mayor del épico. No supera el máximo, así que no se propone un corte. «Alternativas consideradas» deja anotado el que se descartó (F5a con los E2E de caracterización, el saneo y la sesión, y F5b con la página y los borrados) y por qué: F7 espera a F5 y el PR tiene que poder revertirse entero.
- Excepciones deliberadas en «implementation details»: F5 es un port y su objeto son módulos, capas, archivos y globals. La spec nombra la capa y el slice de Feature-Sliced Design, los métodos de `window.TallerSystems`, las reglas del guard y las herramientas (Vitest, Testing Library, fishery, Playwright, Zustand) porque las fijan el pedido del coordinador, la hoja de ruta, el ADR 0008 y `AGENTS.md`, no el diseño de esta spec. Los nombres de archivos nuevos son provisionales y los confirma el plan. No hay código.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del épico y conoce el mapa del front legacy. Los términos técnicos son los suyos. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- «Technology-agnostic»: SC-001 a SC-009 nombran los E2E, los checks, el barrido de estilo y el tope de `qa/build-check` porque son lo que se ejecuta; un port se mide contra el comportamiento de hoy. Cada criterio habla de diferencias, escrituras, bytes y pruebas, no de cómo se construye.
- Lo que se toma de F2a, A2 y F2b va como hecho y se cita como código del ensayo `2b37caf4` (sin merge), con rutas entre comillas de código y no como enlaces, porque no existen en `master`. Las fixtures, el README, el mapa, el ADR 0008 y las specs de A2 y C4 sí existen en esta rama y sus enlaces se verificaron. La spec de A4 (PR #50) se cita por su ruta.
- Sin mediciones propias: esta spec leyó el código y no corrió `npm`, Docker ni el navegador (el ensayo no tiene `dist/` ni `node_modules`). Lo único que se confirmó leyendo es el tope `BOOT_SIZE_LIMIT = 1250000`, los llamadores de `window.TallerSystems` en `app.js` y `lab.js`, las 17 pruebas de `content-gate.spec.ts`, el contenido de la fixture de progreso (un solo registro, `rust:pc` con sus tres sellos) y que ninguna hoja, check ni herramienta usa `data-sys*`. El tamaño del HTML y los conteos de pruebas del ensayo los midió el coordinador y el plan los vuelve a tomar.
- Hallazgos que afectan a otros ítems (están en «Hallazgos que afectan a otros ítems» y en el informe): C4 no espera a F5 desde su clarify (Q3, B); los retiros de `window.TallerSystems` de la hoja de ruta omiten `init` y fechan mal `sync` y `resetSimulations`; `AGENTS.md` y la hoja de ruta se contradicen sobre nuqs; el tope de tamaño de la hoja de ruta es el de antes de A2; la pila de DOM tiene dos candidatos a instalarla; `boot-check` tiene el caso del Atlas escrito a mano; el grep de `style=` de F2b marca el `style` de JSX.
- No se editó ninguna hoja de ruta, otra spec ni `AGENTS.md`. `/speckit-analyze` corre con `plan.md` y `tasks.md`, que todavía no existen: el plan viene después de que el usuario responda el clarify.
