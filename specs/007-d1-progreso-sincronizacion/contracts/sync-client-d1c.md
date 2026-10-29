# Contrato del cliente v2 (D1c): lo que consumen F11d, F13, F8 y el arranque

**Input**: [spec.md](../spec.md) (FR-060 a FR-079, FR-085 y FR-086, con las enmiendas de D1c al FR-070, al FR-074 y al FR-077), [plan-d1c.md](../plan-d1c.md), [data-model-d1c.md](../data-model-d1c.md) y [research-d1c.md](../research-d1c.md). Los contratos HTTP que el cliente usa son los de D1a ([http.md](./http.md)) y D1b ([http-d1b.md](./http-d1b.md)), que este documento cita y no repite.

Las rutas son relativas a `frontend/src/`. Un slice se importa por su `index.ts`. Una tarea que cambia una firma de este contrato lo cambia en el mismo commit.

## 1. La frontera

D1c es la mecánica: la copia local con su cola, el espacio por cuenta, la sincronización, la detección de la cuenta distinta, de la época y del desfase, la importación y el borrado contra la API, y la guarda contra el solape. **No dibuja nada** (FR-077). Expone tres cosas:

- **un estado** con suscripción, en un almacén vanilla de Zustand (`ProgressSync.state`);
- **unos avisos** que viven en ese estado hasta que alguien los resuelve (la cuenta distinta, la época cambiada, los rechazos, el desfase y la pregunta de la importación);
- **unas acciones** que llaman las pantallas de otros ítems.

| Superficie | Dueño | Qué lee o llama de D1c |
| --- | --- | --- |
| «Computadora compartida» en «Tu cuenta» y su aviso del almacenamiento bloqueado | F11d (F11 FR-062 y FR-063) | `mode`, `enterSharedMode()`, `leaveSharedMode()` |
| «¿Este progreso es tuyo?», su resumen, la repregunta del 409 y el informe | F11d (F11 FR-064 y FR-065) | `importQuestion`, `answerImport(yes)`, `lastImport` |
| «Salir» con la cola sin enviar: la espera, la pregunta (conservar, descartar o descargar) y la nota junto al botón | F13 (su L7, aceptada con el merge de su spec, PR #79; reemplaza la línea de la noche que se lo daba a F11d) | El puerto de `signOut` (sección 5): `onPhase` para la espera, `choose` para la pregunta; `downloadUnsent()` para «Descargar una copia»; `mode` para elegir las opciones |
| El estado de la cuenta, la franja, el diálogo de cuenta distinta y la confirmación al cerrar | F13 | todo el estado y `downloadUnsent()`, `downloadEpochCopy()`, `discardEpochCopy()`, `dismissEpochChange()` y `acknowledgeRejected()` |
| «Borrar todo» y «Importar» de Método | F8, con el armado de `app/progress-backup` que D1c envuelve (sección 6) | nada directo: la página sigue llamando a `ProgressBackup` |
| La línea de intentos de la revisión del laboratorio | la vista vigente del laboratorio (D1c-6) | `currentProgressSync()?.exerciseSummary(exerciseId)`: las vistas que no viven bajo `AccountRoot` leen el motor por este acceso de `features/progress-sync` |

## 2. El estado

```ts
// features/progress-sync/model/types.ts
import type { StoreApi } from 'zustand/vanilla';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error' | 'signed-out' | 'outdated';
export type StorageMode = 'browser' | 'shared' | 'blocked';
export type LeftReason = 'offline' | 'error' | 'signed-out' | 'outdated' | 'account-changed';
export type ImportSource = 'storage' | 'export';
export type ProofState = 'current' | 'changed' | 'legacy';

export interface AccountMismatch {
  readonly lostOnReload: number; // cambios que se pierden al recargar: 0 en modo browser
}

export interface EpochCopyInfo {
  readonly count: number; // operaciones guardadas en la copia
  readonly persisted: boolean; // true: sobrevive a recargar (modo browser)
}

export interface EpochChange {
  readonly resetAt: string | null; // ISO de la foto nueva
  readonly ownReset: boolean; // true: el «Borrar todo» de esta pestaña
  readonly copy: EpochCopyInfo | null; // null: no quedaba nada sin enviar
}

export interface V1Summary {
  readonly solvedCount: number; // registros del laboratorio con solvedAt
  readonly lastResultAt: string | null; // ISO del result.time más nuevo
}

export interface ImportQuestion {
  readonly source: ImportSource;
  readonly summary: V1Summary;
  readonly stage: 'offer' | 'confirm'; // offer: la primera pregunta; confirm: después del 409
}

export interface ImportReport {
  readonly written: Readonly<Record<string, number>>; // las doce áreas de http-d1b.md, §3.5
  readonly omitted: readonly { readonly path: string; readonly reason: string }[];
  readonly replaced: readonly { readonly path: string; readonly reason: string }[];
  readonly conflicts: readonly { readonly path: string; readonly reason: string }[];
}

export interface ExerciseSummary {
  readonly attemptCount: number;
  readonly legacyAttempts: number;
  readonly proofState: ProofState | null;
  readonly serverSolvedAt: string | null;
}

export interface ProgressSyncState {
  readonly status: SyncStatus | null; // null antes del primer informe
  readonly mode: StorageMode;
  readonly unsentCount: number; // operaciones en la cola
  readonly lostOnUnload: number; // cola más copia de la época, sólo si viven en memoria
  readonly clockSkewMs: number | null; // reloj del dispositivo menos el del servidor
  readonly rejectedCount: number; // rechazos acumulados hasta acknowledgeRejected()
  readonly accountMismatch: AccountMismatch | null;
  readonly epochChange: EpochChange | null;
  readonly importQuestion: ImportQuestion | null;
  readonly lastImport: ImportReport | null;
  readonly importNotice: string | null; // el aviso de la última importación (sección 8)
  readonly busy: 'import' | 'reset' | null; // la guarda contra el solape (F8-Q3)
}
```

**Cuándo vale cada estado** (`status`):

| Valor | Cuándo |
| --- | --- |
| `null` | Antes de que la etapa de arranque termine |
| `synced` | La cola está vacía y el último pedido respondió bien |
| `pending` | Hay operaciones en la cola o un lote en camino, y el último pedido respondió bien (o todavía no hubo ninguno) |
| `offline` | El último envío falló por la red (`fetch` rechazó o se abortó por la espera), nunca por `navigator.onLine` |
| `error` | Un 5xx, un 503 (`content_not_imported` u otro), un 429, un 422 del sobre o una respuesta que no es JSON |
| `signed-out` | Un 401, o un 419 después del cual la sesión ya no tiene cuenta |
| `outdated` | Un 409 `client_outdated` |

Un 403 `account_disabled` no cambia `status`: el cliente deja de enviar y la cola queda en el espacio, y la pantalla es la de F11 (FR-023). Con `accountMismatch` distinto de `null`, el cliente no envía nada más hasta recargar, y `status` queda como estaba.

**Los modos** (`mode`):

| Valor | Cuándo | Dónde viven la copia y la cola | Lo que dicen los almacenes |
| --- | --- | --- | --- |
| `browser` | `localStorage` responde y la cuenta no eligió el modo compartido | En el espacio `taller-v2:<id>:…` | `storageAvailable()` como hoy |
| `shared` | La cuenta eligió «computadora compartida» (FR-070 enmendado) | En memoria | `storageAvailable()` en `false`, sin aviso de carga |
| `blocked` | Leer `localStorage` lanza | En memoria | `status: 'unavailable'`: el aviso y el pie de hoy, sin cambios (ADR 0003) |

**El desfase** (`clockSkewMs`) sale sólo de las respuestas de `POST /api/sync`: `sentAt − serverTime`, en milisegundos y con signo. Positivo es un reloj adelantado. `GET /api/progress` no lo mueve, así que el `serverTime` de la lectura no importa (research-d1c.md, R9).

## 3. Las acciones

```ts
// features/progress-sync/model/types.ts
export type FlushOutcome =
  | { readonly kind: 'sent' }
  | { readonly kind: 'left'; readonly count: number; readonly reason: LeftReason };

export type SignOutChoice = 'keep' | 'discard';

export interface UnsentFile {
  readonly fileName: string;
  readonly text: string;
}

export interface ProgressSync {
  readonly state: StoreApi<ProgressSyncState>;
  flushNow(): Promise<FlushOutcome>;
  afterSignOut(choice: SignOutChoice): void;
  downloadUnsent(): UnsentFile | null;
  downloadEpochCopy(): UnsentFile | null;
  discardEpochCopy(): void;
  dismissEpochChange(): void;
  acknowledgeRejected(): void;
  answerImport(yes: boolean): Promise<void>;
  enterSharedMode(): Promise<void>;
  leaveSharedMode(): void;
  exerciseSummary(exerciseId: string): ExerciseSummary | null;
}
```

| Acción | Qué hace | Lo que no hace |
| --- | --- | --- |
| `flushNow()` | Envía toda la cola en lotes, sin esperar el temporizador, y termina con `sent` o con lo que quedó y su motivo | No cierra la sesión ni toca el espacio |
| `afterSignOut('keep')` | Deja la cola y la copia en el espacio, con `touchedAt` de ahora (FR-068: vence a los 30 días) | Se llama sólo después del 204 o del 401 del cierre |
| `afterSignOut('discard')` | Borra el espacio de la cuenta (la copia, la cola y las claves de los almacenes con sus respaldos), o la memoria en los modos `shared` y `blocked`. En `browser`, la copia de la época queda: tiene su propio descarte (F13 FR-026) | No toca las claves v1, el archivo `taller-v1-importado:<id>` ni el espacio de otra cuenta |
| `downloadUnsent()` | Devuelve el archivo con la cola y la copia de la época (sección 7), o `null` si no hay nada | No vacía la cola |
| `downloadEpochCopy()` | Devuelve el archivo con la copia de la época, o `null` | No la borra |
| `discardEpochCopy()` | Borra la copia de la época y pasa `epochChange.copy` a `null` | No pide confirmación: la pide la pantalla (F13 FR-026) |
| `dismissEpochChange()` | Pasa `epochChange` a `null`, y con él la copia | — |
| `acknowledgeRejected()` | Pasa `rejectedCount` a 0 | Los cambios rechazados siguen en los almacenes (F13 L4) |
| `answerImport(true)` | Con `stage: 'offer'`, envía la importación sin `confirm`; con `stage: 'confirm'`, la reenvía con `confirm: true` y la misma `importId` | Sin pregunta abierta, no hace nada |
| `answerImport(false)` | Cierra la pregunta. En una importación de archivo, la promesa de Método resuelve «No se importó la copia.» | No toca las claves v1: se vuelve a ofrecer en el próximo documento |
| `enterSharedMode()` | Borra en ese momento el espacio de la cuenta, guarda la elección y pasa la cola a memoria (FR-070 enmendado) | No borra la copia del contenido: eso lo llama F11d con `forgetContentCopy()` de A3 (research-d1c.md, R15) |
| `leaveSharedMode()` | Borra la elección; el documento sigue en memoria y el próximo guarda en el espacio | — |
| `exerciseSummary(id)` | Devuelve el conteo de intentos, los legados, el estado de la prueba aprobada y `serverSolvedAt` de la copia, o `null` si la copia no tiene la fila | No lee la red |

## 4. Contraste con «Lo que F13 supone de D1c»

La tabla de F13 (`spec-f13` en `c0ac6672`, `specs/027-f13-sincronizacion/spec.md`, «Lo que F13 supone de D1c») fila por fila:

| F13 supone | D1c | ¿Igual? |
| --- | --- | --- |
| Un estado con seis valores (al día, pendiente, sin conexión, error, requiere ingreso y pestaña vieja) y la cantidad de cambios en la cola | `status` (`synced`, `pending`, `offline`, `error`, `signed-out`, `outdated`) y `unsentCount` | Igual. Los nombres del cable son en inglés; F13 los traduce con su tabla |
| «Sin conexión» por un envío fallido, no por `navigator.onLine` | `offline` sale de un `fetch` que rechaza. `online` sólo adelanta el reintento | Igual |
| El modo de guardado y si el progreso se guarda en este navegador | `mode`: se guarda sólo con `browser` | Igual |
| Cuántos cambios se perderían si el documento se descarga | `lostOnUnload`: la cola más la copia de la época, y sólo en `shared` o `blocked` | Igual |
| Un evento de cuenta distinta, con los cambios que se perderían al recargar; desde ahí, D1c no envía nada | `accountMismatch.lostOnReload`; el motor se detiene | Igual |
| Un evento de época cambiada, con `resetAt`, si fue el «Borrar todo» de esta pestaña y la copia con su cantidad, «descargar» y «descartar» | `epochChange` con `resetAt`, `ownReset` y `copy.count`; `downloadEpochCopy()` y `discardEpochCopy()`. Con `ownReset: true`, `copy` siempre es `null`: el «Borrar todo» propio descarta la cola, que es parte de lo que se borra | Igual, con esa precisión |
| Si la copia de la época sobrevive a recargar o vive en memoria | `epochChange.copy.persisted`. En `browser` el aviso vuelve después de recargar: el arranque lo reconstruye desde `taller-v2:<id>:copia-epoca` | Igual |
| El desfase en milisegundos, con signo, del último `serverTime` | `clockSkewMs`, de la última respuesta de `POST /api/sync` | Igual. **Distinto en un punto:** la lectura `GET /api/progress` no lo mueve |
| La cantidad de operaciones rechazadas de cada lote | `rejectedCount`, acumulado hasta `acknowledgeRejected()` (F13 FR-027 suma rechazos al aviso abierto) | Igual |
| «Enviar ahora» para «Salir», con «enviado» o lo que quedó y su motivo (sin conexión, el taller no responde o la sesión venció) | `flushNow()` con `reason` `offline`, `error` o `signed-out` | **Distinto:** suma `outdated` y `account-changed`, que F13 puede tratar como «el taller no responde» y como la cuenta distinta |
| Conservar o descartar lo no enviado después del cierre | `afterSignOut('keep' \| 'discard')` | Igual |
| «Descargar lo que no se envió» con la cola en memoria | `downloadUnsent()`, en cualquier modo | Igual |
| Respuestas por omisión de `POST /api/sync` y `GET /api/progress` en el doble, con una cuenta al día y un `serverTime` que sigue el reloj de la página | La sincronización responde `serverTime` igual al `sentAt` del lote; la lectura conserva el valor fijo que dejó F8 (o el que haya), porque no mueve el desfase | Igual en la sincronización; en la lectura, D1c lo decide así |

Lo que D1c agrega y F13 no pedía: `busy` (la guarda de F8-Q3), `importQuestion` y `lastImport` (F11d) y `exerciseSummary` (D1c-6).

## 5. «Salir»: el puerto de `signOut`

D1c suma un puerto a `features/sign-in` sin importar su slice (FR-068: la mecánica y el pedido a la API son de D1c; la pantalla, de otro ítem).

```ts
// features/sign-in/model/sign-out.ts (D1c agrega `progress` y `choose`)
export interface SignOutProgress {
  flushNow(): Promise<{ readonly kind: 'sent' } | { readonly kind: 'left'; readonly count: number; readonly reason: string }>;
  afterSignOut(choice: 'keep' | 'discard'): void;
}

export type SignOutLeftover = { readonly count: number; readonly reason: string };
export type ChooseAfterLeftover = (left: SignOutLeftover) => Promise<'keep' | 'discard' | 'stay'>;
export type SignOutPhase = 'sending' | 'leaving';

export interface SignOutDependencies {
  readonly client: ApiClient;
  readonly userId: number;
  readonly forgetContentCopy: () => Promise<void>; // de A3
  readonly progress?: SignOutProgress; // de D1c
  readonly choose?: ChooseAfterLeftover; // la pregunta de F13; sin ella, 'keep'
  readonly onPhase?: (phase: SignOutPhase) => void; // la espera de F13: 'sending' y después 'leaving'
}

export type SignOutOutcome =
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'stayed' }
  | { readonly kind: 'failed'; readonly failure: ApiFailure };

// features/sign-in/ui/sign-out-progress-context.ts
export const SignOutProgressContext: Context<SignOutProgress | null>;
export function useSignOutProgress(): SignOutProgress | null;
```

**El orden** (el de F13, «El orden de "Salir"»):

1. con `progress`, `onPhase?.('sending')` (F13: «Enviando tus cambios…») y `await progress.flushNow()`;
2. si quedó algo: con `choose`, su respuesta (`stay` termina en `{kind: 'stayed'}` sin cerrar nada); sin `choose`, `keep`. Si no quedó nada, `discard` (FR-068: «si la envió, limpia el espacio»);
3. `onPhase?.('leaving')` (F13: «Saliendo…») y `POST /api/auth/logout`; si falla, `{kind: 'failed'}` y nada se descartó;
4. con el 204, el 401 o el 403 `account_disabled`: `progress.afterSignOut(choice)`, después `forgetContentCopy()`, y `{kind: 'signed-out'}`.

`SignOutSection` y `PrivacyReacceptance` leen el puerto con `useSignOutProgress()` y lo pasan. `AccountRoot` lo provee con el motor de D1c. D1c no pasa `choose` ni `onPhase` y no cambia ningún texto de «Salir»: los pasa F13 cuando dibuja la espera, la pregunta y su nota (F13 FR-030 a FR-034). En memoria, la opción «Descargar una copia» de F13 llama a `downloadUnsent()` del motor y después responde `discard` a `choose`.

## 6. El armado de `app/progress-backup` con D1c

`appProgressBackup()` (F8) devuelve la misma interfaz `ProgressBackup`, envuelta:

| Método | Antes (F8) | Con D1c |
| --- | --- | --- |
| `exportProgress`, `listBackups`, `readBackup` | Locales | Locales, sobre el espacio de la cuenta (los almacenes leen y escriben ahí) |
| `planImport(text)` | El plan local | El plan local; el envoltorio recuerda el texto de ese plan |
| `applyImport(plan)` | La fusión local | `POST /api/progress/import` con `source: 'export'`, bajo la guarda. Resuelve `{notice}` con uno de los textos de la sección 8 |
| `resetAll(confirmation)` | El paso del servidor de F8 y el borrado local | Lo mismo, bajo la guarda y sin encolar nada: limpia el espacio de la cuenta (nunca las claves v1, FR-074 enmendado), descarta la cola, carga la foto de la época nueva y deja `epochChange` en `null` |

Con la guarda ocupada, `applyImport` resuelve `{notice: BUSY}` y `resetAll`, `{refusal}` con `generalMessages: [BUSY]`. Mientras el motor no arrancó (`isRunning()` en `false`: antes de la etapa, sin cuenta o si la etapa falló), los dos hacen lo de F8, sin cambios.

## 7. El archivo de lo no enviado

```json
{
  "format": "taller-cambios-sin-enviar",
  "version": 1,
  "userId": 41,
  "epoch": 1,
  "exportedAt": "2026-10-28T12:00:00.000Z",
  "operations": [{"id": "6f1c…", "type": "route.mark", "at": "2026-10-28T11:59:00.000Z", "kind": "step", "itemKey": "rust-1-1", "marked": true}]
}
```

`fileName` es `taller-cambios-sin-enviar-<AAAA-MM-DD>.json`. Las operaciones tienen la forma del cable de [http.md](./http.md), sección 3.2. **No se puede importar**: ni Método ni la API lo aceptan, y ninguna pantalla debe prometerlo (F13 FR-025).

## 8. Textos que devuelve D1c

Son los avisos que muestra quien llamó (el `#toast` de Método), en español:

| Constante | Texto |
| --- | --- |
| `BUSY` | Ya hay una importación o un borrado en curso: esperá a que termine. |
| `IMPORTED` | Copia importada y combinada con el progreso de tu cuenta. |
| `NOT_IMPORTED` | No se importó la copia. |
| `IMPORT_UNREACHABLE` | No se pudo importar: el taller no responde. Probá de nuevo más tarde. |
| `IMPORT_TOO_LARGE` | No se pudo importar: el archivo es demasiado grande para el taller. |
| `IMPORT_SIGNED_OUT` | Tu sesión venció: ingresá y volvé a importar la copia. |
| `IMPORT_EPOCH_MOVED` | Tu progreso se borró desde otra pestaña o dispositivo: volvé a importar la copia. |

Un 422 o un 429 de la importación devuelven `No se pudo importar: ` seguido del `message` del servidor.

## 9. La etapa de arranque y la costura del almacenamiento

```ts
// shared/lib/progress-storage.ts
export type ProgressPersistence = 'browser' | 'memory' | 'blocked';
export interface ProgressStorageBinding {
  readonly storage: StorageLike;
  persistence(): ProgressPersistence;
}
export function bindProgressStorage(binding: ProgressStorageBinding | null): void;
export function boundProgressStorage(): ProgressStorageBinding | null;

// app/progress-sync/progress-stage.ts
export const progressStage: BootStage; // name: 'progressStage'
```

- `runBoot([tokenStage, sessionStage, contentGate, progressStage, legacyViews])`: la etapa va después de la compuerta (necesita el contenido y la cuenta) y antes de las vistas (que abren los almacenes).
- `openVersionedStore` usa la vinculación cuando no recibe `storage`. Con `memory`, lee lo que hay y no escribe; con `blocked`, además informa `status: 'unavailable'`.
- La etapa nunca lanza y nunca espera más de 3 s con una copia local ni más de 10 s sin ella (research-d1c.md, R8).
