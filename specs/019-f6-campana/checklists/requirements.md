# Specification Quality Checklist: F6 · Campaña

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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`, uno por pregunta abierta: Q1 en FR-031 (las palabras que repiten un conteo), Q2 en FR-018 (la región viva del checkpoint) y Q3 en FR-019 (los `<details>` abiertos). Por eso quedan sin marcar «No [NEEDS CLARIFICATION] markers remain» y «Requirements are testable and unambiguous»: esos tres requisitos usan la opción recomendada como borrador hasta que el usuario responda. Los demás son comprobables hoy. Q2 y Q3 son las mismas decisiones que la Q3 de F9 y la Q3 de F3 (spec de F9, rama `spec/f9-recorrido`; spec de F3, rama `spec/f3-biblioteca`).
- Excepciones deliberadas en «implementation details»: F6 es un port y su objeto son archivos, capas y contratos entre vistas. La spec nombra la capa y el slice de Feature-Sliced Design, las rutas de los archivos legacy y los métodos de `window.TallerCampaign` porque son lo que se retira o se conserva, y las herramientas (Vitest, Testing Library, fishery, Playwright, Zustand) porque las fijan el ADR 0008, `AGENTS.md` y la spec de F2. Los nombres de módulos, carpetas y adaptadores son provisionales y los confirma el plan; la spec fija la capa, la responsabilidad y el contrato. No hay código.
- «Non-technical stakeholders»: el lector es el dueño del taller, que tomó las decisiones del épico y conoce el mapa del front legacy. Los términos técnicos son los suyos. Para el alumno, el resultado es que no cambia nada, y la spec lo dice en su intención.
- «Technology-agnostic»: SC-001, SC-003, SC-004 y SC-012 nombran los comandos, los checks y las fixtures porque son lo que se ejecuta. Los demás criterios hablan de diferencias, de escrituras, de conteos y de pruebas, no de cómo se construyen.
- El conteo es de esta spec: 48 requisitos (FR-001 a FR-048), 12 criterios de éxito, 6 historias con 32 escenarios, 10 casos borde, 13 riesgos y 3 preguntas, contra los 52 de C3a, la mayor del épico. No se propone cortar; si el plan la encuentra grande, el corte natural está en «Alternativas consideradas» (la red de E2E primero, la página y el corte después).
- Los exploradores de robot y paquetes no son una pregunta: la campaña nunca los dibuja y la hoja de ruta los pone en F7. La evidencia está en «Los exploradores de robot y paquetes». `TallerCampaign.init` tampoco lo es: la hoja de ruta y la tabla de adaptadores de la spec de F2 dicen que F6 lo retira; la spec fija el orden y el aviso de carga y deja a quién llama al plan.
- Hallazgos que la spec registra y no corrige (los lleva el informe al coordinador): `app.js` también llama a `refresh` (en `render()`) y a `sync` (en el respaldo), así que F7 no puede retirarlos como dicen la hoja de ruta y la spec de F2; `window.TallerEffects` lo lee Sistemas hasta F5; el título de R10 de `css-contract` seguirá nombrando `campaign.css`; el tope de 2 500 000 caracteres de los criterios globales quedó viejo (A2 lo dejó en 1 250 000); `legacy-map.md` cuenta 203 líneas para `campaign.js` y la integración local de F2b tiene 201.
- Nada se ejecutó: sin `npm`, sin Docker, sin navegador y sin descargas. Lo que describe el comportamiento salió de leer `frontend/campaign.js`, `frontend/campaign.css`, `frontend/app.js`, `frontend/lab.js`, `frontend/src/entities/campaign/`, los adaptadores de `frontend/src/app/legacy/`, los E2E de `qa/e2e/` y los checks de `qa/`, en la integración local de F2a, A2 y las cuatro unidades de F2b (sólo lectura), y de las specs y los informes de F3, F4 y F9. Los conteos de líneas, de llamadas y de clases salen de `grep` y de `node` de sólo lectura. El tamaño del HTML (1 141 337 caracteres) es una medida del coordinador, no se volvió a medir.
- El análisis cruzado (`/speckit-analyze`) corre después del plan y de las tareas: todavía no hay nada que cruzar con la spec.
