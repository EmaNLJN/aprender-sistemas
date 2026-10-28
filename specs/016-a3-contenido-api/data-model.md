# Data Model: A3 · El front lee el contenido de la API

**Input**: [spec.md](./spec.md), «Key Entities»; [research.md](./research.md), R4 a R10. Las firmas TypeScript están en [contracts/front-interfaces.md](./contracts/front-interfaces.md).

A3 no cambia la API ni la base de datos del backend. Lo nuevo vive en el navegador: la última copia del contenido en IndexedDB, y en memoria, mientras dura un arranque, la lectura de la sesión, el presupuesto del intento y la lectura del contenido.

## La última copia (IndexedDB)

**Dónde está:**

- **Base:** `taller-contenido`, versión 1. El almacén se crea en `upgradeneeded`.
- **Almacén:** `copia`, sin `keyPath` y con la clave fuera del valor.
- **Clave:** `ultima`. Hay a lo sumo un registro por origen (FR-022).

**El registro** (`ContentCopy`):

| Campo | Tipo | Regla |
| --- | --- | --- |
| `format` | número | `COPY_FORMAT`, hoy `1`. Otro valor descarta la copia (FR-017 y FR-018) |
| `version` | texto | La `contentVersion` de la sesión con que se publicó: 32 hexadecimales del `documentHash` |
| `confirmedAt` | texto ISO 8601 | La última vez que el servidor confirmó esta versión. Es la fecha del aviso, y la actualiza un arranque que confirma la copia (FR-015) |
| `portions` | objeto | Una entrada por cada una de las 17 porciones, `{etag, data}` |
| `portions[n].etag` | texto | El `ETag` tal como llegó, también débil (`W/"…"`). Se devuelve igual en `If-None-Match` |
| `portions[n].data` | JSON | La porción, con la forma de su nombre según `findPortionProblem` |

**Cuándo se usa** (`usableCopy`): con el formato vigente, `version` y `confirmedAt` de texto y las 17 porciones, cada una con su `etag` de texto y su forma.

- Una porción de más, como `harness` si A4 la guarda, se ignora y no invalida la copia.
- Una copia que no se puede usar se borra sin aviso.

**El invariante (FR-016):** la copia es la versión que este navegador publicó por última vez, o no hay copia.

| Momento | Qué pasa con la copia | Quién |
| --- | --- | --- |
| Antes de entregar contenido del servidor | Se borra, siempre | `createApiContentSource`, en `settleRound` |
| Después de publicar contenido del servidor | Se escribe completa, con `confirmedAt` = ahora | `afterPublish` de `content-stage.ts` |
| Después de publicar la copia confirmada (FR-005) | Se reescribe con `confirmedAt` = ahora | `afterPublish` |
| Después de publicar la copia sin servidor | No se toca; se muestra el aviso | `afterPublish` |
| La sesión responde `user: null` | Se borra (FR-021) | El lector de sesión |
| «Salir» terminó (204, 401 o 403 `account_disabled`) | Se borra antes de recargar (FR-021) | `signOut` |
| La copia leída no se puede usar | Se borra (FR-017) | `createApiContentSource`, en `readStoredCopy` |
| Al activar «computadora compartida» | Se borra, y desde ahí no se guarda | F11d y D1c, no A3 |

Las operaciones del almacén nunca rechazan, y se resuelven en 3 000 ms como mucho:

- `read()` da el registro o `null`;
- `write()` y `clear()` dan `true` cuando la transacción hizo `complete`, y `false` si no.

## La lectura de la sesión (`SessionRead`, en memoria)

Lo que entrega la lectura de la sesión a la fuente:

- **`{kind: 'ready', contentVersion: string | null}`:** la cuenta lista, con el aviso aceptado y sin token pendiente.
- **`{kind: 'unreachable', failure: 'network' | 'timeout' | 'status'}`:** el servidor no respondió.
  - `network`: no responde, un 5xx o algo que no es JSON;
  - `timeout`: se agotó el presupuesto;
  - `status`: un 429 que no cabe o que no trae `Retry-After`.

La primera la deja la etapa de sesión (`sessionStage.takeRead()`). Las siguientes, en cada ronda, después del ingreso y en cada «Reintentar», las hace el lector de la sesión de la compuerta. Con `user: null`, el lector borra la copia y espera «pedir el ingreso», así que nunca entrega una lectura sin cuenta.

## El presupuesto del intento (`AttemptBudget`, en memoria)

| Estado | Entra con | Sale con |
| --- | --- | --- |
| Detenido | La creación | `begin()` |
| Corriendo | `begin()`, o el final de `pausedWhile` | `pausedWhile` (en pausa) o `onExpired` (vencido) |
| En pausa | `pausedWhile(trabajo)` | El final del trabajo |

- **Lo que queda:** `remainingMs()` es 20 000 menos el tiempo corriendo desde `begin()`, sin contar las pausas.
- **El vencimiento:** cuando lo que queda llega a 0, llama a los oyentes registrados con `onExpired`.
- **Un intento nuevo:** `begin()` empieza otro presupuesto entero.

## La lectura del contenido (`ContentReading`, en memoria)

| Campo | Tipo | Regla |
| --- | --- | --- |
| `version` | texto | La única versión de la lectura. La compuerta exige que cada porción la tenga |
| `origin` | `'server'`, `'confirmed-copy'` o `'offline-copy'` | De dónde vino |
| `confirmedAt` | texto ISO | Ahora para `server` y `confirmed-copy`; la fecha de la copia para `offline-copy` |
| `portions` | `ServedPortion[]` | Las 17, cada una con `name`, `version`, `etag` y `data` |

## El intento, paso a paso

```text
etapa de sesión: begin() → GET /api/session ─┬─ 429 que cabe → esperar Retry-After → repetir
                                              ├─ user: null → borrar la copia → pedir el ingreso (en pausa) → repetir
                                              ├─ token o aviso sin aceptar → pedir el ingreso (en pausa) → repetir
                                              ├─ lista → takeRead() = ready
                                              └─ no responde o vence → takeRead() = unreachable
compuerta → fuente.read():
  leer la copia (a la vez)
  sesión = takeRead() o leer la sesión de nuevo
  unreachable o contentVersion null → la copia (si se puede usar) o la falla
  la copia en la versión de la sesión → confirmed-copy
  ronda: las 17 porciones con su If-None-Match
    401 (la primera vez) → pedir el ingreso (en pausa) → otra ronda
    401 otra vez → status · 403 → access
    una falla → la copia o la falla
    una versión distinta → otra ronda (3 como mucho) → la copia o version
    completa → borrar la copia → server
compuerta: publica → onPublished: escribir la copia y emitir la señal, o mostrar el aviso
```
