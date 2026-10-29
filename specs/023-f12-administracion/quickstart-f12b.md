# Quickstart: cómo se verifica F12b

**Plan**: [plan-f12b.md](./plan-f12b.md) | **Research**: [research-f12b.md](./research-f12b.md) | **Contrato**: [contracts/admin-page.md](./contracts/admin-page.md) | **F12a**: [quickstart.md](./quickstart.md)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

> **La regla de Docker** (la misma de C3c): cada comando de Compose lleva `COMPOSE_PROJECT_NAME=taller-f12b` y `TALLER_PORT=8094` en su misma línea, sin `export`. Sin la variable, Compose actúa sobre el stack del usuario (`taller-rust-go`) y su volumen. Nunca `docker compose down -v` ni `docker volume rm` sobre ese stack.

## 1. La línea base (T027)

Sobre `f12b/base` recién creada (`master` con F12a y con la implementación de C3c), antes de cualquier cambio:

```sh
npm ci --offline --no-audit --no-fund
npm run build
npm test
npm run lint
npm run format:check
E2E_PORT=4173 npm run test:e2e
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c warning
npm run test:unit -- frontend/src/pages/admin
```

**Los diffs sobre F12a.** Cada bloque `diff` de plan-f12b.md tiene que aplicar sobre la base. El script es descartable y vive fuera del repositorio, en un archivo `check-f12b-diffs.mjs`:

```js
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FENCE = '`'.repeat(3);
const [plan, repo] = process.argv.slice(2);
const lines = readFileSync(plan, 'utf8').split('\n');
const dir = mkdtempSync(join(tmpdir(), 'f12b-'));
let index = 0;
for (let at = 0; at < lines.length; at += 1) {
  if (lines[at].trimStart() !== `${FENCE}diff`) continue;
  const indent = lines[at].length - lines[at].trimStart().length;
  const body = [];
  for (at += 1; lines[at].trim() !== FENCE; at += 1) {
    body.push(lines[at].trim() === '' ? '' : lines[at].slice(indent));
  }
  const file = join(dir, `${(index += 1)}.patch`);
  writeFileSync(file, `${body.join('\n')}\n`);
  const target = /^diff --git a\/(\S+)/m.exec(body.join('\n'))[1];
  try {
    execFileSync('git', ['-C', repo, 'apply', '--check', file], { stdio: 'pipe' });
    console.log('aplica   ', target);
  } catch (error) {
    console.log('NO APLICA', target, String(error.stderr).trim());
  }
}
```

Se corre con `node <ruta>/check-f12b-diffs.mjs specs/023-f12-administracion/plan-f12b.md "$PWD"`. Al planificar, los 18 diffs aplicaron sobre el código del plan de F12a.

Se anotan en research-f12b.md («Línea base de la implementación»):

- el hash de la base;
- `html.length`;
- los checks de `npm test`, las pruebas de Vitest y las de `pages/admin` (el plan de F12a deja 79);
- los avisos de lint;
- la cantidad de E2E;
- lo que dio cada diff;
- si `ApiDouble` ya trae `features` (F11c).

## 2. La compuerta de una unidad (plan, 0.2)

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e
git diff --name-only f12b/base -- qa/e2e/specs qa/boot-check.ts qa/dist-content-check.ts qa/load-order-check.ts
git diff --diff-filter=M --name-only f12b/base -- qa/e2e/specs frontend/src | grep -E '\.spec\.tsx?$'
git diff f12b/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText|sr-only)'
git diff --name-only f12b/base -- '*.css'
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
```

**Lo que se espera:**

- **todo en verde,** con la red de la base y lo que ya exista de F12b;
- **la primera lista** trae, como mucho, `qa/e2e/specs/admin-mail.spec.ts`, y **la segunda,** nada: ninguna spec existente, de Vitest o E2E, se modifica;
- **el `grep`** y **la lista de CSS** no imprimen nada;
- **el tamaño,** con su diferencia contra T027, va a la descripción del PR.

**Una spec suelta:**

```sh
npm run test:unit -- frontend/src/pages/admin/model/mail-model.spec.ts
npm run test:unit -- frontend/src/pages/admin/ui/invitations-mail.spec.tsx
E2E_PORT=4195 npm run test:e2e -- specs/admin-mail.spec.ts
```

## 3. El peso de la administración (T027 y T041)

`html.length` da el total (FR-057). Para saber cuánto pone F12b, se empaqueta `pages/admin` con esbuild, que ya está instalado, y se compara contra la misma medida de T027. Es una medida de esbuild y no del bundle de Vite: sirve para la diferencia, no para el total.

El script es descartable y vive fuera del repositorio, en un archivo `measure-admin.mjs`:

```js
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.argv[2];
const { build } = createRequire(join(root, 'package.json'))('esbuild');
const OUTSIDE = /entities\/session|shared\/api\/http|shared\/ui\/form|features\/sign-in/;

const result = await build({
  absWorkingDir: root,
  entryPoints: ['frontend/src/pages/admin/index.ts'],
  bundle: true,
  minify: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  charset: 'utf8',
  jsx: 'automatic',
  outdir: 'out',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'zustand', 'react-hook-form'],
  plugins: [
    {
      name: 'outside-the-admin',
      setup(context) {
        context.onResolve({ filter: OUTSIDE }, (args) => ({ path: args.path, external: true }));
      },
    },
  ],
});

console.log(result.outputFiles.reduce((total, file) => total + file.text.length, 0));
```

Se corre con `node <ruta>/measure-admin.mjs "$PWD"`, en T027 y en T041. Al planificar, la administración pasó de 29 737 a 33 738 caracteres de JS (+4 001), sin CSS nuevo (research-f12b.md, «Mediciones»).

**La condición de corte:** si `html.length` crece más de 6 000 caracteres sobre T027, o llega a 1 500 000 (`BOOT_SIZE_LIMIT`), F12b no cierra. Se informa la medida, y decide el usuario.

**Sin dependencias nuevas:** `git diff master -- package.json package-lock.json` no imprime nada (FR-056).

## 4. La verificación a mano contra el stack con correo (T041)

La CI no ejerce la cookie real, el CSRF, la cola del correo ni el broker de la recuperación. Esto se hace a mano, con permiso para Docker, y se declara en el PR.

**El modo con correo, sin proveedor.** Según el contrato de C3c («Cuándo hay correo»), el taller tiene correo si `MAIL_REQUIRED` es falso. Con el mailer `log` por omisión, `worker-mail` «manda» al registro (sin los enlaces, que el depurador de secretos quita), completa `sentAt` y `features.passwordReset` vale `true`. No hace falta el dominio ni Mailpit. Si el usuario dio el permiso de Mailpit (C3c, T002), el perfil `dev` deja ver además los correos (quickstart de C3c, escenario 6).

1. **Levantar el stack con correo:**

   ```sh
   sh backend/api/scripts/init-env.sh
   COMPOSE_PROJECT_NAME=taller-f12b docker compose --profile sandbox-images build
   COMPOSE_PROJECT_NAME=taller-f12b TALLER_PORT=8094 MAIL_REQUIRED=false docker compose up --build -d --wait
   ```

   La web queda en `http://localhost:8094`.
2. **El primer admin.** `COMPOSE_PROJECT_NAME=taller-f12b docker compose exec php php artisan taller:invite admin@example.com --role=admin` imprime el enlace. Al abrirlo, crear la cuenta y aceptar el aviso.
3. **La entrega.** En «Invitaciones», el campo «Entrega» aparece con «Por correo», y los textos «El taller todavía no manda correos…» y el de la consola ya no están.
4. **Invitar por correo** dos emails, uno de ellos con cuenta:
   - el resultado dice «Le llega por correo.» y «Ya tiene una cuenta.», sin enlaces;
   - en la lista, la invitación nueva dice «Por correo, en camino…» y, al minuto, después de recargar la lista, «Entregada al proveedor el {fecha}.».
5. **Reenviar por correo y pasar a enlace** la misma invitación:
   - el reenvío avisa «Reenviamos la invitación de {email}. Le llega por correo.»;
   - pasar a enlace muestra el enlace una vez, y la marca del correo desaparece.
6. **La recuperación de un alumno.** «Mandarle un enlace para elegir contraseña a {nombre}» pide la contraseña la primera vez (423) y, con ella, avisa «Le mandamos un enlace a {email}. Vence en 60 minutos.». Un segundo pedido dentro del minuto muestra «Podés volver a intentar en {segundos}.» y no avisa nada. A un admin no se le ofrece.
7. **Lo que se ve en las herramientas del navegador:**
   - `POST /api/admin/invitations` lleva `delivery: "email"`; los reenvíos, `{delivery: "email"}` o `{delivery: "link"}`; la recuperación, ningún cuerpo;
   - cada pedido que modifica lleva `X-XSRF-TOKEN` y `X-Taller-User`;
   - ningún enlace, email ni nombre queda en `localStorage`, `sessionStorage`, la URL ni la consola.
8. **Sin correo.** Detener el stack y levantarlo sin `MAIL_REQUIRED=false`: la administración se ve como en F12a, sin «Entrega», sin los botones de correo ni la recuperación.
9. **Detener el stack:** `COMPOSE_PROJECT_NAME=taller-f12b docker compose down`.

## 5. Lo que cada unidad deja visible

| Unidad | En el navegador |
| --- | --- |
| U0 | Nada nuevo |
| U1 | Nada: el modelo y los pedidos existen, pero las secciones todavía no leen la bandera |
| U2 | Con correo (el doble con `api.features = WITH_MAIL`, o el stack del §4): la entrega, las marcas, los dos botones de reenvío y la recuperación. Sin correo, lo mismo que F12a |
| U3 | Lo mismo, con la documentación y el peso medidos |
