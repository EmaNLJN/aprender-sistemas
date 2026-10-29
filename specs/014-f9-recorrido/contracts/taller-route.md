# Contrato: `window.TallerRoute` y la API pública de `pages/route`

**Plan:** [../plan.md](../plan.md) · **Spec:** [../spec.md](../spec.md) (FR-009, FR-010, FR-014, FR-015, FR-026 a FR-032)

Las interfaces que otros consumen: `app.js` lee el adaptador hasta F10; F8 importa el reinicio del temporizador de la API pública de la página; F3 y F4 heredan los selectores y la operación de alternar de `entities/guide`. Los nombres son definitivos para la implementación de F9.

## 1. `window.TallerRoute` (adaptador legacy)

Lo publica `frontend/src/app/legacy/register-route.tsx`. Se evalúa en la cadena de `frontend/src/app/boot/legacy-views.ts` antes que `app.js`.

```ts
declare global {
  interface Window {
    TallerRoute: Readonly<{
      mount: (host: HTMLElement | null, language: string, toast: (message: string) => void) => void;
      unmount: () => void;
      resetTimer: () => void; // sólo en la rama A (F9 antes que F8); ver §4
    }>;
  }
}
```

| Método | Lo llama | Qué hace | Lo retira |
| --- | --- | --- | --- |
| `mount(host, language, toast)` | `render()` de `app.js`, cuando la vista es `recorrido`, sin `?.` (la restricción de `load-order-check`) | Desmonta lo anterior; si `host` es `null`, no hace nada; valida el idioma (`'go'` o, si no, `'rust'`); crea la raíz con `onUncaughtError` («No se pudo mostrar el recorrido.» por `console.error`) y dibuja `RoutePage` con `guide={getContent().guide}`, `language` y `notify={toast}` dentro de `flushSync`: cuando vuelve, la página está en el DOM | F10 |
| `unmount()` | `render()` de `app.js`, con `?.`, junto a los otros desmontajes | Desmonta la raíz, con la lección si estaba abierta; el temporizador sigue | F10 |
| `resetTimer()` | el segundo paso de `sessionResets` de `app.js` (`() => window.TallerRoute?.resetTimer()`), después de las simulaciones y antes del `save()` | `focusTimer.reset()`: detiene, cancela el intervalo y vuelve a reposo; con el temporizador en reposo o nunca usado, no hace nada y no lanza | F8 (rama A) |

**Evaluar el módulo** publica el global y no hace nada más: no toca el almacenamiento, no abre el almacén, no registra oyentes ni crea intervalos (FR-015). Lo comprueba el escenario de `boot-check` «main.tsx without its call evaluates quietly and leaves #main empty».

**No importa `routeStore`** (R4 de `seams-guard-check`). Importa `RoutePage` y `focusTimer` del índice de `pages/route`, y `getContent` de `app/content`.

## 2. La API pública de `frontend/src/pages/route` (`index.ts`)

```ts
export { default as RoutePage } from './ui/RoutePage';
export { focusTimer } from './model/focus-timer';
export type { FocusTimer, FocusTimerPhase, FocusTimerState } from './model/focus-timer';
```

### `RoutePage`

```ts
interface RoutePageProps {
  guide: GuideData; // getContent().guide, entero: las dos pistas y los recursos
  language: GuideLanguage; // el idioma vivo del shell al montar
  notify: (message: string) => void; // el toast del shell
  store?: RouteStore; // por omisión, el singleton routeStore; sólo las specs pasan otra instancia
}
```

- Lee el progreso con `store.getProgress()` en cada render y se suscribe sólo a `useStore(store.changes, (state) => state.revision)`.
- Escribe una vez por acción del alumno: alternar un paso con `store.toggleMark('completed', id)`, la operación de F4; la respuesta y la duración, con `store.save()`.
- Dibuja la lección con un portal a `document.body`.
- No lee `window`, `location` ni `getContent()`.

### `focusTimer` (el módulo de sesión del temporizador)

```ts
export type FocusTimerPhase = 'idle' | 'running' | 'paused' | 'finished';

export interface FocusTimerState {
  phase: FocusTimerPhase;
  remaining: number; // segundos; vale en running, paused y finished (0)
  deadline: number; // milisegundos de Date.now(); vale en running
}

export interface FocusTimer {
  readonly state: StoreApi<FocusTimerState>; // zustand/vanilla
  toggle(minutes: number, notify: (message: string) => void): void;
  reset(): void;
}

export const focusTimer: FocusTimer;
```

| Llamada | Desde | Resultado |
| --- | --- | --- |
| `toggle(m, notify)` en `idle` o `finished` | | `running`, desde `m * 60` segundos, con un intervalo de 500 ms |
| `toggle(m, notify)` en `paused` | | `running`, desde el restante |
| `toggle(m, notify)` en `running` | | recalcula el restante: si es 0, `finished` y avisa una vez por `notify`; si no, `paused`. Cancela el intervalo |
| cada tick en `running` | | recalcula el restante desde el vencimiento; si llega a 0, `finished`, cancela el intervalo y avisa una vez |
| `reset()` | | `idle` y ningún intervalo; sin efecto si ya estaba en reposo |

**Los dígitos** son `timerDigits(displayedSeconds(state, minutes))` y **el rótulo**, `timerButtonLabel(phase, seconds, minutes)`. Están en `model/focus-timer.ts` y no son parte de la API pública.

**Lo que garantiza:**

- con la fase distinta de `running` no hay ningún temporizador vivo (`vi.getTimerCount() === 0`);
- evaluar el módulo no crea temporizadores ni lee `routeStore`;
- sobrevive al desmontaje de la página y se pierde al recargar.

## 3. Lo que suma `entities/guide` (índice)

```ts
export function trackSteps(track: GuideTrack): GuideStep[];
export function countCompletedSteps(steps: readonly GuideStep[], completed: readonly string[]): number;
export function nextPendingStep(steps: readonly GuideStep[], completed: readonly string[]): GuideStep | undefined;
```

Los usan la página y `app.js`: `stepsFor` y `completedCount` de la barra lateral. La operación de alternar no se suma: es `routeStore.toggleMark(collection: RouteMarkCollection, id: string): boolean`, que F4 ya dejó en el almacén (`frontend/src/entities/guide/model/route-store.ts:27`) y que usan también Proyecto y la Biblioteca.

## 4. Las dos ramas de `resetTimer` (F8-Q2)

| Rama | Cuándo | `window.TallerRoute` | Quién reinicia el temporizador en «Borrar todo» |
| --- | --- | --- | --- |
| A | F9 entra antes que F8 | `mount`, `unmount` y `resetTimer` | `sessionResets` de `app.js`: `() => window.TallerRoute?.resetTimer()`, segundo paso |
| B | F8 ya está en `master` | `mount` y `unmount` | El armado de `src/app/` que dejó F8: importa `focusTimer` del índice de `pages/route` y registra `() => focusTimer.reset()` como el último paso de sesión, después de las simulaciones |

En los dos casos el orden de «Borrar todo» es el de hoy: los cuatro almacenes, las simulaciones, el temporizador y después el `save()`.

La rama B deja dos métodos donde FR-014, SC-006 y US5-2 dicen tres. Manda la regla de orden de F8-Q2. Es un hallazgo del informe.
