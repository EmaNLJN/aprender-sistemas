# Hoja de ruta del refactor

Diagnóstico y plan del 2026-10-03. Consolidá aquí el estado del refactor; las decisiones
sustanciales van además a `docs/adr/`. Después del commit de formato, ubicá el código por
archivo y nombre de función: los números de línea del diagnóstico original ya no aplican.

## Objetivos

1. Alinear el proyecto con `AGENTS.md`, `docs/architecture.md`, las skills del proyecto y
   el uso de Context7.
2. Eliminar duplicación, código muerto y ruedas reinventadas; partir módulos gigantes por
   responsabilidades con contrato.
3. Portar progresivamente el JavaScript remanente (`.js`, `.mjs`, `.cjs`) a TypeScript:
   fuentes de la aplicación, checks de `qa/` y configuraciones.
4. Después del refactor, sumar al Laboratorio una sesión «Esenciales» de Rust y Go.

## Forma de trabajo

- **Orquestación:** la sesión principal (Opus 5.5, effort max) analiza, decide, revisa diffs,
  integra y ejecuta la verificación final. La implementación de slices acotados se delega en
  subagentes Sonnet 5.5 con effort medium; el análisis y la revisión adversarial, en Opus.
- **Cada fase termina en verde:** `npm run build`, `npm test`, `npm run lint`,
  `npm run format:check` y `git diff --check`.
- **Oráculo de equivalencia** para cambios que no deben alterar comportamiento: volcado JSON
  canónico de todos los globals de datos, de `initial`/`view`/`achieved` de los 25 modelos de
  Sistemas y del contenido de Atlas; hash de `dist/index.html`; y
  `node qa/runtime-check.ts {rust,go} --audit-record` (137/137 por lenguaje en la línea
  base). Un refactor «puro» que cambia el volcado no es puro.
- **Separación de commits:** lo mecánico (formato, movimientos, ports equivalentes) nunca se
  mezcla con cambios de comportamiento. Cada corrección de comportamiento lleva su propio
  commit TDD: primero se caracteriza lo actual, después la prueba cambia deliberadamente.
- **Datos grandes:** los catálogos se transforman con codemods o scripts verificables, nunca
  reescribiendo contenido a mano.

Línea base (`master` 2a278ad): build OK (`dist/index.html` de 1 994 073 bytes), suite
completa PASS, ESLint 0 errores y 77 avisos de complejidad, Prettier OK. Formatear con
Prettier todo el JS legacy produce un bundle idéntico byte a byte; formatear el CSS sólo
agrega espacios no significativos dentro de custom properties y `rect()`.

## Diagnóstico consolidado

### Integridad del progreso (prioridad alta)

| Almacén | Problema | Evidencia |
| --- | --- | --- |
| Recorrido (`taller-learning-v1`, `app.js`) | Sanea al cargar y reescribe: un ID desconocido, un valor fuera de rango o un rollback borran progreso antes de poder exportarlo. | Reproducido en VM |
| Laboratorio (`taller-laboratorio-v1`, `lab.js`) | Un JSON ilegible o de otra versión se informa como «guardado no disponible» y el primer `save()` lo sobrescribe sin aviso. Si faltan catálogos al cargar, `sanitize` descarta registros y el siguiente guardado persiste la pérdida. | Reproducido en VM |
| Laboratorio, importación | El merge superficial hace que un respaldo sin `assisted`, `solutionSeen` o `predictionCorrect` pise valores `true` locales. | Reproducido en VM |
| Campaña (`taller-campaign-v1`) | Una copia ilegible deja el estado en blanco y el primer `persist` pierde los checkpoints. | Lectura y tests existentes |
| Sistemas (`taller-systems-v1`) | Un único registro inválido descarta todo el progreso y la primera escritura lo sobrescribe. | Reproducido en VM |
| Laboratorio, ejecución | Si `TallerSystems.sync`, `TallerCampaign.sync` o `canAttempt` lanzan dentro del `try` del transporte, un resultado aprobado se reescribe como `transportError`. Hoy es latente. | Lectura |

La política recomendada para corregirlos: banderas de logro y de ayuda recibida se fusionan
de forma monótona; borradores y notas importados reemplazan a los locales; una copia ilegible
se respalda en una clave lateral antes de cualquier escritura y se avisa al alumno; el
almacenamiento bloqueado y la copia ilegible se distinguen.

### Contratos sin red de seguridad

- La regla de evidencia de código aprobado está copiada en `lab.js`, `campaign-engine.js` y
  `systems-engine.js`. Si divergen, un fallo puede aprobar.
- IDs derivados de la posición en `lab-rust.js`, `quests-rust.js` y los catálogos y núcleos
  `systems-{lowlevel,infra,play}`; los checks recalculan el esperado con la misma fórmula,
  así que un reordenamiento pasa y el progreso queda asociado a otro ejercicio.
- Ningún check cubre `app.js` (exportar, importar, borrar), `content.js`, el puente de
  `campaign.js`/`systems.js` con el laboratorio (`exerciseContextHTML`,
  `lockedExerciseHTML`, `returnURL`, `missionIDs`), la interpretación de la ejecución en
  `lab.js` ni las dependencias de orden de `src/main.tsx`.

### Duplicación

| Duplicación | Copias | Nota |
| --- | --- | --- |
| Almacén JSON versionado | `app.js`, `lab.js`, `campaign-engine.js`, `systems-engine.js` | Cuatro comportamientos ante datos ilegibles; unificar exige decidir la política anterior. |
| Evidencia de aprobación | 3 | Ver arriba. |
| Escape HTML | `app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js`, `quest-explorers.js` | Las dos copias de exploradores muestran `undefined`/`null`. |
| Clon JSON | `campaign-engine.js`, `systems-engine.js`, `lab.js`, `systems-{lowlevel,infra,play,pc}.js` | `structuredClone` no existe en los contextos `vm` de QA: conservar la semántica JSON. |
| Normalización de búsqueda | `app.js`, `lab.js`, `systems.js`, Atlas | Idénticas. |
| Etiquetas y listas de niveles y lenguajes | `lab.js`, `campaign.js`, `systems.js`, Atlas, `app.js`, motores | Atlas dice «Principiante» y el resto «Inicial». |
| Guarda de objeto plano | `campaign-engine.js`, `systems-engine.js` | — |
| Portapapeles y descarga de archivos | `app.js`, `lab.js`, `project-kit-source.js` | `execCommand('copy')` obsoleto como fallback. |
| Diálogo de confirmación | `src/index.html` + `app.js`; `lab.js` crea otro | — |
| Andamiaje de modelos de Sistemas | `button`, `cell`, `metric`, `log`, `copy`, `achieved` en los 4 dominios | `defineModel` generaliza la fábrica de `systems-infra.js`. |
| Fábricas de ejercicios | 8 copias con 3 estrategias de ID | Una fábrica tipada con IDs explícitos. |
| Validadores y helpers de QA | `plain` ×7, contrato de vista ×5 | `qa/lib/`. |
| Protocolo de Playground y toolchains | `runner.js`, `qa/runtime-check.ts`, `project-kit-source.js` | El criterio de éxito de Go difiere entre runner y runtime-check. |
| Contexto del lab para campaña y Sistemas | API paralela; el lab busca tres veces | — |

### Módulos con demasiadas responsabilidades

- `app.js`: bootstrap, shell, router, cuatro páginas por template, diálogo de sesión,
  temporizador y respaldo global de los cuatro almacenes.
- `lab.js`: catálogo, estado, validación de importación, URL, render, ejecución, diagnóstico,
  simulaciones, editor de respaldo y diálogo. `onClick` tiene complejidad 64.
- `campaign.js`, `systems.js`: URL, render, eventos, efectos y puente con el lab.
- `systems-{lowlevel,infra,play,pc}.js`: contenido, transiciones y presentación juntos.
- `campaign-engine.js` y `systems-engine.js`: validación de catálogo, reglas, persistencia y
  textos en una misma función `init`.

### Código muerto y restos

- Artefactos locales que ningún script genera: `index.html` raíz, `atlas.bundle.js`,
  `editor.bundle.js`, `game-effects.bundle.js` y `build/`.
- `build:kits` y `project-kit.bundle.js` existen sólo para QA; un bundle en memoria es
  idéntico.
- Exports sin consumidores (`TallerRunner.endpoints/timeoutMs`, `TallerEditor.name`, `view`
  del editor), campos que sólo se escriben en modelos de Sistemas y en el motor de campaña,
  la rama `AbortError` de `lab.js`, el fallback de textarea del editor (confirmar en
  navegador), `data-project-library`, comentarios obsoletos (`.gitignore` menciona
  `build.mjs`/`build.py`).

### Atlas frente a las convenciones

`AtlasView.tsx` reúne seis componentes, usa `type` para props y sesión, exporta con nombre en
lugar de `export default`, filtra dentro del componente y usa un `useEffect` sin dependencias
para mover el foco. `src/features/atlas` es una vista completa: en FSD corresponde a
`pages/atlas`.

### Herramientas y guía de agentes

- Claude Code sólo carga `AGENTS.md` de forma nativa desde la versión 2.1.277; la CLI local
  es 2.1.162. Hace falta un `CLAUDE.md` que importe `@AGENTS.md` y equivalentes en `qa/` y
  `tools/quality/`.
- Claude Code descubre skills sólo en `.claude/skills/`: se exponen con symlinks por skill
  hacia `.agents/skills/`. La skill `code-review` del proyecto reemplazaría al comando
  incluido de Claude Code, así que queda sólo para Codex.
- Los globs de `format`/`format:check` dependen de la expansión del shell.
- `AGENTS.md` repite un párrafo y nombra un único modelo de Codex para subagentes.

## Arquitectura objetivo

Feature-Sliced Design incremental; cada carpeta nace con su primer consumidor real.

```text
src/
  index.html
  app/                 entrada, orden legacy, adaptadores window.Taller* tipados
  pages/               atlas primero; luego biblioteca, proyecto, método, Sistemas, campaña…
  features/            p. ej. download-project-kit, progress-backup, run-exercise
  entities/            exercise, campaign, systems-workshop, systems-simulation, guide
  shared/              lib (texto, escape, clon JSON, almacén), config (niveles, lenguajes),
                       api (Playgrounds), ui (editor de código)
qa/
  lib/                 cargador esbuild→vm, importador de módulos TS, validadores comunes
  *-check.ts           checks ejecutados por Node 24 con type stripping
```

Los archivos legacy dejan la raíz a medida que se portan. Cada global `window.Taller*` que
siga teniendo consumidores legacy se publica desde un adaptador pequeño importado en la misma
posición de la entrada.

## Fases

| Fase | Contenido | Implementa | Verificación |
| --- | --- | --- | --- |
| P1 | Guía de agentes: `CLAUDE.md` con `@AGENTS.md` (raíz, `qa/`, `tools/quality/`), symlinks de skills, subagentes en `.claude/agents/`, correcciones de `AGENTS.md` y docs. | Opus | Rutas y enlaces; `git diff --check`. |
| P2 | Formato con Prettier de todas las fuentes propias en un commit aislado, más `.git-blame-ignore-revs` y scripts de formato sin depender del shell. | Opus | Bundle JS idéntico; oráculo idéntico; suite completa. |
| P3 | Red de seguridad sin cambios de producción: fixture ID→título de los 274 ejercicios, tabla taller→núcleos y etapa, conjuntos de IDs del recorrido, restricciones de orden de `src/main.tsx`, caracterización del respaldo de `app.js` y del puente de campaña y Sistemas con el lab, e interpretación de la ejecución. | Sonnet | Checks nuevos en verde sobre el código actual. |
| P4 | Arnés de QA en TypeScript: `qa/lib`, lista única de checks, `tsconfig` de QA, retiro de `build:kits`, configuraciones en TS. | Sonnet | Mismos escenarios y conteos que la línea base. |
| P5 | `shared/lib` y conversión de las fuentes legacy a módulos ES que importan los helpers comunes. | Sonnet | Oráculo y suite. |
| P6 | Atlas a `pages/atlas` con las convenciones y pruebas de su modelo. | Sonnet | Suite, React Doctor y navegador. |
| P7 | Correcciones de integridad con TDD y almacén versionado común. | Sonnet + revisión Opus | Pruebas nuevas que fallan antes y pasan después. |
| P8 | Port a TS: runner, motores, efectos y kits; luego datos con IDs explícitos; luego `defineModel` y partición de los dominios de Sistemas. | Sonnet | Oráculo, auditoría de runtime y suite. |
| Después | Vistas a React (biblioteca, proyecto y método; Sistemas; campaña; laboratorio; recorrido; shell) y la sesión «Esenciales». | — | Un ADR por decisión de URL/estado; presupuesto del documento autónomo. |

## Riesgos

- **Tamaño del documento autónomo:** 1,99 MB frente al límite de 2,5 MB de `qa/build-check`.
  La sesión «Esenciales» necesita una decisión de presupuesto antes de empezar.
- **Orden de evaluación:** varios módulos leen globals al cargarse; cualquier adaptador nuevo
  ocupa la posición exacta del archivo que reemplaza.
- **IDs y formato del progreso:** son contrato del currículo y del progreso guardado.
- **Contratos de HTML entre vistas legacy:** el laboratorio inserta HTML de campaña,
  Sistemas y exploradores; se conservan hasta migrar la vista del laboratorio.
- **Interfaz sin pruebas automáticas:** cada cambio visible se revisa en el navegador.

## Estado

| Fase | Estado | Commits |
| --- | --- | --- |
| P1 | Hecha | `2ed5227` |
| P2 | Hecha: bundle JS idéntico y oráculo sin cambios | `7b7e957`, `58b093f` |
| P3/P4 | Hecha: 14 checks portados con salidas idénticas, 5 checks nuevos de red, configuraciones en TS, `build:kits` retirado | `16e98fb`, `f00fbc9`, `010a2e3` |
| P7b | Hecha: `versioned-storage` común a los cuatro almacenes, sin escrituras al cargar, respaldo `<clave>:respaldo`, descarte por registro, avisos acumulados, importación atómica y «Borrar todo» con respaldos; verificado en navegador | (este commit) |
| P8 (infraestructura) | Hecha: runner en `src/shared/api/playground` (paridad idéntica en 32 casos), editor en `src/shared/ui/code-editor`, celebración en `src/shared/lib`; adaptadores en `src/app/legacy` | (este commit) |
| P8 (kits) | Hecha: `src/features/download-project-kit/` con archivos puros, ZIP y adaptador; 300 kits y sus ZIP idénticos byte a byte al generador anterior | (este commit) |
| P7a | Hecha: regla única de evidencia (equivalencia probada en 19 casos), `interpretRun` puro, sincronización aislada del transporte (verificada en navegador) y fusión monótona al importar en el laboratorio | (este commit) |
| P6 | Hecha: Atlas en `src/pages/atlas` (un componente por archivo, modelo puro probado, foco con `flushSync`), entrada en `src/app/main.tsx`; «Principiante» pasa a «Inicial» como en el resto de la app | (este commit) |
| P5 | Hecha la parte pura: 10 fuentes legacy importan `src/shared` (escape ×4, normalización ×3, clon JSON ×7, objeto plano ×2, niveles ×3); oráculo idéntico y smoke test en navegador. Queda el escape de los exploradores, que cambia la salida con valores nulos | (este commit) |

Hallazgos de la caracterización que quedan para P7:

- `TallerSystems.missionIDs(workshopId, lang)` exige argumentos; sin ellos devuelve `[]`.
- `TallerCampaign.lockedExerciseHTML` usa el último estado sincronizado y no vuelve a
  sincronizar.
- La importación de `app.js` muta las notas locales antes de llamar a los `importState`;
  si uno lanzara a mitad, las notas ya quedarían pisadas.
