# Implementation Plan: F14b · Las estadísticas del admin, por cuenta

**Branch**: `028-f14-estadisticas-admin` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F14, en su parte b: FR-025 a FR-037, los transversales FR-038 a FR-063 sobre lo suyo y SC-004, más lo de una cuenta en SC-001 a SC-003 y SC-005 a SC-010. Cubre las historias 3 y 4, y lo de F14b de las historias 5, 7 y 8. Decisiones: [research-f14b.md](./research-f14b.md), sobre las de [research.md](./research.md) (F14a). Interfaces: [contracts/usage-section.md](./contracts/usage-section.md). Validación: [quickstart-f14b.md](./quickstart-f14b.md). Tareas: [tasks-f14b.md](./tasks-f14b.md). F14a está en [plan.md](./plan.md), y este plan sigue su forma, sus reglas y sus piezas.

**Objetivo:** que quien enseña encuentre a los alumnos que no vienen y abra el uso de una cuenta (desde «Alumnos» o desde «Cuentas») con un solo pedido por acción, sin una sola opción elegida, sin distribuciones y sin guardar nada.

**Arquitectura:**

- **La vista «Alumnos»** de «Uso del taller» es la lista paginada de F12a (`usePagedList` y `ListView`) sobre `GET /api/admin/stats/students`.
- **El detalle de una cuenta,** `AccountUsage`, ocupa el lugar de la lista de origen, que queda montada y oculta. Lo abren «Alumnos» y una columna «Uso» nueva en «Cuentas».
- **Las piezas son las de F14a:** el período compartido, el gráfico, los pedidos, `RunsList` y las tablas, por su API dentro del slice.

**Stack:** el de F14a. Ninguna dependencia nueva: uPlot ya está (FR-056).

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales» y las «Reglas para todos los agentes» de [plan.md](./plan.md), que valen acá, las diferencias de abajo y la sección de tu tarea. `tasks-f14b.md` tiene una línea por tarea (T029 a T041).
> - **La base.** `f14b/base` sale de `master` con F14a integrada. F14b llega a `master` en un solo PR, en T041.
> - **El código no corrió.** Las firmas de F14a salen de su plan y del contrato. T029 compara las reales de `master`. Si una difiere, usá la de la base y avisá al coordinador.
> - **Sin comentarios en el código.**

## Summary

F14b trae lo que es de una cuenta: quién no viene, su uso ejercicio por ejercicio y sus ejecuciones. El enfoque:

- **Seis unidades sobre `f14b/base`, con un solo merge a `master`:**
  - **U0:** la línea base, acumulada desde la de F14a;
  - **U1:** las formas de C5 por cuenta, sus reglas y sus pedidos;
  - **U2:** el detalle de una cuenta y, sobre él, la vista «Alumnos»;
  - **U3:** la columna «Uso», la lista oculta de «Cuentas» y «Alumnos» en la sección;
  - **U4:** las E2E;
  - **U5:** la documentación, el peso y el PR.
- **La lista de origen queda montada y oculta** mientras se ve el detalle (hallazgo F14-3), así que «Volver» la encuentra como estaba, con el foco en el botón que lo abrió (research-f14b, R1).
- **Un pedido por acción del admin:** el detalle se pide al abrirlo y con cada período, y sus ejecuciones sólo con «Ver sus ejecuciones». Nada pide la ficha (research-f14b, R5).
- **Ninguna opción ni distribución en el detalle:** sólo banderas (research-f14b, R4).
- **Ninguna prueba de F12a, F12b ni F14a se edita,** y la columna nueva no cambia sus conteos (research-f14b, R2).

## Technical Context

**Language/Version**, **Primary Dependencies**, **Testing**, **Target Platform** y **Project Type**: los de F14a.

**Storage**: ninguno. Lo de una cuenta vive en el estado del detalle y se descarta al volver, al cambiar de sección o de vista, o al cerrar la administración (FR-038).

**Performance Goals**: SC-008 mide una grilla con todos los ejercicios (T039). El peso tiene una condición de corte (T037 y T041).

**Scale/Scope**:

- **Lo nuevo:** unos 8 archivos de producción en `frontend/src/pages/admin/`, 6 specs de Vitest y 2 E2E.
- **Lo que cambia:**
  - de F12a: `AccountsTable.tsx`, `AccountsSection.tsx` y `admin.css`;
  - de F14a: `usage-types.ts`, `parse-usage.ts`, `usage-labels.ts`, `stats-failure.ts`, `usage.factory.ts`, `usage-endpoints.ts`, `UsageSection.tsx` y `RunsList.tsx` (una prop opcional);
  - en `qa/e2e`: `usage-contract.ts`;
  - `docs/architecture.md` y `qa/AGENTS.md`.

## Restricciones globales

Las de [plan.md](./plan.md), con estas diferencias:

- **La red, sin editar** (FR-061, SC-007): la de la base, que ya incluye F14a. Tampoco se editan las specs de Vitest de F12a, F12b ni F14a. En particular:
  - `accounts-section.spec.tsx` de F12a y su E2E `admin-accounts.spec.ts`, que cuentan los botones dentro del grupo «Acciones sobre {nombre}»;
  - las de F12b, si está en la base;
  - `usage-section.spec.tsx` de F14a, que fija la primera, la segunda y la última vista, no la tercera.
- **Lo que sí cambia en QA:** `qa/e2e/lib/usage-contract.ts` suma los datos de una cuenta. Dos E2E nuevas, `admin-usage-students.spec.ts` y `admin-usage-account.spec.ts`. `UsagePage` no cambia.
- **Ninguna dependencia nueva.**
- **La columna «Uso»** (Q1-A, FR-028):
  - va justo antes de «Acciones», con «Ver el uso de {nombre}» en cada fila que no se está borrando, también la propia;
  - queda fuera del grupo «Acciones sobre {nombre}»;
  - `ACTION_SLOTS` no cambia.
- **Un pedido por acción** (FR-030, SC-004):
  - el detalle se pide al abrirlo y al aplicar otro período, uno por vez;
  - nada se pide al listar ni al pasar el puntero;
  - nunca `GET /api/admin/users/{id}`;
  - sus ejecuciones, sólo con «Ver sus ejecuciones».
- **El detalle** (FR-039, FR-042): ninguna opción, ninguna distribución, ninguna comparación con un agregado. Avisa que la consulta queda registrada.
- **El peso** (FR-057): F14 entera suma como mucho +95 000 sobre la línea base de T001 **de F14a**, no sobre la de F14b. Si lo medido en T037 o en T041 pasa de ahí, la tarea se detiene y decide el usuario.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | Lo de F14a, más `usePagedList` y `ListView` de F12a, sin copiarlos |
| II. TDD y pruebas útiles | Sí | Cada par abre con su spec en rojo. Los esperados salen del contrato de C5 (§5, §6 y §8), de la spec y del contenido congelado |
| III. Código entendible | Sí | El detalle, la grilla y sus ejecuciones son componentes chicos con su contrato; las reglas (los «Borrar todo», las banderas y las cuotas) son funciones puras |
| IV. Contenido en Git, IDs estables | Sí | No toca `content/`, el progreso ni las URL |
| V. Capas y contratos explícitos | Sí | Todo en `pages/admin`; el contrato de la carpeta 028 suma lo de F14b |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de la spec; teclado, foco al volver, 320 px y movimiento reducido |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva |
| VIII. Flow-forward | Sí | `tasks-f14b.md` aparte; `specs/023` no cambia |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1-A:** la columna «Uso» en «Cuentas», antes de «Acciones» | `AccountsTable` suma `onUsage` y la columna; `ACTION_SLOTS` no cambia | T036, T037 |
| **Q3-A:** las muestras chicas | El detalle no tiene tasas sobre alumnos ni distribuciones; las cuotas no son tasas (research-f14b, R3) | T032, T033 |
| **Q4-A:** no espera a A4 ni a D1c | El detalle de una cuenta sin progreso sale con la época 1 y todo en ceros, y lo dice | T032, T033, T041 |
| **P1-A:** F14b espera a F14a | Base `master` con F14a; reutiliza sus piezas | Todo el plan |
| **Hallazgo F14-3:** la lista de «Cuentas» montada y oculta | Tarea propia con TDD sobre el código de F12a | T036, T037 |

## Project Structure

### Source Code (repository root)

```text
frontend/src/pages/admin/
├── model/
│   ├── usage-types.ts                                 # cambia (M, T031; P, T037): las formas por cuenta y la vista 'students'
│   ├── parse-usage.ts                                 # cambia (M): parseStudentRow y parseStudentDetail
│   ├── parse-students.spec.ts                         # nuevo (M)
│   ├── account-usage.ts (+ .spec.ts)                  # nuevo (M): los «Borrar todo», las banderas, la grilla, las cuotas y la actividad
│   ├── usage-labels.ts                                # cambia (M; P): los textos de F14b y VIEW_LABELS
│   ├── stats-failure.ts                               # cambia (D): isNotFound
│   └── usage.factory.ts                               # cambia (M): las fábricas por cuenta
├── api/
│   ├── usage-endpoints.ts                             # cambia (M): listStudents, getStudentDetail y listAccountRuns
│   └── usage-endpoints-students.spec.ts               # nuevo (M)
└── ui/
    ├── StudentsView.tsx, students-view.spec.tsx       # nuevos (S)
    ├── AccountUsage.tsx, AccountUsageReport.tsx, ExerciseGrid.tsx, AccountRuns.tsx,
    │   account-usage.spec.tsx                         # nuevos (D)
    ├── RunsList.tsx                                   # cambia (D): emptyText opcional
    ├── AccountsTable.tsx, AccountsSection.tsx         # cambian (P): la columna y la lista oculta (de F12a)
    ├── UsageSection.tsx                               # cambia (P): «Alumnos»
    ├── accounts-usage.spec.tsx                        # nuevo (P)
    └── admin.css                                      # cambia (P): .admin-section[hidden] y las cuotas
qa/e2e/
├── lib/usage-contract.ts                              # cambia (E): los datos de una cuenta
└── specs/admin-usage-students y admin-usage-account (.spec.ts)   # nuevos (E)
docs/architecture.md, qa/AGENTS.md                     # cambian (K, T040)
```

## Review Focus

Lo que el revisor mira primero:

- **Un pedido por acción.** Ningún `onMouseEnter`, prefetch ni `useEffect` que pida un detalle sin un clic. Ningún `GET /api/admin/users/{id}`.
- **El detalle sin opciones.** Ningún `Distribution` ni texto de una opción dentro de `AccountUsage` y sus hijos.
- **Las pruebas de F12a, F12b y F14a, sin editar.** `git diff master -- '*.spec.ts' '*.spec.tsx'` muestra sólo archivos nuevos.
- **El peso acumulado,** contra la línea base de T001 de F14a.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **Pasar el puntero no pide el detalle** (SC-004). Un `onMouseEnter` o un prefetch por fila haría pedidos registrados sin una acción del admin, y jsdom no lo mide bien. Lo fija «asks no detail while listing and hovering, and asks once on «Ver el uso de»» en `admin-usage-students.spec.ts` (T039): `hover` sobre cada fila, 0 pedidos a `/api/admin/stats/students/{id}`; después del clic, exactamente 1.
2. **Volver no vuelve a pedir la lista.** Si «Volver a Cuentas» desmontara la lista, perdería la página 2 y pediría otra vez. Lo fija «opens the usage in place of the list and comes back to the list as it was» en `accounts-usage.spec.tsx` (T036): después de volver, «Página 2 de 2 · 30 cuentas» y los pedidos de la lista siguen en 2.
3. **La misma cuenta que vuelve a entrar después de un 401 no repite el pedido.** El detalle tiene que seguir donde estaba, sin pedirse solo. Lo fija «keeps the usage where it was after signing in again, without asking it again» en `admin-usage-account.spec.ts` (T039), con el ingreso de F11a.
4. **Un 404 vuelve a pedir la lista de origen** (FR-036). Sin `list.reload()`, la fila de la cuenta que se borra seguiría ofreciendo «Ver el uso». Lo fija «asks the list again after a 404 of the usage» en `accounts-usage.spec.tsx` (T036).
5. **Los datos de la cuenta no sobreviven al cerrar** (FR-038, SC-003). Lo fija «keeps nothing of the account after closing the administration» en `admin-usage-account.spec.ts` (T039): el almacenamiento, la URL, el historial y la consola, sin el nombre, el email ni el id.

## Reparto en paralelo

Las reglas de F14a («Reparto en paralelo» y «Reglas para todos los agentes» de [plan.md](./plan.md)). Los dueños de F14b son M, S, D, P y E, delegables al subagente `implementador`; K es el coordinador.

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T029 |
| 1 | M y E a la vez | **M:** T030 y T031. **E:** T038 |
| 1b | K | La compuerta de U1 |
| 2 | D desde S1, y S desde T033 | **D:** T032 y T033. **S:** T034 y T035 |
| 3 | P y E, desde S2 | **P:** T036 y T037. **E:** T039, en rojo |
| 4 | K | La compuerta de U3, T040 y T041 |

**Puntos de sincronización:** S1, K cerró la compuerta de U1; S2, D y S entregaron.

**Puertos de los E2E:** K `E2E_PORT=4173` y E `4196`.

**Si F12b entra durante F14b,** P rebasa y suma `onUsage` al lado de `mailAvailable`, sin tocar lo de F12b (research-f14b, R2).

## Ramas: lo que T029 detecta en la base

| Rama | Cómo se detecta | Sin la rama | Con la rama |
| --- | --- | --- | --- |
| **B1.** F14a integrada | `ls frontend/src/pages/admin/ui/UsageSection.tsx frontend/src/pages/admin/lib/use-stats-request.ts frontend/src/pages/admin/ui/RunsList.tsx qa/e2e/pages/usage.ts` | Falta algo: F14b no empieza | Sigue |
| **B2.** F12b en la base | `git grep -n "mailAvailable" -- frontend/src/pages/admin/ui/AccountsTable.tsx` | El diff de T037 va sobre el `AccountsTable` de F12a | `onUsage` se suma al lado de `mailAvailable`; el resto del diff no cambia |
| **B3.** F10b en la base | `git grep -n "<AdminPage" -- frontend/src/app` | Nada | Nada: la sección y el detalle siguen fuera de la URL (spec, «Con F10») |
| **B4.** La línea base de F14a | `grep -n "Línea base de la implementación" specs/028-f14-estadisticas-admin/research.md` | Falta: se pregunta al coordinador | Su tamaño de `dist/index.html` es la base del peso de F14b |
| **B5.** `AccountsSection` como la deja F12a | `git grep -n "usePagedList(load, EVERY_ACCOUNT, ownId)" -- frontend/src/pages/admin/ui/AccountsSection.tsx` | Se anota la forma real y T037 la adapta | Sigue el diff tal cual |

## 0. U0 · La base (coordinador K, onda 0)

### Tarea 0.1 · La línea base (T029)

1. **La rama.** `f14b/base` sale de `master` con F14a (B1). Corré las ramas B1 a B5.
2. **Los valores de la base,** como en T001 de F14a: el tamaño de `dist/index.html`, `npm test`, los avisos de lint y la red E2E, en verde.
3. **El presupuesto que queda:** 95 000 menos la suba que midió T028 de F14a sobre su T001. Anotalo.
4. **Las firmas reales de F14a** que usa este plan (el contrato): anotá cada diferencia.
5. **El commit:** `docs(specs): F14b registra la línea base de la implementación`, con la sección «Línea base de la implementación» de research-f14b.md.

## 1. U1 · Las formas por cuenta, sus reglas y sus pedidos (onda 1: M; onda 1b: K)

**Cubre:** FR-025, FR-026, FR-030, FR-031 a FR-035 y FR-037 en el modelo y la API; FR-039 en la lectura.

### Tarea 1.1 · Las formas por cuenta, en rojo (T030, M)

**Archivos:**

- en `frontend/src/pages/admin/model/`, el agregado de `usage-types.ts` (entero, abajo), el de `usage.factory.ts`, los stubs de `parseStudentRow` y `parseStudentDetail` en `parse-usage.ts`, el stub de `account-usage.ts`, `parse-students.spec.ts` y `account-usage.spec.ts`;
- en `frontend/src/pages/admin/api/`, los stubs de `listStudents`, `getStudentDetail` y `listAccountRuns` en `usage-endpoints.ts`, y `usage-endpoints-students.spec.ts`.

**Consume:** de F14a, `usage-types.ts`, `parse-usage.ts`, `json-reader.ts`, `usage.factory.ts`, `usage-endpoints.ts`, `overview-series.ts` (`peakSentence`) y `usage-format.ts`; de F12a, `AdminUser`, `ListPage`, `parsePage`, `parseAdminUser` y `adminUserBodyFactory`. **Produce:** «`pages/admin`, lo que suma F14b» del contrato, salvo `'students'` en `UsageView`, que llega en T037 con la vista.

1. **`usage-types.ts`,** al final, sin tocar lo de F14a:

   ```ts
   export type StudentSort = 'name' | 'lastActivity' | '-lastActivity' | '-createdAt';
   export type ExerciseState = 'solved' | 'attempted' | 'started';
   export type Confidence = 'again' | 'practice' | 'confident';

   export interface StudentQuery {
     readonly page: number;
     readonly q: string;
     readonly inactiveSince: string;
     readonly sort: StudentSort;
   }

   export interface StudentAttempts {
     readonly lastWeek: number;
     readonly lastMonth: number;
   }

   export interface StudentRow {
     readonly id: number;
     readonly name: string;
     readonly email: string;
     readonly role: AccountRole;
     readonly status: AccountStatus;
     readonly lastActivityAt: string | null;
     readonly solved: SolvedSplit;
     readonly attempts: StudentAttempts;
     readonly lastAttemptAt: string | null;
   }

   export interface StudentProgress {
     readonly epoch: number;
     readonly resetAt: string | null;
     readonly lastActivityAt: string | null;
   }

   export interface ImportRecord {
     readonly importedAt: string;
     readonly source: string;
     readonly epoch: number;
   }

   export interface SolvedByCatalog {
     readonly catalog: string;
     readonly language: string;
     readonly server: number;
     readonly imported: number;
   }

   export interface AttemptBreakdown {
     readonly attempts: OutcomeCounts;
     readonly operations: OperationCounts;
     readonly importedAttempts: number;
   }

   export interface ActivityPoint {
     readonly start: string;
     readonly attempts: number;
   }

   export interface QuotaLimits {
     readonly active: number;
     readonly perMinute: number;
     readonly perDay: number;
     readonly sandboxMinutes: number;
   }

   export interface QuotaUse {
     readonly active: number;
     readonly lastMinute: number;
     readonly lastDay: number;
     readonly sandboxMs: number;
     readonly limits: QuotaLimits;
   }

   export interface ExerciseProgressRow {
     readonly exerciseId: string;
     readonly state: ExerciseState;
     readonly solvedAt: string | null;
     readonly serverSolvedAt: string | null;
     readonly attemptCount: number;
     readonly lastAttemptAt: string | null;
     readonly lastOutcome: string | null;
     readonly assisted: boolean;
     readonly solutionSeen: boolean;
     readonly hintsRevealed: number | null;
     readonly predictionAnswered: boolean;
     readonly predictionCorrect: boolean;
     readonly confidence: Confidence | null;
     readonly reviewDueAt: string | null;
   }

   export interface CheckpointProgress {
     readonly worldId: string;
     readonly answered: boolean;
     readonly passed: boolean;
     readonly passedAt: string | null;
   }

   export interface WorkshopProgress {
     readonly workshopId: string;
     readonly language: string;
     readonly codeSealed: boolean;
     readonly predictionAnswered: boolean;
     readonly predictionCorrect: boolean;
     readonly stepsMarked: number;
     readonly objectivesObserved: number;
   }

   export interface RouteProgress {
     readonly steps: number;
     readonly milestones: number;
     readonly favorites: number;
     readonly quizAnswered: number;
   }

   export interface CampaignProgress {
     readonly checkpoints: readonly CheckpointProgress[];
     readonly sealedExercises: number;
   }

   export interface StudentAttemptTotals {
     readonly inPeriod: AttemptBreakdown;
     readonly total: AttemptBreakdown;
   }

   export interface StudentDetail {
     readonly account: AdminUser;
     readonly progress: StudentProgress;
     readonly imports: readonly ImportRecord[];
     readonly solvedByCatalog: readonly SolvedByCatalog[];
     readonly attempts: StudentAttemptTotals;
     readonly activity: readonly ActivityPoint[];
     readonly quota: QuotaUse;
     readonly exercises: readonly ExerciseProgressRow[];
     readonly campaign: CampaignProgress;
     readonly workshops: readonly WorkshopProgress[];
     readonly route: RouteProgress;
   }
   ```

   El import de `./types` suma `AdminUser`: `import type { AccountStatus, AdminUser } from './types';`.

2. **`usage.factory.ts`,** al final. Las formas son las del contrato de C5 (§5 y §6):

   ```ts
   import { adminUserBodyFactory, type AdminUserBody } from './admin.factory';

   export interface StudentRowBody {
     id: number;
     name: string;
     email: string;
     role: string;
     status: string;
     lastActivityAt: string | null;
     solved: SplitBody;
     attempts: { lastWeek: number; lastMonth: number };
     lastAttemptAt: string | null;
   }

   export interface BreakdownBody {
     attempts: OutcomeBody;
     operations: OperationBody;
     importedAttempts: number;
   }

   export interface ExerciseRowBody {
     exerciseId: string;
     state: string;
     solvedAt: string | null;
     serverSolvedAt: string | null;
     attemptCount: number;
     lastAttemptAt: string | null;
     lastOutcome: string | null;
     assisted: boolean;
     solutionSeen: boolean;
     hintsRevealed: number | null;
     predictionAnswered: boolean;
     predictionCorrect: boolean;
     confidence: string | null;
     reviewDueAt: string | null;
   }

   export interface StudentDetailBody {
     account: AdminUserBody;
     progress: { epoch: number; resetAt: string | null; lastActivityAt: string | null };
     imports: { importedAt: string; source: string; epoch: number }[];
     solvedByCatalog: { catalog: string; language: string; server: number; imported: number }[];
     attempts: { inPeriod: BreakdownBody; total: BreakdownBody };
     activity: { start: string; attempts: number }[];
     quota: {
       active: number;
       lastMinute: number;
       lastDay: number;
       sandboxMs: number;
       limits: { active: number; perMinute: number; perDay: number; sandboxMinutes: number };
     };
     exercises: ExerciseRowBody[];
     campaign: {
       checkpoints: { worldId: string; answered: boolean; passed: boolean; passedAt: string | null }[];
       sealedExercises: number;
     };
     workshops: {
       workshopId: string;
       language: string;
       codeSealed: boolean;
       predictionAnswered: boolean;
       predictionCorrect: boolean;
       stepsMarked: number;
       objectivesObserved: number;
     }[];
     route: { steps: number; milestones: number; favorites: number; quizAnswered: number };
   }

   function breakdown(): BreakdownBody {
     return {
       attempts: { ...NO_OUTCOMES },
       operations: { infraError: 0, canceled: 0 },
       importedAttempts: 0,
     };
   }

   export const studentRowFactory = Factory.define<StudentRowBody>(({ sequence }) => ({
     id: 200 + sequence,
     name: `Alumno ${sequence}`,
     email: `alumno${sequence}@x.com`,
     role: 'student',
     status: 'active',
     lastActivityAt: null,
     solved: { server: 0, imported: 0 },
     attempts: { lastWeek: 0, lastMonth: 0 },
     lastAttemptAt: null,
   }));

   export const exerciseRowFactory = Factory.define<ExerciseRowBody>(() => ({
     exerciseId: 'rust-01',
     state: 'started',
     solvedAt: null,
     serverSolvedAt: null,
     attemptCount: 0,
     lastAttemptAt: null,
     lastOutcome: null,
     assisted: false,
     solutionSeen: false,
     hintsRevealed: null,
     predictionAnswered: false,
     predictionCorrect: false,
     confidence: null,
     reviewDueAt: null,
   }));

   export const studentDetailFactory = Factory.define<StudentDetailBody>(() => ({
     account: adminUserBodyFactory.build({ id: 12, name: 'Ana Pérez', email: 'ana@x.com' }),
     progress: { epoch: 1, resetAt: null, lastActivityAt: null },
     imports: [],
     solvedByCatalog: [],
     attempts: { inPeriod: breakdown(), total: breakdown() },
     activity: [],
     quota: {
       active: 0,
       lastMinute: 0,
       lastDay: 0,
       sandboxMs: 0,
       limits: { active: 1, perMinute: 10, perDay: 300, sandboxMinutes: 30 },
     },
     exercises: [],
     campaign: { checkpoints: [], sealedExercises: 0 },
     workshops: [],
     route: { steps: 0, milestones: 0, favorites: 0, quizAnswered: 0 },
   }));
   ```

   El `import` va arriba, con los demás.

3. **Los stubs:** `parseStudentRow` y `parseStudentDetail` en `parse-usage.ts`; `listStudents`, `getStudentDetail` y `listAccountRuns` en `usage-endpoints.ts`; y en `account-usage.ts`, `GridFilter`, `QuotaRow` y las funciones de abajo, como `const` tipados que lanzan `not implemented`.
4. **`model/parse-students.spec.ts`.** Los valores salen del contrato de C5 (§5 y §6). La última prueba fija que la lectura descarta lo que el contrato no tiene, aunque llegue (FR-039):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { parseStudentDetail, parseStudentRow } from './parse-usage';
   import {
     exerciseRowFactory,
     statsBody,
     studentDetailFactory,
     studentRowFactory,
   } from './usage.factory';

   describe('a student of the list', () => {
     it('reads the row of the contract, with a null activity for whoever never practiced', () => {
       expect(
         parseStudentRow(
           studentRowFactory.build({
             id: 3,
             name: 'Ana Pérez',
             email: 'ana@stats.test',
             solved: { server: 1, imported: 0 },
             attempts: { lastWeek: 0, lastMonth: 3 },
             lastAttemptAt: '2026-10-06T02:30:00.000Z',
           }),
         ),
       ).toEqual({
         id: 3,
         name: 'Ana Pérez',
         email: 'ana@stats.test',
         role: 'student',
         status: 'active',
         lastActivityAt: null,
         solved: { server: 1, imported: 0 },
         attempts: { lastWeek: 0, lastMonth: 3 },
         lastAttemptAt: '2026-10-06T02:30:00.000Z',
       });
     });

     it('rejects a status outside the contract', () => {
       expect(parseStudentRow(studentRowFactory.build({ status: 'banned' }))).toBeNull();
     });
   });

   describe('the detail of an account', () => {
     it('reads the account, its progress, its activity, its quota and its grid', () => {
       const detail = parseStudentDetail(
         statsBody(
           studentDetailFactory.build({
             progress: { epoch: 3, resetAt: '2026-10-03T15:00:00.000Z', lastActivityAt: null },
             activity: [{ start: '2026-10-01', attempts: 2 }],
             quota: { sandboxMs: 90000 },
             exercises: [
               exerciseRowFactory.build({
                 state: 'attempted',
                 attemptCount: 2,
                 lastOutcome: 'failed',
                 predictionAnswered: true,
                 confidence: 'again',
               }),
             ],
           }),
         ),
       );
       expect(detail?.data.account).toMatchObject({ id: 12, name: 'Ana Pérez', role: 'student' });
       expect(detail?.data.progress).toEqual({
         epoch: 3,
         resetAt: '2026-10-03T15:00:00.000Z',
         lastActivityAt: null,
       });
       expect(detail?.data.activity).toEqual([{ start: '2026-10-01', attempts: 2 }]);
       expect(detail?.data.quota.sandboxMs).toBe(90000);
       expect(detail?.data.quota.limits).toEqual({
         active: 1,
         perMinute: 10,
         perDay: 300,
         sandboxMinutes: 30,
       });
       expect(detail?.data.exercises[0]).toMatchObject({
         state: 'attempted',
         attemptCount: 2,
         lastOutcome: 'failed',
         predictionAnswered: true,
         predictionCorrect: false,
         confidence: 'again',
       });
     });

     it('drops what the contract does not have, such as an answer of the account', () => {
       const body = statsBody(studentDetailFactory.build({ exercises: [exerciseRowFactory.build()] }));
       const withAnswer: unknown = {
         ...body,
         data: { ...body.data, exercises: [{ ...body.data.exercises[0], predictionAnswer: 2 }] },
       };
       const row = parseStudentDetail(withAnswer)?.data.exercises[0];
       expect(row).toBeDefined();
       expect(Object.keys(row ?? {})).not.toContain('predictionAnswer');
     });

     it('rejects a confidence outside the contract', () => {
       const body = statsBody(
         studentDetailFactory.build({ exercises: [exerciseRowFactory.build({ confidence: 'sure' })] }),
       );
       expect(parseStudentDetail(body)).toBeNull();
     });
   });
   ```

5. **`api/usage-endpoints-students.spec.ts`.** Las rutas y los parámetros salen del contrato de C5 (§5, §6 y §8):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { pageBody } from '../model/admin.factory';
   import {
     runsBody,
     statsBody,
     studentDetailFactory,
     studentRowFactory,
   } from '../model/usage.factory';
   import { getStudentDetail, listAccountRuns, listStudents } from './usage-endpoints';

   const SIGNAL = new AbortController().signal;

   function clientWith(reply: FakeReply) {
     const fake = createFakeFetch([reply]);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     return { client, calls: fake.calls };
   }

   function requestOf(path: string | undefined) {
     const url = new URL(path ?? '', 'http://taller');
     return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
   }

   describe('the requests of an account', () => {
     it('lists the students 25 at a time, without the default order', async () => {
       const { client, calls } = clientWith({
         status: 200,
         json: pageBody([studentRowFactory.build({ id: 3, name: 'Ana Pérez' })], 1, 1, 1),
       });
       const outcome = await listStudents(
         client,
         { page: 1, q: '', inactiveSince: '', sort: 'name' },
         SIGNAL,
       );
       expect(requestOf(calls[0]?.path)).toEqual({
         pathname: '/api/admin/stats/students',
         query: { page: '1', perPage: '25' },
       });
       expect(outcome.ok && outcome.value.items.map((student) => student.name)).toEqual(['Ana Pérez']);
       expect(outcome.ok && outcome.value.meta).toEqual({ page: 1, lastPage: 1, total: 1 });
     });

     it('sends the search, the inactivity and the order', async () => {
       const { client, calls } = clientWith({ status: 200, json: pageBody([]) });
       await listStudents(
         client,
         { page: 2, q: ' ana ', inactiveSince: '2026-10-01', sort: 'lastActivity' },
         SIGNAL,
       );
       expect(requestOf(calls[0]?.path).query).toEqual({
         page: '2',
         perPage: '25',
         q: 'ana',
         inactiveSince: '2026-10-01',
         sort: 'lastActivity',
       });
     });

     it('asks for the detail of one account, with the period when there is one', async () => {
       const { client, calls } = clientWith({
         status: 200,
         json: statsBody(studentDetailFactory.build()),
       });
       await getStudentDetail(client, 12, { from: '2026-10-01', to: '2026-10-07', granularity: 'day' }, SIGNAL);
       expect(requestOf(calls[0]?.path)).toEqual({
         pathname: '/api/admin/stats/students/12',
         query: { from: '2026-10-01', to: '2026-10-07', granularity: 'day' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });

     it('pages the runs of one account with the cursor', async () => {
       const { client, calls } = clientWith({ status: 200, json: runsBody([]) });
       await listAccountRuns(client, 12, '019a0000-0000-7000-8000-000000000002', SIGNAL);
       expect(requestOf(calls[0]?.path)).toEqual({
         pathname: '/api/admin/runs',
         query: { user: '12', cursor: '019a0000-0000-7000-8000-000000000002' },
       });
     });
   });
   ```

6. **`model/account-usage.spec.ts`.** Los textos salen de la spec («Detalle de una cuenta») y de research-f14b (R3 y R7):

   ```ts
   import { describe, expect, it } from 'vitest';
   import {
     activityChart,
     activitySummary,
     helpText,
     predictionText,
     quotaRows,
     resetSentence,
     solvedText,
     visibleRows,
   } from './account-usage';
   import { parseStudentDetail } from './parse-usage';
   import { exerciseRowFactory, statsBody, studentDetailFactory } from './usage.factory';

   function rowsOf(states: string[]) {
     const body = statsBody(
       studentDetailFactory.build({
         exercises: states.map((state, index) =>
           exerciseRowFactory.build({ exerciseId: `rust-0${index + 1}`, state }),
         ),
       }),
     );
     return parseStudentDetail(body)?.data.exercises ?? [];
   }

   describe('the usage of an account', () => {
     it('says how many times it cleared everything', () => {
       expect(resetSentence({ epoch: 1, resetAt: null, lastActivityAt: null })).toBe(
         'Nunca hizo «Borrar todo».',
       );
       expect(
         resetSentence({ epoch: 2, resetAt: '2026-10-03T15:00:00.000Z', lastActivityAt: null }),
       ).toMatch(/^Hizo «Borrar todo» 1 vez; la última, el .+ de octubre de 2026 a las .+\.$/);
       expect(
         resetSentence({ epoch: 3, resetAt: '2026-10-03T15:00:00.000Z', lastActivityAt: null }),
       ).toMatch(/^Hizo «Borrar todo» 2 veces; la última, el /);
     });

     it('says whether it answered and got it right, never what it chose', () => {
       expect(predictionText(false, false)).toBe('No respondió');
       expect(predictionText(true, true)).toBe('Respondió y acertó');
       expect(predictionText(true, false)).toBe('Respondió y no acertó');
     });

     it('shows every exercise or only the unsolved ones', () => {
       const rows = rowsOf(['solved', 'attempted', 'started']);
       expect(visibleRows(rows, 'all').map((row) => row.exerciseId)).toEqual(['rust-01', 'rust-02', 'rust-03']);
       expect(visibleRows(rows, 'unsolved').map((row) => row.exerciseId)).toEqual(['rust-02', 'rust-03']);
     });

     it('puts each quota against its limit, with the sandbox in minutes', () => {
       const detail = parseStudentDetail(
         statsBody(studentDetailFactory.build({ quota: { active: 1, lastMinute: 2, lastDay: 4, sandboxMs: 90000 } })),
       );
       expect(detail && quotaRows(detail.data.quota)).toEqual([
         { label: 'Ejecuciones activas', used: 1, limit: 1 },
         { label: 'Aceptadas en el último minuto', used: 2, limit: 10 },
         { label: 'Aceptadas en las últimas 24 horas', used: 4, limit: 300 },
         { label: 'Minutos de sandbox', used: 1.5, limit: 30 },
       ]);
     });

     it('draws its activity as one series and sums it in the summary', () => {
       const activity = [
         { start: '2026-10-01', attempts: 3 },
         { start: '2026-10-02', attempts: 0 },
       ];
       expect(activityChart(activity, 'day')).toEqual({
         title: 'Actividad',
         labels: ['1/10', '2/10'],
         series: [{ label: 'Intentos', token: 'accent', values: [3, 0] }],
         stacked: false,
       });
       expect(activitySummary(activity, 'day')).toBe(
         'En el período hubo 3 intentos; el día con más fue el 1/10, con 3.',
       );
       expect(activitySummary([{ start: '2026-10-01', attempts: 0 }], 'day')).toBe(
         'En el período no hubo intentos.',
       );
     });

     it('writes the help and the solving of a row of the grid', () => {
       const [helped] = rowsOf(['solved']);
       if (helped === undefined) throw new Error('no row');
       expect(helpText({ ...helped, assisted: true, solutionSeen: true, hintsRevealed: 2 })).toBe(
         'Asistido · Vio la solución · 2 pistas',
       );
       expect(helpText(helped)).toBe('—');
       expect(solvedText(helped)).toBe('—');
       expect(solvedText({ ...helped, solvedAt: '2026-10-03T15:00:00.000Z', serverSolvedAt: '2026-10-03T15:00:00.000Z' })).toMatch(
         / · en el servidor$/,
       );
       expect(solvedText({ ...helped, solvedAt: '2026-10-03T15:00:00.000Z' })).toMatch(/ · importado$/);
     });
   });
   ```

7. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/parse-students.spec.ts frontend/src/pages/admin/model/account-usage.spec.ts frontend/src/pages/admin/api/usage-endpoints-students.spec.ts`: en rojo, por `not implemented`. Las specs de F14a siguen en verde.
8. **Commit:** `test(front): specs de las estadísticas de una cuenta, en rojo`.

### Tarea 1.2 · Las formas por cuenta (T031, M)

**Archivos:** `model/parse-usage.ts`, `model/account-usage.ts`, `model/usage-labels.ts` y `api/usage-endpoints.ts`, en `frontend/src/pages/admin/`.

1. **`parse-usage.ts`,** al final. El detalle reutiliza los lectores de F14a y `parseAdminUser` de F12a para la cuenta:

   ```ts
   import { parseAdminUser } from './parse-admin';
   import { UnexpectedShape } from './json-reader';
   import type {
     ActivityPoint,
     AttemptBreakdown,
     CheckpointProgress,
     Confidence,
     ExerciseProgressRow,
     ExerciseState,
     ImportRecord,
     SolvedByCatalog,
     StudentDetail,
     StudentRow,
     WorkshopProgress,
   } from './usage-types';

   const STATES: readonly ExerciseState[] = ['solved', 'attempted', 'started'];
   const CONFIDENCES: readonly Confidence[] = ['again', 'practice', 'confident'];

   function studentRowOf(value: unknown): StudentRow {
     const record = recordAt(value, 'data');
     const attempts = childAt(record, 'attempts');
     return {
       id: numberAt(record, 'id'),
       name: stringAt(record, 'name'),
       email: stringAt(record, 'email'),
       role: oneOfAt(record, 'role', ROLES),
       status: oneOfAt(record, 'status', STATUSES),
       lastActivityAt: nullableStringAt(record, 'lastActivityAt'),
       solved: splitOf(childAt(record, 'solved')),
       attempts: { lastWeek: numberAt(attempts, 'lastWeek'), lastMonth: numberAt(attempts, 'lastMonth') },
       lastAttemptAt: nullableStringAt(record, 'lastAttemptAt'),
     };
   }

   function breakdownOf(record: JsonRecord): AttemptBreakdown {
     return {
       attempts: outcomesOf(childAt(record, 'attempts')),
       operations: operationsOf(childAt(record, 'operations')),
       importedAttempts: numberAt(record, 'importedAttempts'),
     };
   }

   function importOf(value: unknown): ImportRecord {
     const record = recordAt(value, 'imports');
     return {
       importedAt: stringAt(record, 'importedAt'),
       source: stringAt(record, 'source'),
       epoch: numberAt(record, 'epoch'),
     };
   }

   function solvedByCatalogOf(value: unknown): SolvedByCatalog {
     const record = recordAt(value, 'solvedByCatalog');
     return {
       catalog: stringAt(record, 'catalog'),
       language: stringAt(record, 'language'),
       server: numberAt(record, 'server'),
       imported: numberAt(record, 'imported'),
     };
   }

   function activityOf(value: unknown): ActivityPoint {
     const record = recordAt(value, 'activity');
     return { start: stringAt(record, 'start'), attempts: numberAt(record, 'attempts') };
   }

   function confidenceOf(record: JsonRecord): Confidence | null {
     return record.confidence === null ? null : oneOfAt(record, 'confidence', CONFIDENCES);
   }

   function exerciseRowOf(value: unknown): ExerciseProgressRow {
     const record = recordAt(value, 'exercises');
     return {
       exerciseId: stringAt(record, 'exerciseId'),
       state: oneOfAt(record, 'state', STATES),
       solvedAt: nullableStringAt(record, 'solvedAt'),
       serverSolvedAt: nullableStringAt(record, 'serverSolvedAt'),
       attemptCount: numberAt(record, 'attemptCount'),
       lastAttemptAt: nullableStringAt(record, 'lastAttemptAt'),
       lastOutcome: nullableStringAt(record, 'lastOutcome'),
       assisted: booleanAt(record, 'assisted'),
       solutionSeen: booleanAt(record, 'solutionSeen'),
       hintsRevealed: nullableNumberAt(record, 'hintsRevealed'),
       predictionAnswered: booleanAt(record, 'predictionAnswered'),
       predictionCorrect: booleanAt(record, 'predictionCorrect'),
       confidence: confidenceOf(record),
       reviewDueAt: nullableStringAt(record, 'reviewDueAt'),
     };
   }

   function checkpointOf(value: unknown): CheckpointProgress {
     const record = recordAt(value, 'checkpoints');
     return {
       worldId: stringAt(record, 'worldId'),
       answered: booleanAt(record, 'answered'),
       passed: booleanAt(record, 'passed'),
       passedAt: nullableStringAt(record, 'passedAt'),
     };
   }

   function workshopProgressOf(value: unknown): WorkshopProgress {
     const record = recordAt(value, 'workshops');
     return {
       workshopId: stringAt(record, 'workshopId'),
       language: stringAt(record, 'language'),
       codeSealed: booleanAt(record, 'codeSealed'),
       predictionAnswered: booleanAt(record, 'predictionAnswered'),
       predictionCorrect: booleanAt(record, 'predictionCorrect'),
       stepsMarked: numberAt(record, 'stepsMarked'),
       objectivesObserved: numberAt(record, 'objectivesObserved'),
     };
   }

   function studentDetailOf(data: JsonRecord): StudentDetail {
     const account = parseAdminUser(data.account);
     if (account === null) throw new UnexpectedShape('account');
     const progress = childAt(data, 'progress');
     const attempts = childAt(data, 'attempts');
     const quota = childAt(data, 'quota');
     const limits = childAt(quota, 'limits');
     const campaign = childAt(data, 'campaign');
     const route = childAt(data, 'route');
     return {
       account,
       progress: {
         epoch: numberAt(progress, 'epoch'),
         resetAt: nullableStringAt(progress, 'resetAt'),
         lastActivityAt: nullableStringAt(progress, 'lastActivityAt'),
       },
       imports: listAt(data, 'imports', importOf),
       solvedByCatalog: listAt(data, 'solvedByCatalog', solvedByCatalogOf),
       attempts: {
         inPeriod: breakdownOf(childAt(attempts, 'inPeriod')),
         total: breakdownOf(childAt(attempts, 'total')),
       },
       activity: listAt(data, 'activity', activityOf),
       quota: {
         active: numberAt(quota, 'active'),
         lastMinute: numberAt(quota, 'lastMinute'),
         lastDay: numberAt(quota, 'lastDay'),
         sandboxMs: numberAt(quota, 'sandboxMs'),
         limits: {
           active: numberAt(limits, 'active'),
           perMinute: numberAt(limits, 'perMinute'),
           perDay: numberAt(limits, 'perDay'),
           sandboxMinutes: numberAt(limits, 'sandboxMinutes'),
         },
       },
       exercises: listAt(data, 'exercises', exerciseRowOf),
       campaign: {
         checkpoints: listAt(campaign, 'checkpoints', checkpointOf),
         sealedExercises: numberAt(campaign, 'sealedExercises'),
       },
       workshops: listAt(data, 'workshops', workshopProgressOf),
       route: {
         steps: numberAt(route, 'steps'),
         milestones: numberAt(route, 'milestones'),
         favorites: numberAt(route, 'favorites'),
         quizAnswered: numberAt(route, 'quizAnswered'),
       },
     };
   }

   export function parseStudentRow(value: unknown): StudentRow | null {
     return readOrNull(() => studentRowOf(value));
   }

   export function parseStudentDetail(body: unknown): Stats<StudentDetail> | null {
     return readOrNull(() => statsOf(body, studentDetailOf));
   }
   ```

   Los imports nuevos se juntan con los de arriba; `UnexpectedShape` se suma al import de `./json-reader`.

2. **`account-usage.ts`:**

   ```ts
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import type { BarChart } from './bar-chart';
   import { peakSentence } from './overview-series';
   import { NO_DATA, countNoun, intervalLabel } from './usage-format';
   import type {
     ActivityPoint,
     ExerciseProgressRow,
     Granularity,
     QuotaUse,
     StudentProgress,
   } from './usage-types';

   export type GridFilter = 'all' | 'unsolved';

   export interface QuotaRow {
     readonly label: string;
     readonly used: number;
     readonly limit: number;
   }

   const MINUTE_MS = 60_000;

   export function resetSentence(progress: StudentProgress): string {
     const resets = progress.epoch - 1;
     if (resets < 1) return 'Nunca hizo «Borrar todo».';
     const times = countNoun(resets, 'vez', 'veces');
     if (progress.resetAt === null) return `Hizo «Borrar todo» ${times}.`;
     return `Hizo «Borrar todo» ${times}; la última, el ${formatLocalDateTime(progress.resetAt)}.`;
   }

   export function predictionText(answered: boolean, correct: boolean): string {
     if (!answered) return 'No respondió';
     return correct ? 'Respondió y acertó' : 'Respondió y no acertó';
   }

   export function visibleRows(
     rows: readonly ExerciseProgressRow[],
     filter: GridFilter,
   ): ExerciseProgressRow[] {
     if (filter === 'all') return [...rows];
     return rows.filter((row) => row.state !== 'solved');
   }

   export function quotaRows(quota: QuotaUse): QuotaRow[] {
     return [
       { label: 'Ejecuciones activas', used: quota.active, limit: quota.limits.active },
       { label: 'Aceptadas en el último minuto', used: quota.lastMinute, limit: quota.limits.perMinute },
       { label: 'Aceptadas en las últimas 24 horas', used: quota.lastDay, limit: quota.limits.perDay },
       {
         label: 'Minutos de sandbox',
         used: Math.round((quota.sandboxMs / MINUTE_MS) * 10) / 10,
         limit: quota.limits.sandboxMinutes,
       },
     ];
   }

   export function activityChart(
     activity: readonly ActivityPoint[],
     granularity: Granularity,
   ): BarChart {
     return {
       title: 'Actividad',
       labels: activity.map((point) => intervalLabel(point.start, granularity)),
       series: [{ label: 'Intentos', token: 'accent', values: activity.map((point) => point.attempts) }],
       stacked: false,
     };
   }

   export function activitySummary(
     activity: readonly ActivityPoint[],
     granularity: Granularity,
   ): string {
     const values = activity.map((point) => point.attempts);
     const peak = peakSentence(
       activity.map((point) => point.start),
       values,
       granularity,
     );
     if (peak === null) return 'En el período no hubo intentos.';
     const total = values.reduce((sum, value) => sum + value, 0);
     return `En el período hubo ${countNoun(total, 'intento', 'intentos')}; ${peak}.`;
   }

   export function helpText(row: ExerciseProgressRow): string {
     const parts = [
       row.assisted ? 'Asistido' : '',
       row.solutionSeen ? 'Vio la solución' : '',
       row.hintsRevealed === null || row.hintsRevealed === 0
         ? ''
         : countNoun(row.hintsRevealed, 'pista', 'pistas'),
     ].filter((part) => part !== '');
     return parts.length === 0 ? NO_DATA : parts.join(' · ');
   }

   export function solvedText(row: ExerciseProgressRow): string {
     if (row.solvedAt === null) return NO_DATA;
     const where = row.serverSolvedAt === null ? 'importado' : 'en el servidor';
     return `${formatLocalDateTime(row.solvedAt)} · ${where}`;
   }
   ```

3. **`usage-labels.ts`,** al final, los textos de F14b (spec y research-f14b, R7):

   ```ts
   export const STUDENT_SORT_OPTIONS: readonly {
     readonly value: StudentSort;
     readonly label: string;
   }[] = [
     { value: 'name', label: 'Nombre' },
     { value: 'lastActivity', label: 'Última actividad, la más vieja primero' },
     { value: '-lastActivity', label: 'Última actividad, la más reciente primero' },
     { value: '-createdAt', label: 'Alta, la más nueva primero' },
   ];
   export const EXERCISE_STATE_LABELS: Readonly<Record<ExerciseState, string>> = {
     solved: 'Resuelto',
     attempted: 'Intentado',
     started: 'Empezado',
   };
   export const GRID_FILTERS: readonly { readonly value: GridFilter; readonly label: string }[] = [
     { value: 'all', label: 'Todos' },
     { value: 'unsolved', label: 'Sin resolver' },
   ];
   export const REGISTERED_NOTICE =
     'Esta consulta queda registrada: el taller anota qué admin miró el uso de cada cuenta.';
   export const ACCOUNT_USAGE_GONE = 'Esa cuenta ya no existe o se está borrando.';
   export const NEVER = 'Nunca';

   const OUTCOME_CODE_LABELS = new Map<string, string>(Object.entries(RUN_STATUS_LABELS));

   export function outcomeLabel(outcome: string): string {
     return OUTCOME_CODE_LABELS.get(outcome) ?? outcome;
   }
   ```

   Los imports suman `GridFilter` de `./account-usage` (como `import type`) y `ExerciseState` y `StudentSort` de `./usage-types`.

4. **`usage-endpoints.ts`,** al final. El orden por omisión (`name`) no viaja (research-f14b, R6):

   ```ts
   import { parsePage } from '../model/parse-admin';
   import { parseStudentDetail, parseStudentRow } from '../model/parse-usage';
   import type { ListPage } from '../model/types';
   import type { StudentDetail, StudentQuery, StudentRow } from '../model/usage-types';

   const STUDENTS_PER_PAGE = '25';

   export async function listStudents(
     client: ApiClient,
     query: StudentQuery,
     signal: AbortSignal,
   ): Promise<AdminOutcome<ListPage<StudentRow>>> {
     const path = withQuery('/api/admin/stats/students', {
       page: String(query.page),
       perPage: STUDENTS_PER_PAGE,
       q: query.q.trim(),
       inactiveSince: query.inactiveSince,
       sort: query.sort === 'name' ? '' : query.sort,
     });
     return decode(await client.get(path, { signal }), (body) => parsePage(body, parseStudentRow));
   }

   export async function getStudentDetail(
     client: ApiClient,
     userId: number,
     period: PeriodRequest | null,
     signal: AbortSignal,
   ): Promise<AdminOutcome<Stats<StudentDetail>>> {
     const path = withQuery(`/api/admin/stats/students/${userId}`, periodParams(period));
     return decode(await client.get(path, { signal }), parseStudentDetail);
   }

   export async function listAccountRuns(
     client: ApiClient,
     userId: number,
     cursor: string | null,
     signal: AbortSignal,
   ): Promise<AdminOutcome<RunsPage>> {
     const path = withQuery('/api/admin/runs', { user: String(userId), cursor: cursor ?? '' });
     return decode(await client.get(path, { signal }), parseRunsPage);
   }
   ```

   Los imports nuevos se juntan con los de F14a en el mismo bloque.

5. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde (también las de F12a y F14a), y después `npm run typecheck` y `npm run lint` (`studentDetailOf` sin ramas salvo la cuenta; `helpText` por debajo de 10).
6. **Commit:** `feat(front): la lectura, las reglas y los pedidos del uso de una cuenta`.

**La compuerta de U1 (K):** la de T011 de F14a. El PR: `feat(front): per-account usage model and requests (F14b U1)`, contra `f14b/base`.

## 2. U2 · El uso de una cuenta y «Alumnos» (onda 2: D y después S)

**Cubre:** las historias 3 y 4 en los componentes; FR-025 a FR-027 y FR-029 a FR-037.

**Reglas de las specs** (las de U3 de F14a): `PeriodProvider`, `renderWithFetch` de F12a con el `fetch` de `routeFetch`, `lib/plot` reemplazado con `vi.hoisted` y `vi.mock`, y `signInAs()` en `beforeEach`.

### Tarea 2.1 · El uso de una cuenta, en rojo (T032, D, desde S1)

**Archivos:** los stubs de `ui/AccountUsage.tsx`, `ui/AccountUsageReport.tsx`, `ui/ExerciseGrid.tsx` y `ui/AccountRuns.tsx`, y `ui/account-usage.spec.tsx`, en `frontend/src/pages/admin/`. D va primero, porque S usa `AccountUsage`.

**Consume:** de U1, el modelo y la API; de F14a, las piezas, los hooks y `RunsList`. **Produce:** `AccountUsage` (`{ ownId, userId, name, backLabel, onBack(stale) }`), que usan S y P.

1. **`ui/account-usage.spec.tsx`.** Cubre la historia 4 (escenarios 2 a 4, 6 y 7), FR-030 a FR-037, SC-002 en el detalle y SC-004:

   ```tsx
   import { fireEvent, screen, within } from '@testing-library/react';
   import { beforeEach, describe, expect, it, vi } from 'vitest';
   import type { BarChart } from '../model/bar-chart';
   import {
     exerciseRowFactory,
     runFactory,
     runsBody,
     statsBody,
     studentDetailFactory,
   } from '../model/usage.factory';
   import AccountUsage from './AccountUsage';
   import { PeriodProvider } from './period-context';
   import { OLGA, renderWithFetch, signInAs } from './render-admin';
   import { routeFetch, type RoutedReply } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const DETAIL = '/api/admin/stats/students/12';
   const RUNS = '/api/admin/runs';
   const NO_OUTCOMES = { passed: 0, failed: 0, compileError: 0, runtimeError: 0, timeout: 0 };
   const BODY = statsBody(
     studentDetailFactory.build({
       progress: { epoch: 3, resetAt: '2026-10-03T15:00:00.000Z', lastActivityAt: '2026-10-06T13:00:00.000Z' },
       imports: [{ importedAt: '2026-10-02T12:00:00.000Z', source: 'storage', epoch: 1 }],
       solvedByCatalog: [{ catalog: 'lab', language: 'rust', server: 3, imported: 1 }],
       attempts: {
         inPeriod: { attempts: { ...NO_OUTCOMES, passed: 1, failed: 2 }, operations: { infraError: 0, canceled: 0 }, importedAttempts: 0 },
         total: { attempts: { ...NO_OUTCOMES, passed: 4, failed: 3 }, operations: { infraError: 1, canceled: 0 }, importedAttempts: 2 },
       },
       activity: [
         { start: '2026-10-01', attempts: 2 },
         { start: '2026-10-02', attempts: 1 },
       ],
       quota: { active: 0, lastMinute: 1, lastDay: 4, sandboxMs: 90000 },
       exercises: [
         exerciseRowFactory.build({ exerciseId: 'rust-01', state: 'solved', solvedAt: '2026-10-03T15:00:00.000Z', serverSolvedAt: '2026-10-03T15:00:00.000Z', attemptCount: 2 }),
         exerciseRowFactory.build({ exerciseId: 'rust-02', state: 'attempted', attemptCount: 3, predictionAnswered: true, predictionCorrect: false, lastOutcome: 'compile_error', lastAttemptAt: '2026-10-06T13:00:00.000Z' }),
       ],
       campaign: { checkpoints: [{ worldId: 'rust-world-1', answered: true, passed: true, passedAt: '2026-10-04T12:00:00.000Z' }], sealedExercises: 2 },
       workshops: [{ workshopId: 'cache', language: 'rust', codeSealed: true, predictionAnswered: true, predictionCorrect: false, stepsMarked: 2, objectivesObserved: 1 }],
       route: { steps: 3, milestones: 1, favorites: 2, quizAnswered: 4 },
     }),
   );

   function renderUsage(detail: readonly RoutedReply[], runs: readonly RoutedReply[] = []) {
     const onBack = vi.fn();
     const routed = routeFetch({ [DETAIL]: detail, [RUNS]: runs });
     const user = renderWithFetch(
       <PeriodProvider>
         <AccountUsage ownId={OLGA.id} userId={12} name="Ana Pérez" backLabel="Volver a Alumnos" onBack={onBack} />
       </PeriodProvider>,
       routed.fetch,
     );
     return { user, routed, onBack };
   }

   function figure(label: string): HTMLElement {
     const item = screen.getByText(label, { selector: 'dt' }).closest('div');
     if (item === null) throw new Error(`no figure for ${label}`);
     return item;
   }

   beforeEach(() => {
     signInAs();
     plot.drawBarChart.mockReset();
     plot.drawBarChart.mockReturnValue(() => undefined);
   });

   describe('the usage of an account', () => {
     it('asks once for its detail, focuses its title and says the query is logged', async () => {
       const { routed } = renderUsage([{ status: 200, json: BODY }]);
       expect(screen.getByRole('heading', { name: 'Uso de Ana Pérez' })).toHaveFocus();
       expect(
         screen.getByText('Esta consulta queda registrada: el taller anota qué admin miró el uso de cada cuenta.'),
       ).toBeInTheDocument();
       await screen.findByRole('heading', { name: 'Progreso' });
       expect(routed.callsTo(DETAIL)).toHaveLength(1);
       expect(routed.calls.map((call) => call.path)).toEqual([DETAIL]);
     });

     it('shows the account, its progress, its imports, its solved split, its attempts, its quota and its activity', async () => {
       renderUsage([{ status: 200, json: BODY }]);
       await screen.findByRole('heading', { name: 'Progreso' });
       expect(figure('Email')).toHaveTextContent('ana@x.com');
       expect(figure('Rol')).toHaveTextContent('Alumno');
       expect(screen.getByText(/^Hizo «Borrar todo» 2 veces; la última, el /)).toBeInTheDocument();
       const imports = screen.getByRole('table', { name: 'Importaciones' });
       expect(within(imports).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['storage', '1']);
       const solved = screen.getByRole('table', { name: 'Resueltos por catálogo' });
       expect(within(solved).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['3', '1']);
       const attempts = screen.getByRole('table', { name: 'Intentos' });
       const failed = within(attempts).getByRole('row', { name: /No pasó las pruebas/ });
       expect(within(failed).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['2', '3']);
       expect(screen.getByRole('meter', { name: 'Minutos de sandbox: 1,5 de 30' })).toBeInTheDocument();
       expect(screen.getByRole('meter', { name: 'Aceptadas en las últimas 24 horas: 4 de 300' })).toBeInTheDocument();
       expect(plot.drawBarChart.mock.calls.map(([, , chart]) => chart.title)).toEqual(['Actividad']);
       expect(screen.getByText('En el período hubo 3 intentos; el día con más fue el 1/10, con 2.')).toBeInTheDocument();
       expect(figure('Preguntas respondidas')).toHaveTextContent('4');
     });

     it('shows flags but no option nor spread, and filters the unsolved exercises in the client', async () => {
       const { user, routed } = renderUsage([{ status: 200, json: BODY }]);
       const grid = await screen.findByRole('table', { name: 'Ejercicios' });
       const attempted = within(grid).getByRole('row', { name: /rust-02/ });
       expect(attempted).toHaveTextContent('Respondió y no acertó');
       expect(attempted).toHaveTextContent('No compiló');
       const campaign = screen.getByRole('table', { name: 'Campaña' });
       expect(campaign).toHaveTextContent('Respondió y acertó');
       expect(screen.queryAllByRole('list', { name: /^Opciones/ })).toEqual([]);
       expect(screen.queryByText(/Opción \d/)).toBeNull();
       await user.selectOptions(screen.getByLabelText('Mostrar'), 'unsolved');
       expect(within(grid).queryByRole('row', { name: /rust-01/ })).toBeNull();
       expect(within(grid).getByRole('row', { name: /rust-02/ })).toBeInTheDocument();
       expect(routed.callsTo(DETAIL)).toHaveLength(1);
     });

     it('asks exactly once more when another period is applied', async () => {
       const { user, routed } = renderUsage([{ status: 200, json: BODY }]);
       await screen.findByRole('heading', { name: 'Progreso' });
       fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-05' } });
       await user.click(screen.getByRole('button', { name: 'Aplicar' }));
       await vi.waitFor(() => expect(routed.callsTo(DETAIL)).toHaveLength(2));
       expect(routed.callsTo(DETAIL)[1]?.query).toEqual({ from: '2026-10-01', to: '2026-10-05', granularity: 'day' });
     });

     it('shows its runs inside the detail only when asked', async () => {
       const { user, routed } = renderUsage(
         [{ status: 200, json: BODY }],
         [{ status: 200, json: runsBody([runFactory.build({ account: { id: 12, name: 'Ana Pérez' } })]) }],
       );
       await screen.findByRole('heading', { name: 'Progreso' });
       expect(routed.callsTo(RUNS)).toHaveLength(0);
       await user.click(screen.getByRole('button', { name: 'Ver sus ejecuciones' }));
       expect(await screen.findByRole('table', { name: 'Sus ejecuciones de los últimos 14 días' })).toBeInTheDocument();
       expect(routed.callsTo(RUNS)).toHaveLength(1);
       expect(routed.callsTo(RUNS)[0]?.query).toEqual({ user: '12' });
       expect(screen.getByRole('heading', { name: 'Uso de Ana Pérez' })).toBeInTheDocument();
     });

     it('explains an account that is being deleted and goes back asking for the list again', async () => {
       const { user, onBack } = renderUsage([
         { status: 404, json: { message: 'No existe lo que pedís.', code: 'not_found' } },
       ]);
       expect(await screen.findByText('Esa cuenta ya no existe o se está borrando.')).toBeInTheDocument();
       expect(screen.queryByRole('form', { name: 'Período' })).toBeNull();
       await user.click(screen.getByRole('button', { name: 'Volver' }));
       expect(onBack).toHaveBeenCalledWith(true);
     });

     it('goes back to its list without asking it again', async () => {
       const { user, onBack } = renderUsage([{ status: 200, json: BODY }]);
       await user.click(screen.getByRole('button', { name: 'Volver a Alumnos' }));
       expect(onBack).toHaveBeenCalledWith(false);
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/account-usage.spec.tsx`: en rojo, por `not implemented`.
3. **Commit:** `test(front): specs del uso de una cuenta, en rojo`.

### Tarea 2.2 · El uso de una cuenta (T033, D)

**Archivos:** `ui/AccountUsage.tsx`, `ui/AccountUsageReport.tsx`, `ui/ExerciseGrid.tsx`, `ui/AccountRuns.tsx`, `ui/RunsList.tsx` (una prop opcional) y `model/stats-failure.ts` (`isNotFound`), en `frontend/src/pages/admin/`.

1. **`model/stats-failure.ts`,** al final:

   ```ts
   const NOT_FOUND = 404;

   export function isNotFound(failure: ApiFailure): boolean {
     return failure.kind === 'response' && failure.status === NOT_FOUND;
   }
   ```

2. **`ui/RunsList.tsx`,** un texto vacío opcional, para una cuenta sin ejecuciones. Lo de F14a no cambia:

   ```diff
    interface RunsListProps {
      readonly runs: RunsPages;
      readonly title: string;
      readonly lead: string;
   +  readonly emptyText?: string;
    }
   @@
   -const RunsList = ({ runs, title, lead }: RunsListProps) => {
   +const RunsList = ({
   +  runs,
   +  title,
   +  lead,
   +  emptyText = 'No hay ejecuciones con esos filtros.',
   +}: RunsListProps) => {
   @@
                {page.runs.length === 0 ? (
   -              <p>No hay ejecuciones con esos filtros.</p>
   +              <p>{emptyText}</p>
                ) : (
   ```

3. **`ui/AccountRuns.tsx`** (FR-037). Se monta sólo con «Ver sus ejecuciones»:

   ```tsx
   import { useCallback } from 'react';
   import { useApiClient } from '../../../shared/api/http';
   import { listAccountRuns } from '../api/usage-endpoints';
   import useRunsPages from '../lib/use-runs-pages';
   import RunsList from './RunsList';

   interface AccountRunsProps {
     readonly ownId: number;
     readonly userId: number;
   }

   const AccountRuns = ({ ownId, userId }: AccountRunsProps) => {
     const client = useApiClient();
     const load = useCallback(
       (cursor: string | null, signal: AbortSignal) => listAccountRuns(client, userId, cursor, signal),
       [client, userId],
     );
     const runs = useRunsPages(load, ownId);
     return (
       <RunsList
         runs={runs}
         title="Sus ejecuciones de los últimos 14 días"
         lead="No pudimos cargar sus ejecuciones."
         emptyText="No tiene ejecuciones en los últimos 14 días."
       />
     );
   };

   export default AccountRuns;
   ```

4. **`ui/ExerciseGrid.tsx`** (FR-034). El filtro es local y no pide nada:

   ```tsx
   import { useState } from 'react';
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import { helpText, predictionText, solvedText, visibleRows, type GridFilter } from '../model/account-usage';
   import type { ContentTitles } from '../model/content-titles';
   import { NO_DATA, formatCount } from '../model/usage-format';
   import { CONFIDENCE_LABELS, EXERCISE_STATE_LABELS, GRID_FILTERS, outcomeLabel } from '../model/usage-labels';
   import type { ExerciseProgressRow } from '../model/usage-types';
   import { useContentTitles } from './content-titles-context';
   import FilterSelect from './FilterSelect';
   import StatsTable, { type StatsColumn } from './StatsTable';

   interface ExerciseGridProps {
     readonly rows: readonly ExerciseProgressRow[];
     readonly busy: boolean;
   }

   function instant(value: string | null): string {
     return value === null ? NO_DATA : formatLocalDateTime(value);
   }

   function lastAttempt(row: ExerciseProgressRow): string {
     if (row.lastAttemptAt === null) return NO_DATA;
     const outcome = row.lastOutcome === null ? '' : ` · ${outcomeLabel(row.lastOutcome)}`;
     return `${formatLocalDateTime(row.lastAttemptAt)}${outcome}`;
   }

   function header(titles: ContentTitles): StatsColumn<ExerciseProgressRow> {
     return {
       header: 'Ejercicio',
       cell: (row) => {
         const title = titles.exercise(row.exerciseId);
         return title === row.exerciseId ? title : `${title} (${row.exerciseId})`;
       },
     };
   }

   const COLUMNS: readonly StatsColumn<ExerciseProgressRow>[] = [
     { header: 'Estado', cell: (row) => EXERCISE_STATE_LABELS[row.state] },
     { header: 'Resuelto', cell: solvedText },
     { header: 'Intentos', cell: (row) => formatCount(row.attemptCount) },
     { header: 'Último intento', cell: lastAttempt },
     { header: 'Ayuda', cell: helpText },
     { header: 'Predicción', cell: (row) => predictionText(row.predictionAnswered, row.predictionCorrect) },
     {
       header: 'Autoevaluación',
       cell: (row) => (row.confidence === null ? NO_DATA : CONFIDENCE_LABELS[row.confidence]),
     },
     { header: 'Próximo repaso', cell: (row) => instant(row.reviewDueAt) },
   ];

   const ExerciseGrid = ({ rows, busy }: ExerciseGridProps) => {
     const titles = useContentTitles();
     const [shown, setShown] = useState<GridFilter>('all');
     return (
       <div className="usage-block">
         <FilterSelect label="Mostrar" value={shown} options={GRID_FILTERS} onChange={setShown} />
         <StatsTable
           title="Ejercicios"
           note="Fuente: Estado actual, salvo los intentos (Historia)."
           rows={visibleRows(rows, shown)}
           rowKey={(row) => row.exerciseId}
           rowHeader={header(titles)}
           columns={COLUMNS}
           busy={busy}
         />
       </div>
     );
   };

   export default ExerciseGrid;
   ```

5. **`ui/AccountUsageReport.tsx`** (FR-031 a FR-035). Sólo banderas y conteos; ningún componente de opciones (research-f14b, R4):

   ```tsx
   import { useMemo } from 'react';
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import { activityChart, activitySummary, predictionText, quotaRows, resetSentence } from '../model/account-usage';
   import { ROLE_LABELS, STATUS_LABELS } from '../model/labels';
   import { periodSentence } from '../model/period';
   import { formatCount, intervalHeading } from '../model/usage-format';
   import {
     GRANULARITY_NOUNS,
     IMPORTED_LABEL,
     NEVER,
     OPERATION_LABELS,
     OUTCOME_KEYS,
     OUTCOME_LABELS,
     languageLabel,
   } from '../model/usage-labels';
   import type { AttemptBreakdown, Stats, StudentDetail } from '../model/usage-types';
   import { useContentTitles } from './content-titles-context';
   import ExerciseGrid from './ExerciseGrid';
   import Figures from './Figures';
   import SeriesChart from './SeriesChart';
   import StatsTable from './StatsTable';

   interface AccountUsageReportProps {
     readonly stats: Stats<StudentDetail>;
     readonly busy: boolean;
   }

   interface AttemptLine {
     readonly label: string;
     count(breakdown: AttemptBreakdown): number;
   }

   const ATTEMPT_LINES: readonly AttemptLine[] = [
     ...OUTCOME_KEYS.map((key): AttemptLine => ({ label: OUTCOME_LABELS[key], count: (breakdown) => breakdown.attempts[key] })),
     { label: OPERATION_LABELS.infraError, count: (breakdown) => breakdown.operations.infraError },
     { label: OPERATION_LABELS.canceled, count: (breakdown) => breakdown.operations.canceled },
     { label: IMPORTED_LABEL, count: (breakdown) => breakdown.importedAttempts },
   ];

   function yesNo(value: boolean): string {
     return value ? 'Sí' : 'No';
   }

   const AccountUsageReport = ({ stats, busy }: AccountUsageReportProps) => {
     const titles = useContentTitles();
     const { data, period } = stats;
     const { account, progress, attempts } = data;
     const chart = useMemo(() => activityChart(data.activity, period.granularity), [data.activity, period.granularity]);
     return (
       <div className="usage-report" aria-busy={busy}>
         <p className="usage-note">{periodSentence(period, true)}</p>
         <Figures
           title="Cuenta"
           items={[
             { label: 'Nombre', value: account.name },
             { label: 'Email', value: account.email },
             { label: 'Rol', value: ROLE_LABELS[account.role] },
             { label: 'Estado', value: STATUS_LABELS[account.status] },
           ]}
         />
         <Figures
           title="Progreso"
           items={[
             {
               label: 'Última actividad',
               value: progress.lastActivityAt === null ? NEVER : formatLocalDateTime(progress.lastActivityAt),
             },
           ]}
         />
         <p>{resetSentence(progress)}</p>
         <StatsTable
           title="Importaciones"
           rows={data.imports}
           rowKey={(entry) => `${entry.importedAt}-${entry.epoch}`}
           rowHeader={{ header: 'Fecha', cell: (entry) => formatLocalDateTime(entry.importedAt) }}
           columns={[
             { header: 'Origen', cell: (entry) => entry.source },
             { header: 'Época', cell: (entry) => formatCount(entry.epoch) },
           ]}
         />
         <StatsTable
           title="Resueltos por catálogo"
           note="Fuente: Estado actual."
           rows={data.solvedByCatalog}
           rowKey={(row) => `${row.catalog}-${row.language}`}
           rowHeader={{ header: 'Catálogo', cell: (row) => `${row.catalog} · ${languageLabel(row.language)}` }}
           columns={[
             { header: 'En el servidor', cell: (row) => formatCount(row.server) },
             { header: 'Importados', cell: (row) => formatCount(row.imported) },
           ]}
         />
         <StatsTable
           title="Intentos"
           note="Fuente: Historia."
           rows={ATTEMPT_LINES}
           rowKey={(line) => line.label}
           rowHeader={{ header: 'Resultado', cell: (line) => line.label }}
           columns={[
             { header: 'En el período', cell: (line) => formatCount(line.count(attempts.inPeriod)) },
             { header: 'En total', cell: (line) => formatCount(line.count(attempts.total)) },
           ]}
         />
         <SeriesChart chart={chart} summary={activitySummary(data.activity, period.granularity)} />
         <StatsTable
           title={`La actividad, por ${GRANULARITY_NOUNS[period.granularity]}`}
           rows={data.activity}
           rowKey={(point) => point.start}
           rowHeader={{ header: 'Intervalo', cell: (point) => intervalHeading(point.start, period.granularity) }}
           columns={[{ header: 'Intentos', cell: (point) => formatCount(point.attempts) }]}
         />
         <div className="usage-block">
           <h4>Cuotas de las últimas 24 horas</h4>
           <ul className="usage-quotas">
             {quotaRows(data.quota).map((row) => {
               const text = `${formatCount(row.used)} de ${formatCount(row.limit)}`;
               return (
                 <li key={row.label}>
                   <span>{`${row.label}: ${text}`}</span>
                   <meter min={0} max={row.limit} value={row.used} aria-label={`${row.label}: ${text}`} />
                 </li>
               );
             })}
           </ul>
         </div>
         <ExerciseGrid rows={data.exercises} busy={busy} />
         <StatsTable
           title="Campaña"
           rows={data.campaign.checkpoints}
           rowKey={(row) => row.worldId}
           rowHeader={{ header: 'Mundo', cell: (row) => titles.world(row.worldId) }}
           columns={[
             { header: 'Checkpoint', cell: (row) => predictionText(row.answered, row.passed) },
             { header: 'Aprobado el', cell: (row) => (row.passedAt === null ? '—' : formatLocalDateTime(row.passedAt)) },
           ]}
         />
         <Figures title="Sellos" items={[{ label: 'Ejercicios sellados', value: formatCount(data.campaign.sealedExercises) }]} />
         <StatsTable
           title="Talleres de Sistemas"
           rows={data.workshops}
           rowKey={(row) => `${row.workshopId}-${row.language}`}
           rowHeader={{ header: 'Taller', cell: (row) => titles.workshop(row.workshopId) }}
           columns={[
             { header: 'Lenguaje', cell: (row) => languageLabel(row.language) },
             { header: 'Código sellado', cell: (row) => yesNo(row.codeSealed) },
             { header: 'Predicción', cell: (row) => predictionText(row.predictionAnswered, row.predictionCorrect) },
             { header: 'Etapas marcadas', cell: (row) => formatCount(row.stepsMarked) },
             { header: 'Objetivos observados', cell: (row) => formatCount(row.objectivesObserved) },
           ]}
         />
         <Figures
           title="Recorrido"
           items={[
             { label: 'Pasos', value: formatCount(data.route.steps) },
             { label: 'Hitos', value: formatCount(data.route.milestones) },
             { label: 'Favoritos', value: formatCount(data.route.favorites) },
             { label: 'Preguntas respondidas', value: formatCount(data.route.quizAnswered) },
           ]}
         />
       </div>
     );
   };

   export default AccountUsageReport;
   ```

   El checkpoint usa las mismas tres frases que una predicción: «Respondió y acertó», «Respondió y no acertó» o «No respondió» (spec, «Detalle de una cuenta»). El bloque «Sellos» es un texto que agrega el plan.

6. **`ui/AccountUsage.tsx`** (FR-029, FR-030 y FR-036). Pide al montarse y con cada período; el título recibe el foco:

   ```tsx
   import { useCallback, useEffect, useRef, useState } from 'react';
   import { useApiClient } from '../../../shared/api/http';
   import { getStudentDetail } from '../api/usage-endpoints';
   import useStatsRequest from '../lib/use-stats-request';
   import { isNotFound } from '../model/stats-failure';
   import { ACCOUNT_USAGE_GONE, REGISTERED_NOTICE } from '../model/usage-labels';
   import AccountRuns from './AccountRuns';
   import AccountUsageReport from './AccountUsageReport';
   import PeriodForm from './PeriodForm';
   import { usePeriod } from './period-context';
   import RequestState from './RequestState';

   interface AccountUsageProps {
     readonly ownId: number;
     readonly userId: number;
     readonly name: string;
     readonly backLabel: string;
     onBack(stale: boolean): void;
   }

   const AccountUsage = ({ ownId, userId, name, backLabel, onBack }: AccountUsageProps) => {
     const client = useApiClient();
     const { period } = usePeriod();
     const title = useRef<HTMLHeadingElement>(null);
     const [showRuns, setShowRuns] = useState(false);
     const load = useCallback(
       (signal: AbortSignal) => getStudentDetail(client, userId, period, signal),
       [client, userId, period],
     );
     const request = useStatsRequest(load, ownId);
     const gone = request.failure !== null && isNotFound(request.failure);

     useEffect(() => {
       title.current?.focus();
     }, []);

     return (
       <div className="usage-view">
         <button type="button" className="button secondary" onClick={() => onBack(false)}>
           {backLabel}
         </button>
         <h3 ref={title} tabIndex={-1}>{`Uso de ${name}`}</h3>
         <p className="usage-note">{REGISTERED_NOTICE}</p>
         {gone ? (
           <div className="admin-empty" role="alert">
             <p>{ACCOUNT_USAGE_GONE}</p>
             <button type="button" className="button secondary" onClick={() => onBack(true)}>
               Volver
             </button>
           </div>
         ) : (
           <>
             <PeriodForm shown={request.data?.period ?? null} withGranularity failure={request.failure} />
             <RequestState
               request={request}
               lead="No pudimos cargar el uso de esta cuenta."
               loadingText="Cargando el uso…"
             />
             {request.data === null ? null : (
               <AccountUsageReport stats={request.data} busy={request.loading} />
             )}
             {showRuns ? (
               <AccountRuns ownId={ownId} userId={userId} />
             ) : (
               <button type="button" className="button secondary" onClick={() => setShowRuns(true)}>
                 Ver sus ejecuciones
               </button>
             )}
           </>
         )}
       </div>
     );
   };

   export default AccountUsage;
   ```

7. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/account-usage.spec.tsx frontend/src/pages/admin/ui/runs-view.spec.tsx`, en verde (la de F14a también), y después `npm run typecheck` y `npm run lint`.
8. **Commit:** `feat(front): el uso de una cuenta, con su grilla, sus cuotas, su actividad y sus ejecuciones`.

### Tarea 2.3 · «Alumnos», en rojo (T034, S, desde T033)

**Archivos:** el stub de `ui/StudentsView.tsx` y `ui/students-view.spec.tsx`.

**Consume:** de U1, `listStudents`; de F12a, `usePagedList`, `ListView`, `FilterSelect`, `TextField` y `messagesOf`; de T033, `AccountUsage`. **Produce:** `StudentsView` (`{ ownId }`).

1. **`ui/students-view.spec.tsx`.** Cubre la historia 3, FR-025 a FR-027 y FR-039 en la lista:

   ```tsx
   import { fireEvent, screen, within } from '@testing-library/react';
   import { beforeEach, describe, expect, it, vi } from 'vitest';
   import { pageBody } from '../model/admin.factory';
   import type { BarChart } from '../model/bar-chart';
   import { statsBody, studentDetailFactory, studentRowFactory } from '../model/usage.factory';
   import { PeriodProvider } from './period-context';
   import { OLGA, renderWithFetch, signInAs } from './render-admin';
   import StudentsView from './StudentsView';
   import { routeFetch, type RoutedReply } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const STUDENTS = '/api/admin/stats/students';
   const DETAIL = '/api/admin/stats/students/12';
   const ANA = studentRowFactory.build({
     id: 12,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     lastActivityAt: '2026-10-06T13:00:00.000Z',
     solved: { server: 3, imported: 1 },
     attempts: { lastWeek: 2, lastMonth: 7 },
   });
   const DANI = studentRowFactory.build({ id: 16, name: 'Dani Paz', email: 'dani@x.com' });

   function renderStudents(students: readonly RoutedReply[]) {
     const routed = routeFetch({
       [STUDENTS]: students,
       [DETAIL]: [{ status: 200, json: statsBody(studentDetailFactory.build()) }],
     });
     const user = renderWithFetch(
       <PeriodProvider>
         <StudentsView ownId={OLGA.id} />
       </PeriodProvider>,
       routed.fetch,
     );
     return { user, routed };
   }

   beforeEach(() => {
     signInAs();
     plot.drawBarChart.mockReset();
     plot.drawBarChart.mockReturnValue(() => undefined);
   });

   describe('«Alumnos»', () => {
     it('lists 25 students at a time, with «Nunca» for whoever never practiced and the solved split', async () => {
       const { routed } = renderStudents([{ status: 200, json: pageBody([ANA, DANI]) }]);
       const table = await screen.findByRole('table', { name: 'Alumnos' });
       expect(routed.callsTo(STUDENTS)[0]?.query).toEqual({ page: '1', perPage: '25' });
       expect(within(table).getByRole('row', { name: /Dani Paz/ })).toHaveTextContent('Nunca');
       expect(within(table).getByRole('row', { name: /Ana Pérez/ })).toHaveTextContent(
         '3 en el servidor · 1 importados',
       );
     });

     it('asks nothing while typing and asks once when the search is sent', async () => {
       const { user, routed } = renderStudents([{ status: 200, json: pageBody([ANA]) }]);
       await screen.findByRole('table', { name: 'Alumnos' });
       await user.type(screen.getByLabelText('Buscar por nombre o email'), 'ana');
       expect(routed.callsTo(STUDENTS)).toHaveLength(1);
       await user.click(screen.getByRole('button', { name: 'Buscar' }));
       await vi.waitFor(() => expect(routed.callsTo(STUDENTS)).toHaveLength(2));
       expect(routed.callsTo(STUDENTS)[1]?.query).toEqual({ page: '1', perPage: '25', q: 'ana' });
     });

     it('filters by inactivity and orders by the oldest activity, from the first page', async () => {
       const { user, routed } = renderStudents([{ status: 200, json: pageBody([DANI, ANA]) }]);
       await screen.findByRole('table', { name: 'Alumnos' });
       fireEvent.change(screen.getByLabelText('Sin actividad desde'), { target: { value: '2026-10-01' } });
       await vi.waitFor(() => expect(routed.callsTo(STUDENTS)).toHaveLength(2));
       await user.selectOptions(screen.getByLabelText('Ordenar por'), 'lastActivity');
       await vi.waitFor(() => expect(routed.callsTo(STUDENTS)).toHaveLength(3));
       expect(routed.callsTo(STUDENTS)[2]?.query).toEqual({
         page: '1',
         perPage: '25',
         inactiveSince: '2026-10-01',
         sort: 'lastActivity',
       });
     });

     it('offers only the orders of the API, none by a figure', async () => {
       renderStudents([{ status: 200, json: pageBody([ANA]) }]);
       await screen.findByRole('table', { name: 'Alumnos' });
       expect(
         within(screen.getByLabelText('Ordenar por')).getAllByRole('option').map((option) => option.textContent),
       ).toEqual([
         'Nombre',
         'Última actividad, la más vieja primero',
         'Última actividad, la más reciente primero',
         'Alta, la más nueva primero',
       ]);
     });

     it('opens the usage in place, asking nothing before the click, and comes back as it was', async () => {
       const { user, routed } = renderStudents([
         { status: 200, json: pageBody([DANI], 1, 2, 30) },
         { status: 200, json: pageBody([ANA], 2, 2, 30) },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
       await screen.findByText('Página 2 de 2 · 30 alumnos');
       expect(routed.callsTo(DETAIL)).toHaveLength(0);
       await user.click(screen.getByRole('button', { name: 'Ver el uso de Ana Pérez' }));
       expect(screen.getByRole('heading', { name: 'Uso de Ana Pérez' })).toHaveFocus();
       expect(screen.queryByRole('table', { name: 'Alumnos' })).toBeNull();
       expect(routed.callsTo(DETAIL)).toHaveLength(1);
       await user.click(screen.getByRole('button', { name: 'Volver a Alumnos' }));
       expect(screen.getByRole('button', { name: 'Ver el uso de Ana Pérez' })).toHaveFocus();
       expect(screen.getByText('Página 2 de 2 · 30 alumnos')).toBeInTheDocument();
       expect(routed.callsTo(STUDENTS)).toHaveLength(2);
     });

     it('says when nothing matches and clears the filters', async () => {
       const { user, routed } = renderStudents([
         { status: 200, json: pageBody([]) },
         { status: 200, json: pageBody([ANA]) },
       ]);
       expect(await screen.findByText('No hay alumnos con esa búsqueda o ese filtro.')).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Limpiar los filtros' }));
       await vi.waitFor(() => expect(routed.callsTo(STUDENTS)).toHaveLength(2));
       expect(routed.callsTo(STUDENTS)[1]?.query).toEqual({ page: '1', perPage: '25' });
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/students-view.spec.tsx`: en rojo, por `not implemented`.
3. **Commit:** `test(front): specs de la lista de alumnos, en rojo`.

### Tarea 2.4 · «Alumnos» (T035, S)

**Archivos:** `ui/StudentsView.tsx`.

1. **`ui/StudentsView.tsx`** (FR-025 a FR-027 y FR-029). La lista es la de F12a; el detalle ocupa su lugar y la lista queda montada y oculta (research-f14b, R1):

   ```tsx
   import { useCallback, useId, useRef, useState } from 'react';
   import { flushSync } from 'react-dom';
   import { useForm } from 'react-hook-form';
   import { useApiClient } from '../../../shared/api/http';
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import { TextField, messagesOf } from '../../../shared/ui/form';
   import { listStudents } from '../api/usage-endpoints';
   import usePagedList from '../lib/use-paged-list';
   import { STATUS_LABELS } from '../model/labels';
   import { NO_DATA, formatCount } from '../model/usage-format';
   import { NEVER, STUDENT_SORT_OPTIONS } from '../model/usage-labels';
   import type { StudentQuery, StudentRow } from '../model/usage-types';
   import AccountUsage from './AccountUsage';
   import FilterSelect from './FilterSelect';
   import ListView, { type ListTexts } from './ListView';
   import StatsTable, { type StatsColumn } from './StatsTable';

   interface StudentsViewProps {
     readonly ownId: number;
   }

   interface SearchValues {
     q: string;
   }

   interface OpenedAccount {
     readonly id: number;
     readonly name: string;
     readonly opener: HTMLButtonElement;
   }

   type OpenUsage = (student: StudentRow, opener: HTMLButtonElement) => void;

   const EVERY_STUDENT: StudentQuery = { page: 1, q: '', inactiveSince: '', sort: 'name' };
   const SEARCH_TOO_LONG = 'La búsqueda puede tener hasta 80 caracteres.';
   const TEXTS: ListTexts = {
     loading: 'Cargando los alumnos…',
     failed: 'No pudimos cargar los alumnos.',
     empty: 'No hay alumnos con esa búsqueda o ese filtro.',
     noun: 'alumnos',
   };

   function instant(value: string | null, empty: string): string {
     return value === null ? empty : formatLocalDateTime(value);
   }

   function studentColumns(onOpen: OpenUsage): readonly StatsColumn<StudentRow>[] {
     return [
       { header: 'Email', cell: (student) => student.email },
       { header: 'Estado', cell: (student) => STATUS_LABELS[student.status] },
       { header: 'Última actividad', cell: (student) => instant(student.lastActivityAt, NEVER) },
       {
         header: 'Resueltos',
         cell: (student) =>
           `${formatCount(student.solved.server)} en el servidor · ${formatCount(student.solved.imported)} importados`,
       },
       { header: 'Intentos (7 días)', cell: (student) => formatCount(student.attempts.lastWeek) },
       { header: 'Intentos (30 días)', cell: (student) => formatCount(student.attempts.lastMonth) },
       { header: 'Último intento', cell: (student) => instant(student.lastAttemptAt, NO_DATA) },
       {
         header: 'Uso',
         cell: (student) => (
           <button
             type="button"
             className="button secondary small"
             onClick={(event) => onOpen(student, event.currentTarget)}
           >
             {`Ver el uso de ${student.name}`}
           </button>
         ),
       },
     ];
   }

   const StudentsView = ({ ownId }: StudentsViewProps) => {
     const client = useApiClient();
     const inactiveId = useId();
     const title = useRef<HTMLHeadingElement>(null);
     const [opened, setOpened] = useState<OpenedAccount | null>(null);
     const load = useCallback(
       (query: StudentQuery, signal: AbortSignal) => listStudents(client, query, signal),
       [client],
     );
     const list = usePagedList(load, EVERY_STUDENT, ownId);
     const {
       register,
       handleSubmit,
       reset,
       formState: { errors },
     } = useForm<SearchValues>({ defaultValues: { q: '' } });

     const open: OpenUsage = (student, opener) =>
       setOpened({ id: student.id, name: student.name, opener });

     const back = (stale: boolean): void => {
       const opener = opened?.opener;
       flushSync(() => setOpened(null));
       if (stale) list.reload();
       if (opener?.isConnected === true) opener.focus();
       else title.current?.focus();
     };

     const clear = (): void => {
       reset();
       list.search(EVERY_STUDENT);
     };

     return (
       <div className="usage-view">
         <div className="usage-view" hidden={opened !== null}>
           <h3 ref={title} tabIndex={-1}>
             Alumnos
           </h3>
           <form
             className="admin-filters"
             role="search"
             noValidate
             onSubmit={handleSubmit(({ q }) => list.search({ ...list.query, q, page: 1 }))}
           >
             <TextField
               label="Buscar por nombre o email"
               autoComplete="off"
               registration={register('q', { maxLength: { value: 80, message: SEARCH_TOO_LONG } })}
               messages={messagesOf(errors.q)}
             />
             <button type="submit" className="button secondary">
               Buscar
             </button>
           </form>
           <div className="admin-filters">
             <div className="form-field">
               <label className="field-label" htmlFor={inactiveId}>
                 Sin actividad desde
               </label>
               <input
                 id={inactiveId}
                 className="form-input"
                 type="date"
                 value={list.query.inactiveSince}
                 onChange={(event) =>
                   list.search({ ...list.query, inactiveSince: event.target.value, page: 1 })
                 }
               />
             </div>
             <FilterSelect
               label="Ordenar por"
               value={list.query.sort}
               options={STUDENT_SORT_OPTIONS}
               onChange={(sort) => list.search({ ...list.query, sort, page: 1 })}
             />
           </div>
           <ListView list={list} texts={TEXTS} onClear={clear}>
             {(students) => (
               <StatsTable
                 title="Alumnos"
                 rows={students}
                 rowKey={(student) => String(student.id)}
                 rowHeader={{ header: 'Nombre', cell: (student) => student.name }}
                 columns={studentColumns(open)}
                 busy={list.loading}
               />
             )}
           </ListView>
         </div>
         {opened === null ? null : (
           <AccountUsage
             ownId={ownId}
             userId={opened.id}
             name={opened.name}
             backLabel="Volver a Alumnos"
             onBack={back}
           />
         )}
       </div>
     );
   };

   export default StudentsView;
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/students-view.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint`.
3. **Commit:** `feat(front): la lista de alumnos con su última actividad y su búsqueda`.

## 3. U3 · La columna «Uso», la lista oculta de «Cuentas» y «Alumnos» en la sección (onda 3: P; onda 4: K)

**Cubre:** la historia 4 (escenarios 1 y 5), FR-028 y FR-029 en «Cuentas», FR-002 completo («Alumnos») y el hallazgo F14-3.

### Tarea 3.1 · «Cuentas» con el uso, en rojo (T036, P, desde S2)

**Archivos:** `frontend/src/pages/admin/ui/accounts-usage.spec.tsx`. No edita `accounts-section.spec.tsx` de F12a ni ninguna spec de F12b o de F14a.

**Consume:** de F12a, `AdminPage`, `adminUserBodyFactory`, `pageBody` y `render-admin.tsx`; de U2, `AccountUsage` y `StudentsView`. **Produce:** la prueba de la columna, de la lista oculta y de la vista «Alumnos».

1. **`ui/accounts-usage.spec.tsx`.** Cubre FR-028, FR-029, FR-036, la historia 4 (escenarios 1, 5 y 6) y las Review Focus 2 y 4:

   ```tsx
   import { screen, within } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { adminUserBodyFactory, pageBody } from '../model/admin.factory';
   import type { BarChart } from '../model/bar-chart';
   import { overviewFactory, statsBody, studentDetailFactory } from '../model/usage.factory';
   import AdminPage from './AdminPage';
   import { OLGA, renderWithFetch, signInAs, stubDialogs } from './render-admin';
   import { routeFetch, type RoutedReply } from './usage-fetch';

   const plot = vi.hoisted(() => ({
     drawBarChart: vi.fn<(host: HTMLElement, frame: HTMLElement, chart: BarChart) => () => void>(),
   }));
   vi.mock('../lib/plot', () => ({ drawBarChart: plot.drawBarChart }));

   const USERS = '/api/admin/users';
   const DETAIL = '/api/admin/stats/students/12';
   const ACCOUNTS = 'Cuentas del taller, por nombre';
   const OWN = adminUserBodyFactory.build({ id: OLGA.id, name: OLGA.name, email: OLGA.email, role: 'admin' });
   const ANA = adminUserBodyFactory.build({ id: 12, name: 'Ana Pérez', email: 'ana@x.com' });
   const LEAVING = adminUserBodyFactory.build({ id: 14, name: 'Carla Díaz', email: 'carla@x.com', status: 'deleting' });
   const NOT_FOUND = { status: 404, json: { message: 'No existe lo que pedís.', code: 'not_found' } };

   function renderPage(users: readonly RoutedReply[], detail: readonly RoutedReply[]) {
     const routed = routeFetch({
       [USERS]: users,
       [DETAIL]: detail,
       '/api/admin/stats/overview': [{ status: 200, json: statsBody(overviewFactory.build()) }],
       '/api/admin/stats/students': [{ status: 200, json: pageBody([]) }],
       '/api/admin/invitations': [{ status: 200, json: pageBody([]) }],
     });
     const user = renderWithFetch(<AdminPage initialSection="accounts" onClose={vi.fn()} />, routed.fetch);
     return { user, routed };
   }

   function detailBody() {
     return { status: 200, json: statsBody(studentDetailFactory.build()) };
   }

   beforeAll(stubDialogs);
   beforeEach(() => {
     signInAs();
     plot.drawBarChart.mockReset();
     plot.drawBarChart.mockReturnValue(() => undefined);
   });

   describe('the usage from «Cuentas»', () => {
     it('puts «Uso» before «Acciones» and offers the usage of every row but the one being deleted', async () => {
       renderPage([{ status: 200, json: pageBody([OWN, ANA, LEAVING]) }], [detailBody()]);
       const table = await screen.findByRole('table', { name: ACCOUNTS });
       expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent).slice(-2)).toEqual([
         'Uso',
         'Acciones',
       ]);
       expect(screen.getByRole('button', { name: 'Ver el uso de Olga Ruiz' })).toBeInTheDocument();
       expect(screen.queryByRole('button', { name: 'Ver el uso de Carla Díaz' })).toBeNull();
       const group = screen.getByRole('group', { name: 'Acciones sobre Ana Pérez' });
       expect(within(group).getAllByRole('button')).toHaveLength(3);
       expect(within(group).queryByRole('button', { name: /Ver el uso/ })).toBeNull();
     });

     it('opens the usage in place of the list and comes back to the list as it was', async () => {
       const { user, routed } = renderPage(
         [
           { status: 200, json: pageBody([OWN], 1, 2, 30) },
           { status: 200, json: pageBody([ANA], 2, 2, 30) },
         ],
         [detailBody()],
       );
       await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
       await screen.findByText('Página 2 de 2 · 30 cuentas');
       expect(routed.callsTo(DETAIL)).toHaveLength(0);
       await user.click(screen.getByRole('button', { name: 'Ver el uso de Ana Pérez' }));
       expect(screen.getByRole('heading', { name: 'Uso de Ana Pérez' })).toHaveFocus();
       expect(screen.getByRole('button', { name: 'Cuentas' })).toHaveAttribute('aria-pressed', 'true');
       expect(screen.queryByRole('table', { name: ACCOUNTS })).toBeNull();
       expect(routed.callsTo(DETAIL)).toHaveLength(1);
       expect(routed.callsTo('/api/admin/users/12')).toHaveLength(0);
       await user.click(screen.getByRole('button', { name: 'Volver a Cuentas' }));
       expect(screen.getByRole('button', { name: 'Ver el uso de Ana Pérez' })).toHaveFocus();
       expect(screen.getByText('Página 2 de 2 · 30 cuentas')).toBeInTheDocument();
       expect(routed.callsTo(USERS)).toHaveLength(2);
     });

     it('asks the list again after a 404 of the usage', async () => {
       const { user, routed } = renderPage([{ status: 200, json: pageBody([OWN, ANA]) }], [NOT_FOUND]);
       await user.click(await screen.findByRole('button', { name: 'Ver el uso de Ana Pérez' }));
       expect(await screen.findByText('Esa cuenta ya no existe o se está borrando.')).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Volver' }));
       await vi.waitFor(() => expect(routed.callsTo(USERS)).toHaveLength(2));
       expect(await screen.findByRole('table', { name: ACCOUNTS })).toBeInTheDocument();
     });

     it('drops the usage when the section changes', async () => {
       const { user } = renderPage([{ status: 200, json: pageBody([OWN, ANA]) }], [detailBody()]);
       await user.click(await screen.findByRole('button', { name: 'Ver el uso de Ana Pérez' }));
       await user.click(screen.getByRole('button', { name: 'Invitaciones' }));
       await user.click(screen.getByRole('button', { name: 'Cuentas' }));
       expect(await screen.findByRole('table', { name: ACCOUNTS })).toBeInTheDocument();
       expect(screen.queryByRole('heading', { name: 'Uso de Ana Pérez' })).toBeNull();
     });
   });

   describe('«Alumnos» in «Uso del taller»', () => {
     it('comes third among the views and lists the students', async () => {
       const { user, routed } = renderPage([{ status: 200, json: pageBody([OWN]) }], [detailBody()]);
       await user.click(screen.getByRole('button', { name: 'Uso del taller' }));
       const views = screen.getByRole('group', { name: 'Vistas de Uso del taller' });
       expect(within(views).getAllByRole('button').map((button) => button.textContent)).toEqual([
         'Resumen',
         'Ejercicios',
         'Alumnos',
         'Ejecuciones',
       ]);
       await user.click(within(views).getByRole('button', { name: 'Alumnos' }));
       expect(await screen.findByText('No hay alumnos con esa búsqueda o ese filtro.')).toBeInTheDocument();
       expect(routed.callsTo('/api/admin/stats/students')).toHaveLength(1);
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/accounts-usage.spec.tsx`: en rojo, por la columna y la vista que faltan.
3. **Commit:** `test(front): specs del uso desde «Cuentas» y de «Alumnos» en la sección, en rojo`.

### Tarea 3.2 · La columna, la lista oculta y la vista (T037, P)

**Archivos:** en `frontend/src/pages/admin/`, `ui/AccountsTable.tsx`, `ui/AccountsSection.tsx` (de F12a), `ui/UsageSection.tsx`, `model/usage-types.ts` (`UsageView`), `model/usage-labels.ts` (`VIEW_LABELS`) y `ui/admin.css`.

1. **`ui/AccountsTable.tsx`,** este diff sobre el de F12a (con F12b en la base, B2, `mailAvailable` queda donde está):

   ```diff
    interface AccountsTableProps {
      readonly titleId: string;
      readonly users: readonly AdminUser[];
      readonly ownId: number;
      readonly busy: boolean;
      onAction(action: UserAction, user: AdminUser, opener: HTMLButtonElement): void;
   +  onUsage(user: AdminUser, opener: HTMLButtonElement): void;
    }

   -const AccountsTable = ({ titleId, users, ownId, busy, onAction }: AccountsTableProps) => (
   +const AccountsTable = ({ titleId, users, ownId, busy, onAction, onUsage }: AccountsTableProps) => (
   @@
                <th scope="col">Alta</th>
   +            <th scope="col">Uso</th>
                <th scope="col">Acciones</th>
   @@
                    <td>{formatLocalDateTime(user.createdAt)}</td>
   +                <td>
   +                  {user.status === 'deleting' ? null : (
   +                    <button
   +                      type="button"
   +                      className="button secondary small"
   +                      onClick={(event) => onUsage(user, event.currentTarget)}
   +                    >
   +                      {`Ver el uso de ${user.name}`}
   +                    </button>
   +                  )}
   +                </td>
                    <td>
                      {actions.length === 0 ? null : (
   ```

2. **`ui/AccountsSection.tsx`,** este diff sobre el de F12a (T016 de F12a). La lista y sus controles quedan dentro de un contenedor con `hidden`; el detalle va al lado (research-f14b, R1):

   ```diff
    import { useCallback, useId, useRef, useState } from 'react';
   +import { flushSync } from 'react-dom';
    import { useForm } from 'react-hook-form';
   @@
    import AccountsTable from './AccountsTable';
   +import AccountUsage from './AccountUsage';
    import ActionDialog from './ActionDialog';
   @@
    interface SearchValues {
      q: string;
    }
   +
   +interface OpenedUsage {
   +  readonly user: AdminUser;
   +  readonly opener: HTMLButtonElement;
   +}
   @@
      const [notice, setNotice] = useState('');
   +  const [usage, setUsage] = useState<OpenedUsage | null>(null);
   @@
   +  const back = (stale: boolean): void => {
   +    const opener = usage?.opener;
   +    flushSync(() => setUsage(null));
   +    if (stale) list.reload();
   +    if (opener?.isConnected === true) opener.focus();
   +    else title.current?.focus();
   +  };
   +
      return (
        <div className="admin-section">
   +      <div className="admin-section" hidden={usage !== null}>
          <form
            className="admin-filters"
   @@
              <AccountsTable
                titleId={titleId}
                users={users}
                ownId={ownId}
                busy={list.loading}
                onAction={confirm}
   +            onUsage={(user, opener) => setUsage({ user, opener })}
              />
            )}
          </ListView>
   +      </div>
   +      {usage === null ? null : (
   +        <AccountUsage
   +          ownId={ownId}
   +          userId={usage.user.id}
   +          name={usage.user.name}
   +          backLabel="Volver a Cuentas"
   +          onBack={back}
   +        />
   +      )}
          {actions.dialog === null ? null : (
   ```

   El contenedor nuevo envuelve todo lo que había antes de `ActionDialog`: el buscador, los filtros, el aviso, el título y la lista. `ActionDialog` queda afuera, como estaba. Prettier reindenta lo envuelto en el mismo commit.

3. **`model/usage-types.ts`** y **`model/usage-labels.ts`,** la vista nueva, en el mismo commit que la sección (sin ella, `viewContent` dejaría de cubrir todos los casos):

   ```diff
   -export type UsageView = 'overview' | 'exercises' | 'runs';
   +export type UsageView = 'overview' | 'exercises' | 'students' | 'runs';
   ```

   ```diff
    export const VIEW_LABELS: Readonly<Record<UsageView, string>> = {
      overview: 'Resumen',
      exercises: 'Ejercicios',
   +  students: 'Alumnos',
      runs: 'Ejecuciones',
    };
   ```

4. **`ui/UsageSection.tsx`:**

   ```diff
    import OverviewView from './OverviewView';
    import RunsView from './RunsView';
   +import StudentsView from './StudentsView';
   @@
   -const VIEWS: readonly UsageView[] = ['overview', 'exercises', 'runs'];
   +const VIEWS: readonly UsageView[] = ['overview', 'exercises', 'students', 'runs'];
   @@
        case 'exercises':
          return <ExercisesView ownId={ownId} />;
   +    case 'students':
   +      return <StudentsView ownId={ownId} />;
        case 'runs':
   ```

5. **`ui/admin.css`,** al final. `.admin-section` tiene `display: grid`, que le gana al atributo `hidden` (research-f14b, R1):

   ```css
   .admin-section[hidden] {
     display: none;
   }
   .usage-quotas {
     display: grid;
     gap: 8px;
     margin: 0;
     padding: 0;
     list-style: none;
   }
   .usage-quotas li {
     display: flex;
     flex-wrap: wrap;
     gap: 8px;
     align-items: center;
   }
   .usage-quotas meter {
     width: 120px;
   }
   ```

6. **Correr:**
   - `npm run test:unit -- frontend/src/pages/admin`, en verde: las de F14b y **todas las de F12a, F12b y F14a sin editar** (`accounts-section.spec.tsx`, `admin-page.spec.tsx` y `usage-section.spec.tsx` incluidas);
   - `npm run typecheck`, `npm run lint` y `npm run format:check`;
   - `npm run build` y `npm test`;
   - **el peso:** el tamaño de `dist/index.html` menos el de T001 de F14a. **Si pasa de 95 000, parás y le preguntás al usuario** (FR-057).
7. **Commit:** `feat(front): el uso de una cuenta desde «Cuentas» y desde «Alumnos», con la lista de origen montada`.

**La compuerta de U3 (K):** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y la red tres veces seguidas (`E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0`), con las E2E de F12a, F12b y F14a sin editar y las de T039 en verde. La revisión en el navegador: «Cuentas», la columna «Uso», el detalle y «Volver», con el teclado y a 320 px. El PR: `feat(front): per-account usage from «Cuentas» and «Alumnos» (F14b U3)`, contra `f14b/base`.

**Reversión de U3:** se revierten T037 y T036. Revertir T037 saca la columna y la vista; U2 queda sin usar.

## 4. U4 · Las E2E (onda 1: E, T038; onda 3: E, T039)

**Las reglas** son las de U4 de F14a. Además:

- las rutas con un id se registran una por id (`'GET /api/admin/stats/students/12'`), porque el doble busca la ruta sin la query;
- `GET /api/admin/runs` con `user` es la misma ruta que sin él: el escenario decide por `call.search`;
- la cuenta de «Cuentas» es `ANA_ROW` de F12a (`id` 12, «Ana Pérez»).

### Tarea 4.1 · Los datos de una cuenta (T038, E)

**Archivos:** `qa/e2e/lib/usage-contract.ts`, al final.

1. **Los datos,** con la forma del contrato de C5 (§5, §6 y §8) y los valores escritos a mano:

   ```ts
   import { ANA_ROW, adminUser } from './admin-contract';

   export interface StudentJson {
     id: number;
     name: string;
     email: string;
     role: string;
     status: string;
     lastActivityAt: string | null;
     solved: { server: number; imported: number };
     attempts: { lastWeek: number; lastMonth: number };
     lastAttemptAt: string | null;
   }

   export const STUDENT_ANA: StudentJson = {
     id: ANA_ROW.id,
     name: ANA_ROW.name,
     email: ANA_ROW.email,
     role: 'student',
     status: 'active',
     lastActivityAt: '2026-10-06T13:00:00.000Z',
     solved: { server: 3, imported: 1 },
     attempts: { lastWeek: 2, lastMonth: 7 },
     lastAttemptAt: '2026-10-06T13:00:00.000Z',
   };

   export const STUDENT_NEVER: StudentJson = {
     id: 16,
     name: 'Dani Paz',
     email: 'dani@x.com',
     role: 'student',
     status: 'active',
     lastActivityAt: null,
     solved: { server: 0, imported: 0 },
     attempts: { lastWeek: 0, lastMonth: 0 },
     lastAttemptAt: null,
   };

   function exerciseRow(exerciseId: string, fields: Record<string, unknown> = {}) {
     return {
       exerciseId,
       state: 'started',
       solvedAt: null,
       serverSolvedAt: null,
       attemptCount: 0,
       lastAttemptAt: null,
       lastOutcome: null,
       assisted: false,
       solutionSeen: false,
       hintsRevealed: null,
       predictionAnswered: false,
       predictionCorrect: false,
       confidence: null,
       reviewDueAt: null,
       ...fields,
     };
   }

   const DETAIL_EXERCISES = [
     exerciseRow('rust-01', {
       state: 'solved',
       solvedAt: '2026-10-03T15:00:00.000Z',
       serverSolvedAt: '2026-10-03T15:00:00.000Z',
       attemptCount: 2,
       predictionAnswered: true,
       predictionCorrect: true,
     }),
     exerciseRow('rust-02', {
       state: 'attempted',
       attemptCount: 3,
       lastAttemptAt: '2026-10-06T13:00:00.000Z',
       lastOutcome: 'compile_error',
       predictionAnswered: true,
       predictionCorrect: false,
       hintsRevealed: 2,
     }),
     exerciseRow('rust-03'),
   ];

   function detailData(exercises: unknown[]) {
     return {
       account: adminUser({ id: ANA_ROW.id, name: ANA_ROW.name, email: ANA_ROW.email }),
       progress: { epoch: 3, resetAt: '2026-10-03T15:00:00.000Z', lastActivityAt: '2026-10-06T13:00:00.000Z' },
       imports: [{ importedAt: '2026-10-02T12:00:00.000Z', source: 'storage', epoch: 1 }],
       solvedByCatalog: [{ catalog: 'lab', language: 'rust', server: 3, imported: 1 }],
       attempts: {
         inPeriod: {
           attempts: { ...ZERO, passed: 1, failed: 2, compileError: 1 },
           operations: { infraError: 0, canceled: 0 },
           importedAttempts: 0,
         },
         total: {
           attempts: { ...ZERO, passed: 4, failed: 3, compileError: 1 },
           operations: { infraError: 1, canceled: 0 },
           importedAttempts: 2,
         },
       },
       activity: DAY_DATA.series.map((entry, index) => ({ start: entry.start, attempts: [0, 2, 0, 1, 0, 1, 0][index] ?? 0 })),
       quota: {
         active: 0,
         lastMinute: 1,
         lastDay: 4,
         sandboxMs: 90000,
         limits: { active: 1, perMinute: 10, perDay: 300, sandboxMinutes: 30 },
       },
       exercises,
       campaign: {
         checkpoints: [{ worldId: 'rust-world-1', answered: true, passed: true, passedAt: '2026-10-04T12:00:00.000Z' }],
         sealedExercises: 2,
       },
       workshops: [
         {
           workshopId: 'cache',
           language: 'rust',
           codeSealed: true,
           predictionAnswered: true,
           predictionCorrect: false,
           stepsMarked: 2,
           objectivesObserved: 1,
         },
       ],
       route: { steps: 3, milestones: 1, favorites: 2, quizAnswered: 4 },
     };
   }

   export const STUDENT_DETAIL = {
     data: detailData(DETAIL_EXERCISES),
     meta: { generatedAt: GENERATED_AT, period: OCTOBER_WEEK },
   };

   export function detailOfAll() {
     const exercises = Object.keys(curriculumIds.exercises).map((id, index) =>
       exerciseRow(id, { state: index % 3 === 0 ? 'solved' : 'attempted', attemptCount: index % 5 }),
     );
     return { data: detailData(exercises), meta: { generatedAt: GENERATED_AT, period: OCTOBER_WEEK } };
   }

   export const ACCOUNT_RUNS: RunsJson = {
     data: [run('019a0000-0000-7000-8000-000000000009', { account: { id: ANA_ROW.id, name: ANA_ROW.name } })],
     meta: { nextCursor: null, retentionDays: 14 },
   };
   ```

   El `import` de `./admin-contract` va arriba, junto al de `./curriculum`. La actividad suma 4 intentos en la semana, con el pico el 2/10.

2. **Correr** `npm run typecheck`.
3. **Commit:** `test(qa): los datos de C5 para el uso de una cuenta`.

### Tarea 4.2 · Las E2E del uso de una cuenta, en rojo (T039, E, desde S2)

**Archivos:** `qa/e2e/specs/admin-usage-students.spec.ts` y `admin-usage-account.spec.ts`.

1. **`admin-usage-students.spec.ts`.** Cubre la historia 3, SC-004 y la Review Focus 1:

   ```ts
   import { expect, test } from '../fixtures';
   import { ADMIN } from '../lib/api-contract';
   import { OWN_ROW, pageOf } from '../lib/admin-contract';
   import { OVERVIEW_DAY, STUDENT_ANA, STUDENT_DETAIL, STUDENT_NEVER } from '../lib/usage-contract';
   import { urls } from '../lib/urls';

   const STUDENTS = 'GET /api/admin/stats/students';
   const DETAIL = 'GET /api/admin/stats/students/12';

   function queryOf(search: string | undefined): Record<string, string> {
     return Object.fromEntries(new URLSearchParams(search ?? ''));
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(async ({ api, shell, usage }) => {
     api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW]) }));
     api.on('GET /api/admin/stats/overview', () => ({ status: 200, json: OVERVIEW_DAY }));
     api.on(STUDENTS, () => ({ status: 200, json: pageOf([STUDENT_NEVER, STUDENT_ANA]) }));
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     await usage.open();
     await usage.openView('Alumnos');
     await expect(usage.table('Alumnos')).toBeVisible();
   });

   test('lists the students with one request of 25 and «Nunca» for whoever never practiced', async ({
     api,
     usage,
   }) => {
     expect(api.callsTo(STUDENTS)).toHaveLength(1);
     expect(queryOf(api.callsTo(STUDENTS)[0]?.search)).toEqual({ page: '1', perPage: '25' });
     await expect(usage.row('Alumnos', /Dani Paz/)).toContainText('Nunca');
     await expect(usage.row('Alumnos', /Ana Pérez/)).toContainText('3 en el servidor · 1 importados');
   });

   test('filters by inactivity and orders by the oldest activity', async ({ api, usage }) => {
     await usage.field('Sin actividad desde').fill('2026-10-01');
     await expect.poll(() => api.callsTo(STUDENTS).length).toBe(2);
     await usage.field('Ordenar por').selectOption({ label: 'Última actividad, la más vieja primero' });
     await expect.poll(() => api.callsTo(STUDENTS).length).toBe(3);
     expect(queryOf(api.callsTo(STUDENTS)[2]?.search)).toEqual({
       page: '1',
       perPage: '25',
       inactiveSince: '2026-10-01',
       sort: 'lastActivity',
     });
     await expect(usage.table('Alumnos').getByRole('rowheader').first()).toHaveText('Dani Paz');
   });

   test('asks no detail while listing and hovering, and asks once on «Ver el uso de»', async ({
     api,
     usage,
   }) => {
     for (const row of await usage.table('Alumnos').getByRole('row').all()) await row.hover();
     await usage.button('Ver el uso de Ana Pérez').hover();
     expect(api.callsTo(DETAIL)).toHaveLength(0);
     await usage.button('Ver el uso de Ana Pérez').click();
     await expect(usage.heading('Uso de Ana Pérez')).toBeFocused();
     expect(api.callsTo(DETAIL)).toHaveLength(1);
     expect(api.calls.filter((call) => /^\/api\/admin\/users\/\d+$/.test(call.path))).toEqual([]);
   });

   test('comes back to «Alumnos» as it was, with the focus on its button', async ({ api, usage }) => {
     await usage.button('Ver el uso de Ana Pérez').click();
     await usage.button('Volver a Alumnos').click();
     await expect(usage.button('Ver el uso de Ana Pérez')).toBeFocused();
     await expect(usage.views().getByRole('button', { name: 'Alumnos' })).toHaveAttribute('aria-pressed', 'true');
     expect(api.callsTo(STUDENTS)).toHaveLength(1);
   });
   ```

2. **`admin-usage-account.spec.ts`.** Cubre la historia 4, SC-002 a SC-004 en el detalle, SC-008 (la grilla) y las Review Focus 3 y 5:

   ```ts
   import type { Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { ADMIN, errorBody } from '../lib/api-contract';
   import { ANA_ROW, LEAVING_ROW, OWN_ROW, adminError, pageOf } from '../lib/admin-contract';
   import { curriculumIds } from '../lib/curriculum';
   import { ACCOUNT_RUNS, STUDENT_DETAIL, detailOfAll } from '../lib/usage-contract';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';
   const DETAIL = 'GET /api/admin/stats/students/12';
   const RUNS = 'GET /api/admin/runs';

   function queryOf(search: string | undefined): Record<string, string> {
     return Object.fromEntries(new URLSearchParams(search ?? ''));
   }

   async function traces(page: Page): Promise<string> {
     return page.evaluate(() =>
       JSON.stringify({
         local: { ...localStorage },
         session: { ...sessionStorage },
         cookie: document.cookie,
         url: location.href,
         state: history.state as unknown,
       }),
     );
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(({ api }) => {
     api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW, ANA_ROW, LEAVING_ROW]) }));
     api.on(RUNS, () => ({ status: 200, json: ACCOUNT_RUNS }));
   });

   test('opens the usage from «Cuentas», says it is logged and asks nothing else', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await expect(admin.button('Ver el uso de Carla Díaz')).toHaveCount(0);
     await admin.button('Ver el uso de Ana Pérez').click();
     await expect(usage.heading('Uso de Ana Pérez')).toBeFocused();
     await expect(admin.button('Cuentas')).toHaveAttribute('aria-pressed', 'true');
     await expect(
       admin.region.getByText('Esta consulta queda registrada: el taller anota qué admin miró el uso de cada cuenta.'),
     ).toBeVisible();
     expect(api.callsTo(DETAIL)).toHaveLength(1);
     expect(queryOf(api.callsTo(DETAIL)[0]?.search)).toEqual({});
     expect(api.callsTo('GET /api/admin/users/12')).toHaveLength(0);
     expect(api.callsTo(RUNS)).toHaveLength(0);
   });

   test('shows flags but no option and no spread of options', async ({ admin, api, shell, usage }) => {
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     const attempted = usage.row('Ejercicios', /rust-02/);
     await expect(attempted).toContainText('Respondió y no acertó');
     await expect(attempted).toContainText('No compiló');
     await expect(attempted).toContainText('2 pistas');
     await expect(admin.region.getByRole('list', { name: /^Opciones/ })).toHaveCount(0);
     await expect(admin.region.getByText(/Opción \d/)).toHaveCount(0);
     await expect(admin.region.getByRole('meter', { name: 'Minutos de sandbox: 1,5 de 30' })).toBeVisible();
     await expect.poll(() => usage.inkedPixels('Actividad')).toBeGreaterThan(0);
     await expect(admin.region.getByText(/verificad/i)).toHaveCount(0);
   });

   test('asks exactly once more with another period', async ({ admin, api, shell, usage }) => {
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     await expect(usage.field('Desde')).toHaveValue('2026-10-01');
     await usage.applyPeriod('2026-10-01', '2026-10-05');
     await expect.poll(() => api.callsTo(DETAIL).length).toBe(2);
     expect(queryOf(api.callsTo(DETAIL)[1]?.search)).toEqual({
       from: '2026-10-01',
       to: '2026-10-05',
       granularity: 'day',
     });
   });

   test('returns to «Cuentas» as it was, with the focus on «Ver el uso de Ana Pérez»', async ({
     admin,
     api,
     shell,
   }) => {
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     await admin.button('Volver a Cuentas').click();
     await expect(admin.button('Ver el uso de Ana Pérez')).toBeFocused();
     await expect(admin.actions(/Ana Pérez/).getByRole('button')).toHaveCount(3);
     expect(api.callsTo('GET /api/admin/users')).toHaveLength(1);
   });

   test('explains an account that is being deleted and asks the list again', async ({
     admin,
     api,
     pageIssues,
     shell,
   }) => {
     pageIssues.expectIssue(/status of 404/, 'the 404 of an account that is being deleted');
     api.on(DETAIL, () => ({ status: 404, json: adminError('not_found') }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     await expect(admin.region.getByText('Esa cuenta ya no existe o se está borrando.')).toBeVisible();
     await admin.button('Volver').click();
     await expect.poll(() => api.callsTo('GET /api/admin/users').length).toBe(2);
   });

   test('shows its runs inside the detail with one request', async ({ admin, api, shell, usage }) => {
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     await admin.button('Ver sus ejecuciones').click();
     await expect(usage.table('Sus ejecuciones de los últimos 14 días')).toBeVisible();
     expect(api.callsTo(RUNS)).toHaveLength(1);
     expect(queryOf(api.callsTo(RUNS)[0]?.search)).toEqual({ user: '12' });
     await expect(usage.heading('Uso de Ana Pérez')).toBeVisible();
   });

   test('keeps the usage where it was after signing in again, without asking it again', async ({
     access,
     admin,
     api,
     pageIssues,
     shell,
     usage,
   }) => {
     pageIssues.expectIssue(/status of 401/, 'the 401 of an expired session');
     api.signInAccount = ADMIN;
     api.on(DETAIL, (call) =>
       call.search === ''
         ? { status: 200, json: STUDENT_DETAIL }
         : { status: 401, json: errorBody('unauthenticated') },
     );
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     await usage.applyPeriod('2026-10-01', '2026-10-05');
     await access.signIn(ADMIN.email, PASSWORD);
     await expect(access.heading('Ingresá al taller')).toBeHidden();
     await expect(usage.heading('Uso de Ana Pérez')).toBeVisible();
     expect(api.callsTo(DETAIL)).toHaveLength(2);
   });

   test('keeps nothing of the account after closing the administration', async ({
     admin,
     api,
     page,
     shell,
   }) => {
     const logged: string[] = [];
     page.on('console', (message) => logged.push(message.text()));
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await shell.goto(urls.view('recorrido'));
     const before = await traces(page);
     await admin.open();
     const address = page.url();
     await admin.button('Ver el uso de Ana Pérez').click();
     await admin.button('Ver sus ejecuciones').click();
     expect(page.url()).toBe(address);
     await admin.button('Volver a Cuentas').click();
     await admin.button('Cerrar').click();
     const after = await traces(page);
     expect(after).toBe(before);
     for (const value of [ANA_ROW.name, ANA_ROW.email]) expect(after).not.toContain(value);
     expect(logged.filter((text) => text.includes(ANA_ROW.email) || text.includes(ANA_ROW.name))).toEqual([]);
   });

   test('does not scroll sideways at 320 px in the usage of an account', async ({ admin, api, page, shell }) => {
     api.on(DETAIL, () => ({ status: 200, json: STUDENT_DETAIL }));
     await page.setViewportSize({ width: 320, height: 800 });
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     await admin.button('Ver el uso de Ana Pérez').click();
     await expect(admin.region.getByRole('heading', { name: 'Uso de Ana Pérez' })).toBeVisible();
     expect(await admin.region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
   });

   test('measures how long a grid with every exercise takes to draw (SC-008)', async ({
     admin,
     api,
     shell,
     usage,
   }) => {
     api.on(DETAIL, () => ({ status: 200, json: detailOfAll() }));
     await shell.goto(urls.view('recorrido'));
     await admin.open();
     const started = Date.now();
     await admin.button('Ver el uso de Ana Pérez').click();
     const rows = Object.keys(curriculumIds.exercises).length;
     await expect(usage.table('Ejercicios').getByRole('row')).toHaveCount(rows + 1);
     test.info().annotations.push({
       type: 'SC-008',
       description: `la grilla de ${rows} ejercicios: ${Date.now() - started} ms`,
     });
   });
   ```

   `ANA_ROW` (id 12), `LEAVING_ROW` (en `deleting`) y `OWN_ROW` son de F12a; el primer escenario fija que la fila que se borra no ofrece «Ver el uso».

3. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4196 npm run test:e2e -- specs/admin-usage-students.spec.ts specs/admin-usage-account.spec.ts`. Antes de U3, en rojo por la razón esperada: no existen «Alumnos» ni la columna «Uso». La red de la base sigue en verde.
4. **Commit:** `test(qa): E2E del uso de una cuenta, en rojo`.

## 5. U5 · La documentación, el peso y el PR (onda 4: K)

### Tarea 5.1 · La documentación (T040, K)

1. **`docs/architecture.md`:** `pages/admin` suma «Alumnos» y el uso de una cuenta. La lista de origen queda montada y oculta mientras se ve el detalle, en «Cuentas» y en «Alumnos». La columna «Uso» va fuera del grupo de acciones.
2. **`qa/AGENTS.md`:** las E2E de una cuenta registran su ruta por id y cuentan los pedidos de detalle (SC-004). Las rutas de F12a no cambian.
3. **Commit:** `docs: el uso de una cuenta en la administración`.

### Tarea 5.2 · El peso, la compuerta final y el PR (T041, K)

1. **El peso:** `dist/index.html` contra T001 **de F14a**. F14 entera no pasa de +95 000. Si se pasa, parás y decide el usuario. Va al PR.
2. **La compuerta final:** la de T028 de F14a, con la red cinco veces seguidas. Además:
   - `git diff master --stat -- qa/e2e/specs` muestra sólo los dos `admin-usage-*.spec.ts` nuevos;
   - `git diff master --stat -- '*.spec.tsx' '*.spec.ts'` sólo agrega archivos.
3. **La revisión manual con datos armados** (Q4-A, acción del usuario): «Cuentas» con la columna «Uso», «Alumnos» con el filtro de inactividad, el detalle de una cuenta con y sin progreso, y sus ejecuciones; con el teclado, a 320 px y con movimiento reducido.
4. **El PR,** `feat(front): F14b, the per-account usage for admins`, de `f14b/base` a `master`, con el contexto, lo que cambia en F12a (la columna y la lista oculta), el peso acumulado y SC-008.

## Cobertura de requisitos

| Requisito | Dónde |
| --- | --- |
| FR-002 («Alumnos») | T036, T037 |
| FR-025 | T030, T031 (`listStudents` y `parseStudentRow`), T034, T035, T039 |
| FR-026 | T030, T031, T034, T035 (búsqueda, inactividad y órdenes de la API), T039 |
| FR-027 | T034, T035 |
| FR-028 | T036, T037 (la columna «Uso»), T039 |
| FR-029 | T034 a T037 (la lista montada y oculta, el foco y la sección marcada), T039 |
| FR-030 | T032, T033 (un pedido por apertura y por período, el aviso), T039 (puntero y ficha) |
| FR-031 | T030, T031, T032, T033 (la cuenta, el progreso, las importaciones, lo resuelto y los intentos) |
| FR-032 | T030, T031 (`activityChart`), T032, T033, T039 (el dibujo) |
| FR-033 | T030, T031 (`quotaRows`), T032, T033 |
| FR-034 | T030, T031 (`visibleRows` y las banderas), T032, T033 (`ExerciseGrid`) |
| FR-035 | T032, T033 (la campaña, los talleres y el recorrido) |
| FR-036 | T032, T033 (`isNotFound`), T036, T037 (`list.reload`), T039 |
| FR-037 | T030, T031 (`listAccountRuns`), T032, T033 (`AccountRuns`), T039 |
| FR-038 | T039 (el almacenamiento, la URL, el historial y la consola después del detalle) |
| FR-039 | T030 (la lectura descarta lo que el contrato no tiene), T034 (ningún orden por métrica), T032 |
| FR-040 | T035 (lo resuelto con su desglose), T039 (ningún «verificado») |
| FR-041, FR-042 | T032, T033, T039 (el detalle sin opciones ni distribuciones; las cuotas no son tasas) |
| FR-043 | El detalle no ofrece exportar (T039, ningún enlace de descarga, por F14a) |
| FR-044 | T032, T033 (sólo al abrir; sus ejecuciones, a pedido), T039 |
| FR-045 a FR-048 | T033 (la actividad con `SeriesChart` de F14a), T039 (el dibujo) |
| FR-049 a FR-051 | T032, T033 (`useStatsRequest` y `RequestState` de F14a), T039 (401 y 404) |
| FR-052 a FR-055 | T032 a T037 (el foco y las tablas), T039 (320 px) |
| FR-056 | Ninguna dependencia |
| FR-057 | T037, T041 (acumulado desde T001 de F14a) |
| FR-058 | T039 (la grilla con todos los ejercicios, sin virtualizar) |
| FR-059 | Todas las tareas pares de código, con su spec en rojo |
| FR-060 | T038, T039 (`UsagePage` y `AdminPage` de F12a) |
| FR-061 | T037 y T041 (las pruebas de F12a, F12b y F14a sin editar) |
| FR-062 | T040, T041 |
| FR-063 | T032 (lo que recibe `drawBarChart`), T039 (el dibujo) |
| SC-001 | T030 a T033 y T039 (cada cifra contra la respuesta) |
| SC-002 | T032, T039 (0 opciones y 0 distribuciones en el detalle) |
| SC-003 | T039 |
| SC-004 | T032, T036 y T039 (1 pedido al abrir, 1 por período, 0 al listar y pasar el puntero, 0 a la ficha) |
| SC-005 | T032 (404), T039 (401), y los demás estados por F14a |
| SC-006 | T033 (la tabla y el resumen de la actividad), T039 |
| SC-007 | T037, T041 |
| SC-008 | T039, T041 (la grilla con todos los ejercicios) |
| SC-010 | T041 |

## Riesgos y lo que quedó sin verificar

- **Nada corrió.** El riesgo más alto es el diff de `AccountsSection`: si la base de F12a la escribió distinto, T037 adapta el cambio (B5) sin cambiar su comportamiento ni sus pruebas.
- **F12b en el medio** (B2): el diff de `AccountsTable` toca las mismas líneas que el de F12b. Lo resuelve el rebase, porque las dos props conviven.
- **El peso:** si F14a usó casi todo el presupuesto, F14b puede no entrar. T029 calcula lo que queda antes de empezar.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, descartada |
| --- | --- | --- |
| La lista de «Cuentas» envuelta en un contenedor con `hidden` | Volver a la lista como estaba (FR-029, hallazgo F14-3) | Subir el estado de la lista a `AdminPage`: cambia el contrato de F12a por algo que sólo usa F14b |
