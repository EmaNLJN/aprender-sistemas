# Data model de F13: lo que el alumno ve de la sincronización

**Input**: [spec.md](./spec.md), [plan.md](./plan.md) y [research.md](./research.md). El estado que se dibuja es el de D1c ([contrato del cliente v2](../007-d1-progreso-sincronizacion/contracts/sync-client-d1c.md), §2 y §3, PR #93, `plan/d1c-cliente-v2` en `2e743c00`). F13 no guarda nada: este documento dice cómo se traduce ese estado a lo que se ve, y los dos estados chicos que viven en la interfaz.

## 1. Lo que F13 lee de D1c

| Campo de `ProgressSyncState` | Para qué lo usa F13 |
| --- | --- |
| `status` | La línea de la cuenta, el aviso de la sesión vencida, el de la pestaña vieja, los toasts y la nota de «Salir» |
| `mode` | Los textos «en memoria» (`shared` o `blocked`), las opciones de la pregunta al salir y los del diálogo de cuenta distinta |
| `unsentCount` | Si un episodio con problema dejó algo para avisar a la vuelta (los toasts) |
| `lostOnUnload` | La confirmación al cerrar, el aviso de la pestaña vieja en memoria y «Cambiaste de cuenta» |
| `clockSkewMs` | El aviso del reloj |
| `rejectedCount` | El aviso de los rechazos |
| `accountMismatch` | El diálogo de cuenta distinta y si la pregunta al salir se reemplaza |
| `epochChange` | El aviso de la época, con su copia |

F13 no lee `importQuestion`, `lastImport`, `importNotice` ni `busy` (son de F11d y de F8).

**Las acciones que llama:** `downloadUnsent()`, `downloadEpochCopy()`, `discardEpochCopy()`, `dismissEpochChange()` y `acknowledgeRejected()` del motor, y el puerto de `signOut` de D1c (`progress`, `choose` y `onPhase`).

## 2. La línea de la cuenta

`accountLine(status)` devuelve `null` con `status` en `null` (FR-005) y, si no, el texto y la familia del punto:

| `status` | Texto | Familia | Color del punto |
| --- | --- | --- | --- |
| `synced` | Sincronizado con tu cuenta | `synced` | `--color-green` (el de hoy) |
| `pending` | Enviando a tu cuenta… | `pending` | `--color-muted` |
| `offline` | Sin conexión con el taller | `problem` | `--color-recommended` |
| `error` | No pudimos sincronizar | `problem` | `--color-recommended` |
| `signed-out` | Sesión vencida | `problem` | `--color-recommended` |
| `outdated` | Pestaña vieja | `problem` | `--color-recommended` |

El punto lleva `aria-hidden="true"`; la línea no tiene `role` ni `aria-live` (FR-006 y FR-008). En «Tu cuenta», el mismo texto va en una lista de definición: `<dt>Tu progreso</dt><dd>…</dd>` (FR-007).

## 3. Los toasts

La memoria es `{status: SyncStatus | null, owed: boolean}`, que empieza en `{null, false}`. Con cada cambio del almacén:

1. `owed` pasa a `true` si el estado nuevo es `offline`, `error` o `signed-out` y `unsentCount` es mayor que 0; sigue en `true` mientras el estado no sea `synced`; con `synced`, vuelve a `false`.
2. Si el estado no cambió, no sale nada.
3. Si el estado nuevo es `offline` o `error` y el anterior era `synced` o `pending`, sale el toast del problema.
4. Si el estado nuevo es `synced` y la memoria tenía `owed`, sale «Listo: tus cambios llegaron a tu cuenta.».

| Toast | Navegador (`browser`) | En memoria (`shared` o `blocked`) |
| --- | --- | --- |
| Sin conexión | Sin conexión con el taller. Tus cambios quedan en este navegador y se envían cuando vuelva. | Sin conexión con el taller. Tus cambios viven sólo en esta pestaña: no la cierres hasta que se envíen. |
| Error | No pudimos sincronizar con el taller. Lo reintentamos solos. | No pudimos sincronizar con el taller. Lo reintentamos solos; no cierres la pestaña todavía. |
| La vuelta | Listo: tus cambios llegaron a tu cuenta. | Igual |

## 4. La franja

`activeNotices(input)` arma la lista en este orden. Cada aviso se va solo cuando su condición deja de cumplirse.

| Aviso | Condición | Texto | Botones | Cómo termina |
| --- | --- | --- | --- | --- |
| Pestaña vieja | `status === 'outdated'` | «Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.» y, con `lostOnUnload` mayor que 0, «Al recargar se pierden {n} cambios que no se enviaron.» | «Descargar lo que no se envió» (sólo con pérdida) y «Recargar» | Recargando |
| Sesión vencida | `status === 'signed-out'` | El de su modo (spec, «La franja») | «Ingresar» | Cuando D1c vuelve a enviar |
| Época cambiada | `epochChange !== null` y `!epochChange.ownReset` | «Tu progreso se borró desde otra pestaña o dispositivo {cuándo}. Te mostramos tu cuenta como quedó.» y, con copia, «{n} cambios de esta pestaña no llegaron a enviarse antes del borrado, y guardamos una copia.» | Sin copia, «Entendido»; con copia, «Descargar la copia» y «Descartar la copia» | `dismissEpochChange()` o `discardEpochCopy()`, o D1c lo quita |
| Rechazos | `rejectedCount > 0` | «{n} cambios no se pudieron guardar en tu cuenta. Por ahora siguen en este navegador, pero pueden perderse. Si se repite, avisale a quien administra el taller.» | «Entendido» | `acknowledgeRejected()` |
| Reloj | `clockSkewMs !== null`, `|clockSkewMs| > 120 000` y no se usó «Entendido» | «El reloj de este dispositivo está {n} minutos {adelantado \| atrasado}. Tus cambios se guardan igual, pero pueden perder contra los de otro dispositivo. Corregí la fecha y la hora del dispositivo.» | «Entendido» | El desfase baja a 120 000 ms o menos, o «Entendido» por lo que dura el documento |

**Las formas singulares** (`{n}` igual a 1):

- «Al recargar se pierde 1 cambio que no se envió.»
- «1 cambio de esta pestaña no llegó a enviarse antes del borrado, y guardamos una copia.»
- «¿Descartar la copia? Ese cambio no se puede recuperar.»
- «1 cambio no se pudo guardar en tu cuenta. Por ahora sigue en este navegador, pero puede perderse. Si se repite, avisale a quien administra el taller.»
- «Esta pestaña tiene 1 cambio que no llegó a enviarse, y se pierde al recargar. Si lo querés, descargá una copia antes.»
- «La cuenta anterior tiene 1 cambio en esta pestaña que no llegó a enviarse, y se pierde al recargar. Si lo querés, descargá una copia antes.»
- «1 cambio no se pudo enviar: {motivo}.»

**`{cuándo}`** (research, R10): «hoy a las H:MM», «ayer a las H:MM», «el D de MES a las H:MM» y, de otro año, «el D de MES de AAAA a las H:MM», con «a la» para la una, en la hora local. Con `resetAt` en `null`, la frase termina en «dispositivo.».

## 5. Los dos estados de la interfaz

| Estado | Dónde vive | Valor inicial | Qué lo cambia |
| --- | --- | --- | --- |
| El reloj ya entendido | `useState` de `SyncNoticeStrip` | `false` | «Entendido» del reloj; nunca vuelve a `false` en el documento (L5) |
| La confirmación del descarte | `useState` de `EpochNotice` | `false` | «Descartar la copia» la abre; «Cancelar» la cierra; «Descartar» llama a `discardEpochCopy()` y el aviso se va |
| La pregunta al salir | `useSignOutQuestion` en `pages/account` | sin pregunta | `choose` la abre con lo que quedó; cada respuesta la cierra |
| Lo que se pierde al cambiar de cuenta | `useState` de `SyncNotices` (`app/shell`) | `null` | La recarga de `reauthenticate` con otra cuenta y `lostOnUnload` mayor que 0 |

## 6. «Salir»

| Modo | Nota junto a «Salir» | Opciones de la pregunta |
| --- | --- | --- |
| `status === null` (sin estado de D1c) | «Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.» (FR-052 de F11) | Las de `browser`, si llegara a preguntar |
| `browser` | «Al salir, enviamos tus cambios a tu cuenta y borramos de este navegador lo que guardó.» | «Conservarlos y salir», «Descartarlos y salir» y «Volver al taller» |
| `shared` o `blocked` | «Al salir, enviamos tus cambios a tu cuenta. En este navegador no queda nada guardado.» | «Descargar una copia» (no cierra la pregunta), «Salir sin enviarlos» y «Volver al taller» |

| `reason` de D1c | Motivo en la pregunta |
| --- | --- |
| `offline` | no hay conexión con el taller |
| `signed-out` | tu sesión venció |
| `error`, `outdated` | el taller no responde |
| `account-changed`, con `accountMismatch` | Sin pregunta: `choose` responde `stay` |
| `account-changed`, sin `accountMismatch` | el taller no responde |

## 7. La confirmación al cerrar

El oyente de `beforeunload` está puesto si y sólo si `lostOnUnload > 0`. Ante una recarga elegida (`reloadWasChosen()` en `true`), no llama a `preventDefault()`.
