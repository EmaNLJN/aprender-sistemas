# Quickstart: cómo se verifica F11c

**Plan**: [plan-f11c.md](./plan-f11c.md) | **Research**: [research-f11c.md](./research-f11c.md) | **Contrato**: [contracts/forgot-password-f11c.md](./contracts/forgot-password-f11c.md)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

## 1. La línea base (T054)

Sobre la base de F11c, antes de cualquier cambio, los mismos comandos que [quickstart-f11b.md](./quickstart-f11b.md) §1, más los `grep` de plan-f11c.md, 0.1:

```sh
grep -rn "forgot-password" backend/api/routes/api/
ls backend/api/app/Auth/Features.php backend/api/app/Http/Controllers/Auth/ForgotPasswordController.php
grep -n "FEATURES\|features" qa/e2e/fixtures/api-double.ts
```

Se anotan en research-f11c.md («Línea base de la implementación»): el hash, si C3c está, las firmas de `LoginForm` y `AccessScreen`, `html.length`, los checks, Vitest, los avisos de lint y los E2E.

## 2. La compuerta de U8

Sobre la rama de F11c, con `BASE` en el commit del que salió (T054):

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0
git diff --name-only "$BASE" -- qa
git diff "$BASE" -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c warning
```

**Lo que se espera:**

- todo en verde, con la red de la base y `forgot-password.spec.ts`;
- la lista de archivos de `qa/` trae sólo `qa/e2e/fixtures/api-double.ts`, `qa/e2e/pages/access.ts` y `qa/e2e/specs/forgot-password.spec.ts`;
- el `grep` de estilos no imprime nada, y los avisos de lint no suben;
- el tamaño, con su diferencia contra T054 (como mucho +5 000, y bajo 1 500 000), va a la descripción del PR.

**Una spec suelta:**

```sh
npm run test:unit -- frontend/src/features/sign-in
E2E_PORT=4191 npm run test:e2e -- specs/forgot-password.spec.ts
```

## 3. La verificación a mano contra el stack (T059)

Con permiso para Docker. Los modos de correo son los del [quickstart de C3c](../011-c3c-correo/quickstart.md).

1. **Sin correo** (los valores por omisión: `MAIL_REQUIRED=true` y `MAIL_MAILER=log`):

   ```sh
   docker compose up --build -d --wait
   ```

   - el ingreso de `http://localhost:8080` muestra «¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.» como texto, sin botón;
   - el endpoint responde 503 `mail_unavailable` en este modo, y lo prueba Pest de C3c: el front no lo ofrece.
2. **Con correo y el mailer `log`** (C3c §3), sin descargas:

   ```sh
   MAIL_REQUIRED=false docker compose up -d --wait
   ```

   - el ingreso muestra el botón «¿Te olvidaste la contraseña?»;
   - la pantalla «Recuperá tu contraseña» trae el email que se escribió en el ingreso;
   - con un email que tiene cuenta y con otro que no, se ve el mismo texto;
   - en las herramientas del navegador, el `POST /api/auth/forgot-password` lleva `X-XSRF-TOKEN` y no lleva `X-Taller-User`;
   - el sexto pedido en un minuto muestra cuánto falta.
3. **Con Mailpit** (C3c §6), sólo con el permiso de su descarga (16,1 MiB):
   - el correo de recuperación llega a Mailpit;
   - su enlace abre «Elegí una contraseña nueva» de F11a, con «Para {email}.»;
   - con la contraseña nueva, el ingreso abre el taller.

   Sin el permiso, el PR lo declara como no verificado.
4. **Detener el stack:** `docker compose down`, y volver a desplegar sin `MAIL_REQUIRED=false`.

## 4. Lo que deja visible

| Unidad | En el navegador, con el stack |
| --- | --- |
| U8 | Con correo, «¿Te olvidaste la contraseña?» en el ingreso y «Recuperá tu contraseña»; sin correo, la nota de F11a |
