# Data model de D1c: el espacio de la cuenta, la cola y las dos traducciones

**Input**: [spec.md](./spec.md) (FR-060 a FR-079), [plan-d1c.md](./plan-d1c.md) y [research-d1c.md](./research-d1c.md). Las operaciones y las filas son las del cable de D1a ([contracts/http.md](./contracts/http.md), secciones 3.2 y 5) y de D1b ([contracts/http-d1b.md](./contracts/http-d1b.md), sección 5). Las formas v1 son las de los almacenes de F2 (`RouteProgressV1`, `LabStateV1`, `CampaignStateV1` y `SystemsStateV1`), que D1c no cambia.

## 1. Lo que guarda el navegador

### 1.1 Las claves

`<id>` es `user.id` de la sesión (`sessionStore`). Todo lo de la cuenta vive bajo `taller-v2:<id>:` (FR-067).

| Clave | Qué guarda | Quién la escribe |
| --- | --- | --- |
| `taller-v2:<id>:taller-learning-v1` (y sus `:respaldo`, `:respaldo-2` … `:respaldo-5`) | El recorrido en su forma v1 | `routeStore`, a través de la vinculación (sección 2); la etapa de arranque, sólo la proyección |
| `taller-v2:<id>:taller-laboratorio-v1` (y respaldos) | El laboratorio en su forma v1 | `labStore`; la etapa, sólo la proyección |
| `taller-v2:<id>:taller-campaign-v1` (y respaldos) | La campaña en su forma v1 | `campaignEngine`; la etapa, sólo la proyección |
| `taller-v2:<id>:taller-systems-v1` (y respaldos) | Sistemas en su forma v1 | `systemsEngine`; la etapa, sólo la proyección |
| `taller-v2:<id>:copia` | `CopyRecord`: la copia del servidor, con el reloj de cada campo y sus lápidas, y lo último que supo de él | El motor de D1c, al recibir una foto o un delta |
| `taller-v2:<id>:cola` | `QueueRecord`: la cola y las respuestas viejas que falta volver a evaluar | El motor, en cada cambio y en cada respuesta |
| `taller-v2:<id>:copia-epoca` | `EpochCopyRecord`: lo que no se envió antes de un «Borrar todo» de otro dispositivo | El motor, ante un `epoch_mismatch` |
| `taller-v2-compartida:<id>` | `'1'` si la cuenta eligió «computadora compartida». No es progreso: es una preferencia del dispositivo, fuera del espacio para que la limpieza de FR-069 no la borre | `enterSharedMode()`; la borra `leaveSharedMode()` |
| `taller-v1-importado:<id>` | `V1Archive`: las claves v1 y sus respaldos que la cuenta importó (FR-072) | La importación del v1 confirmada (201 o 200) |

Las cuatro claves v1 (`taller-learning-v1`, `taller-laboratorio-v1`, `taller-campaign-v1` y `taller-systems-v1`) y sus respaldos **no se escriben ni se borran** fuera de esa importación (FR-072 y FR-074 enmendado). Los almacenes ya no las leen: leen el espacio.

### 1.2 Los registros

```ts
// features/progress-sync/model/sync-records.ts
export const RECORD_FORMAT = 1;

export interface CopyRecord {
  readonly format: 1;
  readonly userId: number;
  readonly epoch: number;
  readonly revision: number;
  readonly contentVersion: string | null;
  readonly etag: string | null; // el validador de GET /api/progress
  readonly resetAt: string | null;
  readonly clockOffsetMs: number; // serverTime − sentAt del último lote
  readonly areas: ProgressAreas; // http.md, sección 5
}

export interface QueueRecord {
  readonly format: 1;
  readonly touchedAt: string; // ISO: el último cambio, respuesta o salida
  readonly operations: readonly Operation[];
  readonly deferred: readonly Operation[]; // stale_content que se reevalúa con el contenido nuevo
}

export interface EpochCopyRecord {
  readonly format: 1;
  readonly epoch: number; // la época en que se encolaron
  readonly createdAt: string;
  readonly operations: readonly Operation[];
}

export interface V1Archive {
  readonly format: 1;
  readonly imports: readonly {
    readonly importedAt: string;
    readonly importId: string;
    readonly entries: Readonly<Record<string, string>>; // clave v1 o de respaldo → su texto
  }[];
}
```

Un registro ilegible (JSON inválido, otro `format` u otra forma) se trata como ausente, salvo en la limpieza de FR-069, donde se conserva (sección 4).

### 1.3 La memoria

En los modos `shared` y `blocked`, los mismos registros viven en un `StorageLike` en memoria con las mismas claves: el código es uno solo y sólo cambia el respaldo. Al descargarse el documento, se pierden (FR-070).

## 2. La vinculación del almacenamiento

```ts
// shared/lib/progress-storage.ts
export type ProgressPersistence = 'browser' | 'memory' | 'blocked';
export interface ProgressStorageBinding {
  readonly storage: StorageLike;
  persistence(): ProgressPersistence;
}
```

- **El espacio** es un `StorageLike` que antepone `taller-v2:<id>:` a cada clave que le pide un almacén, sobre `localStorage` (`browser`) o sobre la memoria (`shared` y `blocked`). Su respaldo se puede cambiar en el lugar: así `enterSharedMode()` pasa a memoria sin reabrir los almacenes.
- **`openVersionedStore`**, cuando no recibe `storage`, usa `boundProgressStorage()` y, si no hay vinculación, `localStorage`, como hoy. Las pruebas que pasan su propio `storage` no cambian.
- **Con `persistence()` distinto de `browser`**, `load()` lee lo que haya (la proyección de la etapa) y devuelve `writable: false`. Con `blocked`, además devuelve `status: 'unavailable'`, así que el recorrido muestra el aviso de hoy y los cuatro `storageAvailable()` dan `false`. `write()` no escribe y `remove()` deja `writable` en `false`.

## 3. Las operaciones

### 3.1 Los tipos

```ts
// features/progress-sync/model/operations.ts
export type Language = 'rust' | 'go';
export type Confidence = 'again' | 'practice' | 'confident';
export type FocusMinutes = 15 | 25 | 45;

export type OperationBody =
  | { readonly type: 'exercise.prediction'; readonly exerciseId: string; readonly answer: number; readonly correct: boolean; readonly contentVersion: string }
  | { readonly type: 'exercise.assist'; readonly exerciseId: string; readonly assisted?: true; readonly solutionSeen?: true }
  | { readonly type: 'exercise.hints'; readonly exerciseId: string; readonly revealed: number }
  | { readonly type: 'exercise.reflection'; readonly exerciseId: string; readonly text: string }
  | { readonly type: 'exercise.customTest'; readonly exerciseId: string; readonly text: string }
  | { readonly type: 'exercise.review'; readonly exerciseId: string; readonly confidence: Confidence; readonly reviewedAt: string; readonly reviewDueAt: string }
  | { readonly type: 'exercise.draft'; readonly exerciseId: string; readonly code: string | null; readonly starterHash: string | null }
  | { readonly type: 'checkpoint.answer'; readonly worldId: string; readonly answer: number; readonly passed: boolean; readonly contentVersion: string }
  | { readonly type: 'workshop.prediction'; readonly workshopId: string; readonly language: Language; readonly answer: number; readonly correct: boolean; readonly contentVersion: string }
  | { readonly type: 'workshop.note'; readonly workshopId: string; readonly language: Language; readonly text: string }
  | { readonly type: 'workshop.objective'; readonly workshopId: string; readonly language: Language; readonly objectiveKey: string }
  | { readonly type: 'workshop.step'; readonly workshopId: string; readonly language: Language; readonly stepKey: string; readonly marked: boolean }
  | { readonly type: 'route.mark'; readonly kind: 'step' | 'milestone' | 'favorite'; readonly itemKey: string; readonly marked: boolean }
  | { readonly type: 'route.quiz'; readonly stepId: string; readonly answer: number; readonly contentVersion: string }
  | { readonly type: 'route.note'; readonly language: Language; readonly field: 'learned' | 'next'; readonly body: string }
  | { readonly type: 'preference.set'; readonly name: 'routeLanguage'; readonly value: Language }
  | { readonly type: 'preference.set'; readonly name: 'focusMinutes'; readonly value: FocusMinutes }
  | { readonly type: 'preference.set'; readonly name: 'labSelectedRust' | 'labSelectedGo'; readonly value: string };

export type Operation = OperationBody & { readonly id: string; readonly at: string };
```

`id` es un UUID v4 en minúsculas hecho con `crypto.getRandomValues` (FR-062). `at` es `new Date(Date.now() + clockOffsetMs).toISOString()`.

### 3.2 La clave de campo

Dos operaciones con la misma clave de campo tocan lo mismo. La clave decide qué se junta en la cola (FR-062) y qué fila de una respuesta no pisa un cambio pendiente (FR-064).

| `type` | Clave |
| --- | --- |
| `exercise.prediction`, `exercise.assist`, `exercise.hints`, `exercise.reflection`, `exercise.customTest`, `exercise.review`, `exercise.draft` | `<type>\|<exerciseId>` |
| `checkpoint.answer` | `checkpoint.answer\|<worldId>` |
| `workshop.prediction`, `workshop.note` | `<type>\|<language>\|<workshopId>` |
| `workshop.objective` | `workshop.objective\|<language>\|<workshopId>\|<objectiveKey>` |
| `workshop.step` | `workshop.step\|<language>\|<workshopId>\|<stepKey>` |
| `route.mark` | `route.mark\|<kind>\|<itemKey>` |
| `route.quiz` | `route.quiz\|<stepId>` |
| `route.note` | `route.note\|<language>\|<field>` |
| `preference.set` | `preference.set\|<name>` |

**Cómo se junta.** Una operación nueva reemplaza a la que espera con su misma clave y no está en camino en esta pestaña, con un `id` y un `at` nuevos (research-d1c.md, R5). `exercise.assist` suma las banderas de las dos; `exercise.hints` queda con el mayor `revealed`. Una operación en camino nunca cambia: se reenvía igual si su lote no tuvo respuesta.

## 4. La limpieza de los espacios (FR-069)

Al arrancar en modo `browser`, para cada `<otro>` que aparezca en una clave `taller-v2:<otro>:…` distinta de la cuenta actual:

| `taller-v2:<otro>:cola` | `taller-v2:<otro>:copia-epoca` | Qué pasa |
| --- | --- | --- |
| Ausente, o legible con `operations` y `deferred` vacías | Ausente | **Sincronizado:** se borran todas sus claves |
| Legible con algo pendiente, o con copia de la época | — | Si `touchedAt` tiene más de 30 días (`2 592 000 000` ms), **vencido**: se borran todas sus claves. Si no, queda |
| Ilegible | — | Queda: no se sabe si tiene algo sin enviar |

Nunca toca `taller-v2-compartida:*`, `taller-v1-importado:*` ni las claves v1.

## 5. La traducción de la forma v1 a operaciones

El motor compara el estado anterior de cada almacén (su línea base) con el nuevo, después de cada aviso de `changes`, y emite una operación por cada diferencia que el cable puede llevar. **Ninguna** sale de `solvedAt`, `result`, `attempts`, los sellos de campaña ni `code` de Sistemas (FR-009). Un registro vacío del laboratorio (`ensureRecord`, D1c-9) no emite nada.

| Área y campo v1 | Cuándo | Operación |
| --- | --- | --- |
| recorrido `language` | Cambió | `preference.set` `routeLanguage` |
| recorrido `minutes` | Cambió a 15, 25 o 45 | `preference.set` `focusMinutes` |
| recorrido `completed`, `milestones`, `favorites` | Un id entró o salió | `route.mark` con `kind` `step`, `milestone` o `favorite`, `marked` según el caso |
| recorrido `quizAnswers[paso]` | Cambió a un entero de 0 o más | `route.quiz` con la versión del contenido publicado |
| recorrido `notes[lenguaje][campo]` | Cambió | `route.note` |
| laboratorio `selected[lenguaje]` | Cambió a un id | `preference.set` `labSelectedRust` o `labSelectedGo` |
| laboratorio `prediction` y `predictionCorrect` | Cambió alguno y `prediction` es un entero | `exercise.prediction` con `correct: predictionCorrect === true` |
| laboratorio `assisted`, `solutionSeen` | Pasó a `true` | `exercise.assist` con las que pasaron |
| laboratorio `hints` | Subió a un entero de 1 o más | `exercise.hints` |
| laboratorio `reflection`, `customTest` | Cambió y es texto | `exercise.reflection`, `exercise.customTest` |
| laboratorio `draft` | Cambió a texto | `exercise.draft` con `starterHash` del ejercicio |
| laboratorio `draft` | Desapareció | `exercise.draft` con `code: null` y `starterHash: null` («restaurar inicio») |
| laboratorio `confidence`, `reviewedAt`, `reviewAt` | Cambió alguno y están los tres | `exercise.review` con los dos instantes en ISO |
| campaña `checkpoints[mundo].lastAnswer` | Cambió a un entero | `checkpoint.answer` con `passed` del registro |
| Sistemas `records[l:t].answer` | Cambió a un entero | `workshop.prediction` con `correct: predicted` |
| Sistemas `records[l:t].note` | Cambió | `workshop.note` |
| Sistemas `records[l:t].observed` | Entró una clave | `workshop.objective` |
| Sistemas `records[l:t].steps` | Entró o salió una posición con etapa | `workshop.step` con `stepKey` = id de la etapa en esa posición |

Los textos se envían con los sustitutos sueltos reemplazados por U+FFFD (D1a, http.md §7), con una expresión regular propia: `toWellFormed` es de ES2024 y la librería del front es ES2022.

## 6. La traducción de las filas a la forma v1

Al recibir una foto o un delta, el motor escribe en cada almacén lo que dicen las filas, salvo un campo con una operación pendiente cuyo reloj no es más viejo que el de la fila (`incomingWins` de `merge-rules.ts`). Una fila de contenido que el catálogo publicado no tiene se salta y queda en la copia (riesgo 7 de A3).

| Fila | Campo v1 |
| --- | --- |
| `exercises[].prediction.answer` | `lab.records[id].prediction` |
| `exercises[].predictionCorrect.value`, `assisted`, `solutionSeen` | `predictionCorrect`, `assisted`, `solutionSeen`, con OR contra lo local |
| `exercises[].hintsRevealed` | `hints`, el mayor |
| `exercises[].reflection.text`, `customTest.text` | `reflection`, `customTest` |
| `exercises[].review` | `confidence`, `reviewedAt` y `reviewAt` en milisegundos; un `null` borra el campo |
| `exercises[].solvedAt` | `solvedAt` en milisegundos, el más temprano |
| `drafts[].code` | `draft`; `null` lo borra |
| `campaign.checkpoints[]` | `checkpoints[mundo]`: `passed` con OR, `lastAnswer` del reloj |
| `campaign.seals[]` | `seals[id]`, con OR por bandera |
| `workshops.progress[]` | `records[l:t]`: `code` y `predicted` con OR, `answer` y `note` |
| `workshops.objectives[]` | `observed`, con la clave sumada |
| `workshops.steps[]` | `steps`, con la posición de la etapa sumada o quitada |
| `route.marks[]` | `completed`, `milestones` o `favorites`, con el id sumado o quitado |
| `route.quiz[]` | `quizAnswers[paso]` |
| `route.notes[]` | `notes[lenguaje][campo]` |
| `preferences` | `route.language`, `route.minutes`, `lab.selected` |

Una fila ausente no borra nada: sólo «Borrar todo» borra, y lo informa la época (FR-011), no la foto. Por eso una foto vacía no pisa lo que el alumno tiene en el espacio y todavía no llegó a la cola (research-d1c.md, R6).

`proof`, `lastAttempt`, `attemptCount`, `legacyAttempts` y `serverSolvedAt` no van a la forma v1: los expone `exerciseSummary`.

## 7. Los límites

| Qué | Valor | Fuente |
| --- | --- | --- |
| Formato del sobre | `2` | http.md §3.1 |
| Operaciones por lote | 200 | http.md §3.7 |
| Bytes por lote | 1 572 864 (1,5 MiB, bajo los 2 MiB de Nginx) | http.md §3.7; research-d1c.md, R7 |
| Bytes por lote con `keepalive` | 61 440 (60 KiB, bajo los 64 KiB del navegador) | MDN, `RequestInit.keepalive` |
| Pedidos por minuto | 60, en una ventana deslizante | FR-063 |
| Espera después de un cambio | 2 000 ms, con un máximo de 10 000 ms de cambios seguidos | research-d1c.md, R7 |
| Consultas sin cambios | Una por minuto como mucho, al volver a la pestaña | FR-063 |
| Reintentos | 5 s, 15 s, 30 s y 60 s, y después cada 60 s; `Retry-After` manda | research-d1c.md, R7 |
| Espera de la foto al arrancar | 3 000 ms con una copia local; 10 000 ms sin ella | research-d1c.md, R8 |
| Vencimiento de un espacio | 30 días | FR-069 |
| Aviso del reloj | más de 120 000 ms | FR-078 |
