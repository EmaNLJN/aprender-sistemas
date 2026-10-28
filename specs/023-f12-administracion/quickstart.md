# Quickstart: cómo se verifica F12a

**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Contrato**: [contracts/admin-page.md](./contracts/admin-page.md)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

## 1. La línea base (T001)

Sobre `f12a/base` recién creada (`master` con F11a integrada), antes de cualquier cambio:

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
- la cantidad de E2E;
- las firmas de F11a que difieren de su contrato.

## 2. La compuerta de una unidad (plan, 0.3)

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e
git diff --name-only f12a/base -- qa/e2e/specs qa/boot-check.ts qa/dist-content-check.ts qa/load-order-check.ts
git diff --diff-filter=M --name-only f12a/base -- qa/e2e/specs
git diff f12a/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText|sr-only)'
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
```

**Lo que se espera:**

- **todo en verde,** con la red de la base y los E2E de F12a que ya existan;
- **la primera lista** trae sólo `qa/e2e/specs/admin-entry.spec.ts`, `admin-accounts.spec.ts`, `admin-invitations.spec.ts` y `admin-layout.spec.ts`, y **la segunda,** nada: ningún E2E existente se edita;
- **el `grep`** no imprime nada;
- **el tamaño,** con su diferencia contra T001, va a la descripción del PR.

**Una spec suelta:**

```sh
npm run test:unit -- frontend/src/pages/admin
npm run test:unit -- frontend/src/pages/account/ui/admin-entry.spec.tsx
E2E_PORT=4194 npm run test:e2e -- specs/admin-accounts.spec.ts
```

## 3. El peso, con la administración separada del resto (T026)

`html.length` da el total (FR-057). Para saber cuánto pone la administración, se empaqueta `main.tsx` con esbuild, que ya está instalado, y se lee su `metafile`. Es una medida de esbuild y no del bundle de Vite: sirve para la proporción, no para el total.

El script es descartable y vive fuera del repositorio, en un archivo `measure-f12a.mjs`:

```js
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.argv[2];
const { build } = createRequire(join(root, 'package.json'))('esbuild');

const ADMIN = ['frontend/src/pages/admin/', 'frontend/src/app/account/AdminDialog.tsx'];

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
  charset: 'utf8',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { __CONTENT_VERSION__: '"0"', 'process.env.NODE_ENV': '"production"' },
  outdir: 'out',
});

const totals = { 'F12a (administración)': 0, resto: 0 };
for (const output of Object.values(result.metafile.outputs)) {
  for (const [path, { bytesInOutput }] of Object.entries(output.inputs)) {
    if (ADMIN.some((prefix) => path.startsWith(prefix))) totals['F12a (administración)'] += bytesInOutput;
    else totals.resto += bytesInOutput;
  }
}
console.table(totals);
```

Se corre con `node <ruta>/measure-f12a.mjs "$PWD"`. Al planificar, la parte de la administración midió unos 30 500 caracteres de JS, más 1 515 de CSS (research.md, «Mediciones»).

**La condición de corte** (research.md, R12): si `html.length` crece más de 35 000 caracteres sobre T001, o llega a 1 250 000, F12a no cierra. Se informa la tabla, y decide el usuario.

**Sin dependencias nuevas:** `git diff master -- package.json package-lock.json` no imprime nada (FR-056).

## 4. La verificación a mano contra el stack (T026)

La CI no ejerce la cookie real, el CSRF ni la confirmación de la contraseña contra Laravel. Esto se hace a mano, con permiso para Docker, y se declara en el PR.

1. **Levantar el stack:**

   ```sh
   sh backend/api/scripts/init-env.sh
   docker compose --profile sandbox-images build
   docker compose up --build -d --wait
   ```

2. **El primer admin.** `docker compose exec php php artisan taller:invite admin@example.com --role=admin` imprime el enlace. Al abrirlo, crear la cuenta y aceptar el aviso.
3. **La entrada.** En «Tu cuenta» aparece «Administrar el taller». Al usarla, la administración ocupa la pantalla, abre en «Cuentas» con el foco en su título, y la URL no cambia.
4. **Invitar.** En «Invitaciones», pegar tres emails (uno repetido con mayúsculas) y crear las invitaciones con el rol «Alumno».
   - Sale el 422 con el email repetido en el campo.
   - Al corregirlo, se ven los resultados, «Copiar» y «Copiar todos los enlaces» copian, y cerrar pregunta.
   - El enlace copiado abre el alta de F11a en otra ventana privada.
5. **La contraseña a pedido.** Con una sesión recién abierta, «Deshabilitar» a una cuenta de prueba pide la contraseña la primera vez (423). Con la contraseña, la fila queda en «Deshabilitada». La acción siguiente, dentro de los 15 minutos, no la pide.
6. **Las demás acciones:** rehabilitar, hacer admin, quitar admin, reenviar (el enlace viejo deja de valer), revocar y borrar con la casilla.
7. **Lo que se ve en las herramientas del navegador:**
   - cada `PATCH`, `DELETE` y `POST` lleva `X-XSRF-TOKEN` y `X-Taller-User`;
   - ningún enlace, email ni nombre queda en `localStorage`, `sessionStorage`, la URL ni la consola.
8. **Un alumno.** Con la cuenta de un alumno, «Tu cuenta» no ofrece la administración, y la pestaña de red no muestra ningún pedido a `/api/admin`.
9. **Detener el stack:** `docker compose down`.

## 5. Lo que cada unidad deja visible

| Unidad | En el navegador |
| --- | --- |
| U0 | Nada nuevo: `reloadDocument` se mudó |
| U1 | Nada: `AccountRoot` todavía no pasa `administration`, así que la entrada no aparece |
| U2 | Nada en el taller: la página existe y se prueba montada sola |
| U3 | Con una cuenta admin (el doble en los E2E, o el stack): «Administrar el taller» en «Tu cuenta» y la administración entera |
| U4 | Lo mismo, con la documentación y el peso medidos |
