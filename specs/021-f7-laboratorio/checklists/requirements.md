# Specification Quality Checklist: F7 · Port del laboratorio con sus exploradores a React

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

- Quedan tres marcadores `[NEEDS CLARIFICATION]`, uno por cada pregunta que cambia un requisito: Q1 (la etiqueta «Resuelto con pruebas», FR-054), Q2 (los estados de la espera, FR-048) y Q3 (los redibujos completos, FR-036). Q4, la partición, no cambia ningún requisito: decide cómo se entregan, y cada requisito ya dice a qué mitad iría. Las cuatro tienen opciones, una recomendada con su motivo y su costo, en «Preguntas para el clarify», y los requisitos asumen la recomendada. Son cuatro de las cinco permitidas.
- «Requirements are testable and unambiguous» se marca al responder el clarify: los tres requisitos con marcador dependen de una respuesta. Los otros 63 se pueden probar con lo que hay, y cada uno remite a su escenario, a su tabla o a su criterio de éxito.
- **Excepciones deliberadas a «implementation details»,** con el precedente de las specs de F2 y F9. F7 es un port, y su contrato es el comportamiento del código de hoy.
  - La spec nombra funciones de `frontend/lab.js`, los singletons de F2a, los puentes y los modelos de F2b, CodeMirror, `zustand`, `useStore` y los checks de `qa/`. Son lo que se retira, lo que se usa y lo que se verifica, y los fijan `AGENTS.md`, el ADR 0008 y los planes de F2a y F2b, no el diseño de esta spec.
  - El contrato del puerto de `features/run-exercise` se describe por sus campos, no por sus tipos, porque A4 lo necesita para planificar.
  - Los nombres nuevos (`pages/lab`, el hook del editor y el adaptador de `window.TallerLab`) son provisionales y los confirma el plan.
  - No hay código de producción.
- **«Non-technical stakeholders»:** el lector es el dueño del taller, que conoce el mapa del front legacy y tomó las decisiones del épico. Para el alumno, el resultado es que no cambia nada, y la intención lo dice.
- **«Technology-agnostic»:** SC-002, SC-006, SC-007, SC-009 y SC-011 nombran comandos, checks y globals porque son lo que se ejecuta o se revisa. Los demás hablan de bytes, escrituras, diferencias, caracteres y pruebas.
- **El conteo:** 66 requisitos, con una obligación comprobable por requisito, contra los 52 de C3a, la mayor del épico. La spec propone partirla en F7a (30) y F7b (52) en «Partición» y lo pregunta en Q4, sin aplicarlo.
- **Discrepancias que la spec registra y no corrige,** para el coordinador:
  - la hoja de ruta deja `refresh` y `sync` de los adaptadores de campaña y Sistemas «hasta F7», pero `app.js` también los lee;
  - la hoja de ruta no lista `register-runner.ts` ni `register-editor.ts` entre lo que F7 borra;
  - la fila de C4 sigue diciendo que espera los `style=`, y C4 ya decidió `style-src-attr 'unsafe-inline'`;
  - el tope de 2 500 000 caracteres quedó viejo con A2 (1 250 000);
  - la spec describe `f2b-acum` (`2b37caf4`) y no `master` (`e87772d`).
- **Qué se midió, sin ejecutar nada del producto:**
  - los registros de `qa/fixtures/progress-master-2a278ad-storage.json`, leídos con `node`: 11 registros, 9 con `solvedAt` y uno de ellos, `rust-09`, sin un último resultado que apruebe;
  - el código de `f2b-acum`: los tres archivos legacy, `entities/exercise`, `shared/api/playground`, `shared/ui/code-editor`, los adaptadores, los checks y los E2E de F1.

  No corrieron `npm`, Docker ni un navegador. Quedan sin verificar: si el `onChange` de React ve el `input` despachado por CodeMirror, si CodeMirror corre en jsdom, lo que anuncia un lector de pantalla y los avisos de complejidad actuales de los tres archivos.
- F5 y F6 son borradores sin clarify (specs 018 y 019, en sus ramas): lo que se toma de ellas son los supuestos F5-S1 a F5-S3 y F6-S1 a F6-S3, contrastados con esos borradores el 2026-10-28.
- Los hallazgos que afectan a otros ítems (F2b, F5, F6, A4, D1, C4, F8, F10 y la hoja de ruta) están en «Relación con otros ítems» y en el informe del coordinador, no acá.
