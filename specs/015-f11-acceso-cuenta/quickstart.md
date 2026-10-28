# Quickstart: cómo se verifica F11a

**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Contrato**: [contracts/front-interfaces.md](./contracts/front-interfaces.md)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

## 1. La línea base (T001)

Sobre `f11a/base` recién creada, antes de cualquier cambio:

```sh
npm ci --offline --no-audit --no-fund
npm run build
npm test
npm run lint
npm run format:check
E2E_PORT=4173 npm run test:e2e
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c warning
```

Se anotan en research.md («Línea base de la implementación»):

- el hash de la base;
- `html.length`;
- los checks de `npm test` y las pruebas de Vitest;
- los avisos de lint;
- los 123 E2E.

## 2. La compuerta de una unidad (plan, 0.4)

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0
git diff --name-only f11a/base -- qa/e2e/specs qa/boot-check.ts qa/dist-content-check.ts
git diff f11a/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
```

**Lo que se espera:**

- **todo en verde,** con los 123 E2E de la red más los de F11a que ya existan;
- **la lista de archivos** trae sólo `qa/boot-check.ts` (con líneas agregadas) y los E2E nuevos:
  - `session-stage.spec.ts`;
  - `sign-in.spec.ts` y `account.spec.ts`;
  - `invitation.spec.ts` y `privacy-notice.spec.ts`;
  - `reset-password.spec.ts` y `access-hygiene.spec.ts`;
- **el `grep`** no imprime nada;
- **el tamaño,** con su diferencia contra T001, va a la descripción del PR.

**Una spec suelta:**

```sh
npm run test:unit -- frontend/src/features/sign-in
node qa/boot-check.ts
E2E_PORT=4191 npm run test:e2e -- specs/sign-in.spec.ts
```

## 3. El peso, con la librería separada del código propio (T035)

`html.length` da el total (SC-008). Para saber cuánto pone React Hook Form y cuánto el código de F11a, se empaqueta `main.tsx` con esbuild, que ya está instalado, y se lee su `metafile`. Es una medida de esbuild y no del bundle de Vite: sirve para la proporción, no para el total.

El script es descartable y vive fuera del repositorio, en un archivo `measure-f11a.mjs`:

```js
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.argv[2];
const { build } = createRequire(join(root, 'package.json'))('esbuild');

const OWN = [
  'frontend/src/shared/api/http/',
  'frontend/src/shared/ui/form/',
  'frontend/src/shared/lib/format-wait.ts',
  'frontend/src/shared/lib/format-local-date-time.ts',
  'frontend/src/entities/session/',
  'frontend/src/features/sign-in/',
  'frontend/src/pages/account/',
  'frontend/src/app/account/',
  'frontend/src/app/boot/access-tokens.ts',
  'frontend/src/app/boot/session-gate.ts',
  'frontend/src/app/boot/session-view.ts',
  'frontend/src/app/boot/account-stages.ts',
];
const NOTICE = 'frontend/src/entities/privacy-notice/';

const result = await build({
  absWorkingDir: root,
  entryPoints: ['frontend/src/app/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  metafile: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { __CONTENT_VERSION__: '"0"', 'process.env.NODE_ENV': '"production"' },
  outdir: 'out',
});

const totals = { 'react-hook-form': 0, 'F11a (código)': 0, 'F11a (aviso)': 0, resto: 0 };
for (const output of Object.values(result.metafile.outputs)) {
  for (const [path, { bytesInOutput }] of Object.entries(output.inputs)) {
    if (path.includes('node_modules/react-hook-form/')) totals['react-hook-form'] += bytesInOutput;
    else if (path.startsWith(NOTICE)) totals['F11a (aviso)'] += bytesInOutput;
    else if (OWN.some((prefix) => path.startsWith(prefix))) totals['F11a (código)'] += bytesInOutput;
    else totals.resto += bytesInOutput;
  }
}
console.table(totals);
```

Se corre con `node <ruta>/measure-f11a.mjs "$PWD"`.

**La condición de corte** (research.md, R15): si `html.length` crece más de 60 000 caracteres sobre T001, o llega a 1 250 000, F11a no cierra. Se informa la tabla, y decide el usuario.

## 4. La verificación a mano contra el stack (T030 y T035)

La CI no ejerce la cookie real, `SameSite` ni el CSRF real (spec, «Alternativas consideradas»). Esto se hace a mano, con permiso para Docker, y se declara en el PR.

1. **Levantar el stack:**

   ```sh
   sh backend/api/scripts/init-env.sh
   docker compose --profile sandbox-images build
   docker compose up --build -d --wait
   ```

   El segundo comando hace falta la primera vez, y una vez por semana (ADR 0005).
2. **El alta.** `docker compose exec php php artisan taller:invite ana@example.com` imprime `http://localhost:8080/#invitacion=<token>`. Al abrir el enlace:
   - el fragmento ya no está en la barra;
   - se ve «Creá tu cuenta», con el email y el vencimiento;
   - al crear la cuenta, el taller arranca en «Mi recorrido» sin recargar.
3. **Lo que se ve en las herramientas del navegador:**
   - las cookies `taller-session` (HttpOnly, `SameSite=Lax`) y `XSRF-TOKEN`;
   - el `POST` del alta, con `X-XSRF-TOKEN` y sin `X-Taller-User`;
   - ninguna contraseña ni ningún token en `localStorage`, `sessionStorage` ni la consola.
4. **«Salir».** Desde «Tu cuenta», «Salir» manda `X-Taller-User`, recarga y muestra el ingreso. El progreso del navegador sigue ahí.
5. **El restablecimiento.** `docker compose exec php php artisan taller:password-reset-link ana@example.com`. Al abrir el enlace:
   - se ve «Para ana@example.com.»;
   - con la contraseña nueva, aparece el ingreso con el email cargado;
   - el ingreso con la contraseña nueva abre el taller.
6. **La vista previa:**

   ```sh
   npm run build
   docker compose -f docker/compose.preview.yaml up --build -d --wait
   curl -s http://127.0.0.1:8765/api/session
   ```

   `curl` devuelve el JSON de C3a. Sin el stack, el `up` falla con «network taller-rust-go_web declared as external, but could not be found». Se detiene con `docker compose -f docker/compose.preview.yaml down`.
7. **`npm run dev`.** Con el stack levantado, `npm run dev` y, en otra terminal, `curl -s http://127.0.0.1:5173/api/session` devuelven lo mismo (SC-012).
8. **`PRIVACY_VERSION`.**
   - Con `PRIVACY_VERSION=2026-11` en `.env` y `docker compose up -d`, el alta muestra el error de la versión en el error general.
   - Se vuelve a `2026-10-dev`, o a la versión que fije el usuario, que es la misma de `entities/privacy-notice/config/privacy-notice.ts`.
9. **Detener el stack:** `docker compose down`.

## 5. Lo que cada unidad deja visible

| Unidad | En el navegador (`npm run build && npm run preview`, con el doble de la API sólo en los E2E) |
| --- | --- |
| U1 | Sin stack, `vite preview` no tiene API: se ve «No pudimos conectar con el taller» con «Reintentar», y ninguna vista legacy. Es lo esperado, porque `vite preview` no pasa `/api/` (R12). Con el stack, la vista previa de Docker muestra «Ingresá al taller» sin sesión |
| U2 | Con el stack: el ingreso, «Tu cuenta» en la barra superior y «Salir» |
| U3 | Con el stack: el alta con un enlace de `taller:invite` y la reaceptación del aviso |
| U4 | Con el stack: el restablecimiento con un enlace de `taller:password-reset-link` |
