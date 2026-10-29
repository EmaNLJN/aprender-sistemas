# Quickstart: F10a · El spike del router y la red de E2E

Los comandos que verifican F10a. Corren desde la raíz del repositorio, salvo los del spike, que corren en la copia descartable (§2). [plan.md](./plan.md) dice qué tarea usa cada sección.

## 1. La línea base (T001)

1. **La red, en verde:**

   ```sh
   npm ci --offline --no-audit --no-fund
   npm run build && npm test && npm run lint && npm run format:check
   E2E_PORT=4173 npm run test:e2e
   ```

2. **El tope y el margen:**

   ```sh
   grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts
   ```

   Anotá el valor (1 500 000 desde #76). Después, con `chars` del paso 3: `margen = tope − chars` y `cuarto = margen / 4`, redondeado hacia abajo.
3. **El `dist`, en partes** (la misma medida que F4, `specs/013-f4-proyecto/quickstart.md`, §1):

   ```sh
   node -e '
   const fs=require("node:fs"),c=require("node:crypto");
   const sha=(s)=>c.createHash("sha256").update(s).digest("hex");
   const html=fs.readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   const script=/<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
   const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,"<script></script>").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,"<style></style>");
   console.log(JSON.stringify({chars:html.length,script:sha(script),style:sha(style),markup:sha(markup),dynamicImports:(html.match(/\bimport\(/g)||[]).length,importMeta:(html.match(/import\.meta/g)||[]).length}));'
   ```

   Anotá las seis cifras. F10a no cambia ninguna (plan.md, §0.2).
4. **La red, por archivo:**

   ```sh
   npx playwright test --config qa/e2e/playwright.config.ts --list | tail -1
   npx playwright test --config qa/e2e/playwright.config.ts --list | awk -F'›' '{print $2}' | sort | uniq -c
   ```

5. **Los escenarios de los tres checks:**

   ```sh
   grep -cE "^\s*(await )?test\(" qa/boot-check.ts qa/app-shell-check.ts
   node qa/load-order-check.ts
   ```

6. **El inventario que usa el spike:**

   ```sh
   grep -n "addEventListener('hashchange'\|addEventListener('popstate'" frontend/app.js
   grep -c "() => import(" frontend/src/app/boot/legacy-views.ts
   ```

7. **Los nombres que usan las E2E:**

   ```sh
   grep -n "language:" frontend/src/pages/library/model/library-query.ts
   node -e 'const d=require("./qa/fixtures/curriculum-ids.json");console.log(Object.keys(d.workshops)[0])'
   ```

   Lo esperado: `language: 'en'` (plan de F3) y `cache`.

## 2. El spike (T003 a T005)

### 2.1 La copia

```sh
SPIKE="$SCRATCHPAD/f10-spike" && rm -rf "$SPIKE" && mkdir -p "$SPIKE"
git archive "$(git rev-parse HEAD)" | tar -x -C "$SPIKE"
cd "$SPIKE" && npm ci --offline --no-audit --no-fund
```

En `$SPIKE/frontend/app.js`, las dos líneas de `hashchange` y `popstate` pasan a `startSpikeRouter(navigateFromLocation);`, y el bloque de imports suma `import { startSpikeRouter } from './src/app/spike-router';`.

Se copian a la copia, sin commitearlos, los archivos de plan.md §3.1 (`shell.ts`, `main-mounts.ts` y `store-openings.ts`), §3.2 (`shell-navigation.spec.ts`) y §3.3 (`shell-mounts.spec.ts`).

### 2.2 Las variantes de `frontend/src/app/spike-router.tsx`

Cada variante reemplaza el archivo entero. El código de unión puede ajustar tipos y nombres importados a la versión instalada, y el informe lo anota. La URL que se escribe y la que se lee no cambian.

**A · El router propio (la referencia del peso):**

```tsx
export function startSpikeRouter(onLocationChange: () => void): void {
  window.addEventListener('hashchange', onLocationChange);
  window.addEventListener('popstate', onLocationChange);
}
```

**B1 · React Router, modo de datos:**

```tsx
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter, useLocation } from 'react-router';
import { VIEWS } from '../shared/config/url-grammar';

interface LocationBridgeProps {
  onLocationChange: () => void;
}

const LocationBridge = ({ onLocationChange }: LocationBridgeProps) => {
  const location = useLocation();
  useEffect(() => {
    onLocationChange();
  }, [location, onLocationChange]);
  return null;
};

function spikeHost(): HTMLElement {
  const host = document.createElement('div');
  host.hidden = true;
  document.body.append(host);
  return host;
}

export function startSpikeRouter(onLocationChange: () => void): void {
  const element = <LocationBridge onLocationChange={onLocationChange} />;
  const router = createHashRouter([
    { path: '/', element },
    ...[...VIEWS, 'administracion'].map((view) => ({ path: `/${view}`, element })),
    { path: '*', element },
  ]);
  createRoot(spikeHost()).render(<RouterProvider router={router} />);
}
```

**B2 · React Router, modo declarativo** (sólo si B1 falla algún criterio). Es B1 con este `startSpikeRouter`, que importa `HashRouter` en lugar de `RouterProvider` y `createHashRouter`:

```tsx
export function startSpikeRouter(onLocationChange: () => void): void {
  createRoot(spikeHost()).render(
    <HashRouter>
      <LocationBridge onLocationChange={onLocationChange} />
    </HashRouter>,
  );
}
```

**C1 · TanStack Router con `createHashHistory`:**

```tsx
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { RouterHistory } from '@tanstack/history';
import {
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useLocation,
} from '@tanstack/react-router';
import { VIEWS } from '../shared/config/url-grammar';

interface LocationBridgeProps {
  onLocationChange: () => void;
}

const LocationBridge = ({ onLocationChange }: LocationBridgeProps) => {
  const href = useLocation({ select: (location) => location.href });
  useEffect(() => {
    onLocationChange();
  }, [href, onLocationChange]);
  return null;
};

function spikeHost(): HTMLElement {
  const host = document.createElement('div');
  host.hidden = true;
  document.body.append(host);
  return host;
}

function createSpikeRouter(onLocationChange: () => void, history: RouterHistory) {
  const rootRoute = createRootRoute({
    component: () => <LocationBridge onLocationChange={onLocationChange} />,
  });
  const viewRoutes = [...VIEWS, 'administracion'].map((view) =>
    createRoute({ getParentRoute: () => rootRoute, path: `/${view}` }),
  );
  return createRouter({ routeTree: rootRoute.addChildren(viewRoutes), history });
}

export function startSpikeRouter(onLocationChange: () => void): void {
  const router = createSpikeRouter(onLocationChange, createHashHistory());
  createRoot(spikeHost()).render(<RouterProvider router={router} />);
}
```

**C2 · TanStack Router con una historia propia** (sólo si C1 falla C1 o C2 del contrato). Es C1, que además importa `createHistory` y `HistoryLocation` de `@tanstack/history`, con este cierre:

```tsx
interface IndexedState {
  __TSR_index?: number;
}

function currentIndex(): number {
  return (window.history.state as IndexedState | null)?.__TSR_index ?? 0;
}

function readLocation(): HistoryLocation {
  const pathname = `/${window.location.hash.slice(1)}`;
  const search = window.location.search;
  return {
    href: `${pathname}${search}`,
    pathname,
    search,
    hash: '',
    state: { __TSR_index: currentIndex() },
  };
}

function toAddress(path: string): string {
  const searchStart = path.indexOf('?');
  const pathname = searchStart < 0 ? path : path.slice(0, searchStart);
  const search = searchStart < 0 ? '' : path.slice(searchStart);
  const view = pathname.replace(/^\//, '');
  return search === '' ? `#${view}` : `${search}#${view}`;
}

function createViewHistory(): RouterHistory {
  const history = createHistory({
    getLocation: readLocation,
    getLength: () => window.history.length,
    pushState: (path, state) => window.history.pushState(state, '', toAddress(path)),
    replaceState: (path, state) => window.history.replaceState(state, '', toAddress(path)),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    go: (delta) => window.history.go(delta),
    createHref: toAddress,
    notifyOnIndexChange: false,
  });
  window.addEventListener('popstate', () => history.notify({ type: 'GO', index: 0 }));
  return history;
}

export function startSpikeRouter(onLocationChange: () => void): void {
  const router = createSpikeRouter(onLocationChange, createViewHistory());
  createRoot(spikeHost()).render(<RouterProvider router={router} />);
}
```

### 2.3 La instalación de cada candidato, con permiso

```sh
cd "$SPIKE" && npm install --no-save react-router@<versión de T002>
cd "$SPIKE" && npm install --no-save @tanstack/react-router@<versión de T002>
```

Nunca en el repositorio. Sin el permiso de T002, el candidato no se instala y queda «no medido».

### 2.4 La medida de cada variante

```sh
cd "$SPIKE" && npm run build
node -e '<el script de §1, paso 3>'
E2E_PORT=4190 npx playwright test --config qa/e2e/playwright.config.ts url-contract views session-stage invitation reset-password access-hygiene shell-navigation library systems
E2E_PORT=4190 npx playwright test --config qa/e2e/playwright.config.ts reload shell-mounts --repeat-each=5
```

Qué prueba fija cada criterio:

| Criterio | Las pruebas | Pasa si |
| --- | --- | --- |
| C1 · `#vista` sin barra, `/` y `#` sin reescribir | `url-contract.spec.ts` y `views.spec.ts` enteras; «an address without a known view» de `shell-navigation.spec.ts` | Todas pasan |
| C2 · La query antes del hash, leída por `readLinkQuery` y por nuqs | `url-contract.spec.ts` (las URL exactas con `?…#vista`); los E2E de filtros de F3 (`library.spec.ts`) y de Sistemas de F5 | Todas pasan |
| C3 · Las 11 recargas | `reload.spec.ts`, «the links that change the query replace the document», 5 veces | 55 de 55 |
| C4 · El historial | `views.spec.ts`, «history»; «Back and Forward show the view of each entry» | Todas pasan |
| C5 · `replaceState` sin navegación ni remontaje, y nuqs las ve | `shell-mounts.spec.ts`, «the writes with replaceState mount nothing», 5 veces; el E2E de F3 sobre el `replaceState` ajeno | Todas pasan |
| C6 · Los tokens antes del router | `session-stage`, `invitation`, `reset-password` y `access-hygiene` de F11a | Todas pasan |
| C7 · El hash desconocido sin reescribir | `url-contract.spec.ts` y «/#loquesea shows the route and keeps the address» | Todas pasan |
| C8 · Lo que sobrevive en memoria | `reload.spec.ts`, «what stays in memory», 5 veces | Todas pasan |

Por cada variante se anotan `chars`, el aumento sobre la variante A y, por cada criterio que falle, el primer error con su prueba. La fila va en research.md, «Resultado del spike».

### 2.5 El cierre del spike

```sh
rm -rf "$SCRATCHPAD/f10-spike"
```

## 3. La compuerta de F10a (T014)

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4173 npm run test:e2e
E2E_PORT=4173 npx playwright test --config qa/e2e/playwright.config.ts shell-navigation shell-mounts shell-language shell-sidebar boot-order --repeat-each=5
git diff --name-only <base> -- . ':!qa/e2e' ':!specs/024-f10-shell'
git diff --name-only <base> -- qa/e2e/specs
```

Lo esperado:
- todo en verde;
- el `dist` con las seis cifras de §1, paso 3;
- el primer `git diff` vacío;
- el segundo, con sólo los cinco archivos nuevos (más `boot-order.spec.ts` si T013 sumó las importaciones).

## 4. Las mutaciones

Cada una se aplica en una copia descartable de la base, se construye y se corre la spec nombrada. Tiene que fallar la prueba nombrada, por la razón nombrada.

| Tarea | El cambio en `frontend/app.js` de la copia | Falla | Por qué |
| --- | --- | --- | --- |
| T008 | Quitar `window.scrollTo({ top: 0, behavior: 'instant' });` de `navigateFromLocation` | «scrolls to the top at once and leaves the focus on #main» | `scrollY` no vuelve a 0 |
| T009 | Borrar `if (lastNavigation === location.href) return;` | «Back mounts the previous page once» | Cuenta 2: `popstate` y `hashchange` en tareas distintas |
| T010 | Borrar `syncLinkedLanguage();` de `navigateFromLocation` | «a world in the query sets its language on a hash navigation» | Go no queda marcado |
| T011 | Borrar `clearTimeout(toastTimeout);` de `toast()` | «a second notice replaces the first and stays 4.5 s from the second» | El primer temporizador apaga el aviso antes de tiempo |
| T012 | Mover `window.TallerLab.init();` a después de `const systemsInit = …` | «opens the lab, the route, the campaign and Sistemas, in that order» | El laboratorio se abre último |
