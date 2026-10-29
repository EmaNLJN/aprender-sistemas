# Implementation Plan: F14a · Las estadísticas del admin, los agregados y la operación

**Branch**: `028-f14-estadisticas-admin` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F14, en su parte a: FR-001 a FR-024, los transversales FR-038 a FR-063 sobre lo suyo, SC-001 a SC-003, SC-005 a SC-010 y la última oración de SC-004, y las historias 1, 2 y 6, más lo de F14a de las historias 5, 7 y 8. Decisiones, consultas y mediciones: [research.md](./research.md). Interfaces públicas: [contracts/usage-section.md](./contracts/usage-section.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). F14b está en [plan-f14b.md](./plan-f14b.md).

**Objetivo:** que quien administra vea en la administración, sin un solo dato de una cuenta, cuánto se usa el taller, cómo le va a cada ejercicio y si el sandbox alcanza, con las cifras de C5, su tabla al lado de cada gráfico y sin guardar nada.

**Arquitectura:**

- **Una tercera sección de `pages/admin`,** «Uso del taller», con tres vistas que piden su ruta de C5 al mostrarse: «Resumen», «Ejercicios» y «Ejecuciones».
- **Las piezas son del mismo slice y F14b las reutiliza:**
  - el período compartido, con un provider dentro de `AdminPage`;
  - un hook de pedidos que cancela, conserva y espera;
  - una tabla genérica;
  - el gráfico de barras.
- **uPlot vive detrás de un solo módulo,** `lib/plot.ts`. Las specs de Vitest lo reemplazan con `vi.mock`, y las E2E prueban el dibujo.

**Stack:** TypeScript y React 19.2.8, con lo instalado (Zustand 5.0.15 sólo para leer la sesión, React Hook Form 7.89.0 de F11a, Vitest 5.0.3 con jsdom 30.1.2, Testing Library, fishery 2.4.0 y Playwright 1.63.0), más **una dependencia nueva, `uplot` 1.6.32**, con permiso (T002).

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea, enteras. `tasks.md` tiene una línea por tarea (T001 a T028) y remite acá.
> - **La base.** La rama `f14a/base` sale de `master` con F12a y C5 integradas, y F14a llega a `master` en un solo PR, en T028. T001 lo comprueba.
> - **El código no corrió.** Este plan se escribió sin ejecutar nada: las firmas salen del plan enmendado de F12a (`plan/amend-a3-f8-f12a`, `02b5a957`), del código de F11a (`impl-f11a`, `a7b3c71d`) y del contrato de C5 (`spec/c5-estadisticas`, `933d9e06`). T001 compara las reales. Si una firma difiere, usá la de la base y avisá al coordinador.
> - **Sin comentarios en el código,** salvo la licencia de uPlot en `lib/plot.ts`.

## Summary

F14a trae la mitad de F14 que no muestra datos de una cuenta: el resumen del taller, los ejercicios con su detalle, la cola y las ejecuciones. El enfoque:

- **Seis unidades apiladas sobre `f14a/base`, con un solo merge a `master`:**
  - **U0:** la línea base y uPlot, con permiso;
  - **U1:** el modelo, el gráfico como datos y los pedidos;
  - **U2:** los hooks y las piezas de interfaz;
  - **U3:** las tres vistas, la sección y su cableado;
  - **U4:** las E2E;
  - **U5:** la documentación, el peso y el PR.
- **uPlot se evalúa en el arranque.** Lo exige el documento autónomo, y su módulo lee `devicePixelRatio` y `matchMedia` al cargarse. El arnés de `boot-check` y el setup de Vitest suman esos dos globals; ningún escenario cambia (research, R3).
- **Pruebas en tres capas** (FR-063): las opciones de uPlot en `node`, lo que recibe el módulo del gráfico en `dom`, y el dibujo en Playwright (research, R4).
- **El período vive en `AdminPage`,** porque F14b lo comparte con «Cuentas» (research, R6). **Los títulos del contenido llegan desde `app/`** con un provider, sin una tercera prop (research, R7).
- **Peso:** F14a suma como mucho +80 000 caracteres, unos 53 000 de uPlot (research, R11).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0; las versiones de arriba.

**Primary Dependencies**: las de F11a y F12a, más `uplot` 1.6.32 (MIT, sin dependencias, 545 468 bytes desempaquetados).

**Storage**: ninguno. Las cifras viven en el estado de cada vista; el período, en el de la página; nada sale de la memoria (FR-038).

**Testing**:

- **Vitest,** en los dos proyectos de `frontend/vitest.config.ts`: `node` para `*.spec.ts` y `dom` para `*.spec.tsx`, con el setup `frontend/src/vitest.setup.ts`.
- **Playwright,** con un Page Object nuevo, `UsagePage`, sobre el doble de la API de F11a, con `sessionAccount: ADMIN`.

Los valores esperados salen del contrato de C5, de los textos de su `lang/es/` (citados en research), de la spec o del contenido congelado (`qa/fixtures/curriculum-ids.json`), nunca del código que se prueba ni de una factory.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy); pantallas nuevas.

**Performance Goals**: ninguna de velocidad. SC-008 es una medición (T026) y el peso tiene una condición de corte (T002, T023 y T028).

**Scale/Scope**:

- **Lo nuevo:**
  - unos 35 archivos de producción en `frontend/src/pages/admin/`;
  - 13 specs de Vitest y 1 ayuda de specs;
  - 4 E2E, con un Page Object y sus datos.
- **Lo que cambia:**
  - de F12a: `AdminPage.tsx`, `types.ts`, `index.ts`, `admin.css`, `admin-endpoints.ts` (un `export`) y el contenedor que monta la página;
  - `package.json`, `package-lock.json` y `frontend/THIRD-PARTY-NOTICES.txt`;
  - `qa/lib/boot-harness.ts`, `qa/build-check.ts` (una aserción) y `frontend/src/vitest.setup.ts`;
  - `qa/e2e/fixtures/index.ts`, `docs/architecture.md` y `qa/AGENTS.md`.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec, de la constitución y de las decisiones del coordinador.

- **La red, sin editar** (FR-061, SC-007):
  - los E2E de `qa/e2e/specs/` que existen en la base: los de F1, A2, F4, F11a, F12a y los de cualquier ítem que haya entrado antes (la cuenta es la de T001, no un número de este plan);
  - los escenarios de `boot-check`, `dist-content-check` y `load-order-check`;
  - las specs de Vitest de F12a, también `admin-page.spec.tsx`, que monta la página sin mocks y pasa a cargar uPlot.
- **Lo que sí cambia en QA,** sin editar escenarios:
  - `qa/lib/boot-harness.ts` suma `devicePixelRatio` y `matchMedia` (T008);
  - `qa/build-check.ts` suma una aserción, la de la licencia de uPlot (T023);
  - `qa/e2e/fixtures/index.ts` suma el fixture `usage`;
  - `qa/e2e/pages/usage.ts`, `qa/e2e/lib/usage-contract.ts` y cuatro E2E, `qa/e2e/specs/admin-usage-*.spec.ts`, son nuevos;
  - `qa/e2e/fixtures/api-double.ts` y `qa/e2e/pages/admin.ts` no cambian.
- **Una sola dependencia nueva,** `uplot` 1.6.32 exacta, con permiso del usuario. Ningún store compartido nuevo ni nuqs (FR-056).
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` en el código de F14a. La excepción son los estilos que uPlot escribe con el CSSOM sobre sus propios nodos y su hoja `uPlot.min.css` (FR-055). Las reglas nuevas van al final de `frontend/src/pages/admin/ui/admin.css`.
- **La privacidad** (FR-038 a FR-043):
  - nada en `localStorage`, `sessionStorage`, una cookie, la URL, el historial, un store o la consola;
  - toda tasa con su numerador y su `n`, y «Muestra chica» sin barra con una muestra menor que 5;
  - ninguna distribución con menos de 5 respuestas;
  - lo resuelto siempre separado en «en el servidor» e «importado»;
  - ningún texto «verificado»;
  - ninguna exportación ni vista para imprimir.
- **Los pedidos** (FR-044): uno al mostrarse cada vista y uno por cambio de parámetros, cancelado al dejarla, sin prefetch ni refresco automático. El primero del resumen y de los ejercicios sale sin `from` ni `to`.
- **Los textos:** los de la spec («Textos que lee quien administra»), tal cual. Los del servidor se muestran como llegan, y los que agrega el plan están en research.md («Textos que agrega el plan»).
- **El peso** (FR-057):
  - `dist/index.html` queda bajo `BOOT_SIZE_LIMIT` de `qa/build-check.ts`, 1 500 000 caracteres;
  - F14a suma como mucho +80 000 sobre la línea base de T001. F14 entera, +95 000;
  - si uPlot solo pasa de 60 000 (T002) o F14a de 80 000 (T023 y T028), la tarea se detiene y decide el usuario.
- **La complejidad:** ninguna función nueva pasa de 10, y los avisos de `npm run lint` no suben respecto de T001.
- **La accesibilidad** (FR-052 a FR-055):
  - todo con el teclado;
  - cada tabla con título y encabezados de columna y de fila;
  - los gráficos con su tabla y su resumen en texto, el canvas bajo un nodo `aria-hidden` y la leyenda en el HTML;
  - desde 320 px, ningún desplazamiento horizontal de la página: una tabla o un gráfico que no entra se desplaza en su región, con nombre y `tabIndex={0}`;
  - los campos miden 16 px;
  - nada se anima.
- **Las fechas** (L9): las del período (`from`, `to` y `start`) se muestran como llegan, sin `new Date`; los instantes, con `formatLocalDateTime` de F11a, en la zona del navegador.
- **F12a no cambia más que lo listado:**
  - las dos props de `AdminPage`, el contenedor, su entrada en «Tu cuenta», el método de apertura del Page Object, las acciones, `ACTION_SLOTS` y la tabla de «Cuentas» quedan igual;
  - `specs/023-f12-administracion/` no se edita (research, R10).
- **El backend:** no cambia.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra tres decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, FSD (todo en `pages/admin`, que no importa otra página ni `app/`), `interface` para las formas, un componente o hook por archivo con `export default`, exports nombrados en los contextos con provider y hook, estado local, ni Zustand nuevo ni nuqs |
| II. TDD y pruebas útiles | Sí | Cada par abre con su spec en rojo contra stubs que lanzan `not implemented`. Los esperados salen del contrato de C5, de los textos de la spec y del contenido congelado, escritos a mano. fishery arma sólo las entradas |
| III. Código entendible | Sí | Una tabla genérica en lugar de diez copias; un hook de pedidos con un solo contrato; un único módulo que conoce uPlot; ninguna función pasa de 10 |
| IV. Contenido en Git, IDs estables | Sí | No toca `content/`, el progreso ni las URL. Los títulos se leen del contenido cargado, por id |
| V. Capas y contratos explícitos | Sí | El modelo, la API, los hooks y la interfaz en sus segmentos; el contrato en `contracts/usage-section.md`; uPlot detrás de `lib/plot.ts`; los títulos llegan de `app/` por un provider |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de la spec; teclado, 320 px, movimiento reducido y lector de pantalla con E2E; comandos portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva. La licencia de uPlot se copia del paquete instalado |
| VIII. Flow-forward | Sí | `tasks.md` con una línea por tarea. La extensión del contrato de F12a vive en `specs/028`, no en `specs/023` (research, R10) |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1-A:** la columna «Uso» en «Cuentas», antes de «Acciones» | F14a no toca la tabla de «Cuentas»: la columna es de F14b | plan-f14b.md |
| **Q2-B:** uPlot 1.6.32 para las series, `<meter>` para las proporciones | Permiso e instalación en T002; `lib/plot.ts`; las pruebas por capas; el peso | T002, T007, T008, T014 a T017, T023 y T026 |
| **Q3-A:** toda tasa con su `n`; «Muestra chica» con `n` menor que 5; ninguna distribución con menos de 5 respuestas | `rateView`, `showsDistribution`, `RateCell` y `Distribution` | T005, T006, T014, T015, T018 y T019 |
| **Q4-A:** F14 no espera a A4 ni a D1c | Los estados vacíos que explican (FR-010) y la revisión manual con datos armados, antes del PR | T016, T017 y T028 |
| **P1-A:** F14a y F14b | Este plan cubre F14a. «Alumnos», el detalle de una cuenta y la columna «Uso» son de F14b | Todo el plan |
| **Coordinador, por Q2-B:** +95 000 caracteres en total, permiso con nombre, versión, origen, peso y licencia, ningún estilo en línea propio, las pruebas por capas | F14a +80 000 y F14b +15 000; el aviso de terceros; FR-055 | T002, T023 y T028 |

## Project Structure

### Documentation (this feature)

```text
specs/028-f14-estadisticas-admin/
├── spec.md                       # F14 entera, con su clarify
├── research.md                   # decisiones, consultas y mediciones de F14a
├── plan.md                       # este archivo (F14a)
├── quickstart.md                 # cómo se verifica F14a
├── tasks.md                      # T001 a T028
├── research-f14b.md, plan-f14b.md, quickstart-f14b.md, tasks-f14b.md   # F14b, T029 a T041
├── contracts/usage-section.md    # las interfaces de las dos partes; extiende el contrato de F12a
└── checklists/requirements.md
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
package.json, package-lock.json                       # cambian (K, T002): uplot 1.6.32
frontend/THIRD-PARTY-NOTICES.txt                      # cambia (K, T002): el bloque de uPlot
frontend/src/vitest.setup.ts                          # cambia (C, T008): matchMedia para jsdom
frontend/src/app/account/AdminDialog.tsx              # cambia (K, T024): ContentTitlesProvider (o app/routes/page-entries.tsx con F10b)
frontend/src/pages/admin/
├── index.ts                                          # cambia (P, T023): la API pública suma los títulos
├── model/
│   ├── types.ts                                      # cambia (P, T023): AdminSection suma 'usage'
│   ├── usage-types.ts                                # nuevo (M): las formas de C5
│   ├── json-reader.ts, parse-usage.ts (+ .spec.ts)   # nuevos (M)
│   ├── period.ts, usage-format.ts, usage-labels.ts, exercise-order.ts, curriculum-filters.ts,
│   │   stats-failure.ts, content-titles.ts (+ .spec.ts salvo usage-labels)   # nuevos (M)
│   ├── usage.factory.ts                              # nuevo (M): fishery, con las formas de C5
│   ├── bar-chart.ts (+ .spec.ts)                     # nuevo (C)
│   └── overview-series.ts (+ .spec.ts)               # nuevo (V1)
├── api/
│   ├── admin-endpoints.ts                            # cambia (A): exporta decode
│   └── usage-endpoints.ts (+ .spec.ts)               # nuevo (A)
├── lib/
│   ├── bar-plot-options.ts (+ .spec.ts), plot.ts     # nuevos (C)
│   └── use-stats-request.ts, use-runs-pages.ts       # nuevos (H)
└── ui/
    ├── usage-fetch.ts                                # nuevo (H): la ayuda de las specs de la sección
    ├── period-context.tsx, content-titles-context.tsx, usage-hooks.spec.tsx   # nuevos (H)
    ├── StatsTable.tsx, Figures.tsx, RateCell.tsx, Distribution.tsx, StatsFailure.tsx,
    │   RequestState.tsx, AggregateNotes.tsx, DateField.tsx, PeriodForm.tsx, SeriesChart.tsx,
    │   usage-pieces.spec.tsx                         # nuevos (H)
    ├── OverviewView.tsx, OverviewReport.tsx, overview-view.spec.tsx   # nuevos (V1)
    ├── ExercisesView.tsx, CurriculumReport.tsx, ExerciseDetail.tsx, curriculum-columns.tsx,
    │   exercises-view.spec.tsx                       # nuevos (V2)
    ├── RunsView.tsx, QueuePanel.tsx, RunFiltersForm.tsx, RunsList.tsx, runs-view.spec.tsx       # nuevos (V3)
    ├── UsageSection.tsx, usage-section.spec.tsx      # nuevos (P)
    ├── AdminPage.tsx                                 # cambia (P): la tercera sección y PeriodProvider
    └── admin.css                                     # cambia (P): las reglas de la sección
qa/lib/boot-harness.ts                                # cambia (C, T008): devicePixelRatio y matchMedia
qa/build-check.ts                                     # cambia (P, T023): la licencia de uPlot en el HTML
qa/e2e/
├── fixtures/index.ts                                 # cambia (E): el fixture usage
├── lib/usage-contract.ts                             # nuevo (E)
├── pages/usage.ts                                    # nuevo (E)
└── specs/admin-usage-overview, admin-usage-exercises, admin-usage-runs y admin-usage-layout (.spec.ts)   # nuevos (E)
docs/architecture.md, qa/AGENTS.md                    # cambian (K, T027)
```

**Structure Decision:** todo vive en `pages/admin`, la misma página de F12a, porque dos páginas no se importan y la sección es parte de esta (spec, «Dónde vive»). Dentro del slice se importa por ruta directa. Las ayudas de specs (`model/usage.factory.ts`, `ui/usage-fetch.ts` y las de F12a, `ui/render-admin.tsx` y `shared/api/http/fake-fetch.ts`) se importan sólo desde specs. `lib/plot.ts` es el único archivo del repositorio que importa `uplot` en tiempo de ejecución.

## Review Focus

Lo que el revisor mira primero:

- **uPlot detrás de un módulo.** `git grep -n "from 'uplot'" -- frontend/src` imprime `lib/plot.ts` y, como `import type`, `lib/bar-plot-options.ts` y su spec. Ningún componente crea un gráfico por su cuenta.
- **La privacidad.** Ninguna cifra sale de la memoria, ninguna distribución se dibuja con menos de 5 respuestas, ninguna tasa sin su `n` y nada se suma sin desglose.
- **Los pedidos.** Cada vista pide al mostrarse y cancela al irse, sin intervalos ni temporizadores salvo la cuenta de `Retry-After`.
- **La red.** El diff de `qa/e2e/specs/` toca sólo archivos `admin-usage-*.spec.ts` nuevos. `boot-check`, `dist-content-check`, `load-order-check` y las specs de F12a no cambian. Cada falla esperada se declara con `/status of NNN/`.
- **El peso, los estilos y la licencia.** La medida contra T001, ningún `style=` propio y la licencia de uPlot en el HTML y en los avisos.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **uPlot se evalúa en el navegador falso de `boot-check`.** `setPxRatio()` corre al importar el módulo y lee `devicePixelRatio` y `matchMedia`, que `qa/lib/boot-harness.ts` no tiene. Sin T008, `boot-check` y `dist-content-check` caen en cuanto uPlot entra al bundle. Lo fija la compuerta de T023: corre `node qa/boot-check.ts` y `node qa/dist-content-check.ts` con uPlot en el bundle, y antes comprueba que fallan sin las dos líneas de T008, con un `git stash` del arnés.
2. **La spec de F12a que monta la página sin mocks carga uPlot en jsdom,** que no tiene `matchMedia`. La fija `admin-page.spec.tsx` de F12a, sin editarla: T023 la corre en verde con la sección importada, y sin el stub de `vitest.setup.ts` falla al importar.
3. **La respuesta de una vista que se dejó no se dibuja.** Cambiar de vista con un pedido en curso lo cancela, y si la respuesta llega igual no se pinta. La fija «cancels the request of the view it leaves and draws nothing from it» en `usage-section.spec.tsx` (T022), con una respuesta que llega después del cambio.
4. **Las fechas del período no se convierten** (L9). En la zona de las E2E (UTC-3), `new Date('2026-10-01')` da el 30 de septiembre. La fija «fills the period from the answer and shows its dates as they came» en `admin-usage-overview.spec.ts` (T026), que espera «Del 1/10/2026 al 7/10/2026, por día, en la hora de Buenos Aires.» y `2026-10-01` en «Desde».
5. **El 503 `stats_timeout` no deja reintentar antes de tiempo ni pierde el período** (FR-050). La fija «waits the Retry-After of a stats timeout and keeps the period» en `admin-usage-overview.spec.ts` (T026), con `page.clock`: «Reintentar» deshabilitado, habilitado después de 30 s, y las fechas aplicadas siguen en el formulario.

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree sobre `f14a/base` y entrega una rama.

- **Delegables al subagente `implementador`:** M, C, A, H, V1, V2, V3, P y E (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, el contrato, los valores exactos y los checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal:
  - hace U0, el cableado de `app/`, la documentación, las compuertas y el PR;
  - pide los permisos al usuario;
  - revisa cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 y, con el permiso del usuario, T002 |
| 1 | M, C, A y E a la vez | **M:** T003 a T006. **C:** T007 y T008 (después de T002). **A:** T009 y T010. **E:** T025 |
| 1b | K | T011, la compuerta de U1 |
| 2 | H | T012 a T015 |
| 2b | K | La compuerta de U2 |
| 3 | V1, V2, V3 y E a la vez, desde S2 | **V1:** T016 y T017. **V2:** T018 y T019. **V3:** T020 y T021. **E:** T026, en rojo |
| 4 | P, desde S3 | T022 y T023 |
| 5 | K | T024, el cableado de los títulos y la compuerta de U3 |
| 6 | K | T027 y T028 |

**Puntos de sincronización:**

- **S1:** K cerró T011. H usa el modelo, la API y el gráfico como datos.
- **S2:** H entregó T015. Las vistas usan los hooks y las piezas.
- **S3:** V1, V2 y V3 entregaron. P arma la sección.
- **S4:** cada compuerta (T011, la de U2 al cerrar T015, T024 y T028) integra su unidad en `f14a/base`.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173` y E `4195`.

**La integración:**

- Cada unidad es un PR contra `f14a/base`, que se revierte solo.
- El PR final de `f14a/base` a `master` lo abre K en T028.
- **Si la base no tiene F12a,** F14a no empieza: T001 lo comprueba.
- **Si C5 no está en `master`,** F14a se implementa igual (sus pruebas usan el doble), pero T028 no abre el PR a `master` hasta que C5 entre (spec, «Dependencias reales»).

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (las historias de F14a, FR-001 a FR-024 y FR-038 a FR-063), research.md, el contrato y tu tarea;
  - el contrato de F12a (`specs/023-f12-administracion/contracts/admin-page.md`) y el de F11a (`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`);
  - las skills `tdd`, `clean-code`, `vitest`, `react-testing` y las de Vercel;
  - si escribís E2E, `playwright-best-practices`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import. El stub va como `const` tipado y sin parámetros, porque el prefijo `_` no silencia `no-unused-vars` en este repositorio (TR-2):
    - una función: `export const checkPeriod: (from: string, to: string) => PeriodProblem | null = () => { throw new Error('not implemented'); };`;
    - un componente: `const OverviewView: FunctionComponent<OverviewViewProps> = () => { throw new Error('not implemented'); };`, con `export default OverviewView;` al final;
    - un hook: `const useStatsRequest: <T>(load: StatsLoader<T>, ownId: number) => StatsRequest<T> = () => { throw new Error('not implemented'); };`, con su `export default`.

    La tarea verde reemplaza el stub por la declaración que escribe este plan.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Los valores esperados salen del contrato de C5, de la spec, de los textos de `lang/es/` de C5 citados en research o del contenido congelado, nunca del módulo que se prueba ni de una factory.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Imports:**
  - dentro de `pages/admin`, por ruta directa;
  - otro slice, por su `index.ts` (`entities/session` y `entities/guide`);
  - `shared/lib/*`, `shared/ui/form` y `shared/api/http`, como los deja F11a;
  - las ayudas de specs, por ruta directa y sólo desde specs.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>`, `npm run typecheck` y `npm run lint`;
  - `npx prettier --write <tus archivos>` antes de cada commit y, después, `npm run format:check`;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Sólo T002 instala, con el permiso del usuario.
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; la interfaz en español rioplatense, con el texto exacto de la spec o de research.
  - **Sin comentarios.** Este plan no escribe ninguno, salvo la licencia de `lib/plot.ts`.
  - `interface` para las formas de objetos; `type` sólo para uniones.
  - Un componente o un hook por archivo, declarado como `const` con nombre, con `export default` al final. Las funciones, las constantes y los contextos con su provider y su hook van con exports nombrados.
  - Ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText`.
  - `useStore` siempre con selector.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `feat(front): …` para lo nuevo;
  - `build: …` para la dependencia;
  - `docs: …` para la documentación.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## Ramas: lo que T001 detecta en la base

T001 corre cada detección sobre `f14a/base`, anota el resultado en research.md («Línea base de la implementación») y aplica la rama que toca. Ninguna cambia el número ni el orden de las tareas.

| Rama | Cómo se detecta | Sin la rama | Con la rama |
| --- | --- | --- | --- |
| **B1.** F12a integrada | `ls frontend/src/pages/admin/index.ts frontend/src/pages/admin/ui/AdminPage.tsx frontend/src/pages/admin/lib/use-paged-list.ts frontend/src/pages/admin/lib/recover-session.ts frontend/src/pages/admin/ui/FailureNotice.tsx frontend/src/pages/admin/ui/FilterSelect.tsx qa/e2e/pages/admin.ts` | Falta algo: F14a no empieza | Sigue |
| **B2.** Las firmas de F12a | `git grep -n "export function reactionTo\|export function recoverSession\|export type AdminOutcome\|const SECTIONS" -- frontend/src/pages/admin` y `git grep -n "function decode" -- frontend/src/pages/admin/api/admin-endpoints.ts` | — | Si una difiere del plan de F12a, se anota y las tareas usan la de la base |
| **B3.** Quién monta `AdminPage` | `git grep -n "<AdminPage" -- frontend/src/app` | `app/account/AdminDialog.tsx` (F12a): T024 envuelve ahí | `app/routes/page-entries.tsx` (F10b, U6): T024 envuelve la entrada `administracion` |
| **B4.** F12b en la base | `git grep -n "mailAvailable" -- frontend/src/pages/admin` | Nada | Nada: F14a no toca «Cuentas» |
| **B5.** El tope del HTML | `grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts` | — | 1 500 000. Si dice otra cosa, se anota y se pregunta |
| **B6.** `formatLocalDateTime` y `formatWait` | `ls frontend/src/shared/lib/format-local-date-time.ts frontend/src/shared/lib/format-wait.ts` | Falta alguno: F14a no empieza (F11a incompleta) | Sigue |
| **B7.** El doble de la API | `git grep -n "search: url.search" -- qa/e2e/fixtures/api-double.ts` | Falta: F14a no empieza | Sigue |
| **B8.** El nivel `essentials` de E1 | `git grep -n "essentials" -- frontend/src/shared/config/levels.ts` | Los niveles son cuatro | El filtro «Nivel» lo muestra sin cambiar código (lee `LEVEL_IDS`) |

## 0. U0 · La base y uPlot (coordinador K, onda 0)

**Cubre:** FR-056, FR-057 (la medida inicial) y FR-061 (la red de partida).

### Tarea 0.1 · La línea base (T001)

1. **La rama.** `f14a/base` sale de `master` con F12a integrada (B1). Corré las ramas B1 a B8 y anotá el resultado.
2. **Los valores de la base,** en un worktree limpio, con `npm ci --offline`:
   - `npm run build`, y el tamaño: `node -e 'console.log(require("node:fs").readFileSync("dist/index.html","utf8").length)'`;
   - `npm test`, con la cuenta de checks y de pruebas de Vitest;
   - `npm run lint 2>&1 | grep -c complexity`, los avisos de complejidad;
   - `E2E_PORT=4173 npm run test:e2e`, con la cuenta de E2E, todos en verde;
   - `node qa/boot-check.ts | grep -c '^PASS'` y `node qa/dist-content-check.ts`, en verde.
3. **Las firmas reales** de F12a y de F11a que usa el plan: `reactionTo`, `recoverSession`, `FailureNotice`, `FilterSelect`, `ListView`, `usePagedList`, `parsePage`, `parseAdminUser`, `AdminOutcome`, `ListPage`, `render-admin.tsx` (`renderAdmin`, `renderWithFetch`, `signInAs`, `stubDialogs` y `OLGA`), `formatLocalDateTime`, `formatWait`, `describeFailure`, `showFailure`, `messagesOf`, `ServerError`, `useRetryCountdown`, `createFakeFetch` y el Page Object `AdminPage`. Anotá cada diferencia con el plan.
4. **El commit:** `docs(specs): F14a registra la línea base de la implementación`, con la sección «Línea base de la implementación» de research.md.

### Tarea 0.2 · uPlot, con permiso (T002)

**Archivos:** `package.json`, `package-lock.json` y `frontend/THIRD-PARTY-NOTICES.txt`.

1. **Pedile permiso al usuario** con este texto, y esperá un «sí» explícito:

   > Para dibujar las series de F14 (Q2-B) hace falta instalar **`uplot` 1.6.32**, desde el registro de npm (`https://registry.npmjs.org/uplot/-/uplot-1.6.32.tgz`): **545 468 bytes** desempaquetados, licencia **MIT**, sin dependencias. Es la única dependencia de runtime nueva de F14. ¿La instalo?

2. **Con el permiso:** `npm install --save-exact uplot@1.6.32`. Comprobá:
   - `npm ls uplot` imprime `uplot@1.6.32`;
   - `package.json` tiene `"uplot": "1.6.32"` en `dependencies`, en orden alfabético;
   - `git diff --stat` toca sólo `package.json` y `package-lock.json`.
3. **El tamaño de uPlot en el bundle,** antes de usarlo:

   ```sh
   npx esbuild node_modules/uplot/dist/uPlot.esm.js --bundle --minify --format=esm --log-level=error | wc -c
   wc -c < node_modules/uplot/dist/uPlot.min.css
   ```

   Anotá la suma en research.md. **Si pasa de 60 000, parás y le preguntás al usuario** (FR-057).
4. **El aviso de terceros.** Al final de `frontend/THIRD-PARTY-NOTICES.txt`, dos líneas en blanco, el encabezado y el texto exacto de la licencia instalada:

   ```sh
   { printf '\n\nuPlot — https://github.com/leeoniya/uPlot\n'; cat node_modules/uplot/LICENSE; } >> frontend/THIRD-PARTY-NOTICES.txt
   ```

   `git diff frontend/THIRD-PARTY-NOTICES.txt` muestra sólo líneas agregadas al final.
5. **Correr** `npm run build`: el tamaño no cambia, porque nadie importa uPlot todavía. Después, `node qa/build-check.ts`, que compara la copia de `dist/` con la del front.
6. **El commit:** `build: suma uplot 1.6.32 para las series de F14, con su aviso de licencia`.

**Reversión de U0:** se revierte T002. T001 es sólo documentación.

## 1. U1 · El modelo, el gráfico como datos y los pedidos (onda 1: M, C, A y E; onda 1b: K)

**Cubre:** FR-004 a FR-010 (las reglas), FR-014, FR-017, FR-020, FR-040 a FR-042, FR-045 a FR-048 (los datos y las opciones), FR-050 (el 503), FR-055, FR-056 y FR-063 (las capas `node`).

**Dueños:** M (T003 a T006), C (T007 y T008, después de T002) y A (T009 y T010), a la vez. E arranca T025 en la misma onda.

### Tarea 1.1 · Las formas de C5 y su lectura, en rojo (T003, M)

**Archivos:** en `frontend/src/pages/admin/model/`, `usage-types.ts` (entero), `usage.factory.ts` (entero), el stub de `parse-usage.ts` y `parse-usage.spec.ts`.

**Consume:** de F12a, `AccountStatus` (`model/types.ts`); de F11a, `AccountRole` (`entities/session`); de `master`, `LevelId` (`shared/config/levels`). **Produce:** los tipos del contrato, que usan T004 a T023.

1. **`usage-types.ts`,** entero: es el bloque `model/usage-types.ts` de [contracts/usage-section.md](./contracts/usage-section.md), tal cual, con un tipo o una interfaz por línea lógica y formateado con Prettier.
2. **`usage.factory.ts`.** Los cuerpos tienen la forma del contrato de C5, en ceros:

   ```ts
   import { Factory } from 'fishery';

   export interface OutcomeBody {
     passed: number;
     failed: number;
     compileError: number;
     runtimeError: number;
     timeout: number;
   }

   export interface OperationBody {
     infraError: number;
     canceled: number;
   }

   export interface SplitBody {
     server: number;
     imported: number;
   }

   export interface IntervalBody {
     attempts: OutcomeBody;
     operations: OperationBody;
     importedAttempts: number;
     firstSolves: SplitBody;
     newStudents: number;
     imports: number;
     studentsWhoRan: number;
   }

   export interface PointBody extends IntervalBody {
     start: string;
   }

   export interface PeriodBody {
     from: string;
     to: string;
     granularity: 'day' | 'week' | 'month';
     timezone: string;
   }

   export interface StatsBody<T> {
     data: T;
     meta: { generatedAt: string; period: PeriodBody };
   }

   export interface AccountCountBody {
     role: string;
     status: string;
     count: number;
   }

   export interface OverviewBody {
     accounts: AccountCountBody[];
     activeStudents: { lastDay: number; lastWeek: number; lastMonth: number; never: number };
     invitations: { pending: number; expired: number; pendingAdmin: number };
     resetStudents: number;
     totals: IntervalBody;
     series: PointBody[];
   }

   export interface SpreadBody {
     answered: number;
     options: { option: number; students: number }[];
   }

   export interface PredictionBody extends SpreadBody {
     correct: number;
   }

   export interface CheckpointBody extends SpreadBody {
     passed: number;
   }

   export interface QuizBody extends SpreadBody {
     stepId: string;
   }

   export interface CatalogBody {
     catalog: string;
     language: string;
     level: string | null;
     activeExercises: number;
     studentsStarted: number;
     studentsSolved: number;
     solvedMedian: number | null;
   }

   export interface ExerciseBody {
     exerciseId: string;
     catalog: string;
     language: string;
     level: string | null;
     retired: boolean;
     studentsStarted: number;
     solved: SplitBody;
     attempts: OutcomeBody;
     operations: OperationBody;
     importedAttempts: number;
     attemptsMedian: { solved: number | null; unsolved: number | null };
     help: {
       assisted: number;
       solutionSeen: number;
       hintsRevealed: { hints: number; students: number }[];
     };
     prediction: PredictionBody;
     confidence: { again: number; practice: number; confident: number };
     tests: { testKey: string; verdicts: number; fail: number; missing: number }[];
   }

   export interface WorldBody {
     worldId: string;
     language: string;
     level: string | null;
     retired: boolean;
     exercises: number;
     solvedRows: number;
     studentsWithSeals: number;
     checkpoint: CheckpointBody;
   }

   export interface WorkshopBody {
     workshopId: string;
     language: string;
     level: string | null;
     retired: boolean;
     studentsStarted: number;
     codeSealed: number;
     prediction: PredictionBody;
     stepsMarkedMedian: number | null;
     objectivesObservedMedian: number | null;
   }

   export interface CurriculumBody {
     catalogs: CatalogBody[];
     exercises: ExerciseBody[];
     worlds: WorldBody[];
     workshops: WorkshopBody[];
     route: { marks: { kind: string; itemKey: string; students: number }[]; quiz: QuizBody[] };
   }

   export interface QueueBody {
     data: {
       now: {
         queued: number;
         running: number;
         oldestQueuedSeconds: number | null;
         maxWaiting: number;
         slots: number;
       };
       lastDay: {
         finished: number;
         waitMs: { p50: number | null; p95: number | null };
         durationMs: { p50: number | null; p95: number | null };
         infraErrors: { reason: string; runs: number }[];
       };
     };
     meta: { generatedAt: string };
   }

   export interface RunBody {
     id: string;
     account: { id: number; name: string };
     exerciseId: string;
     language: string;
     status: string;
     reason: string | null;
     executorPhase: string | null;
     exitCode: number | null;
     truncated: boolean | null;
     compileMs: number | null;
     runMs: number | null;
     createdAt: string;
     startedAt: string | null;
     finishedAt: string | null;
     cancelRequested: boolean;
   }

   export interface RunsBody {
     data: RunBody[];
     meta: { nextCursor: string | null; retentionDays: number };
   }

   const NO_OUTCOMES: OutcomeBody = {
     passed: 0,
     failed: 0,
     compileError: 0,
     runtimeError: 0,
     timeout: 0,
   };
   const ROLES = ['admin', 'student'];
   const STATUSES = ['active', 'disabled', 'deleting'];

   export const intervalFactory = Factory.define<IntervalBody>(() => ({
     attempts: { ...NO_OUTCOMES },
     operations: { infraError: 0, canceled: 0 },
     importedAttempts: 0,
     firstSolves: { server: 0, imported: 0 },
     newStudents: 0,
     imports: 0,
     studentsWhoRan: 0,
   }));

   export const pointFactory = Factory.define<PointBody>(() => ({
     start: '2026-10-01',
     ...intervalFactory.build(),
   }));

   export const periodFactory = Factory.define<PeriodBody>(() => ({
     from: '2026-10-01',
     to: '2026-10-07',
     granularity: 'day',
     timezone: 'America/Argentina/Buenos_Aires',
   }));

   export const overviewFactory = Factory.define<OverviewBody>(() => ({
     accounts: ROLES.flatMap((role) => STATUSES.map((status) => ({ role, status, count: 0 }))),
     activeStudents: { lastDay: 0, lastWeek: 0, lastMonth: 0, never: 0 },
     invitations: { pending: 0, expired: 0, pendingAdmin: 0 },
     resetStudents: 0,
     totals: intervalFactory.build(),
     series: [],
   }));

   export const exerciseFactory = Factory.define<ExerciseBody>(() => ({
     exerciseId: 'rust-01',
     catalog: 'lab',
     language: 'rust',
     level: null,
     retired: false,
     studentsStarted: 0,
     solved: { server: 0, imported: 0 },
     attempts: { ...NO_OUTCOMES },
     operations: { infraError: 0, canceled: 0 },
     importedAttempts: 0,
     attemptsMedian: { solved: null, unsolved: null },
     help: { assisted: 0, solutionSeen: 0, hintsRevealed: [] },
     prediction: { answered: 0, correct: 0, options: [] },
     confidence: { again: 0, practice: 0, confident: 0 },
     tests: [],
   }));

   export const catalogFactory = Factory.define<CatalogBody>(() => ({
     catalog: 'lab',
     language: 'rust',
     level: null,
     activeExercises: 0,
     studentsStarted: 0,
     studentsSolved: 0,
     solvedMedian: null,
   }));

   export const worldFactory = Factory.define<WorldBody>(() => ({
     worldId: 'rust-world-1',
     language: 'rust',
     level: 'beginner',
     retired: false,
     exercises: 0,
     solvedRows: 0,
     studentsWithSeals: 0,
     checkpoint: { answered: 0, passed: 0, options: [] },
   }));

   export const workshopFactory = Factory.define<WorkshopBody>(() => ({
     workshopId: 'cache',
     language: 'rust',
     level: null,
     retired: false,
     studentsStarted: 0,
     codeSealed: 0,
     prediction: { answered: 0, correct: 0, options: [] },
     stepsMarkedMedian: null,
     objectivesObservedMedian: null,
   }));

   export const curriculumFactory = Factory.define<CurriculumBody>(() => ({
     catalogs: [],
     exercises: [],
     worlds: [],
     workshops: [],
     route: { marks: [], quiz: [] },
   }));

   export const queueFactory = Factory.define<QueueBody>(() => ({
     data: {
       now: { queued: 0, running: 0, oldestQueuedSeconds: null, maxWaiting: 32, slots: 4 },
       lastDay: {
         finished: 0,
         waitMs: { p50: null, p95: null },
         durationMs: { p50: null, p95: null },
         infraErrors: [],
       },
     },
     meta: { generatedAt: '2026-10-07T15:00:00.000Z' },
   }));

   export const runFactory = Factory.define<RunBody>(() => ({
     id: '019a0000-0000-7000-8000-000000000001',
     account: { id: 5, name: 'Caro Díaz' },
     exerciseId: 'rust-01',
     language: 'rust',
     status: 'passed',
     reason: null,
     executorPhase: 'run',
     exitCode: 0,
     truncated: false,
     compileMs: 1200,
     runMs: 300,
     createdAt: '2026-10-07T14:00:00.000Z',
     startedAt: '2026-10-07T14:00:01.500Z',
     finishedAt: '2026-10-07T14:00:03.000Z',
     cancelRequested: false,
   }));

   export function statsBody<T>(data: T, period: Partial<PeriodBody> = {}): StatsBody<T> {
     return {
       data,
       meta: { generatedAt: '2026-10-07T15:00:00.000Z', period: periodFactory.build(period) },
     };
   }

   export function runsBody(runs: RunBody[], nextCursor: string | null = null): RunsBody {
     return { data: runs, meta: { nextCursor, retentionDays: 14 } };
   }
   ```

3. **El stub de `parse-usage.ts`:** `RUN_STATUSES` con su valor final (la lista de B2 en el orden de `RunStatus`) y las cuatro funciones como `const` tipados que lanzan `not implemented`.
4. **`parse-usage.spec.ts`.** Cubre SC-001 en la lectura y el borde de lo que la API manda:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { parseCurriculumStats, parseOverview, parseQueue, parseRunsPage } from './parse-usage';
   import {
     curriculumFactory,
     exerciseFactory,
     intervalFactory,
     overviewFactory,
     pointFactory,
     queueFactory,
     runFactory,
     runsBody,
     statsBody,
     workshopFactory,
     worldFactory,
   } from './usage.factory';

   const META = statsBody(null).meta;

   describe('the overview', () => {
     it('reads the account rows, the totals, the series and the period as they came', () => {
       const overview = parseOverview(
         statsBody(
           overviewFactory.build({
             resetStudents: 1,
             totals: intervalFactory.build({
               firstSolves: { server: 3, imported: 1 },
               studentsWhoRan: 4,
             }),
             series: [
               pointFactory.build({ start: '2026-10-01' }),
               pointFactory.build({ start: '2026-10-02', importedAttempts: 2 }),
             ],
           }),
         ),
       );
       expect(overview?.period).toEqual({
         from: '2026-10-01',
         to: '2026-10-07',
         granularity: 'day',
         timezone: 'America/Argentina/Buenos_Aires',
       });
       expect(overview?.generatedAt).toBe('2026-10-07T15:00:00.000Z');
       expect(overview?.data.accounts).toHaveLength(6);
       expect(overview?.data.resetStudents).toBe(1);
       expect(overview?.data.totals.firstSolves).toEqual({ server: 3, imported: 1 });
       expect(overview?.data.totals.studentsWhoRan).toBe(4);
       expect(overview?.data.series.map((point) => [point.start, point.importedAttempts])).toEqual([
         ['2026-10-01', 0],
         ['2026-10-02', 2],
       ]);
     });

     it('rejects a point of the series that lacks its counts', () => {
       const body: unknown = {
         data: { ...overviewFactory.build(), series: [{ start: '2026-10-01' }] },
         meta: META,
       };
       expect(parseOverview(body)).toBeNull();
     });

     it('rejects a role that the contract does not have', () => {
       const body = statsBody(
         overviewFactory.build({ accounts: [{ role: 'teacher', status: 'active', count: 1 }] }),
       );
       expect(parseOverview(body)).toBeNull();
     });
   });

   describe('the exercises and the rest of the content', () => {
     it('reads every table and keeps the null medians and levels', () => {
       const stats = parseCurriculumStats(
         statsBody(
           curriculumFactory.build({
             catalogs: [
               {
                 catalog: 'lab',
                 language: 'rust',
                 level: null,
                 activeExercises: 100,
                 studentsStarted: 3,
                 studentsSolved: 2,
                 solvedMedian: 1.5,
               },
             ],
             exercises: [
               exerciseFactory.build({
                 retired: true,
                 attemptsMedian: { solved: 2, unsolved: null },
                 prediction: {
                   answered: 6,
                   correct: 4,
                   options: [
                     { option: 0, students: 4 },
                     { option: 2, students: 2 },
                   ],
                 },
                 tests: [{ testKey: 't1', verdicts: 8, fail: 4, missing: 1 }],
               }),
             ],
             worlds: [worldFactory.build()],
             workshops: [workshopFactory.build({ stepsMarkedMedian: 0.5 })],
             route: {
               marks: [{ kind: 'milestone', itemKey: 'rust-memory', students: 2 }],
               quiz: [
                 { stepId: 'rust-first-session', answered: 5, options: [{ option: 1, students: 5 }] },
               ],
             },
           }),
         ),
       );
       expect(stats?.data.catalogs[0]?.solvedMedian).toBe(1.5);
       const exercise = stats?.data.exercises[0];
       expect(exercise?.retired).toBe(true);
       expect(exercise?.attemptsMedian).toEqual({ solved: 2, unsolved: null });
       expect(exercise?.prediction).toEqual({
         answered: 6,
         correct: 4,
         options: [
           { option: 0, students: 4 },
           { option: 2, students: 2 },
         ],
       });
       expect(exercise?.tests).toEqual([{ testKey: 't1', verdicts: 8, fail: 4, missing: 1 }]);
       expect(stats?.data.worlds[0]?.level).toBe('beginner');
       expect(stats?.data.workshops[0]?.stepsMarkedMedian).toBe(0.5);
       expect(stats?.data.workshops[0]?.objectivesObservedMedian).toBeNull();
       expect(stats?.data.route.marks).toEqual([
         { kind: 'milestone', itemKey: 'rust-memory', students: 2 },
       ]);
       expect(stats?.data.route.quiz[0]?.stepId).toBe('rust-first-session');
     });

     it('rejects a mark of a kind the route does not have', () => {
       const body = statsBody(
         curriculumFactory.build({
           route: { marks: [{ kind: 'note', itemKey: 'x', students: 1 }], quiz: [] },
         }),
       );
       expect(parseCurriculumStats(body)).toBeNull();
     });
   });

   describe('the queue and the runs', () => {
     it('reads the queue with an empty oldest wait and empty percentiles', () => {
       expect(parseQueue(queueFactory.build())).toEqual({
         now: { queued: 0, running: 0, oldestQueuedSeconds: null, maxWaiting: 32, slots: 4 },
         lastDay: {
           finished: 0,
           waitMs: { p50: null, p95: null },
           durationMs: { p50: null, p95: null },
           infraErrors: [],
         },
         generatedAt: '2026-10-07T15:00:00.000Z',
       });
     });

     it('reads a page of runs with its cursor and its retention', () => {
       const page = parseRunsPage(
         runsBody(
           [runFactory.build({ status: 'infra_error', reason: 'executor_busy' })],
           '019a0000-0000-7000-8000-000000000002',
         ),
       );
       expect(page?.nextCursor).toBe('019a0000-0000-7000-8000-000000000002');
       expect(page?.retentionDays).toBe(14);
       expect(page?.runs[0]?.status).toBe('infra_error');
       expect(page?.runs[0]?.reason).toBe('executor_busy');
       expect(page?.runs[0]?.account).toEqual({ id: 5, name: 'Caro Díaz' });
     });

     it('rejects a run whose state is not one of B2, and a body that is not an object', () => {
       expect(parseRunsPage(runsBody([runFactory.build({ status: 'lost' })]))).toBeNull();
       expect(parseRunsPage('<html>')).toBeNull();
       expect(parseOverview(null)).toBeNull();
     });
   });
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/parse-usage.spec.ts`: en rojo, por `not implemented`.
6. **Commit:** `test(front): specs de la lectura de las estadísticas de C5, en rojo`.

### Tarea 1.2 · La lectura de C5 (T004, M)

**Archivos:** `frontend/src/pages/admin/model/json-reader.ts` y `parse-usage.ts`.

1. **`json-reader.ts`.** Cada lector tira `UnexpectedShape` ante un valor fuera del contrato, y `readOrNull` lo convierte en `null`:

   ```ts
   import { isPlainObject } from '../../../shared/lib/is-plain-object';

   export class UnexpectedShape extends Error {}

   export type JsonRecord = Readonly<Record<string, unknown>>;

   export function recordAt(value: unknown, path: string): JsonRecord {
     if (!isPlainObject(value)) throw new UnexpectedShape(path);
     return value;
   }

   export function childAt(record: JsonRecord, key: string): JsonRecord {
     return recordAt(record[key], key);
   }

   export function numberAt(record: JsonRecord, key: string): number {
     const value = record[key];
     if (typeof value !== 'number' || !Number.isFinite(value)) throw new UnexpectedShape(key);
     return value;
   }

   export function nullableNumberAt(record: JsonRecord, key: string): number | null {
     return record[key] === null ? null : numberAt(record, key);
   }

   export function stringAt(record: JsonRecord, key: string): string {
     const value = record[key];
     if (typeof value !== 'string') throw new UnexpectedShape(key);
     return value;
   }

   export function nullableStringAt(record: JsonRecord, key: string): string | null {
     return record[key] === null ? null : stringAt(record, key);
   }

   export function booleanAt(record: JsonRecord, key: string): boolean {
     const value = record[key];
     if (typeof value !== 'boolean') throw new UnexpectedShape(key);
     return value;
   }

   export function nullableBooleanAt(record: JsonRecord, key: string): boolean | null {
     return record[key] === null ? null : booleanAt(record, key);
   }

   export function oneOfAt<T extends string>(
     record: JsonRecord,
     key: string,
     options: readonly T[],
   ): T {
     const value = record[key];
     const match = options.find((option) => option === value);
     if (match === undefined) throw new UnexpectedShape(key);
     return match;
   }

   export function listAt<T>(record: JsonRecord, key: string, item: (value: unknown) => T): T[] {
     const value = record[key];
     if (!Array.isArray(value)) throw new UnexpectedShape(key);
     return value.map((entry: unknown) => item(entry));
   }

   export function readOrNull<T>(read: () => T): T | null {
     try {
       return read();
     } catch (error) {
       if (error instanceof UnexpectedShape) return null;
       throw error;
     }
   }
   ```

2. **`parse-usage.ts`:**

   ```ts
   import type { AccountRole } from '../../../entities/session';
   import {
     booleanAt,
     childAt,
     listAt,
     nullableBooleanAt,
     nullableNumberAt,
     nullableStringAt,
     numberAt,
     oneOfAt,
     readOrNull,
     recordAt,
     stringAt,
     type JsonRecord,
   } from './json-reader';
   import type { AccountStatus } from './types';
   import type {
     AccountCount,
     CatalogStats,
     CurriculumStats,
     ExerciseStats,
     Granularity,
     HintCount,
     InfraErrorCount,
     IntervalTotals,
     OperationCounts,
     OptionCount,
     OptionSpread,
     OutcomeCounts,
     Overview,
     PeriodMeta,
     Percentiles,
     PredictionStats,
     QueueStats,
     RouteMark,
     RouteMarkKind,
     RouteQuiz,
     RunRow,
     RunsPage,
     RunStatus,
     SeriesPoint,
     SolvedSplit,
     Stats,
     TestStats,
     WorkshopStats,
     WorldStats,
   } from './usage-types';

   const GRANULARITIES: readonly Granularity[] = ['day', 'week', 'month'];
   const ROLES: readonly AccountRole[] = ['admin', 'student'];
   const STATUSES: readonly AccountStatus[] = ['active', 'disabled', 'deleting'];
   const MARK_KINDS: readonly RouteMarkKind[] = ['step', 'milestone', 'favorite'];

   export const RUN_STATUSES: readonly RunStatus[] = [
     'queued',
     'running',
     'passed',
     'failed',
     'compile_error',
     'runtime_error',
     'timeout',
     'infra_error',
     'canceled',
   ];

   function outcomesOf(record: JsonRecord): OutcomeCounts {
     return {
       passed: numberAt(record, 'passed'),
       failed: numberAt(record, 'failed'),
       compileError: numberAt(record, 'compileError'),
       runtimeError: numberAt(record, 'runtimeError'),
       timeout: numberAt(record, 'timeout'),
     };
   }

   function operationsOf(record: JsonRecord): OperationCounts {
     return { infraError: numberAt(record, 'infraError'), canceled: numberAt(record, 'canceled') };
   }

   function splitOf(record: JsonRecord): SolvedSplit {
     return { server: numberAt(record, 'server'), imported: numberAt(record, 'imported') };
   }

   function totalsOf(record: JsonRecord): IntervalTotals {
     return {
       attempts: outcomesOf(childAt(record, 'attempts')),
       operations: operationsOf(childAt(record, 'operations')),
       importedAttempts: numberAt(record, 'importedAttempts'),
       firstSolves: splitOf(childAt(record, 'firstSolves')),
       newStudents: numberAt(record, 'newStudents'),
       imports: numberAt(record, 'imports'),
       studentsWhoRan: numberAt(record, 'studentsWhoRan'),
     };
   }

   function pointOf(value: unknown): SeriesPoint {
     const record = recordAt(value, 'series');
     return { start: stringAt(record, 'start'), ...totalsOf(record) };
   }

   function accountCountOf(value: unknown): AccountCount {
     const record = recordAt(value, 'accounts');
     return {
       role: oneOfAt(record, 'role', ROLES),
       status: oneOfAt(record, 'status', STATUSES),
       count: numberAt(record, 'count'),
     };
   }

   function overviewOf(data: JsonRecord): Overview {
     const active = childAt(data, 'activeStudents');
     const invitations = childAt(data, 'invitations');
     return {
       accounts: listAt(data, 'accounts', accountCountOf),
       activeStudents: {
         lastDay: numberAt(active, 'lastDay'),
         lastWeek: numberAt(active, 'lastWeek'),
         lastMonth: numberAt(active, 'lastMonth'),
         never: numberAt(active, 'never'),
       },
       invitations: {
         pending: numberAt(invitations, 'pending'),
         expired: numberAt(invitations, 'expired'),
         pendingAdmin: numberAt(invitations, 'pendingAdmin'),
       },
       resetStudents: numberAt(data, 'resetStudents'),
       totals: totalsOf(childAt(data, 'totals')),
       series: listAt(data, 'series', pointOf),
     };
   }

   function periodOf(record: JsonRecord): PeriodMeta {
     return {
       from: stringAt(record, 'from'),
       to: stringAt(record, 'to'),
       granularity: oneOfAt(record, 'granularity', GRANULARITIES),
       timezone: stringAt(record, 'timezone'),
     };
   }

   function statsOf<T>(body: unknown, dataOf: (data: JsonRecord) => T): Stats<T> {
     const root = recordAt(body, 'body');
     const meta = childAt(root, 'meta');
     return {
       data: dataOf(childAt(root, 'data')),
       generatedAt: stringAt(meta, 'generatedAt'),
       period: periodOf(childAt(meta, 'period')),
     };
   }

   function optionOf(value: unknown): OptionCount {
     const record = recordAt(value, 'options');
     return { option: numberAt(record, 'option'), students: numberAt(record, 'students') };
   }

   function spreadOf(record: JsonRecord): OptionSpread {
     return { answered: numberAt(record, 'answered'), options: listAt(record, 'options', optionOf) };
   }

   function predictionOf(record: JsonRecord): PredictionStats {
     return { ...spreadOf(record), correct: numberAt(record, 'correct') };
   }

   function hintOf(value: unknown): HintCount {
     const record = recordAt(value, 'hintsRevealed');
     return { hints: numberAt(record, 'hints'), students: numberAt(record, 'students') };
   }

   function testOf(value: unknown): TestStats {
     const record = recordAt(value, 'tests');
     return {
       testKey: stringAt(record, 'testKey'),
       verdicts: numberAt(record, 'verdicts'),
       fail: numberAt(record, 'fail'),
       missing: numberAt(record, 'missing'),
     };
   }

   function catalogOf(value: unknown): CatalogStats {
     const record = recordAt(value, 'catalogs');
     return {
       catalog: stringAt(record, 'catalog'),
       language: stringAt(record, 'language'),
       level: nullableStringAt(record, 'level'),
       activeExercises: numberAt(record, 'activeExercises'),
       studentsStarted: numberAt(record, 'studentsStarted'),
       studentsSolved: numberAt(record, 'studentsSolved'),
       solvedMedian: nullableNumberAt(record, 'solvedMedian'),
     };
   }

   function exerciseOf(value: unknown): ExerciseStats {
     const record = recordAt(value, 'exercises');
     const median = childAt(record, 'attemptsMedian');
     const help = childAt(record, 'help');
     const confidence = childAt(record, 'confidence');
     return {
       exerciseId: stringAt(record, 'exerciseId'),
       catalog: stringAt(record, 'catalog'),
       language: stringAt(record, 'language'),
       level: nullableStringAt(record, 'level'),
       retired: booleanAt(record, 'retired'),
       studentsStarted: numberAt(record, 'studentsStarted'),
       solved: splitOf(childAt(record, 'solved')),
       attempts: outcomesOf(childAt(record, 'attempts')),
       operations: operationsOf(childAt(record, 'operations')),
       importedAttempts: numberAt(record, 'importedAttempts'),
       attemptsMedian: {
         solved: nullableNumberAt(median, 'solved'),
         unsolved: nullableNumberAt(median, 'unsolved'),
       },
       help: {
         assisted: numberAt(help, 'assisted'),
         solutionSeen: numberAt(help, 'solutionSeen'),
         hintsRevealed: listAt(help, 'hintsRevealed', hintOf),
       },
       prediction: predictionOf(childAt(record, 'prediction')),
       confidence: {
         again: numberAt(confidence, 'again'),
         practice: numberAt(confidence, 'practice'),
         confident: numberAt(confidence, 'confident'),
       },
       tests: listAt(record, 'tests', testOf),
     };
   }

   function worldOf(value: unknown): WorldStats {
     const record = recordAt(value, 'worlds');
     const checkpoint = childAt(record, 'checkpoint');
     return {
       worldId: stringAt(record, 'worldId'),
       language: stringAt(record, 'language'),
       level: nullableStringAt(record, 'level'),
       retired: booleanAt(record, 'retired'),
       exercises: numberAt(record, 'exercises'),
       solvedRows: numberAt(record, 'solvedRows'),
       studentsWithSeals: numberAt(record, 'studentsWithSeals'),
       checkpoint: { ...spreadOf(checkpoint), passed: numberAt(checkpoint, 'passed') },
     };
   }

   function workshopOf(value: unknown): WorkshopStats {
     const record = recordAt(value, 'workshops');
     return {
       workshopId: stringAt(record, 'workshopId'),
       language: stringAt(record, 'language'),
       level: nullableStringAt(record, 'level'),
       retired: booleanAt(record, 'retired'),
       studentsStarted: numberAt(record, 'studentsStarted'),
       codeSealed: numberAt(record, 'codeSealed'),
       prediction: predictionOf(childAt(record, 'prediction')),
       stepsMarkedMedian: nullableNumberAt(record, 'stepsMarkedMedian'),
       objectivesObservedMedian: nullableNumberAt(record, 'objectivesObservedMedian'),
     };
   }

   function markOf(value: unknown): RouteMark {
     const record = recordAt(value, 'marks');
     return {
       kind: oneOfAt(record, 'kind', MARK_KINDS),
       itemKey: stringAt(record, 'itemKey'),
       students: numberAt(record, 'students'),
     };
   }

   function quizOf(value: unknown): RouteQuiz {
     const record = recordAt(value, 'quiz');
     return { stepId: stringAt(record, 'stepId'), ...spreadOf(record) };
   }

   function curriculumOf(data: JsonRecord): CurriculumStats {
     const route = childAt(data, 'route');
     return {
       catalogs: listAt(data, 'catalogs', catalogOf),
       exercises: listAt(data, 'exercises', exerciseOf),
       worlds: listAt(data, 'worlds', worldOf),
       workshops: listAt(data, 'workshops', workshopOf),
       route: { marks: listAt(route, 'marks', markOf), quiz: listAt(route, 'quiz', quizOf) },
     };
   }

   function percentilesOf(record: JsonRecord): Percentiles {
     return { p50: nullableNumberAt(record, 'p50'), p95: nullableNumberAt(record, 'p95') };
   }

   function infraErrorOf(value: unknown): InfraErrorCount {
     const record = recordAt(value, 'infraErrors');
     return { reason: stringAt(record, 'reason'), runs: numberAt(record, 'runs') };
   }

   function queueOf(body: unknown): QueueStats {
     const root = recordAt(body, 'body');
     const data = childAt(root, 'data');
     const now = childAt(data, 'now');
     const lastDay = childAt(data, 'lastDay');
     return {
       now: {
         queued: numberAt(now, 'queued'),
         running: numberAt(now, 'running'),
         oldestQueuedSeconds: nullableNumberAt(now, 'oldestQueuedSeconds'),
         maxWaiting: numberAt(now, 'maxWaiting'),
         slots: numberAt(now, 'slots'),
       },
       lastDay: {
         finished: numberAt(lastDay, 'finished'),
         waitMs: percentilesOf(childAt(lastDay, 'waitMs')),
         durationMs: percentilesOf(childAt(lastDay, 'durationMs')),
         infraErrors: listAt(lastDay, 'infraErrors', infraErrorOf),
       },
       generatedAt: stringAt(childAt(root, 'meta'), 'generatedAt'),
     };
   }

   function runOf(value: unknown): RunRow {
     const record = recordAt(value, 'data');
     const account = childAt(record, 'account');
     return {
       id: stringAt(record, 'id'),
       account: { id: numberAt(account, 'id'), name: stringAt(account, 'name') },
       exerciseId: stringAt(record, 'exerciseId'),
       language: stringAt(record, 'language'),
       status: oneOfAt(record, 'status', RUN_STATUSES),
       reason: nullableStringAt(record, 'reason'),
       executorPhase: nullableStringAt(record, 'executorPhase'),
       exitCode: nullableNumberAt(record, 'exitCode'),
       truncated: nullableBooleanAt(record, 'truncated'),
       compileMs: nullableNumberAt(record, 'compileMs'),
       runMs: nullableNumberAt(record, 'runMs'),
       createdAt: stringAt(record, 'createdAt'),
       startedAt: nullableStringAt(record, 'startedAt'),
       finishedAt: nullableStringAt(record, 'finishedAt'),
       cancelRequested: booleanAt(record, 'cancelRequested'),
     };
   }

   function runsPageOf(body: unknown): RunsPage {
     const root = recordAt(body, 'body');
     const meta = childAt(root, 'meta');
     return {
       runs: listAt(root, 'data', runOf),
       nextCursor: nullableStringAt(meta, 'nextCursor'),
       retentionDays: numberAt(meta, 'retentionDays'),
     };
   }

   export function parseOverview(body: unknown): Stats<Overview> | null {
     return readOrNull(() => statsOf(body, overviewOf));
   }

   export function parseCurriculumStats(body: unknown): Stats<CurriculumStats> | null {
     return readOrNull(() => statsOf(body, curriculumOf));
   }

   export function parseQueue(body: unknown): QueueStats | null {
     return readOrNull(() => queueOf(body));
   }

   export function parseRunsPage(body: unknown): RunsPage | null {
     return readOrNull(() => runsPageOf(body));
   }
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/parse-usage.spec.ts`, en verde, y después `npm run typecheck` y `npm run lint`.
4. **Commit:** `feat(front): la lectura de las estadísticas de C5`.

### Tarea 1.3 · Las reglas de la pantalla, en rojo (T005, M)

**Archivos:** en `frontend/src/pages/admin/model/`, los stubs de `period.ts`, `usage-format.ts`, `exercise-order.ts`, `curriculum-filters.ts`, `stats-failure.ts` y `content-titles.ts`, y una spec por módulo. `usage-labels.ts` va entero en T006 (son textos y tablas, sin decisiones).

**Consume:** de F12a, `reactionTo` y `FORBIDDEN_HINT`; de F11a, `ApiFailure`, `NETWORK_MESSAGE` y `formatWait`; de `entities/guide`, `PROJECT_MILESTONES` y `milestoneId`. **Produce:** las firmas de «`pages/admin/model`» del contrato.

1. **`period.spec.ts`.** Los bordes salen del contrato de C5 (§2: 366 días; su prueba usa `2025-10-20` a `2026-10-20` como 366 y `2025-10-19` como 367):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { BOTH_DATES, FROM_AFTER_TO, TOO_LONG, checkPeriod, periodSentence } from './period';

   const OCTOBER = {
     from: '2026-10-01',
     to: '2026-10-07',
     granularity: 'week',
     timezone: 'America/Argentina/Buenos_Aires',
   } as const;

   describe('the period', () => {
     it('asks for both dates on the field that is missing', () => {
       expect(checkPeriod('', '2026-10-07')).toEqual({ field: 'from', message: BOTH_DATES });
       expect(checkPeriod('2026-10-01', '')).toEqual({ field: 'to', message: BOTH_DATES });
     });

     it('rejects a start after the end and accepts a single day', () => {
       expect(checkPeriod('2026-10-08', '2026-10-07')).toEqual({
         field: 'from',
         message: FROM_AFTER_TO,
       });
       expect(checkPeriod('2026-10-01', '2026-10-01')).toBeNull();
     });

     it('accepts 366 days and puts the 367th on the end date', () => {
       expect(checkPeriod('2025-10-20', '2026-10-20')).toBeNull();
       expect(checkPeriod('2025-10-19', '2026-10-20')).toEqual({ field: 'to', message: TOO_LONG });
     });

     it('says the period with its dates as they came and the zone of the workshop', () => {
       expect(periodSentence(OCTOBER, true)).toBe(
         'Del 1/10/2026 al 7/10/2026, por semana, en la hora de Buenos Aires.',
       );
       expect(periodSentence(OCTOBER, false)).toBe(
         'Del 1/10/2026 al 7/10/2026, en la hora de Buenos Aires.',
       );
     });
   });
   ```

2. **`usage-format.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import {
     countNoun,
     formatClock,
     formatCount,
     formatMaybe,
     formatPeriodDate,
     formatSeconds,
     intervalHeading,
     intervalLabel,
     rateView,
     showsDistribution,
     zoneName,
   } from './usage-format';

   describe('the figures', () => {
     it('writes numbers the Argentine way and «—» for a missing one', () => {
       expect(formatCount(1500)).toBe('1.500');
       expect(formatCount(1.5)).toBe('1,5');
       expect(formatMaybe(null)).toBe('—');
       expect(countNoun(1, 'intento', 'intentos')).toBe('1 intento');
       expect(countNoun(3, 'intento', 'intentos')).toBe('3 intentos');
     });

     it('keeps the n of every rate and marks a sample under five', () => {
       expect(rateView(0, 0)).toEqual({ kind: 'none' });
       expect(rateView(2, 3)).toEqual({ kind: 'small', text: '2 de 3' });
       expect(rateView(4, 8)).toEqual({ kind: 'full', text: '4 de 8', value: 4, max: 8 });
       expect(rateView(1.5, 100, 3)).toEqual({ kind: 'small', text: '1,5 de 100' });
       expect(rateView(1, 100, 0)).toEqual({ kind: 'none' });
     });

     it('shows a distribution only from five answers on', () => {
       expect(showsDistribution(4)).toBe(false);
       expect(showsDistribution(5)).toBe(true);
     });

     it('writes the dates of a period without converting them', () => {
       expect(formatPeriodDate('2026-10-01')).toBe('1/10/2026');
       expect(intervalLabel('2026-10-12', 'day')).toBe('12/10');
       expect(intervalLabel('2026-10-12', 'week')).toBe('12/10');
       expect(intervalLabel('2026-10-01', 'month')).toBe('octubre de 2026');
       expect(intervalHeading('2026-10-12', 'day')).toBe('12/10/2026');
       expect(intervalHeading('2026-10-12', 'week')).toBe('Semana del 12/10/2026');
       expect(intervalHeading('2026-10-01', 'month')).toBe('octubre de 2026');
     });

     it('writes durations, clock times and zones', () => {
       expect(formatSeconds(1500)).toBe('1,5 s');
       expect(formatSeconds(null)).toBe('—');
       expect(formatClock('2026-10-07T15:00:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
       expect(zoneName('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
       expect(zoneName('UTC')).toBe('UTC');
     });
   });
   ```

3. **`exercise-order.spec.ts`.** Los órdenes esperados están resueltos a mano en el comentario de cada fila:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { sortExercises } from './exercise-order';
   import { parseCurriculumStats } from './parse-usage';
   import { curriculumFactory, exerciseFactory, statsBody } from './usage.factory';

   function rows() {
     const stats = parseCurriculumStats(
       statsBody(
         curriculumFactory.build({
           exercises: [
             exerciseFactory.build({
               exerciseId: 'a',
               studentsStarted: 4,
               solved: { server: 1, imported: 1 },
               attempts: { passed: 2, failed: 3, compileError: 0, runtimeError: 0, timeout: 0 },
               help: { assisted: 1, solutionSeen: 1, hintsRevealed: [] },
             }),
             exerciseFactory.build({ exerciseId: 'b' }),
             exerciseFactory.build({
               exerciseId: 'c',
               studentsStarted: 2,
               solved: { server: 2, imported: 0 },
             }),
             exerciseFactory.build({
               exerciseId: 'd',
               studentsStarted: 5,
               solved: { server: 0, imported: 1 },
               attempts: { passed: 0, failed: 2, compileError: 2, runtimeError: 1, timeout: 0 },
               help: { assisted: 2, solutionSeen: 0, hintsRevealed: [] },
             }),
           ],
         }),
       ),
     );
     return stats?.data.exercises ?? [];
   }

   function ids(order: Parameters<typeof sortExercises>[1]): string[] {
     return sortExercises(rows(), order).map((exercise) => exercise.exerciseId);
   }

   describe('the order of the exercises', () => {
     it('keeps the order of the catalog by default', () => {
       expect(ids('catalog')).toEqual(['a', 'b', 'c', 'd']);
     });

     it('puts the least solved first and the ones nobody started last', () => {
       // a 2/4 = 0,5; b nadie; c 2/2 = 1; d 1/5 = 0,2
       expect(ids('least-solved')).toEqual(['d', 'a', 'c', 'b']);
     });

     it('puts the most failed attempts first', () => {
       // a 3; b 0; c 0; d 5: b y c conservan su orden
       expect(ids('most-failed')).toEqual(['d', 'a', 'b', 'c']);
     });

     it('puts the most help first and the ones nobody started last', () => {
       // a (1 + 1)/4 = 0,5; b nadie; c 0/2 = 0; d 2/5 = 0,4
       expect(ids('most-help')).toEqual(['a', 'd', 'c', 'b']);
     });
   });
   ```

4. **`curriculum-filters.spec.ts`.** Qué filtro afecta a qué tabla sale del contrato de C5 (§4):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { catalogOptions, filterNote } from './curriculum-filters';
   import { parseCurriculumStats } from './parse-usage';
   import { catalogFactory, curriculumFactory, statsBody } from './usage.factory';

   const NONE = { catalog: '', language: '', level: '' } as const;

   describe('the filters of the exercises', () => {
     it('says nothing without filters', () => {
       expect(filterNote('catalogs', NONE)).toBeUndefined();
     });

     it('names the filters that apply to each table', () => {
       const all = { catalog: 'lab', language: 'rust', level: 'beginner' } as const;
       expect(filterNote('catalogs', all)).toBe('Filtrada por catálogo, lenguaje y nivel.');
       expect(filterNote('exercises', { ...all, level: '' })).toBe(
         'Filtrada por catálogo y lenguaje.',
       );
       expect(filterNote('worlds', all)).toBe('Filtrada por lenguaje y nivel.');
       expect(filterNote('workshops', { ...NONE, catalog: 'lab' })).toBe(
         'Los filtros elegidos no cambian esta tabla.',
       );
       expect(filterNote('route', { ...NONE, language: 'go' })).toBe(
         'Los filtros elegidos no cambian esta tabla.',
       );
     });

     it('offers the catalogs of the answer once each, and keeps the chosen one', () => {
       const stats = parseCurriculumStats(
         statsBody(
           curriculumFactory.build({
             catalogs: [
               catalogFactory.build({ catalog: 'lab', language: 'rust' }),
               catalogFactory.build({ catalog: 'lab', language: 'go' }),
               catalogFactory.build({ catalog: 'essentials', language: 'rust' }),
             ],
           }),
         ),
       );
       const catalogs = stats?.data.catalogs ?? [];
       expect(catalogOptions(catalogs, '')).toEqual([
         { value: '', label: 'Todos' },
         { value: 'lab', label: 'lab' },
         { value: 'essentials', label: 'essentials' },
       ]);
       expect(catalogOptions([], 'quests')).toEqual([
         { value: '', label: 'Todos' },
         { value: 'quests', label: 'quests' },
       ]);
     });
   });
   ```

5. **`stats-failure.spec.ts`.** Los mensajes salen de `lang/es/api.php` de C5 y de F11a (`qa/e2e/lib/api-contract.ts`, `MESSAGES`). Cubre los estados de SC-005 que no tienen una E2E propia: 429, 403, 409, un 5xx, un cuerpo que no es JSON y la red:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import { NETWORK_MESSAGE, UNEXPECTED_MESSAGE } from '../../../shared/ui/form';
   import { FORBIDDEN_HINT } from './react-to-failure';
   import { describeStatsFailure, isPeriodRejection } from './stats-failure';

   const TIMEOUT_MESSAGE = 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.';

   function response(
     status: number,
     code: string,
     message: string,
     retryAfterSeconds: number | null = null,
     fieldErrors: Record<string, string[]> = {},
   ): ApiFailure {
     return { kind: 'response', status, code, message, fieldErrors, retryAfterSeconds };
   }

   describe('a failure of the statistics', () => {
     it('adds the wait to a stats timeout, as for a 429', () => {
       const description = describeStatsFailure(
         response(503, 'stats_timeout', TIMEOUT_MESSAGE, 30),
         'No pudimos cargar el resumen.',
       );
       expect(description?.generalMessages).toEqual([
         TIMEOUT_MESSAGE,
         'Podés volver a intentar en 30 segundos.',
       ]);
       expect(description?.retryAfterSeconds).toBe(30);
       const tooFast = describeStatsFailure(
         response(429, 'too_many_requests', 'Demasiados intentos.', 30),
         '',
       );
       expect(tooFast?.generalMessages).toEqual([
         'Demasiados intentos.',
         'Podés volver a intentar en 30 segundos.',
       ]);
     });

     it('leaves the sign-in to the session and explains a lost role and a network failure', () => {
       expect(
         describeStatsFailure(response(401, 'unauthenticated', 'Iniciá sesión.'), ''),
       ).toBeNull();
       const forbidden = describeStatsFailure(
         response(403, 'forbidden', 'No tenés permiso para hacer esto.'),
         '',
       );
       expect(forbidden?.generalMessages).toEqual([
         'No tenés permiso para hacer esto.',
         FORBIDDEN_HINT,
       ]);
       expect(forbidden?.offerReload).toBe(true);
       expect(describeStatsFailure({ kind: 'network' }, '')?.generalMessages).toEqual([
         NETWORK_MESSAGE,
       ]);
     });

     it('offers to reload on a changed account, and explains a server error and a body that is not JSON', () => {
       const changed = describeStatsFailure(
         response(409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.'),
         '',
       );
       expect(changed?.offerReload).toBe(true);
       expect(changed?.generalMessages).toEqual(['La sesión cambió de cuenta: recargá la página.']);
       expect(
         describeStatsFailure(
           response(500, 'server_error', 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.'),
           '',
         )?.generalMessages,
       ).toEqual(['Algo salió mal de nuestro lado. Probá de nuevo en un rato.']);
       expect(describeStatsFailure({ kind: 'unexpected', status: 502 }, '')?.generalMessages).toEqual([
         UNEXPECTED_MESSAGE,
       ]);
       expect(
         describeStatsFailure(response(403, 'account_disabled', 'Tu cuenta está deshabilitada.'), ''),
       ).toBeNull();
     });

     it('tells a rejected period apart from any other 422', () => {
       const period = response(422, 'validation_failed', 'Hay datos que corregir.', null, {
         to: ['El período puede tener hasta 366 días.'],
       });
       const catalog = response(422, 'validation_failed', 'Hay datos que corregir.', null, {
         catalog: ['El catálogo no existe.'],
       });
       expect(isPeriodRejection(period)).toBe(true);
       expect(isPeriodRejection(catalog)).toBe(false);
       expect(isPeriodRejection(response(503, 'stats_timeout', TIMEOUT_MESSAGE, 30))).toBe(false);
     });
   });
   ```

6. **`content-titles.spec.ts`.** El contenido es un ejemplo escrito a mano; el título del hito sale de `PROJECT_MILESTONES` («Un lugar para guardar cosas», `frontend/src/entities/guide/model/project-milestones.ts`):

   ```ts
   import { describe, expect, it, vi } from 'vitest';
   import { ID_TITLES, buildContentTitles, lazyTitles, type TitleSource } from './content-titles';

   const SOURCE: TitleSource = {
     lab: {
       rust: [
         {
           id: 'rust-01',
           title: 'La energía del reactor',
           tests: [{ id: 't1', label: 'Tres celdas' }],
           prediction: { options: ['Devuelve 21 siempre', 'No compila', 'Ignora el punto y coma'] },
         },
       ],
     },
     quests: {},
     cores: {},
     campaign: {
       rust: [{ id: 'rust-world-1', title: 'Estación del robot', checkpoint: { options: ['Al recibir', 'Después', 'Antes'] } }],
     },
     workshops: {
       lowlevel: [
         { id: 'cache', title: 'Una caché que aprende tus visitas', prediction: { options: ['A', 'B', 'C'] } },
         { id: 'heap', prediction: { options: [] } },
       ],
     },
     guide: {
       resources: [{ id: 'rust-100', title: '100 Exercises to Learn Rust' }],
       tracks: {
         rust: {
           modules: [
             {
               steps: [
                 {
                   id: 'rust-first-session',
                   title: 'Tu primer cambio comprobable',
                   quiz: { options: ['Correcto siempre', 'Comprobó la propiedad', 'El más rápido'] },
                 },
               ],
             },
           ],
         },
       },
     },
   };

   describe('the titles of the content', () => {
     it('names exercises, tests, worlds, workshops and the route from the content', () => {
       const titles = buildContentTitles(SOURCE);
       expect(titles.exercise('rust-01')).toBe('La energía del reactor');
       expect(titles.test('rust-01', 't1')).toBe('Tres celdas');
       expect(titles.world('rust-world-1')).toBe('Estación del robot');
       expect(titles.workshop('cache')).toBe('Una caché que aprende tus visitas');
       expect(titles.routeItem('step', 'rust-first-session')).toBe('Tu primer cambio comprobable');
       expect(titles.routeItem('milestone', 'rust-memory')).toBe('Un lugar para guardar cosas');
       expect(titles.routeItem('favorite', 'rust-100')).toBe('100 Exercises to Learn Rust');
       expect(titles.option('exercise', 'rust-01', 2)).toBe('Ignora el punto y coma');
       expect(titles.option('world', 'rust-world-1', 1)).toBe('Después');
       expect(titles.option('step', 'rust-first-session', 0)).toBe('Correcto siempre');
     });

     it('falls back to the id, or to «Opción {n}», for what the content does not have', () => {
       const titles = buildContentTitles(SOURCE);
       expect(titles.exercise('rust-999')).toBe('rust-999');
       expect(titles.test('rust-01', 't9')).toBe('t9');
       expect(titles.workshop('heap')).toBe('heap');
       expect(titles.option('exercise', 'rust-01', 5)).toBe('Opción 6');
       expect(ID_TITLES.world('rust-world-1')).toBe('rust-world-1');
       expect(ID_TITLES.option('workshop', 'cache', 0)).toBe('Opción 1');
     });

     it('reads the content only when a title is first needed, and once', () => {
       const source = vi.fn(() => SOURCE);
       const read = lazyTitles(source);
       expect(source).not.toHaveBeenCalled();
       expect(read().exercise('rust-01')).toBe('La energía del reactor');
       expect(read().world('rust-world-1')).toBe('Estación del robot');
       expect(source).toHaveBeenCalledOnce();
     });
   });
   ```

7. **Correr** `npm run test:unit -- frontend/src/pages/admin/model`: las seis specs nuevas en rojo, por `not implemented`, y la de T003 en verde.
8. **Commit:** `test(front): specs de las reglas de las estadísticas, en rojo`.

### Tarea 1.4 · Las reglas de la pantalla (T006, M)

**Archivos:** en `frontend/src/pages/admin/model/`, `usage-labels.ts`, `usage-format.ts`, `period.ts`, `exercise-order.ts`, `curriculum-filters.ts`, `stats-failure.ts` y `content-titles.ts`.

1. **`usage-labels.ts`,** los textos de la spec y los que agrega el plan (research.md):

   ```ts
   import { LEVEL_IDS, LEVEL_LABELS } from '../../../shared/config/levels';
   import { RUN_STATUSES } from './parse-usage';
   import type {
     ConfidenceCounts,
     CurriculumFilters,
     Granularity,
     OperationCounts,
     OutcomeCounts,
     RouteMarkKind,
     RunStatus,
     UsageView,
   } from './usage-types';

   export type OutcomeKey = keyof OutcomeCounts;
   export type ConfidenceKey = keyof ConfidenceCounts;

   export const OUTCOME_KEYS: readonly OutcomeKey[] = [
     'passed',
     'failed',
     'compileError',
     'runtimeError',
     'timeout',
   ];
   export const OUTCOME_LABELS: Readonly<Record<OutcomeKey, string>> = {
     passed: 'Aprobado',
     failed: 'No pasó las pruebas',
     compileError: 'No compiló',
     runtimeError: 'Error al ejecutar',
     timeout: 'Se pasó de tiempo',
   };
   export const OPERATION_LABELS: Readonly<Record<keyof OperationCounts, string>> = {
     infraError: 'Falla del sandbox',
     canceled: 'Cancelado',
   };
   export const IMPORTED_LABEL = 'Importados';
   export const CONFIDENCE_KEYS: readonly ConfidenceKey[] = ['again', 'practice', 'confident'];
   export const CONFIDENCE_LABELS: Readonly<Record<ConfidenceKey, string>> = {
     again: 'Todavía me cuesta',
     practice: 'Lo entiendo, quiero otra vuelta',
     confident: 'Puedo explicarlo sin mirar',
   };
   export const VIEW_LABELS: Readonly<Record<UsageView, string>> = {
     overview: 'Resumen',
     exercises: 'Ejercicios',
     runs: 'Ejecuciones',
   };
   export const GRANULARITY_NOUNS: Readonly<Record<Granularity, string>> = {
     day: 'día',
     week: 'semana',
     month: 'mes',
   };
   export const GRANULARITY_OPTIONS: readonly { readonly value: Granularity; readonly label: string }[] =
     [
       { value: 'day', label: 'Día' },
       { value: 'week', label: 'Semana' },
       { value: 'month', label: 'Mes' },
     ];
   export const RUN_STATUS_LABELS: Readonly<Record<RunStatus, string>> = {
     queued: 'En cola',
     running: 'Corriendo',
     passed: 'Aprobado',
     failed: 'No pasó las pruebas',
     compile_error: 'No compiló',
     runtime_error: 'Error al ejecutar',
     timeout: 'Se pasó de tiempo',
     infra_error: 'Falla del sandbox',
     canceled: 'Cancelado',
   };
   export const MARK_KIND_LABELS: Readonly<Record<RouteMarkKind, string>> = {
     step: 'Paso',
     milestone: 'Hito',
     favorite: 'Favorito',
   };
   export const LANGUAGE_FILTER: readonly {
     readonly value: CurriculumFilters['language'];
     readonly label: string;
   }[] = [
     { value: '', label: 'Todos' },
     { value: 'rust', label: 'Rust' },
     { value: 'go', label: 'Go' },
   ];
   export const LEVEL_FILTER: readonly {
     readonly value: CurriculumFilters['level'];
     readonly label: string;
   }[] = [{ value: '', label: 'Todos' }, ...LEVEL_IDS.map((id) => ({ value: id, label: LEVEL_LABELS[id] }))];
   export const RUN_STATUS_FILTER: readonly { readonly value: '' | RunStatus; readonly label: string }[] =
     [
       { value: '', label: 'Todos' },
       ...RUN_STATUSES.map((status) => ({ value: status, label: RUN_STATUS_LABELS[status] })),
     ];

   export const SOURCE_CURRENT = 'Estado actual';
   export const SOURCE_HISTORY = 'Historia';
   export const SOURCES_HELP =
     'Resuelto es el estado actual de cada alumno; aprobado es un intento que pasó todas sus pruebas. Después de un «Borrar todo», un alumno puede tener intentos aprobados y ningún ejercicio resuelto.';
   export const RECALCULATION =
     'Las cifras se recalculan cada 10 minutos: una cuenta borrada o un «Borrar todo» pueden tardar ese tiempo en verse.';
   export const WHO_COUNTS =
     'Cuentan los alumnos con la cuenta activa o deshabilitada. No cuentan las cuentas de admin ni las que se están borrando.';
   export const EMPTY_PERIOD =
     'Todavía no hay intentos en este período. Se registran cuando el laboratorio ejecuta en el servidor y el progreso se sincroniza con la cuenta.';
   export const SERIES_NOTE =
     'La serie cuenta sólo a quien ejecutó código: leer, la campaña y el recorrido no dejan intentos.';
   export const FEW_ANSWERS = 'Menos de 5 respuestas: no mostramos cómo se reparten.';
   export const REJECTIONS_NOTE =
     'No cuenta los pedidos rechazados por la cuota o por la cola llena: no quedan registrados.';
   export const SMALL_SAMPLE_MARK = 'Muestra chica';
   export const NO_DATA_NAME = 'sin datos';
   export const RETIRED_MARK = 'Retirado';
   export const UPDATING = 'Actualizando…';

   const REASON_LABELS = new Map<string, string>([
     ['oom', 'Sin memoria'],
     ['signal', 'Terminó por una señal'],
     ['pids_limit', 'Demasiados procesos'],
     ['output_limit', 'Salida demasiado larga'],
     ['evidence_invalid', 'Evidencia inválida'],
     ['executor_busy', 'Sandbox ocupado'],
     ['executor_error', 'Falla del ejecutor'],
     ['job_failed', 'Falló el trabajo'],
     ['expired', 'Venció en la cola'],
     ['account_disabled', 'Cuenta deshabilitada'],
   ]);
   const PHASE_LABELS = new Map<string, string>([
     ['compile', 'Compilación'],
     ['run', 'Ejecución'],
   ]);
   const LANGUAGE_LABELS = new Map<string, string>([
     ['rust', 'Rust'],
     ['go', 'Go'],
   ]);

   export function reasonLabel(reason: string): string {
     return REASON_LABELS.get(reason) ?? reason;
   }

   export function phaseLabel(phase: string): string {
     return PHASE_LABELS.get(phase) ?? phase;
   }

   export function languageLabel(language: string): string {
     return LANGUAGE_LABELS.get(language) ?? language;
   }

   export function levelLabel(level: string | null): string {
     if (level === null) return '—';
     const id = LEVEL_IDS.find((candidate) => candidate === level);
     return id === undefined ? level : LEVEL_LABELS[id];
   }
   ```

2. **`usage-format.ts`:**

   ```ts
   import type { Granularity } from './usage-types';

   export const SMALL_SAMPLE = 5;
   export const NO_DATA = '—';

   export type RateView =
     | { readonly kind: 'none' }
     | { readonly kind: 'small'; readonly text: string }
     | { readonly kind: 'full'; readonly text: string; readonly value: number; readonly max: number };

   const MONTHS = [
     'enero',
     'febrero',
     'marzo',
     'abril',
     'mayo',
     'junio',
     'julio',
     'agosto',
     'septiembre',
     'octubre',
     'noviembre',
     'diciembre',
   ];
   const NUMBERS = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
   const CLOCK = new Intl.DateTimeFormat('es-AR', {
     hour: '2-digit',
     minute: '2-digit',
     hourCycle: 'h23',
   });

   interface DateParts {
     readonly year: number;
     readonly month: number;
     readonly day: number;
   }

   function partsOf(date: string): DateParts {
     const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
     return { year, month, day };
   }

   function monthOf(date: string): string {
     const { year, month } = partsOf(date);
     return `${MONTHS[month - 1] ?? ''} de ${year}`;
   }

   export function formatCount(value: number): string {
     return NUMBERS.format(value);
   }

   export function formatMaybe(value: number | null): string {
     return value === null ? NO_DATA : formatCount(value);
   }

   export function countNoun(count: number, singular: string, plural: string): string {
     return `${formatCount(count)} ${count === 1 ? singular : plural}`;
   }

   export function rateView(numerator: number, n: number, sample: number = n): RateView {
     if (n === 0 || sample === 0) return { kind: 'none' };
     const text = `${formatCount(numerator)} de ${formatCount(n)}`;
     if (sample < SMALL_SAMPLE) return { kind: 'small', text };
     return { kind: 'full', text, value: numerator, max: n };
   }

   export function showsDistribution(answered: number): boolean {
     return answered >= SMALL_SAMPLE;
   }

   export function formatPeriodDate(date: string): string {
     const { year, month, day } = partsOf(date);
     return `${day}/${month}/${year}`;
   }

   export function intervalLabel(start: string, granularity: Granularity): string {
     if (granularity === 'month') return monthOf(start);
     const { month, day } = partsOf(start);
     return `${day}/${month}`;
   }

   export function intervalHeading(start: string, granularity: Granularity): string {
     if (granularity === 'month') return monthOf(start);
     const date = formatPeriodDate(start);
     return granularity === 'week' ? `Semana del ${date}` : date;
   }

   export function formatSeconds(ms: number | null): string {
     return ms === null ? NO_DATA : `${formatCount(ms / 1000)} s`;
   }

   export function formatClock(iso: string): string {
     return CLOCK.format(new Date(iso));
   }

   export function zoneName(timezone: string): string {
     return (timezone.split('/').at(-1) ?? timezone).replaceAll('_', ' ');
   }
   ```

3. **`period.ts`:**

   ```ts
   import { formatPeriodDate, zoneName } from './usage-format';
   import { GRANULARITY_NOUNS } from './usage-labels';
   import type { PeriodMeta } from './usage-types';

   export const MAX_PERIOD_DAYS = 366;
   export const BOTH_DATES = 'Elegí las dos fechas.';
   export const FROM_AFTER_TO = 'La fecha de inicio tiene que ser anterior o igual a la de fin.';
   export const TOO_LONG = 'El período puede tener hasta 366 días.';

   export interface PeriodProblem {
     readonly field: 'from' | 'to';
     readonly message: string;
   }

   const DAY_MS = 86_400_000;

   function dayNumber(date: string): number {
     const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
     return Date.UTC(year, month - 1, day) / DAY_MS;
   }

   export function checkPeriod(from: string, to: string): PeriodProblem | null {
     if (from === '') return { field: 'from', message: BOTH_DATES };
     if (to === '') return { field: 'to', message: BOTH_DATES };
     const days = dayNumber(to) - dayNumber(from) + 1;
     if (days < 1) return { field: 'from', message: FROM_AFTER_TO };
     if (days > MAX_PERIOD_DAYS) return { field: 'to', message: TOO_LONG };
     return null;
   }

   export function periodSentence(period: PeriodMeta, withGranularity: boolean): string {
     const range = `Del ${formatPeriodDate(period.from)} al ${formatPeriodDate(period.to)}`;
     const grouping = withGranularity ? `, por ${GRANULARITY_NOUNS[period.granularity]}` : '';
     return `${range}${grouping}, en la hora de ${zoneName(period.timezone)}.`;
   }
   ```

4. **`exercise-order.ts`.** `Array.prototype.sort` es estable desde ES2019, así que los empates conservan el orden del catálogo:

   ```ts
   import type { ExerciseStats } from './usage-types';

   export type ExerciseOrder = 'catalog' | 'least-solved' | 'most-failed' | 'most-help';

   export const ORDER_OPTIONS: readonly { readonly value: ExerciseOrder; readonly label: string }[] = [
     { value: 'catalog', label: 'Orden del catálogo' },
     { value: 'least-solved', label: 'Menos resueltos primero' },
     { value: 'most-failed', label: 'Más intentos fallidos primero' },
     { value: 'most-help', label: 'Más ayuda primero' },
   ];

   function solvedShare(exercise: ExerciseStats): number | null {
     if (exercise.studentsStarted === 0) return null;
     return (exercise.solved.server + exercise.solved.imported) / exercise.studentsStarted;
   }

   function helpShare(exercise: ExerciseStats): number | null {
     if (exercise.studentsStarted === 0) return null;
     return (exercise.help.assisted + exercise.help.solutionSeen) / exercise.studentsStarted;
   }

   function failedAttempts({ attempts }: ExerciseStats): number {
     return attempts.failed + attempts.compileError + attempts.runtimeError + attempts.timeout;
   }

   function byShare(first: number | null, second: number | null, direction: 1 | -1): number {
     if (first === null && second === null) return 0;
     if (first === null) return 1;
     if (second === null) return -1;
     return (first - second) * direction;
   }

   const COMPARE: Readonly<
     Record<Exclude<ExerciseOrder, 'catalog'>, (a: ExerciseStats, b: ExerciseStats) => number>
   > = {
     'least-solved': (a, b) => byShare(solvedShare(a), solvedShare(b), 1),
     'most-failed': (a, b) => failedAttempts(b) - failedAttempts(a),
     'most-help': (a, b) => byShare(helpShare(a), helpShare(b), -1),
   };

   export function sortExercises(
     exercises: readonly ExerciseStats[],
     order: ExerciseOrder,
   ): ExerciseStats[] {
     if (order === 'catalog') return [...exercises];
     return [...exercises].sort(COMPARE[order]);
   }
   ```

5. **`curriculum-filters.ts`:**

   ```ts
   import type { CatalogStats, CurriculumFilters } from './usage-types';

   export type CurriculumTable = 'catalogs' | 'exercises' | 'worlds' | 'workshops' | 'route';
   type FilterKey = keyof CurriculumFilters;

   const FILTER_KEYS: readonly FilterKey[] = ['catalog', 'language', 'level'];
   const FILTER_NAMES: Readonly<Record<FilterKey, string>> = {
     catalog: 'catálogo',
     language: 'lenguaje',
     level: 'nivel',
   };
   const APPLIES_TO: Readonly<Record<FilterKey, readonly CurriculumTable[]>> = {
     catalog: ['catalogs', 'exercises'],
     language: ['catalogs', 'exercises', 'worlds', 'workshops'],
     level: ['catalogs', 'exercises', 'worlds', 'workshops'],
   };
   export const UNFILTERED_TABLE = 'Los filtros elegidos no cambian esta tabla.';

   function joined(names: readonly string[]): string {
     if (names.length <= 1) return names.join('');
     return `${names.slice(0, -1).join(', ')} y ${names.at(-1) ?? ''}`;
   }

   export function filterNote(
     table: CurriculumTable,
     filters: CurriculumFilters,
   ): string | undefined {
     const active = FILTER_KEYS.filter((key) => filters[key] !== '');
     if (active.length === 0) return undefined;
     const applying = active.filter((key) => APPLIES_TO[key].includes(table));
     if (applying.length === 0) return UNFILTERED_TABLE;
     return `Filtrada por ${joined(applying.map((key) => FILTER_NAMES[key]))}.`;
   }

   export function catalogOptions(
     catalogs: readonly CatalogStats[],
     selected: string,
   ): { readonly value: string; readonly label: string }[] {
     const codes = [...new Set(catalogs.map((catalog) => catalog.catalog))];
     if (selected !== '' && !codes.includes(selected)) codes.push(selected);
     return [{ value: '', label: 'Todos' }, ...codes.map((code) => ({ value: code, label: code }))];
   }
   ```

6. **`stats-failure.ts`:**

   ```ts
   import type { ApiFailure } from '../../../shared/api/http';
   import { formatWait } from '../../../shared/lib/format-wait';
   import type { FailureDescription } from '../../../shared/ui/form';
   import { reactionTo } from './react-to-failure';

   export const PERIOD_FIELDS = ['from', 'to', 'granularity'] as const;

   const PERIOD_FIELD_NAMES: readonly string[] = PERIOD_FIELDS;
   const UNPROCESSABLE = 422;
   const STATS_TIMEOUT = 'stats_timeout';

   export function isPeriodRejection(failure: ApiFailure): boolean {
     if (failure.kind !== 'response' || failure.status !== UNPROCESSABLE) return false;
     return Object.keys(failure.fieldErrors).some((field) => PERIOD_FIELD_NAMES.includes(field));
   }

   export function describeStatsFailure(
     failure: ApiFailure,
     notFoundMessage: string,
   ): FailureDescription | null {
     const reaction = reactionTo(failure, notFoundMessage);
     if (reaction.kind !== 'show') return null;
     if (failure.kind !== 'response' || failure.code !== STATS_TIMEOUT) return reaction.description;
     const seconds = failure.retryAfterSeconds;
     if (seconds === null) return reaction.description;
     return {
       ...reaction.description,
       generalMessages: [failure.message, `Podés volver a intentar en ${formatWait(seconds)}.`],
       retryAfterSeconds: seconds,
     };
   }
   ```

7. **`content-titles.ts`.** `TitleSource` es la forma mínima que `Content` de `app/content` cumple sin conversión (research, R7). `lazyTitles` arma los mapas la primera vez que alguien pide un título, así que el contenedor puede montarlo antes de que haga falta y una spec que nunca abre la sección no lee el contenido:

   ```ts
   import { PROJECT_MILESTONES, milestoneId } from '../../../entities/guide';
   import type { RouteMarkKind } from './usage-types';

   export type OptionOwner = 'exercise' | 'world' | 'workshop' | 'step';

   export interface ContentTitles {
     exercise(id: string): string;
     test(exerciseId: string, testKey: string): string;
     world(id: string): string;
     workshop(id: string): string;
     routeItem(kind: RouteMarkKind, key: string): string;
     option(owner: OptionOwner, ownerId: string, option: number): string;
   }

   interface OptionsSource {
     readonly options: readonly string[];
   }

   export interface ExerciseTitleSource {
     readonly id: string;
     readonly title: string;
     readonly tests: readonly { readonly id: string; readonly label: string }[];
     readonly prediction: OptionsSource;
   }

   export interface WorldTitleSource {
     readonly id: string;
     readonly title: string;
     readonly checkpoint: OptionsSource;
   }

   export interface WorkshopTitleSource {
     readonly id: string;
     readonly title?: unknown;
     readonly prediction: OptionsSource;
   }

   export interface StepTitleSource {
     readonly id: string;
     readonly title: string;
     readonly quiz: OptionsSource;
   }

   export interface TitleSource {
     readonly lab: Readonly<Record<string, readonly ExerciseTitleSource[]>>;
     readonly quests: Readonly<Record<string, readonly ExerciseTitleSource[]>>;
     readonly cores: Readonly<Record<string, readonly ExerciseTitleSource[]>>;
     readonly campaign: Readonly<Record<string, readonly WorldTitleSource[]>>;
     readonly workshops: Readonly<Record<string, readonly WorkshopTitleSource[]>>;
     readonly guide: {
       readonly resources: readonly { readonly id: string; readonly title: string }[];
       readonly tracks: Readonly<
         Record<string, { readonly modules: readonly { readonly steps: readonly StepTitleSource[] }[] }>
       >;
     };
   }

   interface Titled {
     readonly title: string;
     readonly options: readonly string[];
   }

   interface TitledExercise extends Titled {
     readonly tests: ReadonlyMap<string, string>;
   }

   const GUIDE_LANGUAGES = ['rust', 'go'] as const;
   const EMPTY_SOURCE: TitleSource = {
     lab: {},
     quests: {},
     cores: {},
     campaign: {},
     workshops: {},
     guide: { resources: [], tracks: {} },
   };

   function listsOf<T>(groups: Readonly<Record<string, readonly T[]>>): T[] {
     return Object.values(groups).flat();
   }

   function exercisesOf(source: TitleSource): Map<string, TitledExercise> {
     const all = [...listsOf(source.lab), ...listsOf(source.quests), ...listsOf(source.cores)];
     return new Map(
       all.map((exercise): [string, TitledExercise] => [
         exercise.id,
         {
           title: exercise.title,
           options: exercise.prediction.options,
           tests: new Map(exercise.tests.map((test): [string, string] => [test.id, test.label])),
         },
       ]),
     );
   }

   function stepsOf(source: TitleSource): Map<string, Titled> {
     const steps = Object.values(source.guide.tracks).flatMap((track) =>
       track.modules.flatMap((module) => module.steps),
     );
     return new Map(
       steps.map((step): [string, Titled] => [step.id, { title: step.title, options: step.quiz.options }]),
     );
   }

   function milestoneTitles(): Map<string, string> {
     return new Map(
       GUIDE_LANGUAGES.flatMap((language) =>
         PROJECT_MILESTONES.map((milestone): [string, string] => [
           milestoneId(language, milestone),
           milestone.title,
         ]),
       ),
     );
   }

   export function buildContentTitles(source: TitleSource): ContentTitles {
     const exercises = exercisesOf(source);
     const worlds = new Map(
       listsOf(source.campaign).map((world): [string, Titled] => [
         world.id,
         { title: world.title, options: world.checkpoint.options },
       ]),
     );
     const workshops = new Map(
       listsOf(source.workshops).map((workshop): [string, Titled] => [
         workshop.id,
         {
           title: typeof workshop.title === 'string' ? workshop.title : workshop.id,
           options: workshop.prediction.options,
         },
       ]),
     );
     const steps = stepsOf(source);
     const owners: Readonly<Record<OptionOwner, ReadonlyMap<string, Titled>>> = {
       exercise: exercises,
       world: worlds,
       workshop: workshops,
       step: steps,
     };
     const routeItems: Readonly<Record<RouteMarkKind, ReadonlyMap<string, string>>> = {
       step: new Map([...steps].map(([id, step]): [string, string] => [id, step.title])),
       milestone: milestoneTitles(),
       favorite: new Map(
         source.guide.resources.map((resource): [string, string] => [resource.id, resource.title]),
       ),
     };
     return {
       exercise: (id) => exercises.get(id)?.title ?? id,
       test: (exerciseId, testKey) => exercises.get(exerciseId)?.tests.get(testKey) ?? testKey,
       world: (id) => worlds.get(id)?.title ?? id,
       workshop: (id) => workshops.get(id)?.title ?? id,
       routeItem: (kind, key) => routeItems[kind].get(key) ?? key,
       option: (owner, ownerId, option) =>
         owners[owner].get(ownerId)?.options[option] ?? `Opción ${option + 1}`,
     };
   }

   export const ID_TITLES: ContentTitles = buildContentTitles(EMPTY_SOURCE);

   export function lazyTitles(source: () => TitleSource): () => ContentTitles {
     let titles: ContentTitles | null = null;
     return () => {
       titles ??= buildContentTitles(source());
       return titles;
     };
   }
   ```

8. **Correr** `npm run test:unit -- frontend/src/pages/admin/model`, en verde, y después `npm run typecheck` y `npm run lint` (ninguna función pasa de 10).
9. **Commit:** `feat(front): las reglas de las estadísticas: el período, las tasas, los órdenes, los filtros, las fallas y los títulos`.

### Tarea 1.5 · El gráfico como datos y las opciones de uPlot, en rojo (T007, C, después de T002)

**Archivos:** los stubs de `frontend/src/pages/admin/model/bar-chart.ts` (las constantes con su valor final y las dos funciones que lanzan) y de `frontend/src/pages/admin/lib/bar-plot-options.ts`, con `bar-chart.spec.ts` y `bar-plot-options.spec.ts`.

**Consume:** los tipos de `uplot` (`import type`). **Produce:** `BarChart`, `stackSeries`, `chartWidth`, `plotData` y `barPlotOptions` del contrato.

1. **`bar-chart.spec.ts`.** Los anchos salen de research (R5): 6 px por intervalo y 60 del eje:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { chartWidth, stackSeries } from './bar-chart';

   describe('the bar chart', () => {
     it('stacks each series on the ones before it', () => {
       expect(
         stackSeries([
           [1, 0, 2],
           [2, 1, 0],
           [0, 3, 1],
         ]),
       ).toEqual([
         [1, 0, 2],
         [3, 1, 2],
         [3, 4, 3],
       ]);
     });

     it('takes the width of its frame unless the bars would be thinner than their minimum', () => {
       expect(chartWidth(1100, 7)).toBe(1100);
       expect(chartWidth(320.6, 10)).toBe(320);
       expect(chartWidth(320, 366)).toBe(2256);
     });
   });
   ```

2. **`bar-plot-options.spec.ts`.** Prueba en `node` lo que recibe uPlot, sin evaluarlo:

   ```ts
   import type uPlot from 'uplot';
   import { describe, expect, it } from 'vitest';
   import type { BarChart } from '../model/bar-chart';
   import { barPlotOptions, plotData, type PlotColors } from './bar-plot-options';

   const NO_PLOT = {} as uPlot;
   const BARS: uPlot.Series.PathBuilder = () => null;
   const COLORS: PlotColors = {
     green: '#38614a',
     accent: '#ac4829',
     'accent-dark': '#86341d',
     muted: '#656b60',
     ink: '#272c28',
     line: '#dddcd2',
   };
   const STACKED: BarChart = {
     title: 'Intentos por resultado',
     labels: ['1/10', '2/10'],
     series: [
       { label: 'Aprobado', token: 'green', values: [1, 0] },
       { label: 'No pasó las pruebas', token: 'accent', values: [2, 1] },
     ],
     stacked: true,
   };
   const SINGLE: BarChart = {
     title: 'Alumnos que ejecutaron',
     labels: ['1/10', '2/10'],
     series: [{ label: 'Alumnos que ejecutaron', token: 'accent', values: [1, 3] }],
     stacked: false,
   };

   describe('what uPlot receives', () => {
     it('turns off its cursor, selection and legend, and keeps the size it is given', () => {
       const options = barPlotOptions(STACKED, { width: 600, height: 220 }, COLORS, BARS);
       expect(options.width).toBe(600);
       expect(options.height).toBe(220);
       expect(options.cursor?.show).toBe(false);
       expect(options.select?.show).toBe(false);
       expect(options.legend?.show).toBe(false);
     });

     it('draws the x axis as indexes, not as time, labelled with the dates of the period', () => {
       const options = barPlotOptions(STACKED, { width: 600, height: 220 }, COLORS, BARS);
       expect(options.scales?.x?.time).toBe(false);
       const range = options.scales?.x?.range;
       if (typeof range !== 'function') throw new Error('the x range must be a function');
       expect(range(NO_PLOT, 0, 6, 'x')).toEqual([-0.5, 6.5]);
       const values = options.axes?.[0]?.values;
       if (typeof values !== 'function') throw new Error('the x values must be a function');
       expect(values(NO_PLOT, [0, 0.5, 1, 2], 0, 50, 1)).toEqual(['1/10', '', '2/10', '']);
     });

     it('starts the y axis at zero, also when there is nothing', () => {
       const range = barPlotOptions(STACKED, { width: 600, height: 220 }, COLORS, BARS).scales?.y
         ?.range;
       if (typeof range !== 'function') throw new Error('the y range must be a function');
       expect(range(NO_PLOT, 0, 0, 'y')).toEqual([0, 1]);
       expect(range(NO_PLOT, 0, 12, 'y')).toEqual([0, 12]);
     });

     it('draws stacked bars from the tallest down, with the colors of their tokens', () => {
       const options = barPlotOptions(STACKED, { width: 600, height: 220 }, COLORS, BARS);
       expect(options.series.map((series) => series.label)).toEqual([
         undefined,
         'No pasó las pruebas',
         'Aprobado',
       ]);
       expect(options.series[1]?.fill).toBe('#ac4829');
       expect(options.series[2]?.stroke).toBe('#38614a');
       expect(options.series[1]?.paths).toBe(BARS);
       expect(plotData(STACKED)).toEqual([
         [0, 1],
         [3, 1],
         [1, 0],
       ]);
     });

     it('draws a single series as it came', () => {
       expect(plotData(SINGLE)).toEqual([
         [0, 1],
         [1, 3],
       ]);
       expect(barPlotOptions(SINGLE, { width: 600, height: 220 }, COLORS, BARS).series).toHaveLength(2);
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/bar-chart.spec.ts frontend/src/pages/admin/lib/bar-plot-options.spec.ts`: en rojo, por `not implemented`.
4. **Commit:** `test(front): specs del gráfico de barras y de lo que recibe uPlot, en rojo`.

### Tarea 1.6 · El gráfico de barras, el módulo de uPlot y los globals que pide (T008, C)

**Archivos:** `frontend/src/pages/admin/model/bar-chart.ts`, `frontend/src/pages/admin/lib/bar-plot-options.ts`, `frontend/src/pages/admin/lib/plot.ts`, `frontend/src/vitest.setup.ts` y `qa/lib/boot-harness.ts`.

1. **`bar-chart.ts`:**

   ```ts
   export type ColorToken = 'green' | 'accent' | 'accent-dark' | 'muted' | 'ink' | 'line';

   export interface BarSeries {
     readonly label: string;
     readonly token: ColorToken;
     readonly values: readonly number[];
   }

   export interface BarChart {
     readonly title: string;
     readonly labels: readonly string[];
     readonly series: readonly BarSeries[];
     readonly stacked: boolean;
   }

   export const CHART_HEIGHT = 220;
   export const MIN_SLOT_PX = 6;
   export const Y_AXIS_PX = 60;

   export function stackSeries(values: readonly (readonly number[])[]): number[][] {
     const stacked: number[][] = [];
     values.forEach((series, index) => {
       const below = stacked[index - 1];
       stacked.push(series.map((value, point) => value + (below?.[point] ?? 0)));
     });
     return stacked;
   }

   export function chartWidth(containerWidth: number, bars: number): number {
     return Math.max(Math.floor(containerWidth), bars * MIN_SLOT_PX + Y_AXIS_PX);
   }
   ```

2. **`bar-plot-options.ts`.** Importa de `uplot` sólo tipos (research, R4 y R5):

   ```ts
   import type uPlot from 'uplot';
   import { stackSeries, type BarChart, type BarSeries, type ColorToken } from '../model/bar-chart';

   export interface PlotSize {
     readonly width: number;
     readonly height: number;
   }

   export type PlotColors = Readonly<Record<ColorToken, string>>;

   const X_STEPS = [1, 2, 5, 7, 14, 30, 61, 91, 183, 366];
   const Y_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

   function drawnSeries(chart: BarChart): BarSeries[] {
     if (!chart.stacked) return [...chart.series];
     const stacked = stackSeries(chart.series.map((series) => series.values));
     return chart.series
       .map((series, index) => ({ ...series, values: stacked[index] ?? [] }))
       .reverse();
   }

   function labelAt(labels: readonly string[], split: number): string {
     return Number.isInteger(split) ? (labels[split] ?? '') : '';
   }

   export function plotData(chart: BarChart): uPlot.AlignedData {
     return [
       chart.labels.map((label, index) => index),
       ...drawnSeries(chart).map((series) => [...series.values]),
     ];
   }

   export function barPlotOptions(
     chart: BarChart,
     size: PlotSize,
     colors: PlotColors,
     bars: uPlot.Series.PathBuilder | undefined,
   ): uPlot.Options {
     return {
       width: size.width,
       height: size.height,
       cursor: { show: false },
       select: { show: false, left: 0, top: 0, width: 0, height: 0 },
       legend: { show: false },
       scales: {
         x: { time: false, range: (self, min, max) => [min - 0.5, max + 0.5] },
         y: { range: (self, min, max) => [0, Math.max(1, max)] },
       },
       axes: [
         {
           stroke: colors.muted,
           grid: { show: false },
           incrs: X_STEPS,
           values: (self, splits) => splits.map((split) => labelAt(chart.labels, split)),
         },
         { stroke: colors.muted, grid: { stroke: colors.line }, incrs: Y_STEPS },
       ],
       series: [
         {},
         ...drawnSeries(chart).map((series) => ({
           label: series.label,
           stroke: colors[series.token],
           fill: colors[series.token],
           width: 1,
           paths: bars,
           points: { show: false },
         })),
       ],
     };
   }
   ```

3. **`plot.ts`,** el único módulo que importa `uplot` en tiempo de ejecución. Su primer bloque es la licencia del paquete instalado, como `/*! … */`, que el minificador conserva (`frontend/vite.config.ts`, `comments: { legal: true }`). Se arma con este comando y no se escribe a mano:

   ```sh
   { printf '/*!\n'; cat node_modules/uplot/LICENSE; printf '*/\n'; } > frontend/src/pages/admin/lib/plot.ts
   ```

   Después, a continuación de ese bloque:

   ```ts
   import uPlot from 'uplot';
   import 'uplot/dist/uPlot.min.css';
   import { CHART_HEIGHT, chartWidth, type BarChart, type ColorToken } from '../model/bar-chart';
   import { barPlotOptions, plotData, type PlotColors, type PlotSize } from './bar-plot-options';

   const BAR_SIZE: [number, number] = [0.7, 40];

   function readColors(element: HTMLElement): PlotColors {
     const style = getComputedStyle(element);
     const read = (token: ColorToken): string => style.getPropertyValue(`--${token}`).trim();
     return {
       green: read('green'),
       accent: read('accent'),
       'accent-dark': read('accent-dark'),
       muted: read('muted'),
       ink: read('ink'),
       line: read('line'),
     };
   }

   export function drawBarChart(host: HTMLElement, frame: HTMLElement, chart: BarChart): () => void {
     const sizeFor = (width: number): PlotSize => ({
       width: chartWidth(width, chart.labels.length),
       height: CHART_HEIGHT,
     });
     const bars = uPlot.paths.bars?.({ size: BAR_SIZE });
     const plot = new uPlot(
       barPlotOptions(chart, sizeFor(frame.clientWidth), readColors(host), bars),
       plotData(chart),
       host,
     );
     const observer = new ResizeObserver(() => plot.setSize(sizeFor(frame.clientWidth)));
     observer.observe(frame);
     return () => {
       observer.disconnect();
       plot.destroy();
     };
   }
   ```

4. **`frontend/src/vitest.setup.ts`.** uPlot llama a `matchMedia` al evaluarse, como global suelto y no como `window.matchMedia`, y jsdom 30.1.2 no lo tiene (research, R3). Por eso va en `globalThis`, que alcanza a los dos. Con esto, la spec de F12a que monta la página sin mocks puede importar la sección:

   ```ts
   import '@testing-library/jest-dom/vitest';
   import { cleanup } from '@testing-library/react';
   import { afterEach } from 'vitest';

   function matchNothing(query: string): MediaQueryList {
     return {
       matches: false,
       media: query,
       onchange: null,
       addListener: () => undefined,
       removeListener: () => undefined,
       addEventListener: () => undefined,
       removeEventListener: () => undefined,
       dispatchEvent: () => false,
     };
   }

   if (typeof globalThis.matchMedia !== 'function') {
     Object.defineProperty(globalThis, 'matchMedia', {
       configurable: true,
       writable: true,
       value: matchNothing,
     });
   }

   afterEach(() => {
     cleanup();
   });
   ```

5. **`qa/lib/boot-harness.ts`.** El contexto que comparten `boot-check` y `dist-content-check` suma, después de `CustomEvent,`, las dos líneas que uPlot lee al evaluarse. Ningún escenario cambia:

   ```diff
        Event,
        CustomEvent,
   +    devicePixelRatio: 1,
   +    matchMedia: () => ({
   +      matches: false,
   +      addEventListener: () => undefined,
   +      removeEventListener: () => undefined,
   +    }),
        MutationObserver: class {
   ```

6. **Correr:**
   - `npm run test:unit -- frontend/src/pages/admin/model/bar-chart.spec.ts frontend/src/pages/admin/lib/bar-plot-options.spec.ts`, en verde;
   - `npm run typecheck`, que contrasta `bar-plot-options.ts` y `plot.ts` con `uPlot.d.ts`. Si una opción no tipa, se ajusta el tipo sin cambiar el comportamiento y se avisa (research, «Lo que no se verificó»);
   - `npm run lint`;
   - `node qa/boot-check.ts` y `node qa/dist-content-check.ts`, en verde y con la misma cuenta de T001: uPlot todavía no está en el bundle.
7. **Commit:** `feat(front): el gráfico de barras y el único módulo que dibuja con uPlot`.

### Tarea 1.7 · Los pedidos de la sección, en rojo (T009, A)

**Archivos:** el stub de `frontend/src/pages/admin/api/usage-endpoints.ts`, `usage-endpoints.spec.ts` y, en `admin-endpoints.ts` de F12a, la palabra `export` delante de `function decode`.

**Consume:** de F11a, `createApiClient` y `createFakeFetch`; de T003, las fábricas. **Produce:** las firmas de «`pages/admin/api`» del contrato.

1. **`admin-endpoints.ts`,** un solo cambio, para que las dos API del slice decodifiquen igual:

   ```diff
   -function decode<T>(result: ApiResult, parse: (body: unknown) => T | null): AdminOutcome<T> {
   +export function decode<T>(result: ApiResult, parse: (body: unknown) => T | null): AdminOutcome<T> {
   ```

2. **`usage-endpoints.spec.ts`.** Las rutas y los parámetros salen del contrato de C5 (§2 a §4, §8 y §9):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import {
     curriculumFactory,
     overviewFactory,
     queueFactory,
     runsBody,
     statsBody,
   } from '../model/usage.factory';
   import { getCurriculumStats, getOverview, getQueue, listRuns } from './usage-endpoints';

   const SIGNAL = new AbortController().signal;
   const TIMEOUT_MESSAGE = 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.';

   function clientWith(reply: FakeReply) {
     const fake = createFakeFetch([reply]);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     return { client, calls: fake.calls };
   }

   function requestOf(path: string | undefined) {
     const url = new URL(path ?? '', 'http://taller');
     return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
   }

   describe('the requests of «Uso del taller»', () => {
     it('asks for the overview without a period the first time, as a plain GET', async () => {
       const { client, calls } = clientWith({ status: 200, json: statsBody(overviewFactory.build()) });
       const outcome = await getOverview(client, null, SIGNAL);
       expect(outcome.ok).toBe(true);
       expect(calls[0]?.path).toBe('/api/admin/stats/overview');
       expect(calls[0]?.method).toBe('GET');
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });

     it('sends the chosen period', async () => {
       const { client, calls } = clientWith({ status: 200, json: statsBody(overviewFactory.build()) });
       await getOverview(client, { from: '2026-09-01', to: '2026-09-30', granularity: 'week' }, SIGNAL);
       expect(requestOf(calls[0]?.path)).toEqual({
         pathname: '/api/admin/stats/overview',
         query: { from: '2026-09-01', to: '2026-09-30', granularity: 'week' },
       });
     });

     it('sends only the filters that were chosen', async () => {
       const { client, calls } = clientWith({
         status: 200,
         json: statsBody(curriculumFactory.build()),
       });
       await getCurriculumStats(client, null, { catalog: 'lab', language: 'rust', level: '' }, SIGNAL);
       expect(requestOf(calls[0]?.path)).toEqual({
         pathname: '/api/admin/stats/exercises',
         query: { catalog: 'lab', language: 'rust' },
       });
     });

     it('asks for the queue', async () => {
       const { client, calls } = clientWith({ status: 200, json: queueFactory.build() });
       const outcome = await getQueue(client, SIGNAL);
       expect(outcome.ok).toBe(true);
       expect(calls[0]?.path).toBe('/api/admin/queue');
     });

     it('pages the runs with the cursor and trims the exercise', async () => {
       const { client, calls } = clientWith({ status: 200, json: runsBody([]) });
       await listRuns(
         client,
         { status: 'infra_error', exercise: ' rust-01 ', since: '' },
         '019a0000-0000-7000-8000-000000000002',
         SIGNAL,
       );
       expect(requestOf(calls[0]?.path)).toEqual({
         pathname: '/api/admin/runs',
         query: {
           status: 'infra_error',
           exercise: 'rust-01',
           cursor: '019a0000-0000-7000-8000-000000000002',
         },
       });
     });

     it('turns a body outside the contract into an unexpected failure', async () => {
       const { client } = clientWith({ status: 200, json: { data: [] } });
       expect(await getQueue(client, SIGNAL)).toEqual({
         ok: false,
         failure: { kind: 'unexpected', status: 200 },
       });
     });

     it('passes a stats timeout through with its wait', async () => {
       const { client } = clientWith({
         status: 503,
         json: { message: TIMEOUT_MESSAGE, code: 'stats_timeout' },
         headers: { 'Retry-After': '30' },
       });
       expect(await getOverview(client, null, SIGNAL)).toEqual({
         ok: false,
         failure: {
           kind: 'response',
           status: 503,
           code: 'stats_timeout',
           message: TIMEOUT_MESSAGE,
           fieldErrors: {},
           retryAfterSeconds: 30,
         },
       });
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/api/usage-endpoints.spec.ts`: en rojo, por `not implemented`. Las specs de F12a de `admin-endpoints` siguen en verde.
4. **Commit:** `test(front): specs de los pedidos de las estadísticas, en rojo`.

### Tarea 1.8 · Los pedidos de la sección (T010, A)

**Archivos:** `frontend/src/pages/admin/api/usage-endpoints.ts`.

1. **`usage-endpoints.ts`.** Todo es `GET`, sin `asUser`, y la query no lleva los valores vacíos:

   ```ts
   import type { ApiClient } from '../../../shared/api/http';
   import {
     parseCurriculumStats,
     parseOverview,
     parseQueue,
     parseRunsPage,
   } from '../model/parse-usage';
   import type { AdminOutcome } from '../model/types';
   import type {
     CurriculumFilters,
     CurriculumStats,
     Overview,
     PeriodRequest,
     QueueStats,
     RunFilters,
     RunsPage,
     Stats,
   } from '../model/usage-types';
   import { decode } from './admin-endpoints';

   function withQuery(path: string, params: Readonly<Record<string, string>>): string {
     const query = new URLSearchParams(
       Object.entries(params).filter(([, value]) => value !== ''),
     ).toString();
     return query === '' ? path : `${path}?${query}`;
   }

   function periodParams(period: PeriodRequest | null): Record<string, string> {
     if (period === null) return {};
     return { from: period.from, to: period.to, granularity: period.granularity };
   }

   export async function getOverview(
     client: ApiClient,
     period: PeriodRequest | null,
     signal: AbortSignal,
   ): Promise<AdminOutcome<Stats<Overview>>> {
     const path = withQuery('/api/admin/stats/overview', periodParams(period));
     return decode(await client.get(path, { signal }), parseOverview);
   }

   export async function getCurriculumStats(
     client: ApiClient,
     period: PeriodRequest | null,
     filters: CurriculumFilters,
     signal: AbortSignal,
   ): Promise<AdminOutcome<Stats<CurriculumStats>>> {
     const path = withQuery('/api/admin/stats/exercises', {
       ...periodParams(period),
       catalog: filters.catalog,
       language: filters.language,
       level: filters.level,
     });
     return decode(await client.get(path, { signal }), parseCurriculumStats);
   }

   export async function getQueue(
     client: ApiClient,
     signal: AbortSignal,
   ): Promise<AdminOutcome<QueueStats>> {
     return decode(await client.get('/api/admin/queue', { signal }), parseQueue);
   }

   export async function listRuns(
     client: ApiClient,
     filters: RunFilters,
     cursor: string | null,
     signal: AbortSignal,
   ): Promise<AdminOutcome<RunsPage>> {
     const path = withQuery('/api/admin/runs', {
       status: filters.status,
       exercise: filters.exercise.trim(),
       since: filters.since,
       cursor: cursor ?? '',
     });
     return decode(await client.get(path, { signal }), parseRunsPage);
   }
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/api`, en verde (también las de F12a), y después `npm run typecheck` y `npm run lint`.
3. **Commit:** `feat(front): los pedidos de las estadísticas a C5`.

### Tarea 1.9 · La compuerta de U1 (T011, K)

- **Desde S1:** M, C y A entregaron.
- **La compuerta:**
  - `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`, en verde;
  - el tamaño de `dist/index.html`, igual al de T001: nadie importa la sección todavía;
  - `git grep -n "from 'uplot'" -- frontend/src` imprime sólo `lib/plot.ts`, y como `import type`, `lib/bar-plot-options.ts` y su spec;
  - los avisos de complejidad, los de T001.
- **El PR:** `feat(front): usage model, bar chart and C5 requests (F14a U1)`, contra `f14a/base`.

**Reversión de U1:** se revierten T010 a T003, en orden inverso. T008 se revierte con su cambio del arnés y del setup.

## 2. U2 · Los hooks y las piezas de interfaz (onda 2: H; onda 2b: K)

**Cubre:** FR-004, FR-005, FR-041 a FR-055 en las piezas, FR-044 (un pedido por cambio, cancelado), FR-049 a FR-051 y FR-063 (la capa `dom` del gráfico).

### Tarea 2.1 · Los hooks y los contextos, en rojo (T012, H, desde S1)

**Archivos:** en `frontend/src/pages/admin/`, la ayuda `ui/usage-fetch.ts` (entera), los stubs de `lib/use-stats-request.ts`, `lib/use-runs-pages.ts`, `ui/period-context.tsx` y `ui/content-titles-context.tsx`, y `ui/usage-hooks.spec.tsx`.

**Consume:** de F12a, `recoverSession` (`lib/recover-session.ts`) y `AdminOutcome`; de F11a, `useRetryCountdown`, `FetchLike` y `FakeReply`; de T006, `ID_TITLES` y `lazyTitles`. **Produce:** «`pages/admin/lib`» y los dos contextos del contrato.

1. **`ui/usage-fetch.ts`,** la ayuda de las specs de la sección. Contesta por ruta, acepta una respuesta que todavía no llegó y guarda la señal de cada pedido. No es una spec: Vitest no la corre, y ningún módulo de producción la importa:

   ```ts
   import type { FetchLike } from '../../../shared/api/http';
   import type { FakeReply } from '../../../shared/api/http/fake-fetch';

   export type RoutedReply = FakeReply | Promise<FakeReply>;

   export interface RoutedCall {
     readonly path: string;
     readonly query: Readonly<Record<string, string>>;
     readonly signal: AbortSignal | undefined;
   }

   export interface RoutedFetch {
     readonly fetch: FetchLike;
     readonly calls: RoutedCall[];
     callsTo(path: string): RoutedCall[];
   }

   export interface Deferred<T> {
     readonly promise: Promise<T>;
     resolve(value: T): void;
   }

   export function deferred<T>(): Deferred<T> {
     let settle: (value: T) => void = () => undefined;
     const promise = new Promise<T>((resolve) => {
       settle = resolve;
     });
     return { promise, resolve: (value) => settle(value) };
   }

   function responseOf(reply: FakeReply): Response {
     const body = reply.json === undefined ? (reply.text ?? '') : JSON.stringify(reply.json);
     return new Response(body, { status: reply.status, headers: reply.headers });
   }

   export function routeFetch(routes: Readonly<Record<string, readonly RoutedReply[]>>): RoutedFetch {
     const calls: RoutedCall[] = [];
     const served = new Map<string, number>();
     const fetch: FetchLike = async (input, init) => {
       const url = new URL(input, 'http://taller');
       calls.push({
         path: url.pathname,
         query: Object.fromEntries(url.searchParams),
         signal: init.signal ?? undefined,
       });
       const replies = routes[url.pathname] ?? [];
       const index = served.get(url.pathname) ?? 0;
       served.set(url.pathname, index + 1);
       const reply = replies[Math.min(index, replies.length - 1)];
       if (reply === undefined) throw new Error(`routeFetch has no reply for ${url.pathname}`);
       const settled = await reply;
       if (init.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
       return responseOf(settled);
     };
     return { fetch, calls, callsTo: (path) => calls.filter((call) => call.path === path) };
   }
   ```

2. **`ui/usage-hooks.spec.tsx`.** Cubre FR-044, FR-050 y FR-051 en los hooks, y la parte del hook de la Review Focus 3:

   ```tsx
   import { act, renderHook, waitFor } from '@testing-library/react';
   import type { ReactNode } from 'react';
   import { afterEach, describe, expect, it, vi } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import useRunsPages, { type RunsLoader } from '../lib/use-runs-pages';
   import useStatsRequest, { type StatsLoader } from '../lib/use-stats-request';
   import type { AdminOutcome } from '../model/types';
   import type { RunsPage } from '../model/usage-types';
   import { useContentTitles } from './content-titles-context';
   import { PeriodProvider, usePeriod } from './period-context';
   import { deferred } from './usage-fetch';

   const TIMEOUT: ApiFailure = {
     kind: 'response',
     status: 503,
     code: 'stats_timeout',
     message: 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.',
     fieldErrors: {},
     retryAfterSeconds: 30,
   };

   function pageWith(nextCursor: string | null): RunsPage {
     return { runs: [], nextCursor, retentionDays: 14 };
   }

   afterEach(() => {
     vi.useRealTimers();
     vi.restoreAllMocks();
   });

   describe('a request of the statistics', () => {
     it('asks once per loader and keeps the last answer while the next one arrives', async () => {
       const next = deferred<AdminOutcome<string>>();
       const first = vi.fn<StatsLoader<string>>(() => Promise.resolve({ ok: true, value: 'first' }));
       const second = vi.fn<StatsLoader<string>>(() => next.promise);
       const { result, rerender } = renderHook(({ load }) => useStatsRequest(load, 1), {
         initialProps: { load: first },
       });
       await waitFor(() => expect(result.current.data).toBe('first'));
       expect(result.current.loading).toBe(false);
       rerender({ load: second });
       expect(result.current.loading).toBe(true);
       expect(result.current.data).toBe('first');
       await act(async () => next.resolve({ ok: true, value: 'second' }));
       expect(result.current.data).toBe('second');
       expect(first).toHaveBeenCalledOnce();
       expect(second).toHaveBeenCalledOnce();
     });

     it('cancels a request that is no longer wanted and draws nothing from it', async () => {
       const late = deferred<AdminOutcome<string>>();
       const signals: AbortSignal[] = [];
       const first = vi.fn<StatsLoader<string>>((signal) => {
         signals.push(signal);
         return late.promise;
       });
       const second = vi.fn<StatsLoader<string>>(() => Promise.resolve({ ok: true, value: 'second' }));
       const { result, rerender } = renderHook(({ load }) => useStatsRequest(load, 1), {
         initialProps: { load: first },
       });
       rerender({ load: second });
       await waitFor(() => expect(result.current.data).toBe('second'));
       expect(signals[0]?.aborted).toBe(true);
       await act(async () => late.resolve({ ok: true, value: 'first' }));
       expect(result.current.data).toBe('second');
     });

     it('waits the Retry-After of a failure before letting it retry, and asks again on reload', async () => {
       vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
       const load = vi.fn<StatsLoader<string>>(() => Promise.resolve({ ok: false, failure: TIMEOUT }));
       const { result } = renderHook(() => useStatsRequest(load, 1));
       await vi.waitFor(() => expect(result.current.failure).toEqual(TIMEOUT));
       expect(result.current.waiting).toBe(true);
       act(() => vi.advanceTimersByTime(30_000));
       expect(result.current.waiting).toBe(false);
       act(() => result.current.reload());
       await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
     });
   });

   describe('the pages of runs', () => {
     it('goes to older pages with the cursor and back to the newest, and a new loader starts over', async () => {
       const asked: string[] = [];
       const loaderFor = (filter: string) =>
         vi.fn<RunsLoader>((cursor) => {
           asked.push(`${filter}:${cursor ?? 'first'}`);
           return Promise.resolve({ ok: true, value: pageWith(cursor === null ? 'c-2' : null) });
         });
       const all = loaderFor('all');
       const { result, rerender } = renderHook(({ load }) => useRunsPages(load, 1), {
         initialProps: { load: all },
       });
       await waitFor(() => expect(result.current.data?.nextCursor).toBe('c-2'));
       expect(result.current.first).toBe(true);
       act(() => result.current.older());
       await waitFor(() => expect(result.current.data?.nextCursor).toBeNull());
       expect(result.current.first).toBe(false);
       act(() => result.current.newest());
       await waitFor(() => expect(asked).toHaveLength(3));
       rerender({ load: loaderFor('failed') });
       await waitFor(() => expect(asked).toHaveLength(4));
       expect(asked).toEqual(['all:first', 'all:c-2', 'all:first', 'failed:first']);
     });
   });

   describe('the contexts of the section', () => {
     it('starts without a period, shares the chosen one and exists only inside its provider', () => {
       const wrapper = ({ children }: { readonly children: ReactNode }) => (
         <PeriodProvider>{children}</PeriodProvider>
       );
       const { result } = renderHook(() => usePeriod(), { wrapper });
       expect(result.current.period).toBeNull();
       act(() => result.current.choose({ from: '2026-10-01', to: '2026-10-07', granularity: 'week' }));
       expect(result.current.period).toEqual({
         from: '2026-10-01',
         to: '2026-10-07',
         granularity: 'week',
       });
       vi.spyOn(console, 'error').mockImplementation(() => undefined);
       expect(() => renderHook(() => usePeriod())).toThrow('Falta PeriodProvider');
     });

     it('gives the ids when nobody provides the titles', () => {
       const { result } = renderHook(() => useContentTitles());
       expect(result.current.exercise('rust-01')).toBe('rust-01');
       expect(result.current.option('exercise', 'rust-01', 0)).toBe('Opción 1');
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/usage-hooks.spec.tsx`: en rojo, por `not implemented`.
4. **Commit:** `test(front): specs de los pedidos y del período compartido, en rojo`.

### Tarea 2.2 · Los hooks y los contextos (T013, H)

**Archivos:** `lib/use-stats-request.ts`, `lib/use-runs-pages.ts`, `ui/period-context.tsx` y `ui/content-titles-context.tsx`, en `frontend/src/pages/admin/`.

1. **`lib/use-stats-request.ts`** (research, R8). La forma es la de `usePagedList` de F12a, sin la página:

   ```ts
   import { useCallback, useEffect, useState } from 'react';
   import type { ApiFailure } from '../../../shared/api/http';
   import { useRetryCountdown } from '../../../shared/ui/form';
   import type { AdminOutcome } from '../model/types';
   import { recoverSession } from './recover-session';

   export type StatsLoader<T> = (signal: AbortSignal) => Promise<AdminOutcome<T>>;

   export interface StatsRequest<T> {
     readonly data: T | null;
     readonly failure: ApiFailure | null;
     readonly loading: boolean;
     readonly waiting: boolean;
     reload(): void;
   }

   interface Settled<T> {
     readonly load: StatsLoader<T>;
     readonly attempt: number;
     readonly outcome: AdminOutcome<T>;
   }

   function retryAfterOf(failure: ApiFailure): number | null {
     return failure.kind === 'response' ? failure.retryAfterSeconds : null;
   }

   const useStatsRequest = <T>(load: StatsLoader<T>, ownId: number): StatsRequest<T> => {
     const [attempt, setAttempt] = useState(0);
     const [settled, setSettled] = useState<Settled<T> | null>(null);
     const { waiting, start } = useRetryCountdown();

     useEffect(() => {
       const controller = new AbortController();
       void load(controller.signal).then((outcome) => {
         if (controller.signal.aborted) return;
         setSettled({ load, attempt, outcome });
         if (outcome.ok || recoverSession(outcome.failure, ownId)) return;
         const seconds = retryAfterOf(outcome.failure);
         if (seconds !== null) start(seconds);
       });
       return () => controller.abort();
     }, [load, attempt, ownId, start]);

     const reload = useCallback(() => setAttempt((count) => count + 1), []);
     const current = settled !== null && settled.load === load && settled.attempt === attempt;
     const outcome = settled?.outcome ?? null;
     return {
       data: outcome !== null && outcome.ok ? outcome.value : null,
       failure: current && outcome !== null && !outcome.ok ? outcome.failure : null,
       loading: !current,
       waiting,
       reload,
     };
   };

   export default useStatsRequest;
   ```

2. **`lib/use-runs-pages.ts`.** La posición se guarda con el `load` al que pertenece: un `load` nuevo (otro filtro) vuelve a la primera página sin un efecto:

   ```ts
   import { useCallback, useState } from 'react';
   import type { AdminOutcome } from '../model/types';
   import type { RunsPage } from '../model/usage-types';
   import useStatsRequest, { type StatsRequest } from './use-stats-request';

   export type RunsLoader = (
     cursor: string | null,
     signal: AbortSignal,
   ) => Promise<AdminOutcome<RunsPage>>;

   export interface RunsPages extends StatsRequest<RunsPage> {
     readonly first: boolean;
     older(): void;
     newest(): void;
   }

   interface Position {
     readonly load: RunsLoader;
     readonly cursor: string | null;
   }

   const useRunsPages = (load: RunsLoader, ownId: number): RunsPages => {
     const [position, setPosition] = useState<Position>({ load, cursor: null });
     const cursor = position.load === load ? position.cursor : null;
     const pageLoad = useCallback(
       (signal: AbortSignal) => load(cursor, signal),
       [load, cursor],
     );
     const request = useStatsRequest(pageLoad, ownId);
     const nextCursor = request.data?.nextCursor ?? null;
     return {
       ...request,
       first: cursor === null,
       older: () => {
         if (nextCursor !== null) setPosition({ load, cursor: nextCursor });
       },
       newest: () => setPosition({ load, cursor: null }),
     };
   };

   export default useRunsPages;
   ```

3. **`ui/period-context.tsx`** (research, R6). Provider y hook con exports nombrados, porque los dos son públicos en el slice:

   ```tsx
   import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
   import type { PeriodRequest } from '../model/usage-types';

   export interface SharedPeriod {
     readonly period: PeriodRequest | null;
     choose(period: PeriodRequest): void;
   }

   interface PeriodProviderProps {
     readonly children: ReactNode;
   }

   const PeriodContext = createContext<SharedPeriod | null>(null);

   export const PeriodProvider = ({ children }: PeriodProviderProps) => {
     const [period, choose] = useState<PeriodRequest | null>(null);
     const shared = useMemo(() => ({ period, choose }), [period]);
     return <PeriodContext value={shared}>{children}</PeriodContext>;
   };

   export function usePeriod(): SharedPeriod {
     const shared = useContext(PeriodContext);
     if (shared === null) {
       throw new Error('Falta PeriodProvider: la página de la administración lo provee.');
     }
     return shared;
   }
   ```

4. **`ui/content-titles-context.tsx`** (research, R7). El contenedor de `app/` pasa una función que devuelve el contenido, y los títulos se arman la primera vez que alguien los pide:

   ```tsx
   import { createContext, useContext, useMemo, type ReactNode } from 'react';
   import {
     ID_TITLES,
     lazyTitles,
     type ContentTitles,
     type TitleSource,
   } from '../model/content-titles';

   interface ContentTitlesProviderProps {
     readonly source: () => TitleSource;
     readonly children: ReactNode;
   }

   const ContentTitlesContext = createContext<() => ContentTitles>(() => ID_TITLES);

   export const ContentTitlesProvider = ({ source, children }: ContentTitlesProviderProps) => {
     const read = useMemo(() => lazyTitles(source), [source]);
     return <ContentTitlesContext value={read}>{children}</ContentTitlesContext>;
   };

   export function useContentTitles(): ContentTitles {
     return useContext(ContentTitlesContext)();
   }
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/usage-hooks.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint` (`useStatsRequest` queda por debajo de 10).
6. **Commit:** `feat(front): los pedidos de las estadísticas y el período compartido de la administración`.

### Tarea 2.3 · Las piezas de interfaz, en rojo (T014, H)

**Archivos:** en `frontend/src/pages/admin/ui/`, los stubs de `StatsTable.tsx`, `Figures.tsx`, `RateCell.tsx`, `Distribution.tsx`, `StatsFailure.tsx`, `RequestState.tsx`, `AggregateNotes.tsx`, `DateField.tsx`, `PeriodForm.tsx` y `SeriesChart.tsx`, y `usage-pieces.spec.tsx`.

**Consume:** de F12a, `FailureNotice`; de F11a, `ServerError`, `showFailure`, `describeFailure`, `messagesOf` y `formatLocalDateTime`; de U1, el modelo y `lib/plot.ts`; de T013, los contextos. **Produce:** los componentes del contrato («`pages/admin/ui`»).

1. **`usage-pieces.spec.tsx`.** Cubre FR-005, FR-006, FR-041, FR-042, FR-046, FR-047, FR-050, FR-053 y FR-063. `lib/plot` se reemplaza con `vi.mock`, así que ninguna prueba de este archivo evalúa uPlot:

   ```tsx
   import { fireEvent, render, screen, within } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { beforeEach, describe, expect, it, vi } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import type { BarChart } from '../model/bar-chart';
   import type { TitleSource } from '../model/content-titles';
   import AggregateNotes from './AggregateNotes';
   import { ContentTitlesProvider } from './content-titles-context';
   import Distribution from './Distribution';
   import Figures from './Figures';
   import { PeriodProvider, usePeriod } from './period-context';
   import PeriodForm from './PeriodForm';
   import RateCell from './RateCell';
   import SeriesChart from './SeriesChart';
   import StatsFailure from './StatsFailure';
   import StatsTable from './StatsTable';

   const plot = vi.hoisted(() => ({
     dispose: vi.fn(),
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const OCTOBER = {
     from: '2026-10-01',
     to: '2026-10-07',
     granularity: 'day',
     timezone: 'America/Argentina/Buenos_Aires',
   } as const;
   const SOURCE: TitleSource = {
     lab: {
       rust: [
         {
           id: 'rust-01',
           title: 'La energía del reactor',
           tests: [],
           prediction: { options: ['Devuelve 21 siempre', 'No compila', 'Ignora el punto y coma'] },
         },
       ],
     },
     quests: {},
     cores: {},
     campaign: {},
     workshops: {},
     guide: { resources: [], tracks: {} },
   };

   const ChosenPeriod = () => {
     const { period } = usePeriod();
     return <p aria-label="Período elegido">{JSON.stringify(period)}</p>;
   };

   function renderForm(failure: ApiFailure | null, withGranularity = true) {
     render(
       <PeriodProvider>
         <PeriodForm shown={OCTOBER} withGranularity={withGranularity} failure={failure} />
         <ChosenPeriod />
       </PeriodProvider>,
     );
     return userEvent.setup();
   }

   beforeEach(() => {
     plot.drawBarChart.mockReset();
     plot.dispose.mockReset();
     plot.drawBarChart.mockReturnValue(plot.dispose);
   });

   describe('a table of figures', () => {
     it('names its table and its scrolling region after its title, with column and row headers', () => {
       render(
         <StatsTable
           title="Catálogos"
           note="Fuente: Estado actual."
           rows={[{ code: 'lab', started: 3 }]}
           rowKey={(row) => row.code}
           rowHeader={{ header: 'Catálogo', cell: (row) => row.code }}
           columns={[{ header: 'Empezaron', cell: (row) => row.started }]}
         />,
       );
       const table = screen.getByRole('table', { name: 'Catálogos' });
       expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
         'Catálogo',
         'Empezaron',
       ]);
       expect(within(table).getByRole('rowheader', { name: 'lab' })).toBeInTheDocument();
       expect(screen.getByRole('region', { name: 'Catálogos' })).toHaveAttribute('tabindex', '0');
       expect(screen.getByText('Fuente: Estado actual.')).toBeInTheDocument();
     });

     it('lists figures with their source', () => {
       render(
         <Figures
           title="Actividad"
           items={[{ label: 'Nunca tuvieron actividad', value: '1', source: 'Estado actual' }]}
         />,
       );
       expect(screen.getByRole('heading', { name: 'Actividad' })).toBeInTheDocument();
       expect(screen.getByRole('term')).toHaveTextContent('Nunca tuvieron actividad');
       expect(screen.getByRole('definition')).toHaveTextContent('1Estado actual');
     });
   });

   describe('a rate', () => {
     it('says «—» with a name when there is no n', () => {
       render(<RateCell numerator={0} n={0} label="Acierto" />);
       expect(screen.getByRole('img', { name: 'sin datos' })).toHaveTextContent('—');
     });

     it('marks a small sample and draws no bar', () => {
       render(<RateCell numerator={2} n={3} label="Acierto" />);
       expect(screen.getByText('2 de 3')).toBeInTheDocument();
       expect(screen.getByText('Muestra chica')).toBeInTheDocument();
       expect(screen.queryByRole('meter')).toBeNull();
     });

     it('draws a named bar from five on', () => {
       render(<RateCell numerator={4} n={8} label="Acierto" />);
       expect(screen.getByRole('meter', { name: 'Acierto: 4 de 8' })).toHaveAttribute('value', '4');
     });
   });

   describe('a distribution of options', () => {
     it('says how many answers there were and hides the spread under five', () => {
       render(
         <Distribution
           owner="exercise"
           ownerId="rust-01"
           spread={{ answered: 1, options: [{ option: 2, students: 1 }] }}
           label="Opciones"
         />,
       );
       expect(
         screen.getByText('1 respuesta. Menos de 5 respuestas: no mostramos cómo se reparten.'),
       ).toBeInTheDocument();
       expect(screen.queryByRole('list')).toBeNull();
     });

     it('shows each option with the text of the content and its share', () => {
       render(
         <ContentTitlesProvider source={() => SOURCE}>
           <Distribution
             owner="exercise"
             ownerId="rust-01"
             spread={{
               answered: 6,
               options: [
                 { option: 0, students: 4 },
                 { option: 2, students: 2 },
               ],
             }}
             label="Opciones elegidas"
           />
         </ContentTitlesProvider>,
       );
       const items = within(screen.getByRole('list', { name: 'Opciones elegidas' })).getAllByRole(
         'listitem',
       );
       expect(items).toHaveLength(2);
       expect(items[0]).toHaveTextContent('Devuelve 21 siempre 4 de 6');
       expect(items[1]).toHaveTextContent('Ignora el punto y coma 2 de 6');
       expect(screen.getByRole('meter', { name: 'Devuelve 21 siempre: 4 de 6' })).toBeInTheDocument();
     });
   });

   describe('a failure of a view', () => {
     it('shows the message and the wait, and lets retry only after it', async () => {
       const onRetry = vi.fn();
       const failure: ApiFailure = {
         kind: 'response',
         status: 503,
         code: 'stats_timeout',
         message: 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.',
         fieldErrors: {},
         retryAfterSeconds: 30,
       };
       const { rerender } = render(
         <StatsFailure failure={failure} lead="No pudimos cargar el resumen." waiting onRetry={onRetry} />,
       );
       const alert = screen.getByRole('alert');
       expect(alert).toHaveTextContent('No pudimos cargar el resumen.');
       expect(alert).toHaveTextContent('Podés volver a intentar en 30 segundos.');
       expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
       rerender(
         <StatsFailure
           failure={failure}
           lead="No pudimos cargar el resumen."
           waiting={false}
           onRetry={onRetry}
         />,
       );
       await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
       expect(onRetry).toHaveBeenCalledOnce();
     });

     it('says when the figures were computed, how often and who counts', () => {
       render(
         <AggregateNotes period={OCTOBER} generatedAt="2026-10-07T15:00:00.000Z" withGranularity />,
       );
       expect(
         screen.getByText('Del 1/10/2026 al 7/10/2026, por día, en la hora de Buenos Aires.'),
       ).toBeInTheDocument();
       expect(
         screen.getByText(/^Calculado el .+ de octubre de 2026 a las .+\. Las cifras se recalculan cada 10 minutos/),
       ).toBeInTheDocument();
       expect(
         screen.getByText(
           'Cuentan los alumnos con la cuenta activa o deshabilitada. No cuentan las cuentas de admin ni las que se están borrando.',
         ),
       ).toBeInTheDocument();
     });
   });

   describe('the form of the period', () => {
     it('fills itself with the period of the answer', () => {
       renderForm(null);
       expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01');
       expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-07');
       expect(screen.getByLabelText('Agrupar por')).toHaveValue('day');
     });

     it('stops a period longer than 366 days on «Hasta» and asks nothing', async () => {
       const user = renderForm(null);
       fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2025-09-02' } });
       await user.click(screen.getByRole('button', { name: 'Aplicar' }));
       expect(await screen.findByText('El período puede tener hasta 366 días.')).toBeInTheDocument();
       expect(screen.getByLabelText('Hasta')).toHaveFocus();
       expect(screen.getByLabelText('Período elegido')).toHaveTextContent('null');
     });

     it('shares the applied period', async () => {
       const user = renderForm(null);
       fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } });
       await user.selectOptions(screen.getByLabelText('Agrupar por'), 'week');
       await user.click(screen.getByRole('button', { name: 'Aplicar' }));
       expect(screen.getByLabelText('Período elegido')).toHaveTextContent(
         '{"from":"2026-10-01","to":"2026-10-31","granularity":"week"}',
       );
     });

     it('takes a 422 of the server to its field', async () => {
       renderForm({
         kind: 'response',
         status: 422,
         code: 'validation_failed',
         message: 'Hay datos que corregir.',
         fieldErrors: { to: ['El período puede tener hasta 366 días.'] },
         retryAfterSeconds: null,
       });
       expect(await screen.findByText('El período puede tener hasta 366 días.')).toBeInTheDocument();
       expect(screen.getByLabelText('Hasta')).toHaveFocus();
     });

     it('has no grouping where there is no series', () => {
       renderForm(null, false);
       expect(screen.queryByLabelText('Agrupar por')).toBeNull();
     });
   });

   describe('a chart', () => {
     it('draws through the plot module in a hidden host, with its legend, its region and its summary', () => {
       const chart: BarChart = {
         title: 'Intentos por resultado',
         labels: ['1/10', '2/10'],
         series: [
           { label: 'Aprobado', token: 'green', values: [1, 2] },
           { label: 'No compiló', token: 'accent-dark', values: [0, 1] },
         ],
         stacked: true,
       };
       const { unmount } = render(
         <SeriesChart
           chart={chart}
           summary="En el período hubo 4 intentos; el día con más fue el 2/10, con 3."
         />,
       );
       const region = screen.getByRole('region', { name: 'Intentos por resultado' });
       expect(region).toHaveAttribute('tabindex', '0');
       const legend = screen.getByRole('list', { name: 'Leyenda de Intentos por resultado' });
       expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
         'Aprobado',
         'No compiló',
       ]);
       expect(
         screen.getByText('En el período hubo 4 intentos; el día con más fue el 2/10, con 3.'),
       ).toBeInTheDocument();
       expect(plot.drawBarChart).toHaveBeenCalledOnce();
       const [host, frame, drawn] = plot.drawBarChart.mock.calls[0] ?? [];
       expect(frame).toBe(region);
       expect(host).toHaveAttribute('aria-hidden', 'true');
       expect(region).toContainElement(host ?? null);
       expect(drawn).toEqual(chart);
       unmount();
       expect(plot.dispose).toHaveBeenCalledOnce();
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/usage-pieces.spec.tsx`: en rojo, por `not implemented`.
3. **Commit:** `test(front): specs de las piezas de las estadísticas, en rojo`.

### Tarea 2.4 · Las piezas de interfaz (T015, H)

**Archivos:** en `frontend/src/pages/admin/ui/`, `StatsTable.tsx`, `Figures.tsx`, `RateCell.tsx`, `Distribution.tsx`, `StatsFailure.tsx`, `RequestState.tsx`, `AggregateNotes.tsx`, `DateField.tsx`, `PeriodForm.tsx` y `SeriesChart.tsx`.

1. **`StatsTable.tsx`.** La región se desplaza con el teclado, con el patrón de `AccountsTable` de F12a:

   ```tsx
   import { useId, type ReactNode } from 'react';

   export interface StatsColumn<R> {
     readonly header: string;
     cell(row: R): ReactNode;
   }

   interface StatsTableProps<R> {
     readonly title: string;
     readonly note?: string;
     readonly rows: readonly R[];
     readonly rowKey: (row: R) => string;
     readonly rowHeader: StatsColumn<R>;
     readonly columns: readonly StatsColumn<R>[];
     readonly busy?: boolean;
   }

   const StatsTable = <R,>({
     title,
     note,
     rows,
     rowKey,
     rowHeader,
     columns,
     busy = false,
   }: StatsTableProps<R>) => {
     const titleId = useId();
     return (
       <div className="usage-block">
         <h4 id={titleId}>{title}</h4>
         {note === undefined ? null : <p className="usage-note">{note}</p>}
         <div
           className="admin-table-scroll"
           role="region"
           tabIndex={0}
           aria-labelledby={titleId}
           aria-busy={busy}
         >
           <table aria-labelledby={titleId}>
             <thead>
               <tr>
                 <th scope="col">{rowHeader.header}</th>
                 {columns.map((column) => (
                   <th key={column.header} scope="col">
                     {column.header}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {rows.map((row) => (
                 <tr key={rowKey(row)}>
                   <th scope="row">{rowHeader.cell(row)}</th>
                   {columns.map((column) => (
                     <td key={column.header}>{column.cell(row)}</td>
                   ))}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     );
   };

   export default StatsTable;
   ```

2. **`Figures.tsx`:**

   ```tsx
   export interface FigureItem {
     readonly label: string;
     readonly value: string;
     readonly source?: string;
   }

   interface FiguresProps {
     readonly title: string;
     readonly items: readonly FigureItem[];
   }

   const Figures = ({ title, items }: FiguresProps) => (
     <div className="usage-block">
       <h4>{title}</h4>
       <dl className="usage-figures">
         {items.map((item) => (
           <div key={item.label}>
             <dt>{item.label}</dt>
             <dd>
               {item.value}
               {item.source === undefined ? null : (
                 <span className="usage-source">{item.source}</span>
               )}
             </dd>
           </div>
         ))}
       </dl>
     </div>
   );

   export default Figures;
   ```

3. **`RateCell.tsx`** (Q3-A). Un `span` sin rol no tiene nombre accesible, así que «—» va con `role="img"`:

   ```tsx
   import { NO_DATA, rateView } from '../model/usage-format';
   import { NO_DATA_NAME, SMALL_SAMPLE_MARK } from '../model/usage-labels';

   interface RateCellProps {
     readonly numerator: number;
     readonly n: number;
     readonly sample?: number;
     readonly label: string;
   }

   const RateCell = ({ numerator, n, sample, label }: RateCellProps) => {
     const view = rateView(numerator, n, sample);
     if (view.kind === 'none') {
       return (
         <span role="img" aria-label={NO_DATA_NAME}>
           {NO_DATA}
         </span>
       );
     }
     return (
       <span className="usage-rate">
         <span>{view.text}</span>
         {view.kind === 'small' ? (
           <span className="admin-mark">{SMALL_SAMPLE_MARK}</span>
         ) : (
           <meter min={0} max={view.max} value={view.value} aria-label={`${label}: ${view.text}`} />
         )}
       </span>
     );
   };

   export default RateCell;
   ```

4. **`Distribution.tsx`** (FR-042). Con menos de 5 respuestas dice cuántas hubo y no muestra el reparto:

   ```tsx
   import type { OptionOwner } from '../model/content-titles';
   import { NO_DATA, countNoun, formatCount, showsDistribution } from '../model/usage-format';
   import { FEW_ANSWERS, NO_DATA_NAME } from '../model/usage-labels';
   import type { OptionSpread } from '../model/usage-types';
   import { useContentTitles } from './content-titles-context';

   interface DistributionProps {
     readonly owner: OptionOwner;
     readonly ownerId: string;
     readonly spread: OptionSpread;
     readonly label: string;
   }

   const Distribution = ({ owner, ownerId, spread, label }: DistributionProps) => {
     const titles = useContentTitles();
     if (spread.answered === 0) {
       return (
         <span role="img" aria-label={NO_DATA_NAME}>
           {NO_DATA}
         </span>
       );
     }
     if (!showsDistribution(spread.answered)) {
       return (
         <p className="usage-note">{`${countNoun(spread.answered, 'respuesta', 'respuestas')}. ${FEW_ANSWERS}`}</p>
       );
     }
     return (
       <ul className="usage-distribution" aria-label={label}>
         {spread.options.map(({ option, students }) => {
           const text = titles.option(owner, ownerId, option);
           const share = `${formatCount(students)} de ${formatCount(spread.answered)}`;
           return (
             <li key={option}>
               <span>{text}</span>{' '}
               <meter min={0} max={spread.answered} value={students} aria-label={`${text}: ${share}`} />{' '}
               <span>{share}</span>
             </li>
           );
         })}
       </ul>
     );
   };

   export default Distribution;
   ```

5. **`StatsFailure.tsx`** y **`RequestState.tsx`.** Un 422 del período no muestra el aviso: lo muestra el formulario (research, R6):

   ```tsx
   import type { ApiFailure } from '../../../shared/api/http';
   import { describeStatsFailure } from '../model/stats-failure';
   import FailureNotice from './FailureNotice';

   interface StatsFailureProps {
     readonly failure: ApiFailure;
     readonly lead: string;
     readonly notFoundMessage?: string;
     readonly waiting: boolean;
     onRetry(): void;
   }

   const StatsFailure = ({ failure, lead, notFoundMessage, waiting, onRetry }: StatsFailureProps) => (
     <FailureNotice
       failure={describeStatsFailure(failure, notFoundMessage ?? lead)}
       lead={lead}
       takeFocus={false}
     >
       <button type="button" className="button secondary" disabled={waiting} onClick={onRetry}>
         Reintentar
       </button>
     </FailureNotice>
   );

   export default StatsFailure;
   ```

   ```tsx
   import type { StatsRequest } from '../lib/use-stats-request';
   import { isPeriodRejection } from '../model/stats-failure';
   import { UPDATING } from '../model/usage-labels';
   import StatsFailure from './StatsFailure';

   interface RequestStateProps<T> {
     readonly request: StatsRequest<T>;
     readonly lead: string;
     readonly loadingText: string;
     readonly notFoundMessage?: string;
   }

   const RequestState = <T,>({ request, lead, loadingText, notFoundMessage }: RequestStateProps<T>) => {
     if (request.failure !== null) {
       if (isPeriodRejection(request.failure)) return null;
       return (
         <StatsFailure
           failure={request.failure}
           lead={lead}
           notFoundMessage={notFoundMessage}
           waiting={request.waiting}
           onRetry={request.reload}
         />
       );
     }
     if (!request.loading) return null;
     return (
       <p className="usage-loading" role="status">
         {request.data === null ? loadingText : UPDATING}
       </p>
     );
   };

   export default RequestState;
   ```

6. **`AggregateNotes.tsx`** (FR-006 a FR-008). El instante va en la zona del navegador, con el formato de F11a:

   ```tsx
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import { periodSentence } from '../model/period';
   import { RECALCULATION, WHO_COUNTS } from '../model/usage-labels';
   import type { PeriodMeta } from '../model/usage-types';

   interface AggregateNotesProps {
     readonly period: PeriodMeta;
     readonly generatedAt: string;
     readonly withGranularity: boolean;
   }

   const AggregateNotes = ({ period, generatedAt, withGranularity }: AggregateNotesProps) => (
     <div className="usage-notes">
       <p>{periodSentence(period, withGranularity)}</p>
       <p>{`Calculado el ${formatLocalDateTime(generatedAt)}. ${RECALCULATION}`}</p>
       <p>{WHO_COUNTS}</p>
     </div>
   );

   export default AggregateNotes;
   ```

7. **`DateField.tsx`,** el campo de fecha con el marcado de `TextField` de F11a (que no admite `type="date"`):

   ```tsx
   import { useId } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';

   interface DateFieldProps {
     readonly label: string;
     readonly registration: UseFormRegisterReturn;
     readonly messages: readonly string[];
   }

   const DateField = ({ label, registration, messages }: DateFieldProps) => {
     const id = useId();
     const errorsId = `${id}-errors`;
     const invalid = messages.length > 0;
     return (
       <div className="form-field">
         <label className="field-label" htmlFor={id}>
           {label}
         </label>
         <input
           id={id}
           className="form-input"
           type="date"
           aria-invalid={invalid || undefined}
           aria-describedby={invalid ? errorsId : undefined}
           {...registration}
         />
         {invalid ? (
           <ul id={errorsId} className="form-errors">
             {messages.map((message) => (
               <li key={message}>{message}</li>
             ))}
           </ul>
         ) : null}
       </div>
     );
   };

   export default DateField;
   ```

8. **`PeriodForm.tsx`** (FR-004 y FR-005). React Hook Form toma `meta.period` con `values`, valida al enviar y lleva un 422 a su campo con `showFailure` de F11a:

   ```tsx
   import { useEffect, useId } from 'react';
   import { useForm } from 'react-hook-form';
   import type { ApiFailure } from '../../../shared/api/http';
   import { ServerError, describeFailure, messagesOf, showFailure } from '../../../shared/ui/form';
   import { checkPeriod } from '../model/period';
   import { PERIOD_FIELDS, isPeriodRejection } from '../model/stats-failure';
   import { GRANULARITY_OPTIONS } from '../model/usage-labels';
   import type { Granularity, PeriodMeta } from '../model/usage-types';
   import DateField from './DateField';
   import { usePeriod } from './period-context';

   interface PeriodFormProps {
     readonly shown: PeriodMeta | null;
     readonly withGranularity: boolean;
     readonly failure: ApiFailure | null;
   }

   interface PeriodValues {
     from: string;
     to: string;
     granularity: Granularity;
   }

   const DATE_FIELDS = ['from', 'to'] as const;

   function valuesOf(shown: PeriodMeta | null): PeriodValues | undefined {
     if (shown === null) return undefined;
     return { from: shown.from, to: shown.to, granularity: shown.granularity };
   }

   const PeriodForm = ({ shown, withGranularity, failure }: PeriodFormProps) => {
     const { period, choose } = usePeriod();
     const granularityId = useId();
     const {
       register,
       handleSubmit,
       setError,
       formState: { errors },
     } = useForm<PeriodValues>({
       defaultValues: { from: '', to: '', granularity: period?.granularity ?? 'day' },
       values: valuesOf(shown),
     });

     useEffect(() => {
       if (failure === null || !isPeriodRejection(failure)) return;
       const fields = withGranularity ? PERIOD_FIELDS : DATE_FIELDS;
       showFailure(setError, describeFailure(failure, fields), fields);
     }, [failure, setError, withGranularity]);

     const apply = ({ from, to, granularity }: PeriodValues): void => {
       const problem = checkPeriod(from, to);
       if (problem !== null) {
         setError(problem.field, { type: 'period', message: problem.message }, { shouldFocus: true });
         return;
       }
       choose({ from, to, granularity });
     };

     return (
       <form
         className="admin-filters usage-period"
         aria-label="Período"
         noValidate
         onSubmit={handleSubmit(apply)}
       >
         <DateField label="Desde" registration={register('from')} messages={messagesOf(errors.from)} />
         <DateField label="Hasta" registration={register('to')} messages={messagesOf(errors.to)} />
         {withGranularity ? (
           <div className="form-field">
             <label className="field-label" htmlFor={granularityId}>
               Agrupar por
             </label>
             <select id={granularityId} className="form-input" {...register('granularity')}>
               {GRANULARITY_OPTIONS.map((option) => (
                 <option key={option.value} value={option.value}>
                   {option.label}
                 </option>
               ))}
             </select>
             {errors.granularity === undefined ? null : (
               <ul className="form-errors">
                 {messagesOf(errors.granularity).map((message) => (
                   <li key={message}>{message}</li>
                 ))}
               </ul>
             )}
           </div>
         ) : null}
         <button type="submit" className="button secondary">
           Aplicar
         </button>
         <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={false} />
       </form>
     );
   };

   export default PeriodForm;
   ```

   Un 422 sobre `granularity` aparece debajo de «Agrupar por». En «Ejercicios», que no lo muestra, `granularity` no está entre los campos visibles, así que `describeFailure` lo pasa al error general del formulario, que sí se ve.

9. **`SeriesChart.tsx`** (FR-045 a FR-048). Dibuja en un efecto que depende del gráfico, como pide la guía de React para un widget que no es de React, y lo destruye en el cleanup:

   ```tsx
   import { useEffect, useId, useRef } from 'react';
   import { drawBarChart } from '../lib/plot';
   import type { BarChart } from '../model/bar-chart';

   interface SeriesChartProps {
     readonly chart: BarChart;
     readonly summary: string;
   }

   const SeriesChart = ({ chart, summary }: SeriesChartProps) => {
     const captionId = useId();
     const frame = useRef<HTMLDivElement>(null);
     const host = useRef<HTMLDivElement>(null);

     useEffect(() => {
       if (frame.current === null || host.current === null) return;
       return drawBarChart(host.current, frame.current, chart);
     }, [chart]);

     return (
       <figure className="usage-chart">
         <figcaption id={captionId}>{chart.title}</figcaption>
         <ul className="usage-legend" aria-label={`Leyenda de ${chart.title}`}>
           {chart.series.map((series) => (
             <li key={series.label}>
               <span className={`usage-swatch usage-swatch-${series.token}`} aria-hidden="true" />
               {series.label}
             </li>
           ))}
         </ul>
         <div
           ref={frame}
           className="usage-chart-scroll"
           role="region"
           tabIndex={0}
           aria-labelledby={captionId}
         >
           <div ref={host} aria-hidden="true" />
         </div>
         <p>{summary}</p>
       </figure>
     );
   };

   export default SeriesChart;
   ```

10. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/usage-pieces.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint`.
11. **Commit:** `feat(front): las piezas de las estadísticas: tablas, tasas, distribuciones, el período y el gráfico`.

### Tarea 2.5 · La compuerta de U2 (K, sin número propio: cierra T015)

- **Desde S2:** H entregó T015.
- **La compuerta:** la de T011, con las specs de U2 en verde y el tamaño del HTML sin cambios.
- **El PR:** `feat(front): usage hooks and building blocks (F14a U2)`, contra `f14a/base`.

**Reversión de U2:** se revierten T015 a T012, en orden inverso.

## 3. U3 · Las vistas, la sección y su cableado (onda 3: V1, V2 y V3; onda 4: P; onda 5: K)

**Cubre:** las historias 1, 2 y 6, y lo de F14a de las historias 5, 7 y 8: FR-001 a FR-024 y los transversales sobre las vistas.

**Reglas de las specs de las vistas:**

- montan la vista dentro de `PeriodProvider`, con `renderWithFetch` de F12a (`ui/render-admin.tsx`) y el `fetch` de `routeFetch`;
- reemplazan `lib/plot` con el mismo bloque `vi.hoisted` y `vi.mock` de T014;
- llaman a `signInAs()` en `beforeEach`, porque `recoverSession` lee la sesión ante una falla;
- toman los textos esperados de la spec y de research, escritos a mano.

### Tarea 3.1 · El resumen, en rojo (T016, V1, desde S2)

**Archivos:** el stub de `frontend/src/pages/admin/model/overview-series.ts` y su spec, y los stubs de `ui/OverviewView.tsx` y `ui/OverviewReport.tsx`, con `ui/overview-view.spec.tsx`.

**Consume:** de U1, el modelo; de U2, las piezas y los hooks; de F12a, `ROLE_LABELS`, `STATUS_LABELS` y `render-admin.tsx`. **Produce:** `OverviewView` (`{ ownId }`) y las funciones de `model/overview-series.ts` del contrato, que F14b reutiliza para la actividad de una cuenta.

1. **`model/overview-series.spec.ts`.** Las sumas se resuelven a mano en el comentario:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { attemptsChart, attemptsSummary, studentsChart, studentsSummary } from './overview-series';
   import { parseOverview } from './parse-usage';
   import { overviewFactory, pointFactory, statsBody, type PointBody } from './usage.factory';

   function seriesOf(points: PointBody[]) {
     return parseOverview(statsBody(overviewFactory.build({ series: points })))?.data.series ?? [];
   }

   const TWO_DAYS = seriesOf([
     pointFactory.build({
       start: '2026-10-01',
       attempts: { passed: 1, failed: 2, compileError: 0, runtimeError: 0, timeout: 0 },
       studentsWhoRan: 1,
     }),
     pointFactory.build({
       start: '2026-10-02',
       attempts: { passed: 20, failed: 5, compileError: 3, runtimeError: 1, timeout: 1 },
       studentsWhoRan: 3,
     }),
   ]);

   describe('the series of the overview', () => {
     it('stacks the attempts by outcome, in the order of the table, with their tokens', () => {
       const chart = attemptsChart(TWO_DAYS, 'day');
       expect(chart.title).toBe('Intentos por resultado');
       expect(chart.stacked).toBe(true);
       expect(chart.labels).toEqual(['1/10', '2/10']);
       expect(chart.series.map((series) => [series.label, series.token, series.values])).toEqual([
         ['Aprobado', 'green', [1, 20]],
         ['No pasó las pruebas', 'accent', [2, 5]],
         ['No compiló', 'accent-dark', [0, 3]],
         ['Error al ejecutar', 'muted', [0, 1]],
         ['Se pasó de tiempo', 'ink', [0, 1]],
       ]);
     });

     it('draws the students who ran as a single series', () => {
       expect(studentsChart(TWO_DAYS, 'day')).toEqual({
         title: 'Alumnos que ejecutaron',
         labels: ['1/10', '2/10'],
         series: [{ label: 'Alumnos que ejecutaron', token: 'accent', values: [1, 3] }],
         stacked: false,
       });
     });

     it('sums the attempts and names the busiest interval', () => {
       // 1 + 2 = 3 el primero; 20 + 5 + 3 + 1 + 1 = 30 el segundo; 33 en total
       expect(attemptsSummary(TWO_DAYS, 'day')).toBe(
         'En el período hubo 33 intentos; el día con más fue el 2/10, con 30.',
       );
       expect(attemptsSummary(TWO_DAYS, 'week')).toBe(
         'En el período hubo 33 intentos; la semana con más fue la del 2/10, con 30.',
       );
       expect(attemptsSummary(seriesOf([pointFactory.build()]), 'day')).toBe(
         'En el período no hubo intentos.',
       );
     });

     it('takes the students of the whole period from the totals, not from the sum', () => {
       expect(studentsSummary(TWO_DAYS, 3, 'day')).toBe(
         'En el período ejecutaron 3 alumnos; el día con más fue el 2/10, con 3.',
       );
       expect(studentsSummary(TWO_DAYS, 1, 'month')).toBe(
         'En el período ejecutó 1 alumno; el mes con más fue octubre de 2026, con 3.',
       );
       expect(studentsSummary(seriesOf([pointFactory.build()]), 0, 'day')).toBe(
         'En el período nadie ejecutó código.',
       );
     });
   });
   ```

2. **`ui/overview-view.spec.tsx`.** Cubre la historia 1 (escenarios 1 a 6), FR-001, FR-004 a FR-013, SC-001 en el resumen y FR-050 y FR-051:

   ```tsx
   import { fireEvent, screen, within } from '@testing-library/react';
   import { beforeEach, describe, expect, it, vi } from 'vitest';
   import type { FakeReply } from '../../../shared/api/http/fake-fetch';
   import type { BarChart } from '../model/bar-chart';
   import { intervalFactory, overviewFactory, pointFactory, statsBody } from '../model/usage.factory';
   import OverviewView from './OverviewView';
   import { PeriodProvider } from './period-context';
   import { OLGA, renderWithFetch, signInAs } from './render-admin';
   import { deferred, routeFetch, type RoutedReply } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const OVERVIEW = '/api/admin/stats/overview';
   const TIMEOUT_MESSAGE = 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.';
   const NO_OUTCOMES = { passed: 0, failed: 0, compileError: 0, runtimeError: 0, timeout: 0 };

   const DAY = statsBody(
     overviewFactory.build({
       accounts: [
         { role: 'admin', status: 'active', count: 1 },
         { role: 'admin', status: 'disabled', count: 0 },
         { role: 'admin', status: 'deleting', count: 0 },
         { role: 'student', status: 'active', count: 4 },
         { role: 'student', status: 'disabled', count: 1 },
         { role: 'student', status: 'deleting', count: 1 },
       ],
       activeStudents: { lastDay: 1, lastWeek: 2, lastMonth: 3, never: 1 },
       invitations: { pending: 2, expired: 1, pendingAdmin: 1 },
       resetStudents: 1,
       totals: intervalFactory.build({
         attempts: { ...NO_OUTCOMES, passed: 4, failed: 1, compileError: 1 },
         operations: { infraError: 1, canceled: 1 },
         importedAttempts: 1,
         firstSolves: { server: 3, imported: 1 },
         newStudents: 2,
         imports: 1,
         studentsWhoRan: 4,
       }),
       series: [
         pointFactory.build({
           start: '2026-10-01',
           attempts: { ...NO_OUTCOMES, passed: 1, failed: 1 },
           studentsWhoRan: 2,
         }),
         pointFactory.build({
           start: '2026-10-02',
           attempts: { ...NO_OUTCOMES, passed: 3, compileError: 1 },
           studentsWhoRan: 3,
         }),
       ],
     }),
   );
   const WEEK = statsBody(
     overviewFactory.build({
       totals: intervalFactory.build({ attempts: { ...NO_OUTCOMES, passed: 2 }, studentsWhoRan: 1 }),
       series: ['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map((start) =>
         pointFactory.build({ start, attempts: { ...NO_OUTCOMES, passed: start === '2026-10-05' ? 2 : 0 } }),
       ),
     }),
     { from: '2026-10-01', to: '2026-10-31', granularity: 'week' },
   );
   const EMPTY = statsBody(overviewFactory.build({ series: [pointFactory.build()] }));

   function renderOverview(replies: readonly RoutedReply[]) {
     const routed = routeFetch({ [OVERVIEW]: replies });
     const user = renderWithFetch(
       <PeriodProvider>
         <OverviewView ownId={OLGA.id} />
       </PeriodProvider>,
       routed.fetch,
     );
     return { user, routed };
   }

   function figure(label: string): HTMLElement {
     const term = screen.getByText(label, { selector: 'dt' });
     const item = term.closest('div');
     if (item === null) throw new Error(`no figure for ${label}`);
     return item;
   }

   async function applyUntil(user: ReturnType<typeof renderOverview>['user'], to: string) {
     fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: to } });
     await user.click(screen.getByRole('button', { name: 'Aplicar' }));
   }

   beforeEach(() => {
     signInAs();
     plot.drawBarChart.mockReset();
     plot.drawBarChart.mockReturnValue(() => undefined);
   });

   describe('«Resumen»', () => {
     it('asks once without a period and fills the form with the period of the answer', async () => {
       const { routed } = renderOverview([{ status: 200, json: DAY }]);
       await screen.findByRole('heading', { name: 'En el período' });
       expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01');
       expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-07');
       expect(routed.callsTo(OVERVIEW)).toHaveLength(1);
       expect(routed.calls[0]?.query).toEqual({});
     });

     it('shows every figure of the answer with its source, and the solved figures apart', async () => {
       renderOverview([{ status: 200, json: DAY }]);
       await screen.findByRole('heading', { name: 'En el período' });
       expect(figure('Alumno · Activa')).toHaveTextContent('4Estado actual');
       expect(figure('Alumno · Borrándose')).toHaveTextContent('1Estado actual');
       expect(figure('Admin · Deshabilitada')).toHaveTextContent('0Estado actual');
       expect(figure('Hicieron «Borrar todo» alguna vez')).toHaveTextContent('1');
       expect(figure('Activos en los últimos 30 días')).toHaveTextContent('3');
       expect(figure('Nunca tuvieron actividad')).toHaveTextContent('1');
       expect(figure('De admin, pendientes')).toHaveTextContent('1');
       expect(figure('No compiló')).toHaveTextContent('1Historia');
       expect(figure('Falla del sandbox')).toHaveTextContent('1Historia');
       expect(figure('Resueltos por primera vez, en el servidor')).toHaveTextContent('3Estado actual');
       expect(figure('Resueltos por primera vez, importados')).toHaveTextContent('1Estado actual');
       expect(
         figure('Alumnos que ejecutaron (en todo el período: no es la suma de los intervalos)'),
       ).toHaveTextContent('4Historia');
       expect(screen.getByText(/^Resuelto es el estado actual de cada alumno/)).toBeInTheDocument();
       expect(screen.queryByText(/verificad/i)).toBeNull();
     });

     it('draws the two series and a table with one row per interval', async () => {
       renderOverview([{ status: 200, json: DAY }]);
       const table = await screen.findByRole('table', { name: 'La serie, por día' });
       expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
         '1/10/2026',
         '2/10/2026',
       ]);
       const second = within(table).getByRole('row', { name: /^2\/10\/2026/ });
       expect(within(second).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
         '3', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '3',
       ]);
       expect(plot.drawBarChart.mock.calls.map(([, , chart]) => chart.title)).toEqual([
         'Intentos por resultado',
         'Alumnos que ejecutaron',
       ]);
       // 1 + 1 = 2 el 1/10 y 3 + 1 = 4 el 2/10
       expect(
         screen.getByText('En el período hubo 6 intentos; el día con más fue el 2/10, con 4.'),
       ).toBeInTheDocument();
       expect(
         screen.getByText('En el período ejecutaron 4 alumnos; el día con más fue el 2/10, con 3.'),
       ).toBeInTheDocument();
       expect(
         screen.getByText(
           'La serie cuenta sólo a quien ejecutó código: leer, la campaña y el recorrido no dejan intentos.',
         ),
       ).toBeInTheDocument();
     });

     it('applies a weekly period once and draws one row per week', async () => {
       const { user, routed } = renderOverview([
         { status: 200, json: DAY },
         { status: 200, json: WEEK },
       ]);
       await screen.findByRole('table', { name: 'La serie, por día' });
       fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } });
       await user.selectOptions(screen.getByLabelText('Agrupar por'), 'week');
       await user.click(screen.getByRole('button', { name: 'Aplicar' }));
       const table = await screen.findByRole('table', { name: 'La serie, por semana' });
       expect(routed.callsTo(OVERVIEW)).toHaveLength(2);
       expect(routed.calls[1]?.query).toEqual({
         from: '2026-10-01',
         to: '2026-10-31',
         granularity: 'week',
       });
       expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
         'Semana del 1/10/2026',
         'Semana del 5/10/2026',
         'Semana del 12/10/2026',
         'Semana del 19/10/2026',
         'Semana del 26/10/2026',
       ]);
     });

     it('explains a period without attempts instead of drawing', async () => {
       renderOverview([{ status: 200, json: EMPTY }]);
       expect(
         await screen.findByText(
           'Todavía no hay intentos en este período. Se registran cuando el laboratorio ejecuta en el servidor y el progreso se sincroniza con la cuenta.',
         ),
       ).toBeInTheDocument();
       expect(plot.drawBarChart).not.toHaveBeenCalled();
       expect(screen.queryByRole('table', { name: /^La serie/ })).toBeNull();
     });

     it('keeps the figures marked as updating while the next answer arrives', async () => {
       const next = deferred<FakeReply>();
       const { user } = renderOverview([{ status: 200, json: DAY }, next.promise]);
       await screen.findByRole('heading', { name: 'En el período' });
       await applyUntil(user, '2026-10-31');
       expect(await screen.findByText('Actualizando…')).toBeInTheDocument();
       expect(screen.getByRole('heading', { name: 'En el período' })).toBeInTheDocument();
       next.resolve({ status: 200, json: WEEK });
       expect(await screen.findByRole('table', { name: 'La serie, por semana' })).toBeInTheDocument();
       expect(screen.queryByText('Actualizando…')).toBeNull();
     });

     it('shows the message and the wait of a stats timeout, and keeps the applied period', async () => {
       const { user } = renderOverview([
         { status: 200, json: DAY },
         {
           status: 503,
           json: { message: TIMEOUT_MESSAGE, code: 'stats_timeout' },
           headers: { 'Retry-After': '30' },
         },
       ]);
       await screen.findByRole('heading', { name: 'En el período' });
       await applyUntil(user, '2026-10-05');
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent('No pudimos cargar el resumen.');
       expect(alert).toHaveTextContent(TIMEOUT_MESSAGE);
       expect(alert).toHaveTextContent('Podés volver a intentar en 30 segundos.');
       expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeDisabled();
       expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-05');
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/overview-series.spec.ts frontend/src/pages/admin/ui/overview-view.spec.tsx`: en rojo, por `not implemented`.
4. **Commit:** `test(front): specs del resumen del uso del taller, en rojo`.

### Tarea 3.2 · El resumen (T017, V1)

**Archivos:** `frontend/src/pages/admin/model/overview-series.ts`, `ui/OverviewView.tsx` y `ui/OverviewReport.tsx`.

1. **`model/overview-series.ts`:**

   ```ts
   import type { BarChart, ColorToken } from './bar-chart';
   import { countNoun, formatCount, intervalLabel } from './usage-format';
   import { OUTCOME_KEYS, OUTCOME_LABELS, type OutcomeKey } from './usage-labels';
   import type { Granularity, OutcomeCounts, SeriesPoint } from './usage-types';

   export const ATTEMPTS_TITLE = 'Intentos por resultado';
   export const STUDENTS_TITLE = 'Alumnos que ejecutaron';

   export const OUTCOME_TOKENS: Readonly<Record<OutcomeKey, ColorToken>> = {
     passed: 'green',
     failed: 'accent',
     compileError: 'accent-dark',
     runtimeError: 'muted',
     timeout: 'ink',
   };

   const PEAK: Readonly<Record<Granularity, (label: string) => string>> = {
     day: (label) => `el día con más fue el ${label}`,
     week: (label) => `la semana con más fue la del ${label}`,
     month: (label) => `el mes con más fue ${label}`,
   };

   function attemptsOf(counts: OutcomeCounts): number {
     return OUTCOME_KEYS.reduce((sum, key) => sum + counts[key], 0);
   }

   function labelsOf(series: readonly SeriesPoint[], granularity: Granularity): string[] {
     return series.map((point) => intervalLabel(point.start, granularity));
   }

   export function attemptsChart(series: readonly SeriesPoint[], granularity: Granularity): BarChart {
     return {
       title: ATTEMPTS_TITLE,
       labels: labelsOf(series, granularity),
       series: OUTCOME_KEYS.map((key) => ({
         label: OUTCOME_LABELS[key],
         token: OUTCOME_TOKENS[key],
         values: series.map((point) => point.attempts[key]),
       })),
       stacked: true,
     };
   }

   export function studentsChart(series: readonly SeriesPoint[], granularity: Granularity): BarChart {
     return {
       title: STUDENTS_TITLE,
       labels: labelsOf(series, granularity),
       series: [
         {
           label: STUDENTS_TITLE,
           token: 'accent',
           values: series.map((point) => point.studentsWhoRan),
         },
       ],
       stacked: false,
     };
   }

   export function peakSentence(
     starts: readonly string[],
     values: readonly number[],
     granularity: Granularity,
   ): string | null {
     const peak = Math.max(0, ...values);
     if (peak === 0) return null;
     const start = starts[values.indexOf(peak)] ?? '';
     return `${PEAK[granularity](intervalLabel(start, granularity))}, con ${formatCount(peak)}`;
   }

   export function attemptsSummary(series: readonly SeriesPoint[], granularity: Granularity): string {
     const values = series.map((point) => attemptsOf(point.attempts));
     const starts = series.map((point) => point.start);
     const peak = peakSentence(starts, values, granularity);
     if (peak === null) return 'En el período no hubo intentos.';
     const total = values.reduce((sum, value) => sum + value, 0);
     return `En el período hubo ${countNoun(total, 'intento', 'intentos')}; ${peak}.`;
   }

   export function studentsSummary(
     series: readonly SeriesPoint[],
     total: number,
     granularity: Granularity,
   ): string {
     const values = series.map((point) => point.studentsWhoRan);
     const starts = series.map((point) => point.start);
     const peak = peakSentence(starts, values, granularity);
     if (peak === null || total === 0) return 'En el período nadie ejecutó código.';
     const verb = total === 1 ? 'ejecutó' : 'ejecutaron';
     return `En el período ${verb} ${countNoun(total, 'alumno', 'alumnos')}; ${peak}.`;
   }
   ```

2. **`ui/OverviewView.tsx`** (FR-001, FR-004 y FR-044). La vista pide al montarse y con cada período; `useStatsRequest` cancela al irse:

   ```tsx
   import { useCallback } from 'react';
   import { useApiClient } from '../../../shared/api/http';
   import { getOverview } from '../api/usage-endpoints';
   import useStatsRequest from '../lib/use-stats-request';
   import OverviewReport from './OverviewReport';
   import PeriodForm from './PeriodForm';
   import { usePeriod } from './period-context';
   import RequestState from './RequestState';

   interface OverviewViewProps {
     readonly ownId: number;
   }

   const OverviewView = ({ ownId }: OverviewViewProps) => {
     const client = useApiClient();
     const { period } = usePeriod();
     const load = useCallback(
       (signal: AbortSignal) => getOverview(client, period, signal),
       [client, period],
     );
     const request = useStatsRequest(load, ownId);
     return (
       <div className="usage-view">
         <h3>Resumen</h3>
         <PeriodForm shown={request.data?.period ?? null} withGranularity failure={request.failure} />
         <RequestState
           request={request}
           lead="No pudimos cargar el resumen."
           loadingText="Cargando el resumen…"
         />
         {request.data === null ? null : (
           <OverviewReport stats={request.data} busy={request.loading} />
         )}
       </div>
     );
   };

   export default OverviewView;
   ```

3. **`ui/OverviewReport.tsx`** (FR-006 a FR-013, R12):

   ```tsx
   import { useMemo } from 'react';
   import type { AccountRole } from '../../../entities/session';
   import { ROLE_LABELS, STATUS_LABELS } from '../model/labels';
   import {
     attemptsChart,
     attemptsSummary,
     studentsChart,
     studentsSummary,
   } from '../model/overview-series';
   import type { AccountStatus } from '../model/types';
   import { formatCount, intervalHeading } from '../model/usage-format';
   import {
     EMPTY_PERIOD,
     GRANULARITY_NOUNS,
     IMPORTED_LABEL,
     OPERATION_LABELS,
     OUTCOME_KEYS,
     OUTCOME_LABELS,
     SERIES_NOTE,
     SOURCE_CURRENT,
     SOURCE_HISTORY,
     SOURCES_HELP,
   } from '../model/usage-labels';
   import type {
     AccountCount,
     IntervalTotals,
     Overview,
     SeriesPoint,
     Stats,
   } from '../model/usage-types';
   import AggregateNotes from './AggregateNotes';
   import Figures, { type FigureItem } from './Figures';
   import SeriesChart from './SeriesChart';
   import StatsTable, { type StatsColumn } from './StatsTable';

   interface OverviewReportProps {
     readonly stats: Stats<Overview>;
     readonly busy: boolean;
   }

   const ROLES: readonly AccountRole[] = ['admin', 'student'];
   const STATUSES: readonly AccountStatus[] = ['active', 'disabled', 'deleting'];
   const SERIES_SOURCE = `Fuente: ${SOURCE_HISTORY}, salvo lo resuelto y los alumnos nuevos (${SOURCE_CURRENT}).`;

   const SERIES_COLUMNS: readonly StatsColumn<SeriesPoint>[] = [
     ...OUTCOME_KEYS.map(
       (key): StatsColumn<SeriesPoint> => ({
         header: OUTCOME_LABELS[key],
         cell: (point) => formatCount(point.attempts[key]),
       }),
     ),
     { header: OPERATION_LABELS.infraError, cell: (point) => formatCount(point.operations.infraError) },
     { header: OPERATION_LABELS.canceled, cell: (point) => formatCount(point.operations.canceled) },
     { header: IMPORTED_LABEL, cell: (point) => formatCount(point.importedAttempts) },
     { header: 'Resueltos en el servidor', cell: (point) => formatCount(point.firstSolves.server) },
     { header: 'Resueltos importados', cell: (point) => formatCount(point.firstSolves.imported) },
     { header: 'Alumnos nuevos', cell: (point) => formatCount(point.newStudents) },
     { header: 'Importaciones', cell: (point) => formatCount(point.imports) },
     { header: 'Alumnos que ejecutaron', cell: (point) => formatCount(point.studentsWhoRan) },
   ];

   function countOf(
     accounts: readonly AccountCount[],
     role: AccountRole,
     status: AccountStatus,
   ): number {
     return accounts.find((row) => row.role === role && row.status === status)?.count ?? 0;
   }

   function current(label: string, value: number): FigureItem {
     return { label, value: formatCount(value), source: SOURCE_CURRENT };
   }

   function history(label: string, value: number): FigureItem {
     return { label, value: formatCount(value), source: SOURCE_HISTORY };
   }

   function accountItems(overview: Overview): FigureItem[] {
     const combinations = ROLES.flatMap((role) =>
       STATUSES.map((status) =>
         current(
           `${ROLE_LABELS[role]} · ${STATUS_LABELS[status]}`,
           countOf(overview.accounts, role, status),
         ),
       ),
     );
     return [...combinations, current('Hicieron «Borrar todo» alguna vez', overview.resetStudents)];
   }

   function activityItems({ activeStudents }: Overview): FigureItem[] {
     return [
       current('Activos en las últimas 24 horas', activeStudents.lastDay),
       current('Activos en los últimos 7 días', activeStudents.lastWeek),
       current('Activos en los últimos 30 días', activeStudents.lastMonth),
       current('Nunca tuvieron actividad', activeStudents.never),
     ];
   }

   function invitationItems({ invitations }: Overview): FigureItem[] {
     return [
       current('Pendientes', invitations.pending),
       current('Vencidas', invitations.expired),
       current('De admin, pendientes', invitations.pendingAdmin),
     ];
   }

   function totalItems(totals: IntervalTotals): FigureItem[] {
     return [
       ...OUTCOME_KEYS.map((key) => history(OUTCOME_LABELS[key], totals.attempts[key])),
       history(OPERATION_LABELS.infraError, totals.operations.infraError),
       history(OPERATION_LABELS.canceled, totals.operations.canceled),
       history(IMPORTED_LABEL, totals.importedAttempts),
       current('Resueltos por primera vez, en el servidor', totals.firstSolves.server),
       current('Resueltos por primera vez, importados', totals.firstSolves.imported),
       current('Alumnos nuevos', totals.newStudents),
       history('Importaciones', totals.imports),
       history(
         'Alumnos que ejecutaron (en todo el período: no es la suma de los intervalos)',
         totals.studentsWhoRan,
       ),
     ];
   }

   function hasAttempts({ attempts, operations, importedAttempts }: IntervalTotals): boolean {
     const outcomes = OUTCOME_KEYS.reduce((sum, key) => sum + attempts[key], 0);
     return outcomes + operations.infraError + operations.canceled + importedAttempts > 0;
   }

   const OverviewReport = ({ stats, busy }: OverviewReportProps) => {
     const { data, period, generatedAt } = stats;
     const { granularity } = period;
     const attempts = useMemo(() => attemptsChart(data.series, granularity), [data.series, granularity]);
     const students = useMemo(() => studentsChart(data.series, granularity), [data.series, granularity]);
     return (
       <div className="usage-report" aria-busy={busy}>
         <AggregateNotes period={period} generatedAt={generatedAt} withGranularity />
         <Figures title="Cuentas" items={accountItems(data)} />
         <Figures title="Actividad" items={activityItems(data)} />
         <Figures title="Invitaciones" items={invitationItems(data)} />
         <Figures title="En el período" items={totalItems(data.totals)} />
         <p className="usage-help">{SOURCES_HELP}</p>
         {hasAttempts(data.totals) ? (
           <>
             <SeriesChart chart={attempts} summary={attemptsSummary(data.series, granularity)} />
             <SeriesChart
               chart={students}
               summary={studentsSummary(data.series, data.totals.studentsWhoRan, granularity)}
             />
             <p className="usage-note">{SERIES_NOTE}</p>
             <StatsTable
               title={`La serie, por ${GRANULARITY_NOUNS[granularity]}`}
               note={SERIES_SOURCE}
               rows={data.series}
               rowKey={(point) => point.start}
               rowHeader={{
                 header: 'Intervalo',
                 cell: (point) => intervalHeading(point.start, granularity),
               }}
               columns={SERIES_COLUMNS}
               busy={busy}
             />
           </>
         ) : (
           <p>{EMPTY_PERIOD}</p>
         )}
       </div>
     );
   };

   export default OverviewReport;
   ```

4. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/overview-series.spec.ts frontend/src/pages/admin/ui/overview-view.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint`.
5. **Commit:** `feat(front): el resumen del uso del taller, con sus cifras y sus dos series`.

### Tarea 3.3 · Los ejercicios, en rojo (T018, V2, desde S2)

**Archivos:** los stubs de `ui/ExercisesView.tsx`, `ui/CurriculumReport.tsx`, `ui/ExerciseDetail.tsx` y `ui/curriculum-columns.tsx` (sus exports como `const` tipados que lanzan), con `ui/exercises-view.spec.tsx`, en `frontend/src/pages/admin/`.

**Consume:** de U1, el modelo; de U2, las piezas y los hooks; de F12a, `FilterSelect`. **Produce:** `ExercisesView` (`{ ownId }`).

1. **`ui/exercises-view.spec.tsx`.** Cubre la historia 2 (escenarios 1 a 6), FR-014 a FR-020, SC-001 y SC-002 en los ejercicios, y FR-041 y FR-042:

   ```tsx
   import { screen, within } from '@testing-library/react';
   import { beforeEach, describe, expect, it, vi } from 'vitest';
   import type { BarChart } from '../model/bar-chart';
   import type { TitleSource } from '../model/content-titles';
   import {
     catalogFactory,
     curriculumFactory,
     exerciseFactory,
     statsBody,
     worldFactory,
   } from '../model/usage.factory';
   import { ContentTitlesProvider } from './content-titles-context';
   import ExercisesView from './ExercisesView';
   import { PeriodProvider } from './period-context';
   import { OLGA, renderWithFetch, signInAs } from './render-admin';
   import { routeFetch } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const EXERCISES = '/api/admin/stats/exercises';
   const NO_OUTCOMES = { passed: 0, failed: 0, compileError: 0, runtimeError: 0, timeout: 0 };
   const SOURCE: TitleSource = {
     lab: {
       rust: [
         {
           id: 'rust-01',
           title: 'La energía del reactor',
           tests: [{ id: 't1', label: 'Tres celdas' }],
           prediction: { options: ['Devuelve 21 siempre', 'No compila', 'Ignora el punto y coma'] },
         },
         {
           id: 'rust-02',
           title: 'Repará el contador inmutable',
           tests: [],
           prediction: { options: ['A', 'B', 'C'] },
         },
       ],
     },
     quests: {},
     cores: {},
     campaign: {
       rust: [
         {
           id: 'rust-world-1',
           title: 'Estación del robot',
           checkpoint: { options: ['Al recibir', 'Después de confirmar', 'Antes de calcular'] },
         },
       ],
     },
     workshops: {},
     guide: { resources: [], tracks: {} },
   };
   const BODY = statsBody(
     curriculumFactory.build({
       catalogs: [
         catalogFactory.build({ catalog: 'lab', activeExercises: 100, studentsStarted: 6, studentsSolved: 4, solvedMedian: 1.5 }),
         catalogFactory.build({ catalog: 'essentials', activeExercises: 5 }),
       ],
       exercises: [
         exerciseFactory.build({
           exerciseId: 'rust-01',
           studentsStarted: 3,
           solved: { server: 1, imported: 1 },
           attempts: { ...NO_OUTCOMES, passed: 3, failed: 4 },
           prediction: { answered: 3, correct: 2, options: [{ option: 1, students: 1 }] },
           tests: [{ testKey: 't1', verdicts: 8, fail: 4, missing: 1 }],
         }),
         exerciseFactory.build({ exerciseId: 'rust-02' }),
         exerciseFactory.build({
           exerciseId: 'rust-999',
           retired: true,
           studentsStarted: 4,
           solved: { server: 1, imported: 0 },
           attempts: { ...NO_OUTCOMES, failed: 1 },
         }),
       ],
       worlds: [
         worldFactory.build({
           checkpoint: {
             answered: 6,
             passed: 3,
             options: [
               { option: 0, students: 3 },
               { option: 2, students: 3 },
             ],
           },
         }),
       ],
     }),
   );
   const EMPTY = statsBody(
     curriculumFactory.build({ catalogs: [catalogFactory.build()], exercises: [exerciseFactory.build()] }),
   );

   function renderExercises(body: unknown = BODY) {
     const routed = routeFetch({ [EXERCISES]: [{ status: 200, json: body }] });
     const user = renderWithFetch(
       <ContentTitlesProvider source={() => SOURCE}>
         <PeriodProvider>
           <ExercisesView ownId={OLGA.id} />
         </PeriodProvider>
       </ContentTitlesProvider>,
       routed.fetch,
     );
     return { user, routed };
   }

   beforeEach(() => {
     signInAs();
   });

   describe('«Ejercicios»', () => {
     it('asks once per filter change with the period in force, and offers the catalogs of the answer', async () => {
       const { user, routed } = renderExercises();
       await screen.findByRole('table', { name: 'Ejercicios' });
       expect(
         within(screen.getByLabelText('Catálogo')).getAllByRole('option').map((option) => option.textContent),
       ).toEqual(['Todos', 'lab', 'essentials']);
       await user.click(screen.getByRole('button', { name: 'Aplicar' }));
       await vi.waitFor(() => expect(routed.callsTo(EXERCISES)).toHaveLength(2));
       await user.selectOptions(screen.getByLabelText('Catálogo'), 'lab');
       await vi.waitFor(() => expect(routed.callsTo(EXERCISES)).toHaveLength(3));
       await user.selectOptions(screen.getByLabelText('Lenguaje'), 'rust');
       await vi.waitFor(() => expect(routed.callsTo(EXERCISES)).toHaveLength(4));
       const period = { from: '2026-10-01', to: '2026-10-07', granularity: 'day' };
       expect(routed.callsTo(EXERCISES).map((call) => call.query)).toEqual([
         {},
         period,
         { ...period, catalog: 'lab' },
         { ...period, catalog: 'lab', language: 'rust' },
       ]);
     });

     it('orders the exercises in the client, with the ones nobody started last', async () => {
       const { user, routed } = renderExercises();
       const table = await screen.findByRole('table', { name: 'Ejercicios' });
       await user.selectOptions(screen.getByLabelText('Ordenar por'), 'least-solved');
       // rust-01 2/3; rust-02 nadie; rust-999 1/4
       expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
         'rust-999 Retirado',
         'La energía del reactor (rust-01)',
         'Repará el contador inmutable (rust-02)',
       ]);
       expect(routed.callsTo(EXERCISES)).toHaveLength(1);
     });

     it('marks a small sample and shows «—» where nobody answered', async () => {
       renderExercises();
       const table = await screen.findByRole('table', { name: 'Ejercicios' });
       const first = within(table).getByRole('row', { name: /La energía del reactor/ });
       expect(first).toHaveTextContent('2 de 3');
       expect(first).toHaveTextContent('Muestra chica');
       const second = within(table).getByRole('row', { name: /Repará el contador/ });
       expect(within(second).getAllByRole('img', { name: 'sin datos' }).length).toBeGreaterThan(0);
     });

     it('opens the detail of an exercise in place, without asking, and gives the focus back', async () => {
       const { user, routed } = renderExercises();
       await screen.findByRole('table', { name: 'Ejercicios' });
       await user.click(screen.getByRole('button', { name: 'Ver La energía del reactor' }));
       expect(screen.getByRole('heading', { name: 'La energía del reactor' })).toHaveFocus();
       expect(screen.queryByRole('table', { name: 'Ejercicios' })).toBeNull();
       const tests = screen.getByRole('table', { name: 'Pruebas' });
       const row = within(tests).getByRole('row', { name: /Tres celdas/ });
       expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['8', '4', '1']);
       expect(
         screen.getByText('3 respuestas. Menos de 5 respuestas: no mostramos cómo se reparten.'),
       ).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Volver a Ejercicios' }));
       expect(screen.getByRole('button', { name: 'Ver La energía del reactor' })).toHaveFocus();
       expect(routed.callsTo(EXERCISES)).toHaveLength(1);
     });

     it('shows a spread of five or more answers with the texts of the content', async () => {
       renderExercises();
       const list = await screen.findByRole('list', {
         name: 'Opciones del checkpoint de Estación del robot',
       });
       const items = within(list).getAllByRole('listitem');
       expect(items[0]).toHaveTextContent('Al recibir 3 de 6');
       expect(items[1]).toHaveTextContent('Antes de calcular 3 de 6');
     });

     it('says which filters change each table', async () => {
       const { user } = renderExercises();
       await screen.findByRole('table', { name: 'Ejercicios' });
       await user.selectOptions(screen.getByLabelText('Lenguaje'), 'go');
       expect(await screen.findAllByText('Filtrada por lenguaje. Fuente: Estado actual.')).toHaveLength(
         3,
       );
       expect(
         screen.getAllByText('Los filtros elegidos no cambian esta tabla. Fuente: Estado actual.'),
       ).toHaveLength(2);
     });

     it('explains a period without attempts', async () => {
       renderExercises(EMPTY);
       expect(
         await screen.findByText(
           'Todavía no hay intentos en este período. Se registran cuando el laboratorio ejecuta en el servidor y el progreso se sincroniza con la cuenta.',
         ),
       ).toBeInTheDocument();
     });
   });
   ```

   Con el lenguaje elegido, «Filtrada por lenguaje. Fuente: Estado actual.» la llevan los catálogos, los mundos y los talleres (tres), y las dos tablas del recorrido dicen que el filtro no las cambia (contrato de C5, §4).

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/exercises-view.spec.tsx`: en rojo, por `not implemented`.
3. **Commit:** `test(front): specs de los ejercicios del uso del taller, en rojo`.

### Tarea 3.4 · Los ejercicios (T019, V2)

**Archivos:** `ui/curriculum-columns.tsx`, `ui/CurriculumReport.tsx`, `ui/ExerciseDetail.tsx` y `ui/ExercisesView.tsx`, en `frontend/src/pages/admin/`.

1. **`ui/curriculum-columns.tsx`,** las columnas de las tablas del contenido. Son datos para `StatsTable`, con exports nombrados:

   ```tsx
   import type { ReactNode } from 'react';
   import type { ContentTitles } from '../model/content-titles';
   import { formatCount, formatMaybe } from '../model/usage-format';
   import {
     IMPORTED_LABEL,
     MARK_KIND_LABELS,
     OPERATION_LABELS,
     OUTCOME_KEYS,
     OUTCOME_LABELS,
     RETIRED_MARK,
     languageLabel,
     levelLabel,
   } from '../model/usage-labels';
   import type {
     CatalogStats,
     ExerciseStats,
     RouteMark,
     RouteQuiz,
     WorkshopStats,
     WorldStats,
   } from '../model/usage-types';
   import Distribution from './Distribution';
   import RateCell from './RateCell';
   import type { StatsColumn } from './StatsTable';

   export type OpenExercise = (exercise: ExerciseStats, opener: HTMLButtonElement) => void;

   function named(title: string, id: string, retired: boolean): ReactNode {
     return (
       <>
         {title}
         {title === id ? null : <span className="usage-id">{` (${id})`}</span>}
         {retired ? <span className="admin-mark">{` ${RETIRED_MARK}`}</span> : null}
       </>
     );
   }

   export function catalogKey(catalog: CatalogStats): string {
     return `${catalog.catalog}-${catalog.language}-${catalog.level ?? ''}`;
   }

   export const CATALOG_HEADER: StatsColumn<CatalogStats> = {
     header: 'Catálogo',
     cell: (catalog) =>
       [catalog.catalog, languageLabel(catalog.language), catalog.level === null ? '' : levelLabel(catalog.level)]
         .filter((part) => part !== '')
         .join(' · '),
   };

   export const CATALOG_COLUMNS: readonly StatsColumn<CatalogStats>[] = [
     { header: 'Ejercicios activos', cell: (catalog) => formatCount(catalog.activeExercises) },
     { header: 'Empezaron', cell: (catalog) => formatCount(catalog.studentsStarted) },
     {
       header: 'Resolvieron al menos uno',
       cell: (catalog) => (
         <RateCell
           numerator={catalog.studentsSolved}
           n={catalog.studentsStarted}
           label={`Resolvieron al menos uno de ${catalog.catalog}`}
         />
       ),
     },
     { header: 'Mediana de resueltos', cell: (catalog) => formatMaybe(catalog.solvedMedian) },
     {
       header: 'Parte resuelta',
       cell: (catalog) => (
         <RateCell
           numerator={catalog.solvedMedian ?? 0}
           n={catalog.activeExercises}
           sample={catalog.studentsStarted}
           label={`Parte resuelta de ${catalog.catalog}`}
         />
       ),
     },
   ];

   export function exerciseHeader(titles: ContentTitles): StatsColumn<ExerciseStats> {
     return {
       header: 'Ejercicio',
       cell: (exercise) =>
         named(titles.exercise(exercise.exerciseId), exercise.exerciseId, exercise.retired),
     };
   }

   export function exerciseColumns(
     titles: ContentTitles,
     onOpen: OpenExercise,
   ): readonly StatsColumn<ExerciseStats>[] {
     const title = (exercise: ExerciseStats): string => titles.exercise(exercise.exerciseId);
     return [
       { header: 'Empezaron', cell: (exercise) => formatCount(exercise.studentsStarted) },
       { header: 'Resueltos en el servidor', cell: (exercise) => formatCount(exercise.solved.server) },
       { header: 'Resueltos importados', cell: (exercise) => formatCount(exercise.solved.imported) },
       ...OUTCOME_KEYS.map(
         (key): StatsColumn<ExerciseStats> => ({
           header: OUTCOME_LABELS[key],
           cell: (exercise) => formatCount(exercise.attempts[key]),
         }),
       ),
       {
         header: OPERATION_LABELS.infraError,
         cell: (exercise) => formatCount(exercise.operations.infraError),
       },
       {
         header: OPERATION_LABELS.canceled,
         cell: (exercise) => formatCount(exercise.operations.canceled),
       },
       { header: IMPORTED_LABEL, cell: (exercise) => formatCount(exercise.importedAttempts) },
       {
         header: 'Mediana de intentos (resolvieron · no)',
         cell: (exercise) =>
           `${formatMaybe(exercise.attemptsMedian.solved)} · ${formatMaybe(exercise.attemptsMedian.unsolved)}`,
       },
       {
         header: 'Asistidos',
         cell: (exercise) => (
           <RateCell
             numerator={exercise.help.assisted}
             n={exercise.studentsStarted}
             label={`Asistidos en ${title(exercise)}`}
           />
         ),
       },
       {
         header: 'Vieron la solución',
         cell: (exercise) => (
           <RateCell
             numerator={exercise.help.solutionSeen}
             n={exercise.studentsStarted}
             label={`Vieron la solución de ${title(exercise)}`}
           />
         ),
       },
       {
         header: 'Predicción',
         cell: (exercise) => (
           <RateCell
             numerator={exercise.prediction.correct}
             n={exercise.prediction.answered}
             label={`Acierto de la predicción de ${title(exercise)}`}
           />
         ),
       },
       {
         header: 'Detalle',
         cell: (exercise) => (
           <button
             type="button"
             className="button secondary small"
             onClick={(event) => onOpen(exercise, event.currentTarget)}
           >
             {`Ver ${title(exercise)}`}
           </button>
         ),
       },
     ];
   }

   export function worldHeader(titles: ContentTitles): StatsColumn<WorldStats> {
     return {
       header: 'Mundo',
       cell: (world) => named(titles.world(world.worldId), world.worldId, world.retired),
     };
   }

   export function worldColumns(titles: ContentTitles): readonly StatsColumn<WorldStats>[] {
     return [
       { header: 'Lenguaje', cell: (world) => languageLabel(world.language) },
       { header: 'Nivel', cell: (world) => levelLabel(world.level) },
       { header: 'Ejercicios', cell: (world) => formatCount(world.exercises) },
       { header: 'Filas resueltas', cell: (world) => formatCount(world.solvedRows) },
       { header: 'Alumnos con sellos', cell: (world) => formatCount(world.studentsWithSeals) },
       {
         header: 'Checkpoint',
         cell: (world) => (
           <RateCell
             numerator={world.checkpoint.passed}
             n={world.checkpoint.answered}
             label={`Checkpoint aprobado en ${titles.world(world.worldId)}`}
           />
         ),
       },
       {
         header: 'Opciones',
         cell: (world) => (
           <Distribution
             owner="world"
             ownerId={world.worldId}
             spread={world.checkpoint}
             label={`Opciones del checkpoint de ${titles.world(world.worldId)}`}
           />
         ),
       },
     ];
   }

   export function workshopHeader(titles: ContentTitles): StatsColumn<WorkshopStats> {
     return {
       header: 'Taller',
       cell: (workshop) =>
         named(titles.workshop(workshop.workshopId), workshop.workshopId, workshop.retired),
     };
   }

   export function workshopColumns(titles: ContentTitles): readonly StatsColumn<WorkshopStats>[] {
     const title = (workshop: WorkshopStats): string => titles.workshop(workshop.workshopId);
     return [
       { header: 'Lenguaje', cell: (workshop) => languageLabel(workshop.language) },
       { header: 'Nivel', cell: (workshop) => levelLabel(workshop.level) },
       { header: 'Empezaron', cell: (workshop) => formatCount(workshop.studentsStarted) },
       {
         header: 'Sellaron el código',
         cell: (workshop) => (
           <RateCell
             numerator={workshop.codeSealed}
             n={workshop.studentsStarted}
             label={`Sellaron el código de ${title(workshop)}`}
           />
         ),
       },
       {
         header: 'Predicción',
         cell: (workshop) => (
           <RateCell
             numerator={workshop.prediction.correct}
             n={workshop.prediction.answered}
             label={`Acierto de la predicción de ${title(workshop)}`}
           />
         ),
       },
       {
         header: 'Opciones',
         cell: (workshop) => (
           <Distribution
             owner="workshop"
             ownerId={workshop.workshopId}
             spread={workshop.prediction}
             label={`Opciones de la predicción de ${title(workshop)}`}
           />
         ),
       },
       { header: 'Mediana de etapas', cell: (workshop) => formatMaybe(workshop.stepsMarkedMedian) },
       {
         header: 'Mediana de objetivos',
         cell: (workshop) => formatMaybe(workshop.objectivesObservedMedian),
       },
     ];
   }

   export function markHeader(titles: ContentTitles): StatsColumn<RouteMark> {
     return { header: 'Marca', cell: (mark) => titles.routeItem(mark.kind, mark.itemKey) };
   }

   export const MARK_COLUMNS: readonly StatsColumn<RouteMark>[] = [
     { header: 'Tipo', cell: (mark) => MARK_KIND_LABELS[mark.kind] },
     { header: 'Alumnos', cell: (mark) => formatCount(mark.students) },
   ];

   export function quizHeader(titles: ContentTitles): StatsColumn<RouteQuiz> {
     return { header: 'Pregunta', cell: (quiz) => titles.routeItem('step', quiz.stepId) };
   }

   export function quizColumns(titles: ContentTitles): readonly StatsColumn<RouteQuiz>[] {
     return [
       { header: 'Respuestas', cell: (quiz) => formatCount(quiz.answered) },
       {
         header: 'Opciones',
         cell: (quiz) => (
           <Distribution
             owner="step"
             ownerId={quiz.stepId}
             spread={quiz}
             label={`Opciones de la pregunta de ${titles.routeItem('step', quiz.stepId)}`}
           />
         ),
       },
     ];
   }
   ```

2. **`ui/CurriculumReport.tsx`** (FR-014 a FR-017 y FR-019). El orden vive en la vista, para que una falla no lo pierda:

   ```tsx
   import { useMemo } from 'react';
   import { filterNote, type CurriculumTable } from '../model/curriculum-filters';
   import { ORDER_OPTIONS, sortExercises, type ExerciseOrder } from '../model/exercise-order';
   import {
     EMPTY_PERIOD,
     OUTCOME_KEYS,
     SOURCE_CURRENT,
     SOURCE_HISTORY,
     SOURCES_HELP,
   } from '../model/usage-labels';
   import type {
     CurriculumFilters,
     CurriculumStats,
     ExerciseStats,
     Stats,
   } from '../model/usage-types';
   import AggregateNotes from './AggregateNotes';
   import { useContentTitles } from './content-titles-context';
   import {
     CATALOG_COLUMNS,
     CATALOG_HEADER,
     MARK_COLUMNS,
     catalogKey,
     exerciseColumns,
     exerciseHeader,
     markHeader,
     quizColumns,
     quizHeader,
     workshopColumns,
     workshopHeader,
     worldColumns,
     worldHeader,
     type OpenExercise,
   } from './curriculum-columns';
   import FilterSelect from './FilterSelect';
   import StatsTable from './StatsTable';

   interface CurriculumReportProps {
     readonly stats: Stats<CurriculumStats>;
     readonly filters: CurriculumFilters;
     readonly order: ExerciseOrder;
     readonly busy: boolean;
     onOrder(order: ExerciseOrder): void;
     readonly onOpen: OpenExercise;
   }

   const CURRENT = `Fuente: ${SOURCE_CURRENT}.`;
   const EXERCISES_SOURCE = `Fuente: ${SOURCE_CURRENT} (empezaron, resueltos, ayuda y predicción) e ${SOURCE_HISTORY} (intentos).`;

   function attemptedSomething(exercises: readonly ExerciseStats[]): boolean {
     return exercises.some(({ attempts, operations, importedAttempts }) => {
       const outcomes = OUTCOME_KEYS.reduce((sum, key) => sum + attempts[key], 0);
       return outcomes + operations.infraError + operations.canceled + importedAttempts > 0;
     });
   }

   function noteOf(table: CurriculumTable, filters: CurriculumFilters, source: string): string {
     const filtered = filterNote(table, filters);
     return filtered === undefined ? source : `${filtered} ${source}`;
   }

   const CurriculumReport = ({ stats, filters, order, busy, onOrder, onOpen }: CurriculumReportProps) => {
     const titles = useContentTitles();
     const { data, period, generatedAt } = stats;
     const exercises = useMemo(() => sortExercises(data.exercises, order), [data.exercises, order]);
     return (
       <div className="usage-report" aria-busy={busy}>
         <AggregateNotes period={period} generatedAt={generatedAt} withGranularity={false} />
         {attemptedSomething(data.exercises) ? null : <p>{EMPTY_PERIOD}</p>}
         <p className="usage-help">{SOURCES_HELP}</p>
         <StatsTable
           title="Catálogos"
           note={noteOf('catalogs', filters, CURRENT)}
           rows={data.catalogs}
           rowKey={catalogKey}
           rowHeader={CATALOG_HEADER}
           columns={CATALOG_COLUMNS}
           busy={busy}
         />
         <FilterSelect label="Ordenar por" value={order} options={ORDER_OPTIONS} onChange={onOrder} />
         <StatsTable
           title="Ejercicios"
           note={noteOf('exercises', filters, EXERCISES_SOURCE)}
           rows={exercises}
           rowKey={(exercise) => exercise.exerciseId}
           rowHeader={exerciseHeader(titles)}
           columns={exerciseColumns(titles, onOpen)}
           busy={busy}
         />
         <StatsTable
           title="Mundos de la campaña"
           note={noteOf('worlds', filters, CURRENT)}
           rows={data.worlds}
           rowKey={(world) => world.worldId}
           rowHeader={worldHeader(titles)}
           columns={worldColumns(titles)}
           busy={busy}
         />
         <StatsTable
           title="Talleres de Sistemas"
           note={noteOf('workshops', filters, CURRENT)}
           rows={data.workshops}
           rowKey={(workshop) => `${workshop.workshopId}-${workshop.language}`}
           rowHeader={workshopHeader(titles)}
           columns={workshopColumns(titles)}
           busy={busy}
         />
         <StatsTable
           title="Recorrido"
           note={noteOf('route', filters, CURRENT)}
           rows={data.route.marks}
           rowKey={(mark) => `${mark.kind}-${mark.itemKey}`}
           rowHeader={markHeader(titles)}
           columns={MARK_COLUMNS}
           busy={busy}
         />
         <StatsTable
           title="Preguntas del recorrido"
           note={noteOf('route', filters, CURRENT)}
           rows={data.route.quiz}
           rowKey={(quiz) => quiz.stepId}
           rowHeader={quizHeader(titles)}
           columns={quizColumns(titles)}
           busy={busy}
         />
       </div>
     );
   };

   export default CurriculumReport;
   ```

3. **`ui/ExerciseDetail.tsx`** (FR-018 y L1). Sin pedido nuevo: usa la fila que ya llegó:

   ```tsx
   import { useEffect, useRef } from 'react';
   import { countNoun, formatCount } from '../model/usage-format';
   import {
     CONFIDENCE_KEYS,
     CONFIDENCE_LABELS,
     SOURCE_CURRENT,
     SOURCE_HISTORY,
   } from '../model/usage-labels';
   import type { ExerciseStats } from '../model/usage-types';
   import { useContentTitles } from './content-titles-context';
   import Distribution from './Distribution';
   import RateCell from './RateCell';
   import StatsTable from './StatsTable';

   interface ExerciseDetailProps {
     readonly exercise: ExerciseStats;
     onBack(): void;
   }

   const ExerciseDetail = ({ exercise, onBack }: ExerciseDetailProps) => {
     const titles = useContentTitles();
     const title = useRef<HTMLHeadingElement>(null);
     const name = titles.exercise(exercise.exerciseId);
     const { prediction, confidence, help } = exercise;
     const assessed = confidence.again + confidence.practice + confidence.confident;

     useEffect(() => {
       title.current?.focus();
     }, []);

     return (
       <div className="usage-view">
         <button type="button" className="button secondary" onClick={onBack}>
           Volver a Ejercicios
         </button>
         <h3 ref={title} tabIndex={-1}>
           {name}
         </h3>
         <StatsTable
           title="Pruebas"
           note={`Fuente: ${SOURCE_HISTORY}.`}
           rows={exercise.tests}
           rowKey={(test) => test.testKey}
           rowHeader={{ header: 'Prueba', cell: (test) => titles.test(exercise.exerciseId, test.testKey) }}
           columns={[
             { header: 'Veredictos', cell: (test) => formatCount(test.verdicts) },
             { header: 'Falló', cell: (test) => formatCount(test.fail) },
             { header: 'No llegó a correr', cell: (test) => formatCount(test.missing) },
           ]}
         />
         <div className="usage-block">
           <h4>Predicción</h4>
           <p className="usage-note">{`Fuente: ${SOURCE_CURRENT}.`}</p>
           <RateCell
             numerator={prediction.correct}
             n={prediction.answered}
             label={`Acierto de la predicción de ${name}`}
           />
           <Distribution
             owner="exercise"
             ownerId={exercise.exerciseId}
             spread={prediction}
             label={`Opciones elegidas en la predicción de ${name}`}
           />
         </div>
         <StatsTable
           title="Autoevaluación"
           note={`Fuente: ${SOURCE_CURRENT}.`}
           rows={CONFIDENCE_KEYS}
           rowKey={(key) => key}
           rowHeader={{ header: 'Autoevaluación', cell: (key) => CONFIDENCE_LABELS[key] }}
           columns={[
             {
               header: 'Alumnos',
               cell: (key) => (
                 <RateCell numerator={confidence[key]} n={assessed} label={CONFIDENCE_LABELS[key]} />
               ),
             },
           ]}
         />
         <StatsTable
           title="Pistas reveladas"
           note={`Fuente: ${SOURCE_CURRENT}.`}
           rows={help.hintsRevealed}
           rowKey={(count) => String(count.hints)}
           rowHeader={{ header: 'Pistas', cell: (count) => countNoun(count.hints, 'pista', 'pistas') }}
           columns={[{ header: 'Alumnos', cell: (count) => formatCount(count.students) }]}
         />
       </div>
     );
   };

   export default ExerciseDetail;
   ```

4. **`ui/ExercisesView.tsx`** (FR-014, FR-018 y L1). El detalle ocupa el lugar de la lista, que queda montada y oculta, y el foco vuelve al botón que lo abrió con `flushSync`, como en F12a:

   ```tsx
   import { useCallback, useState } from 'react';
   import { flushSync } from 'react-dom';
   import { useApiClient } from '../../../shared/api/http';
   import { getCurriculumStats } from '../api/usage-endpoints';
   import useStatsRequest from '../lib/use-stats-request';
   import { catalogOptions } from '../model/curriculum-filters';
   import type { ExerciseOrder } from '../model/exercise-order';
   import { LANGUAGE_FILTER, LEVEL_FILTER } from '../model/usage-labels';
   import type { CurriculumFilters, ExerciseStats } from '../model/usage-types';
   import CurriculumReport from './CurriculumReport';
   import ExerciseDetail from './ExerciseDetail';
   import FilterSelect from './FilterSelect';
   import PeriodForm from './PeriodForm';
   import { usePeriod } from './period-context';
   import RequestState from './RequestState';

   interface ExercisesViewProps {
     readonly ownId: number;
   }

   interface OpenedExercise {
     readonly exercise: ExerciseStats;
     readonly opener: HTMLButtonElement;
   }

   const EVERY_EXERCISE: CurriculumFilters = { catalog: '', language: '', level: '' };

   const ExercisesView = ({ ownId }: ExercisesViewProps) => {
     const client = useApiClient();
     const { period } = usePeriod();
     const [filters, setFilters] = useState(EVERY_EXERCISE);
     const [order, setOrder] = useState<ExerciseOrder>('catalog');
     const [opened, setOpened] = useState<OpenedExercise | null>(null);
     const load = useCallback(
       (signal: AbortSignal) => getCurriculumStats(client, period, filters, signal),
       [client, period, filters],
     );
     const request = useStatsRequest(load, ownId);
     const stats = request.data;

     const back = (): void => {
       const opener = opened?.opener;
       flushSync(() => setOpened(null));
       opener?.focus();
     };

     return (
       <div className="usage-view">
         <div className="usage-view" hidden={opened !== null}>
           <h3>Ejercicios</h3>
           <PeriodForm shown={stats?.period ?? null} withGranularity={false} failure={request.failure} />
           <div className="admin-filters">
             <FilterSelect
               label="Catálogo"
               value={filters.catalog}
               options={catalogOptions(stats?.data.catalogs ?? [], filters.catalog)}
               onChange={(catalog) => setFilters({ ...filters, catalog })}
             />
             <FilterSelect
               label="Lenguaje"
               value={filters.language}
               options={LANGUAGE_FILTER}
               onChange={(language) => setFilters({ ...filters, language })}
             />
             <FilterSelect
               label="Nivel"
               value={filters.level}
               options={LEVEL_FILTER}
               onChange={(level) => setFilters({ ...filters, level })}
             />
           </div>
           <RequestState
             request={request}
             lead="No pudimos cargar los ejercicios."
             loadingText="Cargando los ejercicios…"
           />
           {stats === null ? null : (
             <CurriculumReport
               stats={stats}
               filters={filters}
               order={order}
               busy={request.loading}
               onOrder={setOrder}
               onOpen={(exercise, opener) => setOpened({ exercise, opener })}
             />
           )}
         </div>
         {opened === null ? null : <ExerciseDetail exercise={opened.exercise} onBack={back} />}
       </div>
     );
   };

   export default ExercisesView;
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/exercises-view.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint`.
6. **Commit:** `feat(front): los ejercicios del uso del taller, con su detalle, los mundos, los talleres y el recorrido`.

### Tarea 3.5 · La cola y las ejecuciones, en rojo (T020, V3, desde S2)

**Archivos:** los stubs de `ui/RunsView.tsx`, `ui/QueuePanel.tsx`, `ui/RunFiltersForm.tsx` y `ui/RunsList.tsx`, con `ui/runs-view.spec.tsx`, en `frontend/src/pages/admin/`.

**Consume:** de U1, el modelo y la API; de U2, `useStatsRequest`, `useRunsPages` y las piezas; de F12a, `FilterSelect`; de F11a, `TextField` y `formatWait`. **Produce:** `RunsView` (`{ ownId }`) y `RunsList` (`{ runs, title, lead }`), que F14b reutiliza.

1. **`ui/runs-view.spec.tsx`.** Cubre la historia 6 (escenarios 1 a 3), FR-021 a FR-024 y SC-001 en la operación:

   ```tsx
   import { fireEvent, screen, within } from '@testing-library/react';
   import { beforeEach, describe, expect, it, vi } from 'vitest';
   import type { BarChart } from '../model/bar-chart';
   import { queueFactory, runFactory, runsBody } from '../model/usage.factory';
   import { PeriodProvider } from './period-context';
   import { OLGA, renderWithFetch, signInAs } from './render-admin';
   import RunsView from './RunsView';
   import { routeFetch, type RoutedReply } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const QUEUE = '/api/admin/queue';
   const RUNS = '/api/admin/runs';
   const NEXT = '019a0000-0000-7000-8000-000000000002';
   const BUSY_QUEUE = queueFactory.build({
     data: {
       now: { queued: 2, running: 1, oldestQueuedSeconds: 120, maxWaiting: 32, slots: 4 },
       lastDay: {
         finished: 2,
         waitMs: { p50: 1500, p95: null },
         durationMs: { p50: 500, p95: 900 },
         infraErrors: [
           { reason: 'executor_busy', runs: 1 },
           { reason: 'gpu_on_fire', runs: 2 },
         ],
       },
     },
   });
   const LATER_QUEUE = queueFactory.build({ meta: { generatedAt: '2026-10-07T15:05:00.000Z' } });
   const FIRST_PAGE = runsBody([runFactory.build({ status: 'infra_error', reason: 'executor_busy' })], NEXT);
   const LAST_PAGE = runsBody([runFactory.build({ id: '019a0000-0000-7000-8000-000000000001' })]);

   function renderRuns(queue: readonly RoutedReply[], runs: readonly RoutedReply[]) {
     const routed = routeFetch({ [QUEUE]: queue, [RUNS]: runs });
     const user = renderWithFetch(
       <PeriodProvider>
         <RunsView ownId={OLGA.id} />
       </PeriodProvider>,
       routed.fetch,
     );
     return { user, routed };
   }

   function figure(label: string): HTMLElement {
     const item = screen.getByText(label, { selector: 'dt' }).closest('div');
     if (item === null) throw new Error(`no figure for ${label}`);
     return item;
   }

   beforeEach(() => {
     signInAs();
   });

   describe('«Ejecuciones»', () => {
     it('asks for the queue and the runs once each, and shows «—» for a missing percentile', async () => {
       const { routed } = renderRuns([{ status: 200, json: BUSY_QUEUE }], [{ status: 200, json: FIRST_PAGE }]);
       await screen.findByRole('table', { name: 'Ejecuciones, de la más nueva a la más vieja' });
       expect(routed.callsTo(QUEUE)).toHaveLength(1);
       expect(routed.callsTo(RUNS)).toHaveLength(1);
       expect(routed.callsTo(RUNS)[0]?.query).toEqual({});
       expect(figure('En cola')).toHaveTextContent('2');
       expect(figure('Espera más vieja')).toHaveTextContent('2 minutos');
       expect(figure('Espera hasta empezar (mediana · p95)')).toHaveTextContent('1,5 s · —');
       expect(figure('Duración (mediana · p95)')).toHaveTextContent('0,5 s · 0,9 s');
       const reasons = screen.getByRole('table', { name: 'Fallas del sandbox, por motivo' });
       expect(within(reasons).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
         'Sandbox ocupado',
         'gpu_on_fire',
       ]);
       expect(
         screen.getByText(
           'No cuenta los pedidos rechazados por la cuota o por la cola llena: no quedan registrados.',
         ),
       ).toBeInTheDocument();
       expect(
         screen.getByText('El taller guarda las ejecuciones 14 días: las anteriores ya no existen.'),
       ).toBeInTheDocument();
     });

     it('shows the closed list of columns of a run', async () => {
       renderRuns([{ status: 200, json: BUSY_QUEUE }], [{ status: 200, json: FIRST_PAGE }]);
       const table = await screen.findByRole('table', {
         name: 'Ejecuciones, de la más nueva a la más vieja',
       });
       expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
         'Aceptada',
         'Cuenta',
         'Ejercicio',
         'Lenguaje',
         'Estado',
         'Motivo',
         'Fase',
         'Código de salida',
         'Salida cortada',
         'Compilación',
         'Ejecución',
         'Empezó',
         'Terminó',
         'Cancelación pedida',
       ]);
       const row = within(table).getAllByRole('row')[1];
       expect(row).toHaveTextContent('Falla del sandbox');
       expect(row).toHaveTextContent('Sandbox ocupado');
     });

     it('refreshes only the queue on «Actualizar» and says the new time', async () => {
       const { user, routed } = renderRuns(
         [
           { status: 200, json: BUSY_QUEUE },
           { status: 200, json: LATER_QUEUE },
         ],
         [{ status: 200, json: FIRST_PAGE }],
       );
       const before = (await screen.findByText(/^Actualizada a las \d{2}:\d{2}\.$/)).textContent;
       await user.click(screen.getByRole('button', { name: 'Actualizar' }));
       await vi.waitFor(() =>
         expect(screen.getByText(/^Actualizada a las \d{2}:\d{2}\.$/).textContent).not.toBe(before),
       );
       expect(routed.callsTo(QUEUE)).toHaveLength(2);
       expect(routed.callsTo(RUNS)).toHaveLength(1);
     });

     it('filters by state from the first page and pages with the cursor, keeping the filter', async () => {
       const { user, routed } = renderRuns(
         [{ status: 200, json: BUSY_QUEUE }],
         [
           { status: 200, json: FIRST_PAGE },
           { status: 200, json: FIRST_PAGE },
           { status: 200, json: LAST_PAGE },
           { status: 200, json: FIRST_PAGE },
         ],
       );
       await screen.findByRole('button', { name: 'Más viejas' });
       await user.selectOptions(screen.getByLabelText('Estado'), 'infra_error');
       await vi.waitFor(() => expect(routed.callsTo(RUNS)).toHaveLength(2));
       await vi.waitFor(() =>
         expect(screen.getByRole('button', { name: 'Más viejas' })).toBeEnabled(),
       );
       await user.click(screen.getByRole('button', { name: 'Más viejas' }));
       await vi.waitFor(() => expect(routed.callsTo(RUNS)).toHaveLength(3));
       expect(await screen.findByRole('button', { name: 'Volver a las más nuevas' })).toBeInTheDocument();
       expect(screen.queryByRole('button', { name: 'Más viejas' })).toBeNull();
       await user.click(screen.getByRole('button', { name: 'Volver a las más nuevas' }));
       await vi.waitFor(() => expect(routed.callsTo(RUNS)).toHaveLength(4));
       expect(routed.callsTo(RUNS).map((call) => call.query)).toEqual([
         {},
         { status: 'infra_error' },
         { status: 'infra_error', cursor: NEXT },
         { status: 'infra_error' },
       ]);
     });

     it('filters by exercise and date when the filter is sent', async () => {
       const { user, routed } = renderRuns([{ status: 200, json: BUSY_QUEUE }], [{ status: 200, json: FIRST_PAGE }]);
       await screen.findByRole('table', { name: 'Ejecuciones, de la más nueva a la más vieja' });
       await user.type(screen.getByLabelText('Ejercicio'), 'rust-01');
       fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } });
       expect(routed.callsTo(RUNS)).toHaveLength(1);
       await user.click(screen.getByRole('button', { name: 'Filtrar' }));
       await vi.waitFor(() => expect(routed.callsTo(RUNS)).toHaveLength(2));
       expect(routed.callsTo(RUNS)[1]?.query).toEqual({ exercise: 'rust-01', since: '2026-10-01' });
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/runs-view.spec.tsx`: en rojo, por `not implemented`.
3. **Commit:** `test(front): specs de la cola y las ejecuciones, en rojo`.

### Tarea 3.6 · La cola y las ejecuciones (T021, V3)

**Archivos:** `ui/QueuePanel.tsx`, `ui/RunFiltersForm.tsx`, `ui/RunsList.tsx` y `ui/RunsView.tsx`, en `frontend/src/pages/admin/`.

1. **`ui/QueuePanel.tsx`** (FR-021 y FR-022). Sin temporizadores: «Actualizar» vuelve a pedir y dice a qué hora llegó:

   ```tsx
   import { formatWait } from '../../../shared/lib/format-wait';
   import type { StatsRequest } from '../lib/use-stats-request';
   import { NO_DATA, formatClock, formatCount, formatSeconds } from '../model/usage-format';
   import { REJECTIONS_NOTE, reasonLabel } from '../model/usage-labels';
   import type { QueueLastDay, QueueNow, QueueStats } from '../model/usage-types';
   import Figures, { type FigureItem } from './Figures';
   import RequestState from './RequestState';
   import StatsTable from './StatsTable';

   interface QueuePanelProps {
     readonly queue: StatsRequest<QueueStats>;
   }

   function nowItems(now: QueueNow): FigureItem[] {
     const oldest = now.oldestQueuedSeconds;
     return [
       { label: 'En cola', value: formatCount(now.queued) },
       { label: 'Corriendo', value: formatCount(now.running) },
       { label: 'Espera más vieja', value: oldest === null ? NO_DATA : formatWait(oldest) },
       { label: 'Tope de la cola', value: formatCount(now.maxWaiting) },
       { label: 'Lugares del sandbox', value: formatCount(now.slots) },
     ];
   }

   function lastDayItems(lastDay: QueueLastDay): FigureItem[] {
     return [
       { label: 'Terminadas', value: formatCount(lastDay.finished) },
       {
         label: 'Espera hasta empezar (mediana · p95)',
         value: `${formatSeconds(lastDay.waitMs.p50)} · ${formatSeconds(lastDay.waitMs.p95)}`,
       },
       {
         label: 'Duración (mediana · p95)',
         value: `${formatSeconds(lastDay.durationMs.p50)} · ${formatSeconds(lastDay.durationMs.p95)}`,
       },
     ];
   }

   const QueuePanel = ({ queue }: QueuePanelProps) => (
     <div className="usage-block">
       <div className="admin-filters">
         <button
           type="button"
           className="button secondary"
           disabled={queue.loading || queue.waiting}
           onClick={queue.reload}
         >
           Actualizar
         </button>
         {queue.data === null ? null : (
           <p className="usage-note" role="status">
             {`Actualizada a las ${formatClock(queue.data.generatedAt)}.`}
           </p>
         )}
       </div>
       <RequestState request={queue} lead="No pudimos cargar la cola." loadingText="Cargando la cola…" />
       {queue.data === null ? null : (
         <>
           <Figures title="Ahora" items={nowItems(queue.data.now)} />
           <Figures title="Últimas 24 horas" items={lastDayItems(queue.data.lastDay)} />
           <StatsTable
             title="Fallas del sandbox, por motivo"
             rows={queue.data.lastDay.infraErrors}
             rowKey={(row) => row.reason}
             rowHeader={{ header: 'Motivo', cell: (row) => reasonLabel(row.reason) }}
             columns={[{ header: 'Ejecuciones', cell: (row) => formatCount(row.runs) }]}
           />
         </>
       )}
       <p className="usage-note">{REJECTIONS_NOTE}</p>
     </div>
   );

   export default QueuePanel;
   ```

2. **`ui/RunFiltersForm.tsx`** (FR-024). El estado pide al cambiar; el ejercicio y la fecha, al enviar el formulario, para no pedir con cada tecla:

   ```tsx
   import { useForm } from 'react-hook-form';
   import { TextField } from '../../../shared/ui/form';
   import { RUN_STATUS_FILTER } from '../model/usage-labels';
   import type { RunFilters } from '../model/usage-types';
   import DateField from './DateField';
   import FilterSelect from './FilterSelect';

   interface RunFiltersFormProps {
     readonly filters: RunFilters;
     onChange(filters: RunFilters): void;
   }

   interface SentFilters {
     exercise: string;
     since: string;
   }

   const RunFiltersForm = ({ filters, onChange }: RunFiltersFormProps) => {
     const { register, handleSubmit } = useForm<SentFilters>({
       defaultValues: { exercise: filters.exercise, since: filters.since },
     });
     return (
       <div className="admin-filters">
         <FilterSelect
           label="Estado"
           value={filters.status}
           options={RUN_STATUS_FILTER}
           onChange={(status) => onChange({ ...filters, status })}
         />
         <form
           className="admin-filters"
           aria-label="Filtrar las ejecuciones"
           noValidate
           onSubmit={handleSubmit(({ exercise, since }) => onChange({ ...filters, exercise, since }))}
         >
           <TextField
             label="Ejercicio"
             autoComplete="off"
             registration={register('exercise')}
             messages={[]}
           />
           <DateField label="Desde" registration={register('since')} messages={[]} />
           <button type="submit" className="button secondary">
             Filtrar
           </button>
         </form>
       </div>
     );
   };

   export default RunFiltersForm;
   ```

3. **`ui/RunsList.tsx`** (FR-023 y FR-024). F14b la reutiliza para las ejecuciones de una cuenta:

   ```tsx
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import type { RunsPages } from '../lib/use-runs-pages';
   import type { ContentTitles } from '../model/content-titles';
   import { NO_DATA, formatMaybe, formatSeconds } from '../model/usage-format';
   import { RUN_STATUS_LABELS, languageLabel, phaseLabel, reasonLabel } from '../model/usage-labels';
   import type { RunRow } from '../model/usage-types';
   import { useContentTitles } from './content-titles-context';
   import RequestState from './RequestState';
   import StatsTable, { type StatsColumn } from './StatsTable';

   interface RunsListProps {
     readonly runs: RunsPages;
     readonly title: string;
     readonly lead: string;
   }

   function yesNo(value: boolean | null): string {
     if (value === null) return NO_DATA;
     return value ? 'Sí' : 'No';
   }

   function instant(value: string | null): string {
     return value === null ? NO_DATA : formatLocalDateTime(value);
   }

   const ACCEPTED: StatsColumn<RunRow> = {
     header: 'Aceptada',
     cell: (run) => formatLocalDateTime(run.createdAt),
   };

   function runColumns(titles: ContentTitles): readonly StatsColumn<RunRow>[] {
     return [
       { header: 'Cuenta', cell: (run) => run.account.name },
       { header: 'Ejercicio', cell: (run) => titles.exercise(run.exerciseId) },
       { header: 'Lenguaje', cell: (run) => languageLabel(run.language) },
       { header: 'Estado', cell: (run) => RUN_STATUS_LABELS[run.status] },
       { header: 'Motivo', cell: (run) => (run.reason === null ? NO_DATA : reasonLabel(run.reason)) },
       {
         header: 'Fase',
         cell: (run) => (run.executorPhase === null ? NO_DATA : phaseLabel(run.executorPhase)),
       },
       { header: 'Código de salida', cell: (run) => formatMaybe(run.exitCode) },
       { header: 'Salida cortada', cell: (run) => yesNo(run.truncated) },
       { header: 'Compilación', cell: (run) => formatSeconds(run.compileMs) },
       { header: 'Ejecución', cell: (run) => formatSeconds(run.runMs) },
       { header: 'Empezó', cell: (run) => instant(run.startedAt) },
       { header: 'Terminó', cell: (run) => instant(run.finishedAt) },
       { header: 'Cancelación pedida', cell: (run) => yesNo(run.cancelRequested) },
     ];
   }

   const RunsList = ({ runs, title, lead }: RunsListProps) => {
     const titles = useContentTitles();
     const page = runs.data;
     return (
       <div className="usage-block">
         <RequestState request={runs} lead={lead} loadingText="Cargando las ejecuciones…" />
         {page === null ? null : (
           <>
             <p className="usage-note">
               {`El taller guarda las ejecuciones ${page.retentionDays} días: las anteriores ya no existen.`}
             </p>
             {page.runs.length === 0 ? (
               <p>No hay ejecuciones con esos filtros.</p>
             ) : (
               <StatsTable
                 title={title}
                 rows={page.runs}
                 rowKey={(run) => run.id}
                 rowHeader={ACCEPTED}
                 columns={runColumns(titles)}
                 busy={runs.loading}
               />
             )}
             <nav className="admin-pagination" aria-label="Páginas de las ejecuciones">
               {runs.first ? null : (
                 <button type="button" className="button secondary small" onClick={runs.newest}>
                   Volver a las más nuevas
                 </button>
               )}
               {page.nextCursor === null ? null : (
                 <button
                   type="button"
                   className="button secondary small"
                   disabled={runs.loading}
                   onClick={runs.older}
                 >
                   Más viejas
                 </button>
               )}
             </nav>
           </>
         )}
       </div>
     );
   };

   export default RunsList;
   ```

4. **`ui/RunsView.tsx`:**

   ```tsx
   import { useCallback, useState } from 'react';
   import { useApiClient } from '../../../shared/api/http';
   import { getQueue, listRuns } from '../api/usage-endpoints';
   import useRunsPages from '../lib/use-runs-pages';
   import useStatsRequest from '../lib/use-stats-request';
   import type { RunFilters } from '../model/usage-types';
   import QueuePanel from './QueuePanel';
   import RunFiltersForm from './RunFiltersForm';
   import RunsList from './RunsList';

   interface RunsViewProps {
     readonly ownId: number;
   }

   const EVERY_RUN: RunFilters = { status: '', exercise: '', since: '' };

   const RunsView = ({ ownId }: RunsViewProps) => {
     const client = useApiClient();
     const [filters, setFilters] = useState(EVERY_RUN);
     const loadQueue = useCallback((signal: AbortSignal) => getQueue(client, signal), [client]);
     const queue = useStatsRequest(loadQueue, ownId);
     const loadRuns = useCallback(
       (cursor: string | null, signal: AbortSignal) => listRuns(client, filters, cursor, signal),
       [client, filters],
     );
     const runs = useRunsPages(loadRuns, ownId);
     return (
       <div className="usage-view">
         <h3>Ejecuciones</h3>
         <QueuePanel queue={queue} />
         <RunFiltersForm filters={filters} onChange={setFilters} />
         <RunsList
           runs={runs}
           title="Ejecuciones, de la más nueva a la más vieja"
           lead="No pudimos cargar las ejecuciones."
         />
       </div>
     );
   };

   export default RunsView;
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/runs-view.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint`.
6. **Commit:** `feat(front): la cola y las ejecuciones del sandbox en la administración`.

### Tarea 3.7 · La sección en la página, en rojo (T022, P, desde S3)

**Archivos:** el stub de `frontend/src/pages/admin/ui/UsageSection.tsx` y `ui/usage-section.spec.tsx`.

**Consume:** las tres vistas; de F12a, `AdminPage`, `pageBody` (`model/admin.factory.ts`) y `render-admin.tsx`. **Produce:** `UsageSection` (`{ ownId }`).

1. **`ui/usage-section.spec.tsx`.** Cubre FR-001 a FR-004, SC-009 y la Review Focus 3. Monta la página sola, sin contenedor. El orden de las vistas se fija por la primera, la segunda y la última, porque F14b suma «Alumnos» en el tercer lugar sin editar esta spec:

   ```tsx
   import { fireEvent, screen, within } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { FakeReply } from '../../../shared/api/http/fake-fetch';
   import { pageBody } from '../model/admin.factory';
   import type { BarChart } from '../model/bar-chart';
   import type { TitleSource } from '../model/content-titles';
   import {
     curriculumFactory,
     exerciseFactory,
     overviewFactory,
     statsBody,
   } from '../model/usage.factory';
   import AdminPage from './AdminPage';
   import { ContentTitlesProvider } from './content-titles-context';
   import { renderWithFetch, signInAs, stubDialogs } from './render-admin';
   import { deferred, routeFetch, type RoutedReply } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const USERS = '/api/admin/users';
   const OVERVIEW = '/api/admin/stats/overview';
   const EXERCISES = '/api/admin/stats/exercises';
   const OVERVIEW_BODY = statsBody(overviewFactory.build());
   const CURRICULUM_BODY = statsBody(curriculumFactory.build({ exercises: [exerciseFactory.build()] }));
   const SOURCE: TitleSource = {
     lab: {
       rust: [
         {
           id: 'rust-01',
           title: 'La energía del reactor',
           tests: [],
           prediction: { options: [] },
         },
       ],
     },
     quests: {},
     cores: {},
     campaign: {},
     workshops: {},
     guide: { resources: [], tracks: {} },
   };

   function renderPage(overview: readonly RoutedReply[], withTitles = false) {
     const routed = routeFetch({
       [USERS]: [{ status: 200, json: pageBody([]) }],
       [OVERVIEW]: overview,
       [EXERCISES]: [{ status: 200, json: CURRICULUM_BODY }],
     });
     const page = <AdminPage initialSection="accounts" onClose={vi.fn()} />;
     const user = renderWithFetch(
       withTitles ? <ContentTitlesProvider source={() => SOURCE}>{page}</ContentTitlesProvider> : page,
       routed.fetch,
     );
     return { user, routed };
   }

   function sections() {
     return screen.getByRole('group', { name: 'Secciones de la administración' });
   }

   function views() {
     return screen.getByRole('group', { name: 'Vistas de Uso del taller' });
   }

   beforeAll(stubDialogs);
   beforeEach(() => {
     signInAs();
   });

   describe('«Uso del taller» in the administration', () => {
     it('comes after «Invitaciones» and opens on «Resumen» with one request', async () => {
       const { user, routed } = renderPage([{ status: 200, json: OVERVIEW_BODY }]);
       expect(within(sections()).getAllByRole('button').map((button) => button.textContent)).toEqual([
         'Cuentas',
         'Invitaciones',
         'Uso del taller',
       ]);
       await user.click(within(sections()).getByRole('button', { name: 'Uso del taller' }));
       expect(within(sections()).getByRole('button', { name: 'Uso del taller' })).toHaveAttribute(
         'aria-pressed',
         'true',
       );
       const viewLabels = within(views())
         .getAllByRole('button')
         .map((button) => button.textContent);
       expect(viewLabels.slice(0, 2)).toEqual(['Resumen', 'Ejercicios']);
       expect(viewLabels.at(-1)).toBe('Ejecuciones');
       expect(within(views()).getByRole('button', { name: 'Resumen' })).toHaveAttribute(
         'aria-pressed',
         'true',
       );
       expect(await screen.findByRole('heading', { name: 'En el período' })).toBeInTheDocument();
       expect(routed.callsTo(OVERVIEW)).toHaveLength(1);
     });

     it('cancels the request of the view it leaves and draws nothing from it', async () => {
       const pending = deferred<FakeReply>();
       const { user, routed } = renderPage([pending.promise]);
       await user.click(within(sections()).getByRole('button', { name: 'Uso del taller' }));
       within(views()).getByRole('button', { name: 'Resumen' }).focus();
       await user.keyboard('{Tab}');
       const exercises = within(views()).getByRole('button', { name: 'Ejercicios' });
       expect(exercises).toHaveFocus();
       await user.keyboard('{Enter}');
       expect(exercises).toHaveAttribute('aria-pressed', 'true');
       expect(exercises).toHaveFocus();
       expect(routed.callsTo(OVERVIEW)[0]?.signal?.aborted).toBe(true);
       pending.resolve({ status: 200, json: OVERVIEW_BODY });
       expect(await screen.findByRole('table', { name: 'Catálogos' })).toBeInTheDocument();
       expect(screen.queryByRole('heading', { name: 'En el período' })).toBeNull();
     });

     it('keeps the chosen period across views and sections while the page lives', async () => {
       const { user, routed } = renderPage([{ status: 200, json: OVERVIEW_BODY }]);
       await user.click(within(sections()).getByRole('button', { name: 'Uso del taller' }));
       await screen.findByRole('heading', { name: 'En el período' });
       fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-05' } });
       await user.click(screen.getByRole('button', { name: 'Aplicar' }));
       await vi.waitFor(() => expect(routed.callsTo(OVERVIEW)).toHaveLength(2));
       const chosen = { from: '2026-10-01', to: '2026-10-05', granularity: 'day' };
       await user.click(within(views()).getByRole('button', { name: 'Ejercicios' }));
       await vi.waitFor(() => expect(routed.callsTo(EXERCISES)).toHaveLength(1));
       expect(routed.callsTo(EXERCISES)[0]?.query).toEqual(chosen);
       await user.click(within(sections()).getByRole('button', { name: 'Cuentas' }));
       await user.click(within(sections()).getByRole('button', { name: 'Uso del taller' }));
       await vi.waitFor(() => expect(routed.callsTo(OVERVIEW)).toHaveLength(3));
       expect(routed.callsTo(OVERVIEW)[2]?.query).toEqual(chosen);
     });

     it('names the exercises with the titles that the container provides', async () => {
       const { user } = renderPage([{ status: 200, json: OVERVIEW_BODY }], true);
       await user.click(within(sections()).getByRole('button', { name: 'Uso del taller' }));
       await user.click(within(views()).getByRole('button', { name: 'Ejercicios' }));
       const table = await screen.findByRole('table', { name: 'Ejercicios' });
       expect(within(table).getByRole('rowheader')).toHaveTextContent('La energía del reactor (rust-01)');
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/usage-section.spec.tsx`: en rojo. La primera prueba falla porque la página tiene dos secciones; las otras, por `not implemented` o por la sección que falta.
3. **Commit:** `test(front): specs de «Uso del taller» dentro de la página, en rojo`.

### Tarea 3.8 · La sección, la página, los estilos y la licencia (T023, P)

**Archivos:** en `frontend/src/pages/admin/`, `ui/UsageSection.tsx`, `ui/AdminPage.tsx`, `model/types.ts`, `index.ts` y `ui/admin.css`; y `qa/build-check.ts`.

1. **`ui/UsageSection.tsx`** (FR-001 y FR-002). Las vistas usan el mismo patrón de botones que las secciones de F12a; cambiar de vista desmonta la anterior, que cancela su pedido:

   ```tsx
   import { useState, type ReactNode } from 'react';
   import { VIEW_LABELS } from '../model/usage-labels';
   import type { UsageView } from '../model/usage-types';
   import ExercisesView from './ExercisesView';
   import OverviewView from './OverviewView';
   import RunsView from './RunsView';

   interface UsageSectionProps {
     readonly ownId: number;
   }

   const VIEWS: readonly UsageView[] = ['overview', 'exercises', 'runs'];

   function viewContent(view: UsageView, ownId: number): ReactNode {
     switch (view) {
       case 'overview':
         return <OverviewView ownId={ownId} />;
       case 'exercises':
         return <ExercisesView ownId={ownId} />;
       case 'runs':
         return <RunsView ownId={ownId} />;
     }
   }

   const UsageSection = ({ ownId }: UsageSectionProps) => {
     const [view, setView] = useState<UsageView>('overview');
     return (
       <div className="admin-section">
         <div className="admin-sections usage-views" role="group" aria-label="Vistas de Uso del taller">
           {VIEWS.map((id) => (
             <button
               key={id}
               type="button"
               className="admin-section-button"
               aria-pressed={view === id}
               onClick={() => setView(id)}
             >
               {VIEW_LABELS[id]}
             </button>
           ))}
         </div>
         {viewContent(view, ownId)}
       </div>
     );
   };

   export default UsageSection;
   ```

2. **`model/types.ts`,** una línea (FR-003):

   ```diff
   -export type AdminSection = 'accounts' | 'invitations';
   +export type AdminSection = 'accounts' | 'invitations' | 'usage';
   ```

3. **`ui/AdminPage.tsx`,** este diff sobre el de F12a (T020 de F12a). El período vive en la página, alrededor de las secciones (research, R6):

   ```diff
   -import { useEffect, useId, useRef, useState } from 'react';
   +import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
    import { useStore } from 'zustand';
    import { sessionStore } from '../../../entities/session';
    import type { AdminSection } from '../model/types';
    import AccountsSection from './AccountsSection';
    import InvitationsSection from './InvitationsSection';
   +import { PeriodProvider } from './period-context';
   +import UsageSection from './UsageSection';

    interface AdminPageProps {
      readonly initialSection: AdminSection;
      onClose(): void;
    }

    const SECTIONS: readonly { readonly id: AdminSection; readonly label: string }[] = [
      { id: 'accounts', label: 'Cuentas' },
      { id: 'invitations', label: 'Invitaciones' },
   +  { id: 'usage', label: 'Uso del taller' },
    ];

   +function sectionContent(section: AdminSection, ownId: number): ReactNode {
   +  switch (section) {
   +    case 'accounts':
   +      return <AccountsSection ownId={ownId} />;
   +    case 'invitations':
   +      return <InvitationsSection ownId={ownId} />;
   +    case 'usage':
   +      return <UsageSection ownId={ownId} />;
   +  }
   +}
   +
    const AdminPage = ({ initialSection, onClose }: AdminPageProps) => {
   @@
   -      {section === 'accounts' ? (
   -        <AccountsSection ownId={ownId} />
   -      ) : (
   -        <InvitationsSection ownId={ownId} />
   -      )}
   +      <PeriodProvider>{sectionContent(section, ownId)}</PeriodProvider>
        </section>
   ```

   Si la base de F12a dibuja las secciones de otra forma (T001, B2), el cambio es el mismo: la tercera entrada de `SECTIONS`, la sección nueva y `PeriodProvider` alrededor de lo que se dibuja.

4. **`index.ts`,** la API pública suma el provider de los títulos y su forma (contrato):

   ```diff
    export { default as AdminPage } from './ui/AdminPage';
    export type { AdminSection } from './model/types';
   +export { ContentTitlesProvider } from './ui/content-titles-context';
   +export type { ContentTitles, TitleSource } from './model/content-titles';
   ```

5. **`ui/admin.css`.** El grupo de secciones pasa a envolver (con tres botones, a 320 px), y las reglas de la sección van al final. Los colores salen de las variables del taller (FR-055):

   ```diff
    .admin-sections {
      display: flex;
   +  flex-wrap: wrap;
      gap: 18px;
   ```

   ```css
   .usage-views {
     margin: 0;
   }
   .usage-view,
   .usage-report {
     display: grid;
     gap: 20px;
   }
   .usage-view[hidden] {
     display: none;
   }
   .usage-notes {
     display: grid;
     gap: 4px;
   }
   .usage-notes p,
   .usage-note,
   .usage-help,
   .usage-loading {
     margin: 0;
     color: var(--muted);
     font-size: 13px;
   }
   .usage-block {
     display: grid;
     gap: 10px;
   }
   .usage-block h4 {
     margin: 0;
     font-size: 16px;
   }
   .usage-figures {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
     gap: 10px 18px;
     margin: 0;
   }
   .usage-figures div {
     display: grid;
     gap: 2px;
   }
   .usage-figures dt {
     color: var(--muted);
     font-size: 12px;
   }
   .usage-figures dd {
     margin: 0;
     font-size: 20px;
     font-weight: 550;
   }
   .usage-source {
     display: block;
     color: var(--muted);
     font-size: 11px;
     font-weight: 400;
   }
   .usage-id {
     color: var(--muted);
     font-weight: 400;
   }
   .usage-rate,
   .usage-distribution li,
   .usage-legend li {
     display: flex;
     flex-wrap: wrap;
     gap: 6px;
     align-items: center;
   }
   .usage-rate meter,
   .usage-distribution meter {
     width: 64px;
   }
   .usage-distribution,
   .usage-legend {
     display: flex;
     flex-wrap: wrap;
     gap: 6px 14px;
     margin: 0;
     padding: 0;
     list-style: none;
   }
   .usage-distribution {
     flex-direction: column;
   }
   .usage-chart {
     display: grid;
     gap: 8px;
     margin: 0;
   }
   .usage-chart figcaption {
     font-weight: 550;
   }
   .usage-chart-scroll {
     max-width: 100%;
     overflow-x: auto;
   }
   .usage-swatch {
     display: inline-block;
     width: 12px;
     height: 12px;
     border-radius: 2px;
   }
   .usage-swatch-green {
     background: var(--green);
   }
   .usage-swatch-accent {
     background: var(--accent);
   }
   .usage-swatch-accent-dark {
     background: var(--accent-dark);
   }
   .usage-swatch-muted {
     background: var(--muted);
   }
   .usage-swatch-ink {
     background: var(--ink);
   }
   .usage-swatch-line {
     background: var(--line);
   }
   ```

6. **`qa/build-check.ts`,** una aserción más, después de la de fflate (research, R11). No cambia ninguna de las que hay:

   ```diff
    assert(
      /Copyright \(c\) \d{4} Arjun Barrett/.test(page.bootText),
      'fflate license retained in standalone HTML',
    );
   +assert(/Leon Sorokin/.test(page.bootText), 'uPlot license retained in standalone HTML');
   ```

7. **Correr:**
   - `npm run test:unit -- frontend/src/pages/admin`, en verde: las specs de F14a y **todas las de F12a sin editar**, también `admin-page.spec.tsx`, que ahora carga uPlot en jsdom (Review Focus 2);
   - `npm run typecheck`, `npm run lint` y `npm run format:check`;
   - `npm run build` y `npm test`: `boot-check` y `dist-content-check` evalúan uPlot en su navegador falso (Review Focus 1). **Prueba de la Review Focus 1:** `git stash push qa/lib/boot-harness.ts` antes de `node qa/boot-check.ts` tiene que dar un error de `devicePixelRatio` o `matchMedia`; con `git stash pop`, en verde;
   - **el peso:** `node -e 'console.log(require("node:fs").readFileSync("dist/index.html","utf8").length)'`, menos el valor de T001. Anotalo en research.md. **Si pasa de 80 000, parás y le preguntás al usuario** (FR-057);
   - `git grep -n "style=\|\.cssText\|setAttribute('style'" -- frontend/src/pages/admin` no imprime nada nuevo.
8. **Commit:** `feat(front): «Uso del taller», la tercera sección de la administración`.

### Tarea 3.9 · Los títulos desde `app/` y la compuerta de U3 (T024, K)

**Archivos:** el contenedor que dibuja `<AdminPage` en la base (B3): `frontend/src/app/account/AdminDialog.tsx` o, con F10b, `frontend/src/app/routes/page-entries.tsx`.

**La prueba que lo pide** es de T026: «names the exercises from the content» en `admin-usage-exercises.spec.ts`, que espera el título del contrato congelado y ve el id mientras nadie monte el provider.

1. **Con `AdminDialog.tsx` (F12a):**

   ```diff
    import { useLayoutEffect, useRef } from 'react';
    import type { AdministrationProps } from '../../pages/account';
   -import { AdminPage } from '../../pages/admin';
   +import { AdminPage, ContentTitlesProvider } from '../../pages/admin';
   +import { getContent } from '../content/content';
   @@
   -      <AdminPage initialSection="accounts" onClose={() => dialog.current?.close()} />
   +      <ContentTitlesProvider source={getContent}>
   +        <AdminPage initialSection="accounts" onClose={() => dialog.current?.close()} />
   +      </ContentTitlesProvider>
   ```

2. **Con `page-entries.tsx` (F10b):**

   ```diff
   -import { AdminPage } from '../../pages/admin';
   +import { AdminPage, ContentTitlesProvider } from '../../pages/admin';
   +import { getContent } from '../content/content';
   @@
      administracion: ({ actions }) => (
   -    <AdminPage initialSection="accounts" onClose={actions.closeAdministration} />
   +    <ContentTitlesProvider source={getContent}>
   +      <AdminPage initialSection="accounts" onClose={actions.closeAdministration} />
   +    </ContentTitlesProvider>
      ),
   ```

   `getContent` cumple `() => TitleSource` sin conversión, porque `Content` tiene esa forma (research, R7). Si `tsc` no lo acepta, se avisa y se escribe en `app/` una función que arma el `TitleSource` campo por campo; `pages/admin` no cambia. `getContent` se llama recién cuando una vista pide un título (`lazyTitles`), así que la spec de F12a del contenedor (`admin-dialog.spec.tsx`), que no publica contenido y nunca abre la sección, no cambia.
3. **La compuerta de U3:**
   - `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`, en verde;
   - `node qa/seams-guard-check.ts`, en verde: `app/` lee el contenido y `pages/admin` no;
   - la red completa tres veces seguidas: `E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0`, con las E2E de T026 en verde;
   - la revisión en el navegador: `npm run build && npm run preview`, abrir la administración con una sesión de admin del stack local, recorrer las tres vistas con el teclado, a 320 px y con movimiento reducido.
4. **Commit:** `feat(front): la administración nombra los ejercicios, los mundos y el recorrido con el contenido cargado`.
5. **El PR:** `feat(front): usage section with overview, exercises and runs (F14a U3)`, contra `f14a/base`.

**Reversión de U3:** se revierten T024 a T016, en orden inverso. Revertir T023 saca uPlot del bundle; el arnés de T008 queda, porque no molesta.

## 4. U4 · Las E2E (onda 1: E, T025; onda 3: E, T026)

**Cubre:** SC-001 a SC-003, SC-004 (la última oración), SC-005 a SC-010 en el navegador; las historias 1, 2, 5, 6, 7 y 8 de punta a punta; FR-048, FR-054, FR-058, FR-060 y FR-063 (la capa del navegador).

**Reglas de estas E2E** (research, R13):

- `test.use({ sessionAccount: ADMIN })`, salvo el escenario del alumno;
- cada escenario registra `GET /api/admin/users`, porque la administración abre en «Cuentas»;
- las rutas de C5 se registran por escenario, y la query se lee de `ApiCall.search`;
- cada respuesta que no es 2xx se declara con `pageIssues.expectIssue(/status of NNN/, …)`, con su código exacto;
- los títulos esperados salen de `curriculumIds` (`qa/fixtures/curriculum-ids.json`, congelado);
- las fechas, en la zona de `playwright.config.ts`: `2026-10-07T15:00:00.000Z` se ve como «7 de octubre de 2026 a las 12:00».

### Tarea 4.1 · Los datos de C5, el Page Object y el fixture (T025, E)

**Archivos:** `qa/e2e/lib/usage-contract.ts`, `qa/e2e/pages/usage.ts` y `qa/e2e/fixtures/index.ts`.

**Consume:** de F12a, `AdminPage` (el Page Object) y el fixture `admin`; de F11a, el doble; de `master`, `curriculumIds`. **Produce:** «`qa/e2e`» del contrato.

1. **`lib/usage-contract.ts`.** Cada cuerpo tiene la forma del contrato de C5, con valores escritos a mano. Los totales del día se sumaron a mano contra su serie: los alumnos que ejecutaron suman 5 por día y son 4 en el período, a propósito:

   ```ts
   import { curriculumIds } from './curriculum';

   export interface PeriodJson {
     from: string;
     to: string;
     granularity: 'day' | 'week' | 'month';
     timezone: string;
   }

   export interface StatsJson<T> {
     data: T;
     meta: { generatedAt: string; period: PeriodJson };
   }

   interface OutcomeJson {
     passed: number;
     failed: number;
     compileError: number;
     runtimeError: number;
     timeout: number;
   }

   interface IntervalJson {
     attempts: OutcomeJson;
     operations: { infraError: number; canceled: number };
     importedAttempts: number;
     firstSolves: { server: number; imported: number };
     newStudents: number;
     imports: number;
     studentsWhoRan: number;
   }

   interface PointJson extends IntervalJson {
     start: string;
   }

   export interface OverviewJson {
     accounts: { role: string; status: string; count: number }[];
     activeStudents: { lastDay: number; lastWeek: number; lastMonth: number; never: number };
     invitations: { pending: number; expired: number; pendingAdmin: number };
     resetStudents: number;
     totals: IntervalJson;
     series: PointJson[];
   }

   interface SpreadJson {
     answered: number;
     options: { option: number; students: number }[];
   }

   interface ExerciseJson {
     exerciseId: string;
     catalog: string;
     language: string;
     level: string | null;
     retired: boolean;
     studentsStarted: number;
     solved: { server: number; imported: number };
     attempts: OutcomeJson;
     operations: { infraError: number; canceled: number };
     importedAttempts: number;
     attemptsMedian: { solved: number | null; unsolved: number | null };
     help: { assisted: number; solutionSeen: number; hintsRevealed: { hints: number; students: number }[] };
     prediction: SpreadJson & { correct: number };
     confidence: { again: number; practice: number; confident: number };
     tests: { testKey: string; verdicts: number; fail: number; missing: number }[];
   }

   export interface CurriculumJson {
     catalogs: {
       catalog: string;
       language: string;
       level: string | null;
       activeExercises: number;
       studentsStarted: number;
       studentsSolved: number;
       solvedMedian: number | null;
     }[];
     exercises: ExerciseJson[];
     worlds: {
       worldId: string;
       language: string;
       level: string | null;
       retired: boolean;
       exercises: number;
       solvedRows: number;
       studentsWithSeals: number;
       checkpoint: SpreadJson & { passed: number };
     }[];
     workshops: {
       workshopId: string;
       language: string;
       level: string | null;
       retired: boolean;
       studentsStarted: number;
       codeSealed: number;
       prediction: SpreadJson & { correct: number };
       stepsMarkedMedian: number | null;
       objectivesObservedMedian: number | null;
     }[];
     route: {
       marks: { kind: string; itemKey: string; students: number }[];
       quiz: (SpreadJson & { stepId: string })[];
     };
   }

   export interface QueueJson {
     data: {
       now: {
         queued: number;
         running: number;
         oldestQueuedSeconds: number | null;
         maxWaiting: number;
         slots: number;
       };
       lastDay: {
         finished: number;
         waitMs: { p50: number | null; p95: number | null };
         durationMs: { p50: number | null; p95: number | null };
         infraErrors: { reason: string; runs: number }[];
       };
     };
     meta: { generatedAt: string };
   }

   export interface RunJson {
     id: string;
     account: { id: number; name: string };
     exerciseId: string;
     language: string;
     status: string;
     reason: string | null;
     executorPhase: string | null;
     exitCode: number | null;
     truncated: boolean | null;
     compileMs: number | null;
     runMs: number | null;
     createdAt: string;
     startedAt: string | null;
     finishedAt: string | null;
     cancelRequested: boolean;
   }

   export interface RunsJson {
     data: RunJson[];
     meta: { nextCursor: string | null; retentionDays: number };
   }

   export const STATS_MESSAGES = {
     stats_timeout: 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.',
     validation_failed: 'Hay datos que corregir.',
     too_long: 'El período puede tener hasta 366 días.',
   } as const;

   export const GENERATED_AT = '2026-10-07T15:00:00.000Z';
   export const NEXT_RUNS = '019a0000-0000-7000-8000-000000000002';
   const ZERO: OutcomeJson = { passed: 0, failed: 0, compileError: 0, runtimeError: 0, timeout: 0 };
   const SIX_ACCOUNTS = [
     { role: 'admin', status: 'active', count: 1 },
     { role: 'admin', status: 'disabled', count: 0 },
     { role: 'admin', status: 'deleting', count: 0 },
     { role: 'student', status: 'active', count: 4 },
     { role: 'student', status: 'disabled', count: 1 },
     { role: 'student', status: 'deleting', count: 1 },
   ];

   export function statsError(code: 'stats_timeout') {
     return { message: STATS_MESSAGES[code], code };
   }

   export function periodRejection(field: 'from' | 'to' | 'granularity', message: string) {
     return {
       message: STATS_MESSAGES.validation_failed,
       code: 'validation_failed',
       errors: { [field]: [message] },
     };
   }

   function interval(fields: Partial<IntervalJson> = {}): IntervalJson {
     return {
       attempts: ZERO,
       operations: { infraError: 0, canceled: 0 },
       importedAttempts: 0,
       firstSolves: { server: 0, imported: 0 },
       newStudents: 0,
       imports: 0,
       studentsWhoRan: 0,
       ...fields,
     };
   }

   function point(start: string, fields: Partial<IntervalJson> = {}): PointJson {
     return { start, ...interval(fields) };
   }

   function addDays(date: string, days: number): string {
     const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
     return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
   }

   function period(from: string, to: string, granularity: PeriodJson['granularity']): PeriodJson {
     return { from, to, granularity, timezone: 'America/Argentina/Buenos_Aires' };
   }

   export const OCTOBER_WEEK = period('2026-10-01', '2026-10-07', 'day');

   const DAY_DATA: OverviewJson = {
     accounts: SIX_ACCOUNTS,
     activeStudents: { lastDay: 1, lastWeek: 2, lastMonth: 3, never: 1 },
     invitations: { pending: 2, expired: 1, pendingAdmin: 1 },
     resetStudents: 1,
     totals: interval({
       attempts: { ...ZERO, passed: 4, failed: 1, compileError: 1 },
       operations: { infraError: 1, canceled: 1 },
       importedAttempts: 1,
       firstSolves: { server: 3, imported: 1 },
       newStudents: 2,
       imports: 1,
       studentsWhoRan: 4,
     }),
     series: [
       point('2026-10-01', {
         attempts: { ...ZERO, passed: 1, failed: 1 },
         firstSolves: { server: 1, imported: 0 },
         newStudents: 1,
         studentsWhoRan: 2,
       }),
       point('2026-10-02', { importedAttempts: 1, firstSolves: { server: 0, imported: 1 }, imports: 1 }),
       point('2026-10-03', {
         attempts: { ...ZERO, passed: 2, compileError: 1 },
         operations: { infraError: 1, canceled: 0 },
         firstSolves: { server: 2, imported: 0 },
         studentsWhoRan: 2,
       }),
       point('2026-10-04', { newStudents: 1 }),
       point('2026-10-05', { attempts: { ...ZERO, passed: 1 }, studentsWhoRan: 1 }),
       point('2026-10-06', { operations: { infraError: 0, canceled: 1 } }),
       point('2026-10-07'),
     ],
   };

   export const OVERVIEW_DAY: StatsJson<OverviewJson> = {
     data: DAY_DATA,
     meta: { generatedAt: GENERATED_AT, period: OCTOBER_WEEK },
   };

   export const OVERVIEW_WEEK: StatsJson<OverviewJson> = {
     data: {
       ...DAY_DATA,
       totals: interval({ attempts: { ...ZERO, passed: 8, failed: 2, timeout: 1 }, studentsWhoRan: 4 }),
       series: [
         point('2026-10-01', { attempts: { ...ZERO, passed: 2 }, studentsWhoRan: 2 }),
         point('2026-10-05', { attempts: { ...ZERO, passed: 5, failed: 2 }, studentsWhoRan: 3 }),
         point('2026-10-12'),
         point('2026-10-19', { attempts: { ...ZERO, passed: 1, timeout: 1 }, studentsWhoRan: 1 }),
         point('2026-10-26'),
       ],
     },
     meta: { generatedAt: GENERATED_AT, period: period('2026-10-01', '2026-10-31', 'week') },
   };

   export const OVERVIEW_EMPTY: StatsJson<OverviewJson> = {
     data: {
       ...DAY_DATA,
       totals: interval(),
       series: DAY_DATA.series.map((entry) => point(entry.start)),
     },
     meta: { generatedAt: GENERATED_AT, period: OCTOBER_WEEK },
   };

   export function overviewOfDays(days: number): StatsJson<OverviewJson> {
     const from = '2025-10-07';
     const series = Array.from({ length: days }, (unused, index) =>
       point(addDays(from, index), {
         attempts: { ...ZERO, passed: index % 4 },
         studentsWhoRan: index % 4 === 0 ? 0 : 1,
       }),
     );
     return {
       data: { ...DAY_DATA, series },
       meta: { generatedAt: GENERATED_AT, period: period(from, addDays(from, days - 1), 'day') },
     };
   }

   function exercise(exerciseId: string, fields: Partial<ExerciseJson> = {}): ExerciseJson {
     return {
       exerciseId,
       catalog: 'lab',
       language: 'rust',
       level: null,
       retired: false,
       studentsStarted: 0,
       solved: { server: 0, imported: 0 },
       attempts: ZERO,
       operations: { infraError: 0, canceled: 0 },
       importedAttempts: 0,
       attemptsMedian: { solved: null, unsolved: null },
       help: { assisted: 0, solutionSeen: 0, hintsRevealed: [] },
       prediction: { answered: 0, correct: 0, options: [] },
       confidence: { again: 0, practice: 0, confident: 0 },
       tests: [],
       ...fields,
     };
   }

   const CURRICULUM_DATA: CurriculumJson = {
     catalogs: [
       { catalog: 'lab', language: 'rust', level: null, activeExercises: 100, studentsStarted: 6, studentsSolved: 4, solvedMedian: 1.5 },
       { catalog: 'quests', language: 'rust', level: null, activeExercises: 12, studentsStarted: 0, studentsSolved: 0, solvedMedian: null },
       { catalog: 'essentials', language: 'rust', level: null, activeExercises: 5, studentsStarted: 0, studentsSolved: 0, solvedMedian: null },
     ],
     exercises: [
       exercise('rust-01', {
         studentsStarted: 6,
         solved: { server: 2, imported: 1 },
         attempts: { ...ZERO, passed: 3, failed: 4, compileError: 1 },
         operations: { infraError: 1, canceled: 0 },
         importedAttempts: 1,
         attemptsMedian: { solved: 2, unsolved: 1.5 },
         help: {
           assisted: 2,
           solutionSeen: 1,
           hintsRevealed: [
             { hints: 0, students: 3 },
             { hints: 1, students: 2 },
             { hints: 2, students: 1 },
           ],
         },
         prediction: {
           answered: 6,
           correct: 4,
           options: [
             { option: 0, students: 4 },
             { option: 1, students: 1 },
             { option: 2, students: 1 },
           ],
         },
         confidence: { again: 1, practice: 2, confident: 3 },
         tests: [
           { testKey: 't1', verdicts: 8, fail: 4, missing: 1 },
           { testKey: 't2', verdicts: 8, fail: 1, missing: 0 },
           { testKey: 't3', verdicts: 7, fail: 0, missing: 2 },
         ],
       }),
       exercise('rust-02', {
         studentsStarted: 3,
         solved: { server: 1, imported: 0 },
         attempts: { ...ZERO, passed: 1, failed: 2 },
         prediction: {
           answered: 3,
           correct: 2,
           options: [
             { option: 1, students: 2 },
             { option: 0, students: 1 },
           ],
         },
       }),
       exercise('rust-999', {
         retired: true,
         studentsStarted: 4,
         solved: { server: 1, imported: 0 },
         attempts: { ...ZERO, failed: 1 },
       }),
       exercise('rust-03'),
     ],
     worlds: [
       {
         worldId: 'rust-world-1',
         language: 'rust',
         level: 'beginner',
         retired: false,
         exercises: 6,
         solvedRows: 9,
         studentsWithSeals: 2,
         checkpoint: {
           answered: 6,
           passed: 3,
           options: [
             { option: 0, students: 3 },
             { option: 1, students: 2 },
             { option: 2, students: 1 },
           ],
         },
       },
     ],
     workshops: [
       {
         workshopId: 'cache',
         language: 'rust',
         level: null,
         retired: false,
         studentsStarted: 2,
         codeSealed: 1,
         prediction: { answered: 1, correct: 1, options: [{ option: 1, students: 1 }] },
         stepsMarkedMedian: 0.5,
         objectivesObservedMedian: null,
       },
     ],
     route: {
       marks: [
         { kind: 'step', itemKey: 'rust-first-session', students: 3 },
         { kind: 'milestone', itemKey: 'rust-memory', students: 2 },
       ],
       quiz: [
         {
           stepId: 'rust-first-session',
           answered: 5,
           options: [
             { option: 1, students: 4 },
             { option: 0, students: 1 },
           ],
         },
       ],
     },
   };

   export const CURRICULUM: StatsJson<CurriculumJson> = {
     data: CURRICULUM_DATA,
     meta: { generatedAt: GENERATED_AT, period: OCTOBER_WEEK },
   };

   export function curriculumOfAll(): StatsJson<CurriculumJson> {
     const exercises = Object.entries(curriculumIds.exercises).map(([id, { language }], index) =>
       exercise(id, {
         language,
         studentsStarted: index % 7,
         solved: { server: index % 3, imported: 0 },
         attempts: { ...ZERO, passed: index % 5, failed: index % 4 },
       }),
     );
     return { ...CURRICULUM, data: { ...CURRICULUM_DATA, exercises } };
   }

   export const QUEUE: QueueJson = {
     data: {
       now: { queued: 2, running: 1, oldestQueuedSeconds: 120, maxWaiting: 32, slots: 4 },
       lastDay: {
         finished: 2,
         waitMs: { p50: 1500, p95: null },
         durationMs: { p50: 500, p95: 900 },
         infraErrors: [
           { reason: 'executor_busy', runs: 1 },
           { reason: 'gpu_on_fire', runs: 2 },
         ],
       },
     },
     meta: { generatedAt: GENERATED_AT },
   };

   export const QUEUE_LATER: QueueJson = { ...QUEUE, meta: { generatedAt: '2026-10-07T15:05:00.000Z' } };

   function run(id: string, fields: Partial<RunJson> = {}): RunJson {
     return {
       id,
       account: { id: 5, name: 'Caro Díaz' },
       exerciseId: 'rust-01',
       language: 'rust',
       status: 'passed',
       reason: null,
       executorPhase: 'run',
       exitCode: 0,
       truncated: false,
       compileMs: 1200,
       runMs: 300,
       createdAt: '2026-10-07T14:00:00.000Z',
       startedAt: '2026-10-07T14:00:01.500Z',
       finishedAt: '2026-10-07T14:00:03.000Z',
       cancelRequested: false,
       ...fields,
     };
   }

   export const RUNS_FIRST: RunsJson = {
     data: [
       run('019a0000-0000-7000-8000-000000000004', {
         status: 'infra_error',
         reason: 'executor_busy',
         executorPhase: null,
         exitCode: null,
         truncated: null,
         compileMs: null,
         runMs: null,
         startedAt: null,
       }),
       run('019a0000-0000-7000-8000-000000000003'),
     ],
     meta: { nextCursor: NEXT_RUNS, retentionDays: 14 },
   };

   export const RUNS_OLDER: RunsJson = {
     data: [run(NEXT_RUNS)],
     meta: { nextCursor: null, retentionDays: 14 },
   };
   ```

2. **`pages/usage.ts`.** `open()` abre la administración con el único método de F12a (FR-060). Los selectores de CSS (el canvas y el término de una cifra) viven sólo acá:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import type { AdminPage } from './admin';

   export type UsageViewName = 'Resumen' | 'Ejercicios' | 'Alumnos' | 'Ejecuciones';

   export class UsagePage {
     constructor(
       readonly page: Page,
       private readonly admin: AdminPage,
     ) {}

     async open(): Promise<void> {
       await this.admin.open();
       await this.admin.button('Uso del taller').click();
     }

     views(): Locator {
       return this.admin.region.getByRole('group', { name: 'Vistas de Uso del taller' });
     }

     async openView(name: UsageViewName): Promise<void> {
       await this.views().getByRole('button', { name, exact: true }).click();
     }

     heading(name: string): Locator {
       return this.admin.region.getByRole('heading', { name, exact: true });
     }

     table(name: string): Locator {
       return this.admin.region.getByRole('table', { name, exact: true });
     }

     row(table: string, name: RegExp): Locator {
       return this.table(table).getByRole('row', { name });
     }

     field(label: string): Locator {
       return this.admin.field(label);
     }

     button(name: string): Locator {
       return this.admin.button(name);
     }

     figure(label: string): Locator {
       return this.admin.region.locator('dt', { hasText: label }).locator('..');
     }

     periodForm(): Locator {
       return this.admin.region.getByRole('form', { name: 'Período' });
     }

     async applyPeriod(from: string, to: string, granularity?: 'Día' | 'Semana' | 'Mes'): Promise<void> {
       const form = this.periodForm();
       await form.getByLabel('Desde', { exact: true }).fill(from);
       await form.getByLabel('Hasta', { exact: true }).fill(to);
       if (granularity !== undefined) {
         await form.getByLabel('Agrupar por', { exact: true }).selectOption({ label: granularity });
       }
       await form.getByRole('button', { name: 'Aplicar' }).click();
     }

     chart(name: string): Locator {
       return this.admin.region.getByRole('region', { name, exact: true });
     }

     canvas(name: string): Locator {
       return this.chart(name).locator('[aria-hidden="true"] canvas');
     }

     async inkedPixels(name: string): Promise<number> {
       return this.canvas(name)
         .first()
         .evaluate((canvas: HTMLCanvasElement) => {
           const context = canvas.getContext('2d');
           if (context === null) return 0;
           const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
           let inked = 0;
           for (let alpha = 3; alpha < data.length; alpha += 4) {
             if ((data[alpha] ?? 0) > 0) inked += 1;
           }
           return inked;
         });
     }

     async framesAreStable(name: string): Promise<boolean> {
       return this.canvas(name)
         .first()
         .evaluate(async (canvas: HTMLCanvasElement) => {
           const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
           const before = canvas.toDataURL();
           await nextFrame();
           await nextFrame();
           return canvas.toDataURL() === before;
         });
     }
   }
   ```

3. **`fixtures/index.ts`,** tres cambios sobre el fixture `admin` de F12a:
   - `import { UsagePage } from '../pages/usage';`;
   - `usage: UsagePage;` en `Fixtures`;
   - `usage: async ({ page, admin }, use) => use(new UsagePage(page, admin)),` después de `admin`.
4. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4195 npm run test:e2e`: la red de la base, en verde y sin cambios.
5. **Commit:** `test(qa): los datos de C5, el Page Object de «Uso del taller» y su fixture`.

### Tarea 4.2 · Las E2E de «Uso del taller», en rojo (T026, E, desde S2)

**Archivos:** `qa/e2e/specs/admin-usage-overview.spec.ts`, `admin-usage-exercises.spec.ts`, `admin-usage-runs.spec.ts` y `admin-usage-layout.spec.ts`.

**Consume:** de T025, `UsagePage` y `usage-contract.ts`; de F12a, `admin`, `OWN_ROW` y `pageOf`; de F11a, `ADMIN`, `STUDENT`, `errorBody`, `access` y `api`. **Produce:** la red de F14a.

1. **`admin-usage-overview.spec.ts`.** Cubre la historia 1, la historia 8 (escenarios 1 a 3) y las Review Focus 4 y 5:

   ```ts
   import { expect, test } from '../fixtures';
   import { ADMIN, errorBody } from '../lib/api-contract';
   import { OWN_ROW, pageOf } from '../lib/admin-contract';
   import {
     OVERVIEW_DAY,
     OVERVIEW_EMPTY,
     OVERVIEW_WEEK,
     STATS_MESSAGES,
     periodRejection,
     statsError,
   } from '../lib/usage-contract';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';
   const OVERVIEW = 'GET /api/admin/stats/overview';

   function queryOf(search: string | undefined): Record<string, string> {
     return Object.fromEntries(new URLSearchParams(search ?? ''));
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(({ api }) => {
     api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW]) }));
   });

   test('opens «Uso del taller» on «Resumen» with one request without a period', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await expect(admin.button('Uso del taller')).toHaveAttribute('aria-pressed', 'true');
     await expect(usage.views().getByRole('button', { name: 'Resumen' })).toHaveAttribute(
       'aria-pressed',
       'true',
     );
     await expect(usage.heading('En el período')).toBeVisible();
     expect(api.callsTo(OVERVIEW)).toHaveLength(1);
     expect(api.callsTo(OVERVIEW)[0]?.search).toBe('');
   });

   test('fills the period from the answer and shows its dates as they came', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await expect(usage.field('Desde')).toHaveValue('2026-10-01');
     await expect(usage.field('Hasta')).toHaveValue('2026-10-07');
     await expect(
       admin.region.getByText('Del 1/10/2026 al 7/10/2026, por día, en la hora de Buenos Aires.'),
     ).toBeVisible();
     await expect(
       admin.region.getByText(
         'Calculado el 7 de octubre de 2026 a las 12:00. Las cifras se recalculan cada 10 minutos: una cuenta borrada o un «Borrar todo» pueden tardar ese tiempo en verse.',
       ),
     ).toBeVisible();
   });

   test('shows every figure of the answer with its source and nothing called verified', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await expect(usage.figure('Alumno · Activa')).toContainText('4');
     await expect(usage.figure('Alumno · Activa')).toContainText('Estado actual');
     await expect(usage.figure('Resueltos por primera vez, en el servidor')).toContainText('3');
     await expect(usage.figure('Resueltos por primera vez, importados')).toContainText('1');
     await expect(
       usage.figure('Alumnos que ejecutaron (en todo el período: no es la suma de los intervalos)'),
     ).toContainText('4');
     await expect(admin.region.getByText(/verificad/i)).toHaveCount(0);
   });

   test('draws the series with its table, its summary and its canvas out of the accessibility tree', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await expect(usage.table('La serie, por día').getByRole('row')).toHaveCount(8);
     await expect(usage.row('La serie, por día', /^3\/10\/2026/).getByRole('cell')).toHaveText([
       '2', '0', '1', '0', '0', '1', '0', '0', '2', '0', '0', '0', '2',
     ]);
     await expect(
       admin.region.getByText('En el período hubo 6 intentos; el día con más fue el 3/10, con 3.'),
     ).toBeVisible();
     await expect(
       admin.region.getByText('En el período ejecutaron 4 alumnos; el día con más fue el 1/10, con 2.'),
     ).toBeVisible();
     await expect(usage.canvas('Intentos por resultado')).toHaveCount(1);
     await expect.poll(() => usage.inkedPixels('Intentos por resultado')).toBeGreaterThan(0);
     await expect.poll(() => usage.inkedPixels('Alumnos que ejecutaron')).toBeGreaterThan(0);
   });

   test('applies a weekly period once and draws one row per week', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, (call) => ({
       status: 200,
       json: call.search.includes('granularity=week') ? OVERVIEW_WEEK : OVERVIEW_DAY,
     }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.applyPeriod('2026-10-01', '2026-10-31', 'Semana');
     await expect(usage.table('La serie, por semana').getByRole('rowheader')).toHaveText([
       'Semana del 1/10/2026',
       'Semana del 5/10/2026',
       'Semana del 12/10/2026',
       'Semana del 19/10/2026',
       'Semana del 26/10/2026',
     ]);
     expect(api.callsTo(OVERVIEW)).toHaveLength(2);
     expect(queryOf(api.callsTo(OVERVIEW)[1]?.search)).toEqual({
       from: '2026-10-01',
       to: '2026-10-31',
       granularity: 'week',
     });
     await expect(
       admin.region.getByText('En el período hubo 11 intentos; la semana con más fue la del 5/10, con 7.'),
     ).toBeVisible();
   });

   test('stops a period of more than 366 days on «Hasta» without asking', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.applyPeriod('2025-09-02', '2026-10-07');
     await expect(admin.region.getByText(STATS_MESSAGES.too_long)).toBeVisible();
     await expect(usage.field('Hasta')).toBeFocused();
     expect(api.callsTo(OVERVIEW)).toHaveLength(1);
   });

   test('takes a 422 of the server on the period to «Hasta»', async ({
     admin,
     api,
     pageIssues,
     shell,
     usage,
   }) => {
     pageIssues.expectIssue(/status of 422/, 'the 422 of a rejected period');
     api.on(OVERVIEW, (call) =>
       call.search === ''
         ? { status: 200, json: OVERVIEW_DAY }
         : { status: 422, json: periodRejection('to', STATS_MESSAGES.too_long) },
     );
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.applyPeriod('2026-01-01', '2026-10-07');
     await expect(admin.region.getByText(STATS_MESSAGES.too_long)).toBeVisible();
     await expect(usage.field('Hasta')).toBeFocused();
   });

   test('explains a period without attempts and draws nothing', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_EMPTY }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await expect(
       admin.region.getByText(
         'Todavía no hay intentos en este período. Se registran cuando el laboratorio ejecuta en el servidor y el progreso se sincroniza con la cuenta.',
       ),
     ).toBeVisible();
     await expect(usage.canvas('Intentos por resultado')).toHaveCount(0);
   });

   test('waits the Retry-After of a stats timeout and keeps the period', async ({
     admin,
     api,
     page,
     pageIssues,
     shell,
     usage,
   }) => {
     pageIssues.expectIssue(/status of 503/, 'the 503 of a stats timeout');
     await page.clock.install();
     api.on(OVERVIEW, (call) =>
       call.search === ''
         ? { status: 200, json: OVERVIEW_DAY }
         : { status: 503, json: statsError('stats_timeout'), headers: { 'Retry-After': '30' } },
     );
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.applyPeriod('2026-10-01', '2026-10-05');
     const alert = admin.region.getByRole('alert');
     await expect(alert).toContainText(STATS_MESSAGES.stats_timeout);
     await expect(alert).toContainText('Podés volver a intentar en 30 segundos.');
     await expect(alert.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
     await expect(usage.field('Hasta')).toHaveValue('2026-10-05');
     await page.clock.runFor(30_000);
     await expect(alert.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
   });

   test('opens the sign-in on a 401 and stays on «Resumen» with the same account', async ({
     access,
     api,
     pageIssues,
     shell,
     usage,
   }) => {
     pageIssues.expectIssue(/status of 401/, 'the 401 of an expired session');
     api.signInAccount = ADMIN;
     api.on(OVERVIEW, (call) =>
       call.search === ''
         ? { status: 200, json: OVERVIEW_DAY }
         : { status: 401, json: errorBody('unauthenticated') },
     );
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.applyPeriod('2026-10-01', '2026-10-05');
     await access.signIn(ADMIN.email, PASSWORD);
     await expect(access.heading('Ingresá al taller')).toBeHidden();
     await expect(usage.views().getByRole('button', { name: 'Resumen' })).toHaveAttribute(
       'aria-pressed',
       'true',
     );
     expect(api.callsTo(OVERVIEW)).toHaveLength(2);
   });
   ```

2. **`admin-usage-exercises.spec.ts`.** Cubre la historia 2 y la historia 5 en los agregados (escenarios 1 y 2):

   ```ts
   import { expect, test } from '../fixtures';
   import { ADMIN } from '../lib/api-contract';
   import { OWN_ROW, pageOf } from '../lib/admin-contract';
   import { curriculumIds } from '../lib/curriculum';
   import { CURRICULUM, OVERVIEW_DAY } from '../lib/usage-contract';
   import { urls } from '../lib/urls';

   const EXERCISES = 'GET /api/admin/stats/exercises';

   function titleOf(id: string): string {
     return curriculumIds.exercises[id]?.title ?? id;
   }

   function queryOf(search: string | undefined): Record<string, string> {
     return Object.fromEntries(new URLSearchParams(search ?? ''));
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(async ({ api, shell, usage }) => {
     api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW]) }));
     api.on('GET /api/admin/stats/overview', () => ({ status: 200, json: OVERVIEW_DAY }));
     api.on(EXERCISES, () => ({ status: 200, json: CURRICULUM }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.openView('Ejercicios');
     await expect(usage.table('Ejercicios')).toBeVisible();
   });

   test('names the exercises from the content and offers the catalogs of the answer, also a new one', async ({
     usage,
   }) => {
     await expect(usage.row('Ejercicios', new RegExp(titleOf('rust-01')))).toBeVisible();
     await expect(usage.field('Catálogo').getByRole('option')).toHaveText([
       'Todos',
       'lab',
       'quests',
       'essentials',
     ]);
     await expect(usage.table('Catálogos').getByRole('rowheader', { name: 'essentials · Rust' })).toBeVisible();
   });

   test('asks once per filter with the period in force', async ({ api, usage }) => {
     await usage.periodForm().getByRole('button', { name: 'Aplicar' }).click();
     await expect.poll(() => api.callsTo(EXERCISES).length).toBe(2);
     await usage.field('Catálogo').selectOption({ label: 'lab' });
     await expect.poll(() => api.callsTo(EXERCISES).length).toBe(3);
     await usage.field('Lenguaje').selectOption({ label: 'Rust' });
     await expect.poll(() => api.callsTo(EXERCISES).length).toBe(4);
     const period = { from: '2026-10-01', to: '2026-10-07', granularity: 'day' };
     expect(api.callsTo(EXERCISES).map((call) => queryOf(call.search))).toEqual([
       {},
       period,
       { ...period, catalog: 'lab' },
       { ...period, catalog: 'lab', language: 'rust' },
     ]);
   });

   test('orders the exercises in the client and leaves the ones nobody started last', async ({
     api,
     usage,
   }) => {
     await usage.field('Ordenar por').selectOption({ label: 'Menos resueltos primero' });
     // rust-01 3/6; rust-02 1/3; rust-999 1/4; rust-03 nadie
     await expect(usage.table('Ejercicios').getByRole('rowheader')).toHaveText([
       'rust-999 Retirado',
       `${titleOf('rust-02')} (rust-02)`,
       `${titleOf('rust-01')} (rust-01)`,
       `${titleOf('rust-03')} (rust-03)`,
     ]);
     expect(api.callsTo(EXERCISES)).toHaveLength(1);
   });

   test('opens the detail of an exercise in place and gives the focus back', async ({ api, usage }) => {
     const open = usage.button(`Ver ${titleOf('rust-01')}`);
     await open.click();
     await expect(usage.heading(titleOf('rust-01'))).toBeFocused();
     await expect(usage.table('Ejercicios')).toBeHidden();
     await expect(usage.table('Pruebas').getByRole('row').nth(1).getByRole('cell')).toHaveText([
       '8',
       '4',
       '1',
     ]);
     const options = usage.page.getByRole('list', {
       name: `Opciones elegidas en la predicción de ${titleOf('rust-01')}`,
     });
     await expect(options.getByRole('listitem')).toHaveCount(3);
     await expect(options.getByRole('listitem').first()).toContainText('4 de 6');
     await usage.button('Volver a Ejercicios').click();
     await expect(open).toBeFocused();
     expect(api.callsTo(EXERCISES)).toHaveLength(1);
   });

   test('hides a spread under five answers and marks a small sample', async ({ usage }) => {
     const row = usage.row('Ejercicios', new RegExp(titleOf('rust-02')));
     await expect(row).toContainText('2 de 3');
     await expect(row).toContainText('Muestra chica');
     await usage.button(`Ver ${titleOf('rust-02')}`).click();
     await expect(
       usage.page.getByText('3 respuestas. Menos de 5 respuestas: no mostramos cómo se reparten.'),
     ).toBeVisible();
   });

   test('names the filters that change each table', async ({ usage }) => {
     await usage.field('Lenguaje').selectOption({ label: 'Go' });
     await expect(
       usage.page.getByText('Los filtros elegidos no cambian esta tabla. Fuente: Estado actual.'),
     ).toHaveCount(2);
   });
   ```

3. **`admin-usage-runs.spec.ts`.** Cubre la historia 6 y la última oración de SC-004:

   ```ts
   import { expect, test } from '../fixtures';
   import { ADMIN } from '../lib/api-contract';
   import { OWN_ROW, pageOf } from '../lib/admin-contract';
   import {
     NEXT_RUNS,
     OVERVIEW_DAY,
     QUEUE,
     QUEUE_LATER,
     RUNS_FIRST,
     RUNS_OLDER,
   } from '../lib/usage-contract';
   import { urls } from '../lib/urls';

   const QUEUE_ROUTE = 'GET /api/admin/queue';
   const RUNS_ROUTE = 'GET /api/admin/runs';

   function queryOf(search: string | undefined): Record<string, string> {
     return Object.fromEntries(new URLSearchParams(search ?? ''));
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(({ api }) => {
     api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW]) }));
     api.on('GET /api/admin/stats/overview', () => ({ status: 200, json: OVERVIEW_DAY }));
     api.on(RUNS_ROUTE, (call) => ({
       status: 200,
       json: queryOf(call.search).cursor === NEXT_RUNS ? RUNS_OLDER : RUNS_FIRST,
     }));
   });

   test('asks for the queue and the runs once each and shows «—» for a missing percentile', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(QUEUE_ROUTE, () => ({ status: 200, json: QUEUE }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.openView('Ejecuciones');
     await expect(usage.table('Ejecuciones, de la más nueva a la más vieja')).toBeVisible();
     expect(api.callsTo(QUEUE_ROUTE)).toHaveLength(1);
     expect(api.callsTo(RUNS_ROUTE)).toHaveLength(1);
     await expect(usage.figure('Espera hasta empezar (mediana · p95)')).toContainText('1,5 s · —');
     await expect(usage.table('Fallas del sandbox, por motivo').getByRole('rowheader')).toHaveText([
       'Sandbox ocupado',
       'gpu_on_fire',
     ]);
     await expect(
       admin.region.getByText('El taller guarda las ejecuciones 14 días: las anteriores ya no existen.'),
     ).toBeVisible();
   });

   test('asks nothing in five minutes without an action, and «Actualizar» asks the queue once', async ({
     admin,
     api,
     page,
     shell,
     usage,
   }) => {
     await page.clock.install();
     api.on(QUEUE_ROUTE, () => ({
       status: 200,
       json: api.callsTo(QUEUE_ROUTE).length > 1 ? QUEUE_LATER : QUEUE,
     }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.openView('Ejecuciones');
     await expect(admin.region.getByText('Actualizada a las 12:00.')).toBeVisible();
     const adminCalls = () => api.calls.filter((call) => call.path.startsWith('/api/admin')).length;
     const before = adminCalls();
     await page.clock.runFor('05:00');
     expect(adminCalls()).toBe(before);
     await usage.button('Actualizar').click();
     await expect(admin.region.getByText('Actualizada a las 12:05.')).toBeVisible();
     expect(api.callsTo(QUEUE_ROUTE)).toHaveLength(2);
     expect(api.callsTo(RUNS_ROUTE)).toHaveLength(1);
   });

   test('filters by «Falla del sandbox» and pages with the cursor, keeping the filter', async ({
     api,
     shell,
     usage,
   }) => {
     api.on(QUEUE_ROUTE, () => ({ status: 200, json: QUEUE }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.openView('Ejecuciones');
     await usage.field('Estado').selectOption({ label: 'Falla del sandbox' });
     await expect.poll(() => api.callsTo(RUNS_ROUTE).length).toBe(2);
     await expect(usage.button('Más viejas')).toBeEnabled();
     await usage.button('Más viejas').click();
     await expect(usage.button('Volver a las más nuevas')).toBeVisible();
     await expect(usage.button('Más viejas')).toHaveCount(0);
     expect(api.callsTo(RUNS_ROUTE).map((call) => queryOf(call.search))).toEqual([
       {},
       { status: 'infra_error' },
       { status: 'infra_error', cursor: NEXT_RUNS },
     ]);
   });
   ```

   La sección abre en «Resumen» y lo pide, así que el `beforeEach` también registra su respuesta.

4. **`admin-usage-layout.spec.ts`.** Cubre las historias 5 y 7, SC-003, SC-006, SC-008 (la medición) y FR-063 en el navegador:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { ADMIN, STUDENT } from '../lib/api-contract';
   import { OWN_ROW, pageOf } from '../lib/admin-contract';
   import { curriculumIds } from '../lib/curriculum';
   import {
     CURRICULUM,
     OVERVIEW_DAY,
     QUEUE,
     RUNS_FIRST,
     curriculumOfAll,
     overviewOfDays,
   } from '../lib/usage-contract';
   import { urls } from '../lib/urls';

   const OVERVIEW = 'GET /api/admin/stats/overview';
   const EXERCISES = 'GET /api/admin/stats/exercises';

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let presses = 0; presses < 80; presses += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
   }

   test.describe('an admin', () => {
     test.use({ sessionAccount: ADMIN });

     test.beforeEach(({ api }) => {
       api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW]) }));
       api.on(EXERCISES, () => ({ status: 200, json: CURRICULUM }));
       api.on('GET /api/admin/queue', () => ({ status: 200, json: QUEUE }));
       api.on('GET /api/admin/runs', () => ({ status: 200, json: RUNS_FIRST }));
     });

     for (const width of [320, 390]) {
       test(`does not scroll sideways at ${width} px and a year of days scrolls inside its chart`, async ({
         admin,
         api,
         page,
         shell,
         usage,
       }) => {
         api.on(OVERVIEW, () => ({ status: 200, json: overviewOfDays(366) }));
         await page.setViewportSize({ width, height: 800 });
         await shell.goto(urls.view('recorrido'));
         await usage.open();
         const chart = usage.chart('Intentos por resultado');
         await expect(chart).toHaveAttribute('tabindex', '0');
         await expect.poll(() => usage.inkedPixels('Intentos por resultado')).toBeGreaterThan(0);
         expect(await chart.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
         expect(
           await admin.region.evaluate((element) => element.scrollWidth <= element.clientWidth),
         ).toBe(true);
         expect(
           await usage.field('Desde').evaluate((element) => getComputedStyle(element).fontSize),
         ).toBe('16px');
         await usage.openView('Ejercicios');
         await expect(usage.table('Ejercicios')).toBeVisible();
         expect(
           await admin.region.evaluate((element) => element.scrollWidth <= element.clientWidth),
         ).toBe(true);
       });
     }

     test('scrolls a long chart with the keyboard', async ({ api, page, shell, usage }) => {
       api.on(OVERVIEW, () => ({ status: 200, json: overviewOfDays(366) }));
       await page.setViewportSize({ width: 320, height: 800 });
       await shell.goto(urls.view('recorrido'));
       await usage.open();
       const chart = usage.chart('Intentos por resultado');
       await expect.poll(() => usage.inkedPixels('Intentos por resultado')).toBeGreaterThan(0);
       await tabTo(page, chart);
       await expect(chart).toBeFocused();
       await page.keyboard.press('ArrowRight');
       await page.keyboard.press('ArrowRight');
       await expect.poll(() => chart.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
     });

     test.describe('with reduced motion', () => {
       test.use({ reducedMotion: 'reduce' });

       test('draws without animations or transitions', async ({ admin, api, shell, usage }) => {
         api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
         await shell.goto(urls.view('recorrido'));
         await usage.open();
         await expect.poll(() => usage.inkedPixels('Intentos por resultado')).toBeGreaterThan(0);
         expect(
           await admin.region.evaluate((element) => element.getAnimations({ subtree: true }).length),
         ).toBe(0);
         expect(await usage.framesAreStable('Intentos por resultado')).toBe(true);
         const durations = await admin.region
           .getByRole('button')
           .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).transitionDuration));
         expect(durations.every((duration) => duration === '0s')).toBe(true);
       });
     });

     test('keeps nothing of what it showed and never changes the address', async ({
       admin,
       api,
       page,
       shell,
       usage,
     }) => {
       const logged: string[] = [];
       page.on('console', (message) => logged.push(message.text()));
       api.on(OVERVIEW, () => ({ status: 200, json: OVERVIEW_DAY }));
       await shell.goto(urls.view('recorrido'));
       const storageBefore = await page.evaluate(() =>
         JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie }),
       );
       await admin.open();
       const address = page.url();
       const historyLength = await page.evaluate(() => history.length);
       await admin.button('Uso del taller').click();
       await expect(usage.heading('En el período')).toBeVisible();
       await usage.openView('Ejercicios');
       await expect(usage.table('Ejercicios')).toBeVisible();
       await usage.openView('Ejecuciones');
       await expect(usage.table('Ejecuciones, de la más nueva a la más vieja')).toBeVisible();
       expect(page.url()).toBe(address);
       expect(await page.evaluate(() => history.length)).toBe(historyLength);
       await expect(admin.region.getByText(/verificad/i)).toHaveCount(0);
       await expect(
         admin.region.getByRole('button', { name: /export|descarg|copiar|imprim/i }),
       ).toHaveCount(0);
       await expect(admin.region.getByRole('link', { name: /descarg|export/i })).toHaveCount(0);
       await admin.button('Cerrar').click();
       const storageAfter = await page.evaluate(() =>
         JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie }),
       );
       expect(storageAfter).toBe(storageBefore);
       expect(logged.filter((text) => /Caro Díaz|rust-01|2026-10/.test(text))).toEqual([]);
     });

     test('measures how long the biggest answers take to draw (SC-008)', async ({
       api,
       shell,
       usage,
     }) => {
       const everyExercise = curriculumOfAll();
       api.on(OVERVIEW, () => ({ status: 200, json: overviewOfDays(366) }));
       api.on(EXERCISES, () => ({ status: 200, json: everyExercise }));
       await shell.goto(urls.view('recorrido'));
       const seriesStart = Date.now();
       await usage.open();
       await expect(usage.table('La serie, por día').getByRole('row')).toHaveCount(367);
       await expect.poll(() => usage.inkedPixels('Intentos por resultado')).toBeGreaterThan(0);
       const seriesMs = Date.now() - seriesStart;
       const exercisesStart = Date.now();
       await usage.openView('Ejercicios');
       const rows = Object.keys(curriculumIds.exercises).length;
       await expect(usage.table('Ejercicios').getByRole('row')).toHaveCount(rows + 1);
       const exercisesMs = Date.now() - exercisesStart;
       test.info().annotations.push({
         type: 'SC-008',
         description: `366 días por día: ${seriesMs} ms; ${rows} ejercicios: ${exercisesMs} ms`,
       });
     });
   });

   test.describe('a student', () => {
     test.use({ sessionAccount: STUDENT });

     test('asks nothing of the statistics, the runs or the queue', async ({ api, shell }) => {
       await shell.goto(urls.view('recorrido'));
       await shell.goto(urls.view('atlas'));
       expect(api.calls.filter((call) => call.path.startsWith('/api/admin'))).toEqual([]);
     });
   });
   ```

5. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4195 npm run test:e2e -- specs/admin-usage-overview.spec.ts specs/admin-usage-exercises.spec.ts specs/admin-usage-runs.spec.ts specs/admin-usage-layout.spec.ts`. El resultado esperado, antes de U3:
   - el escenario del alumno, en verde;
   - el resto, en rojo por la razón esperada: no existe «Uso del taller». Después de T023 sólo queda en rojo «names the exercises from the content…», hasta T024.

   La red de la base sigue en verde.
6. **Commit:** `test(qa): E2E de «Uso del taller», en rojo`.

## 5. U5 · La documentación, el peso y el PR (onda 6: K)

### Tarea 5.1 · La documentación (T027, K)

**Archivos:** `docs/architecture.md` y `qa/AGENTS.md` (FR-062).

1. **`docs/architecture.md`,** en «Mapa de archivos» y en «Feature-Sliced Design incremental»:
   - `pages/admin` suma «Uso del taller»: el modelo de C5 (`model/usage-*`, `parse-usage`, `period`, `bar-chart`, `content-titles` y los demás), la API (`api/usage-endpoints.ts`), los hooks (`lib/use-stats-request.ts` y `lib/use-runs-pages.ts`) y las vistas;
   - **una regla nueva:** `pages/admin/lib/plot.ts` es el único módulo que importa `uplot` en tiempo de ejecución. Lleva su licencia, y lo que dibuja con uPlot pasa por `drawBarChart`;
   - `AdminPage` envuelve sus secciones en `PeriodProvider`, y el contenedor de `app/` monta `ContentTitlesProvider` con `getContent`;
   - la extensión del contrato de F12a vive en `specs/028-f14-estadisticas-admin/contracts/usage-section.md`.
2. **`qa/AGENTS.md`,** en «Pruebas del front»:
   - las specs que dibujan un gráfico reemplazan `pages/admin/lib/plot` con `vi.mock` y `vi.hoisted`. El dibujo, el ancho y la falta de animaciones los prueban las E2E;
   - `frontend/src/vitest.setup.ts` trae `matchMedia` para jsdom, y `qa/lib/boot-harness.ts`, `devicePixelRatio` y `matchMedia`, porque uPlot los lee al evaluarse;
   - la ayuda `pages/admin/ui/usage-fetch.ts` contesta por ruta y guarda la señal de cada pedido;
   - las E2E de la sección usan `UsagePage` (`qa/e2e/pages/usage.ts`) y los datos de `qa/e2e/lib/usage-contract.ts`.
3. **Verificar** rutas y enlaces de los dos archivos, y `git diff --check`.
4. **Commit:** `docs: el uso del taller en la administración, uPlot detrás de un módulo y sus pruebas`.

### Tarea 5.2 · El peso, la compuerta final y el PR a `master` (T028, K)

1. **El peso** (FR-057): `dist/index.html` contra T001. La suba de F14a no pasa de 80 000 y el total queda bajo 1 500 000. **Si se pasa, parás y decide el usuario.** Anotá la medida en research.md y en el PR.
2. **La compuerta final:**
   - `npm run build`, `npm test`, `npm run lint` (avisos de complejidad, los de T001), `npm run format:check` y `git diff --check`, en verde;
   - la red completa cinco veces seguidas: `E2E_PORT=4173 npm run test:e2e -- --repeat-each=5 --retries=0`;
   - `git diff master --stat -- qa/e2e/specs` muestra sólo los cuatro `admin-usage-*.spec.ts` nuevos;
   - `git diff master -- qa/boot-check.ts qa/dist-content-check.ts qa/load-order-check.ts` no imprime nada;
   - `git grep -n "from 'uplot'" -- frontend/src`, como en T011.
3. **La revisión manual con datos armados** (Q4-A; acción del usuario): con el stack local (`docker compose up --build -d --wait`), cuentas e intentos sembrados con los comandos de medición de C5, el usuario recorre las tres vistas con el teclado, a 320 px y con movimiento reducido. Lo que encuentre se corrige antes del PR.
4. **La medición de SC-008:** las anotaciones `SC-008` de `admin-usage-layout.spec.ts` van al PR.
5. **El PR,** `feat(front): F14a, the workshop usage for admins (aggregates and operations)`, de `f14a/base` a `master`, sólo con C5 integrada en `master`. La descripción en inglés lleva:
   - el contexto (C5, F12a y Q2-B);
   - qué cambia;
   - el peso de uPlot y el total;
   - los dos globals del arnés y del setup;
   - la medición de SC-008;
   - lo que queda para F14b.

## 6. Documentación que cambia con cada unidad

| Unidad | Documento | Qué |
| --- | --- | --- |
| U0 | research.md | «Línea base de la implementación» y el tamaño de uPlot (T001 y T002) |
| U3 | research.md | El peso medido en T023 |
| U5 | `docs/architecture.md`, `qa/AGENTS.md` | T027 |
| U5 | research.md, el PR | El peso final y SC-008 (T028) |

## Lo que F14b toma de F14a

Por su API dentro del slice (contrato), sin duplicarlas:

- `PeriodProvider`, `usePeriod` y `PeriodForm`, para el período del detalle de una cuenta;
- `SeriesChart`, `BarChart`, `intervalLabel`, `peakSentence` y `lib/plot.ts`, para la actividad de una cuenta;
- `useStatsRequest`, `useRunsPages`, `RunsList`, `RequestState` y `describeStatsFailure`, para el detalle y sus ejecuciones;
- `StatsTable`, `Figures`, `RateCell`, `AggregateNotes`, `useContentTitles`, `usage-labels.ts` y `usage-format.ts`;
- `usage-fetch.ts`, `usage.factory.ts`, `UsagePage` y `usage-contract.ts`, en las pruebas.

## Cobertura de requisitos

| Requisito | Dónde |
| --- | --- |
| FR-001, FR-002 | T022, T023 (las tres vistas de F14a; «Alumnos» la suma F14b: research, R2) |
| FR-003 | T023 (`AdminSection`), contrato de la carpeta 028 (research, R10) |
| FR-004 | T013 (`PeriodProvider`), T015 (`PeriodForm`), T022 (el período entre vistas y secciones) |
| FR-005 | T005, T006 (`checkPeriod`), T014, T015 (la validación y el 422), T026 |
| FR-006 a FR-008 | T006 (`periodSentence`), T015 (`AggregateNotes`), T026 |
| FR-009 | T017 (las fuentes por cifra y la ayuda; research, R12) |
| FR-010 | T006 (`rateView`), T017, T019 (los estados vacíos), T026 |
| FR-011, FR-012 | T016, T017, T026 |
| FR-013 | T016, T017 (`overview-series.ts`, `SeriesChart` y la tabla), T026 |
| FR-014 | T006 (`curriculum-filters.ts`), T018, T019, T026 |
| FR-015, FR-016 | T018, T019 (`curriculum-columns.tsx`) |
| FR-017 | T005, T006 (`exercise-order.ts`), T018, T019, T026 |
| FR-018 | T018, T019 (`ExerciseDetail`), T026 |
| FR-019 | T018, T019 (los mundos, los talleres y el recorrido) |
| FR-020 | T005, T006 (`content-titles.ts`), T013, T024, T026 |
| FR-021, FR-022 | T020, T021 (`QueuePanel`), T026 (cinco minutos con `page.clock`) |
| FR-023, FR-024 | T020, T021 (`RunsList`, `RunFiltersForm` y `useRunsPages`), T026 |
| FR-038 | T026 (el almacenamiento, la URL, el historial y la consola) |
| FR-039 | Sin datos de una cuenta en F14a; las E2E no ofrecen órdenes por métrica |
| FR-040 | T017, T019 (lo resuelto en columnas separadas), T026 (ningún «verificado») |
| FR-041, FR-042 | T005, T006 (`rateView` y `showsDistribution`), T014, T015 (`RateCell` y `Distribution`), T018, T026 |
| FR-043 | T026 (ninguna exportación) |
| FR-044 | T012, T013 (`useStatsRequest`), T022 (la cancelación al cambiar de vista), T026 (el alumno no pide nada) |
| FR-045 a FR-048 | T007, T008 (`barPlotOptions` y `plot.ts`), T014, T015 (`SeriesChart`), T026 |
| FR-049, FR-050 | T005, T006 (`describeStatsFailure`), T014, T015 (`StatsFailure`), T016, T026 (503 y 401) |
| FR-051 | T012, T013, T016 («Actualizando…») |
| FR-052, FR-053 | T014, T015 (`StatsTable`), T019 (el foco del detalle), T026 (el teclado) |
| FR-054 | T023 (`admin.css`), T026 (320 y 390 px) |
| FR-055 | T023 (`git grep` sin estilos en línea), research R3 y R11 |
| FR-056 | T002 (el permiso), T011 y T028 (un solo importador de uPlot) |
| FR-057 | T002 (uPlot solo), T023 y T028 (el total) |
| FR-058 | T026 (la respuesta más grande, sin virtualizar, y su medición) |
| FR-059 | Todas las tareas pares, con su spec en rojo |
| FR-060 | T025 (`UsagePage` con `admin.open()`), T026 |
| FR-061 | T023, T024 y T028 (la red sin editar, también las specs de F12a) |
| FR-062 | T027, T028 |
| FR-063 | T007 (opciones, `node`), T014 a T020 (lo que recibe `drawBarChart`, `dom`), T026 (el dibujo, el ancho y las animaciones) |
| SC-001 | T003 a T021 (cada cifra contra la respuesta), T026 |
| SC-002 | T018, T026 (la distribución oculta y ningún «verificado») |
| SC-003 | T026 |
| SC-004 (última oración) | T026 (`page.clock`, cinco minutos) |
| SC-005 | T005 (429, 403, 409, 5xx, un cuerpo que no es JSON y la red), T014 y T016 (cargando, vacío, 503 y 422), T026 (422, 503 y 401 en el navegador); el 404 es de F14b |
| SC-006 | T014, T026 |
| SC-007 | T002, T023, T028 |
| SC-008 | T026, T028 |
| SC-009 | T022 (la página sola), T025 (un solo método de apertura) |
| SC-010 | T028 |

FR-025 a FR-037 y SC-004 (salvo su última oración) son de F14b ([plan-f14b.md](./plan-f14b.md)).

## Descargas y permisos

- **Una descarga, con permiso:** `uplot` 1.6.32 en T002, con el texto del pedido escrito ahí.
- **Docker,** sólo para la revisión manual de T028, a cargo del usuario.

## Riesgos y lo que quedó sin verificar

- **Nada de este plan corrió** (research, «Lo que no se verificó»). El riesgo más alto son los tipos de uPlot: si una opción no tipa, T008 la ajusta sin cambiar el comportamiento.
- **uPlot deja tres listeners en `window` al arrancar** para todos los alumnos (research, R3). No cambia ningún comportamiento medido por la red; lo confirma T023 con la red completa.
- **La CSP de C4:** uPlot escribe estilos con el CSSOM (FR-055). Lo contrasta C4 (hallazgo F14-6).
- **El contrato de C5 puede cambiar al implementarse** (spec, riesgo 8): `parse-usage.ts` rechaza una forma distinta y la vista muestra el aviso común. Si cambia, cambian juntos este contrato, el parser y las fábricas.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, descartada |
| --- | --- | --- |
| Un arnés y un setup de pruebas que suman dos globals | uPlot llama a `setPxRatio()` al evaluarse (research, R3) | Cargar uPlot a pedido: lo prohíben `build-check` y `evaluateBuiltPage` |
| Un provider de títulos que monta `app/` | Ni la página ni sus dos props pueden leer el contenido (research, R7) | Mostrar los ids: incumple FR-020 |
| Una tabla genérica con columnas como datos | Diez tablas con el mismo marcado accesible | Diez componentes de tabla: el mismo código diez veces |
