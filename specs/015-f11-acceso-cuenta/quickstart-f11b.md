# Quickstart: cómo se verifica F11b

**Plan**: [plan-f11b.md](./plan-f11b.md) | **Research**: [research-f11b.md](./research-f11b.md) | **Contrato**: [contracts/account-f11b.md](./contracts/account-f11b.md)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

## 1. La línea base (T036)

Sobre `f11b/base` recién creada, antes de cualquier cambio:

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

Se anotan en research-f11b.md («Línea base de la implementación»):

- el hash de la base, y si salió de `master` o de `f11a/base`;
- `html.length`;
- los checks de `npm test` y las pruebas de Vitest;
- los avisos de lint;
- la cantidad de E2E en verde;
- lo que encontraron los `grep` de plan-f11b.md, 0.1: «Tu cuenta», F12a, las rutas del doble y los clientes armados a mano.

## 2. La compuerta de una unidad (plan-f11b.md, 0.2)

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0
git diff --name-only f11b/base -- qa
git diff f11b/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c warning
```

**Lo que se espera:**

- **todo en verde,** con la red de la base y los E2E de F11b que ya existan;
- **la lista de archivos de `qa/`** trae sólo `qa/e2e/lib/account-contract.ts`, `qa/e2e/pages/account.ts` y los E2E nuevos:
  - `account-password.spec.ts` (U6);
  - `account-data.spec.ts` y `account-hygiene.spec.ts` (U7);
- **el `grep`** de estilos no imprime nada;
- **los avisos** no suben respecto de T036;
- **el tamaño,** con su diferencia contra T036, va a la descripción del PR.

**Una spec suelta:**

```sh
npm run test:unit -- frontend/src/pages/account
npm run test:unit -- frontend/src/shared/api/http frontend/src/features/confirm-password
E2E_PORT=4191 npm run test:e2e -- specs/account-data.spec.ts
```

## 3. El peso (T053)

F11b no trae librerías, así que alcanza con `html.length`:

```sh
npm run build
node -e "const n=require('fs').readFileSync('dist/index.html','utf8').length; console.log(n, n < 1500000 ? 'bajo el tope' : 'SOBRE EL TOPE')"
```

**La condición de corte** (research-f11b.md, R33): si `html.length` crece más de 15 000 caracteres sobre T036, o llega a 1 500 000 (`BOOT_SIZE_LIMIT` de `qa/build-check.ts`), F11b no cierra. Se informa la medida, y decide el usuario.

## 4. La verificación a mano contra el stack (T053)

La CI no ejerce la cookie real, `SameSite`, el CSRF real ni el streaming real de la exportación (spec, «Alternativas consideradas»). Esto se hace a mano, con permiso para Docker, y se declara en el PR.

1. **Levantar el stack:**

   ```sh
   sh backend/api/scripts/init-env.sh
   docker compose --profile sandbox-images build
   docker compose up --build -d --wait
   ```

   El segundo comando hace falta la primera vez, y una vez por semana (ADR 0005).
2. **Una cuenta de prueba.** `docker compose exec php php artisan taller:invite ana@example.com` imprime el enlace del alta. Se crea la cuenta desde `http://localhost:8080` y se resuelve algún ejercicio, para que la exportación traiga datos.
3. **Cambiar la contraseña.** Desde «Tu cuenta», «Cambiar la contraseña»:
   - con la actual equivocada, el campo dice «La contraseña actual no es correcta.»;
   - con la buena, se ve «Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.»;
   - en otra ventana privada con la sesión vieja, el siguiente pedido lleva al ingreso;
   - en las herramientas del navegador, el `PUT /api/me/password` lleva `X-XSRF-TOKEN` y `X-Taller-User`.
4. **Descargar los datos:**
   - sale `POST /api/auth/confirm-password` y después `POST /api/me/export`;
   - el archivo se llama `taller-<id>-<AAAAMMDD>.json`, su `format` es `taller-export-2`, y sus bytes son los de la respuesta, que se ven en la pestaña de red;
   - no queda nada del archivo en `localStorage`, `sessionStorage` ni IndexedDB;
   - a la cuarta descarga del día, se ve cuánto falta en horas y minutos.
5. **Borrar la cuenta.** Primero, con las claves de progreso del navegador anotadas (herramientas, «Application»):
   - sin la casilla, no sale ningún pedido;
   - con la casilla, sale `DELETE /api/me`, se ve el mensaje del servidor, y «Entendido» recarga y muestra el ingreso;
   - las claves de progreso siguen iguales;
   - el ingreso con esa cuenta falla como una credencial inválida.
6. **El único admin.** Con la cuenta del primer admin, «Borrar mi cuenta» muestra «Tiene que quedar al menos un admin activo.», y la sesión sigue.
7. **Detener el stack:** `docker compose down`.

## 5. Lo que cada unidad deja visible

| Unidad | En el navegador, con el stack |
| --- | --- |
| U5 | Nada nuevo: el cliente y el modelo todavía no tienen pantalla |
| U6 | «Tu cuenta» con «Cambiar la contraseña» y su diálogo |
| U7 | «Descargar mis datos» y «Borrar mi cuenta», con sus diálogos |
